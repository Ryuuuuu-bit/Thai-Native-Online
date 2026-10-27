'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),C=require('../card-catalog.js'),D=require('../card-engine.js');
const id=n=>'g'+String(n).padStart(3,'0');
function game(){return D.create([{id:'a',name:'เรา',deck:C.starter('wood')},{id:'b',name:'ศัตรู',deck:C.starter('shadow')}],17);}
function unit(g,s,n,extra={}){const c=C.byId[id(n)],u={uid:'fixture'+g.next++,card:c.id,owner:s,atk:c.atk,hp:c.hp,maxHp:c.hp,shield:0,frozen:0,sealed:0,sleep:false,attacks:0,direct:0,buffs:[],growth:0,...extra};g.players[s].board.push(u);return u;}
function play(g,n,target){const p=g.players[g.active];p.mana=8;p.maxMana=8;const h={uid:'fixtureHand'+g.next++,card:id(n)};p.hand.push(h);D.play(g,g.active,h.uid,target);return p.board.find(u=>u.card===id(n));}
test('100 distinct spirits, five complete legal starters and all tiers; rejects forged IDs and duplicates',()=>{
  assert.equal(C.cards.length,100);assert.equal(new Set(C.cards.map(c=>c.id)).size,100);assert.equal(new Set(C.cards.map(c=>c.name)).size,100);
  for(const f of Object.keys(C.factions)){assert.equal(C.cards.filter(c=>c.faction===f).length,20);assert.equal(C.validateDeck(C.starter(f)).length,40);assert.equal(C.starter(f).filter(id=>C.byId[id].tier==='SS').length,1);}
  for(const invalid of [Array(40).fill('toString'),Array(40).fill('__proto__'),Array(40).fill('wisp'),Array(40).fill('g020'),Array(39).fill('g001'),Array(40).fill({})])assert.throws(()=>C.validateDeck(invalid));
});
test('opening hands, mana, summon sickness, five-slot limit and atomic invalid actions',()=>{
  const g=game();assert.equal(g.players[0].hand.length,5);assert.equal(g.players[1].hand.length,5);assert.equal(g.players[0].mana,1);
  const snapshot=JSON.stringify(g);assert.throws(()=>D.play(g,1,g.players[1].hand[0].uid));assert.equal(JSON.stringify(g),snapshot);
  const u=play(g,1);assert.equal(D.canAttack(g,u),false);assert.throws(()=>D.attack(g,0,u.uid,'player'));
  D.end(g,0);assert.equal(g.players[1].hand.length,6);D.end(g,1);assert.equal(g.players[0].maxMana,8);assert.equal(D.canAttack(g,u),true);
  while(g.players[0].board.length<5)unit(g,0,1);const before=JSON.stringify(g);assert.throws(()=>play(g,1));assert.equal(g.players[0].board.length,5);
  const h=g.players[0].hand[0],state=JSON.stringify(g);assert.throws(()=>D.play(g,0,h.uid));assert.equal(JSON.stringify(g),state);
});
test('combat exchanges damage simultaneously, shields absorb two and direct attacks require an empty field',()=>{
  const g=game(),a=unit(g,0,34),b=unit(g,1,62,{shield:2,hp:1});assert.throws(()=>D.attack(g,0,a.uid,'player'));
  D.attack(g,0,a.uid,b.uid);assert.equal(a.hp,4);assert.equal(g.players[1].board.length,0);assert.equal(g.players[1].hp,28);
  assert.throws(()=>D.attack(g,0,a.uid,'player'));const twin=unit(g,0,38);D.attack(g,0,twin.uid,'player');assert.equal(D.canAttack(g,twin),false);
});
test('target protection, shield, freeze through the next owner turn and cleansing work',()=>{
  const g=game(),protectedAlly=unit(g,1,1),guardian=unit(g,1,93),other=unit(g,1,62);assert.ok(!D.targets(g,0,id(53)).includes(protectedAlly.uid));assert.ok(D.targets(g,0,id(53)).includes(guardian.uid));assert.ok(!D.targets(g,0,id(53)).includes(other.uid));
  play(g,53,guardian.uid);D.end(g,0);assert.equal(D.canAttack(g,guardian),false);D.end(g,1);D.end(g,0);assert.equal(D.canAttack(g,guardian),true);
  const h=game(),attacker=unit(h,0,34),drop=unit(h,1,41);D.attack(h,0,attacker.uid,drop.uid);D.end(h,0);D.end(h,1);assert.equal(D.canAttack(h,attacker),false);play(h,83,attacker.uid);assert.equal(D.canAttack(h,attacker),true);
});
test('death summons, revival without enter triggers, sacrifice and sealed death effects',()=>{
  const g=game();g.players[0].grave=['g001'];g.players[0].hp=20;play(g,18);assert.equal(g.players[0].board.length,2);assert.equal(g.players[0].hp,20,'revive does not trigger enter heal');
  const doll=unit(g,1,3);const a=unit(g,0,34);D.attack(g,0,a.uid,doll.uid);assert.ok(g.players[1].board.some(u=>u.card==='wisp'));
  const h=game(),food=unit(h,0,3);const pob=play(h,74,food.uid);assert.equal(pob.atk,5);assert.equal(pob.maxHp,7);assert.ok(h.players[0].board.some(u=>u.card==='wisp'));
  const sealed=unit(h,1,3,{sealed:h.turn+1});const killer=unit(h,0,34);D.attack(h,0,killer.uid,sealed.uid);assert.equal(h.players[1].board.length,0);
});
test('fatigue bypasses protection, cards burn at ten and views never expose opponent hand or deck',()=>{
  const g=game();g.players[1].deck=[];unit(g,1,78);D.end(g,0);assert.equal(g.players[1].hp,29);assert.equal(g.players[1].fatigue,1);
  const view=D.view(g,0);assert.ok(view.players[0].hand);assert.equal(view.players[1].hand,undefined);assert.equal(view.players[1].deck,undefined);assert.equal(view.seed,undefined);assert.ok(!JSON.stringify(view).includes('"seed"'));
  const h=game();h.players[0].hand=Array.from({length:10},(_,i)=>({uid:'hand'+i,card:'g001'}));play(h,15);assert.equal(h.players[0].hand.length,10);assert.equal(h.players[0].grave.length,2);
});
test('all 100 cards resolve enter effects with valid state; all 125 seeded AI matchups terminate',()=>{
  for(const c of C.cards){const g=game();g.players[0].board=[];g.players[1].board=[];unit(g,0,1,{hp:1});unit(g,0,3,{card:'wisp',atk:1,hp:1,maxHp:1});unit(g,1,62,{shield:2,hp:2});g.players[0].grave=['g001','g061','g063','g042','g002','g065'];play(g,c.number);assert.ok(g.players.every(p=>p.board.length<=5&&p.hand.length<=10&&Number.isFinite(p.hp)&&p.board.every(u=>u.hp>0&&Number.isFinite(u.atk))));}
  for(let seed=1;seed<=5;seed++)for(const a of Object.keys(C.factions))for(const b of Object.keys(C.factions)){const g=D.create([{id:'a',name:a,deck:C.starter(a)},{id:'b',name:b,deck:C.starter(b)}],seed);while(g.phase==='playing'&&g.turn<200)D.bot(g,g.active);assert.equal(g.phase,'finished',a+'/'+b);}
});
