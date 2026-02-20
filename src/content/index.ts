/**
 * Content script injected into SOOP live chat pages.
 * Observes new chat messages and appends inline translations.
 */

interface TranslateRequest {
    type: "TRANSLATE";
    text: string;
}

interface TranslateResponse {
    success: boolean;
    result?: string;
    error?: string;
}

// Translated message attribute to avoid re-translating
const TRANSLATED_ATTR = "data-soop-translated";

// Queue for throttling translation requests
let translationQueue: Array<() => void> = [];
let isProcessing = false;

async function processQueue() {
    if (isProcessing || translationQueue.length === 0) return;
    isProcessing = true;
    const task = translationQueue.shift()!;
    task();
}

function enqueue(fn: () => void) {
    translationQueue.push(fn);
    processQueue();
}

function sendTranslationRequest(text: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const request: TranslateRequest = { type: "TRANSLATE", text };
        chrome.runtime.sendMessage(request, (response: TranslateResponse) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            if (response.success && response.result) {
                resolve(response.result);
            } else {
                reject(new Error(response.error ?? "Unknown error"));
            }
        });
    });
}

function appendTranslation(messageEl: Element, translatedText: string) {
    const existing = messageEl.querySelector(".soop-translation");
    if (existing) existing.remove();

    const span = document.createElement("span");
    span.className = "soop-translation";
    span.textContent = ` 🌐 ${translatedText}`;
    span.style.cssText = `
    display: block;
    font-size: 0.85em;
    color: #aaaadd;
    margin-top: 2px;
    word-break: break-word;
  `;
    messageEl.appendChild(span);
}

async function translateMessage(messageEl: Element) {
    if (messageEl.getAttribute(TRANSLATED_ATTR) === "true") return;
    messageEl.setAttribute(TRANSLATED_ATTR, "true");

    // Extract text content, skipping child elements like username badges
    const textContent = Array.from(messageEl.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent?.trim())
        .filter(Boolean)
        .join(" ");

    if (!textContent || textContent.length < 2) return;

    return new Promise<void>((resolve) => {
        enqueue(async () => {
            try {
                const translated = await sendTranslationRequest(textContent);
                // Only append if meaningfully different from original
                if (translated && translated !== textContent) {
                    appendTranslation(messageEl, translated);
                }
            } catch (err) {
                console.warn("[SOOP Translator] Failed to translate:", err);
                // Reset so it can be retried on next observation
                messageEl.removeAttribute(TRANSLATED_ATTR);
            } finally {
                isProcessing = false;
                processQueue();
                resolve();
            }
        });
    });
}

/**
 * SOOP chat message selectors.
 * These may need updating if SOOP changes their DOM structure.
 *
 * Known selectors:
 *  - .chat_list li .chat_txt  (classic SOOP layout)
 *  - .chatting-list .message  (newer layout)
 */
const CHAT_MESSAGE_SELECTORS = [
    ".chat_list li .chat_txt",
    ".chatting-list .message",
    ".chat-list-wrap li .chat-text",
];

function findChatMessages(root: Element | Document): Element[] {
    for (const selector of CHAT_MESSAGE_SELECTORS) {
        const els = Array.from(root.querySelectorAll(selector));
        if (els.length > 0) return els;
    }
    return [];
}

function observeChat() {
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!(node instanceof Element)) continue;

                // Check if it's a chat message itself
                if (CHAT_MESSAGE_SELECTORS.some((sel) => node.matches(sel))) {
                    translateMessage(node);
                    continue;
                }

                // Or if it contains chat messages
                const messages = findChatMessages(node);
                for (const msg of messages) {
                    translateMessage(msg);
                }
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    // Translate any messages already on screen
    const existing = findChatMessages(document);
    for (const msg of existing) {
        translateMessage(msg);
    }

    console.log("[SOOP Translator] Chat observer started.");
}

// Start observing after DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeChat);
} else {
    observeChat();
}
