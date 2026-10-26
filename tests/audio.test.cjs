'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('combat effects respect mute and cap simultaneous audio voices',()=>{
  const clips=[],events={};let muted=false;
  class Audio{constructor(src){this.src=src;this.paused=true;this.plays=0;clips.push(this);}play(){this.paused=false;this.plays++;return Promise.resolve();}pause(){this.paused=true;}}
  const sfx={getAttribute:()=>String(!muted),addEventListener:(name,fn)=>events[name]=fn},window={};
  vm.runInNewContext(fs.readFileSync('game-audio.js','utf8'),{Audio,window,document:{getElementById:id=>id==='sfx-toggle'?sfx:null},localStorage:{getItem:()=>null},setTimeout:()=>1,clearTimeout:()=>{}});
  for(const name of ['cast','impact','burst','heal'])window.NativeAudio.play(name);
  assert.equal(clips.filter(c=>!c.paused).length,3);assert.equal(clips[0].paused,true);
  muted=true;window.NativeAudio.play('shield');assert.equal(clips[4].plays,0);events.click();assert.equal(clips.filter(c=>!c.paused).length,0);
});
test('battle music toggle starts once, can mute, and does not resume while disabled',async()=>{
  const events={},buttonEvents={},stored={};
  class Audio{constructor(){this.paused=true;this.plays=0;}play(){this.paused=false;this.plays++;return Promise.resolve();}pause(){this.paused=true;}addEventListener(){}}
  const music=new Audio(),toggle={setAttribute(){},addEventListener:(name,fn)=>buttonEvents[name]=fn};
  const document={hidden:false,getElementById:id=>id==='battle-music'?music:id==='battle-music-toggle'?toggle:null,addEventListener:(name,fn)=>events[name]=fn};
  vm.runInNewContext(fs.readFileSync('game-audio.js','utf8'),{Audio,window:{},document,localStorage:{getItem:()=>null,setItem:(k,v)=>stored[k]=v},setTimeout:()=>1,clearTimeout(){}});
  events.pointerdown({target:{closest:()=>toggle}});assert.equal(music.plays,0);buttonEvents.click();await Promise.resolve();assert.equal(music.plays,1);assert.equal(music.paused,false);
  buttonEvents.click();assert.equal(music.paused,true);assert.equal(stored['thainative-battle-music'],'off');events.visibilitychange();assert.equal(music.plays,1);
});
