'use strict';
const assert=require('node:assert/strict'),{WebSocket}=require('ws'),C=require('../card-catalog.js');
(async()=>{
  const base=process.argv[2];if(!base)throw Error('Pass the game URL');const res=await fetch(base+'/api/profile'),cookie=res.headers.get('set-cookie').split(';')[0],initial=await res.json();assert.equal(initial.version,2);assert.equal(Object.keys(initial.owned).length,20);
  const ws=new WebSocket(base.replace(/^http/,'ws')+'/socket',{headers:{Cookie:cookie,Origin:base}}),messages=[];ws.on('message',raw=>messages.push(JSON.parse(raw)));await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j);});
  const send=msg=>ws.send(JSON.stringify(msg));async function wait(type,predicate=()=>true){for(let i=0;i<400;i++){const error=messages.find(m=>m.type==='error');if(error)throw Error(error.message);const ix=messages.findIndex(m=>m.type===type&&predicate(m));if(ix>=0)return messages.splice(ix,1)[0];await new Promise(r=>setTimeout(r,20));}throw Error('Timeout '+type);}
  try{
    await wait('hello');const request='smoke-pack-'+Date.now();send({type:'pack',faction:'shadow',request});const pack=await wait('profile');assert.equal(pack.result.cards.length,5);assert.equal(pack.profile.wallet.tickets,initial.wallet.tickets-1);assert.ok(pack.result.cards.every(c=>C.byId[c.id].faction==='shadow'));
    send({type:'pack',faction:'shadow',request});const replay=await wait('profile');assert.deepEqual(replay.result,pack.result);assert.equal(replay.profile.wallet.tickets,pack.profile.wallet.tickets);
    send({type:'starter',id:'water',request:'smoke-starter-'+Date.now()});const starter=await wait('profile');assert.ok(starter.profile.owned.g041);assert.ok(starter.profile.owned.g001);
    let rewardTickets;
    for(let n=0;n<2;n++){
      send({type:'play',mode:'lesson',challenge:'summon'});const room=(await wait('room',m=>m.room.phase==='playing')).room;assert.equal(room.you,0);assert.equal(room.canAct,true);assert.equal(room.players[1].hand,undefined);send({type:'summon',hand:room.players[0].hand[0].uid,revision:room.revision});const end=(await wait('room',m=>m.room.phase==='finished')).room;assert.equal(end.winner,end.you);assert.equal(end.reward.loot.tickets,n===0?1:0);
      send({type:'dismiss'});const updated=(await wait('profile')).profile;await wait('dismissed');assert.ok(updated.progress.lessons.includes('summon'));if(n===0)rewardTickets=updated.wallet.tickets;else assert.equal(updated.wallet.tickets,rewardTickets);
    }
    for(const file of ['card-content.js','progress.css'])assert.equal((await fetch(base+'/'+file)).status,200);for(const file of ['card-progress.js','card-accounts.js','data/card-accounts.json'])assert.equal((await fetch(base+'/'+file)).status,404);
    console.log('PASS: new ownership, free gacha, duplicate-command safety, welcome deck, tutorial first-clear rewards and private account storage');
  }finally{ws.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
