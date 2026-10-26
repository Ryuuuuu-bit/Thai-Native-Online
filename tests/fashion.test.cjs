'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),G=require('../rpg-core.js'),Art=require('../character-art.js'),Fashion=require('../fashion-art.js');
test('100 distinct garment geometries: 50 per gender, ten categories, safe in every animated pose',()=>{
  const list=G.outfits.filter(o=>o.gender);assert.equal(list.length,100);assert.equal(new Set(list.map(o=>o.id)).size,100);assert.equal(new Set(list.map(o=>o.name)).size,100);
  const geometries=new Set();
  for(const gender of ['male','female']){
    assert.equal(list.filter(o=>o.gender===gender).length,50);
    for(const theme of Object.keys(G.fashionCategories))assert.equal(list.filter(o=>o.gender===gender&&o.theme===theme).length,5);
    for(const o of list.filter(o=>o.gender===gender)){
      const a={...G.appearanceDefaults,gender,outfit:o.id,outfitColor:'#777777',accentColor:'#777777'};
      const pieces=Fashion.draw(o,a);geometries.add(pieces.back+pieces.body+pieces.leftSleeve+pieces.rightSleeve);
      assert.equal(G.validateAppearance(a).outfit,o.id);assert.equal(o.cost,0);
      const sheet=Art.sheet(a);assert.ok(!sheet.includes('undefined'),o.id);assert.ok(!sheet.includes('NaN'),o.id);assert.match(sheet,/width="1024" height="2560"/);
      assert.ok(Art.thumbnail(o,a).startsWith('data:image/svg+xml'));
    }
  }
  assert.equal(geometries.size,100,'identical colors must still produce 100 different garment designs');
});
test('gender-specific outfits cannot bypass validation, switching preserves progress and stats',()=>{
  const p=G.profile('fashion','นักเดินทาง'),before=JSON.stringify(p),stats=G.stats(p);
  assert.throws(()=>G.customize(p,{...G.appearanceDefaults,outfit:'male-street-1'},p.name),/ชุดไม่ตรง/);assert.equal(JSON.stringify(p),before);
  assert.throws(()=>G.transact(p,'outfit','male-street-1'),/ชุดไม่ตรง/);assert.equal(JSON.stringify(p),before);
  for(const o of G.outfits.filter(o=>o.gender)){G.customize(p,{...G.appearanceDefaults,gender:o.gender,outfit:o.id},p.name);assert.equal(p.outfit,o.id);assert.equal(p.gold,1800);assert.deepEqual(G.stats(p),stats);assert.equal(G.createRoom('r','solo',[p]).actors[0].appearance.outfit,o.id);}
  G.transact(p,'outfit','female-siam-1');assert.equal(p.appearance.outfit,'female-siam-1');
  G.customize(p,{...G.appearanceDefaults,outfit:'jade'},p.name);assert.equal(p.gold,1500);assert.ok(p.outfits.includes('jade'));
});
test('fashion catalog filters gender, paginates all fifty and keeps old costumes accessible',()=>{
  const p=G.profile('ui','ทดสอบ'),a=G.appearance(p),seen=new Set();
  for(let page=0;page<5;page++){
    const html=Art.editor(p,{appearance:a,fashionPage:page});const ids=[...html.matchAll(/data-appearance-key="outfit" data-appearance-value="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,10);ids.forEach(id=>{assert.ok(id.startsWith('female-'));seen.add(id);});
  }
  assert.equal(seen.size,50);
  const filtered=Art.editor(p,{appearance:a,fashionCategory:'royal'});assert.equal([...filtered.matchAll(/class="fashion-card/g)].length,5);assert.ok(!filtered.includes('data-appearance-value="male-'));
  const legacy=Art.editor(p,{appearance:a,fashionCategory:'legacy'});assert.ok(legacy.includes('data-appearance-value="jade"'));assert.match(legacy,/300 เหรียญ/);
  const pending=Art.editor(p,{appearance:a,pending:true});assert.match(pending,/id="fashion-category" disabled/);assert.match(pending,/type="submit" disabled/);
});
