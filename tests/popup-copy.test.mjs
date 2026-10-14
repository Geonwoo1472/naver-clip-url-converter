import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { convert } from '../converter.mjs';
const source=fs.readFileSync(new URL('../popup.mjs',import.meta.url),'utf8').replace(/^import[^\n]*\n/,'');
const url='https://clip-viewer.naver.com/oembed/?seedMediaId=BA2A3071C289ED5C401E264FEEF201E046B6&mediaType=SHORT_FORM&serviceType=CLIP';
function setup(copyFails=false) {
  const nodes={},copied=[],alerts=[];
  for(const key of ['converterForm','input','output','status','result','convertButton','clearButton','typeBadge']) nodes[key]={value:'',textContent:'',className:'',hidden:true,events:{},addEventListener(type,fn){this.events[type]=fn;},focus(){this.focused=true;},select(){this.selected=true;}};
  const context={document:{querySelector:s=>nodes[s.slice(1)]},convert,navigator:{clipboard:{async writeText(value){if(copyFails)throw Error('blocked');copied.push(value);}}},alert:text=>alerts.push(text),AbortController,setTimeout,clearTimeout,Event,TypeError};
  vm.runInNewContext(source,context);
  return {nodes,copied,alerts,submit:()=>nodes.converterForm.events.submit({preventDefault(){}})};
}
test('one submit extracts URL, copies it and alerts completion',async()=>{
  const s=setup();s.nodes.input.value=`<iframe src="${url}"></iframe>`;
  await s.submit();assert.deepEqual(s.copied,[url]);assert.equal(s.alerts.length,1);
  assert.match(s.alerts[0],/복사되었습니다/);assert.equal(s.nodes.result.hidden,true);
  assert.equal(s.nodes.convertButton.disabled,false);
});
test('clipboard denial exposes selected URL and does not claim completion',async()=>{
  const s=setup(true);s.nodes.input.value=url;await s.submit();
  assert.equal(s.alerts.length,0);assert.equal(s.nodes.result.hidden,false);
  assert.equal(s.nodes.output.value,url);assert.equal(s.nodes.output.selected,true);
  assert.match(s.nodes.status.textContent,/자동 복사가 되지 않았습니다/);
});
test('invalid input never copies or alerts and releases the button',async()=>{
  const s=setup();s.nodes.input.value='잘못된 입력';await s.submit();
  assert.equal(s.copied.length,0);assert.equal(s.alerts.length,0);
  assert.equal(s.nodes.status.className,'error');assert.equal(s.nodes.convertButton.disabled,false);
});
