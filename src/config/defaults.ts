/**
 * Default configuration values for the SOOP Chat Translator extension.
 * These mirror the local Snapdragon NPU server settings.
 */

export const DEFAULT_API_BASE = "http://localhost:18181";
export const DEFAULT_MODEL = "NexaAI/Qwen3-4B-Instruct-2507-npu";
export const DEFAULT_SOURCE_LANG = "Auto";
export const DEFAULT_TARGET_LANG = "Korean";
export const DEFAULT_ENABLED = false;
export const DEFAULT_MAX_CONCURRENT = 3;
export const DEFAULT_API_KEY = "";

export interface TranslatorSettings {
    apiBase: string;
    model: string;
    apiKey: string;
    sourceLang: string;
    targetLang: string;
    enabled: boolean;
    maxConcurrentRequests: number;
}

export const DEFAULT_SETTINGS: TranslatorSettings = {
    apiBase: DEFAULT_API_BASE,
    model: DEFAULT_MODEL,
    apiKey: DEFAULT_API_KEY,
    sourceLang: DEFAULT_SOURCE_LANG,
    targetLang: DEFAULT_TARGET_LANG,
    enabled: DEFAULT_ENABLED,
    maxConcurrentRequests: DEFAULT_MAX_CONCURRENT,
};
