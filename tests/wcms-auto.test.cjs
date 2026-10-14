const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const base = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(base, 'background.js'), 'utf8');
const core = fs.readFileSync(path.join(base, 'wcms-compat-core.js'), 'utf8');
const auto = fs.readFileSync(path.join(base, 'wcms-compat.js'), 'utf8');
const editor = 'https://wcms.kyeonggi.com/editor?mediaOu=/00/01';
const settle = () => new Promise(resolve => setImmediate(resolve));
function event() {
  const listeners = [];
  return {addListener(fn) { listeners.push(fn); }, emit(...args) { return Promise.all(listeners.map(fn => fn(...args))); }};
}
function workerFixture(tabs = []) {
  const calls = [];
  const queries = [];
  const chrome = {
    tabs: {onCreated:event(), onUpdated:event(), async query(options) { queries.push(options); return tabs; }},
    runtime: {onInstalled:event(), onStartup:event()},
    permissions: {onAdded:event()},
    scripting: {async executeScript(options) { calls.push(options); }}
  };
  vm.runInNewContext(worker, {chrome, URL, Set, Promise});
  return {chrome, calls, queries};
}
test('worker applies to existing editor windows without active/currentWindow restriction', async () => {
  const f = workerFixture([
    {id:1, url:editor, windowId:10}, {id:2, url:editor, windowId:20},
    {id:3, url:'https://wcms.kyeonggi.com/editor-extra'}, {id:4,url:'https://other.test/editor'}
  ]);
  await settle();
  assert.deepEqual(f.calls.filter(c=>c.world==='MAIN').map(c => c.target.tabId), [1,2]);
  assert.equal(f.queries[0].currentWindow, undefined);
  assert.equal(f.queries[0].active, undefined);
  assert.equal(f.calls[0].world, 'MAIN');
});
test('new popup creation and navigation completion trigger application', async () => {
  const f = workerFixture(); await settle();
  await f.chrome.tabs.onCreated.emit({id:11,url:editor});
  await f.chrome.tabs.onUpdated.emit(12,{url:editor},{id:12,url:'about:blank'});
  await settle();
  await f.chrome.tabs.onUpdated.emit(12,{status:'complete'},{id:12,url:editor});
  await settle();
  assert.deepEqual(f.calls.filter(c=>c.world==='MAIN').map(c=>c.target.tabId),[11,12,12]);
  await f.chrome.tabs.onUpdated.emit(12,{title:'changed'},{id:12,url:editor});
  await f.chrome.tabs.onCreated.emit({id:13,url:'about:blank'});
  assert.equal(f.calls.filter(c=>c.world==='MAIN').length,3);
});
test('extension update, browser startup and permission grant scan existing editors', async () => {
  const f = workerFixture([{id:1,url:editor}]); await settle();
  for (const e of [f.chrome.runtime.onInstalled,f.chrome.runtime.onStartup,f.chrome.permissions.onAdded]) await e.emit();
  assert.equal(f.calls.filter(c=>c.world==='MAIN').length,4);
});
test('closed tab injection failures do not prevent the other editors or later retries', async () => {
  const f = workerFixture(); await settle();
  f.chrome.scripting.executeScript = async options => {f.calls.push(options); if(options.target.tabId===1) throw Error('closed');};
  await f.chrome.tabs.onCreated.emit({id:1,url:editor});
  await f.chrome.tabs.onCreated.emit({id:2,url:editor});
  await f.chrome.tabs.onCreated.emit({id:1,url:editor});
  assert.deepEqual(f.calls.filter(c=>c.world==='MAIN').map(c=>c.target.tabId),[1,2,1]);
});
function autoFixture(href=editor) {
  const timers=[];
  const context=vm.createContext({URL,location:{href},setTimeout(fn){timers.push(fn);}});
  vm.runInContext(core,context);
  return {context,timers,run:()=>vm.runInContext(auto,context)};
}
test('auto installer waits for delayed jQuery, without duplicating pending work', () => {
  const f=autoFixture();
  assert.equal(f.run().pending,true);
  f.run(); assert.equal(f.timers.length,1);
  f.timers.shift()(); assert.equal(f.timers.length,1);
  const original=()=>{};
  f.context.jQuery={get:original,Deferred(){}};
  f.timers.shift()();
  assert.equal(f.context.GyeonggiClipCompat.isActive(f.context.jQuery),true);
  assert.equal(f.timers.length,0);
  const wrapped=f.context.jQuery.get;
  f.run(); assert.equal(f.context.jQuery.get,wrapped);
});
test('auto installer stops bounded retries and can restart after completion event', () => {
  const f=autoFixture(); f.run();
  let count=0;
  while(f.timers.length && count<200) {f.timers.shift()(); count++;}
  assert.equal(count,119); assert.equal(f.timers.length,0);
  f.context.jQuery={get(){},Deferred(){}};
  assert.equal(f.run().ok,true);
});
test('auto installer leaves unrelated pages alone', () => {
  const f=autoFixture('https://wcms.kyeonggi.com/editor-extra');
  assert.equal(f.run().ok,false);
  assert.equal(f.timers.length,0);
});

