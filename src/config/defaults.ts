/**
 * Default configuration values for the SOOP Chat Translator extension.
 * These mirror the local Snapdragon NPU server settings.
 */

export const DEFAULT_API_BASE = "http://localhost:18181";
export const DEFAULT_MODEL = "NexaAI/Qwen3-4B-Instruct-2507-npu";
export const DEFAULT_TARGET_LANG = "Korean";
export const DEFAULT_ENABLED = false;

export interface TranslatorSettings {
    apiBase: string;
    model: string;
    targetLang: string;
    enabled: boolean;
}

export const DEFAULT_SETTINGS: TranslatorSettings = {
    apiBase: DEFAULT_API_BASE,
    model: DEFAULT_MODEL,
    targetLang: DEFAULT_TARGET_LANG,
    enabled: DEFAULT_ENABLED,
};
