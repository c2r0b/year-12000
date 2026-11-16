// Firefox calls the extension API `browser`, Chromium calls it `chrome`.
const ext = globalThis.browser ?? chrome;

const toggle = document.getElementById('toggle');
const status = document.getElementById('status');

const counts = new Map(); // frame id -> dates updated in that frame
let tabId = null;
let reachable = false;

function render() {
  if (!toggle.checked) {
    status.textContent = 'Off';
  } else if (!reachable) {
    status.textContent = 'Not available on this page';
  } else {
    let total = 0;
    for (const count of counts.values()) total += count;
    status.textContent = `${total} ${total === 1 ? 'date' : 'dates'} updated on this page`;
  }
}

// Every frame of the page reports its own count; the label shows the sum.
ext.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== 'year12000:count' || sender.tab?.id !== tabId) return;
  counts.set(sender.frameId, message.count);
  render();
});

toggle.addEventListener('change', () => {
  ext.storage.local.set({ enabled: toggle.checked });
  render();
});

(async () => {
  const [settings, tabs] = await Promise.all([
    ext.storage.local.get({ enabled: true }),
    ext.tabs.query({ active: true, currentWindow: true }),
  ]);
  toggle.checked = settings.enabled;
  // "?tabId=" lets the end-to-end tests open this page in a normal tab and
  // point it at the page under test.
  const requested = Number(new URLSearchParams(location.search).get('tabId'));
  tabId = requested || (tabs[0]?.id ?? null);
  try {
    await ext.tabs.sendMessage(tabId, { type: 'year12000:report' });
    reachable = true;
  } catch {
    reachable = false; // browser pages, the Web Store, or a tab not reloaded yet
  }
  render();
})();
