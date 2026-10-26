'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {WebSocketServer,WebSocket}=require('ws');
const G=require('./rpg-core.js');
function createServer({dataDir=process.env.DATA_DIR||path.join(__dirname,'data'),turnMs=35000,botDelay=1600}={}){
  fs.mkdirSync(dataDir,{recursive:true});const savePath=path.join(dataDir,'players.json');
  const profiles=fs.existsSync(savePath)?JSON.parse(fs.readFileSync(savePath,'utf8')):{};
  // Existing guests keep their progress and original art until they save a custom look.
  const clients=new Map(),rooms=new Map(),queues={pvp:[],coop:[]},history=[],timers=new Set();
  const persist=()=>{fs.writeFileSync(savePath+'.tmp',JSON.stringify(profiles));fs.renameSync(savePath+'.tmp',savePath);};
  const tokenOf=req=>{const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('native_session='))?.slice(15);return /^[a-f0-9]{64}$/.test(token||'')?token:null;};
  const send=(ws,msg)=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(msg));};
  const broadcast=msg=>{for(const c of clients.values())send(c.ws,msg);};
  const later=(fn,delay)=>{const t=setTimeout(()=>{timers.delete(t);fn();},delay);t.unref();timers.add(t);return t;};
  const cancel=t=>{clearTimeout(t);timers.delete(t);};
  const inRoom=id=>[...rooms.values()].find(r=>r.phase!=='finished'&&r.actors.some(a=>a.id===id));
  const roomSend=(r,msg)=>r.actors.filter(a=>!a.bot).forEach(a=>send(clients.get(a.id)?.ws,msg));
  const publicRoom=r=>{const {timer,paid,...state}=r;return state;};
  const state=r=>roomSend(r,{type:'room',room:publicRoom(r)});
  function dequeue(id){for(const q of Object.values(queues)){const i=q.indexOf(id);if(i>=0)q.splice(i,1);}}
  function reward(r){
    if(r.paid)return;r.paid=true;
    for(const a of r.actors.filter(a=>!a.bot)){
      const p=Object.values(profiles).find(p=>p.id===a.id),won=a.team===r.winner,stage=G.stages.find(s=>s.id===r.stage);
      const loot=won?{gold:r.mode==='pvp'?160:stage.gold,stones:r.mode==='pvp'?2:stage.stones,xp:r.mode==='pvp'?70:stage.xp}:{gold:35,stones:1,xp:20};
      p.gold+=loot.gold;p.stones+=loot.stones;p.xp+=loot.xp;if(won){p.wins++;if(r.mode!=='pvp'&&!p.cleared.includes(stage.id))p.cleared.push(stage.id);}
      send(clients.get(a.id)?.ws,{type:'reward',won,loot,profile:p});
    }persist();later(()=>rooms.delete(r.id),120000);
  }
  function schedule(r){
    cancel(r.timer);if(r.phase==='finished'){reward(r);return;}
    const duration=r.mode==='solo'?Math.max(turnMs,90000):turnMs;r.deadline=Date.now()+duration;
    if(G.active(r).bot)r.timer=later(()=>{if(r.phase!=='aim')return;const a=G.botAim(r);fire(r,G.active(r).id,a.angle,a.power,'normal');},botDelay);
    else r.timer=later(()=>{if(r.phase!=='aim')return;G.next(r);schedule(r);state(r);},duration);
  }
  function fire(r,id,angle,power,skill){const flight=G.shoot(r,id,angle,power,skill);cancel(r.timer);roomSend(r,{type:'shot',room:publicRoom(r),flight});r.timer=later(()=>{if(r.phase!=='flight')return;G.next(r);schedule(r);state(r);},Math.max(900,flight.points.length*50+500));}
  function start(mode,people,stage){people.forEach(p=>dequeue(p.id));const r=G.createRoom(crypto.randomUUID(),mode,people,stage);rooms.set(r.id,r);schedule(r);state(r);}
  function leave(id){dequeue(id);const r=inRoom(id);if(!r)return;const a=r.actors.find(a=>a.id===id);a.hp=0;cancel(r.timer);G.next(r);schedule(r);state(r);}
  const server=http.createServer((req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(req.method!=='GET'){res.writeHead(405);return res.end();}
    if(pathname==='/health'){res.setHeader('Content-Type','application/json');return res.end('{"ok":true}');}
    if(pathname==='/api/profile'){
      let token=tokenOf(req);if(!token||!profiles[token]){token=crypto.randomBytes(32).toString('hex');profiles[token]=G.profile(crypto.randomUUID(),'นักเดินทาง'+crypto.randomInt(100,999));persist();res.setHeader('Set-Cookie',`native_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${req.headers['x-forwarded-proto']==='https'?'; Secure':''}`);}
      res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');return res.end(JSON.stringify(profiles[token]));
    }
    let file;
    if(pathname==='/assets/manifests/catalog.json')file=path.join(__dirname,'assets/manifests/catalog.json');
    else if(pathname==='/vendor/phaser.js')file=path.join(__dirname,'node_modules/phaser/dist/phaser.min.js');
    else {let relative;try{relative=decodeURIComponent(pathname==='/index.html'||pathname==='/'?'index.html':pathname.slice(1));}catch{res.writeHead(400);return res.end();}
      if(!/^(?:[\w-]+\.(?:html|css|js)|assets\/[\w./-]+\.(?:png|jpg|webp|mp3))$/.test(relative)||relative.includes('..')||relative.includes('.test.')){res.writeHead(404);return res.end();}file=path.join(__dirname,relative);}
    if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end('Not found');}
    const types={'.json':'application/json','.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.mp3':'audio/mpeg'};
    res.setHeader('Content-Type',(types[path.extname(file)]||'application/octet-stream')+(file.endsWith('.html')||file.endsWith('.js')||file.endsWith('.css')?'; charset=utf-8':''));res.setHeader('Cache-Control',file.includes('assets')?'public, max-age=3600':'no-cache');
    fs.createReadStream(file).pipe(res);
  });
  const wss=new WebSocketServer({noServer:true,maxPayload:4096});
  server.on('upgrade',(req,socket,head)=>{
    const origin=req.headers.origin;
    if(req.url!=='/socket'||!profiles[tokenOf(req)]||(origin&&origin!==`http://${req.headers.host}`&&origin!==`https://${req.headers.host}`)){socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');return socket.destroy();}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
  });
  wss.on('connection',(ws,req)=>{
    const p=profiles[tokenOf(req)],old=clients.get(p.id);if(old){send(old.ws,{type:'error',message:'เปิดเกมในแท็บใหม่แล้ว แท็บเดิมถูกพัก'});old.ws.close(4001);}
    const c={ws,p,lastChat:0,messages:0,window:Date.now()};clients.set(p.id,c);
    send(ws,{type:'hello',profile:p,chat:history,online:clients.size});broadcast({type:'presence',online:clients.size});
    const existing=inRoom(p.id);if(existing)send(ws,{type:'room',room:publicRoom(existing)});
    ws.on('message',raw=>{
      try{
        if(Date.now()-c.window>1000){c.window=Date.now();c.messages=0;}if(++c.messages>20)throw Error('ส่งคำสั่งเร็วเกินไป');
        const msg=JSON.parse(raw.toString());if(!msg||typeof msg!=='object')throw Error('คำสั่งไม่ถูกต้อง');const r=inRoom(p.id);
        if(msg.type==='chat'){if(typeof msg.text!=='string'||!msg.text.trim()||msg.text.length>180)throw Error('ข้อความยาวได้ไม่เกิน 180 ตัวอักษร');if(Date.now()-c.lastChat<900)throw Error('รอสักครู่ก่อนส่งข้อความถัดไป');c.lastChat=Date.now();const entry={name:p.name,text:msg.text.trim(),time:Date.now()};history.push(entry);if(history.length>40)history.shift();broadcast({type:'chat',entry});return;}
        if(msg.type==='name'){if(r)throw Error('เปลี่ยนชื่อหลังจบการต่อสู้');if(typeof msg.name!=='string'||msg.name.trim().length<2||msg.name.trim().length>18||/[\x00-\x1f<>]/.test(msg.name))throw Error('ใช้ชื่อ 2–18 ตัวอักษร');p.name=msg.name.trim();persist();return send(ws,{type:'profile',profile:p,message:'บันทึกชื่อแล้ว'});}
        if(msg.type==='character'){if(r||Object.values(queues).some(q=>q.includes(p.id)))throw Error('ปรับตัวละครหลังออกจากการต่อสู้หรือคิว');const message=G.customize(p,msg.appearance,msg.name);persist();return send(ws,{type:'profile',profile:p,message});}
        if(msg.type==='inventory'){if(r)throw Error('จัดอุปกรณ์หลังจบการต่อสู้');const message=G.transact(p,msg.action,msg.id);persist();return send(ws,{type:'profile',profile:p,message});}
        if(msg.type==='cancel'){dequeue(p.id);return send(ws,{type:'queue',mode:null});}
        if(msg.type==='leave'){leave(p.id);return send(ws,{type:'left'});}
        if(msg.type==='play'){
          if(r)throw Error('คุณอยู่ในการต่อสู้อยู่แล้ว');if(!['solo','pvp','coop'].includes(msg.mode))throw Error('ไม่พบโหมดนี้');
          if(!G.stages.some(s=>s.id===msg.stage))msg.stage='grove';dequeue(p.id);
          if(msg.mode==='solo'){start('solo',[p],msg.stage);return;}
          const q=queues[msg.mode],otherId=q.shift(),other=clients.get(otherId);
          if(other&&!inRoom(otherId))start(msg.mode,[other.p,p],msg.mode==='coop'?'shrine':'grove');else{q.push(p.id);send(ws,{type:'queue',mode:msg.mode});}return;
        }
        if(!r)throw Error('ยังไม่ได้เข้าการต่อสู้');
        if(msg.type==='shoot'){fire(r,p.id,msg.angle,msg.power,msg.skill);return;}
        if(msg.type==='move'){G.move(r,p.id,msg.direction);state(r);return;}
        if(msg.type==='face'){if(r.phase!=='aim'||G.active(r).id!==p.id||![-1,1].includes(msg.direction))throw Error('เปลี่ยนทิศไม่ได้');G.active(r).facing=msg.direction;state(r);return;}
        if(msg.type==='guard'){if(r.phase!=='aim'||G.active(r).id!==p.id)throw Error('ยังไม่ใช่ตาของคุณ');G.active(r).shield=24;G.next(r);schedule(r);state(r);return;}
        throw Error('ไม่รู้จักคำสั่ง');
      }catch(error){send(ws,{type:'error',message:error instanceof SyntaxError?'คำสั่งไม่ถูกต้อง':error.message});}
    });
    ws.on('close',()=>{if(clients.get(p.id)!==c)return;clients.delete(p.id);dequeue(p.id);broadcast({type:'presence',online:clients.size});later(()=>{if(!clients.has(p.id))leave(p.id);},15000);});
    ws.on('error',()=>{});
  });
  return {server,close:async()=>{for(const t of timers)clearTimeout(t);for(const c of clients.values())c.ws.terminate();await new Promise(resolve=>wss.close(resolve));await new Promise(resolve=>server.close(resolve));},rooms};
}
if(require.main===module){const app=createServer();app.server.listen(Number(process.env.PORT)||4173,process.env.HOST||'127.0.0.1',()=>console.log(`ThaiNative server: http://localhost:${process.env.PORT||4173}`));}
module.exports={createServer};
