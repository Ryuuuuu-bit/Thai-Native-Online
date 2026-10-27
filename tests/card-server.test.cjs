'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{WebSocket}=require('ws');
const {createServer}=require('../server.cjs'),C=require('../card-catalog.js');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function removeTemp(dir,prefix){const resolved=path.resolve(dir);assert.equal(path.dirname(resolved),path.resolve(os.tmpdir()));assert.ok(path.basename(resolved).startsWith(prefix));fs.rmSync(resolved,{recursive:true,force:true});}
async function peer(base,cookie){
  let profile;if(!cookie){const res=await fetch(base+'/api/profile');cookie=res.headers.get('set-cookie').split(';')[0];profile=await res.json();}
  const ws=new WebSocket(base.replace('http:','ws:')+'/socket',{headers:{Cookie:cookie,Origin:base}}),messages=[];ws.on('message',raw=>messages.push(JSON.parse(raw)));await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
  async function wait(type,predicate=()=>true){for(let i=0;i<300;i++){const ix=messages.findIndex(m=>m.type===type&&predicate(m));if(ix>=0)return messages.splice(ix,1)[0];await delay(10);}throw Error('Timeout '+type+' '+JSON.stringify(messages));}
  const hello=await wait('hello');return {ws,cookie,profile:profile||hello.profile,messages,wait,send:msg=>ws.send(JSON.stringify(msg))};
}
test('real server saves legal decks atomically, matches private PvP, validates turn/revision and supports reconnect',async t=>{
  const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'native-cards-')),legacy='{"old":"RPG progress"}';fs.writeFileSync(path.join(dataDir,'players.json'),legacy);
  const app=createServer({dataDir,botDelay:40,turnMs:10000,disconnectMs:200});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port,peers=[];
  t.after(async()=>{for(const p of peers)p.ws.terminate();await app.close();removeTemp(dataDir,'native-cards-');});
  assert.equal((await (await fetch(base+'/health')).json()).catalog,100);assert.equal((await fetch(base+'/rpg-core.js')).status,404);assert.equal((await fetch(base+'/data/card-players.json')).status,404);assert.equal((await fetch(base+'/card-engine.js')).status,404);assert.equal((await fetch(base+'/battle.html',{redirect:'manual'})).status,302);
  const a=await peer(base),b=await peer(base);peers.push(a,b);
  a.send({type:'save',deck:C.starter('water'),name:'นักอาคม',deckName:'สายน้ำ'});assert.equal((await a.wait('profile')).profile.deckName,'สายน้ำ');
  a.send({type:'save',deck:Array(40).fill('g020'),name:'เสียหาย',deckName:'ผิด'});await a.wait('error');const persisted=await (await fetch(base+'/api/profile',{headers:{Cookie:a.cookie}})).json();assert.equal(persisted.name,'นักอาคม');assert.deepEqual(persisted.deck,C.starter('water'));assert.equal(fs.readFileSync(path.join(dataDir,'players.json'),'utf8'),legacy);
  a.send({type:'play',mode:'pvp'});assert.equal((await a.wait('queue')).queued,true);b.send({type:'play',mode:'pvp'});const ra=(await a.wait('room')).room,rb=(await b.wait('room')).room;assert.equal(ra.id,rb.id);assert.ok(ra.players[ra.you].hand);assert.equal(ra.players[1-ra.you].hand,undefined);assert.equal(ra.players[1-ra.you].deck,undefined);
  const active=ra.active===ra.you?a:b,inactive=active===a?b:a;const view=active===a?ra:rb;
  inactive.send({type:'end',revision:view.revision});assert.match((await inactive.wait('error')).message,/เทิร์น/);
  active.send({type:'end',revision:-1});await active.wait('error');assert.equal([...app.rooms.values()][0].game.revision,0);
  active.messages.length=0;inactive.messages.length=0;active.send({type:'end',revision:0});assert.equal((await active.wait('room')).room.revision,1);await inactive.wait('room');
  a.send({type:'chat',text:'<hello>'});assert.equal((await b.wait('chat')).entry.text,'<hello>');
  const replacement=await peer(base,a.cookie);peers.push(replacement);const resumed=(await replacement.wait('room')).room;assert.equal(resumed.id,ra.id);await delay(20);assert.notEqual(a.ws.readyState,WebSocket.OPEN);
  replacement.send({type:'concede'});const ended=(await replacement.wait('room',m=>m.room.phase==='finished')).room;assert.notEqual(ended.winner,ended.you);await b.wait('room',m=>m.room.phase==='finished');
  replacement.send({type:'dismiss'});await replacement.wait('dismissed');replacement.send({type:'play',mode:'solo',faction:'fire'});const solo=(await replacement.wait('room',m=>m.room.mode==='solo')).room;assert.equal(solo.mode,'solo');
  const after=await (await fetch(base+'/api/profile',{headers:{Cookie:b.cookie}})).json();assert.equal(after.wins,1);assert.equal(after.matches,1);
});
test('turn timeout advances, disconnect forfeits after grace and a cancelled queue cannot start a match',async t=>{
  const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'native-cards-time-')),app=createServer({dataDir,turnMs:70,disconnectMs:80});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port,peers=[];
  t.after(async()=>{for(const p of peers)p.ws.terminate();await app.close();removeTemp(dataDir,'native-cards-time-');});
  const a=await peer(base),b=await peer(base);peers.push(a,b);a.send({type:'play',mode:'pvp'});await a.wait('queue');a.send({type:'cancel'});assert.equal((await a.wait('queue')).queued,false);b.send({type:'play',mode:'pvp'});await b.wait('queue');assert.equal(app.rooms.size,0);a.send({type:'play',mode:'pvp'});await a.wait('room');await b.wait('room');const advanced=await a.wait('room',m=>m.room.turn>=2);assert.ok(advanced.room.turn>=2);b.ws.terminate();const ended=await a.wait('room',m=>m.room.phase==='finished');assert.equal(ended.room.winner,ended.room.you);
});
test('reconnecting cancels the old disconnect deadline before a fresh grace period starts',async t=>{
  const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'native-cards-grace-')),app=createServer({dataDir,turnMs:10000,disconnectMs:180});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port,peers=[];
  t.after(async()=>{for(const p of peers)p.ws.terminate();await app.close();removeTemp(dataDir,'native-cards-grace-');});
  const a=await peer(base),b=await peer(base);peers.push(a,b);a.send({type:'play',mode:'pvp'});await a.wait('queue');b.send({type:'play',mode:'pvp'});await a.wait('room');await b.wait('room');
  a.ws.terminate();await delay(70);const again=await peer(base,a.cookie);peers.push(again);await again.wait('room');await delay(70);again.ws.terminate();await delay(70);
  assert.equal([...app.rooms.values()][0].game.phase,'playing','the first connection deadline must no longer apply');const end=await b.wait('room',m=>m.room.phase==='finished');assert.equal(end.room.winner,end.room.you);
});
