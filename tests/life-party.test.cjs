'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Party = require('../life-party.js');

const human = (name, career = 'office') => ({ name, career, gender: 'female', ai: false });

test('local parties validate their size and keep player careers and turns independent', () => {
  assert.throws(() => Party.create([human('หนึ่ง')]), /2–4/);
  assert.throws(() => Party.create([1, 2, 3, 4, 5]), /2–4/);
  assert.throws(() => Party.create([{ai:true}, {ai:true}]), /ผู้เล่นจริง/);
  const start = Party.create([human('หนึ่ง'), human('สอง', 'minimart')]);
  const acted = Party.act(start, 'officework');
  assert.equal(acted.ok, true);
  assert.equal(acted.state.players[0].game.money, 4300);
  assert.equal(start.players[0].game.money, 2600);
  assert.equal(acted.state.players[1].game.money, 2600);
  const next = Party.endTurn(acted.state, () => 0.3).state;
  assert.equal(next.active, 1); assert.equal(next.week, 1);
  assert.equal(next.players[0].game.week, 2); assert.equal(next.players[1].game.week, 1);
  const week2 = Party.endTurn(next, () => 0.3).state;
  assert.equal(week2.active, 0); assert.equal(week2.week, 2);
  assert.equal(week2.players[1].game.week, 2);
});

test('AI takes real actions automatically including when it precedes a human', () => {
  const party = Party.create([{name:'บอต', career:'minimart', ai:true}, human('คน')], () => 0.3);
  assert.equal(party.active, 1);
  assert.equal(party.players[0].game.week, 2);
  assert.ok(party.players[0].game.history.some(s => s.includes('งานร้านสะดวกซื้อ')));
  assert.notEqual(party.players[0].game.money, 2600 - 500);
  const next = Party.endTurn(party, () => 0.3).state;
  assert.equal(next.week, 2); assert.equal(next.active, 1);
  assert.equal(next.players[0].game.week, 3);
  const invalid = Party.act(next, 'not-real');
  assert.equal(invalid.ok, false); assert.strictEqual(invalid.state, next);
});

test('twenty weeks finish the party once and success requires combined funds and all players rested', () => {
  let party = Party.create([human('หนึ่ง'), human('สอง')]);
  for (let i = 0; i < 40; i++) {
    const result = Party.endTurn(party, () => 0.3);
    assert.equal(result.ok, true);
    party = result.state;
  }
  assert.equal(party.finished, true); assert.equal(party.week, 20);
  assert.ok(party.players.every(p => p.game.finished));
  assert.equal(Party.endTurn(party).ok, false);
  assert.equal(Party.act(party, 'rest').ok, false);
  const set = (values) => ({ ...party, players: party.players.map((p, i) => ({ ...p, game: { ...p.game, ...values[i] } })) });
  assert.equal(Party.score(set([{money:-500, energy:30}, {money:500, energy:40}])).success, true);
  assert.equal(Party.score(set([{money:-501, energy:30}, {money:500, energy:40}])).success, false);
  assert.equal(Party.score(set([{money:0, energy:29}, {money:0, energy:40}])).success, false);
});

test('a human and AI can play a bounded complete twenty-week game', () => {
  let party = Party.create([human('หนึ่ง'), { name:'บอต', career:'rider', ai:true }]);
  for (let week = 1; week <= 20; week++) {
    assert.equal(party.week, week);
    assert.equal(party.active, 0);
    const next = Party.endTurn(party, () => 0.3);
    assert.equal(next.ok, true);
    party = next.state;
  }
  assert.equal(party.finished, true);
  assert.ok(party.players[1].game.history.some(s => s.includes('สำเร็จ')));
});
