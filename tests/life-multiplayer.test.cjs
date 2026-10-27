'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const WebSocket=require('ws');
const {createServer}=require('../server.cjs');

async function fixture(t,lifeDisconnectMs=300){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'native-life-test-'));
  const app=createServer({dataDir:dir,lifeDisconnectMs});
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
  const port=app.server.address().port, peers=[];
  t.after(async()=>{for(const p of peers)p.ws.terminate();await app.close();const target=path.resolve(dir);assert.equal(path.dirname(target),path.resolve(os.tmpdir()));assert.ok(path.basename(target).startsWith('native-life-test-'));fs.rmSync(target,{recursive:true,force:true});});
  async function peer(token,origin=`http://127.0.0.1:${port}`){
    const ws=new WebSocket(`ws://127.0.0.1:${port}/life-socket`,{origin}),pending=[],waiting=[];
    const p={ws,send:msg=>ws.send(JSON.stringify(msg)),next(type,predicate=()=>true){
      const index=pending.findIndex(m=>m.type===type&&predicate(m));if(index>=0)return Promise.resolve(pending.splice(index,1)[0]);
      return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Timed out waiting for '+type)),2000);waiting.push({type,predicate,resolve:m=>{clearTimeout(timer);resolve(m);}});});
    }};peers.push(p);ws.on('message',raw=>{const msg=JSON.parse(raw.toString()),index=waiting.findIndex(w=>w.type===msg.type&&w.predicate(msg));if(index>=0)waiting.splice(index,1)[0].resolve(msg);else pending.push(msg);});
    await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});p.send({type:'hello',...(token?{token}:{})});p.welcome=await p.next('welcome');return p;
  }
  return {peer,port};
}
const profile=(name,career='office')=>({name,career,gender:'female'});

test('real life socket rejects cross-origin, private rooms enforce turns and finish a cooperative game',async t=>{
  const {peer,port}=await fixture(t);
  const rejected=new WebSocket(`ws://127.0.0.1:${port}/life-socket`,{origin:'https://evil.example'});
  await new Promise(resolve=>rejected.once('unexpected-response',(_req,res)=>{assert.equal(res.statusCode,403);resolve();}));
  const a=await peer(),b=await peer(),c=await peer();
  a.send({type:'create',...profile('เอ')});let room=(await a.next('state')).room;assert.match(room.code,/^[A-Z2-9]{6}$/);assert.equal(room.phase,'lobby');assert.equal(room.self,a.welcome.self);
  b.send({type:'join',code:room.code,...profile('บี','minimart')});room=(await a.next('state',m=>m.room.players.length===2)).room;await b.next('state',m=>m.room.players.length===2);
  b.send({type:'start'});assert.match((await b.next('error')).message,/เจ้าของ/);
  a.send({type:'start'});room=(await a.next('state',m=>m.room.phase==='playing')).room;assert.equal(room.current,a.welcome.self);
  assert.notEqual(room.players[0].game,room.players[1].game);assert.equal(room.players[0].game.money,2600);
  c.send({type:'join',code:room.code,...profile('ซี')});assert.match((await c.next('error')).message,/ไม่พบห้อง/);
  b.send({type:'act',id:'minimartjob',revision:room.revision});assert.match((await b.next('error')).message,/ยังไม่ถึงตา/);
  a.send({type:'act',id:'officework',revision:room.revision});room=(await a.next('state',m=>m.room.revision>room.revision)).room;assert.equal(room.players[0].game.money,4300);assert.equal(room.players[0].game.energy,45);
  a.send({type:'act',id:'officework',revision:room.revision-1});assert.match((await a.next('error')).message,/เปลี่ยนแล้ว/);
  a.send({type:'act',id:'officework',revision:room.revision});room=(await a.next('state',m=>m.room.revision>room.revision)).room;assert.equal(room.players[0].game.money,6350); // includes 350 mission reward
  a.send({type:'end',revision:room.revision});room=(await a.next('state',m=>m.room.revision>room.revision)).room;assert.equal(room.current,b.welcome.self);
  for(let i=0;i<39;i++){
    const actor=room.current===a.welcome.self?a:b;actor.send({type:'end',revision:room.revision});
    room=(await a.next('state',m=>m.room.revision>room.revision)).room;
  }
  assert.equal(room.phase,'finished');assert.equal(room.current,null);assert.equal(room.players.every(p=>p.game.finished),true);
  assert.equal(room.objective.combinedMoney,room.players.reduce((n,p)=>n+p.game.money,0));assert.equal(typeof room.objective.success,'boolean');
});

test('matchmaking pairs two guests and sessions resume without leaking tokens to opponents',async t=>{
  const {peer}=await fixture(t,1000),a=await peer(),b=await peer();assert.equal(a.welcome.resumed,false);
  a.send({type:'match',...profile('หนึ่ง')});assert.equal((await a.next('queue')).queued,true);
  b.send({type:'match',...profile('สอง','rider')});await b.next('queue',m=>m.queued===false);let room=(await b.next('state',m=>m.room.phase==='playing')).room;
  assert.equal(room.players.length,2);assert.equal(JSON.stringify(room).includes(a.welcome.token),false);assert.equal(JSON.stringify(room).includes(b.welcome.token),false);
  a.ws.terminate();room=(await b.next('state',m=>m.room.players.some(p=>p.id===a.welcome.self&&!p.connected))).room;
  const a2=await peer(a.welcome.token);assert.equal(a2.welcome.resumed,true);assert.equal(a2.welcome.self,a.welcome.self);room=(await a2.next('state')).room;assert.equal(room.current,a.welcome.self);assert.equal(room.players.find(p=>p.id===a.welcome.self).connected,true);
  a2.send({type:'end',revision:room.revision});room=(await b.next('state',m=>m.room.current===b.welcome.self)).room;assert.equal(room.players.find(p=>p.id===a.welcome.self).game.week,2);
});

test('disconnected active players are removed after grace, unblocking the remaining player',async t=>{
  const {peer}=await fixture(t,120),a=await peer(),b=await peer();
  a.send({type:'create',...profile('เจ้าห้อง')});let room=(await a.next('state')).room;
  b.send({type:'join',code:room.code,...profile('เพื่อน')});await a.next('state',m=>m.room.players.length===2);a.send({type:'start'});room=(await b.next('state',m=>m.room.phase==='playing')).room;
  a.ws.terminate();await b.next('state',m=>m.room.players.some(p=>p.id===a.welcome.self&&!p.connected));
  room=(await b.next('state',m=>m.room.players.length===1)).room;assert.equal(room.current,b.welcome.self);assert.equal(room.host,b.welcome.self);assert.equal(room.objective.teamIntact,false);
  const expired=await peer(a.welcome.token);assert.equal(expired.welcome.resumed,false);assert.notEqual(expired.welcome.self,a.welcome.self);
  b.send({type:'end',revision:room.revision});room=(await b.next('state',m=>m.room.revision>room.revision)).room;assert.equal(room.players[0].game.week,2);
  for(let i=0;i<19;i++){b.send({type:'end',revision:room.revision});room=(await b.next('state',m=>m.room.revision>room.revision)).room;}
  assert.equal(room.phase,'finished');assert.equal(room.objective.success,false);
});

test('private rooms accept at most four players and leaving during play invalidates team victory',async t=>{
  const {peer}=await fixture(t,1000),a=await peer(),b=await peer(),c=await peer(),d=await peer(),e=await peer();
  a.send({type:'create',...profile('หนึ่ง')});let room=(await a.next('state')).room;
  for(const [i,p] of [b,c,d].entries()){p.send({type:'join',code:room.code,...profile('ผู้เล่น'+i)});room=(await a.next('state',m=>m.room.players.length===i+2)).room;}
  e.send({type:'join',code:room.code,...profile('เกิน')});assert.match((await e.next('error')).message,/ห้องเต็ม/);
  a.send({type:'start'});room=(await a.next('state',m=>m.room.phase==='playing')).room;
  d.send({type:'leave'});await d.next('left');room=(await a.next('state',m=>m.room.players.length===3)).room;assert.equal(room.objective.teamIntact,false);
});

test('two players can complete all twenty weeks and genuinely win the team objective',async t=>{
  const {peer}=await fixture(t),a=await peer(),b=await peer();
  a.send({type:'create',...profile('เอ')});let room=(await a.next('state')).room;
  b.send({type:'join',code:room.code,...profile('บี')});await a.next('state',m=>m.room.players.length===2);
  a.send({type:'start'});room=(await a.next('state',m=>m.room.phase==='playing')).room;
  async function command(actor,msg){actor.send({...msg,revision:room.revision});room=(await a.next('state',m=>m.room.revision>room.revision)).room;}
  while(room.phase==='playing'){
    const actor=room.current===a.welcome.self?a:b, game=room.players.find(p=>p.id===room.current).game;
    if(game.week<=8){await command(actor,{type:'act',id:'officework'});await command(actor,{type:'act',id:'rest'});await command(actor,{type:'act',id:'rest'});}
    else if(game.energy<85)await command(actor,{type:'act',id:'rest'});
    await command(actor,{type:'end'});await new Promise(r=>setTimeout(r,45));
  }
  assert.equal(room.objective.teamIntact,true);assert.ok(room.objective.combinedMoney>=0);assert.ok(room.objective.minEnergy>=30);assert.equal(room.objective.success,true);
  const finalMoney=room.objective.combinedMoney;b.send({type:'leave'});await b.next('left');room=(await a.next('state',m=>m.room.players.some(p=>p.id===b.welcome.self&&!p.connected))).room;
  assert.equal(room.objective.success,true);assert.equal(room.objective.combinedMoney,finalMoney);assert.equal(room.players.length,2);
});
