const toggleSwitch = document.getElementById("toggle");
const statusEl = document.getElementById("status");
const counterEl = document.getElementById("counterValue");
const popupsBlockedTextEl = document.getElementById("popupsBlockedText");

document.addEventListener("DOMContentLoaded", () => {
    const popupsBlockedText = chrome.i18n.getMessage("popupsBlockedText");
    popupsBlockedTextEl.textContent = popupsBlockedText;
});

async function getState() {
    const data = await chrome.storage.local.get("masterSwitch");
    return data.masterSwitch ?? true;
}

async function setState(value) {
    await chrome.storage.local.set({ masterSwitch: value });
}

function renderState(state, counter) {
    toggleSwitch.checked = state;
    statusEl.textContent = state
        ? chrome.i18n.getMessage("extensionEnabled")
        : chrome.i18n.getMessage("extensionDisabled");
    counterEl.textContent = counter ?? 0;
}

async function getNumberOfBlockedPopups() {
    const data = await chrome.storage.local.get("counter");
    return data.counter ?? 0;
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