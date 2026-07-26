(function () {

  const DOM_LOADING_TIMEOUT = 10000;
  const DOM_LOADING_INTERVAL = 10;
  const OBSERVER_TIMEOUT = 150;

  const extensionName = chrome.runtime.getManifest().name;

  function logInConsole(message) {
      console.log(`[${extensionName}]: ${chrome.i18n.getMessage(message)}`);
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

  async function incrementNumberOfBlockedPopups() {
      try {
        const current = await getNumberOfBlockedPopups();
        await chrome.storage.local.set({ counter: current + 1 });
      } catch (error) {
        logInConsole('errorIncrementingCounter');
      }
  }

  let isRemoving = false;

  async function removeBaileyPopup() {
    if (isRemoving) return false;
    isRemoving = true;
    try {
        const modal = document.querySelector('#new-stuff___BV_modal_outer_');
        const shouldRemove = modal || document.body.classList.contains('modal-open') || document.body.style.overflow === 'hidden' ||
                             (document.body.hasAttribute('data-modal-open-count') && Number(document.body.dataset.modalOpenCount) > 0);
        if (!shouldRemove) {
            return false;
        }

        if (modal) {
            modal.remove();
        }

        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.setAttribute('data-modal-open-count', '0');

        logInConsole('popupRemoved');

        await incrementNumberOfBlockedPopups();

        return true;

    } finally {
        isRemoving = false;
    }
  }

  let addDisabledBaileyPopupInfoInSettingsTimeout = null;
  let addDisabledBaileyPopupInfoInSettingsInterval = null;
  function addDisabledBaileyPopupInfoInSettings() {
    const addDisabledBaileyPopupInfoInSettingsInterval = setInterval(() => {
        const link = document.querySelector('#viewBaileyLink');
        if (link && getComputedStyle(link).display !== 'none') {
            link.style.display = 'none';

            const info = document.createElement('span');
            info.id = 'nobailey-info';
            info.textContent = chrome.i18n.getMessage("disabled");
            info.style.pointerEvents = '';
            info.style.cursor = 'help';
            info.setAttribute('title', chrome.i18n.getMessage("disabledDescription"));
            
            const parent = link.parentElement;
            parent.querySelector('#nobailey-info')?.remove();
            parent.appendChild(info);

            logInConsole('infoAdded');
            clearInterval(addDisabledBaileyPopupInfoInSettingsInterval);
        }
    }, DOM_LOADING_INTERVAL);
    addDisabledBaileyPopupInfoInSettingsTimeout = setTimeout(() => clearInterval(addDisabledBaileyPopupInfoInSettingsInterval), DOM_LOADING_TIMEOUT);
    }

    let restoreOriginalBaileyLinkInSettingsTimeout = null;
    let restoreOriginalBaileyLinkInSettingsInterval = null;
    function restoreOriginalBaileyLinkInSettings() {
      const restoreOriginalBaileyLinkInSettingsInterval = setInterval(() => {
          const link = document.querySelector('#viewBaileyLink');
          const info = document.querySelector('#nobailey-info');
          if (link && info) {
              info.remove();
              link.style.display = '';
              logInConsole('linkRestored');
              clearInterval(restoreOriginalBaileyLinkInSettingsInterval);
          }
      }, DOM_LOADING_INTERVAL);
      restoreOriginalBaileyLinkInSettingsTimeout = setTimeout(() => clearInterval(restoreOriginalBaileyLinkInSettingsInterval), DOM_LOADING_TIMEOUT);
    }

    async function isExtensionEnabled() {
      try {
          const data = await chrome.storage.local.get("masterSwitch");
          return data.masterSwitch ?? true;
      } catch (error) {
          logInConsole('errorGettingState');
          return true;
      }
    }

    let checkForBaileyPopupTimeout = null;
    let checkForBaileyPopupInterval = null;
    async function checkForBaileyPopup() {
      if (document.querySelector('#new-stuff___BV_modal_outer_')) {
        removeBaileyPopup();
        const checkForBaileyPopupInterval = setInterval(() => {
          if (removeBaileyPopup()) {
            clearInterval(checkForBaileyPopupInterval);
          }
        }, DOM_LOADING_INTERVAL);
        checkForBaileyPopupTimeout = setTimeout(() => clearInterval(checkForBaileyPopupInterval), DOM_LOADING_TIMEOUT);
      }
    }

    async function checkForNotificationsSettingsPage(isEnabled) {
      if (window.location.pathname === '/user/settings/notifications') {
        const link = document.querySelector('#viewBaileyLink');
        const info = document.querySelector('#nobailey-info');
        if (isEnabled && link && getComputedStyle(link).display !== 'none') {
          addDisabledBaileyPopupInfoInSettings();
        }
        if (!isEnabled && link && info && getComputedStyle(info).display !== 'none') {
            restoreOriginalBaileyLinkInSettings();
        }
      }
    }

    let popupObserverTimeout = null;
    const popupObserver = new MutationObserver(() => {
        clearTimeout(popupObserverTimeout);
        popupObserverTimeout = setTimeout(() => {
            let isEnabled = isExtensionEnabled();
            if (isEnabled) {
              checkForBaileyPopup();
            }
        }, OBSERVER_TIMEOUT);
    });

    function initPopupObserver() {
      if (!document.body) {
        requestAnimationFrame(initPopupObserver);
        return;
      }
      popupObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    initPopupObserver();

    let titleObserverTimeout = null;
    const titleObserver = new MutationObserver(() => {
        clearTimeout(titleObserverTimeout);
        titleObserverTimeout = setTimeout(() => {
            let isEnabled = isExtensionEnabled();
            checkForNotificationsSettingsPage(isEnabled);
        }, OBSERVER_TIMEOUT);
    });

    function initTitleObserver() {
      const titleElement = document.querySelector('title');
      if (!titleElement) {
        requestAnimationFrame(initTitleObserver);
        return;
      }
      titleObserver.observe(titleElement, {
          childList: true
      });
    }

    initTitleObserver();
    
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.masterSwitch) {
        let isEnabled = isExtensionEnabled();
        if (isEnabled) {
          checkForBaileyPopup();
          initPopupObserver();
          initTitleObserver();
        } else {
          clearTimeout(popupObserverTimeout);
          clearTimeout(titleObserverTimeout);
          clearTimeout(addDisabledBaileyPopupInfoInSettingsTimeout);
          clearTimeout(restoreOriginalBaileyLinkInSettingsTimeout);
          clearTimeout(checkForBaileyPopupTimeout);
          clearInterval(addDisabledBaileyPopupInfoInSettingsInterval);
          clearInterval(restoreOriginalBaileyLinkInSettingsInterval);
          clearInterval(checkForBaileyPopupInterval);
          popupObserver.disconnect();
          titleObserver.disconnect();
        }
        checkForNotificationsSettingsPage(isEnabled);
      }
    });

    let isEnabled = isExtensionEnabled();
    if (isEnabled) {
      checkForBaileyPopup();
    }
    checkForNotificationsSettingsPage(isEnabled);
})();