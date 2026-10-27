'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),C=require('../card-catalog.js'),D=require('../card-engine.js');
async function client({givenProfile=null,storage=new Map(),accountResult=null}={}){
  const nodes=new Map(),listeners={},windowEvents={};let socket;
  const node=id=>{if(!nodes.has(id))nodes.set(id,{id,dataset:{},innerHTML:'',textContent:'',value:'',open:false,children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},removeAttribute(){},focus(){},showModal(){this.open=true;},close(){this.open=false;},addEventListener(name,fn){this.events??={};this.events[name]=fn;},replaceChildren(){this.children=[];},append(...children){this.children.push(...children);}});return nodes.get(id);};
  let profile=givenProfile||require('../card-progress.js').migrate({id:'qa',name:'ทดสอบ',deck:C.starter(),deckName:'เรือนร้าง',wins:0,matches:0});const accountRequests=[];
  class Socket{static OPEN=1;constructor(){socket=this;this.readyState=1;this.sent=[];}send(text){this.sent.push(JSON.parse(text));}close(){this.readyState=3;}}
  const document={getElementById:node,activeElement:null,querySelectorAll:()=>[],body:{classList:{toggle(){}}},addEventListener:(type,fn)=>listeners[type]=fn,createElement:()=>node('chatline'),createTextNode:s=>s};
  const location={hash:'',protocol:'http:',host:'qa',reload(){}};
  const window={NativeCards:C,NativeContent:require('../card-content.js'),addEventListener:(name,fn)=>windowEvents[name]=fn,scrollTo(){}};
  vm.runInNewContext(fs.readFileSync('card-client.js','utf8'),{window,document,location,WebSocket:Socket,fetch:async(url,options)=>{if(url==='/api/account'){accountRequests.push(JSON.parse(options.body));profile=accountResult.profile;return {ok:true,json:async()=>accountResult};}return {ok:true,json:async()=>profile};},localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},setTimeout:()=>1,clearTimeout(){},setInterval(){},Date,console});await new Promise(r=>setImmediate(r));socket.onopen();
  const message=msg=>socket.onmessage({data:JSON.stringify(msg)});message({type:'hello',profile,queued:false,chat:[],online:1});
  const click=(key,dataset={})=>listeners.click({target:{closest:selector=>selector===key?{dataset,disabled:false}:null}});
  return {node,click,message,get socket(){return socket;},get profile(){return profile;},listeners,windowEvents,accountRequests};
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
test('all progression surfaces render and pack results reveal the actual five server cards',async()=>{
  const c=await client();for(const [view,text]of [['journey','เส้นทางผู้ผูกวิญญาณ'],['ritual','พิธีเรียกภูติ'],['progress','ภารกิจและสายสัมพันธ์'],['online','ลานประลองออนไลน์'],['history','บันทึกการประลอง'],['shop','ของแต่งแห่งแสงโคม'],['account','บัญชีและการกู้คืน']]){c.click('[data-view]',{view});assert.ok(c.node('main').innerHTML.includes(text),view);}
  c.click('[data-view]',{view:'ritual'});c.click('[data-pack]',{pack:'fire'});const command=c.socket.sent.at(-1);assert.equal(command.type,'pack');assert.equal(command.faction,'fire');assert.ok(command.request.length>=8);
  const p=JSON.parse(JSON.stringify(c.profile)),result=require('../card-progress.js').openPack(p,'fire','client-pack-result',()=>.1);c.message({type:'profile',profile:p,result,message:'สำเร็จ'});assert.equal(c.node('card-dialog').open,true);assert.match(c.node('card-detail').innerHTML,/วงอาคมกำลังรวมตัว/);c.click('#reveal-pack');assert.equal((c.node('card-detail').innerHTML.match(/data-inspect=/g)||[]).length,5);assert.ok(result.cards.every(item=>c.node('card-detail').innerHTML.includes(C.byId[item.id].name)));
});
test('unowned cards cannot enter a draft and co-op observers cannot issue turn commands',async()=>{
  const c=await client(),p=JSON.parse(JSON.stringify(c.profile));p.owned={g001:3};c.message({type:'profile',profile:p});c.click('[data-view]',{view:'deck'});c.click('[data-remove]',{remove:'g001'});const before=c.node('main').innerHTML;c.click('[data-add]',{add:'g040'});assert.equal(c.node('main').innerHTML,before);
  const g=D.create([{id:'team',name:'ทีม',deck:C.starter()},{id:'bot',name:'บอส',deck:C.starter()}],1),room={...D.view(g,0),id:'team-room',mode:'coop',canAct:false,controllerName:'เพื่อน',deadline:Date.now()+90000,targets:{}};c.message({type:'room',room});assert.match(c.node('main').innerHTML,/ตาของ เพื่อน/);const n=c.socket.sent.length;c.click('#end-turn');assert.equal(c.socket.sent.length,n);
});
test('new guests see Login/Guest choices, auth fields follow the selected mode and Guest choice survives reload',async()=>{
  const P=require('../card-progress.js'),p=P.create('fresh','ผู้เล่นใหม่'),storage=new Map(),c=await client({givenProfile:p,storage});
  assert.match(c.node('main').innerHTML,/เลือกวิธีเข้าเล่น/);assert.match(c.node('main').innerHTML,/id="enter-guest"/);
  c.click('[data-entry-auth]',{entryAuth:'login'});assert.match(c.node('main').innerHTML,/autocomplete="current-password"/);assert.doesNotMatch(c.node('main').innerHTML,/id="auth-recovery"/);
  c.click('[data-auth-mode]',{authMode:'recover'});assert.match(c.node('main').innerHTML,/id="auth-recovery"/);assert.match(c.node('main').innerHTML,/autocomplete="new-password"/);
  c.click('#entry-back');assert.match(c.node('main').innerHTML,/เลือกวิธีเข้าเล่น/);c.click('#enter-guest');assert.match(c.node('main').innerHTML,/YOUR FIRST JOURNEY · 0\/4/);assert.match(c.node('main').innerHTML,/data-challenge-id="summon"/);
  const reloaded=await client({givenProfile:p,storage});assert.doesNotMatch(reloaded.node('main').innerHTML,/เลือกวิธีเข้าเล่น/);assert.match(reloaded.node('main').innerHTML,/YOUR FIRST JOURNEY/);
});
test('newcomer steps use saved progress and can be hidden and reopened without losing the deck',async()=>{
  const p=require('../card-progress.js').create('guide','ผู้เริ่มต้น'),c=await client({givenProfile:p});c.click('#enter-guest');const savedDeck=p.deck.slice();
  assert.equal((c.node('main').innerHTML.match(/WELCOME GIFT/g)||[]).length,1);c.click('#hide-guide');assert.match(c.node('main').innerHTML,/WELCOME GIFT/);c.click('#open-guide');
  p.progress.lessons=['summon','shield','attack'];p.xp=120;c.message({type:'profile',profile:p});assert.match(c.node('main').innerHTML,/YOUR FIRST JOURNEY · 1\/4/);assert.match(c.node('main').innerHTML,/รับเด็คต้อนรับ/);
  assert.equal((c.node('main').innerHTML.match(/WELCOME GIFT/g)||[]).length,1);
  p.starterChosen=true;c.message({type:'profile',profile:p});assert.match(c.node('main').innerHTML,/ไปเปิดซองแรก/);
  p.pity.opened=1;c.message({type:'profile',profile:p});assert.match(c.node('main').innerHTML,/เล่นเกมแรกกับ AI/);
  p.progress.firstDuel=true;c.message({type:'profile',profile:p});assert.match(c.node('main').innerHTML,/YOUR FIRST JOURNEY · 4\/4/);
  c.click('#hide-guide');assert.doesNotMatch(c.node('main').innerHTML,/YOUR FIRST JOURNEY/);c.click('#open-guide');assert.match(c.node('main').innerHTML,/YOUR FIRST JOURNEY · 4\/4/);assert.deepEqual(c.profile.deck,savedDeck);
});
test('entry login submits the existing account flow and resumes its saved profile',async()=>{
  const P=require('../card-progress.js'),fresh=P.create('anonymous','Guest'),saved=P.create('existing','ผู้เล่นเดิม');saved.account='existing_account';saved.matches=12;saved.xp=500;saved.starterChosen=true;
  const c=await client({givenProfile:fresh,accountResult:{profile:saved,recovery:null}});c.click('[data-entry-auth]',{entryAuth:'login'});c.node('auth-action').value='login';c.node('auth-username').value='existing_account';c.node('auth-password').value='test-only-passphrase';
  c.listeners.submit({target:{id:'account-form'},preventDefault(){}});await new Promise(r=>setImmediate(r));c.socket.onopen();
  assert.equal(c.accountRequests[0].action,'login');assert.equal(c.profile.id,'existing');assert.equal(c.profile.xp,500);assert.equal(c.profile.matches,12);assert.doesNotMatch(c.node('main').innerHTML,/เลือกวิธีเข้าเล่น/);assert.doesNotMatch(c.node('main').innerHTML,/test-only-passphrase/);
});
test('Guest registration keeps saved collection and deck and prominently displays the recovery key',async()=>{
  const P=require('../card-progress.js'),guest=P.create('guest-progress','สหายเดิม');guest.matches=4;guest.xp=120;guest.wallet.coins=280;const registered=JSON.parse(JSON.stringify(guest));registered.account='new_account';const recovery='b'.repeat(48);
  const c=await client({givenProfile:guest,accountResult:{profile:registered,recovery}});c.click('[data-account-mode]',{accountMode:'register'});assert.match(c.node('main').innerHTML,/สมัครและเก็บความก้าวหน้า/);c.node('auth-action').value='register';c.node('auth-username').value='new_account';c.node('auth-password').value='test-registration-pass';
  c.listeners.submit({target:{id:'account-form'},preventDefault(){}});await new Promise(r=>setImmediate(r));c.socket.onopen();assert.equal(c.profile.id,guest.id);assert.deepEqual(c.profile.deck,guest.deck);assert.deepEqual(c.profile.owned,guest.owned);assert.equal(c.profile.wallet.coins,280);assert.ok(c.node('main').innerHTML.includes(recovery));assert.match(c.node('main').innerHTML,/ไปพบสหายของคุณ/);
});
test('tutorial completion continues to the next lesson only after dismissing the finished room',async()=>{
  const c=await client(),g=D.create([{id:'qa',name:'ผู้เรียน',deck:C.starter()},{id:'bot',name:'คู่ฝึก',deck:C.starter()}],1);g.phase='finished';g.winner=0;
  c.message({type:'room',room:{...D.view(g,0),id:'lesson-room',mode:'lesson',challenge:'lesson:summon',targets:{}}});assert.match(c.node('main').innerHTML,/เรียนบทถัดไป →/);c.click('#continue-onboarding');assert.equal(c.socket.sent.at(-1).type,'dismiss');c.message({type:'dismissed'});assert.equal(c.socket.sent.at(-1).type,'play');assert.equal(c.socket.sent.at(-1).mode,'lesson');assert.equal(c.socket.sent.at(-1).challenge,'shield');
});
