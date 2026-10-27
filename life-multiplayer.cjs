'use strict';
const crypto = require('node:crypto');
const {WebSocketServer} = require('ws');
const Life = require('./life-engine.js');

function createLifeMultiplayer({disconnectMs=60000}={}) {
  const wss=new WebSocketServer({noServer:true,maxPayload:4096});
  // shortcut: rooms vanish on server restart; add durable storage for persistent online sessions.
  const sessions=new Map(), rooms=new Map(), queue=[], timers=new Set();
  let closing=false;
  const later=(fn,ms)=>{const t=setTimeout(()=>{timers.delete(t);fn();},ms);t.unref();timers.add(t);return t;};
  const cancel=t=>{if(t){clearTimeout(t);timers.delete(t);}};
  const send=(s,msg)=>{if(s?.ws?.readyState===1)s.ws.send(JSON.stringify(msg));};
  const fail=(s,message)=>send(s,{type:'error',message});
  const connected=s=>s?.ws?.readyState===1;
  const dequeue=s=>{const i=queue.indexOf(s);if(i>=0)queue.splice(i,1);};
  const roomOf=s=>rooms.get(s.room);
  const details=room=>room.finalObjective||({combinedMoney:room.members.reduce((sum,p)=>sum+(p.game?.money||0),0),minEnergy:room.members.reduce((min,p)=>Math.min(min,p.game?.energy??100),100),moneyTarget:0,energyTarget:30,teamIntact:room.teamIntact!==false,success:room.phase==='finished'&&room.teamIntact!==false&&room.members.length>=2&&room.members.reduce((sum,p)=>sum+p.game.money,0)>=0&&room.members.every(p=>p.game.energy>=30)});
  const snapshot=p=>({id:p.id,name:p.name,gender:p.gender,career:p.career,game:p.game||null});
  function view(room,s){const players=room.finalPlayers||room.members.map(snapshot);return {code:room.code,phase:room.phase,host:room.host,self:s.id,current:room.current,revision:room.revision,week:room.members.find(p=>p.id===room.current)?.game?.week??20,players:players.map(p=>({...p,connected:connected(room.members.find(member=>member.id===p.id))})),objective:details(room)};}
  function publish(room){room.members.forEach(s=>send(s,{type:'state',room:view(room,s)}));}
  function makeCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let code;do{code=Array.from({length:6},()=>alphabet[crypto.randomInt(alphabet.length)]).join('');}while(rooms.has(code));return code;}
  function configure(s,msg){
    if(typeof msg.name!=='string'||msg.name.trim().length<1||msg.name.trim().length>20||/[\x00-\x1f<>]/.test(msg.name))throw Error('ชื่อต้องมี 1–20 ตัวอักษร');
    if(!['male','female'].includes(msg.gender))throw Error('ไม่พบตัวละครนี้');
    if(!Life.careers.some(c=>c.id===msg.career))throw Error('ไม่พบอาชีพนี้');
    s.name=msg.name.trim();s.gender=msg.gender;s.career=msg.career;
  }
  function ready(s){if(roomOf(s))throw Error('ออกจากห้องเดิมก่อน');dequeue(s);}
  function create(s){
    if(rooms.size>=1000)throw Error('ห้องเต็มชั่วคราว กรุณาลองใหม่');
    const room={code:makeCode(),phase:'lobby',host:s.id,current:null,revision:0,members:[s]};rooms.set(room.code,room);s.room=room.code;return room;
  }
  function add(room,s){room.members.push(s);s.room=room.code;room.revision++;}
  function start(room){
    if(room.phase!=='lobby')throw Error('เกมเริ่มไปแล้ว');
    if(room.members.length<2||room.members.some(p=>!connected(p)))throw Error('ต้องมีผู้เล่นอย่างน้อย 2 คนที่เชื่อมต่ออยู่');
    room.members.forEach(p=>{p.game=Life.create(p.name,null,p.career);});room.phase='playing';room.teamIntact=true;room.current=room.members[0].id;room.revision++;
  }
  function finish(room){room.phase='finished';room.current=null;room.finalPlayers=room.members.map(snapshot);room.finalObjective=details(room);}
  function advance(room,previous){
    if(room.members.every(p=>p.game?.finished)){finish(room);return;}
    const index=Math.max(0,room.members.findIndex(p=>p.id===previous));
    for(let i=1;i<=room.members.length;i++){const p=room.members[(index+i)%room.members.length];if(!p.game.finished){room.current=p.id;return;}}
  }
  function remove(s){
    dequeue(s);const room=roomOf(s);s.room=null;s.game=null;
    if(!room)return;
    const index=room.members.indexOf(s);if(index<0)return;
    if(room.phase==='playing')room.teamIntact=false;
    const wasCurrent=room.current===s.id;room.members.splice(index,1);room.revision++;
    if(!room.members.length){rooms.delete(room.code);return;}
    if(room.host===s.id)room.host=room.members[0].id;
    if(room.phase==='playing'&&wasCurrent){
      if(room.members.every(p=>p.game.finished)){finish(room);}
      else {let next=null;for(let i=0;i<room.members.length;i++){const p=room.members[(index+i)%room.members.length];if(!p.game.finished){next=p;break;}}room.current=next?.id||null;}
    }
    publish(room);
  }
  function command(s,msg){
    if(!msg||typeof msg!=='object'||Array.isArray(msg)||typeof msg.type!=='string')throw Error('คำสั่งไม่ถูกต้อง');
    if(msg.type==='create'){ready(s);configure(s,msg);const room=create(s);publish(room);return;}
    if(msg.type==='join'){
      ready(s);configure(s,msg);const code=typeof msg.code==='string'?msg.code.trim().toUpperCase():'';const room=rooms.get(code);
      if(!room||room.phase!=='lobby'||room.members.length>=4)throw Error('ไม่พบห้องที่เข้าร่วมได้ หรือห้องเต็ม');add(room,s);publish(room);return;
    }
    if(msg.type==='match'){
      ready(s);configure(s,msg);const other=queue.find(p=>p!==s&&connected(p)&&!roomOf(p));
      if(!other){if(queue.length>=500)throw Error('คิวเต็ม กรุณาลองใหม่');queue.push(s);send(s,{type:'queue',queued:true});return;}
      dequeue(other);send(other,{type:'queue',queued:false});send(s,{type:'queue',queued:false});const room=create(other);add(room,s);start(room);publish(room);return;
    }
    if(msg.type==='cancel'){dequeue(s);send(s,{type:'queue',queued:false});return;}
    if(msg.type==='leave'){remove(s);send(s,{type:'left'});return;}
    const room=roomOf(s);if(!room)throw Error('ยังไม่ได้เข้าห้อง');
    if(msg.type==='start'){if(room.host!==s.id)throw Error('เฉพาะเจ้าของห้องเริ่มเกมได้');start(room);publish(room);return;}
    if(!['act','end'].includes(msg.type)||room.phase!=='playing')throw Error('ยังไม่สามารถทำรายการนี้');
    if(room.current!==s.id)throw Error('ยังไม่ถึงตาของคุณ');
    if(!Number.isSafeInteger(msg.revision)||msg.revision!==room.revision){send(s,{type:'state',room:view(room,s)});throw Error('สถานะเกมเปลี่ยนแล้ว กรุณาลองอีกครั้ง');}
    const result=msg.type==='act'?Life.act(s.game,msg.id):Life.endWeek(s.game);
    if(!result.ok)throw Error(result.error);
    s.game=result.state;room.revision++;if(msg.type==='end')advance(room,s.id);publish(room);
  }
  wss.on('connection',ws=>{
    ws.alive=true;ws.on('pong',()=>{ws.alive=true;});
    let session=null,handshake=later(()=>ws.close(4000,'Session required'),5000),windowStart=Date.now(),count=0;
    ws.on('message',raw=>{
      try{
        if(Date.now()-windowStart>1000){windowStart=Date.now();count=0;}if(++count>40)throw Error('ส่งคำสั่งเร็วเกินไป');
        const msg=JSON.parse(raw.toString());
        if(!session){
          if(!msg||msg.type!=='hello'||(msg.token!=null&&(typeof msg.token!=='string'||!/^[a-f0-9]{64}$/.test(msg.token))))throw Error('เริ่มต้นการเชื่อมต่อไม่ถูกต้อง');
          cancel(handshake);handshake=null;session=msg.token?sessions.get(msg.token):null;const resumed=!!session;
          if(!session){if(sessions.size>=2000)throw Error('เซิร์ฟเวอร์เต็มชั่วคราว');const token=crypto.randomBytes(32).toString('hex');session={token,id:crypto.randomBytes(12).toString('hex'),ws:null,room:null,timer:null};sessions.set(token,session);}
          cancel(session.timer);session.timer=null;const old=session.ws;session.ws=ws;if(old&&old!==ws)old.close(4001,'Reconnected');
          send(session,{type:'welcome',token:session.token,self:session.id,resumed,queued:queue.includes(session)});const room=roomOf(session);if(room)publish(room);return;
        }
        if(session.ws!==ws)return;
        command(session,msg);
      }catch(error){if(session)fail(session,error instanceof SyntaxError?'คำสั่งไม่ถูกต้อง':error.message);else ws.close(4000,'Invalid session');}
    });
    ws.on('close',()=>{cancel(handshake);if(!session||session.ws!==ws||closing)return;session.ws=null;dequeue(session);const room=roomOf(session);if(room)publish(room);
      session.timer=later(()=>{session.timer=null;remove(session);sessions.delete(session.token);},disconnectMs);
    });ws.on('error',()=>{});
  });
  function upgrade(req,socket,head){
    const origin=req.headers.origin,expected=`${req.headers['x-forwarded-proto']==='https'?'https':'http'}://${req.headers.host}`;
    if(req.url!=='/life-socket'||(origin&&origin!==expected)){socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');socket.destroy();return;}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
  }
  const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive)ws.terminate();else{ws.alive=false;ws.ping();}}},30000);heartbeat.unref();
  async function close(){closing=true;clearInterval(heartbeat);for(const t of timers)clearTimeout(t);timers.clear();for(const ws of wss.clients)ws.terminate();await new Promise(resolve=>wss.close(resolve));sessions.clear();rooms.clear();queue.length=0;}
  return {upgrade,close};
}
module.exports={createLifeMultiplayer};
