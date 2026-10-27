(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Life = factory();
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  const locations = [
    { id: 'home', name: 'ห้องเช่า', icon: '🏠', description: 'พักให้หายเหนื่อยก่อนลุยเมือง' },
    { id: 'market', name: 'เยาวราช', icon: '🍜', description: 'สตรีทฟู้ด ร้านค้า และแฟชัน' },
    { id: 'office', name: 'สีลม', icon: '🏢', description: 'ย่านออฟฟิศ แลกเวลากับความฝัน' },
    { id: 'school', name: 'สถาบันสอนวิชา', icon: '📚', description: 'เรียนทักษะเพื่อเปิดโอกาสใหม่' },
    { id: 'park', name: 'สวนลุมพินี', icon: '🌳', description: 'พักใจและออกไปพบผู้คน' },
    { id: 'night', name: 'ถนนข้าวสาร', icon: '✨', description: 'สังคม คอนเทนต์ และเรื่องวุ่นวาย' },
    { id: 'temple', name: 'วัดอรุณ', icon: '🛕', description: 'ชมริมเจ้าพระยาและถ่ายรูป' },
    { id: 'swing', name: 'เสาชิงช้า', icon: '⛩️', description: 'แวะชมย่านเมืองเก่าและเติมพลัง' },
    { id: 'victory', name: 'อนุสาวรีย์ชัยสมรภูมิ', icon: '🚏', description: 'ย่านเดินทางและงานพาร์ตไทม์' },
    { id: 'arcade', name: 'ร้านเกม', icon: '🎮', description: 'ตู้เกม เพื่อนใหม่ และงานพาร์ตไทม์' },
    { id: 'fortune', name: 'ร้านดูดวง', icon: '🔮', description: 'แวะฟังคำทำนายให้ใจฟู' },
    { id: 'minimart', name: 'ร้านสะดวกซื้อ 24 ชม.', icon: '🏪', description: 'ซื้อของเติมพลังหรือช่วยงานในร้าน' }
  ];
  // Hours exclude the two-hour journey when changing locations.
  const actions = [
    { id: 'rest', location: 'home', name: 'นอนพัก', description: 'ชาร์จพลังให้พร้อมลุย', hours: 8, energy: 30, happiness: 4 },
    { id: 'shop', location: 'market', name: 'ช่วยงานร้านค้า', description: 'รายได้มั่นคง เหนื่อยนิดหน่อย', hours: 10, money: 650, energy: -20, happiness: -3 },
    { id: 'meal', location: 'market', name: 'กินข้าวแกง', description: 'อิ่มท้อง เติมแรงและกำลังใจ', hours: 4, money: -120, energy: 14, happiness: 9 },
    { id: 'fashion', location: 'market', name: 'ช้อปแฟชัน', description: 'ได้ของสะสมหนึ่งชิ้นและความสุข', hours: 6, money: -300, happiness: 12, collection: 1 },
    { id: 'delivery', location: 'office', name: 'รับงานไรเดอร์', description: 'รายได้ดี แต่ใช้แรงเยอะ', hours: 10, money: 900, energy: -30, happiness: -7 },
    { id: 'officework', location: 'office', name: 'ทำงานออฟฟิศ', description: 'ต้องมีทักษะ 3 ขึ้นไป รายได้สูง', hours: 12, money: 1500, energy: -25, happiness: -5, requiresSkill: 3 },
    { id: 'study', location: 'school', name: 'เรียนทักษะ', description: 'ลงทุนเรียน เพิ่มทักษะหนึ่งขั้น', hours: 10, money: -350, energy: -12, happiness: 2, skill: 1 },
    { id: 'park', location: 'park', name: 'เดินเล่นในสวน', description: 'รับลมและเติมความสุข', hours: 6, energy: 10, happiness: 15 },
    { id: 'social', location: 'night', name: 'เที่ยวกับเพื่อน', description: 'สร้างความสัมพันธ์และคลายเครียด', hours: 6, money: -250, energy: -8, happiness: 18, fame: 1 },
    { id: 'content', location: 'night', name: 'ทำคอนเทนต์', description: 'สร้างชื่อเสียงพร้อมฝึกทักษะ', hours: 8, money: -150, energy: -15, happiness: 3, skill: 1, fame: 3 },
    { id: 'templevisit', location: 'temple', name: 'เที่ยวชมวัดอรุณ', description: 'เที่ยวริมแม่น้ำ เก็บภาพและความสุข', hours: 6, money: -100, happiness: 13, fame: 1 },
    { id: 'swingvisit', location: 'swing', name: 'กินของอร่อยย่านเสาชิงช้า', description: 'เติมแรงพร้อมเดินชมเมืองเก่า', hours: 5, money: -120, energy: 10, happiness: 8 },
    { id: 'victoryjob', location: 'victory', name: 'ช่วยงานร้านใกล้อนุสาวรีย์', description: 'งานสั้น ๆ ได้เงินระหว่างเดินทาง', hours: 6, money: 400, energy: -12, happiness: -1 },
    { id: 'arcadeplay', location: 'arcade', name: 'แข่งตู้เกมกับเพื่อน', description: 'เกมโอเวอร์ได้ แต่ใจต้องไม่โอเวอร์', hours: 6, money: -180, energy: -6, happiness: 15, fame: 1 },
    { id: 'arcadejob', location: 'arcade', name: 'ช่วยดูแลร้านเกม', description: 'จัดจอย เช็ดตู้ และรับค่าจ้าง', hours: 7, money: 450, energy: -15, happiness: -1 },
    { id: 'fortunevisit', location: 'fortune', name: 'ให้หมอดูเปิดไพ่', description: 'หมอดูบอกว่าอนาคตสดใส แต่ระวังค่าเช่า', hours: 5, money: -200, happiness: 12 },
    { id: 'minimartjob', location: 'minimart', name: 'ช่วยงานร้านสะดวกซื้อ', description: 'เติมสินค้าและรับค่าจ้าง', hours: 8, money: 500, energy: -15, happiness: -2 },
    { id: 'minimartsnack', location: 'minimart', name: 'ซื้อของว่าง', description: 'อิ่มสบายกระเป๋า เติมแรงอย่างรวดเร็ว', hours: 3, money: -75, energy: 9, happiness: 5 }
  ];
  const goals = [
    { id: 'wealth', name: 'เถ้าแก่คนใหม่', description: 'เก็บเงินและพัฒนาทักษะให้พร้อมเปิดกิจการ', metric: 'money', target: 12000 },
    { id: 'fame', name: 'ดาวค้างฟ้า', description: 'สร้างชื่อเสียงจนคนทั้งเมืองรู้จัก', metric: 'fame', target: 30 },
    { id: 'balance', name: 'ชีวิตสมดุล', description: 'จบเกมด้วยความสุข 80 พลัง 60 และเงินไม่ติดลบ', metric: 'happiness', target: 80 },
    { id: 'collection', name: 'นักสะสมแห่งกรุง', description: 'ช้อปแฟชันเก็บเป็นคอลเลกชัน', metric: 'collection', target: 10 }
  ];
  const careers = [
    { id: 'unhoused', name: 'ผู้ไม่มีที่พัก', icon: '🧳', good: 'ได้รับความช่วยเหลือค่าที่พักชั่วคราว 200 ฿ ต่อสัปดาห์ จ่ายเอง 300 ฿', bad: 'พักในที่พักชั่วคราวฟื้นพลังน้อยลง 5; เริ่มเงิน 800 ฿ และพลัง 60', goal: 'balance' },
    { id: 'office', name: 'พนักงานออฟฟิศ', icon: '💼', good: 'เริ่มทักษะ 3 และงานออฟฟิศได้เงินเพิ่ม 200 ฿', bad: 'งานออฟฟิศใช้พลังเพิ่ม 10', goal: 'wealth' },
    { id: 'minimart', name: 'พนักงานร้านสะดวกซื้อ', icon: '🏪', good: 'งานร้านสะดวกซื้อได้เงินเพิ่ม 200 ฿', bad: 'งานร้านสะดวกซื้อใช้พลังเพิ่ม 8', goal: 'wealth' },
    { id: 'sales', name: 'เซลส์ขายของ', icon: '🤝', good: 'ช่วยงานร้านค้าได้เงินเพิ่ม 150 ฿', bad: 'ช่วยงานร้านค้าลดความสุขเพิ่ม 6', goal: 'wealth' },
    { id: 'rider', name: 'ไรเดอร์', icon: '🛵', good: 'งานไรเดอร์ได้เงินเพิ่ม 200 ฿', bad: 'งานไรเดอร์ใช้พลังเพิ่ม 10', goal: 'wealth' },
    { id: 'creator', name: 'ครีเอเตอร์', icon: '📸', good: 'ทำคอนเทนต์ได้ชื่อเสียงเพิ่ม 2', bad: 'ทำคอนเทนต์ใช้พลังเพิ่ม 5', goal: 'fame' },
    { id: 'student', name: 'นักศึกษา', icon: '🎓', good: 'เรียนทักษะได้เพิ่มอีก 1 ขั้น', bad: 'เรียนทักษะเสียค่าเรียนเพิ่ม 100 ฿', goal: 'balance' }
  ];
  function randomCareer(rng = Math.random) {
    const random = Number(rng());
    return careers[Math.max(0, Math.min(careers.length - 1, Math.floor((Number.isFinite(random) ? random : 0) * careers.length)))];
  }
  function actionFor(state, id) {
    const original = actions.find(action => action.id === id);
    if (!original) return;
    const action = { ...original };
    switch (state?.career) {
      case 'unhoused': if (id === 'rest') action.energy -= 5; break;
      case 'office': if (id === 'officework') { action.money += 200; action.energy -= 10; } break;
      case 'minimart': if (id === 'minimartjob') { action.money += 200; action.energy -= 8; } break;
      case 'sales': if (id === 'shop') { action.money += 150; action.happiness -= 6; } break;
      case 'rider': if (id === 'delivery') { action.money += 200; action.energy -= 10; } break;
      case 'creator': if (id === 'content') { action.fame += 2; action.energy -= 5; } break;
      case 'student': if (id === 'study') { action.skill += 1; action.money -= 100; } break;
    }
    return action;
  }
  const weekCost = state => state?.career === 'unhoused' ? 300 : 500;
  const missions = [
    { id: 'sidejobs', name: 'ภารกิจหาเงินค่าขนม', description: 'ทำงานพาร์ตไทม์ 2 ครั้ง', target: 2, reward: 350, actions: ['shop', 'delivery', 'officework', 'victoryjob', 'arcadejob', 'minimartjob'] },
    { id: 'sightseeing', name: 'เที่ยวกรุงสองมุม', description: 'เที่ยววัดอรุณ เสาชิงช้า หรือสวนลุมพินีให้ครบ 2 แห่ง', target: 2, reward: 350, actions: ['templevisit', 'swingvisit', 'park'], unique: true },
    { id: 'foodie', name: 'ท้องอิ่มยิ้มได้', description: 'แวะกินอาหารหรือของว่าง 2 ครั้ง', target: 2, reward: 300, actions: ['meal', 'swingvisit', 'minimartsnack'] }
  ];
  function mission(state) {
    const cycle = Math.floor((Math.max(1, Math.min(20, state.week)) - 1) / 3);
    const definition = missions[cycle % missions.length];
    const saved = state.mission?.cycle === cycle && state.mission?.id === definition.id ? state.mission : null;
    return { id: definition.id, name: definition.name, description: definition.description, cycle, count: saved?.count || 0, target: definition.target, reward: definition.reward, completed: !!saved?.completed, expiresWeek: Math.min(20, cycle * 3 + 3), seen: Array.isArray(saved?.seen) ? [...saved.seen] : [] };
  }
  const events = [
    { text: 'ฝนตกหนัก! เปียกเหมือนเพิ่งลงคลอง', energy: -8, happiness: -3 },
    { text: 'ร้านปากซอยแถมไข่ดาวให้ ใจฟูทั้งวัน', happiness: 8 },
    { text: 'เจอธนบัตรในกระเป๋ากางเกงตัวเก่า เย้!', money: 200 },
    { text: 'รถติดจนได้ฟังเพลงโปรดครบทั้งอัลบั้ม', energy: -4, happiness: 3 },
    { text: 'เพื่อนส่งมีมมาให้ หัวเราะจนลืมรถติด', happiness: 6 },
    { text: 'เจอโปรส่งฟรี แต่เกือบเผลอกดสั่งของ', money: -100, happiness: 4 },
    { text: 'น้องแมวประจำซอยมาทัก เพิ่มกำลังใจ', happiness: 10 },
    { text: 'ข้าวเช้าพิเศษวันนี้เติมพลังให้เต็มที่', energy: 10 }
  ];
  const cap = n => Math.max(0, Math.min(100, n));
  function create(name, goal, careerId) {
    const career = careers.find(c => c.id === careerId);
    const state = {
      name: String(name || '').trim().slice(0, 20) || 'ชาวกรุง',
      goal: career?.goal || (goals.some(g => g.id === goal) ? goal : 'balance'),
      week: 1, hours: 40, money: careerId === 'unhoused' ? 800 : 2600, energy: careerId === 'unhoused' ? 60 : 80, happiness: 65,
      skill: careerId === 'office' ? 3 : 0, fame: 0, collection: 0, location: 'home',
      finished: false, event: '', history: ['เริ่มต้นชีวิตใหม่กลางกรุงเทพ!']
    };
    if (career) state.career = career.id;
    state.mission = mission(state);
    return state;
  }
  function valid(s) {
    return !!s && !s.finished && Number.isInteger(s.week) && s.week >= 1 && s.week <= 20 &&
      Number.isFinite(s.hours) && Number.isFinite(s.money) && Number.isFinite(s.energy) && Number.isFinite(s.happiness) &&
      Number.isFinite(s.skill) && Number.isFinite(s.fame) && Number.isFinite(s.collection) && Array.isArray(s.history);
  }
  function fail(s, error) { return { ok: false, error, state: s }; }
  function act(s, id) {
    if (!valid(s)) return fail(s, 'เกมจบแล้วหรือข้อมูลเกมไม่ถูกต้อง');
    const a = actionFor(s, id);
    if (!a) return fail(s, 'ไม่พบกิจกรรมนี้');
    const travel = s.location === a.location ? 0 : 2;
    if (s.hours < a.hours + travel) return fail(s, 'เวลาไม่พอ ลองเลือกกิจกรรมอื่นหรือจบสัปดาห์');
    if ((a.money || 0) < 0 && s.money < -a.money) return fail(s, 'เงินไม่พอ ลองทำงานเก็บเงินก่อน');
    if ((a.energy || 0) < 0 && s.energy < -a.energy) return fail(s, 'พลังไม่พอ ลองพักหรือกินข้าวก่อน');
    if (a.requiresSkill && s.skill < a.requiresSkill) return fail(s, `ต้องมีทักษะอย่างน้อย ${a.requiresSkill}`);
    const next = { ...s, location: a.location, hours: s.hours - a.hours - travel };
    for (const key of ['money', 'skill', 'fame', 'collection']) next[key] += a[key] || 0;
    for (const key of ['energy', 'happiness']) next[key] = cap(next[key] + (a[key] || 0));
    const current = mission(s), definition = missions.find(item => item.id === current.id);
    let bonus = '';
    if (!current.completed && definition.actions.includes(id) && (!definition.unique || !current.seen.includes(id))) {
      current.count++;
      if (definition.unique) current.seen.push(id);
      if (current.count >= current.target) { current.completed = true; next.money += current.reward; bonus = ` · ภารกิจสำเร็จ +${current.reward} บาท`; }
    }
    next.mission = current;
    const message = `${a.name}สำเร็จ${travel ? ' · เดินทาง 2 ชม.' : ''}${bonus}`;
    next.history = [message, ...s.history].slice(0, 20);
    return { ok: true, state: next, message };
  }
  function endWeek(s, rng = Math.random) {
    if (!valid(s)) return fail(s, 'เกมจบแล้วหรือข้อมูลเกมไม่ถูกต้อง');
    const random = Number(rng());
    const event = events[Math.max(0, Math.min(events.length - 1, Math.floor((Number.isFinite(random) ? random : 0) * events.length)))];
    const cost = weekCost(s), lodging = s.career === 'unhoused' ? 'ค่าที่พักชั่วคราว' : 'ค่าเช่า';
    const next = { ...s, money: s.money - cost + (event.money || 0), energy: cap(s.energy + (event.energy || 0)), happiness: cap(s.happiness + (event.happiness || 0)), event: event.text };
    const message = `สัปดาห์ ${s.week} จบ · ${lodging} ${cost} บาท · ${event.text}`;
    next.history = [message, ...s.history].slice(0, 20);
    if (s.week === 20) next.finished = true;
    else { next.week++; next.hours = 40; }
    next.mission = mission(next);
    return { ok: true, state: next, message };
  }
  function score(s) {
    const goal = goals.find(g => g.id === s.goal) || goals[2];
    const progress = Math.max(0, s[goal.metric]);
    const success = progress >= goal.target && (goal.id !== 'balance' || (s.energy >= 60 && s.money >= 0));
    const total = Math.max(0, Math.round(progress / goal.target * 100) + Math.round((s.energy + s.happiness) / 4) + s.skill * 2);
    return { score: total, title: success ? 'พิชิตเป้าหมายชีวิต!' : 'ชีวิตยังมีเรื่องให้ลุ้นต่อ', breakdown: `เป้าหมาย ${progress.toLocaleString('th-TH')} / ${goal.target.toLocaleString('th-TH')}${goal.id === 'balance' ? ' · พลังอย่างน้อย 60 · เงินไม่ติดลบ' : ''}`, success, progress, target: goal.target };
  }
  return { create, act, endWeek, score, mission, randomCareer, actionFor, weekCost, locations, actions, goals, careers };
});
