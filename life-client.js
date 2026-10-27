(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n => Number(n).toLocaleString('th-TH');
  const key = 'thainative-life-demo-v1';
  let game = null, selected = 'home', gender = 'female', goal = 'balance', toastTimer, saveFailed = false;
  function save() { try { localStorage.setItem(key, JSON.stringify({game, gender})); saveFailed=false; } catch { saveFailed=true; } }
  function readSave() {
    try {
      const s = JSON.parse(localStorage.getItem(key));
      const g = s?.game;
      if (!g || typeof g.name !== 'string' || !Life.goals.some(x=>x.id===g.goal) || !Life.locations.some(x=>x.id===g.location) || !Array.isArray(g.history) || !['week','hours','money','energy','happiness','skill','fame','collection'].every(k=>Number.isFinite(g[k])) || g.week < 1 || g.week > 20 || typeof g.finished !== 'boolean') return;
      game = g; gender = s.gender === 'male' ? 'male' : 'female'; selected = g.location;
    } catch {}
  }
  function notify(message) { const el=$('toast'); el.textContent=message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('visible'),3500); }
  function avatar(type) {
    const hair=type==='male'?'#554658':'#6d435f', coat=type==='male'?'#69aeb0':'#e98f9b';
    return `<span class="chibi-avatar portrait ${type}" aria-hidden="true"><svg viewBox="0 0 80 80"><ellipse cx="40" cy="76" rx="23" ry="3" fill="#70545b" opacity=".17"/><path d="M21 72c1-14 8-20 19-20s18 6 19 20" fill="${coat}" stroke="#614653" stroke-width="3"/><path d="M34 54l6 8 6-8" fill="#fff6dc" stroke="#614653" stroke-width="2"/><path d="M17 34C15 17 25 7 40 7s25 10 23 27l-2 15c-3 9-10 12-21 12S20 58 19 49z" fill="${hair}" stroke="#614653" stroke-width="3"/><ellipse cx="40" cy="37" rx="21" ry="22" fill="#ffe4c4" stroke="#614653" stroke-width="2.5"/><path d="M18 34C17 18 26 9 40 9c12 0 21 8 22 22-10-2-15-8-19-14-6 11-14 16-25 17z" fill="${hair}" stroke="#614653" stroke-width="2.5"/><path d="M26 25q4 2 7-2M47 19q3 5 8 6" fill="none" stroke="#ad8290" stroke-width="2" stroke-linecap="round"/><ellipse cx="31" cy="39" rx="3" ry="4.5" fill="#4e3d50"/><ellipse cx="49" cy="39" rx="3" ry="4.5" fill="#4e3d50"/><circle cx="32" cy="37.5" r="1" fill="white"/><circle cx="50" cy="37.5" r="1" fill="white"/><ellipse cx="24" cy="45" rx="4" ry="2" fill="#ef9b98" opacity=".65"/><ellipse cx="56" cy="45" rx="4" ry="2" fill="#ef9b98" opacity=".65"/><path d="M36 47q4 4 8 0" fill="none" stroke="#a75b62" stroke-width="2" stroke-linecap="round"/>${type==='female'?'<path d="M53 12l4-4 2 5 5 2-4 3-1 5-4-4-5-1z" fill="#ffd47a" stroke="#8c5960" stroke-width="1.5"/>':''}</svg></span>`;
  }
  function startScreen() {
    $('app').innerHTML=`<div class="app-shell"><section class="setup panel"><div class="setup-visual"><div class="setup-copy"><span class="setup-sticker">✦ WELCOME TO BANGKOK ✦</span><h1>ชีวิตติดกรุง<br>ยุ่งนิด ๆ แต่น่ารัก!</h1><p>รถติด ฝนตก เงินใกล้หมด... แต่ความฝันยังเต็มร้อย! มาลองใช้ชีวิตในกรุงเทพฉบับ Chibi ด้วยกัน</p></div></div><div class="setup-form"><span class="eyebrow">YOUR NEW LIFE STARTS HERE</span><h2>สร้างชาวกรุงของคุณ ✿</h2><p>เลือกตัวละครและเป้าหมาย แล้วมาดูกันว่า 20 สัปดาห์นี้ชีวิตจะพาเราไปทางไหน</p><form id="start-form"><label class="field-label" for="player-name">ชาวกรุงคนนี้ชื่ออะไร?</label><input class="name-input" id="player-name" maxlength="20" autocomplete="nickname" placeholder="ตั้งชื่อเล่นของคุณ" value="ชาวกรุง"><span class="field-label">เลือกตัวละคร</span><div class="choice-row">${[['female','ผู้หญิง'],['male','ผู้ชาย']].map(([id,name])=>`<button type="button" class="choice character-choice" data-gender="${id}" aria-pressed="${gender===id}">${avatar(id)}<span>${name}</span></button>`).join('')}</div><span class="field-label">เป้าหมายชีวิตของฉัน</span><div class="choice-row goals">${Life.goals.map((g,i)=>`<button type="button" class="choice" data-goal="${g.id}" aria-pressed="${goal===g.id}">${['💰','⭐','🌿','🎀'][i]} ${g.name}<span>${g.description}</span></button>`).join('')}</div><button class="button primary" type="submit">เริ่มชีวิตติดกรุง →</button></form><div class="setup-foot">เล่นคนเดียว · บันทึกในเบราว์เซอร์นี้ · ยังไม่รองรับออนไลน์หรือบันทึกผ่านบัญชี</div></div></section></div>`;
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
  function playScreen() {
    const location=Life.locations.find(x=>x.id===selected) || Life.locations[0];
    const current=Life.locations.find(x=>x.id===game.location);
    const goalData=Life.goals.find(x=>x.id===game.goal);
    const progress=Life.score(game), mission=Life.mission(game);
    const actions=Life.actions.filter(x=>x.location===location.id);
    $('app').innerHTML=`<div class="app-shell"><div class="page-heading"><div><span class="eyebrow">WELCOME TO YOUR LITTLE BANGKOK</span><h1>วันนี้จะไปไหนดีนะ? ☀</h1><p>เลือกสถานที่และกิจกรรม แล้วใช้ชีวิตในแบบของคุณ</p></div><span class="week-tag">📅 สัปดาห์ ${game.week} / 20</span></div><div class="game-grid"><section class="world-panel panel"><div class="map-top"><div><strong>🗺 แผนที่ชีวิตติดกรุง</strong><br><small>คลิกสถานที่เพื่อดูกิจกรรม</small></div><small>ตอนนี้อยู่: ${esc(current?.name||'ห้องเช่า')}</small></div><div class="map-scene"><span class="scene-sign">✿ กรุงเทพฯ เมืองแห่งความเป็นไปได้</span><div class="map-pins">${Life.locations.map(l=>`<button class="map-pin ${l.id===selected?'active':''}" data-location="${l.id}" aria-pressed="${l.id===selected}"><span class="pin-icon">${l.icon}</span>${l.name}</button>`).join('')}</div></div><div class="map-foot"><span>💡 เปลี่ยนสถานที่เสียเวลาเดินทาง <b>2 ชั่วโมง</b></span><span>✦ เล่นคนเดียว</span></div></section><aside class="side"><section class="player-card panel"><div class="player-head"><div class="avatar" aria-hidden="true">${avatar(gender)}</div><div><div class="player-name">${esc(game.name)}</div><div class="player-goal">เป้าหมาย: ${esc(goalData?.name||'ชีวิตสมดุล')}</div></div><span class="week-pill">WEEK ${game.week}</span></div><div class="stats"><div class="stat"><small>เวลาคงเหลือ</small><b><i>⏱</i>${game.hours} ชม.</b></div><div class="stat"><small>เงินในกระเป๋า</small><b><i>💰</i>${money(game.money)} ฿</b></div><div class="stat"><small>พลังงาน</small><b><i>⚡</i>${game.energy}/100</b></div><div class="stat"><small>ความสุข</small><b><i>♥</i>${game.happiness}/100</b></div><div class="stat"><small>ทักษะ</small><b><i>📚</i>${game.skill}</b></div><div class="stat"><small>ชื่อเสียง · ของสะสม</small><b><i>⭐</i>${game.fame} · 🎀 ${game.collection}</b></div></div><p class="tip">🎯 ${esc(progress.breakdown)}</p><div class="mini-mission"><div class="mission-head"><b>📌 ${esc(mission.name)}</b><span>${mission.count}/${mission.target}</span></div><small>${esc(mission.description)}</small><progress value="${mission.count}" max="${mission.target}" aria-label="ความคืบหน้าภารกิจ"></progress><small>${mission.completed?'✓ รับรางวัล '+money(mission.reward)+' ฿ แล้ว':'รางวัล '+money(mission.reward)+' ฿ รับอัตโนมัติ'} · สัปดาห์ ${mission.cycle*3+1}–${mission.expiresWeek}</small></div></section><section class="action-card panel"><div class="location-heading"><span class="location-icon">${location.icon}</span><div><h2>${esc(location.name)}</h2><p>${esc(location.description)}</p></div></div><div class="action-list">${actions.map(a=>{const reason=unavailable(a);return `<button class="action" data-action="${a.id}" ${reason?'disabled':''}><strong>${esc(a.name)}</strong><span>${esc(a.description)}</span><span class="action-cost">${esc(costs(a))}${reason?' · '+esc(reason):''}</span></button>`;}).join('')}</div><button class="button primary end-week" id="end-week">จบสัปดาห์ →</button><p class="tip">จบสัปดาห์จ่ายค่าเช่า 500 ฿ และพบเหตุการณ์สุ่ม เงินติดลบได้ แต่ซื้อของเพิ่มไม่ได้จนกว่าจะหาเงินมาเติม</p></section></aside></div><section class="activity panel"><span class="activity-icon">💌</span><div class="activity-copy"><small>บันทึกชีวิตล่าสุด</small><p>${esc(game.history[0]||'เริ่มต้นชีวิตใหม่กลางกรุงเทพ!')}</p></div><button class="button secondary" id="restart">เริ่มใหม่</button></section><p class="setup-foot">${saveFailed?'⚠ บันทึกไม่สำเร็จ หากปิดหรือรีเฟรชหน้านี้ความคืบหน้าอาจหาย':'เล่นคนเดียว · บันทึกในเบราว์เซอร์นี้อัตโนมัติ · ยังไม่รองรับออนไลน์หรือบันทึกผ่านบัญชี'}</p></div>`;
  }
  function resultScreen() {
    const result=Life.score(game); const g=Life.goals.find(x=>x.id===game.goal);
    $('app').innerHTML=`<div class="app-shell"><section class="result panel"><span class="eyebrow">YOUR BANGKOK STORY</span><div class="trophy">${result.success?'🏆':'🌈'}</div><h1>${esc(result.title)}</h1><p>ครบ 20 สัปดาห์แล้ว! ${esc(game.name)} เดินทางมาถึงปลายทางของชีวิตติดกรุงในครั้งนี้</p><div class="result-score">${result.score}</div><span class="eyebrow">LIFE POINTS</span><p>เป้าหมาย: ${esc(g?.name||'ชีวิตสมดุล')}<br>${esc(result.breakdown)}</p><div class="result-grid"><div><small>เงินคงเหลือ</small><b>💰 ${money(game.money)} ฿</b></div><div><small>พลัง</small><b>⚡ ${game.energy}</b></div><div><small>ความสุข</small><b>♥ ${game.happiness}</b></div><div><small>ทักษะ</small><b>📚 ${game.skill}</b></div><div><small>ชื่อเสียง</small><b>⭐ ${game.fame}</b></div><div><small>ของสะสม</small><b>🎀 ${game.collection}</b></div></div><p>💌 ${esc(game.event)}</p><div class="result-actions"><button class="button primary" id="restart">เริ่มชีวิตใหม่อีกครั้ง →</button></div><p class="setup-foot">Demo เล่นคนเดียว · ข้อมูลอยู่ในเบราว์เซอร์นี้</p></section></div>`;
  }
  function render() { if(!game)startScreen();else if(game.finished)resultScreen();else playScreen(); }
  document.addEventListener('click', e=>{
    let b=e.target.closest('button'); if(!b)return;
    if(b.dataset.gender){gender=b.dataset.gender;document.querySelectorAll('[data-gender]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));return;}
    if(b.dataset.goal){goal=b.dataset.goal;document.querySelectorAll('[data-goal]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));return;}
    if(b.dataset.location){selected=b.dataset.location;render();if(typeof matchMedia==='function'&&matchMedia('(max-width: 620px)').matches){(document.querySelector('.action:not(:disabled)')||$('end-week'))?.focus();}else document.querySelector(`[data-location="${selected}"]`)?.focus();return;}
    if(b.dataset.action){const r=Life.act(game,b.dataset.action);if(!r.ok){notify(r.error);return;}game=r.state;save();render();(document.querySelector(`[data-action="${b.dataset.action}"]:not(:disabled)`)||$('end-week'))?.focus();notify(r.message);return;}
    if(b.id==='end-week'){const r=Life.endWeek(game);if(!r.ok){notify(r.error);return;}game=r.state;save();render();$('end-week')?.focus();notify(r.message);return;}
    if(b.id==='restart'){if(confirm('เริ่มชีวิตใหม่? ความคืบหน้าของเกมนี้จะถูกลบ')){game=null;selected='home';try{localStorage.removeItem(key);}catch{}render();}return;}
    if(b.id==='help-button'){$('help-dialog').showModal();return;}
    if(b.id==='close-help'||b.id==='got-it')$('help-dialog').close();
  });
  document.addEventListener('submit',e=>{if(e.target.id!=='start-form')return;e.preventDefault();game=Life.create($('player-name').value,goal);selected='home';save();render();});
  if(typeof Image==='function'){const sprites=new Image();sprites.onload=()=>document.documentElement.classList.add('sprites-ready');sprites.src='assets/life-characters.png';}
  readSave();render();
})();
