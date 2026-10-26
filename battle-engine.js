(function(root){
'use strict';
const roster=[
{key:'guardian',name:'น้องหุ่นพยนต์',role:'พิทักษ์',hp:780,atk:85,def:32,speed:6,skill:'ยันต์คุ้มภัย',description:'มอบเกราะ 100 ให้เพื่อนทุกคน',type:'shield',art:'guardian',color:'#e9c07b'},
{key:'pret',name:'เปรตใจดี',role:'แนวหน้า',hp:950,atk:100,def:24,speed:4,skill:'ฝ่ามือโย่ง',description:'โจมตีเป้าหมายแรง 2.5 เท่า',type:'heavy',art:'pret',color:'#b7a0d9'},
{key:'ghost',name:'น้องกระสือ',role:'ดูดพลัง',hp:510,atk:150,def:10,speed:10,skill:'จุมพิตแสงจันทร์',description:'โจมตีแรง 1.8 เท่า และฟื้นชีวิตตนเอง',type:'drain',art:'ghost',color:'#eea5c8'},
{key:'tree',name:'มะลินางไม้',role:'ฟื้นฟู',hp:580,atk:80,def:16,speed:8,skill:'พรดอกไม้บาน',description:'ฟื้นชีวิต 220 ให้เพื่อนที่บาดเจ็บที่สุด 2 คน',type:'heal',art:'tree',color:'#a3c7a2'},
{key:'tiger',name:'เจ้าสมิงน้อย',role:'จู่โจม',hp:630,atk:140,def:14,speed:12,skill:'ตะปบพงไพร',description:'โจมตีศัตรูแนวหน้าทุกตัวแรง 1.5 เท่า',type:'sweep',art:'tiger',color:'#eeb87d'},
{key:'sigil',name:'ยันต์จอมซน',role:'เวทหมู่',hp:470,atk:155,def:8,speed:9,skill:'ประกายอาคม',description:'โจมตีศัตรูทุกตัวแรง 0.9 เท่า',type:'aoe',art:'sigil',color:'#e7cb7e'}];
const alive=team=>team.filter(h=>h.hp>0);
function create(keys=roster.slice(0,5).map(h=>h.key)){
 if(keys.length!==5||new Set(keys).size!==5||keys.some(k=>!roster.some(h=>h.key===k)))throw new Error('Choose five unique heroes');
 const make=(key,i,enemy)=>{const base=roster.find(h=>h.key===key);return {...base,id:(enemy?'e':'p')+i,maxHp:base.hp,energy:0,shield:0,front:i<2};};
 return {player:keys.map((k,i)=>make(k,i,false)),enemy:['pret','guardian','sigil','ghost','tiger'].map((k,i)=>make(k,i,true)),round:0,queue:[],winner:null,log:['การประลองใต้แสงโคมกำลังจะเริ่ม!'],last:null};
}
function note(s,text){s.log.unshift(text);s.log.length=Math.min(8,s.log.length);}
function finish(s){if(!alive(s.player).length||!alive(s.enemy).length)s.winner=alive(s.player).length?'player':'enemy';}
function hurt(target,amount){const raw=Math.max(1,Math.round(amount)-target.def),blocked=Math.min(target.shield,raw);target.shield-=blocked;const damage=Math.min(target.hp,raw-blocked);target.hp-=damage;return damage;}
function targets(s,who){const live=alive(s[who==='player'?'enemy':'player']),front=live.filter(h=>h.front);return front.length?front:live;}
function skill(s,who,id){
 const hero=s[who]?.find(h=>h.id===id);if(s.winner||!hero||hero.hp<=0||hero.energy<3)return false;
 hero.energy=0;const allies=alive(s[who]),enemies=alive(s[who==='player'?'enemy':'player']),target=targets(s,who)[0];let affected=[];
 if(hero.type==='heal'){affected=[...allies].sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp).slice(0,2);affected.forEach(h=>h.hp=Math.min(h.maxHp,h.hp+220));}
 else if(hero.type==='shield'){affected=allies;affected.forEach(h=>h.shield=Math.min(200,h.shield+100));}
 else{affected=hero.type==='aoe'?enemies:hero.type==='sweep'?targets(s,who):[target];let damage=0;affected.forEach(h=>damage+=hurt(h,hero.atk*(hero.type==='heavy'?2.5:hero.type==='drain'?1.8:hero.type==='sweep'?1.5:0.9)));if(hero.type==='drain')hero.hp=Math.min(hero.maxHp,hero.hp+Math.round(damage*.65));}
 note(s,`${who==='player'?'ทีมเรา':'ศัตรู'} · ${hero.name} ใช้ ${hero.skill}`);s.last={actor:id,targets:affected.map(h=>h.id),skill:true,type:hero.type};finish(s);return true;
}
function tick(s,autoSkills=true){
 if(s.winner)return false;
 if(!s.queue.length){s.round++;s.queue=[...alive(s.player),...alive(s.enemy)].sort((a,b)=>b.speed-a.speed||a.id.localeCompare(b.id)).map(h=>h.id);}
 const id=s.queue.shift(),who=id[0]==='p'?'player':'enemy',hero=s[who].find(h=>h.id===id);if(!hero||hero.hp<=0)return tick(s,autoSkills);
 if(hero.energy===3&&(who==='enemy'||autoSkills))return skill(s,who,id);
 const target=targets(s,who)[0],damage=hurt(target,hero.atk);hero.energy=Math.min(3,hero.energy+1);s.last={actor:id,targets:[target.id],skill:false,type:'attack'};note(s,`${hero.name} โจมตี ${target.name} · ${damage}`);finish(s);return true;
}
const api={roster,create,tick,skill};if(typeof module!=='undefined')module.exports=api;else root.ThaiNativeBattle=api;
})(typeof window!=='undefined'?window:globalThis);
