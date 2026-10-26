(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./fashion-catalog.js'));else root.NativeRPG=factory(root.NativeFashion);})(typeof globalThis!=='undefined'?globalThis:this,F=>{
  'use strict';
  const gear=[
    {id:'talisman',slot:'weapon',name:'ยันต์จันทร์เสี้ยว',icon:'✦',attack:54,cost:0,desc:'อาคมสมดุล เหมาะกับการฝึกยิง'},
    {id:'flame',slot:'weapon',name:'หม้อเพลิงภูติ',icon:'♨',attack:65,cost:650,desc:'เพิ่มพลังโจมตี กระสุนเพลิงสีอำพัน'},
    {id:'lotus',slot:'weapon',name:'บัวประกายแก้ว',icon:'❀',attack:60,cost:500,desc:'พลังจากบึงจันทร์ กระสุนสีหยก'},
    {id:'cloth',slot:'armor',name:'เสื้อเดินป่า',icon:'♧',hp:0,armor:0,cost:0,desc:'ชุดเริ่มต้นของนักเดินทาง'},
    {id:'robe',slot:'armor',name:'อาภรณ์คุ้มวิญญาณ',icon:'◈',hp:60,armor:5,cost:550,desc:'พลังชีวิต +60 · ลดความเสียหาย 5'},
    {id:'thread',slot:'charm',name:'สายสิญจน์ข้อมือ',icon:'∞',hp:20,cost:0,desc:'พลังชีวิต +20'},
    {id:'moon',slot:'charm',name:'จี้จันทรา',icon:'☽',hp:50,cost:400,desc:'พลังชีวิต +50'}
  ];
  const outfits=[{id:'ranger',name:'นักเดินทางพงไพร',art:'guide',cost:0},{id:'medium',name:'ผู้ใช้มนตร์จันทรา',art:'medium',cost:0},{id:'jade',name:'ผู้พิทักษ์หยก',art:'guide',cost:300,tint:0x80efd4},...F.outfits];
  const appearanceOptions={gender:{male:'ชาย',female:'หญิง'},face:{bright:'ตากลมสดใส',calm:'สุขุมนุ่มนวล',joy:'ยิ้มแย้ม'},hair:{crop:'ผมสั้นซอย',bob:'บ๊อบมน',tails:'แกละคู่',long:'ผมยาว'},head:{none:'ไม่สวม',flower:'ดอกจำปี',ribbon:'โบผูกผม',crown:'กระบังจันทร์',cat:'หูแมวภูติ'}};
  const appearanceDefaults={gender:'female',face:'bright',hair:'tails',head:'flower',outfit:'ranger',skinColor:'#f4c6a2',hairColor:'#62405c',outfitColor:'#688f83',accentColor:'#efc775',headColor:'#f4a7c4'};
  function appearance(p){return {...appearanceDefaults,...p.appearance,outfit:p.outfit||p.appearance?.outfit||'ranger'};}
  function validateAppearance(value){
    if(!value||typeof value!=='object'||Array.isArray(value))throw Error('รูปลักษณ์ไม่ถูกต้อง');
    const clean={};for(const [key,choices] of Object.entries(appearanceOptions)){if(!Object.hasOwn(choices,value[key]))throw Error('ตัวเลือกรูปลักษณ์ไม่ถูกต้อง');clean[key]=value[key];}
    const outfit=outfits.find(o=>o.id===value.outfit);if(!outfit)throw Error('ไม่พบชุด');if(outfit.gender&&outfit.gender!==clean.gender)throw Error('ชุดไม่ตรงกับตัวละครชายหรือหญิง');clean.outfit=value.outfit;
    for(const key of ['skinColor','hairColor','outfitColor','accentColor','headColor']){if(typeof value[key]!=='string'||!/^#[0-9a-f]{6}$/i.test(value[key]))throw Error('สีต้องเป็นรหัส HEX 6 หลัก');clean[key]=value[key].toLowerCase();}
    return clean;
  }
  function customize(p,value,name){
    const next=validateAppearance(value);if(typeof name!=='string'||name.trim().length<2||name.trim().length>18||/[\x00-\x1f<>]/.test(name))throw Error('ใช้ชื่อ 2–18 ตัวอักษร');
    // Validate the entire draft before spending coins or changing the saved character.
    wearOutfit(p,next.outfit,next.gender);p.appearance=next;p.name=name.trim();p.characterCreated=true;return 'บันทึกตัวละครแล้ว';
  }
  const stages=[{id:'grove',name:'ป่าโคมวิญญาณ',subtitle:'บทที่ ๑ · เสียงกระซิบใต้แสงจันทร์',hp:155,enemies:1,attack:33,gold:180,stones:3,xp:65},{id:'shrine',name:'ศาลร้างจันทรา',subtitle:'บทที่ ๒ · ผู้เฝ้าศาลโบราณ',hp:190,enemies:2,attack:39,gold:280,stones:4,xp:95},{id:'eclipse',name:'ราชันเงาจันทร์',subtitle:'บทที่ ๓ · บททดสอบผู้ผูกวิญญาณ',hp:340,enemies:1,attack:53,gold:380,stones:6,xp:140}];
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const item=id=>gear.find(g=>g.id===id);
  const level=p=>1+Math.floor(p.xp/150);
  function profile(id,name){return {id,name,gold:1800,stones:18,xp:0,wins:0,owned:['talisman','cloth','thread'],equipment:{weapon:'talisman',armor:'cloth',charm:'thread'},upgrades:{},outfits:['ranger','medium'],outfit:'ranger',appearance:{...appearanceDefaults},characterCreated:false,cleared:[]};}
  function stats(p){return {hp:280+item(p.equipment.armor).hp+item(p.equipment.charm).hp,attack:item(p.equipment.weapon).attack+(p.upgrades[p.equipment.weapon]||0)*7,armor:item(p.equipment.armor).armor||0};}
  function upgradeCost(p,id){const n=p.upgrades[id]||0;return {gold:100+n*90,stones:2+n,chance:[1,1,.85,.7,.55][n]||0,level:n};}
  function transact(p,action,id,random=Math.random){
    const g=item(id);
    if(action==='buy') {if(!g||!g.cost||p.owned.includes(id))throw Error('ซื้อรายการนี้ไม่ได้');if(p.gold<g.cost)throw Error('เหรียญไม่เพียงพอ');p.gold-=g.cost;p.owned.push(id);return 'ซื้อ '+g.name+' แล้ว';}
    if(action==='equip'){if(!g||!p.owned.includes(id))throw Error('ยังไม่มีอุปกรณ์นี้');p.equipment[g.slot]=id;return 'สวมใส่ '+g.name+' แล้ว';}
    if(action==='upgrade'){if(!g||g.slot!=='weapon'||!p.owned.includes(id))throw Error('เลือกอาวุธที่มีอยู่ก่อน');const c=upgradeCost(p,id);if(c.level>=5)throw Error('อาวุธถึงระดับสูงสุด +5 แล้ว');if(p.gold<c.gold||p.stones<c.stones)throw Error('เหรียญหรือหินตีบวกไม่เพียงพอ');p.gold-=c.gold;p.stones-=c.stones;const success=random()<c.chance;if(success)p.upgrades[id]=c.level+1;return success?`ตีบวกสำเร็จ! ${g.name} +${c.level+1}`:'ตีบวกไม่สำเร็จ ระดับอาวุธยังเท่าเดิม';}
    if(action==='outfit')return wearOutfit(p,id,appearance(p).gender);
    throw Error('ไม่รู้จักคำสั่ง');
  }
  function wearOutfit(p,id,gender){const o=outfits.find(o=>o.id===id);if(!o)throw Error('ไม่พบชุด');if(o.gender&&o.gender!==gender)throw Error('ชุดไม่ตรงกับตัวละครชายหรือหญิง');if(!p.outfits.includes(id)){if(p.gold<o.cost)throw Error('เหรียญไม่เพียงพอ');p.gold-=o.cost;p.outfits.push(id);}p.outfit=id;if(p.appearance)p.appearance.outfit=id;if(o.gender){p.appearance={...appearance(p),gender};p.characterCreated=true;}return 'เปลี่ยนเป็น '+o.name+' แล้ว';}
  function terrain(){return Array.from({length:241},(_,i)=>492+Math.sin(i/29)*13+Math.cos(i/13)*5);}
  function ground(t,x){const index=clamp(x/5,0,240),i=Math.floor(index);return t[i]+((t[Math.min(i+1,240)]-t[i])*(index-i));}
  function trajectory(room,actor,angle,power){
    const radians=angle*Math.PI/180,speed=power*9.7,dt=1/60;
    let x=actor.x,y=ground(room.terrain,x)-43,vx=Math.cos(radians)*speed*actor.facing,vy=-Math.sin(radians)*speed;
    const points=[{x,y}];let hit=null;
    for(let i=0;i<720;i++){
      vx+=room.wind*dt;vy+=460*dt;x+=vx*dt;y+=vy*dt;
      const target=room.actors.find(a=>a.hp>0&&a.id!==actor.id&&Math.hypot(a.x-x,ground(room.terrain,a.x)-35-y)<30);
      if(i%3===0)points.push({x,y});
      if(target||y>=ground(room.terrain,x)||x<0||x>1200||y>660){hit=target?.id||null;points.push({x,y:Math.min(y,ground(room.terrain,x))});break;}
    }
    return {points,hit,impact:points.at(-1)};
  }
  function createRoom(id,mode,profiles,stageId='grove',random=Math.random){
    const stage=stages.find(s=>s.id===stageId)||stages[0],pvp=mode==='pvp';
    const actors=profiles.map((p,i)=>{const s=stats(p);return {id:p.id,name:p.name,team:pvp?i:0,x:pvp?(i?1000:200):170+i*140,facing:pvp&&i===1?-1:1,hp:pvp?300:s.hp,maxHp:pvp?300:s.hp,attack:pvp?58:s.attack,armor:pvp?0:s.armor,energy:35,shield:0,outfit:p.outfit,appearance:p.characterCreated?appearance(p):null,weapon:p.equipment.weapon,moves:0};});
    if(!pvp){for(let i=0;i<(mode==='coop'?2:stage.enemies);i++)actors.push({id:'enemy'+i,name:stage.id==='eclipse'?'ราชันเงาจันทร์':i?'ภูติเฝ้าศาล':'ภูติหลงป่า',team:1,x:850+i*210,facing:-1,hp:stage.hp*(mode==='coop'?1.35:1),maxHp:stage.hp*(mode==='coop'?1.35:1),attack:stage.attack,armor:0,energy:35,shield:0,bot:true,outfit:'enemy',weapon:'talisman',moves:0});}
    return {id,mode,stage:stage.id,terrain:terrain(),actors,turn:0,round:1,wind:Math.round((random()-.5)*40),phase:'aim',winner:null,deadline:Date.now()+35000,revision:0};
  }
  function active(room){return room.actors[room.turn];}
  function shoot(room,id,angle,power,skill='normal'){
    const a=active(room);
    if(room.phase!=='aim'||a.id!==id||a.hp<=0)throw Error('ยังไม่ใช่ตาของคุณ');
    if(!Number.isFinite(angle)||angle<10||angle>85||!Number.isFinite(power)||power<15||power>100||!['normal','burst','spirit'].includes(skill))throw Error('ค่าการยิงไม่ถูกต้อง');
    const cost=skill==='normal'?0:skill==='burst'?30:45;if(a.energy<cost)throw Error('พลังอาคมไม่เพียงพอ');a.energy-=cost;
    const flight=trajectory(room,a,angle,power),radius=skill==='burst'?115:70,damage=[];
    for(const enemy of room.actors){if(enemy.hp<=0||enemy.team===a.team)continue;const distance=Math.hypot(enemy.x-flight.impact.x,ground(room.terrain,enemy.x)-25-flight.impact.y);if(enemy.id===flight.hit||distance<radius){const factor=enemy.id===flight.hit?1.2:Math.max(.35,1-distance/radius);const amount=Math.max(5,Math.round(a.attack*factor*(skill==='spirit'?1.45:skill==='burst'?.9:1)-enemy.armor-enemy.shield));enemy.hp=Math.max(0,enemy.hp-amount);damage.push({id:enemy.id,amount});}}
    const healing=skill==='spirit'?Math.min(25,a.maxHp-a.hp):0;a.hp+=healing;
    const ix=flight.impact.x;
    if(ix>=0&&ix<=1200){room.terrain=room.terrain.map((y,i)=>Math.min(575,y+Math.max(0,1-Math.abs(i*5-ix)/radius)*18));}
    room.phase='flight';room.revision++;return {...flight,damage,healing,actor:id,skill};
  }
  function next(room,random=Math.random){
    const teams=new Set(room.actors.filter(a=>a.hp>0).map(a=>a.team));
    if(teams.size<=1){room.phase='finished';room.winner=[...teams][0]??-1;return;}
    for(let n=0;n<room.actors.length;n++){room.turn=(room.turn+1)%room.actors.length;if(room.turn===0)room.round++;if(active(room).hp>0)break;}
    const a=active(room);a.energy=Math.min(100,a.energy+20);a.shield=0;a.moves=0;room.wind=Math.round((random()-.5)*40);room.phase='aim';room.deadline=Date.now()+35000;room.revision++;
  }
  function move(room,id,direction){const a=active(room);if(room.phase!=='aim'||a.id!==id||![-1,1].includes(direction)||a.moves>=2)throw Error('ขยับไม่ได้แล้วในตานี้');const x=clamp(a.x+direction*40,70,1130);if(room.actors.some(b=>b.id!==id&&b.hp>0&&Math.abs(b.x-x)<65))throw Error('มีตัวละครขวางอยู่');a.x=x;a.moves++;room.revision++;}
  function botAim(room){const a=active(room),targets=room.actors.filter(b=>b.hp>0&&b.team!==a.team);let best={distance:Infinity,angle:45,power:60};for(let angle=25;angle<=75;angle+=5)for(let power=30;power<=100;power+=3){const shot=trajectory(room,a,angle,power);const distance=Math.min(...targets.map(t=>Math.hypot(t.x-shot.impact.x,ground(room.terrain,t.x)-25-shot.impact.y)));if(distance<best.distance)best={distance,angle,power};}return best;}
  return {gear,outfits,fashionCategories:F.categories,appearanceOptions,appearanceDefaults,appearance,validateAppearance,customize,stages,clamp,item,level,profile,stats,upgradeCost,transact,terrain,ground,trajectory,createRoom,active,shoot,next,move,botAim};
});
