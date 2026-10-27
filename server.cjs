'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {WebSocketServer}=require('ws'),C=require('./card-catalog.js'),D=require('./card-engine.js');
function createServer({dataDir=process.env.DATA_DIR||path.join(__dirname,'data'),turnMs=90000,botDelay=850,disconnectMs=20000}={}){
  fs.mkdirSync(dataDir,{recursive:true});
  // A separate save file preserves former RPG profiles without loading them into the card game.
  const savePath=path.join(dataDir,'card-players.json'),profiles=fs.existsSync(savePath)?JSON.parse(fs.readFileSync(savePath,'utf8')):{};
  const clients=new Map(),rooms=new Map(),disconnectTimers=new Map(),queue=[],history=[],timers=new Set();let closing=false;
  function persist(){fs.writeFileSync(savePath+'.tmp',JSON.stringify(profiles));fs.renameSync(savePath+'.tmp',savePath);}
  const tokenOf=req=>{const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('native_session='))?.slice(15);return /^[a-f0-9]{64}$/.test(token||'')?token:null;};
  const send=(ws,msg)=>{if(ws?.readyState===1)ws.send(JSON.stringify(msg));};
  const broadcast=msg=>clients.forEach(c=>send(c.ws,msg));
  const later=(fn,ms)=>{const t=setTimeout(()=>{timers.delete(t);fn();},ms);t.unref();timers.add(t);return t;};
  const cancel=t=>{clearTimeout(t);timers.delete(t);};
  const dequeue=id=>{const i=queue.indexOf(id);if(i>=0)queue.splice(i,1);};
  const current=id=>[...rooms.values()].find(r=>!r.dismissed?.has(id)&&r.game.players.some(p=>p.id===id));
  function profileFor(id){return Object.values(profiles).find(p=>p.id===id);}
  function publish(r){
    r.game.players.forEach((p,s)=>{if(!p.id.startsWith('bot-')&&!r.dismissed?.has(p.id)){const state=D.view(r.game,s);state.id=r.id;state.mode=r.mode;state.deadline=r.deadline;state.targets=Object.fromEntries(state.players[s].hand.map(h=>[h.uid,D.targets(r.game,s,h.card)]));send(clients.get(p.id)?.ws,{type:'room',room:state});}});
    if(r.game.phase==='finished'&&!r.paid){r.paid=true;r.game.players.forEach((a,s)=>{const p=profileFor(a.id);if(!p)return;p.matches++;if(r.game.winner===s)p.wins++;});persist();later(()=>rooms.delete(r.id),120000);}
  }
  function schedule(r){
    cancel(r.timer);if(r.game.phase==='finished'){r.deadline=null;return;}
    r.deadline=Date.now()+turnMs;const active=r.game.players[r.game.active];
    r.timer=later(()=>{if(r.game.phase!=='playing')return;try{active.id.startsWith('bot-')?D.bot(r.game,r.game.active):D.end(r.game,r.game.active);schedule(r);publish(r);}catch(error){console.error('Card turn failed:',error.message);D.concede(r.game,r.game.active);schedule(r);publish(r);}},active.id.startsWith('bot-')?botDelay:turnMs);
  }
  function start(mode,people,faction){
    for(const p of people){dequeue(p.id);const old=current(p.id);if(old){old.dismissed??=new Set();old.dismissed.add(p.id);}}
    const players=people.map(p=>({id:p.id,name:p.name,deck:p.deck.slice()}));
    if(mode==='solo')players.push({id:'bot-'+crypto.randomUUID(),name:'แม่หมอม่วง · '+C.factions[faction].name,deck:C.starter(faction)});
    if(crypto.randomInt(2))players.reverse();
    const r={id:crypto.randomUUID(),mode,game:D.create(players,crypto.randomInt(1,2147483647)),timer:null,paid:false};rooms.set(r.id,r);schedule(r);publish(r);
  }
  const publicFiles=new Set(['index.html','cards.css','card-client.js','card-catalog.js','ui-sounds.js','game-audio.js']);
  const server=http.createServer((req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
    let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
    if(req.method!=='GET'){res.writeHead(405);return res.end();}
    if(pathname==='/health'){res.setHeader('Content-Type','application/json');return res.end('{"ok":true,"game":"cards","catalog":100}');}
    if(pathname==='/api/profile'){
      let token=tokenOf(req);if(!token||!profiles[token]){token=crypto.randomBytes(32).toString('hex');profiles[token]={id:crypto.randomUUID(),name:'ผู้ผูกวิญญาณ'+crypto.randomInt(100,999),deck:C.starter(),deckName:'เรือนร้างแห่งแสงโคม',wins:0,matches:0};persist();res.setHeader('Set-Cookie',`native_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${req.headers['x-forwarded-proto']==='https'?'; Secure':''}`);}
      res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');return res.end(JSON.stringify(profiles[token]));
    }
    if(['/battle.html','/assets.html'].includes(pathname)){res.writeHead(302,{Location:'/'});return res.end();}
    const relative=pathname==='/'?'index.html':pathname.slice(1);
    if(!publicFiles.has(relative)&&!/^assets\/(?:cards\/[a-z-]+\.png|(?:battle-chibi-moonforest\.png|lobby-thai-varied\.mp3|battle-chibi-thai\.mp3)|sfx\/[\w-]+\.mp3)$/.test(relative)){res.writeHead(404);return res.end('Not found');}
    const file=path.join(__dirname,relative);if(!fs.existsSync(file)){res.writeHead(404);return res.end('Not found');}
    const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.mp3':'audio/mpeg'};
    res.setHeader('Content-Type',types[path.extname(file)]);res.setHeader('Cache-Control',relative.startsWith('assets/')?'public, max-age=3600':'no-cache');fs.createReadStream(file).pipe(res);
  });
  const wss=new WebSocketServer({noServer:true,maxPayload:8192});
  server.on('upgrade',(req,socket,head)=>{const origin=req.headers.origin;if(req.url!=='/socket'||!profiles[tokenOf(req)]||(origin&&origin!==`http://${req.headers.host}`&&origin!==`https://${req.headers.host}`)){socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');return socket.destroy();}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));});
  wss.on('connection',(ws,req)=>{
    const p=profiles[tokenOf(req)],old=clients.get(p.id);if(old)old.ws.close(4001);
    cancel(disconnectTimers.get(p.id));disconnectTimers.delete(p.id);
    const c={ws,p,lastChat:0,messages:0,window:Date.now(),alive:true};clients.set(p.id,c);
    send(ws,{type:'hello',profile:p,online:clients.size,chat:history,queued:queue.includes(p.id)});broadcast({type:'presence',online:clients.size});const existing=current(p.id);if(existing)publish(existing);
    ws.on('pong',()=>c.alive=true);
    ws.on('message',raw=>{
      if(clients.get(p.id)!==c)return;
      try{
        if(Date.now()-c.window>=1000){c.window=Date.now();c.messages=0;}if(++c.messages>20)throw Error('ส่งคำสั่งเร็วเกินไป');
        const msg=JSON.parse(raw.toString());if(!msg||typeof msg!=='object'||Array.isArray(msg))throw Error('คำสั่งไม่ถูกต้อง');const r=current(p.id),playing=r?.game.phase==='playing';
        if(msg.type==='chat'){
          if(typeof msg.text!=='string'||!msg.text.trim()||msg.text.length>180)throw Error('ข้อความยาวได้ไม่เกิน 180 ตัวอักษร');if(Date.now()-c.lastChat<900)throw Error('รอก่อนส่งข้อความถัดไป');c.lastChat=Date.now();const entry={name:p.name,text:msg.text.trim()};history.push(entry);if(history.length>40)history.shift();broadcast({type:'chat',entry});return;
        }
        if(msg.type==='save'){
          if(playing||queue.includes(p.id))throw Error('บันทึกเด็คหลังจบเกมหรือออกจากคิว');
          const deck=C.validateDeck(msg.deck);if(typeof msg.name!=='string'||msg.name.trim().length<2||msg.name.trim().length>18||/[\x00-\x1f<>]/.test(msg.name))throw Error('ชื่อต้องมี 2–18 ตัวอักษร');if(typeof msg.deckName!=='string'||msg.deckName.trim().length<1||msg.deckName.trim().length>32||/[\x00-\x1f<>]/.test(msg.deckName))throw Error('ชื่อเด็คต้องมี 1–32 ตัวอักษร');
          p.deck=deck;p.name=msg.name.trim();p.deckName=msg.deckName.trim();persist();send(ws,{type:'profile',profile:p,message:'บันทึกเด็คแล้ว'});return;
        }
        if(msg.type==='cancel'){dequeue(p.id);send(ws,{type:'queue',queued:false});return;}
        if(msg.type==='play'){
          if(playing)throw Error('คุณกำลังอยู่ในการประลอง');if(!['solo','pvp'].includes(msg.mode))throw Error('ไม่พบโหมด');C.validateDeck(p.deck);
          if(msg.mode==='solo'){if(!Object.hasOwn(C.factions,msg.faction))throw Error('ไม่พบคู่ต่อสู้');start('solo',[p],msg.faction);return;}
          dequeue(p.id);let other;while(queue.length&&!other){const candidate=clients.get(queue.shift());if(candidate&&current(candidate.p.id)?.game.phase!=='playing')other=candidate.p;}
          if(other)start('pvp',[other,p]);else{queue.push(p.id);send(ws,{type:'queue',queued:true});}return;
        }
        if(msg.type==='dismiss'){
          if(playing)throw Error('จบเกมหรือยอมแพ้ก่อน');if(r){r.dismissed??=new Set();r.dismissed.add(p.id);if(r.game.players.every(a=>a.id.startsWith('bot-')||r.dismissed.has(a.id)||!clients.has(a.id)))rooms.delete(r.id);}send(ws,{type:'dismissed'});return;
        }
        if(!r||!playing)throw Error('ยังไม่ได้เริ่มการประลอง');const side=r.game.players.findIndex(a=>a.id===p.id);
        if(msg.type==='concede'){D.concede(r.game,side);schedule(r);publish(r);return;}
        if(msg.revision!==r.game.revision){publish(r);throw Error('สนามเปลี่ยนแล้ว กรุณาเลือกคำสั่งอีกครั้ง');}
        if(msg.type==='summon')D.play(r.game,side,msg.hand,msg.target??null);
        else if(msg.type==='attack')D.attack(r.game,side,msg.unit,msg.target);
        else if(msg.type==='end')D.end(r.game,side);
        else throw Error('ไม่รู้จักคำสั่ง');
        // Keep the current deadline for actions within a turn; only ending a turn resets it.
        if(msg.type==='end'||r.game.phase==='finished')schedule(r);publish(r);
      }catch(error){send(ws,{type:'error',message:error instanceof SyntaxError?'คำสั่งไม่ถูกต้อง':error.message});}
    });
    ws.on('close',()=>{if(clients.get(p.id)!==c||closing)return;clients.delete(p.id);dequeue(p.id);broadcast({type:'presence',online:clients.size});disconnectTimers.set(p.id,later(()=>{disconnectTimers.delete(p.id);if(!clients.has(p.id)){const r=current(p.id);if(r?.game.phase==='playing'){D.concede(r.game,r.game.players.findIndex(a=>a.id===p.id));schedule(r);publish(r);}}},disconnectMs));});ws.on('error',()=>{});
  });
  const heartbeat=setInterval(()=>{for(const c of clients.values()){if(!c.alive)c.ws.terminate();else{c.alive=false;c.ws.ping();}}},30000);heartbeat.unref();
  return {server,rooms,close:async()=>{closing=true;clearInterval(heartbeat);for(const t of timers)clearTimeout(t);for(const c of clients.values())c.ws.terminate();await new Promise(resolve=>wss.close(resolve));await new Promise(resolve=>server.close(resolve));}};
}
if(require.main===module){const app=createServer();app.server.listen(Number(process.env.PORT)||4173,process.env.HOST||'127.0.0.1',()=>console.log(`ThaiNative Card Duel: http://localhost:${process.env.PORT||4173}`));}
module.exports={createServer};
