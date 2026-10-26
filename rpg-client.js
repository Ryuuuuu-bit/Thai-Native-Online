'use strict';
(() => {
  const G=window.NativeRPG,$=id=>document.getElementById(id),battle=!!$('battle-stage');
  let profile=null,socket=null,room=null,queued=null,activePanel=null,reconnect,closed=false,pending=false,panelTrigger=null;
  const uiState={filter:'all',selected:null,outfit:null,appearance:null,name:null};
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('visible'),4200);}
  function send(msg){if(socket?.readyState!==WebSocket.OPEN){toast('ยังไม่เชื่อมต่อเซิร์ฟเวอร์ กรุณารอสักครู่');return false;}socket.send(JSON.stringify(msg));return true;}
  function update(){if(!profile)return;
    if($('coins'))$('coins').textContent=profile.gold.toLocaleString();if($('tickets'))$('tickets').textContent=profile.stones;
    if($('player-name'))$('player-name').textContent=profile.name;if($('player-level'))$('player-level').textContent=G.level(profile);
    if($('bag-count'))$('bag-count').textContent=profile.owned.length;if($('ticket-bubble'))$('ticket-bubble').textContent='✦ เปลี่ยนชุด · เปลี่ยนตัวละคร';
    if($('player-subtitle'))$('player-subtitle').textContent=`Lv.${G.level(profile)} · ชนะ ${profile.wins} ครั้ง`;
    if(!battle&&profile.characterCreated){const avatar=document.querySelector('.player-avatar');if(avatar){let portrait=avatar.querySelector('img');if(!portrait){avatar.querySelector('.portrait')?.remove();portrait=document.createElement('img');portrait.className='custom-portrait';portrait.alt='ตัวละครของคุณ';avatar.prepend(portrait);}portrait.src=NativeCharacter.uri(G.appearance(profile));}}
    if(!battle){const menuArt={collection:'robe',bag:'treasure_chest',shop:'gold',forge:'enhancement_stone',pvp:'talisman'};document.querySelectorAll('.nav-item[data-panel]').forEach(button=>{const id=menuArt[button.dataset.panel],slot=button.querySelector('span');if(id&&slot)slot.innerHTML=NativeUI.icon(id)+(button.dataset.panel==='bag'?'<i id="bag-count">'+profile.owned.length+'</i>':'');});const coin=document.querySelector('.coin-icon'),stone=document.querySelector('.ticket-icon');if(coin)coin.innerHTML=NativeUI.icon('gold');if(stone)stone.innerHTML=NativeUI.icon('enhancement_stone');}
    document.dispatchEvent(new CustomEvent('native-profile',{detail:profile}));
  }
  function chat(entry){const line=document.createElement('p'),name=document.createElement('b'),text=document.createElement('span');name.textContent=entry.name+' ';text.textContent=entry.text;line.append(name,text);$('chat-lines').append(line);while($('chat-lines').children.length>40)$('chat-lines').firstElementChild.remove();$('chat-lines').scrollTop=$('chat-lines').scrollHeight;}
  async function connect(){
    try{const response=await fetch('/api/profile');if(!response.ok)throw Error();profile=await response.json();update();socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/socket`);
      socket.onopen=()=>{if(activePanel)show(activePanel);$('connection').textContent='● เชื่อมต่อแล้ว';$('connection').className='connected';};
      socket.onmessage=event=>{const msg=JSON.parse(event.data);
        if(msg.type==='hello'){profile=msg.profile;update();$('chat-lines').replaceChildren();msg.chat.forEach(chat);$('online-count').textContent=msg.online;if(!battle&&profile.characterCreated===false&&!activePanel)show('summon');}
        if(msg.type==='presence')$('online-count').textContent=msg.online;
        if(msg.type==='chat')chat(msg.entry);
        if(msg.type==='profile'){const justCreated=msg.message==='บันทึกตัวละครแล้ว'&&!profile.characterCreated;pending=false;profile=msg.profile;if(msg.message==='บันทึกตัวละครแล้ว'){uiState.appearance=G.appearance(profile);uiState.name=profile.name;}$('close-dialog')?.removeAttribute('disabled');update();toast(msg.message);if(msg.message.startsWith('ตีบวกสำเร็จ'))window.NativeAudio?.play('forge');else window.ThaiNativeSounds?.play('purchase');if(justCreated){$('npc-dialog')?.close();activePanel=null;}else if(activePanel)show(activePanel);}
        if(msg.type==='error'){pending=false;toast(msg.message);if(activePanel)show(activePanel);}
        if(msg.type==='queue'){queued=msg.mode;if(queued)show('queue');else{queued=null;show('adventure');}}
        if(msg.type==='room'||msg.type==='shot'){room=msg.room;queued=null;if(!battle){location.href='battle.html';return;}document.dispatchEvent(new CustomEvent('native-room',{detail:msg}));}
        if(msg.type==='reward'){profile=msg.profile;update();document.dispatchEvent(new CustomEvent('native-reward',{detail:msg}));}
        if(msg.type==='left')location.href='./';
      };
      socket.onclose=event=>{pending=false;if(activePanel)show(activePanel);$('connection').textContent=event.code===4001?'เปิดอยู่ในอีกแท็บ':'● ขาดการเชื่อมต่อ';$('connection').className='disconnected';document.dispatchEvent(new Event('native-offline'));if(event.code!==4001&&!closed)reconnect=setTimeout(connect,2500);};
      socket.onerror=()=>{};
    }catch{$('connection').textContent='● รอเซิร์ฟเวอร์';toast('ยังเชื่อมต่อไม่ได้ กำลังลองใหม่…');if(!closed)reconnect=setTimeout(connect,5000);}
  }
  const equipped=g=>profile.equipment[g.slot]===g.id;
  function show(panel){if(battle)return;if(!profile){toast('กำลังโหลดข้อมูลตัวละคร…');return;}if(activePanel!==panel){uiState.filter='all';uiState.selected=null;uiState.outfit=null;uiState.appearance=G.appearance(profile);uiState.name=profile.name;}activePanel=panel;
    $('npc-dialog').dataset.screen=panel;const body=$('dialog-body');let title='',subtitle='',html='';
    const state={...uiState,pending:pending||socket?.readyState!==WebSocket.OPEN};
    if(['collection','bag','shop'].includes(panel)){title={collection:'อุปกรณ์สวมใส่',bag:'กระเป๋านักเดินทาง',shop:'ร้านของวิเศษ · ลุงบุญ'}[panel];subtitle='เลือกไอเทมเพื่อเปรียบเทียบกับอุปกรณ์ที่สวมใส่';html=NativeUI.inventory(panel,profile,state);}
    if(panel==='forge'){title='โรงตีอาคม';subtitle='เพิ่มพลังอาวุธด้วยหินแห่งจันทรา';html=NativeUI.forge(profile,state);}
    if(panel==='summon'){title=profile.characterCreated?'ศาลแปลงโฉม · แม่หมอม่วง':'สร้างนักเดินทางของคุณ';subtitle='ชาย · หญิง · ชุด · ใบหน้า · ทรงผม · สีสันที่เป็นคุณ';html=NativeCharacter.editor(profile,state);}
    if(panel==='adventure'){title='เลือกการเดินทาง';subtitle='เล็งมุม · ปรับแรง · อ่านทิศลม · ผูกพลังภูติ';html=`<div class="mode-tabs"><button class="selected" data-panel="adventure">เล่นคนเดียว</button><button data-panel="coop">ดันเจี้ยนทีม</button><button data-panel="pvp">PvP ออนไลน์</button></div><div class="dungeon-list">${G.stages.map((s,i)=>`<article class="dungeon-card"><span class="chapter">0${i+1}</span><div><small>${s.subtitle}</small><h3>${s.name} ${profile.cleared.includes(s.id)?'<span class="cleared">✓ ผ่านแล้ว</span>':''}</h3><p>รางวัลชนะ ◉ ${s.gold} · ◆ ${s.stones} · EXP ${s.xp}</p></div><button class="gold-button" data-play="solo" data-stage="${s.id}">เข้าสู่ด่าน →</button></article>`).join('')}</div><p class="demo-note">แพ้ยังได้รับรางวัลเล็กน้อย · ไม่มีพลังงานจำกัดการเล่น</p>`;}
    if(panel==='coop'||panel==='pvp'){const pvp=panel==='pvp';title=pvp?'ลานประลองจันทรา':'ร่วมทีมพิทักษ์ศาล';subtitle=pvp?'PvP 1 vs 1 · จับคู่ผู้เล่นจริง':'ดันเจี้ยน 2 ผู้เล่น · ต่อสู้กับผู้เฝ้าศาล 2 ตัว';html=`<div class="match-intro"><div class="match-symbol">${pvp?'⚔':'♧'}</div><h3>${pvp?'อ่านลมให้ขาด แล้ววัดกันที่ฝีมือ':'รวมพลังกับนักเดินทางอีกหนึ่งคน'}</h3><p>${pvp?'พลังชีวิต 300 / โจมตี 58 เท่ากันทั้งสองฝ่าย<br>อุปกรณ์และตีบวกไม่เพิ่มค่าพลังในโหมดนี้':'ใช้อุปกรณ์และค่าตีบวกของคุณจริง<br>รับรางวัลเมื่อทีมปราบผู้เฝ้าศาลได้'}</p><button class="gold-button" data-play="${panel}" data-stage="shrine">${pvp?'ค้นหาคู่ต่อสู้':'ค้นหาเพื่อนร่วมทีม'}</button><p class="demo-note">ต้องมีอีกคนเข้าคิวโหมดเดียวกัน ไม่มีบอตเติมคิว<br>ทดลองสองคนบนเครื่องนี้: เปิดอีกเบราว์เซอร์หรือหน้าต่างไม่ระบุตัวตน</p></div>`;}
    if(panel==='queue'){title=queued==='pvp'?'กำลังค้นหาคู่ต่อสู้':'กำลังค้นหาเพื่อนร่วมทีม';subtitle='เชื่อมต่อกับผู้เล่นจริงผ่านเซิร์ฟเวอร์';html='<div class="match-intro"><div class="queue-orbit">✦</div><h3>รอนักเดินทางอีกหนึ่งคน…</h3><p>ให้อีกคนเลือกโหมดเดียวกัน แล้วเกมจะเริ่มอัตโนมัติ</p><button class="small-button" id="cancel-queue">ยกเลิกการค้นหา</button></div>';}
    if(panel==='help'){title='บันทึกนักเดินทาง';subtitle='ThaiNative · Online RPG playable alpha';html=`<div class="help-copy"><p><b>การต่อสู้:</b> ผลัดตายิงวิถีโค้ง ตั้งมุม 10–85° และแรง 15–100 อ่านลมด้านบน ยิงใกล้ศัตรูเพื่อสร้างความเสียหาย เปลี่ยนทิศยิงได้</p><p><b>การเติบโต:</b> ชนะด่านรับเหรียญและหิน ซื้ออุปกรณ์ ตีบวกอาวุธ และปลดล็อกชุด</p><p><b>ออนไลน์:</b> แชท ดันเจี้ยนทีม และ PvP เชื่อมต่อเซิร์ฟเวอร์จริง ผู้เล่นสองคนต้องใช้คนละเบราว์เซอร์หรือหน้าต่างส่วนตัว</p><p><b>บัญชี Guest:</b> บันทึกที่เซิร์ฟเวอร์และจำด้วยคุกกี้ ล้างคุกกี้แล้วจะเข้าสู่ตัวละครใหม่ รุ่นนี้ยังไม่มีระบบล็อกอินหรือกู้บัญชี</p><label>ชื่อนักเดินทาง<input id="rename-input" maxlength="18" value="${escape(profile.name)}"></label><button class="small-button" id="rename-save">บันทึกชื่อ</button></div>`;}
    $('dialog-title').textContent=title;$('dialog-subtitle').textContent=subtitle;const focus=document.activeElement,focusKey=focus?.dataset?.appearanceKey?`[data-appearance-key="${focus.dataset.appearanceKey}"][data-appearance-value="${focus.dataset.appearanceValue}"]`:focus?.dataset?.selectItem?`[data-select-item="${focus.dataset.selectItem}"]`:focus?.dataset?.itemFilter?`[data-item-filter="${focus.dataset.itemFilter}"]`:focus?.dataset?.outfitPreview?`[data-outfit-preview="${focus.dataset.outfitPreview}"]`:null;
    body.innerHTML=html;$('panel-message').textContent=pending?'กำลังบันทึกการเปลี่ยนแปลง…':'';
    $('npc-dialog').setAttribute('aria-busy',String(pending));$('close-dialog').disabled=pending;if(!$('npc-dialog').open){panelTrigger=document.activeElement;$('npc-dialog').showModal();}else if(focusKey)body.querySelector(focusKey)?.focus({preventScroll:true});
  }
  document.addEventListener('click',event=>{
    const choice=event.target.closest('[data-appearance-key]');if(choice&&!choice.disabled&&!pending){uiState.appearance[choice.dataset.appearanceKey]=choice.dataset.appearanceValue;show('summon');}
    if(event.target.closest('#character-reset')&&!pending){uiState.appearance=G.appearance(profile);uiState.name=profile.name;show('summon');}
    const panel=event.target.closest('[data-panel]');if(panel){if(queued&&panel.dataset.panel!=='queue'){toast('ยกเลิกการค้นหาก่อนเปลี่ยนเมนู');return;}show(panel.dataset.panel);}
    const filter=event.target.closest('[data-item-filter]');if(filter){uiState.filter=filter.dataset.itemFilter;uiState.selected=null;show(activePanel);}
    const selection=event.target.closest('[data-select-item]');if(selection){uiState.selected=selection.dataset.selectItem;if(uiState.filter!=='all'&&G.item(uiState.selected)?.slot!==uiState.filter)uiState.filter='all';show(activePanel);}
    const preview=event.target.closest('[data-outfit-preview]');if(preview){uiState.outfit=preview.dataset.outfitPreview;show(activePanel);}
    const action=event.target.closest('[data-action]');if(action&&!action.disabled&&!pending){if(send({type:'inventory',action:action.dataset.action,id:action.dataset.id})){pending=true;show(activePanel);}}
    const play=event.target.closest('[data-play]');if(play&&!play.disabled&&send({type:'play',mode:play.dataset.play,stage:play.dataset.stage}))play.disabled=true;
    if(event.target.closest('#cancel-queue'))send({type:'cancel'});
    if(event.target.closest('#rename-save'))send({type:'name',name:$('rename-input').value});
  });
  $('npc-dialog')?.addEventListener('close',()=>{activePanel=null;panelTrigger?.focus({preventScroll:true});});
  $('close-dialog')?.addEventListener('click',()=>{$('npc-dialog').close();activePanel=null;if(queued)send({type:'cancel'});});
  $('npc-dialog')?.addEventListener('cancel',e=>{if(pending){e.preventDefault();return;}activePanel=null;if(queued)send({type:'cancel'});});
  document.addEventListener('input',event=>{if(activePanel!=='summon'||pending)return;const input=event.target,key=input.dataset.characterColor;if(key){uiState.appearance[key]=input.value;$('character-preview').src=NativeCharacter.uri(uiState.appearance);document.querySelector(`[data-color-code="${key}"]`).textContent=input.value.toUpperCase();}if(input.id==='character-name'){uiState.name=input.value;document.querySelector('.creator-name').textContent=input.value;}});
  document.addEventListener('submit',event=>{if(event.target.id!=='character-form')return;event.preventDefault();if(pending)return;if(send({type:'character',name:uiState.name,appearance:uiState.appearance})){pending=true;show('summon');}});
  $('chat-form').addEventListener('submit',e=>{e.preventDefault();const input=$('chat-input');if(input.value.trim()&&send({type:'chat',text:input.value}))input.value='';});
  window.NativeClient={send,toast,get profile(){return profile;},get room(){return room;},get connected(){return socket?.readyState===WebSocket.OPEN;}};
  window.addEventListener('pagehide',()=>{closed=true;clearTimeout(reconnect);socket?.close();});
  connect();
})();
