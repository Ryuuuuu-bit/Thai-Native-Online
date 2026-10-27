'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../card-catalog.js'),P=require('../card-progress.js'),W=require('../card-content.js'),D=require('../card-engine.js'),H=require('../card-challenges.js');
test('grandfathering preserves old decks and all collection rights while new guests start with actual ownership',()=>{
  const old={id:'old',name:'เดิม',deck:C.starter('water'),deckName:'น้ำ',wins:12,matches:20};P.migrate(old);assert.equal(Object.keys(old.owned).length,100);assert.equal(old.owned.g060,1);assert.equal(old.owned.g059,3);assert.equal(old.wins,12);assert.deepEqual(old.deck,C.starter('water'));const before=JSON.stringify(old);P.migrate(old);assert.equal(JSON.stringify(old),before);
  const p=P.create('new','ใหม่');assert.equal(Object.keys(p.owned).length,20);assert.throws(()=>P.ownedDeck(p,C.starter('fire')));P.transact(p,{type:'starter',id:'fire',request:'starter-test-01'});assert.deepEqual(P.ownedDeck(p,C.starter('fire')),C.starter('fire'));assert.throws(()=>P.transact(p,{type:'starter',id:'water',request:'starter-test-02'}));
});
test('pack guarantees, 10/40 pity, duplicate shards and receipt replay are deterministic and bounded',()=>{
  const p=P.create('p','แพ็ก');p.wallet.tickets=45;
  for(let i=1;i<=40;i++){const r=P.openPack(p,'water','pack-test-'+i,()=>.1);assert.equal(r.cards.length,5);assert.ok(r.cards.every(c=>C.byId[c.id].faction==='water'));assert.ok(r.cards.some(c=>['A','S','SS'].includes(C.byId[c.id].tier)));if(i%10===0&&i<40)assert.ok(r.cards.some(c=>C.byId[c.id].tier==='S'));if(i===40)assert.ok(r.cards.some(c=>C.byId[c.id].tier==='SS'));}
  assert.equal(p.pity.ss,0);assert.equal(p.pity.s,0);assert.equal(p.wallet.tickets,5);assert.ok(p.wallet.shards>0);assert.ok(Object.entries(p.owned).every(([id,n])=>n<=(C.byId[id].tier==='SS'?1:3)));
  const state=JSON.stringify(p),replay=P.openPack(p,'water','pack-test-40',()=>{throw Error('must not reroll');});assert.equal(replay.guarantee,'SS');assert.equal(JSON.stringify(p),state);
  assert.throws(()=>P.openPack(p,'__proto__','pack-test-bad'));p.wallet.tickets=0;const saved=JSON.stringify(p);assert.throws(()=>P.openPack(p,'wood','pack-test-empty'));assert.equal(JSON.stringify(p),saved);
});
test('crafting, cosmetic purchases, tickets and reward claims validate before charging and cannot repeat',()=>{
  const p=P.create('p','ทดสอบ');p.wallet.shards=1200;P.transact(p,{type:'craft',id:'g040',request:'craft-test-01'});assert.equal(p.owned.g040,1);assert.equal(p.wallet.shards,0);const snapshot=JSON.stringify(p);assert.throws(()=>P.transact(p,{type:'craft',id:'g040',request:'craft-test-02'}));assert.equal(JSON.stringify(p),snapshot);
  p.wallet.coins=500;P.transact(p,{type:'cosmetic',id:'back-jade',request:'shop-test-01'});assert.equal(p.wallet.coins,200);assert.equal(p.equipped.back,'back-jade');P.transact(p,{type:'cosmetic',id:'back-jade',request:'shop-test-01'});assert.equal(p.wallet.coins,200);
  p.daily.progress.games=2;const tickets=p.wallet.tickets;P.transact(p,{type:'quest',id:'play',request:'quest-test-01'});assert.equal(p.wallet.tickets,tickets+1);assert.throws(()=>P.transact(p,{type:'quest',id:'play',request:'quest-test-02'}));
  P.transact(p,{type:'reroll',id:'shield',request:'reroll-test-01'});assert.equal(p.daily.rerolled,true);assert.throws(()=>P.transact(p,{type:'reroll',id:'summon',request:'reroll-test-02'}));
});
test('qualified match rewards and mastery exclude friends, surrender and repeated first-clear farming',()=>{
  const p=P.create('p','ผล'),m={summons:4,attacks:3,damage:20,healing:2,blocked:4,played:{g001:4},factions:{wood:4}};
  const base=p.wallet.coins;P.record(p,{mode:'friendly',won:true,turns:10,metrics:m,opponent:'เพื่อน'});assert.equal(p.wallet.coins,base);P.record(p,{mode:'solo',won:true,turns:10,metrics:m,opponent:'AI',forfeit:true});assert.equal(p.wallet.coins,base);
  P.record(p,{mode:'boss',won:true,turns:10,metrics:m,opponent:'บอส',challenge:'boss:wood'});assert.equal(p.progress.cards.g001,4);assert.equal(p.progress.factions.wood,4);assert.equal(p.weekly.boss,true);assert.equal(p.daily.progress.games,1);assert.equal(p.progress.bosses.length,1);const tickets=p.wallet.tickets;
  assert.equal(p.progress.firstDuel,true);p.progress.history=[];P.migrate(p);assert.equal(p.progress.firstDuel,true,'onboarding completion survives history trimming');
  P.record(p,{mode:'boss',won:true,turns:10,metrics:m,opponent:'บอส',challenge:'boss:wood'});assert.equal(p.wallet.tickets,tickets);
  const now=Date.now(),wallet=p.wallet.tickets;p.season.played=5;p.season.peak=1450;P.migrate(p,now+29*86400000);assert.ok(p.wallet.tickets>wallet);assert.ok(p.cosmetics.includes('back-season'));const after=p.wallet.tickets;P.migrate(p,now+29*86400000);assert.equal(p.wallet.tickets,after);
});
test('one unclaimed daily quest carries its progress across midnight while new objectives reset',()=>{
  const now=Date.now(),p=P.create('p','ต่อเนื่อง');p.daily.progress.games=1;p.daily.progress.summons=9;const day=p.daily.day;P.migrate(p,now+86400000);assert.equal(p.daily.day,day+1);assert.equal(p.daily.carry,'play');assert.equal(p.daily.progress.games,1);assert.equal(p.daily.progress.summons,0);assert.equal(p.daily.quests.length,3);
});
test('interactive lessons and all one-turn puzzles have achievable server-verified objectives',()=>{
  const make=()=>D.create([{id:'a',name:'ผู้เรียน',deck:C.starter()},{id:'bot',name:'คู่ฝึก',deck:C.starter()}],1);
  for(const lesson of W.lessons){const r={game:make(),challenge:'lesson:'+lesson.id};H.setup(r.game,'lesson',lesson.id);const g=r.game,p=g.players[0];if(lesson.id==='summon')D.play(g,0,p.hand[0].uid);if(lesson.id==='shield')D.play(g,0,p.hand[0].uid,p.board[0].uid);if(lesson.id==='attack')D.attack(g,0,p.board[0].uid,g.players[1].board[0].uid);H.check(r);assert.equal(g.winner,0);}
  for(const puzzle of W.puzzles){const r={game:make(),challenge:'puzzle:'+puzzle.id};H.setup(r.game,'puzzle',puzzle.id);const g=r.game,p=g.players[0];if(puzzle.id==='freeze')D.play(g,0,p.hand[0].uid,g.players[1].board[0].uid);if(puzzle.id==='shield')D.play(g,0,p.hand[0].uid,p.board[0].uid);D.attack(g,0,p.board[0].uid,g.players[1].board[0].uid);if(g.phase==='playing')D.attack(g,0,p.board[1].uid,'player');assert.equal(g.winner,0,puzzle.id);assert.equal(H.validWin(r),true);}
});
