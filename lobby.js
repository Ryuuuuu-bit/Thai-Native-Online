'use strict';
const L=window.ThaiNativeLobby, heroes=window.ThaiNativeBattle.roster;
const state=L.create(), $=id=>document.getElementById(id);
const portrait=art=>`<span class="portrait portrait-${art}" aria-hidden="true"></span>`;
function totals() {
  $('coins').textContent=state.coins.toLocaleString('th-TH');
  $('tickets').textContent=state.tickets;
  $('ticket-bubble').textContent=state.tickets?`✦ ตั๋วฟรีรออยู่ ${state.tickets} ใบ`:'✦ แวะมาคุยกับแม่หมอ';
  $('bag-count').textContent=Object.values(state.inventory).reduce((a,b)=>a+b,0);
}
function show(name) {
  const content={
    shop:['ลุงบุญ · ร้านของชำภูติ','ของเล็ก ๆ น้อย ๆ สำหรับการเดินทางครั้งใหญ่'],
    summon:['แม่หมอม่วง · ศาลเรียกภูติ','“มีใครบางคนกำลังรอเป็นเพื่อนกับเจ้าอยู่นะ”'],
    adventure:['ข้าวหอม · ผู้นำทาง','“แผนที่พร้อม เพื่อนพร้อม ไปด้วยกันไหม?”'],
    collection:['สมุดบันทึกภูติ','เพื่อนร่วมผจญภัยทั้ง 6 ตัวในโลก ThaiNative'],
    bag:['กระเป๋าของคุณ','ของที่ซื้อจากลุงบุญระหว่างทดลองหน้า Lobby'],
    help:['ยินดีต้อนรับสู่หมู่บ้านแสงโคม','จุดพักเล็ก ๆ ระหว่างโลกมนุษย์กับโลกของเหล่าภูติ']
  }[name];
  if(!content) return;
  $('dialog-title').textContent=content[0]; $('dialog-subtitle').textContent=content[1];
  const body=$('dialog-body');
  if(name==='shop') body.innerHTML=`<div class="shop-grid">${L.items.map(item=>`<article class="shop-item"><div class="item-art ${item.color}">${item.icon}</div><h3>${item.name}</h3><p>${item.description}</p><button class="small-button" data-buy="${item.id}" ${state.coins<item.cost?'disabled':''}>ซื้อ · ◉ ${item.cost}</button><small>ในกระเป๋า ${state.inventory[item.id]||0} ชิ้น</small></article>`).join('')}</div><p class="demo-note">ไอเทมตัวอย่างสำหรับชมร้าน ยังไม่มีผลกับการต่อสู้</p>`;
  if(name==='summon') body.innerHTML=`<div class="summon-stage"><div class="summon-orb">✦</div><span>พิธีผูกมิตรแห่งแสงจันทร์</span><h3>ใครจะเป็นเพื่อนคนใหม่?</h3><p>ใช้ตั๋วเรียกภูติฟรี 1 ใบ · เหลือ ${state.tickets} ใบ</p></div><div class="center"><button class="gold-button" data-summon ${!state.tickets?'disabled':''}>✦ เรียกภูติ 1 ครั้ง</button></div><p class="demo-note">ภูติ 6 แบบ โอกาสเท่ากันแบบละ 1 ใน 6 · อาจได้ตัวซ้ำ<br>ทดลองฟรี ไม่มีการซื้อด้วยเงินจริง</p>`;
  if(name==='adventure') body.innerHTML=`<a class="stage-card" href="battle.html"><div class="stage-art"><span>☽</span><i>บทที่ ๑</i></div><div><small>THE LANTERN FOREST</small><h3>แสงโคมในป่าลับ</h3><p>พบเหล่าผู้เฝ้าป่า และเรียนรู้พลังของทีมภูติทั้งห้า</p><span class="stage-tag">5 vs 5 · ด่านทดลอง</span></div><b>→</b></a><a class="gold-button adventure-link" href="battle.html">ออกผจญภัย →</a>`;
  if(name==='collection') body.innerHTML=`<div class="collection-grid">${heroes.map(h=>`<article><div class="collection-portrait">${portrait(h.art)}</div><h3>${h.name}</h3><small>${h.role}</small><p>${h.description}</p><span>อัญเชิญแล้ว ${state.spirits[h.key]||0} ครั้ง</span></article>`).join('')}</div><p class="demo-note">ด่านทดลองเปิดให้จัดทีมจากทั้ง 6 ตัวได้เลย ไม่ต้องสุ่มก่อน</p>`;
  if(name==='bag') {const owned=L.items.filter(item=>state.inventory[item.id]);body.innerHTML=owned.length?`<div class="bag-list">${owned.map(item=>`<div><span class="item-art ${item.color}">${item.icon}</span><b>${item.name}</b><strong>×${state.inventory[item.id]}</strong></div>`).join('')}</div><p class="demo-note">ไอเทมตัวอย่างยังไม่มีผลกับการต่อสู้</p>`:'<div class="empty-bag">♧<h3>กระเป๋ายังว่างอยู่เลย</h3><p>แวะทักทายลุงบุญที่ร้านของชำก่อนสิ</p><button class="small-button" data-panel="shop">ไปร้านขายของ →</button></div>';}
  if(name==='help') body.innerHTML='<div class="help-copy"><p><b>ลุงบุญ</b> ดูแลร้านของชำและเครื่องรางเล็ก ๆ น้อย ๆ</p><p><b>แม่หมอม่วง</b> หมอผีสาวผู้ช่วยผูกมิตรกับภูติ ใช้ตั๋วฟรีทดลองสุ่มได้</p><p><b>ข้าวหอม</b> ผู้นำทางที่จะพาทีมของคุณออกผจญภัย</p><p>นี่คือแบบทดลอง Lobby เงิน ตั๋ว และของสะสมจะเริ่มใหม่เมื่อรีเฟรชหรือออกจากหน้านี้</p></div>';
  $('panel-message').textContent='';
  if(!$('npc-dialog').open) $('npc-dialog').showModal();
}
document.addEventListener('click',event=>{
  const open=event.target.closest('[data-panel]'); if(open) show(open.dataset.panel);
  const buy=event.target.closest('[data-buy]');
  if(buy && L.buy(state,buy.dataset.buy)) {window.ThaiNativeSounds.play('purchase');const item=L.items.find(i=>i.id===buy.dataset.buy);totals();show('shop');$('panel-message').textContent=`เก็บ ${item.name} ลงกระเป๋าแล้ว!`;}
  if(event.target.closest('[data-summon]')) {
    const key=L.summon(state,heroes.map(h=>h.key));if(!key)return;
    window.ThaiNativeSounds.play('summon');
    const h=heroes.find(h=>h.key===key);totals();
    $('dialog-body').innerHTML=`<div class="summon-result"><span class="result-eyebrow">เพื่อนใหม่จากแสงจันทร์</span><div class="summoned-portrait">${portrait(h.art)}</div><h3>${h.name}</h3><p>${h.role} · ${h.skill}</p><small>อัญเชิญตัวนี้แล้ว ${state.spirits[key]} ครั้ง</small></div><div class="center"><button class="gold-button" data-panel="summon">${state.tickets?'เรียกเพื่อนอีกครั้ง · เหลือ '+state.tickets+' ใบ':'กลับศาลเรียกภูติ'}</button><button class="text-button" data-panel="collection">เปิดสมุดบันทึกภูติ →</button></div>`;
    $('panel-message').textContent=`ยินดีต้อนรับ ${h.name}!`;
  }
});
$('close-dialog').onclick=()=>$('npc-dialog').close();
totals();
