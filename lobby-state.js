(function(root) {
  'use strict';
  const items = [
    { id:'potion', name:'น้ำค้างคืนเพ็ญ', icon:'⚗', cost:120, description:'ขวดยาฟื้นพลังหอมกลิ่นดอกมะลิ', color:'rose' },
    { id:'charm', name:'เครื่องรางใบโพธิ์', icon:'❧', cost:180, description:'ของนำโชคจากป่าของเหล่านางไม้', color:'mint' },
    { id:'incense', name:'ธูปหอมเรียกขวัญ', icon:'♨', cost:250, description:'กลิ่นอบอุ่นสำหรับคืนที่ต้องออกเดินทาง', color:'gold' }
  ];
  const create = () => ({ coins:1200, tickets:3, inventory:{}, spirits:{} });
  function buy(state,id) {
    const item=items.find(item=>item.id===id);
    if(!item || state.coins<item.cost) return false;
    state.coins-=item.cost;
    state.inventory[id]=(state.inventory[id]||0)+1;
    return true;
  }
  function summon(state,keys,random=Math.random) {
    if(state.tickets<1 || !keys.length) return null;
    const key=keys[Math.floor(random()*keys.length)];
    if(!key) return null;
    state.tickets--;
    state.spirits[key]=(state.spirits[key]||0)+1;
    return key;
  }
  const api={items,create,buy,summon};
  if(typeof module!=='undefined') module.exports=api; else root.ThaiNativeLobby=api;
})(typeof window!=='undefined'?window:globalThis);
