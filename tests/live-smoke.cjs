'use strict';
const assert=require('node:assert/strict'),{WebSocket}=require('ws'),G=require('../rpg-core.js');
(async()=>{
  const base=process.argv[2];if(!base)throw Error('Pass the game URL');
  assert.equal((await fetch(base+'/health')).status,200);
  const response=await fetch(base+'/api/profile'),cookie=response.headers.get('set-cookie').split(';')[0],profile=await response.json();
  assert.ok(profile.id);const ws=new WebSocket(base.replace(/^http/,'ws')+'/socket',{headers:{Cookie:cookie,Origin:base}}),messages=[];
  ws.on('message',raw=>messages.push(JSON.parse(raw)));await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
  async function wait(type){for(let i=0;i<300;i++){const ix=messages.findIndex(m=>m.type===type);if(ix>=0)return messages.splice(ix,1)[0];const error=messages.find(m=>m.type==='error');if(error)throw Error(error.message);await new Promise(r=>setTimeout(r,50));}throw Error('Timeout: '+type);}
  const send=msg=>ws.send(JSON.stringify(msg));
  try{await wait('hello');const appearance={...G.appearanceDefaults,gender:'male',hair:'crop',head:'none',outfit:'male-academy-1',outfitColor:'#326ad4'};send({type:'character',name:'Fashion QA',appearance});assert.deepEqual((await wait('profile')).profile.appearance,appearance);send({type:'inventory',action:'upgrade',id:'talisman'});const upgraded=await wait('profile');assert.equal(upgraded.profile.upgrades.talisman,1);
    const saved=await (await fetch(base+'/api/profile',{headers:{Cookie:cookie}})).json();assert.equal(saved.upgrades.talisman,1);assert.deepEqual(saved.appearance,appearance);
    send({type:'play',mode:'solo',stage:'grove'});const {room}=await wait('room'),aim=G.botAim(room);assert.deepEqual(room.actors[0].appearance,appearance);send({type:'shoot',angle:aim.angle,power:aim.power,skill:'normal'});const shot=await wait('shot');assert.ok(shot.flight.damage.length);send({type:'leave'});await wait('left');
    const after=await (await fetch(base+'/api/profile',{headers:{Cookie:cookie}})).json();for(const key of ['gold','stones','xp'])assert.equal(after[key],saved[key],'surrender must not grant '+key);
    console.log('PASS: health, saved fashion/dye, enhancement, WebSocket, combat and no surrender rewards');
  }finally{ws.close();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
