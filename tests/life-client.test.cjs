'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Life = require('../life-engine.js');
const script = fs.readFileSync(require.resolve('../life-client.js'), 'utf8');
const key = 'thainative-life-demo-v1';

function client(store = new Map(), denySave = false) {
  const nodes = new Map(), events = {};
  function node(id) {
    if (!nodes.has(id)) nodes.set(id, { innerHTML:'', value:'', textContent:'', classList:{add(){}, remove(){}}, focus(){}, showModal(){}, close(){} });
    return nodes.get(id);
  }
  const document = { getElementById:node, addEventListener:(name,fn)=>events[name]=fn, querySelectorAll:()=>[], querySelector:()=>null };
  const localStorage = { getItem:k=>store.get(k) ?? null, setItem:(k,v)=>{if(denySave)throw new Error('unavailable');store.set(k,v);}, removeItem:k=>store.delete(k) };
  vm.runInNewContext(script, { document, Life, localStorage, confirm:()=>true, setTimeout:()=>0, clearTimeout(){} });
  return { node, events, click:(dataset={},id='')=>events.click({target:{closest:()=>({dataset,id})}}), submit:()=>events.submit({target:{id:'start-form'},preventDefault(){}}) };
}

test('life UI starts, escapes player names, completes landmark activity and resumes saved progress',()=>{
  const store=new Map(), c=client(store);
  assert.match(c.node('app').innerHTML,/สร้างชาวกรุง/);
  c.node('player-name').value='<img onerror=x>';c.submit();
  assert.match(c.node('app').innerHTML,/&lt;img onerror=x&gt;/);
  assert.doesNotMatch(c.node('app').innerHTML,/<img onerror=x>/);
  c.click({location:'temple'});assert.match(c.node('app').innerHTML,/เที่ยวชมวัดอรุณ/);
  c.click({action:'templevisit'});assert.equal(JSON.parse(store.get(key)).game.hours,32);
  const resumed=client(store);assert.match(resumed.node('app').innerHTML,/&lt;img onerror=x&gt;/);assert.match(resumed.node('app').innerHTML,/วัดอรุณ/);
});

test('life UI ignores a corrupt save and warns when browser storage refuses to save',()=>{
  const store=new Map([[key,'not json']]), c=client(store,true);
  assert.match(c.node('app').innerHTML,/สร้างชาวกรุง/);
  c.node('player-name').value='ชาวกรุง';c.submit();
  assert.match(c.node('app').innerHTML,/บันทึกไม่สำเร็จ/);
});
