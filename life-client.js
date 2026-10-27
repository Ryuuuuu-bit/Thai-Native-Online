(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n => Number(n).toLocaleString('th-TH');
  const key = 'thainative-life-demo-v1';
  let game = null, selected = 'home', gender = 'female', career = 'office', toastTimer, saveFailed = false;
  let inside=false, walking=false, walkAnimation=null, walkGeneration=0;
  let mode='solo', party=null, room=null, queued=false, onlineSocket=null, onlineReady=false, pending=null, reconnectTimer=null, screen='play';
  const partyKey='thainative-life-party-v1', tokenKey='thainative-life-online-token', activeKey='thainative-life-online-active';
  function save() { try { if(mode==='party')localStorage.setItem(partyKey, JSON.stringify(party));else if(mode==='solo')localStorage.setItem(key, JSON.stringify({game, gender}));saveFailed=false; } catch { saveFailed=true; } }
  function validGame(g){return !!g&&typeof g.name==='string'&&Life.goals.some(x=>x.id===g.goal)&&Life.locations.some(x=>x.id===g.location)&&Array.isArray(g.history)&&['week','hours','money','energy','happiness','skill','fame','collection'].every(k=>Number.isFinite(g[k]))&&Number.isInteger(g.week)&&g.week>=1&&g.week<=20&&typeof g.finished==='boolean';}
  function savedParty(){try{const p=JSON.parse(localStorage.getItem(partyKey));return p&&Array.isArray(p.players)&&p.players.length>=2&&p.players.length<=4&&p.players.every(x=>typeof x.name==='string'&&typeof x.ai==='boolean'&&validGame(x.game))&&Number.isInteger(p.active)&&p.active>=0&&p.active<p.players.length&&Number.isInteger(p.week)&&p.week>=1&&p.week<=20&&typeof p.finished==='boolean'&&Array.isArray(p.log)?p:null;}catch{return null;}}
  function syncParty(keepInside=false){game=party.players[party.active].game;gender=party.players[party.active].gender==='male'?'male':'female';selected=game.location;if(!keepInside)inside=false;}
  function sessionGet(k){try{return sessionStorage.getItem(k)}catch{return null}}
  function sessionSet(k,v){try{sessionStorage.setItem(k,v)}catch{}}
  function sessionRemove(k){try{sessionStorage.removeItem(k)}catch{}}
  function sendOnline(message){if(!onlineReady||!onlineSocket||onlineSocket.readyState!==1){notify('กำลังเชื่อมต่อ กรุณารอสักครู่');return false;}onlineSocket.send(JSON.stringify(message));return true;}
  function connectOnline(){
    if(typeof WebSocket!=='function'){notify('เบราว์เซอร์นี้ไม่รองรับการเชื่อมต่อ');return;}
    clearTimeout(reconnectTimer);onlineReady=false;
    const ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/life-socket');onlineSocket=ws;
    ws.onopen=()=>{const token=sessionGet(tokenKey);ws.send(JSON.stringify({type:'hello',...(token?{token}:{})}));};
    ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return;}
      if(m.type==='welcome'){const old=sessionGet(tokenKey);onlineReady=true;sessionSet(tokenKey,m.token);if(old&&m.resumed===false){room=null;game=null;sessionRemove(activeKey);notify('ห้องเดิมหมดเวลาแล้ว กรุณาเข้าห้องใหม่');render();}if(!room&&!pending&&typeof m.queued==='boolean'){queued=m.queued;if(queued)sessionSet(activeKey,'yes');else sessionRemove(activeKey);render();}if(pending){const command=pending;pending=null;sendOnline(command);}return;}
      if(m.type==='state'){const oldTurn=room?.current;room=m.room;queued=false;sessionSet(activeKey,'yes');const own=room.players?.find(p=>p.id===room.self);if(own?.game){game=own.game;gender=own.gender==='male'?'male':'female';if(oldTurn!==room.current){inside=false;selected=game.location;}}screen='online';render();return;}
      if(m.type==='queue'){queued=!!m.queued;if(queued)sessionSet(activeKey,'yes');else if(!room)sessionRemove(activeKey);if(screen==='online')render();return;}
      if(m.type==='error'){notify(m.message||'เกิดข้อผิดพลาด');return;}
      if(m.type==='left'){room=null;queued=false;sessionRemove(activeKey);screen='modes';mode='solo';ws.onclose=null;ws.close();onlineSocket=null;onlineReady=false;render();}
    };
    ws.onclose=()=>{if(onlineSocket!==ws)return;onlineReady=false;if(mode==='online'){if(queued){queued=false;sessionRemove(activeKey);notify('การเชื่อมต่อหลุด ค้นหาคู่ใหม่อีกครั้ง');}else notify('การเชื่อมต่อหลุด กำลังเชื่อมต่อใหม่');render();reconnectTimer=setTimeout(connectOnline,2000);}};
    ws.onerror=()=>{};
  }
  function openOnline(command){if(!onlineSocket||onlineSocket.readyState>1){pending=command;connectOnline();}else if(onlineReady)sendOnline(command);else pending=command;}
  function onlineLeave(){pending=null;if(onlineReady){sendOnline({type:'leave'});return;}clearTimeout(reconnectTimer);if(onlineSocket){onlineSocket.onclose=null;onlineSocket.close();}onlineSocket=null;onlineReady=false;room=null;queued=false;sessionRemove(activeKey);mode='solo';screen='modes';render();}
  function modeScreen(){const saved=savedParty();$('app').innerHTML=`<div class="app-shell"><section class="panel mode-screen"><span class="eyebrow">PLAY TOGETHER</span><h1>อยากใช้ชีวิตแบบไหน?</h1><p>เกมที่เล่นเดี่ยวอยู่จะยังบันทึกไว้ในเบราว์เซอร์นี้</p><div class="mode-list"><button class="choice" data-mode="solo">🌿 เล่นคนเดียว<small>สานต่อชีวิตเดิม หรือเริ่มเรื่องราวของคุณ</small></button><button class="choice" data-mode="ai">🤖 เล่นกับ AI<small>ร่วมทีมกับเพื่อน AI ในเครื่องนี้</small></button><button class="choice" data-mode="local">🛋 เล่นหลายคนในเครื่อง<small>ผลัดกันเล่น 2–4 คนบนอุปกรณ์เดียว</small></button><button class="choice" data-mode="online">🌐 เล่นกับเพื่อนออนไลน์<small>สร้างห้องด้วยรหัส หรือค้นหาคู่</small></button></div>${saved?'<button class="button secondary" id="party-resume">เล่นเกมในเครื่องต่อ →</button>':''}<p class="tip">Co-op: ผ่าน 20 สัปดาห์ด้วยเงินรวมไม่ติดลบ และทุกคนมีพลังอย่างน้อย 30 · กระเป๋าเงินแยกกัน</p></section></div>`;}
  function playerFields(n,optional=false){return `<div class="party-player"><div class="party-portrait" id="party-avatar-${n}" aria-hidden="true">${avatar('female',Life.careers[0]?.id)}</div><label>ผู้เล่น ${n}${optional?' (เว้นว่างได้)':''}<input id="party-name-${n}" maxlength="20" placeholder="ชื่อผู้เล่น ${n}" ${optional?'':'required'}></label><label>บทบาท<select id="party-career-${n}">${Life.careers.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label><label>ตัวละคร<select id="party-gender-${n}"><option value="female">ผู้หญิง</option><option value="male">ผู้ชาย</option></select></label></div>`;}
  function partySetup(){const ai=screen==='ai';$('app').innerHTML=`<div class="app-shell"><section class="panel mode-screen"><button class="button secondary" id="back-modes">← เลือกโหมด</button><h1>${ai?'เล่นกับ AI':'เล่นหลายคนในเครื่อง'}</h1><p>${ai?'ผู้เล่น 2 คือเพื่อน AI เลือกชื่อและบทบาทได้':'ผลัดกันเล่น 2–4 คนบนอุปกรณ์เดียว'} · ทุกคนมีกระเป๋าเงินของตัวเอง</p><p class="tip">ผ่าน 20 สัปดาห์ด้วยเงินรวมไม่ติดลบ และทุกคนมีพลังอย่างน้อย 30</p><form id="party-form">${playerFields(1)}${playerFields(2)}${ai?'':playerFields(3,true)+playerFields(4,true)}<button class="button primary">เริ่มผจญภัยด้วยกัน →</button></form><p class="setup-foot">เกมในเครื่องบันทึกแยกจากเกมเดี่ยวในเบราว์เซอร์นี้</p></section></div>`;}
  function onlineSetup(){
    if(room?.phase==='lobby'){const host=room.host===room.self;$('app').innerHTML=`<div class="app-shell"><section class="panel mode-screen"><span class="eyebrow">ONLINE CO-OP</span><h1>ห้องเพื่อนร่วมทาง</h1><p>รหัสห้อง <strong class="room-code">${esc(room.code)}</strong></p><p>ส่งรหัสนี้ให้เพื่อน · รองรับ 2–4 คน</p><div class="room-players">${room.players.map(p=>`<div>👤 ${esc(p.name)} ${p.id===room.host?'· หัวหน้าห้อง':''} ${p.connected?'':'· กำลังเชื่อมต่อ'}</div>`).join('')}</div>${host?`<button id="online-start" class="button primary" ${room.players.length<2||!onlineReady?'disabled':''}>เริ่มเกมด้วยกัน →</button>`:'<p>รอหัวหน้าห้องเริ่มเกม…</p>'}<button class="button secondary" id="online-leave">ออกจากห้อง</button></section></div>`;return;}
    if(queued){$('app').innerHTML=`<div class="app-shell"><section class="panel mode-screen"><h1>กำลังค้นหาเพื่อนร่วมทีม…</h1><p>จับคู่ผู้เล่น 2 คน · ไม่ต้องเปิดหน้านี้ทิ้งเมื่อยกเลิก</p><button class="button secondary" id="online-cancel">ยกเลิกการค้นหา</button></section></div>`;return;}
    $('app').innerHTML=`<div class="app-shell"><section class="panel mode-screen"><button class="button secondary" id="online-back">← เลือกโหมด</button><span class="eyebrow">ONLINE CO-OP</span><h1>ชวนเพื่อนมาใช้ชีวิตติดกรุง</h1><p>ผลัดกันเล่นครบ 20 สัปดาห์ · เงินแยกกัน แต่ชัยชนะเป็นของทีม</p><div class="online-portrait" id="online-avatar" aria-hidden="true">${avatar('female',Life.careers[0]?.id)}</div><label>ชื่อของคุณ<input id="online-name" maxlength="20" value="ชาวกรุง"></label><label>อาชีพหรือจุดเริ่มต้น<select id="online-career">${Life.careers.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label><label>ตัวละคร<select id="online-gender"><option value="female">ผู้หญิง</option><option value="male">ผู้ชาย</option></select></label><div class="button-row"><button class="button primary" id="online-create">สร้างห้อง</button><button class="button secondary" id="online-match">ค้นหาคู่</button></div><label>รหัสห้อง<input id="online-code" maxlength="6" placeholder="กรอกรหัสจากเพื่อน" autocomplete="off"></label><button class="button secondary" id="online-join">เข้าห้องด้วยรหัส</button><p class="tip">เกมออนไลน์ยังไม่บันทึกข้ามอุปกรณ์ หากหลุดสามารถกลับมาในแท็บเดิมภายใน 60 วินาที</p></section></div>`;
  }
  function teamPlayers(){return mode==='party'?party?.players||[]:room?.players||[];}
  function teamBanner(){const players=teamPlayers(),current=mode==='party'?party?.active:players.findIndex(p=>p.id===room?.current),week=mode==='party'?party?.week:players.find(p=>p.id===room?.current)?.game?.week||game?.week,can=mode==='party'||(onlineReady&&room?.self===room?.current);return `<section class="panel team-banner"><div><b>${mode==='party'?'🛋 เกมในเครื่อง':'🌐 ห้อง '+esc(room?.code||'')}</b> · สัปดาห์ทีม ${week||1}/20<br><small>${can?'ถึงตาของคุณ':'รอ '+esc(players[current]?.name||'เพื่อน')+' เล่น'}</small></div><div class="team-members">${players.map((p,i)=>`<span class="${i===current?'current':''}"><span class="team-portrait" aria-hidden="true">${avatar(p.gender,p.game?.career||p.career)}</span>${esc(p.name)}${p.ai?' 🤖':''} · ${money(p.game?.money||0)} ฿ · ⚡ ${p.game?.energy??'–'}${p.connected===false?' · หลุด':''}</span>`).join('')}</div><small>เป้าหมายทีม: เงินรวมไม่ติดลบ และทุกคนมีพลังอย่างน้อย 30 เมื่อครบ 20 สัปดาห์</small>${mode==='online'&&room?.objective?.teamIntact===false?'<p class="team-warning" role="status">สมาชิกออกจากเกม ทีมจึงไม่สามารถชนะรอบนี้ได้</p>':''}</section>`;}
  function teamResult(){const players=teamPlayers();const result=mode==='party'?LifeParty.score(party):room?.objective;const success=!!result?.success;$('app').innerHTML=`<div class="app-shell"><section class="result panel"><span class="eyebrow">CO-OP COMPLETE</span><div class="trophy">${success?'🏆':'🌈'}</div><h1>${success?'ทีมของคุณทำสำเร็จ!':'ชีวิตในกรุงยังมีเรื่องให้ลุ้น'}</h1><p>ผ่าน 20 สัปดาห์ด้วยกัน · เงินรวมไม่ติดลบและทุกคนมีพลังอย่างน้อย 30</p>${mode==='online'&&room?.objective?.teamIntact===false?'<p class="team-warning">สมาชิกออกจากเกม ทีมจึงไม่สามารถชนะรอบนี้ได้</p>':''}<div class="room-players">${players.map(p=>`<div>${esc(p.name)}${p.ai?' 🤖':''} · ${money(p.game?.money||0)} ฿ · ⚡ ${p.game?.energy??0}</div>`).join('')}</div><button class="button primary" id="team-finish">กลับเมนูโหมด →</button></section></div>`;}

  function readSave() {
    try {
      const s = JSON.parse(localStorage.getItem(key));
      const g = s?.game;
      if (!validGame(g)) return;
      game = g; gender = s.gender === 'male' ? 'male' : 'female'; selected = g.location;
    } catch {}
  }
  function notify(message) { const el=$('toast'); el.textContent=message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('visible'),3500); }
  const careerArt=['unhoused','office','minimart','sales','rider','creator','student'];
  const careerWalkSheets=new Map();
  function preloadCareerWalk(id) {
    if(typeof Image!=='function'||!careerArt.includes(id)||careerWalkSheets.has(id))return;
    careerWalkSheets.set(id,'loading');
    const sheet=new Image();
    sheet.onload=()=>careerWalkSheets.set(id,'ready');
    sheet.onerror=()=>careerWalkSheets.set(id,'failed');
    sheet.src=`assets/career-walk-${id}.png`;
  }
  function avatar(type, role) {
    type=type==='male'?'male':'female';
    const idx=careerArt.indexOf(role);
    const careerAttrs=idx<0?'':` data-avatar-career="${careerArt[idx]}" data-avatar-gender="${type}" style="--career-x:${(idx%4)*100/3}%;--career-y:${Math.floor(idx/4)*100}%"`;
    const hair=type==='male'?'#554658':'#6d435f', coat=type==='male'?'#69aeb0':'#e98f9b';
    return `<span class="chibi-avatar portrait ${type}${idx<0?'':' career-portrait'}"${careerAttrs} aria-hidden="true"><svg viewBox="0 0 80 80"><ellipse cx="40" cy="76" rx="23" ry="3" fill="#70545b" opacity=".17"/><path d="M21 72c1-14 8-20 19-20s18 6 19 20" fill="${coat}" stroke="#614653" stroke-width="3"/><path d="M34 54l6 8 6-8" fill="#fff6dc" stroke="#614653" stroke-width="2"/><path d="M17 34C15 17 25 7 40 7s25 10 23 27l-2 15c-3 9-10 12-21 12S20 58 19 49z" fill="${hair}" stroke="#614653" stroke-width="3"/><ellipse cx="40" cy="37" rx="21" ry="22" fill="#ffe4c4" stroke="#614653" stroke-width="2.5"/><path d="M18 34C17 18 26 9 40 9c12 0 21 8 22 22-10-2-15-8-19-14-6 11-14 16-25 17z" fill="${hair}" stroke="#614653" stroke-width="2.5"/><path d="M26 25q4 2 7-2M47 19q3 5 8 6" fill="none" stroke="#ad8290" stroke-width="2" stroke-linecap="round"/><ellipse cx="31" cy="39" rx="3" ry="4.5" fill="#4e3d50"/><ellipse cx="49" cy="39" rx="3" ry="4.5" fill="#4e3d50"/><circle cx="32" cy="37.5" r="1" fill="white"/><circle cx="50" cy="37.5" r="1" fill="white"/><ellipse cx="24" cy="45" rx="4" ry="2" fill="#ef9b98" opacity=".65"/><ellipse cx="56" cy="45" rx="4" ry="2" fill="#ef9b98" opacity=".65"/><path d="M36 47q4 4 8 0" fill="none" stroke="#a75b62" stroke-width="2" stroke-linecap="round"/>${type==='female'?'<path d="M53 12l4-4 2 5 5 2-4 3-1 5-4-4-5-1z" fill="#ffd47a" stroke="#8c5960" stroke-width="1.5"/>':''}</svg></span>`;
  }
  function careerDetails() {
    const c=Life.careers.find(x=>x.id===career) || Life.careers[0];
    const g=Life.goals.find(x=>x.id===c.goal);
    return `<div class="career-summary"><div class="career-preview" aria-hidden="true">${avatar(gender,c.id)}</div><b>${esc(c.icon)} ${esc(c.name)}</b><span class="career-good">✦ ข้อดี: ${esc(c.good)}</span><span class="career-bad">◈ ข้อเสีย: ${esc(c.bad)}</span><small>เป้าหมาย: ${esc(g?.name||'')} · ${esc(g?.description||'')}</small></div>`;
  }
  function selectCareer(id) {
    if(!Life.careers.some(c=>c.id===id))return;
    career=id;
    document.querySelectorAll('[data-career]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.career===career)));
    $('career-detail').innerHTML=careerDetails();
    document.querySelectorAll('[data-gender]').forEach(b=>{const portrait=b.querySelector('.chibi-avatar');if(portrait)portrait.outerHTML=avatar(b.dataset.gender,career);});
  }
  function startScreen() {
    $('app').innerHTML=`<div class="app-shell"><section class="setup panel"><div class="setup-visual"><div class="setup-copy"><span class="setup-sticker">✦ WELCOME TO BANGKOK ✦</span><h1>ชีวิตติดกรุง<br>ยุ่งนิด ๆ แต่น่ารัก!</h1><p>รถติด ฝนตก เงินใกล้หมด... แต่ความฝันยังเต็มร้อย! มาลองใช้ชีวิตในกรุงเทพฉบับ Chibi ด้วยกัน</p></div></div><div class="setup-form"><span class="eyebrow">YOUR NEW LIFE STARTS HERE</span><h2>สร้างชาวกรุงของคุณ ✿</h2><p>เลือกตัวละครและอาชีพหรือจุดเริ่มต้น แล้วมาดูกันว่า 20 สัปดาห์นี้ชีวิตจะพาเราไปทางไหน</p><form id="start-form"><label class="field-label" for="player-name">ชาวกรุงคนนี้ชื่ออะไร?</label><input class="name-input" id="player-name" maxlength="20" autocomplete="nickname" placeholder="ตั้งชื่อเล่นของคุณ" value="ชาวกรุง"><span class="field-label">เลือกตัวละคร</span><div class="choice-row">${[['female','ผู้หญิง'],['male','ผู้ชาย']].map(([id,name])=>`<button type="button" class="choice character-choice" data-gender="${id}" aria-pressed="${gender===id}">${avatar(id,career)}<span>${name}</span></button>`).join('')}</div><span class="field-label">เลือกอาชีพหรือจุดเริ่มต้น</span><div class="choice-row career-options" role="group" aria-label="เลือกอาชีพหรือจุดเริ่มต้น">${Life.careers.map(c=>`<button type="button" class="choice career-choice" data-career="${esc(c.id)}" aria-pressed="${career===c.id}"><i aria-hidden="true">${esc(c.icon)}</i> ${esc(c.name)}</button>`).join('')}</div><button type="button" class="button secondary career-random" id="random-career">🎲 สุ่มอาชีพฟรี</button><small class="career-hint">กดสุ่มได้หลายครั้ง หรือเลือกเองได้ ผลสุ่มจะแสดงก่อนเริ่มเกม</small><div id="career-detail" aria-live="polite">${careerDetails()}</div><button class="button primary" type="submit">เริ่มชีวิตติดกรุง →</button><button type="button" class="button secondary" id="setup-modes">เลือกโหมดเล่นกับเพื่อน</button></form><div class="setup-foot">เกมเดี่ยวบันทึกในเบราว์เซอร์นี้ · เลือกโหมดออนไลน์ได้จากเมนูโหมดเกม</div></div></section></div>`;
  }
  function costs(a) {
    const travel=game.location===a.location?0:2;
    const parts=[`⏱ ${a.hours+travel} ชม.${travel?' (รวมเดินทาง 2)':''}`];
    if(a.money)parts.push(`💰 ${a.money>0?'+':''}${money(a.money)} ฿`);
    if(a.energy)parts.push(`⚡ ${a.energy>0?'+':''}${a.energy}`);
    if(a.happiness)parts.push(`♥ ${a.happiness>0?'+':''}${a.happiness}`);
    if(a.skill)parts.push(`📚 +${a.skill}`);if(a.fame)parts.push(`⭐ +${a.fame}`);if(a.collection)parts.push(`🎀 +${a.collection}`);
    return parts.join(' · ');
  }
  function unavailable(a) {
    const travel=game.location===a.location?0:2;
    if(game.hours<a.hours+travel)return 'เวลาไม่พอ';
    if(a.money<0&&game.money< -a.money)return 'เงินไม่พอ';
    if(a.energy<0&&game.energy< -a.energy)return 'พลังไม่พอ';
    if(a.requiresSkill&&game.skill<a.requiresSkill)return `ต้องมีทักษะ ${a.requiresSkill}`;
    return '';
  }
  function locationName(location) { return game?.career==='unhoused' && location.id==='home' ? 'ที่พักชั่วคราว' : location.name; }
  const localHosts={
    home:['ป้านวล','พักให้เต็มที่นะ พรุ่งนี้เราค่อยลุยกันใหม่'],
    market:['เจ๊ดาว','หิวหรือยังจ๊ะ วันนี้มีของอร่อยเพียบ'],
    office:['พี่มิน','งานรออยู่ แต่แวะพักได้เสมอนะ'],
    school:['ครูต้น','อยากฝึกอะไรใหม่ ๆ เลือกเรียนได้เลย'],
    park:['ลุงสวน','นั่งพักรับลมกันก่อน เมืองยังรอเราอยู่'],
    night:['พี่จอย','คืนนี้มีเรื่องสนุกอีกเยอะเลยนะ'],
    temple:['คุณมาลี','ชมวิวริมน้ำแล้วค่อย ๆ เดินนะ'],
    swing:['พี่อิ่ม','แถวนี้ของอร่อยเยอะ เดินชมเมืองกันไหม'],
    victory:['พี่วิน','จะต่อรถหรือหางาน ลองดูแถวนี้ได้เลย'],
    arcade:['น้องจอย','พร้อมแข่งตู้เกมหรือมาช่วยที่ร้านดี'],
    fortune:['แม่หมอดาว','แวะฟังคำทำนายให้หัวใจสดใสกันไหม'],
    minimart:['พี่แสง','ยินดีต้อนรับ หิวเมื่อไรก็แวะมาได้']
  };
  function cancelWalk(){walkGeneration++;walking=false;if(walkAnimation){walkAnimation.cancel();walkAnimation=null;}const token=$('map-token');token?.classList?.remove('walking','ferry');if(token?.dataset)delete token.dataset.walkRole;const panel=$('place-actions');if(panel){panel.inert=false;panel.removeAttribute?.('aria-busy');}}
  function arrive(id,generation){if(generation!==walkGeneration)return;walkAnimation=null;selected=id;inside=true;render();$('interior-title')?.focus();}
  function walkTo(id){
    if(!game||!Life.locations.some(l=>l.id===id))return;
    if(inside){inside=false;render();}
    cancelWalk();const generation=walkGeneration, token=$('map-token');
    const route=typeof LifeMap==='object'?LifeMap.route(game.location,id):[];
    const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduced||!token||typeof token.animate!=='function'||route.length<2){arrive(id,generation);return;}
    const lengths=route.slice(1).map((p,i)=>Math.hypot(p.x-route[i].x,p.y-route[i].y));
    const total=lengths.reduce((a,b)=>a+b,0)||1, duration=Math.min(4800,Math.max(1000,total*34));
    let segment=1;walking=true;const panel=$('place-actions');if(panel){panel.inert=true;panel.setAttribute?.('aria-busy','true');}if(careerWalkSheets.get(game.career)==='ready'){token.dataset.walkRole=game.career;token.style.setProperty('--career-walk',`url("assets/career-walk-${game.career}.png")`);}token.classList.add('walking');
    function step(){
      if(generation!==walkGeneration)return;
      if(segment>=route.length){arrive(id,generation);return;}
      const from=route[segment-1],to=route[segment],ferry=to.mode==='ferry';
      token.classList.toggle('ferry',ferry);token.style.setProperty('--direction',to.x<from.x?'-1':'1');
      token.style.left=from.x+'%';token.style.top=from.y+'%';
      const status=$('travel-status');if(status)status.textContent=ferry?'กำลังข้ามแม่น้ำโดยเรือ':'กำลังเดินไป '+(Life.locations.find(l=>l.id===id)?.name||'สถานที่');
      walkAnimation=token.animate([{left:from.x+'%',top:from.y+'%'},{left:to.x+'%',top:to.y+'%'}],{duration:Math.max(70,duration*lengths[segment-1]/total),easing:'linear',fill:'forwards'});
      walkAnimation.onfinish=()=>{if(generation!==walkGeneration)return;token.style.left=to.x+'%';token.style.top=to.y+'%';walkAnimation.cancel();walkAnimation=null;segment++;step();};
    }
    step();
  }
  function mapScreen(location){
    const position=typeof LifeMap==='object'?(LifeMap.positions[game.location]||LifeMap.positions.home):{x:40,y:78};
    const [host,greeting]=localHosts[location.id]||['เพื่อนบ้าน','สวัสดี ยินดีต้อนรับนะ'];
    const index=Life.locations.findIndex(l=>l.id===location.id), col=index%3, row=Math.floor(index/3);
    const imagePosition=`${col*50}% ${row*100/3}%`;
    const pins=Life.locations.map(l=>{const pos=typeof LifeMap==='object'?LifeMap.positions[l.id]:null;return `<button class="map-pin ${l.id===selected?'active':''}" data-location="${esc(l.id)}" aria-label="${esc(locationName(l))}" aria-pressed="${l.id===selected}" ${pos?`style="left:${pos.x}%;top:${pos.y}%"`:''}><span class="pin-icon" aria-hidden="true">${l.icon}</span><span class="pin-name">${esc(locationName(l))}</span></button>`;}).join('');
    const directory=Life.locations.map(l=>`<button class="place-chip ${l.id===selected?'active':''}" data-location="${esc(l.id)}" aria-pressed="${l.id===selected}">${l.icon} ${esc(locationName(l))}</button>`).join('');
    return `<div class="map-scene ${inside?'inside':''}"><div class="map-art"><span class="scene-sign">✿ กรุงเทพฯ เมืองแห่งความเป็นไปได้</span><span id="map-token" class="map-token" style="left:${position.x}%;top:${position.y}%" aria-hidden="true"><span class="walking-sprite ${gender}">${avatar(gender,game.career)}</span>${Life.careers.find(c=>c.id===game.career)?`<span class="map-career-icon">${esc(Life.careers.find(c=>c.id===game.career).icon)}</span>`:''}</span><div class="map-pins">${pins}</div><span id="travel-status" class="travel-status" role="status"></span>${inside?`<section class="interior-view" aria-labelledby="interior-title"><div class="interior-art" style="background-position:${imagePosition}"></div><div class="interior-shade"></div><div class="interior-top"><span class="interior-kicker">✦ สำรวจสถานที่</span><button class="back-map" id="back-map">← กลับแผนที่</button></div><div class="interior-copy"><h2 id="interior-title" tabindex="-1">${esc(locationName(location))}</h2><div class="npc-dialog"><b>💬 ${esc(host)}</b><span>“${esc(greeting)}”</span></div><p>เลือกกิจกรรมด้านล่าง · เวลาเดินทางคิดเมื่อเริ่มกิจกรรม</p><a class="interior-action-link" href="#place-actions">ดูกิจกรรม ↓</a></div></section>`:''}</div></div><div class="place-directory" aria-label="เลือกสถานที่">${directory}</div>`;
  }
  function playScreen() {
    preloadCareerWalk(game.career);
    const location=Life.locations.find(x=>x.id===selected) || Life.locations[0];
    const current=Life.locations.find(x=>x.id===game.location);
    const goalData=Life.goals.find(x=>x.id===game.goal), careerData=Life.careers.find(x=>x.id===game.career);
    const progress=Life.score(game), mission=Life.mission(game);
    const actions=Life.actions.filter(x=>x.location===location.id);
    $('app').innerHTML=`<div class="app-shell"><div class="page-heading"><div><span class="eyebrow">WELCOME TO YOUR LITTLE BANGKOK</span><h1>วันนี้จะไปไหนดีนะ? ☀</h1><p>เลือกสถานที่และกิจกรรม แล้วใช้ชีวิตในแบบของคุณ</p></div><span class="week-tag">📅 ${mode==='solo'?'สัปดาห์':mode==='online'?'สัปดาห์ของคุณ':'สัปดาห์ของผู้เล่น'} ${game.week} / 20</span></div>${mode!=='solo'?teamBanner():''}<div class="game-grid"><section class="world-panel panel"><div class="map-top"><div><strong>🗺 แผนที่ชีวิตติดกรุง</strong><br><small>คลิกสถานที่เพื่อดูกิจกรรม</small></div><small>ตอนนี้อยู่: ${esc(current?locationName(current):'ที่พัก')}</small></div>${mapScreen(location)}<div class="map-foot"><span>💡 เปลี่ยนสถานที่เสียเวลาเดินทาง <b>2 ชั่วโมง</b></span><span>${mode==='solo'?'✦ เล่นคนเดียว':'✦ Co-op'}</span></div></section><aside class="side"><section class="player-card panel"><div class="player-head"><div class="avatar" aria-hidden="true">${avatar(gender,game.career)}</div><div><div class="player-name">${esc(game.name)}</div><div class="player-goal">${careerData?esc(careerData.icon)+' '+esc(careerData.name)+' · ':''}เป้าหมาย: ${esc(goalData?.name||'ชีวิตสมดุล')}</div></div><span class="week-pill">WEEK ${game.week}</span></div><div class="stats"><div class="stat"><small>เวลาคงเหลือ</small><b><i>⏱</i>${game.hours} ชม.</b></div><div class="stat"><small>เงินในกระเป๋า</small><b><i>💰</i>${money(game.money)} ฿</b></div><div class="stat"><small>พลังงาน</small><b><i>⚡</i>${game.energy}/100</b></div><div class="stat"><small>ความสุข</small><b><i>♥</i>${game.happiness}/100</b></div><div class="stat"><small>ทักษะ</small><b><i>📚</i>${game.skill}</b></div><div class="stat"><small>ชื่อเสียง · ของสะสม</small><b><i>⭐</i>${game.fame} · 🎀 ${game.collection}</b></div></div><p class="tip">🎯 ${esc(progress.breakdown)}</p>${careerData?`<details class="career-passives"><summary>✦ Passive ประจำตัว</summary><p>ข้อดี: ${esc(careerData.good)}</p><p>ข้อเสีย: ${esc(careerData.bad)}</p></details>`:''}<div class="mini-mission"><div class="mission-head"><b>📌 ${esc(mission.name)}</b><span>${mission.count}/${mission.target}</span></div><small>${esc(mission.description)}</small><progress value="${mission.count}" max="${mission.target}" aria-label="ความคืบหน้าภารกิจ"></progress><small>${mission.completed?'✓ รับรางวัล '+money(mission.reward)+' ฿ แล้ว':'รางวัล '+money(mission.reward)+' ฿ รับอัตโนมัติ'} · สัปดาห์ ${mission.cycle*3+1}–${mission.expiresWeek}</small></div></section><section class="action-card panel" id="place-actions"><div class="location-heading"><span class="location-icon">${location.icon}</span><div><h2>${esc(locationName(location))}</h2><p>${esc(game.career==='unhoused'&&location.id==='home'?'พักในที่พักชั่วคราวก่อนออกไปใช้ชีวิต':location.description)}</p></div></div><div class="action-list">${actions.map(base=>{const a=Life.actionFor(game,base.id);const reason=mode==='online'&&(!onlineReady||room?.current!==room?.self)?'รอเพื่อนเล่น':unavailable(a);return `<button class="action" data-action="${a.id}" ${reason?'disabled':''}><strong>${esc(a.name)}</strong><span>${esc(a.description)}</span><span class="action-cost">${esc(costs(a))}${reason?' · '+esc(reason):''}</span></button>`;}).join('')}</div><button class="button primary end-week" id="end-week" ${mode==='online'&&(!onlineReady||room?.current!==room?.self)?'disabled':''}>${mode==='solo'?'จบสัปดาห์':'จบตาของฉัน'} →</button><p class="tip">จบสัปดาห์จ่าย${game.career==='unhoused'?'ค่าที่พักชั่วคราว':'ค่าเช่า'} ${money(Life.weekCost(game))} ฿ และพบเหตุการณ์สุ่ม เงินติดลบได้ แต่ซื้อของเพิ่มไม่ได้จนกว่าจะหาเงินมาเติม</p></section></aside></div><section class="activity panel"><span class="activity-icon">💌</span><div class="activity-copy"><small>บันทึกชีวิตล่าสุด</small><p>${esc(game.history[0]||'เริ่มต้นชีวิตใหม่กลางกรุงเทพ!')}</p></div><button class="button secondary" id="restart">${mode==='solo'?'เริ่มใหม่':'กลับเมนูโหมด'}</button></section><p class="setup-foot">${mode==='online'?'ออนไลน์ · กลับมาในแท็บเดิมได้ภายใน 60 วินาทีหากการเชื่อมต่อหลุด':saveFailed?'⚠ บันทึกไม่สำเร็จ หากปิดหรือรีเฟรชหน้านี้ความคืบหน้าอาจหาย':mode==='party'?'เกมในเครื่องบันทึกในเบราว์เซอร์นี้':'เล่นคนเดียว · บันทึกในเบราว์เซอร์นี้อัตโนมัติ'}</p></div>`;
  }
  function resultScreen() {
    const result=Life.score(game); const g=Life.goals.find(x=>x.id===game.goal), c=Life.careers.find(x=>x.id===game.career);
    $('app').innerHTML=`<div class="app-shell"><section class="result panel"><span class="eyebrow">YOUR BANGKOK STORY</span><div class="trophy">${result.success?'🏆':'🌈'}</div><h1>${esc(result.title)}</h1><p>ครบ 20 สัปดาห์แล้ว! ${esc(game.name)} เดินทางมาถึงปลายทางของชีวิตติดกรุงในครั้งนี้</p><div class="result-score">${result.score}</div><span class="eyebrow">LIFE POINTS</span><p>${c?esc(c.icon)+' '+esc(c.name)+'<br>':''}เป้าหมาย: ${esc(g?.name||'ชีวิตสมดุล')}<br>${esc(result.breakdown)}</p><div class="result-grid"><div><small>เงินคงเหลือ</small><b>💰 ${money(game.money)} ฿</b></div><div><small>พลัง</small><b>⚡ ${game.energy}</b></div><div><small>ความสุข</small><b>♥ ${game.happiness}</b></div><div><small>ทักษะ</small><b>📚 ${game.skill}</b></div><div><small>ชื่อเสียง</small><b>⭐ ${game.fame}</b></div><div><small>ของสะสม</small><b>🎀 ${game.collection}</b></div></div><p>💌 ${esc(game.event)}</p><div class="result-actions"><button class="button primary" id="restart">เริ่มชีวิตใหม่อีกครั้ง →</button></div><p class="setup-foot">Demo เล่นคนเดียว · ข้อมูลอยู่ในเบราว์เซอร์นี้</p></section></div>`;
  }
  function render() {
    cancelWalk();
    if(screen==='modes'){inside=false;modeScreen();return;}
    if(screen==='ai'||screen==='local'){partySetup();return;}
    if(mode==='online'){if(!room||room.phase==='lobby'){onlineSetup();return;}if(room.phase==='finished'){teamResult();return;}}
    if(mode==='party'&&party?.finished){teamResult();return;}
    if(!game)startScreen();else if(game.finished&&mode==='solo')resultScreen();else playScreen();
  }
  document.addEventListener('click', e=>{
    let b=e.target.closest('button'); if(!b)return;
    if(b.id==='mode-menu'||b.id==='setup-modes'){if(mode==='online'&&room&&!confirm('ออกจากห้องออนไลน์หรือไม่?'))return;if(mode==='online'){onlineLeave();return;}screen='modes';render();return;}
    if(b.id==='back-modes'){screen='modes';render();return;}
    if(b.dataset.mode){const next=b.dataset.mode;if(next==='solo'){mode='solo';game=null;readSave();screen='play';render();}else if(next==='online'){mode='online';room=null;queued=false;screen='online';render();}else if(next==='ai'||next==='local'){mode='party';screen=next;render();}return;}
    if(b.id==='party-resume'){const saved=savedParty();if(!saved){notify('ไม่พบเกมที่บันทึกไว้');return;}party=saved;mode='party';screen='play';syncParty();render();return;}
    if(b.id==='online-back'||b.id==='online-leave'){onlineLeave();return;}
    if(b.id==='online-cancel'){if(!sendOnline({type:'cancel'})){queued=false;screen='online';render();}return;}
    if(b.id==='online-start'){sendOnline({type:'start'});return;}
    if(['online-create','online-join','online-match'].includes(b.id)){const name=$('online-name').value.trim(),gender=$('online-gender').value,career=$('online-career').value;if(!name){notify('กรุณาใส่ชื่อ');return;}const type=b.id.slice(7),code=type==='join'?$('online-code').value.trim().toUpperCase():undefined;if(type==='join'&&!/^[A-Z0-9]{6}$/.test(code)){notify('กรุณากรอกรหัสห้อง 6 ตัว');return;}openOnline({type,name,gender,career,...(code?{code}:{})});return;}
    if(b.id==='team-finish'){if(mode==='online')onlineLeave();else{try{localStorage.removeItem(partyKey)}catch{}party=null;screen='modes';render();}return;}
    if(b.dataset.gender){gender=b.dataset.gender;document.querySelectorAll('[data-gender]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('career-detail').innerHTML=careerDetails();return;}
    if(b.dataset.career){selectCareer(b.dataset.career);return;}
    if(b.id==='random-career'){selectCareer(Life.randomCareer().id);return;}
    if(b.dataset.location){walkTo(b.dataset.location);return;}
    if(b.id==='back-map'){inside=false;render();document.querySelector(`[data-location="${selected}"]`)?.focus();return;}
    if(b.dataset.action){if(walking){notify('รอให้เดินทางถึงก่อน');return;}if(mode==='online'){sendOnline({type:'act',id:b.dataset.action,revision:room?.revision});return;}const r=mode==='party'?LifeParty.act(party,b.dataset.action):Life.act(game,b.dataset.action);if(!r.ok){notify(r.error);return;}if(mode==='party'){party=r.state;syncParty(true);}else game=r.state;save();render();(document.querySelector(`[data-action="${b.dataset.action}"]:not(:disabled)`)||$('end-week'))?.focus();notify(r.message);return;}
    if(b.id==='end-week'){if(walking){notify('รอให้เดินทางถึงก่อน');return;}if(mode==='online'){sendOnline({type:'end',revision:room?.revision});return;}const r=mode==='party'?LifeParty.endTurn(party):Life.endWeek(game);if(!r.ok){notify(r.error);return;}if(mode==='party'){party=r.state;syncParty();}else game=r.state;save();render();$('end-week')?.focus();notify(r.message);return;}
    if(b.id==='restart'){if(mode==='online'){if(confirm('ออกจากห้องออนไลน์หรือไม่?'))onlineLeave();return;}if(mode==='party'){screen='modes';render();return;}if(confirm('เริ่มชีวิตใหม่? ความคืบหน้าของเกมนี้จะถูกลบ')){game=null;selected='home';try{localStorage.removeItem(key);}catch{}render();}return;}
    if(b.id==='help-button'){$('help-dialog').showModal();return;}
    if(b.id==='close-help'||b.id==='got-it')$('help-dialog').close();
  });
  document.addEventListener('change',e=>{
    const id=e.target?.id||'', match=/^party-(?:career|gender)-(\d+)$/.exec(id);
    if(match){const n=match[1];$('party-avatar-'+n).innerHTML=avatar($('party-gender-'+n).value,$('party-career-'+n).value);return;}
    if(id==='online-career'||id==='online-gender')$('online-avatar').innerHTML=avatar($('online-gender').value,$('online-career').value);
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&inside&&!$('help-dialog')?.open){inside=false;render();document.querySelector(`[data-location="${selected}"]`)?.focus();}});
  document.addEventListener('submit',e=>{if(e.target.id==='party-form'){e.preventDefault();const ai=screen==='ai',configs=[];for(let i=1;i<=(ai?2:4);i++){const name=$('party-name-'+i).value.trim();if(i<=2&&!name){notify('กรุณากรอกชื่อผู้เล่นทั้งสองคน');return;}if(name)configs.push({name,career:$('party-career-'+i).value,gender:$('party-gender-'+i).value,ai:ai&&i===2});}if(savedParty()&&!confirm('เริ่มเกมในเครื่องใหม่? เกมในเครื่องที่บันทึกไว้จะถูกแทนที่'))return;try{party=LifeParty.create(configs);mode='party';screen='play';syncParty();save();render();}catch(error){notify(error.message);}return;}if(e.target.id!=='start-form')return;e.preventDefault();game=Life.create($('player-name').value,null,career);selected='home';mode='solo';screen='play';save();render();});
  if(typeof Image==='function'){const sprites=new Image();sprites.onload=()=>document.documentElement.classList.add('sprites-ready');sprites.src='assets/life-characters.png';const walker=new Image();walker.onload=()=>document.documentElement.classList.add('walk-ready');walker.src='assets/life-walk.png';for(const type of ['male','female']){const sheet=new Image();sheet.onload=()=>document.documentElement.classList.add('career-'+type+'-ready');sheet.src='assets/careers-'+type+'.png';}}
  readSave();if(sessionGet(activeKey)==='yes'&&sessionGet(tokenKey)&&typeof WebSocket==='function'){mode='online';screen='online';connectOnline();}render();
})();
