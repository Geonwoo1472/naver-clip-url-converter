const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../wcms-compat-core.js');
const editor='https://wcms.kyeonggi.com/editor?mediaOu=/00/01';
const src='https://clip-viewer.naver.com/oembed/?seedMediaId=AD6D67111F1B75D0768D6E64E48EDE251AE6&mediaType=SHORT_FORM&serviceType=CLIP';
const raw='/oembed?url='+src;
test('raw WCMS request preserves all Clip parameters',()=>{
  const data=core.makeResponse(raw,editor);
  assert.equal(data.width,393); assert.equal(data.height,699);
  assert.match(data.html,/mediaType=SHORT_FORM&amp;serviceType=CLIP/);
  assert.match(data.html,/seedMediaId=AD6D67111F1B75D0768D6E64E48EDE251AE6/);
  assert.ok(!data.html.includes('<figure'));
});
test('encoded and HTML-escaped URL produce the same playback response',()=>{
  assert.deepEqual(core.makeResponse('/oembed?url='+encodeURIComponent(src),editor),core.makeResponse(raw,editor));
  assert.deepEqual(core.makeResponse('/oembed?url='+src.replaceAll('&','&amp;'),editor),core.makeResponse(raw,editor));
});
test('longform maintains its type and landscape dimensions',()=>{
  const data=core.makeResponse(raw.replace('SHORT_FORM','LONG_FORM'),editor);
  assert.equal(data.width,560); assert.equal(data.height,315);
  assert.match(data.html,/mediaType=LONG_FORM/);
});
test('unrelated requests and invalid addresses are not intercepted',()=>{
  for(const url of ['/save?url='+src,'/oembed?url=https://youtu.be/5UV7ejB4enU','https://external.test/oembed?url='+src,raw.replace('https://clip-viewer.naver.com','https://clip-viewer.naver.com.evil.test'),raw.replace('serviceType=CLIP','serviceType=OTHER'),raw.replace('SHORT_FORM','UNKNOWN'),raw.replace('seedMediaId=AD6D67111F1B75D0768D6E64E48EDE251AE6','seedMediaId=%22%3E%3Cscript%3E'),raw.replace('https://clip-viewer','http://clip-viewer')]) assert.equal(core.makeResponse(url,editor),null,url);
});
test('compatibility only activates on the exact WCMS editor',()=>{
  assert.equal(core.editorPage(editor),true);
  for(const url of ['https://wcms.kyeonggi.com/editor-extra','https://wcms.kyeonggi.com/','https://wcms.kyeonggi.com.evil.test/editor','http://wcms.kyeonggi.com/editor']) {
    assert.equal(core.makeResponse(raw,url),null);
  }
});
test('no installation or network calls happen until explicitly invoked',()=>{
  let calls=0; const original=()=>{calls++;return 'delegated';};
  const $={get:original,Deferred(){throw new Error('not called for unrelated requests');}};
  assert.equal(core.install($,'https://other.test/editor').ok,false);
  assert.equal($.get,original);
  assert.equal(core.install($,editor).ok,true);
  assert.equal(calls,0);
  const installed=$.get;
  assert.equal(core.install($,editor).already,true);
  assert.equal($.get,installed);
  assert.equal($.get('/unrelated'),'delegated');
  assert.equal($.get(raw,{other:'parameter'}),'delegated');
  assert.equal(calls,2);
  core.uninstall($);
  assert.equal($.get,original);
  assert.equal(core.isActive($),false);
});
