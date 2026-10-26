'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),G=require('../rpg-core.js');
async function client(){
  const listeners={},nodes=new Map(),renders=[],windowEvents={};let ws,reloads=0;
  const node=id=>{if(!nodes.has(id))nodes.set(id,{id,dataset:{},textContent:'',innerHTML:'',open:false,classList:{add(){},remove(){}},events:{},addEventListener(name,fn){this.events[name]=fn;},setAttribute(){},removeAttribute(){},showModal(){this.open=true;},close(){this.open=false;this.events.close?.();},focus(){},replaceChildren(){}});return nodes.get(id);};
  const profile=G.profile('qa','ทดสอบ');profile.characterCreated=true;
  class Socket{static OPEN=1;constructor(){this.readyState=1;this.sent=[];ws=this;}send(msg){this.sent.push(JSON.parse(msg));}close(){this.readyState=3;}}
  const document={activeElement:null,getElementById:id=>id==='battle-stage'?null:node(id),querySelector:selector=>selector.startsWith('[data-color-code=')?node('color-code'):null,querySelectorAll:()=>[],addEventListener:(name,fn)=>{listeners[name]=fn;},dispatchEvent(){}};
  const context={window:{NativeRPG:G,addEventListener:(name,fn)=>{windowEvents[name]=fn;}},document,WebSocket:Socket,fetch:async()=>({ok:true,json:async()=>profile}),location:{protocol:'http:',host:'test',reload:()=>reloads++},CustomEvent:class{},Event:class{},setTimeout:()=>1,clearTimeout(){},NativeUI:{icon:()=>''},NativeCharacter:{uri:()=>'',editor:(p,state)=>{renders.push(JSON.parse(JSON.stringify(state)));return '';}}};
  vm.runInNewContext(fs.readFileSync('rpg-client.js','utf8'),context);await new Promise(resolve=>setImmediate(resolve));
  const message=msg=>ws.onmessage({data:JSON.stringify(msg)});
  const click=(selector,dataset)=>listeners.click({target:{closest:s=>s===selector?{dataset}:null}});
  message({type:'hello',profile,chat:[],online:1,queue:null});
  return {node,click,message,ws,profile,renders,listeners,windowEvents,get reloads(){return reloads;}};
}
test('reselecting the current outfit keeps draft dye; choosing a different outfit applies its palette',async()=>{
  const c=await client();c.click('[data-panel]',{panel:'summon'});c.click('[data-appearance-key]',{appearanceKey:'outfit',appearanceValue:'female-craft-1'});
  c.listeners.input({target:{dataset:{characterColor:'outfitColor'},value:'#f056a2'}});
  c.click('[data-appearance-key]',{appearanceKey:'outfit',appearanceValue:'female-craft-1'});assert.equal(c.renders.at(-1).appearance.outfitColor,'#f056a2');
  c.click('[data-appearance-key]',{appearanceKey:'outfit',appearanceValue:'female-craft-2'});assert.equal(c.renders.at(-1).appearance.outfitColor,G.outfits.find(o=>o.id==='female-craft-2').colors.outfitColor);
  assert.equal(c.profile.outfit,'ranger','draft changes must not touch saved appearance');
});
test('queue cancellation stays closed and reconnecting reconciles the queue with server state',async()=>{
  const c=await client();c.message({type:'queue',mode:'pvp'});assert.equal(c.node('npc-dialog').open,true);assert.equal(c.node('npc-dialog').dataset.screen,'queue');
  c.node('close-dialog').events.click();assert.equal(c.node('npc-dialog').open,false);assert.equal(c.ws.sent.at(-1).type,'cancel');
  c.message({type:'queue',mode:null});assert.equal(c.node('npc-dialog').open,false);
  c.message({type:'queue',mode:'pvp'});c.message({type:'hello',profile:c.profile,chat:[],online:1,queue:null});assert.equal(c.node('npc-dialog').dataset.screen,'pvp');
  c.message({type:'hello',profile:c.profile,chat:[],online:1,queue:'coop'});assert.equal(c.node('npc-dialog').dataset.screen,'queue');
});
test('returning through browser history refreshes a page whose WebSocket was closed on navigation',async()=>{
  const c=await client();c.windowEvents.pageshow({persisted:false});assert.equal(c.reloads,0);
  c.windowEvents.pagehide();assert.equal(c.ws.readyState,3);c.windowEvents.pageshow({persisted:true});assert.equal(c.reloads,1);
});
