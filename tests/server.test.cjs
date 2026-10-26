'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {WebSocket}=require('ws'),{createServer}=require('../server.cjs');
test('real two-client matchmaking, shared chat, authoritative combat, coop and persistent equipment',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'native-test-')),app=createServer({dataDir:dir,turnMs:60000,botDelay:60000});await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+app.server.address().port;
  async function client(savedCookie){const res=await fetch(url+'/api/profile',{headers:savedCookie?{Cookie:savedCookie}:{}}),cookie=savedCookie||res.headers.get('set-cookie').split(';')[0],profile=await res.json(),ws=new WebSocket(url.replace('http','ws')+'/socket',{headers:{Cookie:cookie,Origin:url}}),messages=[];ws.on('message',raw=>messages.push(JSON.parse(raw)));await new Promise(resolve=>ws.on('open',resolve));return {ws,profile,cookie,messages,send:data=>ws.send(JSON.stringify(data))};}
  async function until(c,predicate){for(let i=0;i<150;i++){const index=c.messages.findIndex(predicate);if(index>=0)return c.messages.splice(index,1)[0];await new Promise(resolve=>setTimeout(resolve,20));}throw Error('Timed out waiting for event: '+JSON.stringify(c.messages));}
  try{
    const a=await client(),b=await client();await until(a,m=>m.type==='hello');await until(b,m=>m.type==='hello');assert.notEqual(a.profile.id,b.profile.id);
    const look={...require('../rpg-core.js').appearanceDefaults,gender:'male',hair:'crop',head:'crown',hairColor:'#357ab4',outfit:'male-royal-5'};a.send({type:'character',name:'นักเดินทางฟ้า',appearance:look});const customized=await until(a,m=>m.type==='profile');assert.deepEqual(customized.profile.appearance,look);assert.equal(customized.profile.characterCreated,true);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir,'players.json'),'utf8'))[a.cookie.split('=')[1]].appearance,look);
    a.send({type:'character',name:'ชื่อใหม่',appearance:{...look,headColor:'url(https://bad)'}});await until(a,m=>m.type==='error');assert.equal((await (await fetch(url+'/api/profile',{headers:{Cookie:a.cookie}})).json()).name,'นักเดินทางฟ้า');
    b.send({type:'character',name:'นักเดินทางหญิง',appearance:{...look,gender:'female',outfit:'female-festival-3'}});assert.equal((await until(b,m=>m.type==='profile')).profile.appearance.outfit,'female-festival-3');
    a.send({type:'inventory',action:'outfit',id:'female-festival-3'});assert.match((await until(a,m=>m.type==='error')).message,/ชุดไม่ตรง/);
    a.send({type:'chat',text:'hello ThaiNative'});assert.equal((await until(b,m=>m.type==='chat')).entry.text,'hello ThaiNative');
    a.send({type:'inventory',action:'buy',id:'flame'});const bought=await until(a,m=>m.type==='profile');assert.ok(bought.profile.owned.includes('flame'));
    const saved=await (await fetch(url+'/api/profile',{headers:{Cookie:a.cookie}})).json();assert.ok(saved.owned.includes('flame'));
    a.send({type:'play',mode:'pvp'});await until(a,m=>m.type==='queue');b.send({type:'play',mode:'pvp'});const ar=await until(a,m=>m.type==='room'),br=await until(b,m=>m.type==='room');assert.equal(ar.room.id,br.room.id);assert.deepEqual(br.room.actors[0].appearance,look);assert.equal(ar.room.actors[1].appearance.outfit,'female-festival-3');
    a.send({type:'character',name:'ห้ามเปลี่ยน',appearance:look});assert.match((await until(a,m=>m.type==='error')).message,/หลังออก/);
    b.send({type:'shoot',angle:45,power:70,skill:'normal'});assert.match((await until(b,m=>m.type==='error')).message,/ตาของคุณ/);
    a.send({type:'shoot',angle:45,power:70,skill:'normal'});const shotA=await until(a,m=>m.type==='shot'),shotB=await until(b,m=>m.type==='shot');assert.deepEqual(shotA.flight,shotB.flight);
    a.send({type:'leave'});await until(a,m=>m.type==='left');await until(b,m=>m.type==='reward');
    a.messages.length=0;b.messages.length=0;a.send({type:'play',mode:'coop'});await until(a,m=>m.type==='queue');b.send({type:'play',mode:'coop'});const coop=await until(a,m=>m.type==='room');assert.equal(coop.room.mode,'coop');assert.equal(coop.room.actors.filter(a=>a.bot).length,2);assert.equal(coop.room.actors.filter(a=>!a.bot).length,2);
    await until(b,m=>m.type==='room'&&m.room.id===coop.room.id);
    a.send({type:'shoot',angle:45,power:65,skill:'normal'});await until(a,m=>m.type==='shot');await until(b,m=>m.type==='shot');
    const originalTurn=coop.room.turn,deadline=coop.room.deadline,beforeLeave=await (await fetch(url+'/api/profile',{headers:{Cookie:b.cookie}})).json();
    b.messages.length=0;b.send({type:'leave'});await until(b,m=>m.type==='left');
    const remaining=await until(a,m=>m.type==='room'&&m.room.actors.some(actor=>actor.id===b.profile.id&&actor.left));
    assert.equal(remaining.room.turn,originalTurn,'leaving off-turn must not skip the remaining teammate');assert.equal(remaining.room.deadline,deadline);assert.equal(remaining.room.phase,'flight','leaving off-turn must not cancel a teammate projectile');
    b.send({type:'character',name:'กลับหมู่บ้าน',appearance:{...look,gender:'female',outfit:'female-craft-1'}});assert.equal((await until(b,m=>m.type==='profile')).profile.name,'กลับหมู่บ้าน');
    b.send({type:'play',mode:'solo',stage:'grove'});const solo=await until(b,m=>m.type==='room');assert.notEqual(solo.room.id,coop.room.id);b.send({type:'leave'});await until(b,m=>m.type==='left');
    const afterLeave=await (await fetch(url+'/api/profile',{headers:{Cookie:b.cookie}})).json();assert.equal(afterLeave.gold,beforeLeave.gold,'repeated surrender must not mint currency');assert.equal(afterLeave.xp,beforeLeave.xp);assert.equal(afterLeave.stones,beforeLeave.stones);
    a.send({type:'leave'});await until(a,m=>m.type==='left');assert.ok(!b.messages.some(m=>m.type==='reward'||m.type==='room'&&m.room.id===coop.room.id),'departed players receive no stale room updates or rewards');
    a.send({type:'play',mode:'pvp'});await until(a,m=>m.type==='queue');const resumed=await client(a.cookie);assert.equal((await until(resumed,m=>m.type==='hello')).queue,'pvp');resumed.send({type:'cancel'});assert.equal((await until(resumed,m=>m.type==='queue')).mode,null);resumed.ws.close();
    assert.equal((await fetch(url+'/data/players.json')).status,404);assert.equal((await fetch(url+'/server.cjs')).status,404);
    a.ws.close();b.ws.close();
  }finally{await app.close();fs.rmSync(dir,{recursive:true,force:true});}
});
