/* Local compatibility for the WCMS GET /oembed request only.
   No article/state/save APIs, form submissions, or editor insertion calls. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else Object.defineProperty(root, 'GyeonggiClipCompat', { value: api, configurable: true });
})(globalThis, function () {
  'use strict';
  const KEY = Symbol.for('gyeonggi.clip.compat.1');
  const BUILD = '20261014-url-compat-1';

  function editorPage(href) {
    try {
      const u = new URL(href);
      return u.origin === 'https://wcms.kyeonggi.com' && /^\/editor\/?$/.test(u.pathname);
    } catch { return false; }
  }

  function makeResponse(request, pageHref) {
    if (typeof request !== 'string' || !editorPage(pageHref)) return null;
    let outer;
    try { outer = new URL(request, pageHref); } catch { return null; }
    if (outer.origin !== 'https://wcms.kyeonggi.com' || outer.pathname !== '/oembed') return null;
    // The existing WCMS concatenates the whole Clip URL without encoding '&'.
    // Preserve the complete tail, while also accepting a correctly encoded URL.
    const tail = outer.search.match(/^\?url=(.+)$/)?.[1];
    if (!tail) return null;
    let raw = tail;
    if (/^https%3a%2f%2f/i.test(raw)) {
      try { raw = decodeURIComponent(raw); } catch { return null; }
    }
    let video;
    try { video = new URL(raw.replace(/&amp;/g, '&')); } catch { return null; }
    if (video.origin !== 'https://clip-viewer.naver.com' || !/^\/oembed\/?$/.test(video.pathname) || video.username || video.password) return null;
    const id = video.searchParams.get('seedMediaId');
    const type = video.searchParams.get('mediaType');
    if (!id || !/^[A-Za-z0-9_-]{1,128}$/.test(id) || !['SHORT_FORM', 'LONG_FORM'].includes(type)) return null;
    if (video.searchParams.get('serviceType') !== 'CLIP') return null;
    // Reconstruct only the known playback parameters; never copy input HTML.
    const src = new URL('https://clip-viewer.naver.com/oembed/');
    src.searchParams.set('seedMediaId', id);
    src.searchParams.set('mediaType', type);
    src.searchParams.set('serviceType', 'CLIP');
    const width = type === 'SHORT_FORM' ? 393 : 560;
    const height = type === 'SHORT_FORM' ? 699 : 315;
    const escaped = src.href.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
    return {
      version: '1.0', type: 'video', provider_name: 'NAVER Clip', provider_url: 'https://clip.naver.com/',
      title: '네이버 클립 영상', author_name: '네이버 클립', width, height,
      html: `<iframe width="${width}" height="${height}" title="NAVER Clip" src="${escaped}" frameborder="0" allow="autoplay; clipboard-write; web-share" allowfullscreen></iframe>`
    };
  }

  function isActive($) { return Boolean($?.[KEY] && $.get === $[KEY].wrapped); }

  function install($, pageHref) {
    if (!editorPage(pageHref)) return {ok:false,reason:'not-editor'};
    if (!$ || typeof $.get !== 'function' || typeof $.Deferred !== 'function') return {ok:false,reason:'not-ready'};
    const previous = $[KEY];
    if (isActive($) && previous.build === BUILD) return {ok:true,already:true};
    const original = isActive($) ? previous.original : $.get;
    function wrapped(url, data, success, dataType) {
      const callback = typeof data === 'function' ? data : success;
      const type = typeof data === 'function' ? success : dataType;
      // Delegate all other GETs and unsupported call signatures unchanged.
      if ((data != null && typeof data !== 'function') || (type != null && type !== 'json')) return original.apply(this, arguments);
      const response = makeResponse(url, pageHref);
      if (!response) return original.apply(this, arguments);
      const deferred = $.Deferred();
      let timer;
      const xhr = deferred.promise({
        readyState:1, status:0, statusText:'pending',
        getResponseHeader(name) { return this.readyState === 4 && String(name).toLowerCase() === 'content-type' ? 'application/json' : null; },
        getAllResponseHeaders() { return this.readyState === 4 ? 'content-type: application/json\r\n' : ''; },
        abort() {
          if (deferred.state() !== 'pending') return this;
          clearTimeout(timer);
          this.readyState = 0; this.statusText = 'abort';
          deferred.rejectWith(this, [this, 'abort', 'abort']);
          return this;
        }
      });
      if (typeof callback === 'function') deferred.done(callback);
      timer = setTimeout(() => {
        if (deferred.state() !== 'pending') return;
        xhr.readyState = 4; xhr.status = 200; xhr.statusText = 'OK';
        xhr.responseJSON = response; xhr.responseText = JSON.stringify(response);
        deferred.resolveWith(xhr, [response, 'success', xhr]);
      }, 0);
      return xhr;
    }
    $[KEY] = {original, wrapped, build:BUILD};
    $.get = wrapped;
    return {ok:true,already:false};
  }

  function uninstall($) {
    if (isActive($)) $.get = $[KEY].original;
    if ($) delete $[KEY];
    return {ok:true};
  }
  return {makeResponse, install, uninstall, isActive, editorPage};
});
