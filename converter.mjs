const ALLOWED_HOSTS = new Set(['naver.me', 'link.naver.com', 'm.naver.com', 'www.naver.com', 'clip.naver.com', 'clip-viewer.naver.com']);
const VIEWER = 'https://clip-viewer.naver.com/oembed/';

export function decodeEntities(value) {
  const named = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (full, name) => {
    if (name[0] !== '#') return named[name.toLowerCase()];
    const num = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
    return num > 0 && num <= 0x10ffff && !(num >= 0xd800 && num <= 0xdfff) ? String.fromCodePoint(num) : full;
  });
}

export function validateUrl(value, base) {
  let url;
  try { url = new URL(decodeEntities(value).trim(), base); }
  catch { throw new Error('올바른 영상 URL 또는 iframe 코드를 붙여넣어 주세요.'); }
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname) || url.username || url.password || url.port) {
    throw new Error('네이버 클립의 HTTPS 주소만 사용할 수 있습니다.');
  }
  url.hash = '';
  return url;
}

function iframeSources(text, strict = true) {
  const tags = text.match(/<iframe\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi) || [];
  return tags.map(tag => {
    const attributes = tag.slice(7, -1);
    const token = /([^\s=\/"'<>`]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`]+)))?/g;
    const sources = [];
    for (const m of attributes.matchAll(token)) {
      if (m[1].toLowerCase() === 'src') sources.push(m[2] ?? m[3] ?? m[4] ?? '');
    }
    if (sources.length !== 1 || !sources[0]) {
      if (strict) throw new Error('iframe의 src 주소를 확인해 주세요.');
      return null;
    }
    return sources[0];
  }).filter(Boolean);
}

export function parseInput(raw) {
  let text = String(raw ?? '').replace(/[\u200b\ufeff]/g, '').trim().replace(/\\([<>:&])/g, '$1');
  if (!text) throw new Error('iframe 코드 또는 네이버 클립 링크를 붙여넣어 주세요.');
  if (text.length > 100000) throw new Error('영상 한 개의 iframe 코드 또는 링크만 입력해 주세요.');
  if (!/<iframe\b/i.test(text) && /&lt;iframe\b/i.test(text)) text = decodeEntities(text);
  const sources = iframeSources(text);
  if (sources.length > 1) throw new Error('영상이 여러 개입니다. 한 개씩 변환해 주세요.');
  if (sources.length === 1) return { url: validateUrl(sources[0]), kind: 'iframe' };
  if (/<iframe\b/i.test(text)) throw new Error('iframe 코드가 완전하지 않습니다. 전체 코드를 붙여넣어 주세요.');
  return { url: validateUrl(text), kind: 'url' };
}

export function directVideoUrl(input, depth = 0) {
  if (depth > 3) throw new Error('링크 구조를 확인할 수 없습니다. 영상의 iframe 코드를 사용해 주세요.');
  const url = input instanceof URL ? validateUrl(input.href) : validateUrl(input);
  if (url.hostname === 'link.naver.com' && url.pathname === '/bridge') {
    const destination = url.searchParams.get('url');
    return destination ? directVideoUrl(validateUrl(destination), depth + 1) : null;
  }
  const seed = url.searchParams.get('seedMediaId');
  if (url.hostname === 'naver.me') return null;
  const isViewer = url.hostname === 'clip-viewer.naver.com' && /^\/oembed\/?$/.test(url.pathname);
  const isShorts = ['m.naver.com', 'www.naver.com'].includes(url.hostname) && /^\/shorts\/?$/.test(url.pathname);
  if (!isViewer && !isShorts) return null;
  if (!seed || !/^[A-Za-z0-9_-]{1,128}$/.test(seed)) throw new Error('영상 ID를 확인할 수 없습니다. 영상의 iframe 코드를 사용해 주세요.');
  const mediaType = url.searchParams.get('mediaType') || (isShorts ? 'SHORT_FORM' : '');
  if (!['SHORT_FORM', 'LONG_FORM'].includes(mediaType)) throw new Error('영상 유형을 확인할 수 없습니다. 영상의 iframe 코드를 사용해 주세요.');
  if (url.searchParams.has('serviceType') && url.searchParams.get('serviceType') !== 'CLIP') {
    throw new Error('네이버 클립 영상 주소를 사용해 주세요.');
  }
  if (isViewer) {
    url.searchParams.set('serviceType', 'CLIP');
    return { videoUrl: url.href, kind: mediaType };
  }
  const viewer = new URL(VIEWER);
  viewer.searchParams.set('seedMediaId', seed);
  viewer.searchParams.set('mediaType', mediaType);
  viewer.searchParams.set('serviceType', 'CLIP');
  return { videoUrl: viewer.href, kind: mediaType };
}

function getPageTarget(html, base) {
  // Parse inert strings only. Pasted scripts/iframes are never executed or inserted into the page.
  const candidates = new Map();
  for (const source of iframeSources(html, false)) {
    try {
      const target = validateUrl(source, base);
      const direct = directVideoUrl(target);
      if (direct) candidates.set(direct.videoUrl, direct);
    } catch { /* Ignore non-Clip page embeds. */ }
  }
  if (candidates.size === 1) return candidates.values().next().value;
  if (candidates.size > 1) throw new Error('페이지에 영상이 여러 개 있습니다. 원하는 영상의 iframe 코드를 사용해 주세요.');
  const metas = html.match(/<meta\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi) || [];
  for (const tag of metas) {
    if (!/http-equiv\s*=\s*["']?refresh/i.test(tag)) continue;
    const match = tag.match(/content\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const destination = decodeEntities(match?.[1] ?? match?.[2] ?? '').match(/(?:^|;)\s*url\s*=\s*(.+)$/i);
    if (!destination) continue;
    try { return { redirect: validateUrl(destination[1].replace(/^["']|["']$/g, ''), base) }; }
    catch { /* Never fetch an external destination from page markup. */ }
  }
  return null;
}

export async function convert(raw, { fetchImpl = fetch, signal } = {}) {
  const parsed = parseInput(raw);
  const direct = directVideoUrl(parsed.url);
  if (direct) return { ...direct, source: parsed.kind };
  let current = parsed.url;
  const visited = new Set();
  for (let i = 0; i < 3; i++) {
    if (visited.has(current.href)) break;
    visited.add(current.href);
    const currentDirect = directVideoUrl(current);
    if (currentDirect) return { ...currentDirect, source: 'link' };
    const response = await fetchImpl(current.href, {
      redirect: 'follow', credentials: 'omit', referrerPolicy: 'no-referrer', signal
    });
    if (!response.ok) throw new Error(`링크를 확인할 수 없습니다 (HTTP ${response.status}). 영상의 iframe 코드를 사용해 주세요.`);
    const finalUrl = validateUrl(response.url || current.href);
    const resolved = directVideoUrl(finalUrl);
    if (resolved) {
      // No need to download the redirected video page body.
      await response.body?.cancel();
      return { ...resolved, source: 'link' };
    }
    const html = await response.text();
    if (html.length > 3000000) throw new Error('페이지를 분석할 수 없습니다. 영상의 iframe 코드를 사용해 주세요.');
    const target = getPageTarget(html, finalUrl.href);
    if (target?.videoUrl) return { ...target, source: 'link' };
    if (target?.redirect) { current = target.redirect; continue; }
    break;
  }
  throw new Error('이 링크에서 영상 주소를 확인할 수 없습니다. 공유 메뉴의 iframe 코드를 붙여넣어 주세요.');
}
