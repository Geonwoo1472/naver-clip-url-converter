import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { convert, parseInput, directVideoUrl } from '../converter.mjs';

const seed = 'FE8AF1905AB9C0A3E5589EE4F65E312631F8';
const viewer = `https://clip-viewer.naver.com/oembed/?seedMediaId=${seed}&mediaType=SHORT_FORM&serviceType=CLIP`;
const frame = `<iframe width="393" height="699" title="NAVER Clip" src="${viewer}" frameborder="0" allow="autoplay; clipboard-write; web-share" allowfullscreen></iframe>`;
const shorts = `https://m.naver.com/shorts/?seedMediaId=${seed}&serviceType=CLIP`;
const noNetwork = () => { throw new Error('Local conversion unexpectedly attempted network access'); };
const response = (url, html = '') => ({ ok: true, status: 200, url, text: async () => html, body: { cancel: async () => {} } });

test('User supplied iframe produces exact src without network', async () => {
  assert.equal((await convert(frame, { fetchImpl: noNetwork })).videoUrl, viewer);
});
test('New user example inside figure extracts only the src URL', async () => {
  const newVideo = viewer.replace(seed, 'AD6D67111F1B75D0768D6E64E48EDE251AE6');
  const result = await convert(`<figure><iframe width="393" height="699" title="NAVER Clip" src="${newVideo}" frameborder="0" allow="autoplay; clipboard-write; web-share" allowfullscreen></iframe></figure>`, {fetchImpl:noNetwork});
  assert.equal(result.videoUrl,newVideo);
  assert.ok(!result.videoUrl.includes('<'));
});
test('Converter accepts Naver only', async () => {
  await assert.rejects(convert('https://youtu.be/5UV7ejB4enU',{fetchImpl:noNetwork}), /네이버 클립의 HTTPS/);
});
test('HTML ampersand entities and single quote attributes', async () => {
  assert.equal((await convert(`<iframe src='${viewer.replaceAll('&', '&amp;')}'></iframe>`, { fetchImpl: noNetwork })).videoUrl, viewer);
});
test('Unquoted src, uppercase tag and attribute names', async () => {
  assert.equal((await convert(`<IFRAME SRC=${viewer}></IFRAME>`, { fetchImpl: noNetwork })).videoUrl, viewer);
});
test('HTML encoded pasted embed and numeric entities', async () => {
  assert.equal((await convert(`&lt;iframe src=&quot;${viewer.replaceAll('&', '&#38;')}&quot;&gt;&lt;/iframe&gt;`, { fetchImpl: noNetwork })).videoUrl, viewer);
});
test('Source attributes inside title are not selected', async () => {
  assert.equal((await convert(`<iframe title="src='https://evil.test/'" src="${viewer}"></iframe>`, { fetchImpl: noNetwork })).videoUrl, viewer);
});
test('Markdown-escaped input is handled', async () => {
  assert.equal((await convert(frame.replaceAll('<', '\\<').replace('https:', 'https\\:'), { fetchImpl: noNetwork })).videoUrl, viewer);
});
test('Already extracted viewer URL is idempotent', async () => {
  assert.equal((await convert(viewer, { fetchImpl: noNetwork })).videoUrl, viewer);
});
test('Real observed short-link destination maps to same viewer URL', async () => {
  let calls = 0;
  const result = await convert('https://naver.me/50BvBBGs', { fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, 'https://naver.me/50BvBBGs');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'follow');
    return response(shorts);
  } });
  assert.equal(calls, 1);
  assert.equal(result.videoUrl, viewer);
});
test('Real HTTP bridge redirect expands safely to the same viewer URL', async () => {
  const bridge = 'https://link.naver.com/bridge?url=' + encodeURIComponent(shorts + '&recType=AIRS&panelType=share');
  const result = await convert('https://naver.me/50BvBBGs', { fetchImpl: async () => response(bridge) });
  assert.equal(result.videoUrl, viewer);
  assert.throws(() => directVideoUrl('https://link.naver.com/bridge?url=https%3A%2F%2Fevil.test%2F'), /HTTPS 주소만/);
});
test('Shorts URL works without network and preserves seed case', async () => {
  assert.equal((await convert(shorts, { fetchImpl: noNetwork })).videoUrl, viewer);
});
test('Long form iframe preserves type and optional parameters', async () => {
  const long = viewer.replace('SHORT_FORM', 'LONG_FORM') + '&start=10';
  const result = await convert(`<iframe src="${long}"></iframe>`, { fetchImpl: noNetwork });
  assert.equal(result.kind, 'LONG_FORM');
  assert.equal(result.videoUrl, long);
});
test('HTML refresh on short-link page is followed', async () => {
  const result = await convert('https://naver.me/50BvBBGs', { fetchImpl: async () => response('https://naver.me/50BvBBGs', `<meta http-equiv="refresh" content="0;url=${shorts.replaceAll('&','&amp;')}">`) });
  assert.equal(result.videoUrl, viewer);
});
test('Page iframe extraction ignores missing src embeds', async () => {
  const result = await convert('https://naver.me/50BvBBGs', { fetchImpl: async () => response('https://clip.naver.com/video/example', '<iframe></iframe>' + frame) });
  assert.equal(result.videoUrl, viewer);
});
test('Ambiguous pasted iframe input is rejected', async () => {
  await assert.rejects(convert(frame + frame), /여러 개/);
});
test('Ambiguous page videos are not guessed', async () => {
  await assert.rejects(convert('https://naver.me/50BvBBGs', { fetchImpl: async () => response('https://clip.naver.com/video/example', frame + frame.replace(seed, 'OTHER_VIDEO')) }), /여러 개/);
});
test('Invalid inputs, external hosts, and script URLs are rejected', () => {
  for (const value of ['', 'not a url', 'javascript:alert(1)', 'http://naver.me/a', 'https://naver.me.evil.test/a', 'https://user:pass@naver.me/a', 'https://naver.me:123/a', '<iframe src="javascript:alert(1)"></iframe>', '<iframe src="https://evil.test"></iframe>', '<iframe title="no src"></iframe>', '<iframe src="x" src="y"></iframe>']) {
    assert.throws(() => parseInput(value));
  }
});
test('Missing seed or unknown type is rejected', () => {
  assert.throws(() => directVideoUrl('https://clip-viewer.naver.com/oembed/?mediaType=SHORT_FORM'), /영상 ID/);
  assert.throws(() => directVideoUrl(`https://clip-viewer.naver.com/oembed/?seedMediaId=${seed}`), /영상 유형/);
});
test('Failed HTTP and unresolved page report errors', async () => {
  await assert.rejects(convert('https://naver.me/50BvBBGs', { fetchImpl: async () => ({ok:false,status:404}) }), /HTTP 404/);
  await assert.rejects(convert('https://naver.me/50BvBBGs', { fetchImpl: async () => response('https://naver.me/50BvBBGs', '<html></html>') }), /확인할 수 없습니다/);
});
test('External redirect response is rejected', async () => {
  await assert.rejects(convert('https://naver.me/50BvBBGs', { fetchImpl: async () => response('https://evil.test/a') }), /HTTPS 주소만/);
});
test('Aborted connection propagates timeout to UI handler', async () => {
  await assert.rejects(convert('https://naver.me/50BvBBGs', { fetchImpl: async () => { throw new DOMException('timeout', 'AbortError'); } }), {name:'AbortError'});
});
test('Manifest references real files, exact version and requested identity', () => {
  const root = new URL('../', import.meta.url);
  const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', root), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, '1.0.0.0');
  assert.match(manifest.author, /경기일보 플랫폼운영지원부 남건우/);
  const html = fs.readFileSync(new URL(manifest.action.default_popup, root), 'utf8');
  assert.match(html, /경기일보 플랫폼운영지원부/);
  assert.match(html, /남건우/);
  assert.match(html, /1\.0\.0\.0 version/);
  for (const file of Object.values(manifest.icons)) assert.ok(fs.existsSync(new URL(file, root)), file);
  assert.ok(!manifest.permissions.includes('tabs'));
  assert.ok(!manifest.permissions.includes('clipboardRead'));
});
