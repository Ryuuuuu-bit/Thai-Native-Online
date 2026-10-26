'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const G=require('../rpg-core.js'),D=require('../sprite-character-data.js'),Paint=require('../sprite-character.js');
test('all 100 outfits resolve to complete raster frames, palettes and valid source bounds',()=>{
  const refs=new Set(),palettes=new Set();
  for(const s of Object.values(D.sheets)){
    const png=fs.readFileSync(path.join(__dirname,'..',s.image));assert.equal(png.readUInt32BE(16),s.width);assert.equal(png.readUInt32BE(20),s.height);
    for(const f of Object.values(s.frames)){assert.ok(f.x>=0&&f.y>=0&&f.w>0&&f.h>0&&f.x+f.w<=s.width&&f.y+f.h<=s.height);if(f.spans){assert.equal(f.spans.length,f.h);for(const [l,r] of f.spans)assert.ok(l>=0&&l<r&&r<=f.w);}}
  }
  for(const outfit of G.outfits.filter(o=>o.gender)){
    const a={...G.appearanceDefaults,...outfit.colors,outfit:outfit.id,gender:outfit.gender},ref=Paint.bodyRef(a);
    assert.ok(D.sheets[ref.sheet].frames[ref.id]);refs.add(ref.sheet+ref.id);palettes.add(a.outfitColor);assert.deepEqual(G.validateAppearance(a),a);
    if(['royal','academy','sea','craft'].includes(outfit.theme))assert.match(ref.sheet,/-world$/);
  }
  assert.equal(refs.size,100);assert.equal(palettes.size,10);
  assert.equal(Paint.bodyRef({...G.appearanceDefaults,outfit:'jade'}).sheet,'female');
});
test('selective dye keeps neutral fabric and face eyes, preserves shadows and supports dark/light colors',()=>{
  const a={...G.appearanceDefaults,outfitColor:'#ff3355',hairColor:'#3399ff'};
  assert.deepEqual(Paint.dye([245,245,245],'body',a),[245,245,245]);
  assert.deepEqual(Paint.dye([130,40,180],'face',a),[130,40,180]);
  const fabric=Paint.dye([40,95,140],'body',a);assert.ok(fabric[0]>fabric[2]);
  const skin=Paint.dye([244,198,162],'body',a);assert.deepEqual(skin,Paint.dye([244,198,162],'face',a));
  for(const color of ['#000000','#ffffff','#12ff00'])for(const pixel of [[30,60,90],[65,130,170],[160,190,220]]){const dyed=Paint.dye(pixel,'body',{...a,outfitColor:color});assert.ok(dyed.every(n=>Number.isInteger(n)&&n>=0&&n<=255));}
  const dark=Paint.dye([30,60,90],'body',a),light=Paint.dye([65,130,170],'body',a);assert.ok(light[0]>dark[0]);
});
test('every painted outfit stays inside its frame during all 32 action samples, including crowns and defeat',()=>{
  for(const o of G.outfits.filter(o=>o.gender))for(const hair of ['crop','bob','tails','long'])for(const head of ['none','crown','cat'])for(const action of ['idle','move','aim','cast','hit','guard','victory','defeat'])for(let frame=0;frame<4;frame++){
    const a={...G.appearanceDefaults,gender:o.gender,outfit:o.id,hair,head},layout=Paint.frameLayout(a,action,frame),b=layout.bounds;
    assert.ok(b.left>=3.999&&b.right<=252.001&&b.top>=3.999&&b.bottom<=316.001,`${o.id} ${hair} ${head} ${action}-${frame}`);
    assert.ok(layout.scale>0&&layout.scale<=1);
  }
});
test('skin dye reaches both exposed arms while leaving ivory skirts and a white dinner jacket alone',()=>{
  const cases=[['female-world','female-craft-1',[[100,930],[220,910]],[[120,1000],[150,1040]]],['male-world','male-royal-4',[[880,145],[1060,145]],[[910,100],[1040,100]]]];
  for(const [sheet,id,skin,cloth] of cases){const f=D.sheets[sheet].frames[id];for(const [x,y] of skin)assert.equal(Paint.skinAt(f,x-f.x,y-f.y),true,`${id} skin ${x},${y}`);for(const [x,y] of cloth)assert.equal(Paint.skinAt(f,x-f.x,y-f.y),false,`${id} cloth ${x},${y}`);}
  const a={...G.appearanceDefaults,skinColor:'#7b503b'};
  assert.deepEqual(Paint.dye([177,119,95],'body',a,undefined,false),[177,119,95]);
  assert.notDeepEqual(Paint.dye([249,224,200],'body',a,undefined,true),[249,224,200]);
});
