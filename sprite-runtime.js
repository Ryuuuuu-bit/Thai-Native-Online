/* Shared animation metadata adapter for the battlefield and asset preview. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.NativeSprites=factory();})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  function install(scene,catalog){
    for(const key of ['guide','enemy','vfx']){
      const data=catalog[key],texture=scene.textures.get(key+'Sheet');
      for(const [name,f] of Object.entries(data.frames))texture.add(name,0,f.x,f.y,f.w,f.h);
      const actions=data.actions||Object.fromEntries(['impact','burst','heal','shield','hit','victory'].map(a=>[a,{frames:[0,1,2,3].map(i=>a+'-'+i),fps:10,loop:false}]));
      for(const [name,action] of Object.entries(actions)){const id=key+'-'+name;if(!scene.anims.exists(id))scene.anims.create({key:id,frames:action.frames.map(frame=>({key:key+'Sheet',frame})),frameRate:action.fps,repeat:action.loop?-1:0});}
    }
  }
  function frameAt(sheet,action,elapsed,reduced=false){const config=sheet.actions[action]||sheet.actions.idle;const step=reduced?0:Math.floor(Math.max(0,elapsed)*config.fps/1000),index=config.loop?step%config.frames.length:Math.min(step,config.frames.length-1);return sheet.frames[config.frames[index]];}
  return {install,frameAt};
});
