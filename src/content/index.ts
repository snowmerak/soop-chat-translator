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

/**
 * Appends (or replaces) the translation result below the original message p element.
 * @param originalP  - the `p#message-original` element
 * @param translatedText - the translated string
 */
function appendTranslation(originalP: Element, translatedText: string) {
    const existing = originalP.parentElement?.querySelector(".soop-translation");
    if (existing) existing.remove();

    const span = document.createElement("span");
    span.className = "soop-translation";
    span.textContent = `🌐 ${translatedText}`;
    span.style.cssText = [
        "display: block",
        "font-size: 0.85em",
        "color: #aaaadd",
        "margin-top: 2px",
        "word-break: break-word",
        "user-select: text",
    ].join(";");
    // Insert right after the original p tag
    originalP.insertAdjacentElement("afterend", span);
}

/**
 * Translates a `p#message-original` element.
 * The TRANSLATED_ATTR is set on the parent `.message-text` container
 * so we never process the same message twice.
 */
async function translateMessage(originalP: Element) {
    const container = originalP.parentElement;
    if (!container) return;
    if (container.getAttribute(TRANSLATED_ATTR) === "true") return;
    container.setAttribute(TRANSLATED_ATTR, "true");

    const textContent = originalP.textContent?.trim();
    if (!textContent || textContent.length < 2) return;

    return new Promise<void>((resolve) => {
        enqueue(async () => {
            try {
                const translated = await sendTranslationRequest(textContent);
                if (translated && translated !== textContent) {
                    appendTranslation(originalP, translated);
                }
            } catch (err) {
                console.warn("[SOOP Translator] Failed to translate:", err);
                container.removeAttribute(TRANSLATED_ATTR);
            } finally {
                isProcessing = false;
                processQueue();
                resolve();
            }
        });
    });
}

/**
 * SOOP DOM structure (confirmed):
 *   div.message-text[id="<numeric-id>"]   ← message container
 *     p#message-original                  ← chat message text
 *
 * We query for `p#message-original` inside `.message-text[id]` containers.
 */
const MESSAGE_ORIGINAL_SELECTOR = ".message-text[id] p#message-original";

function findChatMessages(root: Element | Document): Element[] {
    return Array.from(root.querySelectorAll(MESSAGE_ORIGINAL_SELECTOR));
}

function observeChat() {
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!(node instanceof Element)) continue;

                // Case 1: added node is p#message-original directly
                if (node.matches("p#message-original")) {
                    translateMessage(node);
                    continue;
                }

                // Case 2: added node is .message-text container (contains p#message-original)
                const found = node.querySelector("p#message-original");
                if (found) {
                    translateMessage(found);
                    continue;
                }

                // Case 3: some ancestor was added — scan descendants
                for (const msg of findChatMessages(node)) {
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
