'use strict';
const assert=require('node:assert/strict'),{WebSocket}=require('ws'),C=require('../card-catalog.js');
(async()=>{
  const base=process.argv[2];if(!base)throw Error('Pass the game URL');const health=await (await fetch(base+'/health')).json();assert.equal(health.catalog,100);
  const res=await fetch(base+'/api/profile'),cookie=res.headers.get('set-cookie').split(';')[0];await res.json();assert.ok(cookie.startsWith('native_session='));
  const ws=new WebSocket(base.replace(/^http/,'ws')+'/socket',{headers:{Cookie:cookie,Origin:base}}),messages=[];ws.on('message',raw=>messages.push(JSON.parse(raw)));await new Promise((r,j)=>{ws.once('open',r);ws.once('error',j);});
  const send=msg=>ws.send(JSON.stringify(msg));async function wait(type,predicate=()=>true){for(let i=0;i<400;i++){const error=messages.find(m=>m.type==='error');if(error)throw Error(error.message);const ix=messages.findIndex(m=>m.type===type&&predicate(m));if(ix>=0)return messages.splice(ix,1)[0];await new Promise(r=>setTimeout(r,25));}throw Error('Timeout '+type);}
  try{
    await wait('hello');send({type:'save',name:'Card QA',deckName:'Moon River QA',deck:C.starter('water')});assert.deepEqual((await wait('profile')).profile.deck,C.starter('water'));
    const saved=await (await fetch(base+'/api/profile',{headers:{Cookie:cookie}})).json();assert.equal(saved.deckName,'Moon River QA');
    send({type:'play',mode:'solo',faction:'fire'});let room=(await wait('room')).room;assert.equal(room.players[1-room.you].hand,undefined);assert.equal(room.players[1-room.you].deck,undefined);assert.equal(room.seed,undefined);
    if(room.active!==room.you)room=(await wait('room',m=>m.room.active===m.room.you)).room;
    let h=room.players[room.you].hand.find(h=>C.byId[h.card].cost<=room.players[room.you].mana);
    while(!h&&room.turn<20){const revision=room.revision;send({type:'end',revision});room=(await wait('room',m=>m.room.revision>revision&&m.room.active===m.room.you)).room;h=room.players[room.you].hand.find(h=>C.byId[h.card].cost<=room.players[room.you].mana);}
    assert.ok(h,'must be able to summon a card');send({type:'summon',hand:h.uid,revision:room.revision});room=(await wait('room',m=>m.room.revision>room.revision)).room;assert.ok(room.players[room.you].board.some(u=>u.card===h.card));
    send({type:'concede'});const end=(await wait('room',m=>m.room.phase==='finished')).room;assert.notEqual(end.winner,end.you);send({type:'dismiss'});await wait('dismissed');
    for(const f of Object.keys(C.factions)){const img=await fetch(base+'/assets/cards/'+f+'.png');assert.equal(img.status,200);assert.match(img.headers.get('content-type'),/image\/png/);await img.arrayBuffer();}
    assert.equal((await fetch(base+'/rpg-core.js')).status,404);console.log('PASS: 100 cards, five art atlases, deck save, private solo duel, summon, concession and retired RPG removal');
  }finally{ws.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
