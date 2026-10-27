'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {WebSocketServer}=require('ws'),C=require('./card-catalog.js'),D=require('./card-engine.js'),W=require('./card-content.js'),P=require('./card-progress.js'),H=require('./card-challenges.js'),{accounts}=require('./card-accounts.js');
const {createLifeMultiplayer}=require('./life-multiplayer.cjs');
function createServer({dataDir=process.env.DATA_DIR||path.join(__dirname,'data'),turnMs=90000,botDelay=850,disconnectMs=20000,lifeDisconnectMs=60000}={}){
  fs.mkdirSync(dataDir,{recursive:true});const savePath=path.join(dataDir,'card-players.json'),profiles=fs.existsSync(savePath)?JSON.parse(fs.readFileSync(savePath,'utf8')):{},auth=accounts(dataDir);
  if(fs.existsSync(savePath)&&Object.values(profiles).some(p=>!p.version)){try{fs.copyFileSync(savePath,savePath+'.pre-progression-backup',fs.constants.COPYFILE_EXCL);}catch(e){if(e.code!=='EEXIST')throw e;}}
  Object.values(profiles).forEach(p=>P.migrate(p));
  const clients=new Map(),rooms=new Map(),disconnectTimers=new Map(),queue=[],queueOptions=new Map(),waiting=new Map(),history=[],timers=new Set();let closing=false;
  const persist=()=>{fs.writeFileSync(savePath+'.tmp',JSON.stringify(profiles));fs.renameSync(savePath+'.tmp',savePath);};persist();
  const tokenOf=req=>{const t=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('native_session='))?.slice(15);return /^[a-f0-9]{64}$/.test(t||'')?t:null;};
  const send=(ws,msg)=>{if(ws?.readyState===1)ws.send(JSON.stringify(msg));},broadcast=msg=>clients.forEach(c=>send(c.ws,msg));
  const later=(fn,ms)=>{const t=setTimeout(()=>{timers.delete(t);fn();},ms);t.unref();timers.add(t);return t;},cancel=t=>{clearTimeout(t);timers.delete(t);};
  const lookup=id=>Object.values(profiles).find(p=>p.id===id),publicProfile=p=>({...P.migrate(p),receipts:undefined,account:auth.username(p.id)});
  const current=id=>[...rooms.values()].find(r=>!r.dismissed?.has(id)&&r.members.some(m=>m.id===id));
  function dequeue(id){const i=queue.indexOf(id);if(i>=0)queue.splice(i,1);queueOptions.delete(id);}
  function cancelWaiting(id){for(const [code,w]of waiting)if(w.host===id){waiting.delete(code);send(clients.get(id)?.ws,{type:'waiting',waiting:null});}}
  const busy=id=>current(id)?.game.phase==='playing'||queue.includes(id)||[...waiting.values()].some(w=>w.host===id);
  function profileMessage(p,message='',result=null){send(clients.get(p.id)?.ws,{type:'profile',profile:publicProfile(p),message,result});}
  function controller(r){if(r.mode!=='coop')return r.members.find(m=>m.side===r.game.active)?.id;const team=r.members.filter(m=>m.side===0),preferred=team[Math.floor((r.game.turn-1)/2)%team.length];return clients.has(preferred.id)?preferred.id:team.find(m=>clients.has(m.id))?.id;}
  function finish(r){
    if(r.paid||r.game.phase!=='finished')return;r.paid=true;
    if(r.game.winner===0&&!H.validWin(r)){r.game.winner=1;r.game.log.push('เงื่อนไขปริศนายังไม่ครบ ลองใหม่ได้');}
    const oldMmr=Object.fromEntries(r.members.map(m=>[m.id,lookup(m.id).mmr]));
    r.rewards={};for(const member of r.members){const p=lookup(member.id),won=r.game.winner===member.side,opponent=r.game.players[1-member.side].name;let delta=0;
      if(r.mode==='pvp'){const other=r.members.find(m=>m.side!==member.side);delta=P.rated(p,oldMmr[other.id],r.game.winner==='draw'?.5:won?1:0);if(member.ranked){P.migrate(p);p.season.rating=Math.max(0,p.season.rating+delta);p.season.peak=Math.max(p.season.peak,p.season.rating);p.season.played++;}}
      r.rewards[p.id]=P.record(p,{mode:r.mode,won,turns:r.game.turn,metrics:r.game.metrics[member.side],opponent,forfeit:!!r.forfeit&&r.forfeitSide===member.side,challenge:r.challenge,ratingDelta:member.ranked?delta:0,deck:r.mode==='coop'?r.teamDeck:member.deck});
    }persist();later(()=>rooms.delete(r.id),120000);
  }
  function publish(r){finish(r);for(const m of r.members){if(r.dismissed?.has(m.id))continue;const state=D.view(r.game,m.side);Object.assign(state,{id:r.id,mode:r.mode,deadline:r.deadline,canAct:r.game.active===m.side&&controller(r)===m.id,controllerName:lookup(controller(r))?.name||'',challenge:r.challenge||null,boss:r.boss||null,faction:r.options.faction,rated:!!m.ranked,reward:r.rewards?.[m.id]||null,cosmetics:r.members.map(a=>({side:a.side,equipped:lookup(a.id).equipped})),targets:Object.fromEntries(state.players[m.side].hand.map(h=>[h.uid,D.targets(r.game,m.side,h.card)]))});send(clients.get(m.id)?.ws,{type:'room',room:state});}}
  function onTurn(r){H.bossTurn(r);if(r.challenge?.startsWith('puzzle:')&&r.game.turn>1&&r.game.phase==='playing'){r.game.phase='finished';r.game.winner=1;r.game.log.push('หมดจังหวะปริศนาแล้ว');}}
  function schedule(r){
    cancel(r.timer);if(r.game.phase==='finished'){r.deadline=null;return;}r.deadline=Date.now()+turnMs;const bot=r.game.players[r.game.active].id.startsWith('bot-');
    r.timer=later(()=>{if(r.game.phase!=='playing')return;try{bot?D.bot(r.game,r.game.active):D.end(r.game,r.game.active);onTurn(r);schedule(r);publish(r);}catch(error){console.error('Card turn failed:',error.message);r.forfeit=true;r.forfeitSide=r.game.active;D.concede(r.game,r.game.active);schedule(r);publish(r);}},bot?botDelay:turnMs);
  }
  function chosen(p,loaner){if(loaner){if(loaner!=='low'&&!Object.hasOwn(C.factions,loaner))throw Error('ไม่พบเด็คยืม');return P.loaner(loaner);}return P.ownedDeck(p,p.deck);}
  function start(mode,people,{faction='wood',loaners={},ranked={},challenge=null}={}){
    const decks=people.map(p=>chosen(p,loaners[p.id]));if(mode==='weekly')decks.forEach(deck=>P.weeklyDeck(deck));
    let players=people.map((p,i)=>({id:p.id,name:p.name,deck:decks[i]})),members=people.map((p,i)=>({id:p.id,side:i,deck:decks[i],ranked:!!ranked[p.id]}));
    if(mode==='coop'){
      const merged=[],counts={};for(let i=0;i<40;i++)for(const deck of decks){const id=deck[i];if(merged.length<40&&(counts[id]||0)<(C.byId[id].tier==='SS'?1:3)){merged.push(id);counts[id]=(counts[id]||0)+1;}}
      C.validateDeck(merged);players=[{id:'team-'+crypto.randomUUID(),name:'ทีม '+people.map(p=>p.name).join(' + '),deck:merged}];members.forEach(m=>m.side=0);
    }
    const solo=!['pvp','friendly'].includes(mode);if(solo)players.push({id:'bot-'+crypto.randomUUID(),name:(mode==='boss'||mode==='coop'?'มหาภูติ · ':'แม่หมอม่วง · ')+C.factions[faction].name,deck:C.starter(faction)});
    if(!challenge&&mode!=='coop'&&crypto.randomInt(2)){players.reverse();members.forEach(m=>m.side=1-m.side);}
    const r={id:crypto.randomUUID(),mode,members,teamDeck:mode==='coop'?players[0].deck.slice():null,game:D.create(players,crypto.randomInt(1,2147483647)),challenge:mode==='coop'?'boss:'+faction:challenge,options:{faction,loaners,ranked,challenge},boss:mode==='boss'||mode==='coop'?faction:null,timer:null,paid:false};
    if(challenge)H.setup(r.game,...challenge.split(':'));if(mode==='coop')H.setup(r.game,'boss',faction);
    people.forEach(p=>{dequeue(p.id);cancelWaiting(p.id);const old=current(p.id);if(old){old.dismissed??=new Set();old.dismissed.add(p.id);}});rooms.set(r.id,r);schedule(r);publish(r);
  }
  function matchQueue(){for(const id of queue.slice()){const a=clients.get(id),qa=queueOptions.get(id);if(!a||!qa){dequeue(id);continue;}const range=150+Math.floor((Date.now()-qa.joined)/10000)*100,other=queue.find(b=>b!==id&&clients.has(b)&&Math.abs(lookup(b).mmr-a.p.mmr)<=range);if(other){const qb=queueOptions.get(other);try{start('pvp',[a.p,lookup(other)],{loaners:{[id]:qa.loaner,[other]:qb.loaner},ranked:{[id]:qa.ranked,[other]:qb.ranked}});}catch(e){dequeue(id);send(a.ws,{type:'error',message:e.message});}}}}
  function setCookie(res,token,req){res.setHeader('Set-Cookie',`native_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${req.headers['x-forwarded-proto']==='https'?'; Secure':''}`);}
  function rotate(res,p,req){const oldToken=tokenOf(req),revoke=new Set([p.id,profiles[oldToken]?.id]);for(const [token,value]of Object.entries(profiles))if(token===oldToken||value.id===p.id){delete profiles[token];if(value.id!==p.id)profiles['saved-'+value.id]=value;}const token=crypto.randomBytes(32).toString('hex');profiles[token]=p;setCookie(res,token,req);persist();for(const id of revoke)clients.get(id)?.ws.close(4001);}
  const publicFiles=new Set(['index.html','cards.css','progress.css','card-client.js','card-catalog.js','card-content.js','ui-sounds.js','game-audio.js','life.html','life.css','life-client.js','life-engine.js','life-party.js','life-map.js']);
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');
    let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
    if(pathname==='/api/account'&&req.method==='POST'){
      res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
      try{const origin=req.headers.origin;if((origin&&origin!==`http://${req.headers.host}`&&origin!==`https://${req.headers.host}`)||!String(req.headers['content-type']).startsWith('application/json'))throw Error('คำขอไม่ถูกต้อง');const p=profiles[tokenOf(req)];if(!p)throw Error('เปิดหน้าเกมใหม่ก่อนใช้งานบัญชี');if(busy(p.id))throw Error('ออกจากเกมหรือคิวก่อนจัดการบัญชี');
        const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>4096)throw Error('ข้อมูลยาวเกินไป');chunks.push(chunk);}const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if(input.action==='logout'){const fresh=P.create(crypto.randomUUID(),'ผู้ผูกวิญญาณ'+crypto.randomInt(100,999));rotate(res,fresh,req);return res.end(JSON.stringify({profile:publicProfile(fresh)}));}
        const result=await auth.action(input,p,req.socket.remoteAddress);const target=lookup(result.profileId);if(!target)throw Error('ไม่พบความก้าวหน้าบัญชี');rotate(res,target,req);res.end(JSON.stringify({profile:publicProfile(target),recovery:result.recovery||null}));
      }catch(e){res.writeHead(400);res.end(JSON.stringify({error:e instanceof SyntaxError?'ข้อมูลไม่ถูกต้อง':e.message}));}return;
    }
    if(req.method!=='GET'){res.writeHead(405);return res.end();}
    if(pathname==='/health'){res.setHeader('Content-Type','application/json');return res.end('{"ok":true,"game":"cards","catalog":100,"version":2}');}
    if(pathname==='/api/profile'){let token=tokenOf(req);if(!token||!profiles[token]){token=crypto.randomBytes(32).toString('hex');profiles[token]=P.create(crypto.randomUUID(),'ผู้ผูกวิญญาณ'+crypto.randomInt(100,999));setCookie(res,token,req);}const p=publicProfile(profiles[token]);persist();res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');return res.end(JSON.stringify(p));}
    if(pathname==='/api/leaderboard'){res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');return res.end(JSON.stringify([...new Map(Object.values(profiles).map(p=>[p.id,p])).values()].map(p=>P.migrate(p)).filter(p=>p.season.played>0).sort((a,b)=>b.season.rating-a.season.rating).slice(0,20).map(p=>({name:p.name,rating:p.season.rating,rank:W.rank(p.season.rating),played:p.season.played}))));}
    if(['/battle.html','/assets.html'].includes(pathname)){res.writeHead(302,{Location:'/'});return res.end();}const relative=pathname==='/'?'index.html':pathname.slice(1);
    if(!publicFiles.has(relative)&&!/^assets\/(?:cards\/[a-z-]+\.png|(?:life-bangkok\.png|life-characters\.png|life-interiors\.png|life-walk\.png|battle-chibi-moonforest\.png|lobby-thai-varied\.mp3|battle-chibi-thai\.mp3)|sfx\/[\w-]+\.mp3)$/.test(relative)){res.writeHead(404);return res.end('Not found');}
    const file=path.join(__dirname,relative);if(!fs.existsSync(file)){res.writeHead(404);return res.end('Not found');}const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.mp3':'audio/mpeg'};res.setHeader('Content-Type',types[path.extname(file)]);res.setHeader('Cache-Control',relative.startsWith('assets/')?'public, max-age=3600':'no-cache');fs.createReadStream(file).pipe(res);
  });
  const lifeMultiplayer=createLifeMultiplayer({disconnectMs:lifeDisconnectMs});
  const wss=new WebSocketServer({noServer:true,maxPayload:8192});server.on('upgrade',(req,socket,head)=>{if(req.url==='/life-socket')return lifeMultiplayer.upgrade(req,socket,head);const origin=req.headers.origin;if(req.url!=='/socket'||!profiles[tokenOf(req)]||(origin&&origin!==`http://${req.headers.host}`&&origin!==`https://${req.headers.host}`)){socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');return socket.destroy();}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));});
  wss.on('connection',(ws,req)=>{
    const p=profiles[tokenOf(req)],old=clients.get(p.id);if(old)old.ws.close(4001);cancel(disconnectTimers.get(p.id));disconnectTimers.delete(p.id);
    const c={ws,p,lastChat:0,lastEmote:0,messages:0,window:Date.now(),alive:true};clients.set(p.id,c);send(ws,{type:'hello',profile:publicProfile(p),online:clients.size,chat:history,queued:queue.includes(p.id),waiting:[...waiting.values()].find(w=>w.host===p.id)||null});broadcast({type:'presence',online:clients.size});const existing=current(p.id);if(existing)publish(existing);ws.on('pong',()=>c.alive=true);
    ws.on('message',raw=>{if(clients.get(p.id)!==c||ws.readyState!==1)return;try{
      if(Date.now()-c.window>=1000){c.window=Date.now();c.messages=0;}if(++c.messages>20)throw Error('ส่งคำสั่งเร็วเกินไป');const msg=JSON.parse(raw.toString());if(!msg||typeof msg!=='object'||Array.isArray(msg))throw Error('คำสั่งไม่ถูกต้อง');P.migrate(p);const r=current(p.id),playing=r?.game.phase==='playing';
      if(msg.type==='chat'){if(typeof msg.text!=='string'||!msg.text.trim()||msg.text.length>180)throw Error('ข้อความยาวได้ไม่เกิน 180 ตัวอักษร');if(Date.now()-c.lastChat<900)throw Error('รอก่อนส่งข้อความถัดไป');c.lastChat=Date.now();const entry={name:p.name,text:msg.text.trim()};history.push(entry);if(history.length>40)history.shift();broadcast({type:'chat',entry});return;}
      if(msg.type==='emote'){const emote=W.emotes.find(e=>e.id===msg.id);if(!r||!emote||Date.now()-c.lastEmote<3000)throw Error('รอสักครู่ก่อนส่งอีโมต');c.lastEmote=Date.now();r.members.forEach(m=>send(clients.get(m.id)?.ws,{type:'emote',name:p.name,text:emote.text}));return;}
      if(msg.type==='save'){if(busy(p.id))throw Error('บันทึกเด็คหลังจบเกมหรือออกจากคิว');const deck=P.ownedDeck(p,msg.deck);if(typeof msg.name!=='string'||msg.name.trim().length<2||msg.name.trim().length>18||/[\x00-\x1f<>]/.test(msg.name))throw Error('ชื่อต้องมี 2–18 ตัวอักษร');if(typeof msg.deckName!=='string'||!msg.deckName.trim()||msg.deckName.trim().length>32||/[\x00-\x1f<>]/.test(msg.deckName))throw Error('ชื่อเด็คต้องมี 1–32 ตัวอักษร');let slot=p.decks.find(d=>d.id===(msg.slot||p.activeDeck));if(msg.slot&&!slot&&msg.slot!=='new')throw Error('ไม่พบช่องเด็ค');if(!slot){if(p.decks.length>=5)throw Error('บันทึกได้สูงสุด 5 สำรับ');slot={id:'deck-'+crypto.randomUUID()};p.decks.push(slot);}Object.assign(slot,{name:msg.deckName.trim(),cards:deck});p.deck=deck;p.deckName=slot.name;p.name=msg.name.trim();p.activeDeck=slot.id;persist();profileMessage(p,'บันทึกเด็คแล้ว');return;}
      if(msg.type==='use-deck'){if(busy(p.id))throw Error('ออกจากคิวก่อนเปลี่ยนสำรับ');const slot=p.decks.find(d=>d.id===msg.id);if(!slot)throw Error('ไม่พบสำรับ');p.deck=P.ownedDeck(p,slot.cards);p.deckName=slot.name;p.activeDeck=slot.id;persist();profileMessage(p,'ใช้สำรับ '+slot.name);return;}
      if(['pack','craft','ticket','quest','reroll','weekly-reward','achievement','pass','cosmetic','starter','title'].includes(msg.type)){if(busy(p.id))throw Error('ออกจากเกมหรือคิวก่อนรับรางวัล');const result=P.transact(p,msg);persist();profileMessage(p,result.message||'พิธีเรียกภูติสำเร็จ',result);return;}
      if(msg.type==='host'){if(busy(p.id))throw Error('ออกจากเกมหรือคิวก่อนสร้างห้อง');if(!['friendly','coop'].includes(msg.kind))throw Error('ไม่พบชนิดห้อง');chosen(p,msg.loaner);const code=crypto.randomBytes(4).toString('hex').slice(0,6).toUpperCase(),w={code,host:p.id,kind:msg.kind,loaner:msg.loaner||null,created:Date.now()};waiting.set(code,w);send(ws,{type:'waiting',waiting:w});later(()=>{if(waiting.get(code)===w){waiting.delete(code);send(clients.get(p.id)?.ws,{type:'waiting',waiting:null});}},600000);return;}
      if(msg.type==='join'){if(busy(p.id))throw Error('ออกจากเกมหรือคิวก่อนเข้าห้อง');const code=typeof msg.code==='string'?msg.code.trim().toUpperCase():'',w=waiting.get(code);if(!w||w.host===p.id||!clients.has(w.host))throw Error('ไม่พบห้อง หรือเป็นห้องของคุณเอง');start(w.kind,[lookup(w.host),p],{faction:'shadow',loaners:{[w.host]:w.loaner,[p.id]:msg.loaner||null}});waiting.delete(code);return;}
      if(msg.type==='cancel'){dequeue(p.id);cancelWaiting(p.id);send(ws,{type:'queue',queued:false});return;}
      if(msg.type==='play'){
        if(playing)throw Error('คุณกำลังอยู่ในการประลอง');if(!['solo','pvp','boss','weekly','lesson','puzzle'].includes(msg.mode))throw Error('ไม่พบโหมด');const deck=chosen(p,msg.loaner);if(msg.mode==='weekly')P.weeklyDeck(deck);dequeue(p.id);cancelWaiting(p.id);
        if(msg.mode==='pvp'){if(msg.ranked&&!auth.username(p.id))throw Error('ผูกบัญชีก่อนเข้าจัดอันดับ');queueOptions.set(p.id,{joined:Date.now(),ranked:!!msg.ranked,loaner:msg.loaner||null});queue.push(p.id);send(ws,{type:'queue',queued:true});matchQueue();return;}
        let faction=msg.faction||'wood',challenge=null;
        if(msg.mode==='lesson'||msg.mode==='puzzle'){const list=msg.mode==='lesson'?W.lessons:W.puzzles;if(!list.some(c=>c.id===msg.challenge))throw Error('ไม่พบความท้าทาย');challenge=msg.mode+':'+msg.challenge;faction='wood';}
        if(msg.mode==='boss'){if(!W.bosses.some(b=>b.id===faction))throw Error('ไม่พบบอส');challenge='boss:'+faction;}if(msg.mode==='weekly')faction=W.weekly().faction;if(!Object.hasOwn(C.factions,faction))throw Error('ไม่พบคู่ต่อสู้');start(msg.mode,[p],{faction,challenge,loaners:{[p.id]:msg.loaner||null}});return;
      }
      if(msg.type==='rematch'){if(!r||playing||!['friendly','coop'].includes(r.mode))throw Error('ยังขอแข่งใหม่ไม่ได้');r.rematch??=new Set();r.rematch.add(p.id);r.members.forEach(m=>send(clients.get(m.id)?.ws,{type:'notice',message:p.name+' ขอแข่งใหม่ กดประลองอีกครั้งเพื่อยอมรับ'}));if(r.members.every(m=>r.rematch.has(m.id)&&clients.has(m.id)))start(r.mode,r.members.map(m=>lookup(m.id)),r.options);return;}
      if(msg.type==='dismiss'){if(playing)throw Error('จบเกมหรือยอมแพ้ก่อน');if(r){r.dismissed??=new Set();r.dismissed.add(p.id);if(r.members.every(m=>r.dismissed.has(m.id)||!clients.has(m.id)))rooms.delete(r.id);}profileMessage(p);send(ws,{type:'dismissed'});return;}
      if(!r||!playing)throw Error('ยังไม่ได้เริ่มการประลอง');const member=r.members.find(m=>m.id===p.id),side=member.side;
      if(msg.type==='concede'){r.forfeit=true;r.forfeitSide=side;D.concede(r.game,side);schedule(r);publish(r);return;}
      if(controller(r)!==p.id)throw Error('ยังไม่ถึงเทิร์นควบคุมของคุณ');if(msg.revision!==r.game.revision){publish(r);throw Error('สนามเปลี่ยนแล้ว กรุณาเลือกคำสั่งอีกครั้ง');}
      if(msg.type==='summon')D.play(r.game,side,msg.hand,msg.target??null);else if(msg.type==='attack')D.attack(r.game,side,msg.unit,msg.target);else if(msg.type==='end')D.end(r.game,side);else throw Error('ไม่รู้จักคำสั่ง');
      H.check(r);if(msg.type==='end')onTurn(r);if(msg.type==='end'||r.game.phase==='finished')schedule(r);publish(r);
    }catch(error){send(ws,{type:'error',message:error instanceof SyntaxError?'คำสั่งไม่ถูกต้อง':error.message,profile:publicProfile(p)});}});
    ws.on('close',()=>{if(clients.get(p.id)!==c||closing)return;clients.delete(p.id);dequeue(p.id);broadcast({type:'presence',online:clients.size});disconnectTimers.set(p.id,later(()=>{disconnectTimers.delete(p.id);if(!clients.has(p.id)){cancelWaiting(p.id);const r=current(p.id);if(r?.game.phase==='playing'){const m=r.members.find(m=>m.id===p.id);if(r.mode==='coop'&&r.members.some(a=>a.id!==p.id&&clients.has(a.id)))return;r.forfeit=true;r.forfeitSide=m.side;D.concede(r.game,m.side);schedule(r);publish(r);}}},disconnectMs));});ws.on('error',()=>{});
  });
  const heartbeat=setInterval(()=>{for(const c of clients.values()){if(!c.alive)c.ws.terminate();else{c.alive=false;c.ws.ping();}}},30000),matchTimer=setInterval(matchQueue,5000);heartbeat.unref();matchTimer.unref();
  return {server,rooms,close:async()=>{closing=true;clearInterval(heartbeat);clearInterval(matchTimer);for(const t of timers)clearTimeout(t);for(const c of clients.values())c.ws.terminate();await lifeMultiplayer.close();await new Promise(resolve=>wss.close(resolve));await new Promise(resolve=>server.close(resolve));}};
}
if(require.main===module){const app=createServer();app.server.listen(Number(process.env.PORT)||4173,process.env.HOST||'127.0.0.1',()=>console.log(`ThaiNative Card Duel: http://localhost:${process.env.PORT||4173}`));}module.exports={createServer};
