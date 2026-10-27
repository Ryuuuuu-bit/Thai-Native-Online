(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./life-engine.js'));
  else root.LifeParty = factory(root.Life);
})(typeof globalThis === 'object' ? globalThis : this, function (Life) {
  'use strict';

  function score(party) {
    const totalMoney = party.players.reduce((sum, p) => sum + p.game.money, 0);
    const minEnergy = Math.min(...party.players.map(p => p.game.energy));
    const success = totalMoney >= 0 && minEnergy >= 30;
    return { success, totalMoney, minEnergy, text: `เงินรวม ${totalMoney.toLocaleString('th-TH')} ฿ · พลังต่ำสุด ${minEnergy} / 30` };
  }

  function replacePlayer(party, index, game) {
    return { ...party, players: party.players.map((p, i) => i === index ? { ...p, game } : p) };
  }

  function advance(party, rng) {
    const active = party.active, result = Life.endWeek(party.players[active].game, rng);
    if (!result.ok) return result;
    let next = replacePlayer(party, active, result.state);
    const wraps = active === next.players.length - 1;
    next = { ...next, active: wraps ? 0 : active + 1,
      week: wraps && next.week < 20 ? next.week + 1 : next.week,
      finished: wraps && next.week === 20 && result.state.finished,
      log: [`${next.players[active].name}: ${result.message}`, ...next.log].slice(0, 20) };
    return { ok: true, state: next, message: result.message };
  }

  function autoTurns(party, rng) {
    let next = party;
    while (!next.finished && next.players[next.active].ai) {
      const index = next.active, player = next.players[index];
      for (let step = 0; step < 5; step++) {
        const g = next.players[index].game;
        const job = ({ office: 'officework', minimart: 'minimartjob', sales: 'shop', rider: 'delivery' })[g.career] || 'shop';
        const preferred = g.energy < 45 ? ['rest', 'park'] : g.happiness < 50 ? ['park', 'rest'] :
          g.money >= 1500 && g.career === 'creator' ? ['content', 'park', job] :
          g.money >= 1500 && g.career === 'student' && g.skill < 4 ? ['study', job, 'park'] : [job, 'park', 'rest'];
        let acted = false;
        for (const id of preferred) {
          const action = Life.act(g, id);
          if (!action.ok) continue;
          next = replacePlayer(next, index, action.state);
          next.log = [`${player.name}: ${action.message}`, ...next.log].slice(0, 20);
          acted = true;
          break;
        }
        if (!acted) break;
      }
      const result = advance(next, rng);
      if (!result.ok) throw new Error(result.error);
      next = result.state;
    }
    return next;
  }

  function create(configs, rng = Math.random) {
    if (!Array.isArray(configs) || configs.length < 2 || configs.length > 4 || configs.every(p => p?.ai))
      throw new Error('เลือกผู้เล่น 2–4 คน และมีผู้เล่นจริงอย่างน้อย 1 คน');
    const players = configs.map((p, i) => {
      const name = typeof p?.name === 'string' && p.name.trim() ? p.name.trim().slice(0, 20) : `ผู้เล่น ${i + 1}`;
      const career = Life.careers.some(c => c.id === p?.career) ? p.career : 'office';
      return { name, career, gender: p?.gender === 'male' ? 'male' : 'female', ai: p?.ai === true, game: Life.create(name, null, career) };
    });
    return autoTurns({ players, active: 0, week: 1, finished: false, log: [] }, rng);
  }

  function act(party, id) {
    if (!party || party.finished || !party.players?.[party.active] || party.players[party.active].ai)
      return { ok: false, state: party, error: 'ยังไม่ถึงตาผู้เล่น หรือเกมจบแล้ว' };
    const result = Life.act(party.players[party.active].game, id);
    if (!result.ok) return { ...result, state: party };
    const next = replacePlayer(party, party.active, result.state);
    next.log = [`${next.players[party.active].name}: ${result.message}`, ...next.log].slice(0, 20);
    return { ok: true, state: next, message: result.message };
  }

  function endTurn(party, rng = Math.random) {
    if (!party || party.finished || !party.players?.[party.active] || party.players[party.active].ai)
      return { ok: false, state: party, error: 'ยังไม่ถึงตาผู้เล่น หรือเกมจบแล้ว' };
    const result = advance(party, rng);
    if (!result.ok) return { ...result, state: party };
    return { ...result, state: autoTurns(result.state, rng) };
  }

  return { create, act, endTurn, score };
});
