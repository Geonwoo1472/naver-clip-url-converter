// Applies compatibility to editor tabs in every window, including toolbar-free
// article popups. Never reloads a tab, edits an article, or invokes WCMS actions.
const pending = new Set();

function isEditor(url) {
  try {
    const parsed = new URL(url);
    return parsed.origin === 'https://wcms.kyeonggi.com' && /^\/editor\/?$/.test(parsed.pathname);
  } catch { return false; }
}

async function applyToTab(tab) {
  if (!Number.isInteger(tab?.id) || !isEditor(tab.url) || pending.has(tab.id)) return;
  pending.add(tab.id);
  try {
    await chrome.scripting.executeScript({
      target: {tabId: tab.id}, world: 'MAIN',
      files: ['wcms-compat-core.js', 'wcms-video-bridge.js', 'wcms-compat.js']
    });
  } catch (error) {
    console.warn('네이버 클립 WCMS 호환 주입 실패:', error?.message || '확장프로그램 접근 권한을 확인해 주세요.');
    // Closing/navigating tabs and withheld site access are expected cases.
    // Subsequent page completion / permission grant triggers another attempt.
  } finally {
    try {
      await chrome.scripting.executeScript({target:{tabId:tab.id},world:'ISOLATED',files:['wcms-status.js']});
    } catch { /* Tab closed or site access unavailable. */ }
    pending.delete(tab.id);
  }
}

async function applyToOpenEditors() {
  try {
    const tabs = await chrome.tabs.query({url: 'https://wcms.kyeonggi.com/editor*'});
    await Promise.all(tabs.map(applyToTab));
  } catch { /* Site access may not yet be available. */ }
}

chrome.tabs.onCreated.addListener(applyToTab);
chrome.tabs.onUpdated.addListener((id, change, tab) => {
  if (change.url || change.status === 'complete') {
    void applyToTab({...tab, id, url: change.url || tab.url});
  }
});
chrome.runtime.onInstalled.addListener(applyToOpenEditors);
chrome.runtime.onStartup.addListener(applyToOpenEditors);
chrome.permissions.onAdded.addListener(applyToOpenEditors);
// Also covers unpacked-extension reloads with existing, unsaved article windows.
void applyToOpenEditors();
