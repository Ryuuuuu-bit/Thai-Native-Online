const assert=require('node:assert/strict'),G=require('./battle-engine');
assert.throws(()=>G.create(['pret']),/five unique/);assert.throws(()=>G.create(Array(5).fill('pret')),/five unique/);
let s=G.create();assert.equal(s.player.filter(h=>h.front).length,2);assert.equal(G.skill(s,'player','p2'),false);s.queue=['p4'];G.tick(s,false);assert.equal(s.last.targets[0],'e0');
for(const spec of G.roster){s=G.create([spec.key,...G.roster.filter(h=>h.key!==spec.key).slice(0,4).map(h=>h.key)]);const h=s.player[0];h.energy=3;h.hp-=200;s.player[1].hp-=250;assert.equal(G.skill(s,'player',h.id),true);assert.equal(h.energy,0);assert.equal(G.skill(s,'player',h.id),false);assert.ok(s.player.every(h=>h.hp<=h.maxHp));if(spec.type==='shield')assert.ok(s.player.every(h=>h.shield===100));if(spec.type==='heal')assert.equal(h.hp,h.maxHp);}
s=G.create();s.player[0].hp=0;s.player[0].energy=3;assert.equal(G.skill(s,'player','p0'),false);
for(let omit=0;omit<6;omit++){s=G.create(G.roster.filter((_,i)=>i!==omit).map(h=>h.key));let steps=0;while(!s.winner&&steps++<1500){G.tick(s,true);assert.ok([...s.player,...s.enemy].every(h=>h.hp>=0&&h.hp<=h.maxHp&&h.energy>=0&&h.energy<=3&&h.shield>=0));}assert.ok(s.winner);assert.equal(G.tick(s),false);}
s=G.create();s.enemy[0].hp=0;s.enemy[1].hp=0;s.queue=['p4'];G.tick(s,false);assert.ok(['e2','e3','e4'].includes(s.last.targets[0]));
console.log('Passed: formation validation, front/back targeting, six skills, energy, defeat, health/shield bounds, six full battles.');
