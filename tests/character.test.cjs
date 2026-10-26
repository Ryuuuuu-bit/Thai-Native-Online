'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),G=require('../rpg-core.js'),Art=require('../character-art.js');
test('appearance validates every option and color atomically, retains stats, and unlocks a costume only once',()=>{
  const p=G.profile('one','นักเดินทาง'),stats=G.stats(p),original=JSON.stringify(p);
  for(const bad of [null,[],{...G.appearanceDefaults,hair:'__proto__'},{...G.appearanceDefaults,skinColor:'red" onload="alert(1)'},{...G.appearanceDefaults,gender:'unknown'}]){assert.throws(()=>G.customize(p,bad,'นักเดินทาง'));assert.equal(JSON.stringify(p),original);}
  assert.throws(()=>G.customize(p,{...G.appearanceDefaults,outfit:'jade'},'<bad>'));assert.equal(JSON.stringify(p),original);
  const draft={...G.appearanceDefaults,gender:'male',hair:'long',head:'cat',outfit:'jade',hairColor:'#ABCDEF',gold:99999};
  G.customize(p,draft,'จันทรา');assert.equal(p.gold,1500);assert.equal(p.characterCreated,true);assert.equal(p.appearance.hairColor,'#abcdef');assert.ok(!Object.hasOwn(p.appearance,'gold'));assert.deepEqual(G.stats(p),stats);
  G.customize(p,draft,'จันทรา');assert.equal(p.gold,1500);assert.deepEqual(G.createRoom('r','pvp',[p,G.profile('two','สอง')]).actors[0].appearance,p.appearance);
  p.appearance.hair='crop';assert.equal(draft.hair,'long');
  const poor=G.profile('poor','ผู้เดินทาง');poor.gold=0;const before=JSON.stringify(poor);assert.throws(()=>G.customize(poor,draft,'จันทรา'));assert.equal(JSON.stringify(poor),before);
});
test('legacy profiles preserve their appearance until customized and every selection renders safe art',()=>{
  const old=G.profile('legacy','เดิม');delete old.appearance;delete old.characterCreated;old.outfit='medium';old.xp=980;old.upgrades.talisman=4;
  assert.equal(G.appearance(old).outfit,'medium');assert.equal(G.createRoom('r','solo',[old]).actors[0].appearance,null);
  G.customize(old,G.appearance(old),'เดิม');assert.equal(old.xp,980);assert.equal(old.upgrades.talisman,4);
  for(const [key,choices] of Object.entries(G.appearanceOptions))for(const value of Object.keys(choices)){const a={...G.appearanceDefaults,[key]:value};assert.match(Art.svg(a),/<svg/);assert.ok(!Art.svg(a).includes('undefined'));}
  const sheet=Art.sheet(G.appearance(old));assert.ok(sheet.includes('width="1024" height="2560"'));assert.equal(new Set([...sheet.matchAll(/id="([^"]+)"/g)].map(m=>m[1])).size,96);
  assert.notEqual(Art.svg({...G.appearanceDefaults,gender:'male'}),Art.svg(G.appearanceDefaults));assert.notEqual(Art.svg(G.appearanceDefaults,'cast',0),Art.svg(G.appearanceDefaults,'cast',2));
  const html=Art.editor({...old,name:'<img src=x>'},{appearance:G.appearance(old),pending:true});assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img src=x>'));assert.match(html,/type="submit" disabled/);
});
