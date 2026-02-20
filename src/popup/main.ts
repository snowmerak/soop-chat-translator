/**
 * Popup script for SOOP Chat Translator.
 * Reads and writes settings to chrome.storage.local.
 */

import { DEFAULT_SETTINGS, type TranslatorSettings } from "../config/defaults";

const enableToggle = document.getElementById(
    "enableToggle"
) as HTMLInputElement;
const targetLangSelect = document.getElementById(
    "targetLang"
) as HTMLSelectElement;
const apiBaseDisplay = document.getElementById("apiBaseDisplay")!;
const modelDisplay = document.getElementById("modelDisplay")!;
const statusDot = document.getElementById("statusDot")!;
const statusText = document.getElementById("statusText")!;

function applySettings(settings: TranslatorSettings) {
    enableToggle.checked = settings.enabled;
    targetLangSelect.value = settings.targetLang;
    apiBaseDisplay.textContent = settings.apiBase;
    modelDisplay.textContent = settings.model;
    updateStatus(settings.enabled);
}

function updateStatus(enabled: boolean) {
    if (enabled) {
        statusDot.classList.add("active");
        statusText.textContent = "번역 중";
    } else {
        statusDot.classList.remove("active");
        statusText.textContent = "비활성화됨";
    }
}

function saveSettings(partial: Partial<TranslatorSettings>) {
    chrome.storage.local.get(DEFAULT_SETTINGS, (current) => {
        const updated = { ...current, ...partial };
        chrome.storage.local.set(updated);
    });
}

// Load settings on popup open
chrome.storage.local.get(DEFAULT_SETTINGS, (items) => {
    applySettings(items as TranslatorSettings);
});

// Event listeners
enableToggle.addEventListener("change", () => {
    const enabled = enableToggle.checked;
    saveSettings({ enabled });
    updateStatus(enabled);
});

targetLangSelect.addEventListener("change", () => {
    saveSettings({ targetLang: targetLangSelect.value });
});
