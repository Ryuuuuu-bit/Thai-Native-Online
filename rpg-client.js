'use strict';
(() => {
  const G=window.NativeRPG,$=id=>document.getElementById(id),battle=!!$('battle-stage');
  let profile=null,socket=null,room=null,queued=null,activePanel=null,reconnect,closed=false;
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('visible'),4200);}
  function send(msg){if(socket?.readyState!==WebSocket.OPEN){toast('ยังไม่เชื่อมต่อเซิร์ฟเวอร์ กรุณารอสักครู่');return false;}socket.send(JSON.stringify(msg));return true;}
  function update(){if(!profile)return;
    if($('coins'))$('coins').textContent=profile.gold.toLocaleString();if($('tickets'))$('tickets').textContent=profile.stones;
    if($('player-name'))$('player-name').textContent=profile.name;if($('player-level'))$('player-level').textContent=G.level(profile);
    if($('bag-count'))$('bag-count').textContent=profile.owned.length;if($('ticket-bubble'))$('ticket-bubble').textContent='✦ เปลี่ยนชุด · เปลี่ยนตัวละคร';
    if($('player-subtitle'))$('player-subtitle').textContent=`Lv.${G.level(profile)} · ชนะ ${profile.wins} ครั้ง`;
    document.dispatchEvent(new CustomEvent('native-profile',{detail:profile}));
  }
  function chat(entry){const line=document.createElement('p'),name=document.createElement('b'),text=document.createElement('span');name.textContent=entry.name+' ';text.textContent=entry.text;line.append(name,text);$('chat-lines').append(line);while($('chat-lines').children.length>40)$('chat-lines').firstElementChild.remove();$('chat-lines').scrollTop=$('chat-lines').scrollHeight;}
  async function connect(){
    try{const response=await fetch('/api/profile');if(!response.ok)throw Error();profile=await response.json();update();socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/socket`);
      socket.onopen=()=>{$('connection').textContent='● เชื่อมต่อแล้ว';$('connection').className='connected';};
      socket.onmessage=event=>{const msg=JSON.parse(event.data);
        if(msg.type==='hello'){profile=msg.profile;update();$('chat-lines').replaceChildren();msg.chat.forEach(chat);$('online-count').textContent=msg.online;}
        if(msg.type==='presence')$('online-count').textContent=msg.online;
        if(msg.type==='chat')chat(msg.entry);
        if(msg.type==='profile'){profile=msg.profile;update();toast(msg.message);if(msg.message.startsWith('ตีบวกสำเร็จ'))window.NativeAudio?.play('forge');else window.ThaiNativeSounds?.play('purchase');if(activePanel)show(activePanel);}
        if(msg.type==='error'){toast(msg.message);if(activePanel)show(activePanel);}
        if(msg.type==='queue'){queued=msg.mode;if(queued)show('queue');else{queued=null;show('adventure');}}
        if(msg.type==='room'||msg.type==='shot'){room=msg.room;queued=null;if(!battle){location.href='battle.html';return;}document.dispatchEvent(new CustomEvent('native-room',{detail:msg}));}
        if(msg.type==='reward'){profile=msg.profile;update();document.dispatchEvent(new CustomEvent('native-reward',{detail:msg}));}
        if(msg.type==='left')location.href='./';
      };
      socket.onclose=event=>{$('connection').textContent=event.code===4001?'เปิดอยู่ในอีกแท็บ':'● ขาดการเชื่อมต่อ';$('connection').className='disconnected';document.dispatchEvent(new Event('native-offline'));if(event.code!==4001&&!closed)reconnect=setTimeout(connect,2500);};
      socket.onerror=()=>{};
    }catch{$('connection').textContent='● รอเซิร์ฟเวอร์';toast('เปิดเกมผ่าน npm start แล้วเข้า localhost:4173');if(!closed)reconnect=setTimeout(connect,5000);}
  }
  const equipped=g=>profile.equipment[g.slot]===g.id;
  function gearCard(g,shop=false){const owned=profile.owned.includes(g.id),n=profile.upgrades[g.id]||0;return `<article class="gear-card ${equipped(g)?'equipped':''}"><div class="gear-icon ${g.slot}">${g.icon}<small>${g.slot==='weapon'?'อาวุธ':g.slot==='armor'?'เสื้อเกราะ':'เครื่องราง'}</small></div><h3>${g.name}${n?' +'+n:''}</h3><p>${g.desc}</p><span class="gear-stat">${g.attack?'โจมตี '+(g.attack+n*7):'พลังชีวิต +'+g.hp}</span>${owned?`<button class="small-button" data-action="equip" data-id="${g.id}" ${equipped(g)?'disabled':''}>${equipped(g)?'✓ สวมใส่อยู่':'สวมใส่'}</button>`:`<button class="small-button" data-action="buy" data-id="${g.id}" ${profile.gold<g.cost?'disabled':''}>ซื้อ · ◉ ${g.cost}</button>`}</article>`;}
  function show(panel){if(battle||!profile)return;activePanel=panel;
    const body=$('dialog-body');let title='',subtitle='',html='';
    if(panel==='shop'){title='ร้านของวิเศษ · ลุงบุญ';subtitle='เตรียมอุปกรณ์ก่อนออกเดินทาง';html='<div class="gear-grid">'+G.gear.filter(g=>g.cost).map(g=>gearCard(g,true)).join('')+'</div>';}
    if(panel==='collection'||panel==='bag'){title=panel==='bag'?'คลังอุปกรณ์':'อุปกรณ์สวมใส่';const s=G.stats(profile);subtitle=`พลังชีวิต ${s.hp} · โจมตี ${s.attack} · เกราะ ${s.armor}`;html=`<div class="character-summary"><img src="assets/npc-${profile.outfit==='medium'?'summon':'adventure'}.png" alt="ตัวละครของคุณ"><div><small>ผู้ผูกวิญญาณ · LEVEL ${G.level(profile)}</small><h3>${escape(profile.name)}</h3><p>ประสบการณ์ ${profile.xp%150} / 150</p><progress value="${profile.xp%150}" max="150"></progress><p>◉ ${profile.gold} เหรียญ · ◆ ${profile.stones} หินตีบวก</p></div></div><div class="gear-grid">${G.gear.filter(g=>profile.owned.includes(g.id)).map(g=>gearCard(g)).join('')}</div>`;}
    if(panel==='forge'){title='โรงตีอาคม';subtitle='อาวุธสูงสุด +5 · ไม่สำเร็จจะไม่ลดระดับหรือทำลายอาวุธ';const id=profile.equipment.weapon,g=G.item(id),c=G.upgradeCost(profile,id);html=`<div class="forge-stage"><div class="forge-rune">${g.icon}</div><small>อาวุธที่สวมใส่</small><h3>${g.name} <em>+${c.level}</em></h3><div class="forge-stats">โจมตี ${g.attack+c.level*7} <b>→</b> ${c.level<5?g.attack+(c.level+1)*7:'MAX'}</div><p>${c.level<5?'โอกาสสำเร็จ '+Math.round(c.chance*100)+'%':'ถึงระดับสูงสุดแล้ว'}</p>${c.level<5?`<p class="cost">◉ ${c.gold} เหรียญ &nbsp; ◆ ${c.stones} หินตีบวก</p><button class="gold-button" data-action="upgrade" data-id="${id}" ${profile.gold<c.gold||profile.stones<c.stones?'disabled':''}>ตีบวกอาวุธ ✦</button><small>ใช้วัตถุดิบทุกครั้ง รวมถึงครั้งที่ไม่สำเร็จ</small>`:''}</div>`;}
    if(panel==='summon'){title='ศาลแปลงโฉม · แม่หมอม่วง';subtitle='เปลี่ยนรูปลักษณ์ โดยคงค่าพลังจากอุปกรณ์';html='<div class="outfit-grid">'+G.outfits.map(o=>`<article class="outfit-card ${profile.outfit===o.id?'selected':''}"><img class="${o.id==='jade'?'jade':''}" src="assets/npc-${o.art==='medium'?'summon':'adventure'}.png" alt="${o.name}"><h3>${o.name}</h3><button class="small-button" data-action="outfit" data-id="${o.id}" ${profile.outfit===o.id?'disabled':''}>${profile.outfit===o.id?'✓ ใช้ชุดนี้อยู่':profile.outfits.includes(o.id)?'เลือกชุดนี้':'ปลดล็อก ◉ '+o.cost}</button></article>`).join('')+'</div>';}
    if(panel==='adventure'){title='เลือกการเดินทาง';subtitle='เล็งมุม · ปรับแรง · อ่านทิศลม · ผูกพลังภูติ';html=`<div class="mode-tabs"><button class="selected" data-panel="adventure">เล่นคนเดียว</button><button data-panel="coop">ดันเจี้ยนทีม</button><button data-panel="pvp">PvP ออนไลน์</button></div><div class="dungeon-list">${G.stages.map((s,i)=>`<article class="dungeon-card"><span class="chapter">0${i+1}</span><div><small>${s.subtitle}</small><h3>${s.name} ${profile.cleared.includes(s.id)?'<span class="cleared">✓ ผ่านแล้ว</span>':''}</h3><p>รางวัลชนะ ◉ ${s.gold} · ◆ ${s.stones} · EXP ${s.xp}</p></div><button class="gold-button" data-play="solo" data-stage="${s.id}">เข้าสู่ด่าน →</button></article>`).join('')}</div><p class="demo-note">แพ้ยังได้รับรางวัลเล็กน้อย · ไม่มีพลังงานจำกัดการเล่น</p>`;}
    if(panel==='coop'||panel==='pvp'){const pvp=panel==='pvp';title=pvp?'ลานประลองจันทรา':'ร่วมทีมพิทักษ์ศาล';subtitle=pvp?'PvP 1 vs 1 · จับคู่ผู้เล่นจริง':'ดันเจี้ยน 2 ผู้เล่น · ต่อสู้กับผู้เฝ้าศาล 2 ตัว';html=`<div class="match-intro"><div class="match-symbol">${pvp?'⚔':'♧'}</div><h3>${pvp?'อ่านลมให้ขาด แล้ววัดกันที่ฝีมือ':'รวมพลังกับนักเดินทางอีกหนึ่งคน'}</h3><p>${pvp?'พลังชีวิต 300 / โจมตี 58 เท่ากันทั้งสองฝ่าย<br>อุปกรณ์และตีบวกไม่เพิ่มค่าพลังในโหมดนี้':'ใช้อุปกรณ์และค่าตีบวกของคุณจริง<br>รับรางวัลเมื่อทีมปราบผู้เฝ้าศาลได้'}</p><button class="gold-button" data-play="${panel}" data-stage="shrine">${pvp?'ค้นหาคู่ต่อสู้':'ค้นหาเพื่อนร่วมทีม'}</button><p class="demo-note">ต้องมีอีกคนเข้าคิวโหมดเดียวกัน ไม่มีบอตเติมคิว<br>ทดลองสองคนบนเครื่องนี้: เปิดอีกเบราว์เซอร์หรือหน้าต่างไม่ระบุตัวตน</p></div>`;}
    if(panel==='queue'){title=queued==='pvp'?'กำลังค้นหาคู่ต่อสู้':'กำลังค้นหาเพื่อนร่วมทีม';subtitle='เชื่อมต่อกับผู้เล่นจริงผ่านเซิร์ฟเวอร์';html='<div class="match-intro"><div class="queue-orbit">✦</div><h3>รอนักเดินทางอีกหนึ่งคน…</h3><p>ให้อีกคนเลือกโหมดเดียวกัน แล้วเกมจะเริ่มอัตโนมัติ</p><button class="small-button" id="cancel-queue">ยกเลิกการค้นหา</button></div>';}
    if(panel==='help'){title='บันทึกนักเดินทาง';subtitle='ThaiNative · Online RPG playable alpha';html=`<div class="help-copy"><p><b>การต่อสู้:</b> ผลัดตายิงวิถีโค้ง ตั้งมุม 10–85° และแรง 15–100 อ่านลมด้านบน ยิงใกล้ศัตรูเพื่อสร้างความเสียหาย เปลี่ยนทิศยิงได้</p><p><b>การเติบโต:</b> ชนะด่านรับเหรียญและหิน ซื้ออุปกรณ์ ตีบวกอาวุธ และปลดล็อกชุด</p><p><b>ออนไลน์:</b> แชท ดันเจี้ยนทีม และ PvP เชื่อมต่อเซิร์ฟเวอร์จริง ผู้เล่นสองคนต้องใช้คนละเบราว์เซอร์หรือหน้าต่างส่วนตัว</p><p><b>บัญชี Guest:</b> บันทึกที่เซิร์ฟเวอร์และจำด้วยคุกกี้ ล้างคุกกี้แล้วจะเข้าสู่ตัวละครใหม่ รุ่นนี้ยังไม่มีระบบล็อกอินหรือกู้บัญชี</p><label>ชื่อนักเดินทาง<input id="rename-input" maxlength="18" value="${escape(profile.name)}"></label><button class="small-button" id="rename-save">บันทึกชื่อ</button></div>`;}
    $('dialog-title').textContent=title;$('dialog-subtitle').textContent=subtitle;body.innerHTML=html;$('panel-message').textContent='';if(!$('npc-dialog').open)$('npc-dialog').showModal();
  }
  document.addEventListener('click',event=>{
    const panel=event.target.closest('[data-panel]');if(panel){if(queued&&panel.dataset.panel!=='queue'){toast('ยกเลิกการค้นหาก่อนเปลี่ยนเมนู');return;}show(panel.dataset.panel);}
    const action=event.target.closest('[data-action]');if(action&&!action.disabled){action.disabled=true;send({type:'inventory',action:action.dataset.action,id:action.dataset.id});}
    const play=event.target.closest('[data-play]');if(play&&!play.disabled){play.disabled=true;send({type:'play',mode:play.dataset.play,stage:play.dataset.stage});}
    if(event.target.closest('#cancel-queue'))send({type:'cancel'});
    if(event.target.closest('#rename-save'))send({type:'name',name:$('rename-input').value});
  });
  $('close-dialog')?.addEventListener('click',()=>{$('npc-dialog').close();activePanel=null;if(queued)send({type:'cancel'});});
  $('npc-dialog')?.addEventListener('cancel',()=>{activePanel=null;if(queued)send({type:'cancel'});});
  $('chat-form').addEventListener('submit',e=>{e.preventDefault();const input=$('chat-input');if(input.value.trim()&&send({type:'chat',text:input.value}))input.value='';});
  window.NativeClient={send,toast,get profile(){return profile;},get room(){return room;},get connected(){return socket?.readyState===WebSocket.OPEN;}};
  window.addEventListener('pagehide',()=>{closed=true;clearTimeout(reconnect);socket?.close();});
  connect();
})();
