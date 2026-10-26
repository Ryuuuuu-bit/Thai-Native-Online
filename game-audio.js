'use strict';
(() => {
  const names=['cast','impact','burst','heal','shield','victory','defeat','forge'];
  const clips=Object.fromEntries(names.map(name=>{const audio=new Audio(`assets/sfx/combat-${name}.mp3`);audio.preload='none';audio.volume=['victory','defeat'].includes(name)?.38:.42;return [name,audio];}));
  const music=document.getElementById('battle-music'),toggle=document.getElementById('battle-music-toggle'),sfx=document.getElementById('sfx-toggle');
  const playing=[];let enabled=true,duckTimer,unlocked=false;
  try{enabled=localStorage.getItem('thainative-battle-music')!=='off';}catch{}
  function label(){if(!toggle)return;toggle.setAttribute('aria-pressed',String(enabled));toggle.textContent=enabled?(music.paused?'♫ เปิดเพลง':'♫ เพลงเปิดอยู่'):'♫ เพลงปิดอยู่';}
  function play(name){if(sfx?.getAttribute('aria-pressed')==='false'||!clips[name])return;
    const audio=clips[name];audio.pause();audio.currentTime=0;const previous=playing.indexOf(audio);if(previous>=0)playing.splice(previous,1);while(playing.length>=3)playing.shift().pause();playing.push(audio);audio.play().catch(()=>{});
    if(music){music.volume=.09;clearTimeout(duckTimer);duckTimer=setTimeout(()=>{music.volume=.22;},name==='victory'||name==='defeat'?2800:650);}
  }
  sfx?.addEventListener('click',()=>{if(sfx.getAttribute('aria-pressed')==='false'){playing.forEach(a=>a.pause());playing.length=0;}});
  if(music){
    music.volume=.22;
    const start=()=>{unlocked=true;if(enabled&&!document.hidden)music.play().then(label).catch(label);};
    const gesture=event=>{if(event.target.closest?.('#battle-music-toggle'))return;start();};
    document.addEventListener('pointerdown',gesture,{once:true});document.addEventListener('keydown',gesture,{once:true});
    toggle.addEventListener('click',()=>{if(enabled&&music.paused){start();return;}enabled=!enabled;try{localStorage.setItem('thainative-battle-music',enabled?'on':'off');}catch{}if(enabled)start();else music.pause();label();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)music.pause();else if(unlocked&&enabled)start();});
    music.addEventListener('play',label);music.addEventListener('pause',label);music.addEventListener('error',()=>{toggle.textContent='♫ โหลดเพลงไม่สำเร็จ';});label();
  }
  window.NativeAudio={play};
})();
