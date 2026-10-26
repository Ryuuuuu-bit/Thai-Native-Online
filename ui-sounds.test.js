const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const clips = [], handlers = {}, attrs = {}, saved = {};
let toggleClick;
const toggle = { textContent:'', setAttribute:(k,v)=>attrs[k]=v, addEventListener:(_,fn)=>toggleClick=fn };
class Audio {
  constructor(src) { this.src=src; this.plays=0; this.pauses=0; clips.push(this); }
  play() { this.plays++; return Promise.resolve(); }
  pause() { this.pauses++; }
}
const context = { Audio, window:{}, document:{getElementById:()=>toggle,addEventListener:(name,fn)=>handlers[name]=fn}, sessionStorage:{getItem:k=>saved[k],setItem:(k,v)=>saved[k]=v} };
vm.runInNewContext(fs.readFileSync('ui-sounds.js','utf8'),context);
const click = (props={}) => handlers.click({target:{closest:()=>({id:'',disabled:false,getAttribute:()=>null,matches:()=>false,...props})}});
assert.equal(clips.length,4); assert.equal(attrs['aria-pressed'],'true');
click();assert.equal(clips[0].plays,1);
click({disabled:true});assert.equal(clips[0].plays,1);
click({matches:s=>s==='[data-panel]'});assert.equal(clips[1].plays,1);assert.equal(clips[0].pauses,1);
click({matches:s=>s==='[data-buy], [data-summon]'});assert.equal(clips[0].plays,1);
context.window.ThaiNativeSounds.play('purchase');assert.equal(clips[2].plays,1);
context.window.ThaiNativeSounds.play('summon');assert.equal(clips[3].plays,1);
toggleClick();assert.equal(attrs['aria-pressed'],'false');assert.equal(saved['thainative-sfx'],'off');
click();context.window.ThaiNativeSounds.play('summon');assert.equal(clips[3].plays,1);
toggleClick();assert.equal(attrs['aria-pressed'],'true');assert.equal(clips[0].plays,2);
assert.ok(clips.every(c=>c.volume<=0.3));
console.log('Passed: UI effects, disabled controls, no duplicate success sounds, single channel, mute, session preference, volume.');
