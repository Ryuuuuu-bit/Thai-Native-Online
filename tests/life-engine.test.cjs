const test = require('node:test');
const assert = require('node:assert/strict');
const Life = require('../life-engine.js');

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
  const named = ['เยาวราช', 'สีลม', 'สวนลุมพินี', 'ถนนข้าวสาร', 'วัดอรุณ', 'เสาชิงช้า', 'อนุสาวรีย์ชัยสมรภูมิ'];
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
