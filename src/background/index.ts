/**
 * Background service worker.
 * Relays translation requests from content scripts to the local NPU API.
 * Includes an in-memory LRU-style cache to avoid re-translating identical messages.
 */

import { TranslatorClient } from "../api/client";
import { DEFAULT_SETTINGS, type TranslatorSettings } from "../config/defaults";

interface TranslateRequest {
    type: "TRANSLATE";
    text: string;
}

interface TranslateResponse {
    success: boolean;
    result?: string;
    error?: string;
    cached?: boolean;
    skipped?: boolean;
}

// --- Translation cache ---
// Key: `${targetLang}::${text}`, Value: translated string
// Caps at MAX_CACHE_SIZE entries; oldest entries evicted first.
const MAX_CACHE_SIZE = 500;
const translationCache = new Map<string, string>();

function cacheGet(key: string): string | undefined {
    const val = translationCache.get(key);
    if (val !== undefined) {
        // Touch: move to end (most-recently-used)
        translationCache.delete(key);
        translationCache.set(key, val);
    }
    return val;
}

function cacheSet(key: string, value: string) {
    if (translationCache.size >= MAX_CACHE_SIZE) {
        // Evict oldest (first) entry
        const firstKey = translationCache.keys().next().value;
        if (firstKey !== undefined) translationCache.delete(firstKey);
    }
    translationCache.set(key, value);
}

// --- Settings helper ---
async function getSettings(): Promise<TranslatorSettings> {
    return new Promise((resolve) => {
        chrome.storage.local.get(DEFAULT_SETTINGS, (items) => {
            resolve(items as TranslatorSettings);
        });
    });
}

// --- Language Mapping ---
// Maps user-friendly settings targetLang to ISO language codes returned by Chrome i18n
function getCodeForLangName(langName: string): string {
    switch (langName) {
        case "Korean": return "ko";
        case "English": return "en";
        case "Japanese": return "ja";
        case "Chinese (Simplified)": return "zh";
        case "Spanish": return "es";
        case "French": return "fr";
        default: return "";
    }
}

// --- Message listener ---
chrome.runtime.onMessage.addListener(
    (
        message: TranslateRequest,
        _sender: chrome.runtime.MessageSender,
        sendResponse: (response: TranslateResponse) => void
    ) => {
        if (message.type !== "TRANSLATE") return false;

        (async () => {
            try {
                const settings = await getSettings();

                if (!settings.enabled) {
                    sendResponse({ success: false, error: "Translation is disabled" });
                    return;
                }

                const cacheKey = `${settings.targetLang}::${message.text}`;

                // Cache hit — return immediately without calling the API
                const cached = cacheGet(cacheKey);
                if (cached !== undefined) {
                    sendResponse({ success: true, result: cached, cached: true });
                    return;
                }

                // Detect language using Chrome's built-in API
                const targetCode = getCodeForLangName(settings.targetLang);
                if (targetCode) {
                    const detected = await new Promise<chrome.i18n.LanguageDetectionResult>((resolve) => {
                        chrome.i18n.detectLanguage(message.text, resolve);
                    });

                    if (detected && detected.isReliable && detected.languages.length > 0) {
                        const topLang = detected.languages[0].language; // e.g., 'ko', 'en', 'ja'

                        // If the text is already primarily in the target language, skip translation
                        if (topLang === targetCode || topLang.startsWith(targetCode)) {
                            cacheSet(cacheKey, message.text); // Cache the original as the "translation"
                            sendResponse({ success: true, result: message.text, cached: false, skipped: true });
                            return;
                        }
                    }
                }

                // Translate using the local NPU / external API
                const client = new TranslatorClient(
                    settings.apiBase,
                    settings.model,
                    settings.apiKey
                );

                console.log(`[SOOP Translator] Sending API request to: ${settings.apiBase} | Model: ${settings.model} | Source: ${settings.sourceLang} -> Target: ${settings.targetLang}`);

                const result = await client.translate(message.text, settings.targetLang, settings.sourceLang);

                cacheSet(cacheKey, result);
                sendResponse({ success: true, result, cached: false });
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Unknown error";
                console.error("[SOOP Translator] Error:", errorMessage);
                sendResponse({ success: false, error: errorMessage });
            }
        })();

        return true; // async response
    }
);
