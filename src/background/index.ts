/**
 * Background service worker.
 * Relays translation requests from content scripts to the local NPU API.
 * This avoids CORS issues by making the fetch from the service worker context.
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
}

async function getSettings(): Promise<TranslatorSettings> {
    return new Promise((resolve) => {
        chrome.storage.local.get(DEFAULT_SETTINGS, (items) => {
            resolve(items as TranslatorSettings);
        });
    });
}

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

                const client = new TranslatorClient(settings.apiBase, settings.model);
                const result = await client.translate(message.text, settings.targetLang);
                sendResponse({ success: true, result });
            } catch (err) {
                const errorMessage =
                    err instanceof Error ? err.message : "Unknown error";
                console.error("[SOOP Translator] Translation error:", errorMessage);
                sendResponse({ success: false, error: errorMessage });
            }
        })();

        // Return true to indicate async response
        return true;
    }
);
