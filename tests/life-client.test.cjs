'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Life = require('../life-engine.js');
const LifeParty = require('../life-party.js');
const LifeMap = require('../life-map.js');
const script = fs.readFileSync(require.resolve('../life-client.js'), 'utf8');
const key = 'thainative-life-demo-v1';

function client(store = new Map(), denySave = false, life = Life, options = {}) {
  const nodes = new Map(), events = {};
  const sockets=[],timers=[],animations=[],images=[],loadedClasses=new Set();
  class TestImage {constructor(){images.push(this);}set src(value){this.path=value;if((options.delayedImages||[]).includes(value))return;if((options.failedImages||[]).includes(value))this.onerror?.();else this.onload?.();}}
  class Socket { constructor(url){this.url=url;this.readyState=0;this.sent=[];sockets.push(this);} open(){this.readyState=1;this.onopen();} send(data){this.sent.push(JSON.parse(data));} receive(data){this.onmessage({data:JSON.stringify(data)});} close(){this.readyState=3;if(this.onclose)this.onclose();} }
  function node(id) {
    if (!nodes.has(id)) {
      const el={ innerHTML:'', value:'', textContent:'', dataset:{}, style:{setProperty(key,value){this[key]=value;}}, classList:{add(){}, remove(){}, toggle(){}}, focus(){}, showModal(){}, close(){} };
      if(id==='map-token'&&options.animation)el.animate=(frames,options)=>{const a={frames,options,cancelled:false,cancel(){this.cancelled=true;}};animations.push(a);return a;};
      nodes.set(id,el);
    }
    return nodes.get(id);
  }
  const document = { getElementById:node, addEventListener:(name,fn)=>events[name]=fn, querySelectorAll:()=>[], querySelector:()=>null,documentElement:{classList:{add:value=>loadedClasses.add(value)}} };
  const localStorage = { getItem:k=>store.get(k) ?? null, setItem:(k,v)=>{if(denySave)throw new Error('unavailable');store.set(k,v);}, removeItem:k=>store.delete(k) };
  const session=new Map(), sessionStorage={getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)};
  vm.runInNewContext(script, { document, Life:life, LifeParty, LifeMap, localStorage,sessionStorage,WebSocket:Socket,Image:options.imageSupport?TestImage:undefined,location:{protocol:'http:',host:'localhost'},matchMedia:query=>({matches:!!options.reducedMotion&&query.includes('prefers-reduced-motion')}),confirm:()=>options.confirm!==false, setTimeout:fn=>{timers.push(fn);return timers.length;}, clearTimeout(){} });
  return { node, events, sockets,session,timers,animations,images,loadedClasses,click:(dataset={},id='')=>events.click({target:{closest:()=>({dataset,id})}}), submit:(id='start-form')=>events.submit({target:{id},preventDefault(){}}) };
}

test('walking is a cancellable preview, then opens a unique NPC scene without spending time',()=>{
  const store=new Map(),c=client(store,false,Life,{animation:true});c.node('player-name').value='ดาว';c.submit();
  const before=store.get(key);c.click({location:'temple'});assert.equal(store.get(key),before);assert.equal(c.animations.length,1);assert.equal(c.node('place-actions').inert,true);
  c.click({action:'rest'});c.click({},'end-week');assert.equal(store.get(key),before);
  assert.doesNotMatch(c.node('app').innerHTML,/interior-title/);
  let sawFerry=false;
  for(let i=0;i<c.animations.length&&i<30;i++){if(c.node('travel-status').textContent.includes('ข้ามแม่น้ำ'))sawFerry=true;c.animations[i].onfinish();}
  assert.equal(sawFerry,true);
  assert.equal(c.animations.at(-1).frames.at(-1).left,LifeMap.positions.temple.x+'%');assert.match(c.node('app').innerHTML,/interior-title/);assert.match(c.node('app').innerHTML,/คุณมาลี/);assert.match(c.node('app').innerHTML,/เที่ยวชมวัดอรุณ/);assert.equal(c.node('place-actions').inert,false);assert.equal(store.get(key),before);
  c.click({location:'market'});assert.doesNotMatch(c.node('app').innerHTML,/interior-title/);assert.equal(store.get(key),before);
  c.click({},'back-map');assert.doesNotMatch(c.node('app').innerHTML,/interior-title/);
  c.click({location:'market'});const prior=c.animations.at(-1);c.click({},'mode-menu');assert.equal(prior.cancelled,true);prior.onfinish();assert.match(c.node('app').innerHTML,/อยากใช้ชีวิตแบบไหน/);assert.equal(store.get(key),before);
});

test('career walk art is loaded only for the active role and never changes during a walk',()=>{
  const path='assets/career-walk-office.png';
  const c=client(new Map(),false,Life,{animation:true,imageSupport:true,delayedImages:[path]});
  c.node('player-name').value='เอ';c.submit();
  assert.deepEqual(c.images.filter(x=>x.path?.startsWith('assets/career-walk-')).map(x=>x.path),[path]);
  const image=c.images.find(x=>x.path===path),token=c.node('map-token');
  c.click({location:'temple'});assert.equal(token.dataset.walkRole,undefined);
  image.onload();assert.equal(token.dataset.walkRole,undefined);
  c.click({location:'market'});assert.equal(token.dataset.walkRole,'office');
  assert.equal(token.style['--career-walk'],'url("'+path+'")');
  c.click({},'mode-menu');assert.equal(token.dataset.walkRole,undefined);
});

test('failed career walk image falls back to the ordinary walking sheet; legacy profiles request none',()=>{
  const path='assets/career-walk-office.png';
  const c=client(new Map(),false,Life,{animation:true,imageSupport:true,failedImages:[path]});c.node('player-name').value='เอ';c.submit();
  c.click({location:'market'});assert.equal(c.node('map-token').dataset.walkRole,undefined);assert.ok(c.loadedClasses.has('walk-ready'));
  const old=Life.create('เดิม','balance'),legacy=client(new Map([[key,JSON.stringify({game:old,gender:'female'})]]),false,Life,{imageSupport:true});
  assert.equal(legacy.images.some(x=>x.path?.startsWith('assets/career-walk-')),false);
});

test('role walking remains available even if the ordinary walking sheet fails',()=>{
  const c=client(new Map(),false,Life,{animation:true,imageSupport:true,failedImages:['assets/life-walk.png']});c.node('player-name').value='เอ';c.submit();
  c.click({location:'market'});assert.equal(c.node('map-token').dataset.walkRole,'office');assert.equal(c.loadedClasses.has('walk-ready'),false);
});

test('local co-op loads a new walking sheet only when its player becomes active',()=>{
  const c=client(new Map(),false,Life,{imageSupport:true});c.click({},'mode-menu');c.click({mode:'local'});
  for(const [i,name,role] of [[1,'หนึ่ง','office'],[2,'สอง','rider']]){c.node('party-name-'+i).value=name;c.node('party-career-'+i).value=role;c.node('party-gender-'+i).value='female';}
  c.submit('party-form');assert.deepEqual(c.images.filter(x=>x.path?.startsWith('assets/career-walk-')).map(x=>x.path),['assets/career-walk-office.png']);
  c.click({},'end-week');assert.deepEqual(c.images.filter(x=>x.path?.startsWith('assets/career-walk-')).map(x=>x.path),['assets/career-walk-office.png','assets/career-walk-rider.png']);
});

test('online turn changes cancel stale movement and cannot open an old interior',()=>{
  const c=client(new Map(),false,Life,{animation:true});c.click({},'mode-menu');c.click({mode:'online'});
  c.node('online-name').value='เอ';c.node('online-career').value='office';c.node('online-gender').value='female';c.click({},'online-create');
  const ws=c.sockets[0];ws.open();ws.receive({type:'welcome',token:'a'.repeat(64),resumed:false});
  const game=Life.create('เอ',null,'office');const room={phase:'playing',code:'ABCD23',self:'p1',host:'p1',current:'p1',players:[{id:'p1',name:'เอ',gender:'female',game,connected:true},{id:'p2',name:'บี',game:Life.create('บี',null,'rider'),connected:true}],revision:1,objective:{teamIntact:true}};
  ws.receive({type:'state',room});c.click({location:'market'});const animation=c.animations.at(-1);assert.ok(animation);
  room.current='p2';room.revision++;ws.receive({type:'state',room});assert.equal(animation.cancelled,true);animation.onfinish();assert.doesNotMatch(c.node('app').innerHTML,/interior-title/);assert.match(c.node('app').innerHTML,/รอเพื่อนเล่น/);
});

test('reduced motion opens the destination immediately without starting an animation',()=>{
  const c=client(new Map(),false,Life,{animation:true,reducedMotion:true});c.node('player-name').value='เอ';c.submit();c.click({location:'temple'});
  assert.equal(c.animations.length,0);assert.match(c.node('app').innerHTML,/interior-title/);assert.match(c.node('app').innerHTML,/คุณมาลี/);
});

test('each destination opens its own NPC greeting and correct atlas tile',()=>{
  const c=client();c.node('player-name').value='ดาว';c.submit();
  for(const [i,location] of Life.locations.entries()){
    c.click({location:location.id});const html=c.node('app').innerHTML;
    assert.match(html,/interior-title/);assert.match(html,/npc-dialog/);
    assert.ok(html.includes(`background-position:${(i%3)*50}% ${Math.floor(i/3)*100/3}%`),location.id);
    c.click({},'back-map');
  }
});

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

test('career selection and free random roll show actual passives before starting and preserve the entered name',()=>{
  const store=new Map(), randomCareer=()=>Life.careers.find(c=>c.id==='minimart');
  const c=client(store,false,{...Life,randomCareer});
  assert.match(c.node('app').innerHTML,/เลือกอาชีพหรือจุดเริ่มต้น/);
  assert.match(c.node('app').innerHTML,/สุ่มอาชีพฟรี/);
  assert.doesNotMatch(c.node('app').innerHTML,/เป้าหมายชีวิตของฉัน/);
  c.node('player-name').value='ดาว';c.click({},'random-career');
  assert.match(c.node('career-detail').innerHTML,/พนักงานร้านสะดวกซื้อ/);
  assert.match(c.node('career-detail').innerHTML,/ข้อดี/);assert.match(c.node('career-detail').innerHTML,/ข้อเสีย/);
  c.submit();const saved=JSON.parse(store.get(key)).game;assert.equal(saved.name,'ดาว');assert.equal(saved.career,'minimart');
  c.click({location:'minimart'});assert.match(c.node('app').innerHTML,/\+700 ฿/);assert.match(c.node('app').innerHTML,/-23/);
  c.click({action:'minimartjob'});assert.equal(JSON.parse(store.get(key)).game.money,saved.money+700);
});

test('temporary shelter is labelled honestly and old saves retain neutral values',()=>{
  const s=new Map(),c=client(s);c.node('player-name').value='นก';c.click({career:'unhoused'});c.submit();
  assert.match(c.node('app').innerHTML,/ที่พักชั่วคราว/);assert.match(c.node('app').innerHTML,/ค่าที่พักชั่วคราว 300 ฿/);
  const old=Life.create('ผู้เล่นเดิม','balance');const store=new Map([[key,JSON.stringify({game:old,gender:'female'})]]),legacy=client(store);
  assert.match(legacy.node('app').innerHTML,/เป้าหมาย: ชีวิตสมดุล/);assert.doesNotMatch(legacy.node('app').innerHTML,/Passive ประจำตัว/);
  legacy.click({location:'market'});assert.match(legacy.node('app').innerHTML,/\+650 ฿/);
});

test('career and gender select distinct portraits in creation and persist through solo play',()=>{
  const store=new Map(),c=client(store);c.node('player-name').value='ใบตอง';
  c.click({career:'rider'});assert.match(c.node('career-detail').innerHTML,/data-avatar-career="rider" data-avatar-gender="female"/);
  c.click({gender:'male'});assert.match(c.node('career-detail').innerHTML,/data-avatar-career="rider" data-avatar-gender="male"/);
  c.submit();assert.match(c.node('app').innerHTML,/data-avatar-career="rider" data-avatar-gender="male"/);assert.match(c.node('app').innerHTML,/map-career-icon/);
  const reloaded=client(store);assert.match(reloaded.node('app').innerHTML,/data-avatar-career="rider" data-avatar-gender="male"/);
  const old=Life.create('เดิม','balance'),legacy=client(new Map([[key,JSON.stringify({game:old,gender:'male'})]]));
  assert.doesNotMatch(legacy.node('app').innerHTML,/data-avatar-career=/);
});

test('all seven careers use their own atlas cell for both genders',()=>{
  const c=client();
  for(const [i,role] of Life.careers.entries()){
    c.click({career:role.id});
    for(const gender of ['female','male']){
      c.click({gender});const html=c.node('career-detail').innerHTML;
      assert.ok(html.includes(`data-avatar-career="${role.id}" data-avatar-gender="${gender}"`));
      assert.ok(html.includes(`--career-x:${(i%4)*100/3}%;--career-y:${Math.floor(i/4)*100}%`));
    }
  }
});

test('local and online setup previews follow each selected career and gender',()=>{
  const c=client();c.click({},'mode-menu');c.click({mode:'local'});
  c.node('party-career-1').value='sales';c.node('party-gender-1').value='male';c.events.change({target:{id:'party-career-1'}});
  assert.match(c.node('party-avatar-1').innerHTML,/data-avatar-career="sales" data-avatar-gender="male"/);
  c.click({},'back-modes');c.click({mode:'online'});
  c.node('online-career').value='creator';c.node('online-gender').value='female';c.events.change({target:{id:'online-gender'}});
  assert.match(c.node('online-avatar').innerHTML,/data-avatar-career="creator" data-avatar-gender="female"/);
});

test('a missing gender atlas leaves its original fallback portrait available',()=>{
  const c=client(new Map(),false,Life,{imageSupport:true,failedImages:['assets/careers-female.png']});
  assert.ok(c.loadedClasses.has('sprites-ready'));assert.ok(c.loadedClasses.has('career-male-ready'));assert.equal(c.loadedClasses.has('career-female-ready'),false);
  assert.match(c.node('app').innerHTML,/portrait female career-portrait[^>]*><svg/);
});

test('local co-op saves separately, switches turns and can resume without touching the solo game',()=>{
  const solo=Life.create('โซโล','balance'),store=new Map([[key,JSON.stringify({game:solo,gender:'male'})]]), c=client(store);
  const before=store.get(key);c.click({},'mode-menu');c.click({mode:'local'});
  for(const [i,name,career] of [[1,'ฟ้า','office'],[2,'ดิน','rider']]){c.node('party-name-'+i).value=name;c.node('party-career-'+i).value=career;c.node('party-gender-'+i).value=i===2?'male':'female';}
  c.submit('party-form');assert.match(c.node('app').innerHTML,/ฟ้า/);assert.equal(store.get(key),before);
  c.click({location:'office'});assert.match(c.node('app').innerHTML,/interior-title/);c.click({action:'officework'});assert.match(c.node('app').innerHTML,/interior-title/);
  c.click({},'end-week');let saved=JSON.parse(store.get('thainative-life-party-v1'));assert.equal(saved.active,1);assert.match(c.node('app').innerHTML,/ดิน/);assert.match(c.node('app').innerHTML,/data-avatar-career="rider" data-avatar-gender="male"/);
  assert.doesNotMatch(c.node('app').innerHTML,/interior-title/);
  c.click({},'mode-menu');c.click({},'party-resume');assert.match(c.node('app').innerHTML,/ดิน/);assert.equal(store.get(key),before);
  const other=client(store,false,Life,{confirm:false});other.click({},'mode-menu');other.click({mode:'local'});
  for(const i of [1,2]){other.node('party-name-'+i).value='ใหม่'+i;other.node('party-career-'+i).value='office';other.node('party-gender-'+i).value='male';}
  other.submit('party-form');assert.equal(store.get('thainative-life-party-v1'),JSON.stringify(saved));assert.equal(store.get(key),before);
});

test('AI co-op advances the AI turn and preserves a distinct local save',()=>{
  const store=new Map(),c=client(store);c.click({},'mode-menu');c.click({mode:'ai'});
  for(const [i,name] of [[1,'ชาวกรุง'],[2,'เพื่อน AI']]){c.node('party-name-'+i).value=name;c.node('party-career-'+i).value='office';c.node('party-gender-'+i).value='female';}
  c.submit('party-form');c.click({},'end-week');const party=JSON.parse(store.get('thainative-life-party-v1'));
  assert.equal(party.week,2);assert.equal(party.active,0);assert.equal(party.players[1].ai,true);assert.ok(party.players[1].game.money!==2600);
});

test('online lobby sends private handshake and room commands; only active player can act',()=>{
  const store=new Map(),c=client(store);c.click({},'mode-menu');c.click({mode:'online'});
  c.node('online-name').value='เพื่อน';c.node('online-career').value='office';c.node('online-gender').value='female';c.click({},'online-create');
  const socket=c.sockets[0];socket.open();assert.equal(socket.sent[0].type,'hello');socket.receive({type:'welcome',token:'a'.repeat(64),resumed:false});assert.equal(socket.sent[1].type,'create');
  const game=Life.create('เพื่อน',null,'office');const room={phase:'lobby',code:'ABCD23',self:'p1',host:'p1',players:[{id:'p1',name:'เพื่อน',connected:true}],revision:0};
  socket.receive({type:'state',room});assert.match(c.node('app').innerHTML,/ABCD23/);assert.match(c.node('app').innerHTML,/disabled/);
  room.phase='playing';room.current='p1';room.revision=1;room.objective={teamIntact:true};room.players[0].game=game;room.players[0].gender='male';room.players.push({id:'p2',name:'ดาว',game:Life.create('ดาว',null,'rider'),connected:true});
  socket.receive({type:'state',room});assert.match(c.node('app').innerHTML,/data-avatar-career="office" data-avatar-gender="male"/);c.click({action:'officework'});assert.equal(socket.sent.at(-1).type,'act');assert.equal(socket.sent.at(-1).revision,1);assert.equal(store.has(key),false);
  room.current='p2';socket.receive({type:'state',room});assert.match(c.node('app').innerHTML,/รอเพื่อนเล่น/);
  room.players[0].game.week=2;socket.receive({type:'state',room});assert.match(c.node('app').innerHTML,/สัปดาห์ทีม 1\/20/);assert.match(c.node('app').innerHTML,/สัปดาห์ของคุณ 2 \/ 20/);
  room.objective.teamIntact=false;socket.receive({type:'state',room});assert.match(c.node('app').innerHTML,/สมาชิกออกจากเกม/);
});

test('interrupted matchmaking is cleared and returning to menu does not overwrite solo save',()=>{
  const solo=Life.create('เดิม','balance'),store=new Map([[key,JSON.stringify({game:solo,gender:'female'})]]),c=client(store),before=store.get(key);
  c.click({},'mode-menu');c.click({mode:'online'});c.node('online-name').value='ใหม่';c.node('online-career').value='office';c.node('online-gender').value='male';c.click({},'online-match');
  const socket=c.sockets[0];socket.open();socket.receive({type:'welcome',token:'b'.repeat(64),resumed:false});socket.receive({type:'queue',queued:true});assert.match(c.node('app').innerHTML,/กำลังค้นหา/);
  socket.close();assert.doesNotMatch(c.node('app').innerHTML,/กำลังค้นหา/);assert.match(c.node('app').innerHTML,/ค้นหาคู่/);assert.equal(c.session.has('thainative-life-online-active'),false);assert.equal(store.get(key),before);
});

test('a damaged party save is not offered for resume and does not affect solo',()=>{
  const solo=Life.create('เดิม','balance'),store=new Map([[key,JSON.stringify({game:solo,gender:'female'})],['thainative-life-party-v1',JSON.stringify({players:[{name:'A',game:{}},{name:'B',game:{}}],active:0,week:1,finished:false,log:[]})]]),c=client(store);
  assert.match(c.node('app').innerHTML,/เดิม/);c.click({},'mode-menu');assert.doesNotMatch(c.node('app').innerHTML,/เล่นเกมในเครื่องต่อ/);assert.equal(store.get(key),JSON.stringify({game:solo,gender:'female'}));
});

test('leaving before online connection completes discards the pending room request',()=>{
  const c=client();c.click({},'mode-menu');c.click({mode:'online'});c.node('online-name').value='A';c.node('online-career').value='office';c.node('online-gender').value='female';c.click({},'online-create');
  const first=c.sockets[0];c.click({},'online-back');assert.equal(first.readyState,3);
  c.click({mode:'online'});c.node('online-name').value='B';c.node('online-career').value='rider';c.node('online-gender').value='male';c.click({},'online-match');
  const second=c.sockets[1];second.open();second.receive({type:'welcome',token:'c'.repeat(64),resumed:false});assert.equal(second.sent.at(-1).type,'match');assert.equal(second.sent.at(-1).name,'B');
});

test('an expired reconnect returns to online setup instead of showing stale room',()=>{
  const c=client();c.click({},'mode-menu');c.click({mode:'online'});c.node('online-name').value='A';c.node('online-career').value='office';c.node('online-gender').value='female';c.click({},'online-create');
  const first=c.sockets[0];first.open();first.receive({type:'welcome',token:'d'.repeat(64),resumed:false});first.receive({type:'state',room:{phase:'lobby',code:'ABCD23',self:'p1',host:'p1',players:[{id:'p1',name:'A',connected:true}],revision:0}});
  first.close();c.timers.at(-1)();const second=c.sockets[1];second.open();second.receive({type:'welcome',token:'e'.repeat(64),resumed:false,queued:false});
  assert.doesNotMatch(c.node('app').innerHTML,/ABCD23/);assert.match(c.node('app').innerHTML,/สร้างห้อง/);assert.equal(c.session.has('thainative-life-online-active'),false);
});
