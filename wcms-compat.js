(() => {
  const key = Symbol.for('gyeonggi.clip.auto.1');
  const api = globalThis.GyeonggiClipCompat;
  if (!api?.editorPage(location.href)) return {ok:false,reason:'not-editor'};
  globalThis.GyeonggiClipVideoBridge?.install(globalThis, location.href);
  // Static content script and background injection may arrive together.
  if (globalThis[key]?.pending) return {ok:true,pending:true};
  const state = {pending:true, attempts:0};
  globalThis[key] = state;
  function apply() {
    const current = globalThis.GyeonggiClipCompat;
    const result = current.install(globalThis.jQuery, location.href);
    state.attempts++;
    if (result.ok || result.reason !== 'not-ready' || state.attempts >= 120) {
      state.pending = false;
      return result;
    }
    // Wait for WCMS's own jQuery when its loading is delayed (up to 30s).
    setTimeout(apply, 250);
    return {ok:true,pending:true};
  }
  return apply();
})();
