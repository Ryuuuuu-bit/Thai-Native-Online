'use strict';
const C=require('./card-catalog.js'),D=require('./card-engine.js'),W=require('./card-content.js');
function setup(g,kind,id){
  if(kind==='boss'){if(!W.bosses.some(b=>b.id===id))throw Error('ไม่พบบอส');g.players[1].maxHp=36;g.players[1].hp=36;if(id==='fire'){g.players[1].maxMana=1;g.players[1].mana=1;}return;}
  const list=kind==='lesson'?W.lessons:W.puzzles;if(!list.some(c=>c.id===id))throw Error('ไม่พบความท้าทาย');
  g.active=0;g.turn=1;g.players.forEach(p=>{p.board=[];p.hand=[];p.grave=[];p.mana=3;p.maxMana=3;});
  const ready=(s,card)=>{const u=D.spawn(g,s,card);u.sleep=false;return u;};
  const hand=card=>g.players[0].hand.push({uid:'h'+g.next++,card});
  if(kind==='lesson'){
    if(id==='summon')hand('g001');if(id==='shield'){ready(0,'g001');hand('g004');}if(id==='attack'){ready(0,'g034');ready(1,'g001');}
  }else{
    if(id==='lethal'){g.players[1].hp=3;ready(0,'g034');ready(0,'g001');ready(1,'g001');}
    if(id==='freeze'){g.players[1].hp=4;const croc=ready(0,'g059');croc.hp=3;const enemy=ready(1,'g001');enemy.hp=1;enemy.maxHp=1;hand('g053');g.players[0].mana=4;g.players[0].maxMana=4;}
    if(id==='shield'){g.players[1].hp=4;ready(0,'g034');ready(0,'g025');ready(1,'g001');hand('g004');}
  }
}
function check(r){const g=r.game;if(!r.challenge||g.phase!=='playing')return;const [kind,id]=r.challenge.split(':');
  if(kind==='lesson'){const lesson=W.lessons.find(l=>l.id===id);if(g.metrics[0][lesson.metric]>0){g.phase='finished';g.winner=0;g.revision++;g.log.push('ผ่านบทฝึกแล้ว');}}
}
function bossTurn(r){if(r.game.phase!=='playing'||r.game.active!==1)return;const id=r.boss,g=r.game,p=g.players[1];
  if(id==='wood')D.spawn(g,1,'wisp');
  if(id==='water'){const u=p.board.slice().sort((a,b)=>a.hp-b.hp)[0];if(u)u.shield=2;}
  if(id==='shadow')D.revive(g,1,2);
  if(id==='light')p.hp=Math.min(p.maxHp||36,p.hp+1);
}
function validWin(r){if(!r.challenge?.startsWith('puzzle:'))return true;const id=r.challenge.split(':')[1],p=W.puzzles.find(p=>p.id===id);return r.game.turn<=p.maxTurn&&(!p.requiresShield||r.game.metrics[0].shields>0);}
module.exports={setup,check,bossTurn,validWin};
