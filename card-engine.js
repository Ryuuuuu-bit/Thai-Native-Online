(function(root,factory){const api=factory(typeof module==='object'?require('./card-catalog.js'):root.NativeCards);if(typeof module==='object')module.exports=api;else root.NativeDuel=api;})(typeof window!=='undefined'?window:globalThis,C=>{
'use strict';
const info=u=>C.byId[u.card],num=u=>info(u).number,op=s=>1-s;
function random(g){let x=g.seed;x^=x<<13;x^=x>>>17;x^=x<<5;g.seed=x>>>0;return g.seed/4294967296;}
function shuffled(g,list){const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(random(g)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const living=p=>p.board.filter(u=>u.hp>0);
const awake=(g,u)=>u.hp>0&&!(u.sealed>=g.turn);
const frozen=(g,u)=>u.frozen>=g.turn;
const units=(g,s,n)=>living(g.players[s]).filter(u=>num(u)===n&&awake(g,u));
const low=list=>list.slice().sort((a,b)=>a.hp-b.hp)[0];
const wounded=list=>list.slice().sort((a,b)=>(b.maxHp-b.hp)-(a.maxHp-a.hp))[0];
function log(g,text){g.log.push(text);if(g.log.length>35)g.log.shift();}
function heal(g,u,n){if(u){const actual=Math.max(0,Math.min(n,u.maxHp-u.hp));u.hp+=actual;g.metrics[u.owner].healing+=actual;}}
function healPlayer(g,s,n){const p=g.players[s],actual=Math.max(0,Math.min(n,(p.maxHp||30)-p.hp));p.hp+=actual;g.metrics[s].healing+=actual;}
function boost(g,u,n,duration=2){if(u)u.buffs.push({n,until:g.turn+duration});}
function shield(g,u){if(!u)return;g.metrics[u.owner].shields++;u.shield=2;if(num(u)===90&&awake(g,u))boost(g,u,1,g.active===u.owner?2:1);}
function hurt(g,u,n,kind='ability',source=null){
  if(!u||u.hp<=0)return 0;
  const initial=n;
  if(awake(g,u)){
    if(kind==='ability'&&num(u)===52)n--;
    if(kind==='attack'&&num(u)===62&&u.hp===u.maxHp)n--;
  }
  if(kind==='ability'&&u.shield&&units(g,u.owner,91).some(a=>a!==u))n--;
  n=Math.max(0,n);if(n&&u.shield){n=Math.max(0,n-u.shield);u.shield=0;}
  const dealt=Math.min(u.hp,n);g.metrics[op(u.owner)].damage+=Math.max(0,dealt);g.metrics[u.owner].blocked+=Math.max(0,initial-n);u.hp-=n;
  if(u.hp<=0){u.killer=source;u.deathKind=kind;if(kind==='attack'&&units(g,u.owner,16).some(a=>a!==u)&&g.players[u.owner].savedAt!==g.turn){g.players[u.owner].savedAt=g.turn;u.hp=1;log(g,'ยายเฝ้าเรือนช่วยเพื่อนให้เหลือชีวิต 1');}}
  return dealt;
}
function hurtPlayer(g,s,n,kind='ability'){
  const p=g.players[s];if(n<=0)return 0;const initial=n;
  if(kind==='cost'||kind==='fatigue'){const dealt=Math.min(Math.max(0,p.hp),n);p.hp-=n;return dealt;}
  if(kind==='ability'&&units(g,s,99).length&&p.preventAt!==g.turn){p.preventAt=g.turn;n=Math.max(0,n-2);}
  g.metrics[s].blocked+=initial-n;
  const guard=units(g,s,78)[0];if(guard&&p.redirectAt!==g.turn&&n>0){p.redirectAt=g.turn;hurt(g,guard,n,kind);return 0;}
  const dealt=Math.min(Math.max(0,p.hp),n);p.hp-=n;g.metrics[op(s)].damage+=dealt;return dealt;
}
function hand(g,s,id){const p=g.players[s];if(p.hand.length>=10){p.grave.push(id);log(g,`${p.name} มือเต็ม การ์ดถูกส่งลงสุสาน`);}else p.hand.push({uid:'h'+g.next++,card:id});}
function draw(g,s,n=1){const p=g.players[s];for(let i=0;i<n;i++){const id=p.deck.shift();if(id)hand(g,s,id);else{p.fatigue++;hurtPlayer(g,s,p.fatigue,'fatigue');log(g,`${p.name} เด็คหมด รับความเหนื่อยล้า ${p.fatigue}`);}}}
function mill(g,s,n){const p=g.players[s];for(let i=0;i<n&&p.deck.length;i++)p.grave.push(p.deck.shift());}
function spawn(g,s,id){const p=g.players[s];if(p.board.length>=5)return null;const c=C.byId[id];const u={uid:'u'+g.next++,card:id,owner:s,atk:c.atk,hp:c.hp,maxHp:c.hp,shield:0,frozen:0,sealed:0,sleep:true,attacks:0,direct:0,buffs:[],growth:0};p.board.push(u);return u;}
function revive(g,s,maxCost,faction=null){const p=g.players[s];if(p.board.length>=5)return null;const ix=p.grave.findIndex(id=>C.byId[id].cost<=maxCost&&(!faction||C.byId[id].faction===faction));if(ix<0)return null;return spawn(g,s,p.grave.splice(ix,1)[0]);}
function retrieve(g,s,maxCost){const p=g.players[s],ix=p.grave.findIndex(id=>C.byId[id].cost<=maxCost);if(ix>=0)hand(g,s,p.grave.splice(ix,1)[0]);}
function bounce(g,u){if(!u)return;const p=g.players[u.owner],ix=p.board.indexOf(u);if(ix<0)return;p.board.splice(ix,1);if(u.card!=='wisp')hand(g,u.owner,u.card);if(awake(g,u)&&num(u)===45)healPlayer(g,u.owner,2);if(p.bouncedAt!==g.turn){p.bouncedAt=g.turn;units(g,u.owner,49).forEach(a=>shield(g,a));}log(g,info(u).name+' กลับขึ้นมือ');}
function kill(g,u){if(u){u.hp=0;u.deathKind='sacrifice';}}
function settle(g){
  let steps=0;
  while(g.players.some(p=>p.board.some(u=>u.hp<=0))){
    if(++steps>80)throw Error('ขีดจำกัดการทำงานของความสามารถ');
    for(let s=0;s<2;s++){
      const p=g.players[s],dead=p.board.filter(u=>u.hp<=0);p.board=p.board.filter(u=>u.hp>0);
      for(const u of dead){
        if(u.card!=='wisp')p.grave.push(u.card);log(g,info(u).name+' กลับสู่สุสาน');
        units(g,s,8).forEach(()=>healPlayer(g,s,1));units(g,s,69).forEach(a=>heal(g,a,1));if(u.card==='wisp')units(g,s,19).forEach(()=>hurtPlayer(g,op(s),1));
        if(u.sealed>=g.turn)continue;
        switch(num(u)){
          case 2:heal(g,wounded(living(p)),2);break;
          case 3:spawn(g,s,'wisp');break;
          case 11:retrieve(g,s,1);break;
          case 24:if(u.deathKind==='attack')hurt(g,find(g,u.killer),2);break;
          case 30:case 64:hurtPlayer(g,op(s),1);break;
          case 41:if(u.deathKind==='attack'){const a=find(g,u.killer);if(a)a.frozen=g.turn+(g.active===a.owner?2:1);}break;
          case 43:{const top=p.deck.splice(0,2);top.sort((a,b)=>C.byId[a].cost-C.byId[b].cost);p.deck.unshift(...top);break;}
          case 61:mill(g,s,1);break;
          case 70:retrieve(g,s,2);break;
          case 73:spawn(g,s,'wisp');spawn(g,s,'wisp');break;
          case 76:revive(g,s,2,'shadow');break;
          case 82:shield(g,low(living(p)));break;
        }
      }
    }
  }
  const dead=g.players.map(p=>p.hp<=0);if(dead.some(Boolean)){g.winner=dead[0]&&dead[1]?'draw':dead[0]?1:0;g.phase='finished';log(g,g.winner==='draw'?'เสมอ':g.players[g.winner].name+' ชนะการประลอง');}
}
function find(g,uid){for(const p of g.players){const u=p.board.find(u=>u.uid===uid);if(u)return u;}return null;}
function attackPower(g,u){let n=u.atk+u.buffs.filter(b=>b.until>=g.turn).reduce((a,b)=>a+b.n,0);if(u.card==='wisp')n+=units(g,u.owner,10).length;if(num(u)===32&&awake(g,u)&&living(g.players[u.owner]).length>=3)n++;return Math.max(0,n);}
const targetRules={4:'ally',9:'ally',26:'enemy',29:'shieldEnemy',33:'woundedEnemy',42:'waterAlly',46:'enemy',47:'cheapEnemy',48:'ally',53:'enemy',54:'cheapAny',56:'shieldEnemy',68:'tokenAlly',72:'enemy',74:'ally',75:'enemy',83:'ally',86:'ally',88:'enemy',89:'ally',97:'enemy'};
function protectedUnit(g,u){const board=g.players[u.owner].board,i=board.indexOf(u);return [board[i-1],board[i+1]].some(a=>a&&num(a)===93&&awake(g,a));}
function targets(g,s,id){
  const rule=targetRules[C.byId[id]?.number];if(!rule)return [];
  const ally=living(g.players[s]),enemy=living(g.players[op(s)]).filter(u=>!protectedUnit(g,u));
  const pool=rule==='cheapAny'?[...ally,...enemy]:rule.includes('Enemy')||rule==='enemy'?enemy:ally;
  return pool.filter(u=>rule==='shieldEnemy'?u.shield>0:rule==='woundedEnemy'?u.hp<u.maxHp:rule==='waterAlly'?info(u).faction==='water':rule==='cheapEnemy'?info(u).cost<=3:rule==='cheapAny'?info(u).cost<=2:rule==='tokenAlly'?u.card==='wisp':true).map(u=>u.uid);
}
function enter(g,s,u,t){
  const p=g.players[s],other=g.players[op(s)],allies=()=>living(p).filter(a=>a!==u),foes=()=>living(other);
  switch(num(u)){
    case 1:healPlayer(g,s,1);break;
    case 4:shield(g,t);break;
    case 7:if(allies().some(a=>info(a).faction==='wood'))spawn(g,s,'wisp');break;
    case 9:heal(g,t,3);break;
    case 13:spawn(g,s,'wisp');spawn(g,s,'wisp');break;
    case 15:draw(g,s,p.hp===30?2:1);break;
    case 18:revive(g,s,2,'wood');break;
    case 20:while(p.board.length<5)spawn(g,s,'wisp');living(p).forEach(a=>heal(g,a,3));break;
    case 21:if(allies().some(a=>info(a).faction==='fire'))shield(g,u);break;
    case 23:if(p.deck.length&&C.byId[p.deck[0]].cost>p.maxMana)p.deck.push(p.deck.shift());break;
    case 26:hurt(g,t,1);break;
    case 27:{const top=p.deck.splice(0,3),i=top.findIndex(id=>C.byId[id].faction==='fire');if(i>=0)hand(g,s,top.splice(i,1)[0]);p.deck.push(...top);break;}
    case 29:hurt(g,t,2);break;
    case 31:if(other.hand.length)p.revealed={card:other.hand[Math.floor(random(g)*other.hand.length)].card,until:g.turn};break;
    case 33:hurt(g,t,3);break;
    case 37:allies().filter(a=>info(a).faction==='fire').forEach(a=>shield(g,a));break;
    case 40:foes().forEach(a=>hurt(g,a,2));shield(g,u);break;
    case 42:heal(g,t,1);break;
    case 44:if(p.deck.length&&C.byId[p.deck[0]].faction==='water')draw(g,s);break;
    case 46:boost(g,t,-1,1);break;
    case 47:case 53:if(t)t.frozen=g.turn+1;break;
    case 48:if(t){bounce(g,t);healPlayer(g,s,2);}break;
    case 51:living(p).forEach(a=>heal(g,a,1));break;
    case 54:bounce(g,t);break;
    case 56:if(t&&t.shield){t.shield=0;shield(g,low(allies())||u);}break;
    case 57:foes().sort((a,b)=>a.hp-b.hp).slice(0,2).forEach(a=>a.frozen=g.turn+1);break;
    case 60:{const a=foes().filter(a=>info(a).cost<=4).sort((a,b)=>attackPower(g,b)-attackPower(g,a))[0];bounce(g,a);const b=foes().sort((a,b)=>attackPower(g,b)-attackPower(g,a))[0];if(b)b.frozen=g.turn+1;break;}
    case 63:hurtPlayer(g,s,1,'cost');draw(g,s);break;
    case 65:if(p.grave.length>=3)shield(g,u);break;
    case 66:mill(g,s,2);break;
    case 68:if(t){kill(g,t);draw(g,s,2);}break;
    case 72:if(t)t.sealed=g.turn+1;break;
    case 74:if(t){kill(g,t);u.atk+=2;u.maxHp+=2;u.hp+=2;}break;
    case 75:if(t)t.sealed=g.turn+1;hurtPlayer(g,s,1,'cost');break;
    case 77:if(p.grave.length>=6)draw(g,s,2);break;
    case 79:revive(g,s,3);hurtPlayer(g,s,2,'cost');break;
    case 80:{let budget=4;for(let i=0;i<2;i++){const a=revive(g,s,budget,'shadow');if(!a)break;budget-=info(a).cost;}hurtPlayer(g,s,3,'cost');break;}
    case 81:if(!allies().length)shield(g,u);break;
    case 83:if(t)t.frozen=0;break;
    case 84:healPlayer(g,s,2);break;
    case 85:if(allies().some(a=>info(a).faction==='light'))shield(g,u);break;
    case 86:if(t)t.sealed=0;break;
    case 87:spawn(g,s,'wisp');break;
    case 88:if(t)t.shield=0;break;
    case 89:if(t){t.frozen=0;t.sealed=0;}break;
    case 92:if(p.hp<=15)healPlayer(g,s,3);break;
    case 94:allies().sort((a,b)=>a.hp-b.hp).slice(0,2).forEach(a=>shield(g,a));break;
    case 97:if(t)t.sealed=g.turn+1;shield(g,u);break;
    case 100:living(p).forEach(a=>{a.frozen=0;a.sealed=0;shield(g,a);});break;
  }
  units(g,op(s),12).forEach(a=>{if(a.triggerAt!==g.turn){a.triggerAt=g.turn;boost(g,u,-1,0);}});
  if(info(u).faction==='fire')units(g,s,35).filter(a=>a!==u).forEach(()=>boost(g,u,1,2));
}
function startTurn(g,s,first=false){g.active=s;const p=g.players[s];p.maxMana=Math.min(8,p.maxMana+1);p.mana=p.maxMana;p.board.forEach(u=>{u.sleep=false;u.attacks=0;u.direct=0;u.buffs=u.buffs.filter(b=>b.until>=g.turn);});units(g,s,98).forEach(()=>shield(g,low(living(p))));if(!first)draw(g,s);settle(g);}
function create(players,seed=Date.now()){
  if(!Array.isArray(players)||players.length!==2)throw Error('ต้องมีผู้เล่นสองฝ่าย');
  const decks=players.map(p=>C.validateDeck(p.deck));const g={players:[],seed:(seed>>>0)||1,next:1,turn:1,active:0,phase:'playing',winner:null,revision:0,metrics:Array.from({length:2},()=>({damage:0,healing:0,blocked:0,summons:0,attacks:0,shields:0,played:{},factions:{}})),log:['คืนปลุกวิญญาณเริ่มขึ้น · ผู้เล่นแรกไม่จั่วในเทิร์นแรก']};
  g.players=players.map((p,i)=>({id:p.id,name:p.name,hp:30,mana:0,maxMana:0,hand:[],deck:shuffled(g,decks[i]),grave:[],board:[],fatigue:0}));
  draw(g,0,5);draw(g,1,5);startTurn(g,0,true);return g;
}
function assertTurn(g,s){if(g.phase!=='playing'||s!==g.active)throw Error('ยังไม่ใช่เทิร์นของคุณ');}
function play(g,s,handUid,targetUid=null){
  assertTurn(g,s);const p=g.players[s],ix=p.hand.findIndex(c=>c.uid===handUid);if(ix<0)throw Error('ไม่มีการ์ดใบนี้ในมือ');const card=C.byId[p.hand[ix].card];
  if(p.board.length>=5)throw Error('สนามเต็มแล้ว สูงสุด 5 ตัว');if(card.cost>p.mana)throw Error('พลังอาคมไม่พอ');
  const eligible=targets(g,s,card.id);if(targetUid!==null&&!eligible.includes(targetUid))throw Error('เป้าหมายไม่ถูกต้อง');const target=find(g,targetUid||eligible[0]);
  g.metrics[s].summons++;g.metrics[s].played[card.id]=(g.metrics[s].played[card.id]||0)+1;g.metrics[s].factions[card.faction]=(g.metrics[s].factions[card.faction]||0)+1;p.mana-=card.cost;p.hand.splice(ix,1);const u=spawn(g,s,card.id);log(g,p.name+' อัญเชิญ '+card.name);enter(g,s,u,target);settle(g);g.revision++;return g;
}
function canAttack(g,u){return g.phase==='playing'&&g.active===u.owner&&u.hp>0&&!u.sleep&&!frozen(g,u)&&u.attacks<(num(u)===38&&awake(g,u)?2:1)&&attackPower(g,u)>0&&(living(g.players[op(u.owner)]).length>0||!u.direct);}
function attack(g,s,uid,targetUid){
  assertTurn(g,s);const a=find(g,uid);if(!a||a.owner!==s||!canAttack(g,a))throw Error('ภูตินี้ยังโจมตีไม่ได้');const direct=targetUid==='player',b=direct?null:find(g,targetUid);
  if(direct&&(living(g.players[op(s)]).length||a.direct))throw Error('ต้องกำจัดภูติศัตรูก่อน');if(!direct&&(!b||b.owner===s||b.hp<=0))throw Error('เป้าหมายโจมตีไม่ถูกต้อง');
  g.metrics[s].attacks++;a.attacks++;log(g,info(a).name+' โจมตี '+(direct?g.players[op(s)].name:info(b).name));
  if(direct){a.direct++;const dealt=hurtPlayer(g,op(s),attackPower(g,a)+(num(a)===25&&awake(g,a)?1:0),'attack');if(num(a)===67&&awake(g,a))healPlayer(g,s,Math.min(3,dealt));}
  else{
    const power=attackPower(g,a)+(awake(g,a)&&((num(a)===28&&b.hp<b.maxHp)||(num(a)===50&&frozen(g,b)))?1:0),counter=attackPower(g,b),oldHp=b.hp,wasFrozen=frozen(g,b);
    hurt(g,b,power,'attack',a.uid);hurt(g,a,counter,'attack',b.uid);
    if(a.hp>0&&num(a)===36&&awake(g,a)&&a.growth<3){a.growth++;a.atk++;}
    if(b.hp>0&&num(b)===36&&awake(g,b)&&b.growth<3){b.growth++;b.atk++;}
    if(b.hp<=0){
      if(awake(g,a)){if(num(a)===22)heal(g,a,1);if(num(a)===34)hurtPlayer(g,op(s),2);if(num(a)===59&&wasFrozen)hurtPlayer(g,op(s),Math.max(0,power-oldHp));}
      units(g,s,39).forEach(u=>{if(u.triggerAt!==g.turn){u.triggerAt=g.turn;draw(g,s);}});
      units(g,s,95).forEach(u=>{if(u.triggerAt!==g.turn){u.triggerAt=g.turn;u.triggerCount=0;}if(u.triggerCount<2){u.triggerCount++;healPlayer(g,s,1);}});
    }
  }
  if(num(a)===71&&awake(g,a)&&a.attacks===1)shield(g,a);settle(g);g.revision++;return g;
}
function end(g,s){
  assertTurn(g,s);const p=g.players[s];
  for(const u of living(p).slice()){if(!awake(g,u))continue;switch(num(u)){
    case 5:if(living(p).length>=3)healPlayer(g,s,1);break;
    case 6:heal(g,wounded(living(p).filter(a=>a!==u)),1);break;
    case 14:living(p).filter(a=>a.card==='wisp').forEach(a=>shield(g,a));break;
    case 17:living(p).forEach(a=>heal(g,a,2));break;
    case 55:if(living(g.players[op(s)]).some(a=>frozen(g,a)))draw(g,s);break;
    case 58:if(living(p).filter(a=>info(a).faction==='water').length>=3)healPlayer(g,s,2);break;
    case 96:if(living(p).some(a=>a.shield>0))draw(g,s);break;
  }}
  settle(g);if(g.phase==='playing'){g.turn++;startTurn(g,op(s));log(g,'เทิร์น '+g.turn+' · '+g.players[g.active].name);}g.revision++;return g;
}
function concede(g,s){if(g.phase!=='playing')throw Error('การต่อสู้จบแล้ว');g.winner=op(s);g.phase='finished';g.revision++;log(g,g.players[s].name+' ยอมแพ้');}
function view(g,s){return {turn:g.turn,active:g.active,phase:g.phase,winner:g.winner,revision:g.revision,you:s,log:g.log.slice(-12),players:g.players.map((p,i)=>({id:p.id,name:p.name,hp:Math.max(0,p.hp),maxHp:p.maxHp||30,mana:p.mana,maxMana:p.maxMana,handCount:p.hand.length,deckCount:p.deck.length,grave:p.grave.slice(),board:p.board.map(u=>({...u,power:attackPower(g,u),ready:canAttack(g,u),frozen:frozen(g,u),sealed:u.sealed>=g.turn})),...(i===s?{hand:p.hand.map(c=>({...c})),revealed:p.revealed&&p.revealed.until>=g.turn?p.revealed.card:null}:{})}))};}
function bot(g,s){
  assertTurn(g,s);const p=g.players[s];let steps=0;
  while(g.phase==='playing'&&steps++<30){
    const card=p.board.length<5?p.hand.filter(h=>C.byId[h.card].cost<=p.mana).sort((a,b)=>C.byId[b.card].cost-C.byId[a.card].cost)[0]:null;
    if(card){play(g,s,card.uid);continue;}
    const a=p.board.find(u=>canAttack(g,u));if(!a)break;
    const enemies=living(g.players[op(s)]),target=enemies.slice().sort((x,y)=>{const score=b=>(b.hp<=attackPower(g,a)?20:0)+(attackPower(g,b)<a.hp?8:0)-b.hp;return score(y)-score(x);})[0];attack(g,s,a.uid,target?target.uid:'player');
  }
  if(g.phase==='playing')end(g,s);
}
return {create,play,attack,end,concede,view,bot,targets,attackPower,canAttack,spawn,revive};
});
