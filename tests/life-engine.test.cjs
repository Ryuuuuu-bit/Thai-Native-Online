const test = require('node:test');
const assert = require('node:assert/strict');
const Life = require('../life-engine.js');

test('careers offer clear benefits and drawbacks; random selection covers all roles', () => {
  assert.equal(Life.careers.length, 7);
  for (const [i, career] of Life.careers.entries()) {
    assert.ok(career.good && career.bad && Life.goals.some(goal => goal.id === career.goal));
    assert.equal(Life.randomCareer(() => (i + 0.5) / Life.careers.length).id, career.id);
    const state = Life.create('ผู้เล่น', null, career.id);
    assert.equal(state.career, career.id);
    assert.equal(state.goal, career.goal);
  }
  assert.equal(Life.randomCareer(() => 2).id, Life.careers.at(-1).id);
});

test('career passives change actual actions, previews and affordability consistently', () => {
  const effects = [
    ['office', 'officework', {money:1700, energy:-35}],
    ['minimart', 'minimartjob', {money:700, energy:-23}],
    ['sales', 'shop', {money:800, happiness:-9}],
    ['rider', 'delivery', {money:1100, energy:-40}],
    ['creator', 'content', {fame:5, energy:-20}],
    ['student', 'study', {skill:2, money:-450}]
  ];
  for (const [career, id, expected] of effects) {
    const state = Life.create('ผู้เล่น', null, career), preview = Life.actionFor(state, id);
    const result = Life.act(state, id);
    assert.equal(result.ok, true, career);
    for (const [key, delta] of Object.entries(expected)) {
      assert.equal(preview[key], delta, `${career} preview ${key}`);
      assert.equal(result.state[key], state[key] + delta, `${career} actual ${key}`);
    }
  }
  const student = {...Life.create('นักเรียน', null, 'student'), money:400};
  assert.match(Life.act(student, 'study').error, /เงิน/);
  const office = {...Life.create('พนักงาน', null, 'office'), energy:30};
  assert.match(Life.act(office, 'officework').error, /พลัง/);
  assert.equal(Life.create('พนักงาน', null, 'office').skill, 3);
  assert.equal(Life.actionFor(office, 'not-real'), undefined);
});

test('the unhoused role gets temporary lodging support; legacy saves remain neutral', () => {
  const state = Life.create('ผู้เล่น', null, 'unhoused');
  assert.equal(state.money, 800); assert.equal(state.energy, 60); assert.equal(Life.weekCost(state), 300);
  assert.equal(Life.actionFor(state, 'rest').energy, 25);
  assert.equal(Life.act(state, 'rest').state.energy, 85);
  const end = Life.endWeek(state, () => 0);
  assert.equal(end.state.money, 500);
  assert.match(end.message, /ค่าที่พักชั่วคราว 300/);
  const old = Life.create('ผู้เล่นเดิม', 'collection');
  assert.equal(old.career, undefined); assert.equal(old.goal, 'collection'); assert.equal(Life.weekCost(old), 500);
  assert.deepEqual(Life.actionFor(old, 'shop'), Life.actions.find(action => action.id === 'shop'));
  assert.equal(Life.act(old, 'shop').state.money, old.money + 650);
});

test('travel and activity costs are applied atomically and invalid actions do not change the save', () => {
  const state = Life.create('น้อง', 'wealth');
  const result = Life.act(state, 'shop');
  assert.equal(result.ok, true);
  assert.equal(result.state.hours, 28);
  assert.equal(result.state.money, 3250);
  assert.equal(result.state.energy, 60);
  assert.equal(state.hours, 40);
  const again = Life.act(result.state, 'meal');
  assert.equal(again.state.hours, 24);
  const bad = Life.act(state, 'officework');
  assert.equal(bad.ok, false);
  assert.match(bad.error, /ทักษะ/);
  assert.strictEqual(bad.state, state);
  assert.equal(Life.act(state, 'does-not-exist').ok, false);
});

test('Bangkok landmarks have playable activities with clear costs and correct destinations', () => {
  const named = ['เยาวราช', 'สีลม', 'สวนลุมพินี', 'ถนนข้าวสาร', 'วัดอรุณ', 'เสาชิงช้า', 'อนุสาวรีย์ชัยสมรภูมิ', 'ร้านเกม', 'ร้านดูดวง', 'ร้านสะดวกซื้อ 24 ชม.'];
  for (const name of named) {
    const location = Life.locations.find(l => l.name === name);
    assert.ok(location, name);
    const action = Life.actions.find(a => a.location === location.id);
    assert.ok(action && action.hours > 0, name);
    const state = Life.create('นักท่องเที่ยว', 'balance');
    const result = Life.act(state, action.id);
    assert.equal(result.ok, true, name);
    assert.equal(result.state.location, location.id);
    assert.equal(result.state.hours, 40 - action.hours - 2);
  }
});

test('new neighborhood activities charge their listed costs and grant their advertised effects', () => {
  for (const id of ['arcadeplay', 'arcadejob', 'fortunevisit', 'minimartjob', 'minimartsnack']) {
    const action = Life.actions.find(a => a.id === id);
    const state = { ...Life.create('ชาวกรุง', 'balance'), energy: 50, happiness: 50 };
    const result = Life.act(state, id);
    assert.equal(result.ok, true, id);
    assert.equal(result.state.money, state.money + (action.money || 0), id);
    assert.equal(result.state.energy, state.energy + (action.energy || 0), id);
    assert.equal(result.state.happiness, state.happiness + (action.happiness || 0), id);
  }
});

test('a broke, tired player can still advance; rent, events and game ending are predictable', () => {
  let state = { ...Life.create('ผู้เล่น', 'balance'), hours: 0, money: 0, energy: 0 };
  assert.match(Life.act(state, 'shop').error, /เวลา/);
  for (let week = 1; week <= 20; week++) {
    const result = Life.endWeek(state, () => 0);
    assert.equal(result.ok, true);
    state = result.state;
    assert.equal(state.money, -500 * week);
    assert.match(state.event, /ฝนตก/);
    if (week < 20) { assert.equal(state.week, week + 1); assert.equal(state.hours, 40); }
  }
  assert.equal(state.finished, true);
  assert.equal(Life.act(state, 'rest').ok, false);
  assert.equal(Life.endWeek(state).ok, false);
});

test('spending, energy and end-of-game goals are checked independently', () => {
  const state = Life.create('ผู้เล่น', 'fame');
  assert.match(Life.act({ ...state, money: 0 }, 'content').error, /เงิน/);
  assert.match(Life.act({ ...state, energy: 0 }, 'content').error, /พลัง/);
  for (const goal of Life.goals) {
    const candidate = { ...state, goal: goal.id, [goal.metric]: goal.target, energy: 80 };
    assert.equal(Life.score(candidate).success, true, goal.id);
    candidate[goal.metric] = goal.target - 1;
    assert.equal(Life.score(candidate).success, false, goal.id);
  }
  assert.equal(Life.score({ ...state, goal: 'balance', happiness: 80, energy: 59 }).success, false);
  const debt = Life.score({ ...state, goal: 'balance', happiness: 100, energy: 76, money: -6950 });
  assert.equal(debt.success, false);
  assert.match(debt.breakdown, /เงินไม่ติดลบ/);
});

test('a complete twenty-week game stays playable and reaches an actual collection goal', () => {
  let state = Life.create('นักสะสม', 'collection');
  while (!state.finished) {
    // Collect, earn and recover in affordable cycles; travel is charged by the engine.
    for (const id of ['shop', 'fashion', 'park']) {
      const result = Life.act(state, id);
      if (result.ok) state = result.state;
    }
    state = Life.endWeek(state, () => 0.55).state;
  }
  assert.equal(state.week, 20);
  assert.equal(Life.score(state).success, true);
  assert.ok(state.history.length <= 20);
});

test('missions reward once, survive a save reload and refresh after three weeks', () => {
  let state = Life.create('คนขยัน', 'wealth');
  assert.equal(Life.mission(state).expiresWeek, 3);
  assert.equal(Life.mission(state).count, 0);
  state = Life.act(state, 'shop').state;
  assert.equal(Life.mission(state).count, 1);
  state = JSON.parse(JSON.stringify(state));
  const before = state.money;
  const completed = Life.act(state, 'shop');
  assert.equal(completed.state.money, before + 650 + 350);
  assert.match(completed.message, /ภารกิจสำเร็จ/);
  assert.equal(Life.mission(completed.state).completed, true);
  state = JSON.parse(JSON.stringify(completed.state));
  const again = Life.act(state, 'shop');
  assert.equal(again.state.money, state.money + 650);
  assert.equal(Life.mission(again.state).count, 2);
  state = again.state;
  for (let i = 0; i < 3; i++) state = Life.endWeek(state, () => 0.5).state;
  assert.equal(state.week, 4);
  assert.equal(Life.mission(state).id, 'sightseeing');
  assert.equal(Life.mission(state).count, 0);
  assert.equal(Life.mission(state).expiresWeek, 6);
});

test('old saves get a fresh mission without losing progress; unique sightseeing cannot be farmed', () => {
  let state = { ...Life.create('ชาวกรุงเดิม', 'balance'), week: 4, money: 4000 };
  delete state.mission;
  const before = JSON.stringify(state);
  assert.equal(Life.mission(state).id, 'sightseeing');
  assert.equal(JSON.stringify(state), before);
  state = Life.act(state, 'templevisit').state;
  assert.equal(Life.mission(state).count, 1);
  state = Life.act(state, 'templevisit').state;
  assert.equal(Life.mission(state).count, 1);
  const money = state.money;
  state = Life.act(state, 'swingvisit').state;
  assert.equal(Life.mission(state).completed, true);
  assert.equal(state.money, money - 120 + 350);
  assert.equal(state.week, 4);
  assert.equal(state.name, 'ชาวกรุงเดิม');
});
