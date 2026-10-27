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

test('life UI offers activities at the arcade, fortune teller and convenience store',()=>{
  const store=new Map(), c=client(store);c.node('player-name').value='ชาวกรุง';c.submit();
  for(const [location, label, action] of [
    ['arcade','แข่งตู้เกมกับเพื่อน','arcadeplay'],
    ['fortune','ให้หมอดูเปิดไพ่','fortunevisit'],
    ['minimart','ซื้อของว่าง','minimartsnack']
  ]){
    c.click({location});assert.match(c.node('app').innerHTML,new RegExp(label));c.click({action});
    assert.equal(JSON.parse(store.get(key)).game.location,location);
  }
});

test('life UI displays mission progress and an automatic one-time reward, including older saves',()=>{
  const saved=Life.create('ชาวกรุง','balance');delete saved.mission;
  const store=new Map([[key,JSON.stringify({game:saved,gender:'female'})]]), c=client(store);
  assert.match(c.node('app').innerHTML,/ภารกิจหาเงินค่าขนม/);
  assert.match(c.node('app').innerHTML,/0\/2/);
  assert.match(c.node('app').innerHTML,/สัปดาห์ 1–3/);
  c.click({location:'market'});c.click({action:'shop'});c.click({action:'shop'});
  assert.match(c.node('app').innerHTML,/รับรางวัล 350 ฿ แล้ว/);
  const afterReward=JSON.parse(store.get(key)).game.money;
  c.click({action:'shop'});assert.equal(JSON.parse(store.get(key)).game.money,afterReward+650);
});
