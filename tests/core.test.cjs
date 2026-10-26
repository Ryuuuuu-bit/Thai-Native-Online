'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),G=require('../rpg-core.js');
test('equipment, enhancement costs, failures, cap and invalid operations',()=>{
  const p=G.profile('a','A');assert.equal(G.stats(p).hp,300);
  assert.throws(()=>G.transact(p,'equip','flame'));G.transact(p,'buy','flame');G.transact(p,'equip','flame');assert.equal(G.stats(p).attack,65);assert.throws(()=>G.transact(p,'buy','flame'));
  p.gold=10000;p.stones=100;G.transact(p,'upgrade','flame',()=>0);assert.equal(p.upgrades.flame,1);assert.equal(G.stats(p).attack,72);
  G.transact(p,'upgrade','flame',()=>0);const before=p.gold;G.transact(p,'upgrade','flame',()=>.99);assert.equal(p.upgrades.flame,2);assert.equal(p.gold,before-280);
  while(p.upgrades.flame<5)G.transact(p,'upgrade','flame',()=>0);const gold=p.gold;assert.throws(()=>G.transact(p,'upgrade','flame'));assert.equal(p.gold,gold);
  G.transact(p,'outfit','jade');assert.equal(p.outfit,'jade');assert.throws(()=>G.transact(p,'outfit','missing'));
  p.gold=0;assert.throws(()=>G.transact(p,'buy','robe'));assert.equal(p.gold,0);
});
test('server simulation validates turn, finite input, skill cost, movement and normalizes PvP',()=>{
  const a=G.profile('a','A'),b=G.profile('b','B');a.upgrades.talisman=5;
  const r=G.createRoom('r','pvp',[a,b]);assert.equal(r.actors[0].attack,r.actors[1].attack);assert.equal(r.actors[0].hp,300);
  assert.throws(()=>G.shoot(r,'b',45,60));assert.throws(()=>G.shoot(r,'a',NaN,60));assert.throws(()=>G.shoot(r,'a',45,999));assert.throws(()=>G.shoot(r,'a',45,60,'spirit'));
  G.move(r,'a',1);G.move(r,'a',1);assert.throws(()=>G.move(r,'a',1));assert.throws(()=>G.move(r,'b',1));
  const aim=G.botAim(r),flight=G.shoot(r,'a',aim.angle,aim.power);assert.ok(flight.damage.length);assert.ok(flight.points.length>10);assert.throws(()=>G.shoot(r,'a',45,60));G.next(r);assert.equal(G.active(r).id,'b');
});
test('all solo dungeons terminate through simulated shots and damage',()=>{
  for(const stage of G.stages){const p=G.profile('a','A'),r=G.createRoom('r','solo',[p],stage.id,()=>.5);let count=0;
    while(r.phase!=='finished'&&count++<100){const a=G.active(r),aim=G.botAim(r);G.shoot(r,a.id,aim.angle,aim.power);G.next(r,()=>.5);}
    assert.equal(r.phase,'finished',stage.id);assert.ok(count<100);assert.ok(r.actors.every(a=>a.hp>=0&&a.hp<=a.maxHp));
  }
});
test('spirit skill consumes energy, heals only missing HP and cannot damage allies',()=>{
  const r=G.createRoom('r','coop',[G.profile('a','A'),G.profile('b','B')]);const a=G.active(r);a.energy=100;a.hp=a.maxHp-10;
  const aim=G.botAim(r),allyHp=r.actors[1].hp,result=G.shoot(r,'a',aim.angle,aim.power,'spirit');
  assert.equal(result.healing,10);assert.equal(a.hp,a.maxHp);assert.equal(a.energy,55);assert.equal(r.actors[1].hp,allyHp);
});
