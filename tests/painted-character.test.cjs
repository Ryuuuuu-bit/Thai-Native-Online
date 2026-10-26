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
