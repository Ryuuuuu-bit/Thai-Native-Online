'use strict';
(() => {
  const A=NativeAssets,$=id=>document.getElementById(id),labels={idle:'ยืน',move:'เดิน',aim:'เล็ง',cast:'ยิง',hit:'โดนโจมตี',guard:'ตั้งรับ',victory:'ชนะ',defeat:'แพ้'},effectNames={impact:'ยันต์วิถี',burst:'ระเบิดภูติ',heal:'ฟื้นพลัง',shield:'โล่',hit:'กระแทก',victory:'ฉลองชัย'};
  const names=['ยันต์จันทร์เสี้ยว','หม้อเพลิงภูติ','บัวประกายแก้ว','เสื้อเดินป่า','อาภรณ์คุ้มวิญญาณ','สายสิญจน์ข้อมือ','จี้จันทรา','เหรียญบัวทอง','หินตีบวก','ขวดแสงประสบการณ์','น้ำยาฟื้นชีวิต','น้ำยาฟื้นอาคม','ตั๋วเรียกภูติ','กุญแจนาค','หีบของวิเศษ','แก่นภูติ'];
  $('asset-items').innerHTML=Object.keys(A.items.frames).map((id,i)=>`<article class="asset-tile">${NativeUI.icon(id)}<h3>${names[i]}</h3><code>${id}</code><span class="asset-status ${i>8?'future':''}">${i<9?'ใช้งานกับระบบปัจจุบัน':'ภาพเตรียมไว้ · ระบบไอเทมยังไม่เปิด'}</span></article>`).join('');
  $('rarity-samples').innerHTML=['C','B','A','S','SS'].map(r=>`<div class="item-slot rarity-${r}">${NativeUI.icon('talisman')}<span class="rarity-label">${r}</span></div>`).join('');
  $('action-buttons').innerHTML=Object.entries(labels).map(([id,name])=>`<button data-pose="${id}" class="${id==='idle'?'selected':''}">${name}</button>`).join('');
  $('vfx-buttons').innerHTML=Object.entries(effectNames).map(([id,name])=>`<button data-effect="${id}" class="${id==='impact'?'selected':''}">${name}</button>`).join('');
  let character='guide',pose='idle',effect='impact',started=performance.now(),effectStarted=started;
  const images={};for(const key of ['guide','enemy','vfx']){images[key]=new Image();images[key].src=A[key].image;images[key].onerror=()=>$('motion-note').textContent='โหลดภาพไม่สำเร็จ กรุณารีเฟรช';}
  const canvas=$('sprite-preview'),ctx=canvas.getContext('2d'),fx=$('vfx-preview'),fxctx=fx.getContext('2d');
  $('play-animation').checked=!matchMedia('(prefers-reduced-motion: reduce)').matches;
  function note(){$('motion-note').textContent=character==='guide'?'28 ท่าภาพจริง · ตั้งรับใช้เฟรมร่วมกับท่าป้องกันแรงกระแทก':'32 เฟรม · 8 ท่า · 4 เฟรมต่อท่า';$('sprite-download').href=A[character].image;}
  $('character-select').addEventListener('change',e=>{character=e.target.value;started=performance.now();note();});
  document.addEventListener('click',e=>{const action=e.target.closest('[data-pose]'),vfx=e.target.closest('[data-effect]'),demo=e.target.closest('[data-demo]');if(action){pose=action.dataset.pose;started=performance.now();document.querySelectorAll('[data-pose]').forEach(b=>b.classList.toggle('selected',b===action));}if(vfx){effect=vfx.dataset.effect;effectStarted=performance.now();document.querySelectorAll('[data-effect]').forEach(b=>b.classList.toggle('selected',b===vfx));}if(demo){$('kit-feedback').textContent='เลือก '+demo.textContent+' แล้ว';if(demo.dataset.demo==='tab')document.querySelectorAll('[data-demo="tab"]').forEach(b=>{b.classList.toggle('selected',b===demo);b.setAttribute('aria-pressed',String(b===demo));});}});
  document.querySelectorAll('[data-layer]').forEach(box=>box.addEventListener('change',()=>{$(box.dataset.layer).hidden=!box.checked;}));
  function draw(now){if(!document.hidden){const playing=$('play-animation').checked,sheet=A[character],config=sheet.actions[pose],duration=config.frames.length/config.fps*1000+700,elapsed=(now-started)%duration,frame=NativeSprites.frameAt(sheet,pose,elapsed,!playing),scale=280/sheet.baseHeight;
    ctx.clearRect(0,0,canvas.width,canvas.height);if(images[character].complete&&images[character].naturalWidth)ctx.drawImage(images[character],frame.x,frame.y,frame.w,frame.h,320-frame.w*scale/2,397-frame.h*scale,frame.w*scale,frame.h*scale);
    $('frame-label').textContent=`${character} / ${pose} · ${frame.w}×${frame.h}px source · ${config.fps} fps`;
    fxctx.clearRect(0,0,640,320);const t=playing?(now-effectStarted)%1400:200;if(t<400){const f=A.vfx.frames[effect+'-'+Math.max(0,Math.min(3,Math.floor(t/100)))];if(images.vfx.complete&&images.vfx.naturalWidth){fxctx.globalCompositeOperation='lighter';fxctx.drawImage(images.vfx,f.x,f.y,f.w,f.h,180,20,280,280);fxctx.globalCompositeOperation='source-over';}}
  }requestAnimationFrame(draw);}note();requestAnimationFrame(draw);
})();
