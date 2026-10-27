'use strict';
const crypto=require('node:crypto'),C=require('./card-catalog.js'),W=require('./card-content.js');
const cap=id=>C.byId[id].tier==='SS'?1:3;
function counts(deck){const out={};deck.forEach(id=>out[id]=(out[id]||0)+1);return out;}
function qualifies(mode,turns,metrics,forfeit){return !forfeit&&turns>=5&&(metrics?.summons||0)>=1&&(metrics?.attacks||0)>=1&&!['friendly','lesson','puzzle'].includes(mode);}
function create(id,name){return migrate({id,name,deck:C.starter(),deckName:'เรือนร้างแห่งแสงโคม',matches:0,wins:0,version:2,owned:counts(C.starter()),starterChosen:false});}
function migrate(p,now=Date.now()){
  if(!p.version){p.owned=Object.fromEntries(C.cards.map(c=>[c.id,cap(c.id)]));p.legacy=true;p.starterChosen=true;p.version=2;}
  p.wallet??={coins:150,tickets:5,shards:0};p.xp??=0;p.mmr??=1000;p.pity??={s:0,ss:0,opened:0};p.decks??=[{id:'deck-1',name:p.deckName,cards:p.deck.slice()}];p.activeDeck??='deck-1';p.receipts??=[];
  p.progress??={lessons:[],puzzles:[],bosses:[],factions:{},cards:{},achievements:[],pass:[],history:[]};p.cosmetics??=['back-default','avatar-default','board-default'];p.equipped??={back:'back-default',avatar:'avatar-default',board:'board-default'};
  p.progress.firstDuel??=p.progress.history.some(h=>qualifies(h.mode,h.turns,h.metrics,h.forfeit));
  const t=W.period(now);
  if(p.daily?.day!==t.day){const carry=p.daily?.quests.find(id=>!p.daily.claimed.includes(id)),q=W.quests.find(q=>q.id===carry),old=q?p.daily.progress[q.key]||0:0;p.daily={day:t.day,progress:{games:0,summons:0,blocked:0,damage:0,healing:0,attacks:0},quests:carry?[carry,...['play','summon','shield'].filter(id=>id!==carry).slice(0,2)]:['play','summon','shield'],carry:carry||null,claimed:[],rerolled:false,rewarded:0};if(q)p.daily.progress[q.key]=Math.min(old,q.goal);}
  if(p.weekly?.week!==t.week)p.weekly={week:t.week,boss:false,event:false,claimed:false};
  if(p.season?.id!==t.season){if(p.season?.played>=5){p.wallet.tickets+=Math.min(5,1+Math.floor(Math.max(0,p.season.peak-1000)/150));if(!p.cosmetics.includes('back-season'))p.cosmetics.push('back-season');}p.season={id:t.season,rating:1000,peak:1000,played:0};}
  return p;
}
function ownedDeck(p,deck){C.validateDeck(deck);const need=counts(deck);for(const [id,n]of Object.entries(need))if((p.owned[id]||0)<n)throw Error('ยังมี '+C.byId[id].name+' ไม่พอสำหรับเด็คนี้');return deck.slice();}
// shortcut: retain the last 50 command receipts; use a database ledger before paid transactions exist.
function transaction(p,request,kind,fn){if(typeof request!=='string'||!/^[\w-]{8,80}$/.test(request))throw Error('รหัสคำสั่งไม่ถูกต้อง');const old=p.receipts.find(r=>r.id===request);if(old){if(old.kind!==kind)throw Error('รหัสคำสั่งถูกใช้แล้ว');return old.result;}const result=fn();p.receipts.push({id:request,kind,result});if(p.receipts.length>50)p.receipts.shift();return result;}
function addCard(p,id){const n=p.owned[id]||0;if(n>=cap(id)){const shards=W.dust[C.byId[id].tier];p.wallet.shards+=shards;return {id,duplicate:true,shards};}p.owned[id]=n+1;return {id,duplicate:false,shards:0};}
function rollTier(rng){const r=rng();return r<.50?'C':r<.80?'B':r<.95?'A':r<.99?'S':'SS';}
function openPack(p,faction,request,rng=()=>crypto.randomInt(1000000)/1000000){
  if(faction!=='all'&&!Object.hasOwn(C.factions,faction))throw Error('ไม่พบซองนี้');
  return transaction(p,request,'pack:'+faction,()=>{if(p.wallet.tickets<1)throw Error('ตั๋วเรียกภูติไม่พอ');
    const pool=C.cards.filter(c=>faction==='all'||c.faction===faction),pick=t=>{const list=pool.filter(c=>c.tier===t);return list[Math.min(list.length-1,Math.floor(rng()*list.length))].id;};
    const cards=Array.from({length:5},()=>pick(rollTier(rng)));let guarantee='';
    if(!cards.some(id=>['A','S','SS'].includes(C.byId[id].tier))){const r=rng();cards[4]=pick(r<.75?'A':r<.95?'S':'SS');guarantee='A';}
    const s=p.pity.s+1,ss=p.pity.ss+1;
    if(ss>=40&&!cards.some(id=>C.byId[id].tier==='SS')){cards[4]=pick('SS');guarantee='SS';}
    else if(s>=10&&!cards.some(id=>['S','SS'].includes(C.byId[id].tier))){cards[4]=pick('S');guarantee='S';}
    p.wallet.tickets--;p.pity.opened++;p.pity.ss=cards.some(id=>C.byId[id].tier==='SS')?0:ss;p.pity.s=cards.some(id=>['S','SS'].includes(C.byId[id].tier))?0:s;
    const result={cards:cards.map(id=>addCard(p,id)),guarantee};p.lastPack={...result,date:Date.now(),faction};return result;
  });
}
function reward(p,{coins=0,tickets=0,xp=0,cosmetic=null}){p.wallet.coins+=coins;p.wallet.tickets+=tickets;p.xp+=xp;if(cosmetic&&!p.cosmetics.includes(cosmetic))p.cosmetics.push(cosmetic);}
function transact(p,msg,now=Date.now()){
  migrate(p,now);const id=msg.id;
  if(msg.type==='pack')return openPack(p,msg.faction,msg.request);
  return transaction(p,msg.request,msg.type+':'+String(id??''),()=>{
    if(msg.type==='starter'){if(p.starterChosen||!Object.hasOwn(C.factions,id))throw Error('รับสำรับต้อนรับได้ครั้งเดียว');const deck=C.starter(id),need=counts(deck);if(Object.entries(need).every(([key,n])=>(p.owned[key]||0)>=n))throw Error('มีสำรับนี้ครบแล้ว เลือกธาตุอื่นได้');for(const [key,n]of Object.entries(need))p.owned[key]=Math.max(p.owned[key]||0,n);p.starterChosen=true;if(p.decks.length<5){const slot={id:'welcome-'+id,name:'สำรับ'+C.factions[id].name,cards:deck};p.decks.push(slot);p.activeDeck=slot.id;p.deck=deck.slice();p.deckName=slot.name;}return {message:'รับสำรับต้อนรับแล้ว'};}
    if(msg.type==='craft'){const c=C.byId[id];if(!c||id==='wisp')throw Error('ไม่พบการ์ด');if((p.owned[id]||0)>=cap(id))throw Error('มีการ์ดครบจำนวนที่ใช้ได้แล้ว');const cost=W.craft[c.tier];if(p.wallet.shards<cost)throw Error('เศษวิญญาณไม่พอ');p.wallet.shards-=cost;addCard(p,id);return {message:'สร้าง '+c.name+' แล้ว'};}
    if(msg.type==='ticket'){if(p.wallet.coins<100)throw Error('ต้องใช้ 100 เหรียญ');p.wallet.coins-=100;p.wallet.tickets++;return {message:'แลกตั๋วเรียกภูติ 1 ใบแล้ว'};}
    if(msg.type==='quest'){const q=W.quests.find(q=>q.id===id);if(!q||!p.daily.quests.includes(id)||p.daily.claimed.includes(id)||(p.daily.progress[q.key]||0)<q.goal)throw Error('ยังรับภารกิจนี้ไม่ได้');p.daily.claimed.push(id);reward(p,q);return {message:'รับรางวัล '+q.name+' แล้ว'};}
    if(msg.type==='reroll'){if(p.daily.rerolled||!p.daily.quests.includes(id)||p.daily.claimed.includes(id))throw Error('เปลี่ยนโจทย์ได้วันละครั้งก่อนรับรางวัล');const q=W.quests.find(q=>!p.daily.quests.includes(q.id));p.daily.quests[p.daily.quests.indexOf(id)]=q.id;p.daily.rerolled=true;return {message:'เปลี่ยนภารกิจแล้ว ความคืบหน้าสะสมยังอยู่'};}
    if(msg.type==='weekly-reward'){if(!p.weekly.boss||p.weekly.claimed)throw Error('ต้องชนะบอสสัปดาห์นี้ก่อน');p.weekly.claimed=true;reward(p,{tickets:3,xp:120});return {message:'รับรางวัลบอสประจำสัปดาห์แล้ว'};}
    if(msg.type==='achievement'){const a=W.achievements.find(a=>a.id===id),pr=p.progress,ready={student:pr.lessons.length>=3,puzzler:pr.puzzles.length>=3,bosses:pr.bosses.length>=5,basic:!!pr.basic,elements:Object.keys(pr.factions).length>=5};if(!a||!ready[id]||pr.achievements.includes(id))throw Error('ยังรับความสำเร็จนี้ไม่ได้');pr.achievements.push(id);reward(p,a);return {message:'ปลดล็อกฉายา '+a.name};}
    if(msg.type==='pass'){const level=Number(id);if(!Number.isInteger(level)||level<1||level>20||p.xp<level*100||p.progress.pass.includes(level))throw Error('ยังรับรางวัลระดับนี้ไม่ได้');p.progress.pass.push(level);reward(p,{tickets:level%5===0?2:1,coins:30,cosmetic:level===20?'avatar-master':null});return {message:'รับรางวัลเส้นทางระดับ '+level+' แล้ว'};}
    if(msg.type==='title'){const [kind,key]=String(id).split(':');if(!(kind==='achievement'&&p.progress.achievements.includes(key)||kind==='faction'&&(p.progress.factions[key]||0)>=25||kind==='card'&&C.byId[key]&&(p.progress.cards[key]||0)>=20))throw Error('ยังไม่ปลดล็อกฉายานี้');p.equipped.title=id;return {message:'ใช้ฉายา '+W.titleName(id)};}
    if(msg.type==='cosmetic'){const item=W.cosmetics.find(c=>c.id===id);if(!item)throw Error('ไม่พบของตกแต่ง');if(!p.cosmetics.includes(id)){if(item.price===null)throw Error('รับได้จากความสำเร็จหรือฤดูกาล');if(p.wallet.coins<item.price)throw Error('เหรียญไม่พอ');p.wallet.coins-=item.price;p.cosmetics.push(id);}p.equipped[item.type]=id;return {message:'ใช้ '+item.name+' แล้ว'};}
    throw Error('ไม่พบรายการนี้');
  });
}
function record(p,{mode,won,turns,metrics,opponent,forfeit=false,challenge=null,ratingDelta=0,now=Date.now(),deck=p.deck}){
  migrate(p,now);p.matches++;if(won)p.wins++;
  const progress=p.progress,rewardable=qualifies(mode,turns,metrics,forfeit);
  if(rewardable)progress.firstDuel=true;
  const loot={coins:0,tickets:0,xp:0};
  if(rewardable&&p.daily.rewarded<20){p.daily.rewarded++;loot.coins=mode==='pvp'?(won?40:20):(won?20:10);loot.xp=won?40:25;reward(p,loot);p.daily.progress.games++;for(const key of ['summons','blocked','damage','healing','attacks'])p.daily.progress[key]+=(metrics[key]||0);
    for(const [f,n]of Object.entries(metrics.factions||{}))progress.factions[f]=(progress.factions[f]||0)+n;
    for(const [id,n]of Object.entries(metrics.played||{}))progress.cards[id]=(progress.cards[id]||0)+n;
    if(won&&deck.every(id=>['C','B'].includes(C.byId[id].tier)))progress.basic=true;
  }
  if(won&&!forfeit&&challenge){const [kind,id]=challenge.split(':');const target={lesson:progress.lessons,puzzle:progress.puzzles,boss:progress.bosses}[kind];if(target&&!target.includes(id)){target.push(id);loot.tickets++;loot.xp+=kind==='boss'?80:40;reward(p,{tickets:1,xp:kind==='boss'?80:40});}if(kind==='boss')p.weekly.boss=true;}
  if(won&&!forfeit&&mode==='weekly'&&!p.weekly.event){p.weekly.event=true;loot.tickets+=2;loot.xp+=80;reward(p,{tickets:2,xp:80});}
  const entry={id:crypto.randomUUID(),date:now,mode,won,turns,opponent,forfeit,metrics:{...metrics},loot,ratingDelta,deckName:p.deckName};progress.history.unshift(entry);progress.history=progress.history.slice(0,20);return entry;
}
function loaner(faction){if(faction==='low'){const list=C.cards.filter(c=>['C','B'].includes(c.tier));return list.flatMap(c=>Array(3).fill(c.id)).slice(0,40);}return C.starter(faction);}
function weeklyDeck(deck,now=Date.now()){C.validateDeck(deck);const rule=W.weekly(now);if(rule.id==='low'&&deck.some(id=>!['C','B'].includes(C.byId[id].tier)))throw Error('สัปดาห์นี้ใช้เฉพาะ C และ B เลือกเด็คยืมวิชาพื้นฐานได้');if(rule.id==='dual'&&new Set(deck.map(id=>C.byId[id].faction)).size>2)throw Error('สัปดาห์นี้ใช้ได้ไม่เกิน 2 ธาตุ');return deck;}
function rated(p,opponentRating,score){const delta=Math.round(24*(score-1/(1+10**((opponentRating-p.mmr)/400))));p.mmr=Math.max(0,p.mmr+delta);return delta;}
module.exports={create,migrate,ownedDeck,transact,openPack,record,loaner,weeklyDeck,rated};
