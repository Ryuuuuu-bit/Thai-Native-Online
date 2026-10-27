'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),C=require('../card-catalog.js'),D=require('../card-engine.js');
async function client(){
  const nodes=new Map(),listeners={},windowEvents={};let socket;
  const node=id=>{if(!nodes.has(id))nodes.set(id,{id,dataset:{},innerHTML:'',textContent:'',value:'',open:false,children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},removeAttribute(){},focus(){},showModal(){this.open=true;},close(){this.open=false;},addEventListener(name,fn){this.events??={};this.events[name]=fn;},replaceChildren(){this.children=[];},append(...children){this.children.push(...children);}});return nodes.get(id);};
  const profile={id:'qa',name:'ทดสอบ',deck:C.starter(),deckName:'เรือนร้าง',wins:0,matches:0};
  class Socket{static OPEN=1;constructor(){socket=this;this.readyState=1;this.sent=[];}send(text){this.sent.push(JSON.parse(text));}close(){this.readyState=3;}}
  const document={getElementById:node,activeElement:null,querySelectorAll:()=>[],body:{classList:{toggle(){}}},addEventListener:(type,fn)=>listeners[type]=fn,createElement:()=>node('chatline'),createTextNode:s=>s};
  const location={hash:'',protocol:'http:',host:'qa',reload(){}};
  const window={NativeCards:C,addEventListener:(name,fn)=>windowEvents[name]=fn,scrollTo(){}};
  vm.runInNewContext(fs.readFileSync('card-client.js','utf8'),{window,document,location,WebSocket:Socket,fetch:async()=>({ok:true,json:async()=>profile}),setTimeout:()=>1,clearTimeout(){},setInterval(){},Date,console});await new Promise(r=>setImmediate(r));socket.onopen();
  const message=msg=>socket.onmessage({data:JSON.stringify(msg)});message({type:'hello',profile,queued:false,chat:[],online:1});
  const click=(key,dataset={})=>listeners.click({target:{closest:selector=>selector===key?{dataset,disabled:false}:null}});
  return {node,click,message,socket,profile,listeners,windowEvents};
}
test('actual client paginates all 100 cards and deck edits are drafts until a validated save',async()=>{
  const c=await client();assert.match(c.node('main').innerHTML,/ผูกวิญญาณเป็นมิตร/);c.click('[data-view]',{view:'collection'});assert.equal((c.node('main').innerHTML.match(/class="collection-entry"/g)||[]).length,20);assert.match(c.node('main').innerHTML,/พบ 100 ชนิด/);
  c.click('[data-catalog-page]',{catalogPage:'4'});assert.match(c.node('catalog-results').innerHTML,/data-inspect="g100"/);assert.match(c.node('catalog-results').innerHTML,/หน้า 5 \/ 5/);
  c.click('[data-view]',{view:'deck'});c.click('[data-remove]',{remove:'g001'});assert.match(c.node('main').innerHTML,/39<small/);assert.equal(c.profile.deck.length,40);
  c.click('[data-add]',{add:'g001'});c.click('#save-deck');assert.equal(c.socket.sent.at(-1).type,'save');assert.equal(c.socket.sent.at(-1).deck.length,40);
  const snapshot=c.node('main').innerHTML;c.click('[data-starter]',{starter:'fire'});assert.equal(c.node('main').innerHTML,snapshot,'pending save cannot replace the deck');
  c.message({type:'error',message:'รอสักครู่'});c.click('[data-starter]',{starter:'fire'});c.click('#save-deck');assert.deepEqual(c.socket.sent.at(-1).deck,C.starter('fire'));
});
test('actual client selects a hand card, sends summon with revision and hides opponent cards',async()=>{
  const c=await client(),g=D.create([{id:'qa',name:'เรา',deck:C.starter()},{id:'bot',name:'คู่ต่อสู้',deck:C.starter('fire')}],12);g.players[0].hand[0].card='g001';
  const room={...D.view(g,0),id:'room',mode:'solo',deadline:Date.now()+90000,targets:{}};c.message({type:'room',room});assert.match(c.node('main').innerHTML,/ไพ่ในมือ/);assert.doesNotMatch(c.node('main').innerHTML,/data-hand="h6"/);
  c.click('[data-hand]',{hand:room.players[0].hand[0].uid});assert.match(c.node('main').innerHTML,/id="summon-card"/);c.click('#summon-card');assert.equal(c.socket.sent.at(-1).type,'summon');assert.equal(c.socket.sent.at(-1).revision,0);
  const sent=c.socket.sent.length;c.click('#end-turn');assert.equal(c.socket.sent.length,sent,'blocks commands until server responds');
});
test('all five illustration atlases exist and no retired game code is referenced by the entry page',()=>{
  const html=fs.readFileSync('index.html','utf8');assert.doesNotMatch(html,/phaser|rpg-client|artillery|fashion-catalog/);
  for(const f of Object.keys(C.factions)){const buf=fs.readFileSync('assets/cards/'+f+'.png');assert.equal(buf.toString('hex',0,8),'89504e470d0a1a0a');assert.ok(buf.readUInt32BE(16)>=1000);assert.ok(buf.readUInt32BE(20)>=800);assert.ok(fs.readFileSync('assets/cards/'+f+'.prompt.txt','utf8').includes('20 DISTINCT'));}
  for(const match of html.matchAll(/(?:src|href)="([^"#][^"]*)"/g)){const src=match[1];if(!src.startsWith('http'))assert.ok(fs.existsSync(src),src);}
});
