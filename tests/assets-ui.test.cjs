'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),G=require('../rpg-core.js'),UI=require('../rpg-ui.js'),A=require('../asset-catalog.js'),S=require('../sprite-runtime.js');
test('every atlas frame and animation references existing source pixels',()=>{
  for(const key of ['items','guide','enemy','vfx']){const sheet=A[key],b=fs.readFileSync(sheet.image);assert.equal(b.readUInt32BE(16),sheet.width);assert.equal(b.readUInt32BE(20),sheet.height);assert.equal(b[25],6);
    for(const [name,f] of Object.entries(sheet.frames)){assert.ok(f.w>0&&f.h>0,name);assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=sheet.width&&f.y+f.h<=sheet.height,name);}
    for(const action of Object.values(sheet.actions||{}))for(const frame of action.frames)assert.ok(sheet.frames[frame]);
  }
  assert.equal(Object.keys(A.items.frames).length,16);for(const g of G.gear)assert.ok(A.items.frames[g.id]);
  for(const layer of A.layers)if(layer.image)assert.ok(fs.existsSync(layer.image));
});
test('equipment preview handles upgrades and both HP/armor without modifying saved profile',()=>{
  const p=G.profile('a','<img src=x onerror=alert(1)>');p.upgrades.flame=2;const before=JSON.stringify(p),rows=UI.comparison(p,'flame');assert.equal(rows.find(s=>s.key==='attack').delta,25);assert.equal(JSON.stringify(p),before);
  const armor=UI.comparison(p,'robe');assert.equal(armor.find(s=>s.key==='hp').delta,60);assert.equal(armor.find(s=>s.key==='armor').delta,5);
  const html=UI.inventory('collection',p,{});assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('data-select-item="talisman"'));
  assert.equal(UI.comparison(p,'missing'),null);
});
test('shop, bag, pending forge and wardrobe produce valid affordable actions',()=>{
  const iconA=UI.icon('talisman'),iconB=UI.icon('talisman');assert.match(iconA,/<clipPath/);assert.notEqual(iconA.match(/id="([^"]+)"/)[1],iconB.match(/id="([^"]+)"/)[1]);
  const p=G.profile('a','A');p.gold=0;
  const shop=UI.inventory('shop',p,{selected:'flame'});assert.match(shop,/ต้องการอีก 650 เหรียญ/);assert.match(shop,/data-action="buy" data-id="flame" disabled/);
  const bag=UI.inventory('bag',p,{filter:'armor'});assert.ok(bag.includes('data-select-item="cloth"'));assert.ok(!bag.includes('inventory-entry selected"><button class="item-slot rarity-B'));
  p.gold=1000;const pending=UI.forge(p,{pending:true});assert.match(pending,/data-action="upgrade" data-id="talisman" disabled/);
  const wardrobe=UI.wardrobe(p,{outfit:'jade'});assert.ok(wardrobe.includes('พรีวิว ผู้พิทักษ์หยก'));assert.ok(wardrobe.includes('ปลดล็อกและใช้ · 300'));
});
test('animation preview loops idle, holds defeat and honors reduced motion',()=>{
  assert.equal(S.frameAt(A.guide,'move',-1),A.guide.frames['move-0']);
  const sheet=A.guide;assert.equal(S.frameAt(sheet,'idle',1000),sheet.frames['idle-0']);assert.equal(S.frameAt(sheet,'defeat',5000),sheet.frames['defeat-3']);assert.equal(S.frameAt(sheet,'cast',400,true),sheet.frames['cast-0']);
});
