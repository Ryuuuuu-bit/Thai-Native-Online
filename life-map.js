(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LifeMap = factory();
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';

  // shortcut: routes are hand-placed for this fixed illustration; update them when the map art changes.
  const positions = {
    home: { x: 41, y: 79 }, market: { x: 20, y: 65 }, office: { x: 84, y: 44 },
    school: { x: 49, y: 39 }, park: { x: 70, y: 63 }, night: { x: 28, y: 72 },
    temple: { x: 14, y: 23 }, swing: { x: 37, y: 35 }, victory: { x: 66, y: 53 },
    arcade: { x: 54, y: 57 }, fortune: { x: 34, y: 49 }, minimart: { x: 47, y: 73 }
  };
  const points = {
    ...positions,
    templePier: { x: 17, y: 24 }, cityPier: { x: 27, y: 28 },
    westBridge: { x: 31, y: 32 }, westJunction: { x: 38, y: 40 },
    centreJunction: { x: 47, y: 44 }, westCircle: { x: 55, y: 43 },
    northCircle: { x: 65, y: 37 }, eastCircle: { x: 77, y: 44 },
    southCircle: { x: 58, y: 51 }, lowerJunction: { x: 57, y: 61 },
    marketJunction: { x: 27, y: 62 }, lowerStreet: { x: 33, y: 76 },
    apartmentStreet: { x: 39, y: 82 }, midStreet: { x: 47, y: 69 },
    parkStreet: { x: 66, y: 59 }, eastStreet: { x: 82, y: 49 }
  };
  const edges = [
    ['temple', 'templePier'], ['templePier', 'cityPier', 'ferry'], ['cityPier', 'westBridge'],
    ['westBridge', 'swing'], ['swing', 'westJunction'],
    ['westJunction', 'school'], ['school', 'centreJunction'], ['westJunction', 'fortune'],
    ['fortune', 'marketJunction'], ['marketJunction', 'market'], ['marketJunction', 'night'],
    ['night', 'lowerStreet'], ['lowerStreet', 'apartmentStreet'], ['apartmentStreet', 'home'],
    ['apartmentStreet', 'minimart'], ['minimart', 'midStreet'], ['midStreet', 'lowerJunction'],
    ['lowerJunction', 'arcade'], ['arcade', 'southCircle'], ['centreJunction', 'westCircle'],
    ['westCircle', 'northCircle'], ['northCircle', 'eastCircle'], ['eastCircle', 'victory'],
    ['victory', 'southCircle'], ['southCircle', 'westCircle'], ['victory', 'parkStreet'],
    ['parkStreet', 'park'], ['parkStreet', 'lowerJunction'], ['eastCircle', 'eastStreet'],
    ['eastStreet', 'office'], ['office', 'eastCircle']
  ];
  const links = Object.fromEntries(Object.keys(points).map(id => [id, []]));
  for (const [a, b, mode] of edges) { links[a].push({ id: b, mode }); links[b].push({ id: a, mode }); }

  function route(from, to) {
    if (!Object.hasOwn(positions, from) || !Object.hasOwn(positions, to)) return [];
    const distances = { [from]: 0 }, previous = {}, remaining = new Set(Object.keys(points));
    while (remaining.size) {
      let current = null;
      for (const id of remaining) if (Number.isFinite(distances[id]) && (current === null || distances[id] < distances[current])) current = id;
      if (current === null || current === to) break;
      remaining.delete(current);
      for (const { id: neighbour, mode } of links[current]) {
        if (!remaining.has(neighbour)) continue;
        const a = points[current], b = points[neighbour];
        const distance = distances[current] + Math.hypot(a.x - b.x, a.y - b.y);
        if (distance < (distances[neighbour] ?? Infinity)) { distances[neighbour] = distance; previous[neighbour] = { id: current, mode }; }
      }
    }
    if (!Number.isFinite(distances[to])) return [];
    const result = [];
    for (let id = to; id !== undefined; id = previous[id]?.id) {
      const waypoint = { ...points[id] };
      if (previous[id]?.mode) waypoint.mode = previous[id].mode;
      result.unshift(waypoint);
    }
    return result;
  }

  return { positions, route };
});
