(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else Object.defineProperty(root, 'GyeonggiClipVideoBridge', {value:api, configurable:true});
})(globalThis, function () {
  const KEY = Symbol.for('gyeonggi.clip.video.bridge.1');
  function install(root, pageHref) {
    const api = root.GyeonggiClipCompat;
    if (!api?.editorPage(pageHref) || !root.document) return {ok:false};
    if (root[KEY]) return {ok:true,already:true};
    const doc = root.document;
    let lastSource = '';
    function status(value) { doc.documentElement.setAttribute('data-gyeonggi-clip-state', value); }
    function prepare() {
      const input = doc.querySelector('#vidoeInputTextBox');
      const value = input?.value.trim();
      const data = value && api.makeResponse('/oembed?url=' + value, pageHref);
      if (!data) return null;
      const video = root.videoSearch;
      const preview = doc.querySelector('#img_info_box_id');
      if (!video || typeof video.getOembedTemplate !== 'function' || !preview) {
        status('waiting'); return false;
      }
      try {
        // Always refresh the selection, even when WCMS cleared it after insert.
        // Only rebuild the preview for a new URL or missing preview controls.
        if (lastSource !== value || !preview.querySelector('iframe') || !preview.querySelector('#setWidth')) {
          preview.innerHTML = video.getOembedTemplate(data);
          lastSource = value;
        }
        video.selected = data;
        status('video');
        return true;
      } catch { status('error'); return false; }
    }
    function onInput(event) {
      if (event.target?.id !== 'vidoeInputTextBox') return;
      const handled = prepare();
      // Avoid the WCMS keyup handler's broken server lookup for valid Clip URLs.
      if (handled !== null) event.stopImmediatePropagation();
      else { lastSource = ''; status('ready'); }
    }
    function onClick(event) {
      if (!event.target?.closest?.('#btnInsertVideoToEditor')) return;
      // Prepare synchronously before WCMS's own click handler. Never invoke it.
      // If a valid Clip URL cannot be prepared, prevent an empty figure insert.
      if (prepare() === false) {
        event.preventDefault(); event.stopImmediatePropagation();
      }
    }
    for (const type of ['input','change','keyup']) doc.addEventListener(type,onInput,true);
    doc.addEventListener('click',onClick,true);
    root[KEY] = {prepare};
    status('ready');
    // Existing popup with a URL can recover without a page reload.
    const popup = doc.querySelector('#video_pop');
    if (popup?.getClientRects().length) prepare();
    return {ok:true};
  }
  return {install};
});
