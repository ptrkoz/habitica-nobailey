const toggleSwitch = document.getElementById("toggle");
const statusEl = document.getElementById("status");
const counterEl = document.getElementById("counterValue");
const popupsBlockedTextEl = document.getElementById("popupsBlockedText");

document.addEventListener("DOMContentLoaded", () => {
    const popupsBlockedText = chrome.i18n.getMessage("popupsBlockedText");
    popupsBlockedTextEl.textContent = popupsBlockedText;
});

function logInConsole(message) {
    console.log(`[${extensionName}]: ${chrome.i18n.getMessage(message)}`);
}

async function getState() {
    try {
        const data = await chrome.storage.local.get("masterSwitch");
        return data.masterSwitch ?? true;
    } catch (error) {
        logInConsole('errorGettingState');
        return true;
    }
}

async function setState(value) {
    try {
        await chrome.storage.local.set({ masterSwitch: value });
    } catch (error) {
        logInConsole('errorSettingState');
    }
}

function renderState(state, counter) {
    toggleSwitch.checked = state;
    statusEl.textContent = state
        ? chrome.i18n.getMessage("extensionEnabled")
        : chrome.i18n.getMessage("extensionDisabled");
    counterEl.textContent = counter ?? 0;
}

async function getNumberOfBlockedPopups() {
    try {
        const data = await chrome.storage.local.get("counter");
        return data.counter ?? 0;
    } catch (error) {
        logInConsole('errorGettingCounter');
        return 0;
    }
}

async function showPopup() {
    const state = await getState();
    const counter = await getNumberOfBlockedPopups();
    renderState(state, counter);
}

toggleSwitch.addEventListener("change", async () => {
    toggleSwitch.disabled = true;
    const current = await getState();
    const newState = !current;
    await setState(newState);
    showPopup();
    toggleSwitch.disabled = false;
});

chrome.storage.onChanged.addListener((changes) => {
    if (changes.counter) {
        showPopup();
    }
});

showPopup();