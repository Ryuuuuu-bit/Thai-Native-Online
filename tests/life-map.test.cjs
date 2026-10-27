'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Life = require('../life-engine.js');
const Map = require('../life-map.js');

test('every game location has a connected, bounded map route in both directions', () => {
  const ids = Life.locations.map(location => location.id);
  assert.deepEqual(Object.keys(Map.positions).sort(), [...ids].sort());
  for (const from of ids) for (const to of ids) {
    const route = Map.route(from, to);
    assert.deepEqual(route[0], Map.positions[from]);
    assert.deepEqual(route.at(-1), Map.positions[to]);
    assert.equal(route.length === 1, from === to);
    assert.deepEqual(route.map(({x,y}) => ({x,y})), Map.route(to, from).reverse().map(({x,y}) => ({x,y})));
    for (let i = 0; i < route.length; i++) {
      assert.ok(route[i].x >= 0 && route[i].x <= 100 && route[i].y >= 0 && route[i].y <= 100);
      if (i) assert.ok(Math.hypot(route[i].x - route[i - 1].x, route[i].y - route[i - 1].y) < 20);
    }
  }
});

test('Wat Arun is on the temple bank; the cross-river segment uses a ferry in either direction', () => {
  for (const [from, to] of [['temple', 'home'], ['home', 'temple']]) {
    const waypoints = Map.route(from, to);
    const ferry = waypoints.findIndex(point => point.mode === 'ferry');
    assert.ok(ferry > 0);
    assert.equal(waypoints.filter(point => point.mode === 'ferry').length, 1);
    assert.deepEqual([waypoints[ferry - 1], waypoints[ferry]].map(({x,y}) => ({x,y})).sort((a,b) => a.x-b.x), [{x:17,y:24}, {x:27,y:28}]);
  }
  assert.ok(Map.route('home', 'market').every(point => point.mode !== 'ferry'));
});

test('unknown places are rejected and returned waypoints cannot change stored positions', () => {
  assert.deepEqual(Map.route('unknown', 'home'), []);
  assert.deepEqual(Map.route('home', '__proto__'), []);
  const route = Map.route('home', 'temple');
  route[0].x = -1;
  assert.notEqual(Map.positions.home.x, -1);
  assert.ok(Map.route('home', 'temple').length > 2);
});
