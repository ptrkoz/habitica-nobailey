(function () {

  const extensionName = chrome.runtime.getManifest().name;

  function logInConsole(message) {
      console.log(`[${extensionName}]: ${chrome.i18n.getMessage(message)}`);
  }

  async function getNumberOfBlockedPopups() {
  const data = await chrome.storage.local.get("counter");
  return data.counter ?? 0;
  }

  async function incrementNumberOfBlockedPopups() {
      const current = await getNumberOfBlockedPopups();
      await chrome.storage.local.set({ counter: current + 1 });
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

    function addDisabledBaileyPopupInfoInSettings() {
      const interval = setInterval(() => {
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
              clearInterval(interval);
          }
      }, 100);

      setTimeout(() => clearInterval(interval), 5000);
    }

    function restoreOriginalBaileyLinkInSettings() {
      const interval = setInterval(() => {
          const link = document.querySelector('#viewBaileyLink');
          const info = document.querySelector('#nobailey-info');
          if (link && info) {
              info.remove();
              link.style.display = '';
              logInConsole('linkRestored');
              clearInterval(interval);
          }
      }, 100);

      setTimeout(() => clearInterval(interval), 5000);
    }

    async function isExtensionEnabled() {
      const data = await chrome.storage.local.get("masterSwitch");
      return data.masterSwitch ?? true;
    }

    async function checkForBaileyPopup() {
      const isEnabled = await isExtensionEnabled();
      if (isEnabled && document.querySelector('#new-stuff___BV_modal_outer_')) {
        removeBaileyPopup();
        const interval = setInterval(() => {
          if (removeBaileyPopup()) {
            clearInterval(interval);
          }
        }, 10);
        setTimeout(() => clearInterval(interval), 5000);
      }
    }

    async function checkForNotificationsSettingsPage() {
      if (window.location.pathname === '/user/settings/notifications') {
        const isEnabled = await isExtensionEnabled();
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
            checkForBaileyPopup();
        }, 150);
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
            checkForNotificationsSettingsPage();
        }, 150);
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
        checkForBaileyPopup();
        checkForNotificationsSettingsPage();
      }
    });

    checkForBaileyPopup();
    checkForNotificationsSettingsPage();
})();