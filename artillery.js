'use strict';
(() => {
  const G=window.NativeRPG,C=window.NativeClient,A=window.NativeAssets,$=id=>document.getElementById(id);
  let room=null,scene=null,skill='normal',flying=false,pendingShot=null,pendingReward=null,shotTween=null,lastTurn='',rewardPlayed=false;
  const assets={forest:'assets/battle-chibi-moonforest.png',guide:'assets/npc-adventure.png',medium:'assets/npc-summon.png',enemy:'assets/enemy-forest.png',guideSheet:A.guide.image,enemySheet:A.enemy.image,vfxSheet:A.vfx.image,valley:'assets/sheets/moon-valley.png',trees:'assets/sheets/forest-frame.png'};
  const angle=()=>Number($('angle').value),power=()=>Number($('power').value);
  const me=()=>room?.actors.find(a=>a.id===C.profile?.id);
  const myTurn=()=>room&&room.phase==='aim'&&G.active(room).id===C.profile?.id&&C.connected&&!flying;
  let reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  try{const setting=localStorage.getItem('thainative-motion');if(setting!==null)reduced=setting!=='on';}catch{}
  class Arena extends Phaser.Scene {
    constructor(){super('arena');this.actors=new Map();this.characterTextures=new Map();}
    preload(){const label=this.add.text(600,300,'กำลังเปิดประตูสู่ป่าจันทรา…',{fontFamily:'sans-serif',fontSize:'20px',color:'#e8d2a0'}).setOrigin(.5);this.load.on('progress',n=>label.setText('กำลังเตรียมสนาม '+Math.round(n*100)+'%'));this.load.on('loaderror',()=>C.toast('โหลดภาพไม่สำเร็จ กรุณารีเฟรชหน้า'));for(const [key,url] of Object.entries(assets))this.load.image(key,url);}
    create(){
      this.children.removeAll();scene=this;NativeSprites.install(this,A);
      this.add.rectangle(600,337.5,1200,675,0x282449).setDepth(-3);
      this.farLayer=this.add.image(600,337.5,'valley').setDisplaySize(1224,690).setDepth(-2);
      this.treeLayer=this.add.image(600,337.5,'trees').setDisplaySize(1218,685).setDepth(-1);
      this.input.on('pointermove',p=>{if(reduced)return;this.farLayer.x=600+(p.x-600)*.006;this.treeLayer.x=600+(p.x-600)*.014;});
      const texture=this.textures.get('forest'),source=texture.getSourceImage();texture.add('earth',0,0,Math.floor(source.height*.79),source.width,Math.floor(source.height*.21));
      this.add.rectangle(600,580,1200,190,0x182d32);
      this.ground=this.make.graphics({x:0,y:0,add:false});this.edges=this.add.graphics().setDepth(2);
      this.add.image(600,560,'forest','earth').setDisplaySize(1200,230).setMask(this.ground.createGeometryMask());
      this.aim=this.add.graphics().setDepth(6);this.trail=this.add.graphics().setDepth(8);this.effects=this.add.container(0,0).setDepth(10);
      this.cursor=this.add.graphics().setDepth(7);
      if(!reduced){for(let i=0;i<16;i++){const x=60+i*71,y=150+(i%5)*50;const dot=this.add.circle(x,y,1.5,i%2?0x9cead4:0xf4dc93,.6);this.tweens.add({targets:dot,y:y-20,alpha:.1,duration:2200+i*110,yoyo:true,repeat:-1});}}
      this.input.on('pointerdown',pointer=>{if(!myTurn())return;const a=me(),dx=(pointer.x-a.x)*a.facing,dy=G.ground(room.terrain,a.x)-43-pointer.y;if(dx>0){$('angle').value=G.clamp(Math.round(Math.atan2(dy,dx)*180/Math.PI),10,85);updateAim();}});
      if(room)this.renderRoom();if(pendingShot){const shot=pendingShot;pendingShot=null;animate(shot);}
    }
    renderRoom(){
      if(!room)return;this.ground.clear();this.edges.clear();
      // The terrain is a shallow sculpted overlay; the server owns its collision heights.
      this.ground.fillStyle(0x263333,.96);this.ground.beginPath();this.ground.moveTo(0,675);room.terrain.forEach((y,i)=>this.ground.lineTo(i*5,y));this.ground.lineTo(1200,675);this.ground.closePath();this.ground.fillPath();
      this.edges.lineStyle(5,0x7b9b59,.95);this.edges.beginPath();room.terrain.forEach((y,i)=>i?this.edges.lineTo(i*5,y):this.edges.moveTo(0,y));this.edges.strokePath();
      this.edges.lineStyle(1,0xd8c886,.55);this.edges.beginPath();room.terrain.forEach((y,i)=>i?this.edges.lineTo(i*5,y-2):this.edges.moveTo(0,y-2));this.edges.strokePath();
      for(const actor of room.actors){let view=this.actors.get(actor.id);if(!view){
        const art=actor.bot?'enemy':actor.outfit==='medium'?'medium':'guide';
        const animated=!actor.appearance&&art!=='medium',sheetKey=art==='enemy'?'enemy':'guide';
        const sprite=animated?this.add.sprite(0,-4,sheetKey+'Sheet','idle-0').setOrigin(.5,1):this.add.sprite(0,-4,art).setOrigin(.5,1);
        const image=this.textures.get(art).getSourceImage(),height=actor.bot&&room.stage==='eclipse'?138:112;
        if(animated)sprite.setScale(height/A[sheetKey].baseHeight);else sprite.setDisplaySize(height*image.width/image.height,height);
        if(!actor.appearance&&actor.outfit==='jade')sprite.setTint(0x9ee3bc);
        const shadow=this.add.ellipse(0,0,55,10,0x0b1420,.5);
        const shield=this.add.ellipse(0,-48,95,120,0x89ddf1,.08).setStrokeStyle(2,0xa6eff1,.65).setVisible(false);
        const sigil=this.add.ellipse(0,0,66,15,0xffe0a0,.08).setStrokeStyle(1,0xffe0a0,.65);
        const bar=this.add.graphics();const name=this.add.text(0,-height-30,actor.name,{fontFamily:'Noto Sans Thai, sans-serif',fontSize:'13px',color:actor.team===me()?.team?'#c9f1d6':'#f4c2be',stroke:'#152235',strokeThickness:4}).setOrigin(.5);
        const hp=this.add.text(0,-height-12,'',{fontFamily:'sans-serif',fontSize:'10px',color:'#fff1d2',stroke:'#162335',strokeThickness:3}).setOrigin(.5);
        const marker=this.add.text(0,-height-60,'▼',{fontFamily:'sans-serif',fontSize:'20px',color:'#ffe6a1'}).setOrigin(.5);
        const container=this.add.container(actor.x,G.ground(room.terrain,actor.x),[shadow,sigil,sprite,shield,bar,name,hp,marker]).setDepth(4);view={container,sprite,bar,name,hp,marker,height,shield,sigil,baseX:sprite.scaleX,baseY:sprite.scaleY,alive:true,lastShield:0,animated,sheetKey,action:'',motionToken:0};this.actors.set(actor.id,view);
        if(actor.appearance){view.sprite.setVisible(false);this.customCharacter(view,actor.appearance);}else this.idle(view);
      }
        const y=G.ground(room.terrain,actor.x),moving=Math.abs(view.container.x-actor.x)>1||Math.abs(view.container.y-y)>1;
        if(moving){this.pose(view,'move');this.tweens.add({targets:view.container,x:actor.x,y,duration:reduced?0:330,ease:'Sine.easeOut',onComplete:()=>this.pose(view,actor.hp<=0?'defeat':actor.shield?'guard':'idle')});}
        view.container.setAlpha(actor.hp>0?1:.25);view.sprite.setFlipX(view.animated?actor.facing===-1:actor.bot?actor.facing===1:actor.facing===-1);view.marker.setVisible(actor.hp>0&&G.active(room).id===actor.id&&room.phase!=='finished');view.sigil.setVisible(actor.hp>0&&G.active(room).id===actor.id&&room.phase!=='finished');view.shield.setVisible(actor.shield>0&&actor.hp>0);
        if(actor.shield>0&&!view.lastShield){window.NativeAudio?.play('shield');this.pulse(actor.x,y-45,0x9cdfe7,55);this.effect('shield',actor.x,y-48,130);this.pose(view,'guard');}if(!actor.shield&&view.lastShield)this.pose(view,'idle');view.lastShield=actor.shield;
        if(actor.hp<=0&&view.alive){view.alive=false;this.tweens.killTweensOf(view.sprite);if(view.animated)this.pose(view,'defeat');else this.tweens.add({targets:view.sprite,angle:actor.facing*22,y:4,scaleY:view.baseY*.85,duration:350,ease:'Sine.easeOut'});this.pulse(actor.x,y-40,0xc6a5ef,35);}
        view.bar.clear();view.bar.fillStyle(0x122231,.95);view.bar.fillRoundedRect(-42,-view.height-6,84,7,3);view.bar.fillStyle(actor.team===me()?.team?0x90d4a7:0xdf8a88);view.bar.fillRoundedRect(-41,-view.height-5,82*Math.max(0,actor.hp/actor.maxHp),5,2);view.hp.setText(Math.ceil(actor.hp)+' / '+Math.ceil(actor.maxHp));
      }updateAim();
    }
    customCharacter(view,appearance){
      const signature=JSON.stringify(appearance);let entry=this.characterTextures.get(signature);
      if(!entry){
        const key='custom'+this.characterTextures.size;entry={key,ready:NativePaintedCharacter.ready.then(()=>{
          if(!this.sys.isActive())return false;const texture=this.textures.addCanvas(key+'Sheet',NativePaintedCharacter.textureSheet(appearance));
          NativeCharacter.actions.forEach((action,row)=>{for(let frame=0;frame<4;frame++)texture.add(action+'-'+frame,0,frame*256,row*320,256,320);this.anims.create({key:key+'-'+action,frames:Array.from({length:4},(_,f)=>({key:key+'Sheet',frame:action+'-'+f})),frameRate:action==='idle'?4:action==='cast'?12:8,repeat:['idle','move','aim','guard'].includes(action)?-1:0});});return true;
        })};this.characterTextures.set(signature,entry);
      }
      entry.ready.then(ok=>{if(!ok||!view.sprite.scene)return;this.tweens.killTweensOf(view.sprite);view.sprite.setTexture(entry.key+'Sheet','idle-0').setScale(view.height/320).setY(-4).setAngle(0).setVisible(true);view.baseX=view.sprite.scaleX;view.baseY=view.sprite.scaleY;view.animated=true;view.sheetKey=entry.key;this.idle(view);updateAim();}).catch(()=>{if(view.sprite.scene){view.sprite.setVisible(true);this.idle(view);}C.toast('โหลดรูปลักษณ์ไม่สำเร็จ กรุณารีเฟรช');});
    }
    idle(view){if(view.animated){this.pose(view,view.alive?'idle':'defeat');return;}if(reduced||!view.alive)return;this.tweens.add({targets:view.sprite,y:-6,angle:.6,duration:1900+Math.random()*700,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});}
    pose(view,name,restore=false){
      if(!view.animated)return;if(!view.alive&&name!=='defeat'&&name!=='victory')return;
      const key=view.sheetKey+'-'+name;if(view.action===name&&view.sprite.anims.isPlaying)return;
      view.action=name;const token=++view.motionToken;view.sprite.removeAllListeners('animationcomplete');
      if(reduced){view.sprite.anims.stop();view.sprite.setFrame(name+'-'+(name==='defeat'?3:0));return;}
      view.sprite.play(key,true);
      if(restore)view.sprite.once('animationcomplete',()=>{if(token===view.motionToken)this.pose(view,view.alive?(view.lastShield?'guard':'idle'):'defeat');});
    }
    effect(name,x,y,size){
      const fx=this.add.sprite(x,y,'vfxSheet',name+'-0').setDisplaySize(size,size).setDepth(11).setBlendMode(Phaser.BlendModes.ADD);
      if(reduced){fx.setFrame(name+'-2');this.time.delayedCall(180,()=>fx.destroy());}
      else{fx.play('vfx-'+name);fx.once('animationcomplete',()=>fx.destroy());}
    }
    pulse(x,y,color,size){const ring=this.add.circle(x,y,7,color,.12).setStrokeStyle(2,color,.8).setDepth(9);this.tweens.add({targets:ring,scale:size/7,alpha:0,duration:650,ease:'Sine.easeOut',onComplete:()=>ring.destroy()});}
    number(actor,text,color='#ffe0a0'){const label=this.add.text(actor.x,G.ground(room.terrain,actor.x)-100,text,{fontFamily:'Georgia',fontSize:'26px',fontStyle:'bold',color,stroke:'#342640',strokeThickness:4}).setOrigin(.5).setDepth(12);this.tweens.add({targets:label,y:label.y-48,alpha:0,duration:1300,ease:'Sine.easeOut',onComplete:()=>label.destroy()});}
  }
  function updateAim(){
    $('angle-value').textContent=angle()+'°';$('power-value').textContent=power()+'%';if(!scene)return;scene.aim.clear();scene.cursor.clear();if(!myTurn())return;
    const a=me();const aimView=scene.actors.get(a.id);if(aimView&&['idle','aim'].includes(aimView.action))scene.pose(aimView,'aim');const path=G.trajectory(room,a,angle(),power()),count=room.mode==='pvp'?Math.min(16,path.points.length):path.points.length;
    for(let i=0;i<count;i+=2){const p=path.points[i];scene.aim.fillStyle(0xffe5a2,.75*(1-i/(count+10)));scene.aim.fillCircle(p.x,p.y,2.5);}
    if(room.mode!=='pvp'){scene.cursor.lineStyle(1.5,0xffdfa1,.6);scene.cursor.strokeCircle(path.impact.x,path.impact.y,12);scene.cursor.lineBetween(path.impact.x-18,path.impact.y,path.impact.x+18,path.impact.y);}
  }
  function hud(){
    if(!room)return;$('empty-battle').hidden=true;const a=me(),current=G.active(room),isMine=myTurn();
    $('stage-title').textContent=room.mode==='pvp'?'ลานประลองจันทรา':G.stages.find(s=>s.id===room.stage).name;
    $('mode-label').textContent=room.mode==='pvp'?'LIVE PVP · 1 VS 1':room.mode==='coop'?'CO-OP DUNGEON · 2 PLAYERS':'SOLO ADVENTURE · บันทึกการเดินทาง';
    $('turn-badge').textContent=room.phase==='finished'?'จบการต่อสู้':room.phase==='flight'?'อาคมกำลังเดินทาง…':isMine?'✦ ตาของคุณ':`ตาของ ${current.name}`;
    $('turn-badge').classList.toggle('my-turn',!!isMine);$('wind-value').textContent=(room.wind<0?'← ':'→ ')+Math.abs(room.wind);$('round-value').textContent='รอบ '+room.round;
    const turnKey=room.id+':'+room.round+':'+room.turn;if(room.phase==='aim'&&lastTurn!==turnKey){lastTurn=turnKey;const banner=$('turn-announcement');banner.textContent=isMine?'ถึงตาคุณแล้ว ✦':`ตาของ ${current.name}`;banner.classList.remove('show');void banner.offsetWidth;banner.classList.add('show');}
    $('arena-hint').textContent=isMine?(room.mode==='pvp'?'เล็งมุม · ปรับแรง · กด SPACE เพื่อยิง':'เส้นประแสดงวิถีกระสุน · วงกลมคือจุดตกโดยประมาณ'):room.phase==='flight'?'รอดูผลการยิง…':'ดูทิศลมและวางแผนสำหรับตาถัดไป';
    if(a){$('hero-name').textContent=a.name;$('hero-health').textContent=Math.ceil(a.hp)+' / '+Math.ceil(a.maxHp);$('hero-hp').max=a.maxHp;$('hero-hp').value=a.hp;$('hero-energy').textContent=a.energy;const portraitKey=JSON.stringify(a.appearance||a.outfit);if($('hero-portrait').dataset.look!==portraitKey){$('hero-portrait').dataset.look=portraitKey;$('hero-portrait').src=a.appearance?NativeCharacter.uri(a.appearance):assets[a.outfit==='medium'?'medium':'guide'];$('hero-portrait').classList.toggle('custom-character',!!a.appearance);}$('face').textContent=a.facing===1?'ยิงไปทาง →':'← ยิงไปทาง';$('moves-left').textContent='ขยับได้ '+(2-a.moves)+' ครั้ง';}
    for(const id of ['angle','power','face','guard','fire'])$(id).disabled=!isMine;
    for(const id of ['move-left','move-right'])$(id).disabled=!isMine||a?.moves>=2;
    document.querySelectorAll('[data-skill]').forEach(button=>{const cost=button.dataset.skill==='normal'?0:button.dataset.skill==='burst'?30:45;button.disabled=!isMine||a.energy<cost;button.classList.toggle('selected',button.dataset.skill===skill);});
    if(a&&((skill==='burst'&&a.energy<30)||(skill==='spirit'&&a.energy<45))){skill='normal';document.querySelectorAll('[data-skill]').forEach(b=>b.classList.toggle('selected',b.dataset.skill===skill));}
    $('turn-order').replaceChildren(...room.actors.map(actor=>{const chip=document.createElement('span');chip.className='turn-chip'+(actor.id===current.id?' current':'')+(actor.hp<=0?' defeated':'');chip.textContent=(actor.id===C.profile.id?'คุณ':actor.name);return chip;}));
  }
  function celebrate(won){
    window.NativeAudio?.play(won?'victory':'defeat');if(!scene)return;for(const actor of room.actors){const v=scene.actors.get(actor.id);if(v)scene.pose(v,actor.team===room.winner?'victory':'defeat');}if(!won)return;
    for(const actor of room.actors.filter(a=>a.team===me().team&&a.hp>0)){const view=scene.actors.get(actor.id);if(!view)continue;scene.pulse(actor.x,G.ground(room.terrain,actor.x)-30,0xffdf9c,80);scene.effect('victory',actor.x,G.ground(room.terrain,actor.x)-85,180);if(!reduced&&!view.animated){scene.tweens.killTweensOf(view.sprite);scene.tweens.add({targets:view.sprite,y:-24,angle:4,duration:200,yoyo:true,repeat:2,ease:'Sine.easeOut',onComplete:()=>scene.idle(view)});}}
    if(!reduced)for(let i=0;i<24;i++){const star=scene.add.text(170+(i*41)%870,130+(i%4)*35,'✦',{fontSize:(12+i%4*3)+'px',color:i%2?'#ffe1a2':'#b6f0db'}).setDepth(15);scene.tweens.add({targets:star,y:star.y+150,x:star.x+Math.sin(i)*50,alpha:0,angle:180,duration:1100+i*20,onComplete:()=>star.destroy()});}
  }
  function animate(msg){
    flying=true;hud();if(!scene){pendingShot=msg;return;}scene.aim.clear();scene.cursor.clear();
    const flight=msg.flight,weapon=room.actors.find(a=>a.id===flight.actor).weapon,color=flight.skill==='spirit'||weapon==='lotus'?0x9cf2da:flight.skill==='burst'?0xf09dff:weapon==='flame'?0xffac69:0xffd786;
    const caster=room.actors.find(a=>a.id===flight.actor),view=scene.actors.get(flight.actor);
    if(view?.animated)scene.pose(view,'cast',true);
    if(view&&!view.animated&&!reduced){scene.tweens.killTweensOf(view.sprite);scene.tweens.chain({targets:view.sprite,tweens:[{angle:-caster.facing*9,scaleX:view.baseX*.93,scaleY:view.baseY*1.04,duration:130,ease:'Sine.easeIn'},{angle:caster.facing*11,scaleX:view.baseX*1.06,scaleY:view.baseY*.96,duration:90},{angle:0,scaleX:view.baseX,scaleY:view.baseY,y:-4,duration:220,ease:'Back.easeOut'}],onComplete:()=>scene.idle(view)});}
    scene.pulse(flight.points[0].x,flight.points[0].y,color,28);window.NativeAudio?.play('cast');
    const orb=scene.add.circle(flight.points[0].x,flight.points[0].y,6,color).setDepth(10),halo=scene.add.circle(orb.x,orb.y,15,color,.2).setDepth(9),glyph=scene.add.text(orb.x,orb.y,flight.skill==='burst'?'✺':weapon==='lotus'?'❀':'✦',{fontFamily:'Georgia',fontSize:'23px',color:'#fff2c9'}).setOrigin(.5).setDepth(11),progress={t:0};
    const motes=Array.from({length:3},(_,i)=>scene.add.circle(orb.x,orb.y,2.5,color,.75-i*.15).setDepth(9));
    if(shotTween)shotTween.stop();
    shotTween=scene.tweens.add({targets:progress,t:flight.points.length-1,delay:170,duration:Math.max(400,flight.points.length*50),ease:'Linear',onUpdate:()=>{
      const i=Math.floor(progress.t),a=flight.points[i],b=flight.points[Math.min(i+1,flight.points.length-1)],f=progress.t-i;orb.setPosition(a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f);halo.setPosition(orb.x,orb.y);glyph.setPosition(orb.x,orb.y).setRotation(progress.t*.3);motes.forEach((m,n)=>{const t=progress.t*.5+n*2.1;m.setPosition(orb.x+Math.cos(t)*(14+n*3),orb.y+Math.sin(t)*10);});scene.trail.clear();scene.trail.lineStyle(flight.skill==='burst'?5:3,color,.65);scene.trail.beginPath();for(let j=Math.max(0,i-10);j<=i;j++){const p=flight.points[j];j===Math.max(0,i-10)?scene.trail.moveTo(p.x,p.y):scene.trail.lineTo(p.x,p.y);}scene.trail.strokePath();
    },onComplete:()=>{
      orb.destroy();halo.destroy();glyph.destroy();motes.forEach(m=>m.destroy());scene.trail.clear();flying=false;scene.renderRoom();
      const {x,y}=flight.impact;scene.effect(flight.skill==='burst'?'burst':'impact',x,y-18,flight.skill==='burst'?230:145);const ring=scene.add.circle(x,y,10,color,.5).setDepth(9);scene.tweens.add({targets:ring,scale:flight.skill==='burst'?11:7,alpha:0,duration:500,onComplete:()=>ring.destroy()});
      if(!reduced)scene.cameras.main.shake(140,.003);
      for(let i=0;i<14;i++){const spark=scene.add.circle(x,y,2+i%3,color).setDepth(10),r=i*Math.PI*2/14;scene.tweens.add({targets:spark,x:x+Math.cos(r)*65,y:y+Math.sin(r)*45-20,alpha:0,duration:450+i*15,onComplete:()=>spark.destroy()});}
      scene.pulse(x,y,color,flight.skill==='burst'?110:65);
      for(const hit of flight.damage){const actor=room.actors.find(a=>a.id===hit.id),target=scene.actors.get(hit.id);scene.number(actor,'−'+hit.amount);if(target&&actor.hp>0){scene.pose(target,'hit',true);scene.effect('hit',actor.x,G.ground(room.terrain,actor.x)-60,95);target.sprite.setTintFill(0xffe6cf);scene.time.delayedCall(120,()=>{target.sprite.clearTint();if(!actor.appearance&&actor.outfit==='jade')target.sprite.setTint(0x9ee3bc);});if(!reduced&&!target.animated)scene.tweens.add({targets:target.sprite,angle:caster.facing*13,duration:90,yoyo:true,repeat:1});}}
      if(flight.healing){scene.effect('heal',caster.x,G.ground(room.terrain,caster.x)-55,155);scene.number(caster,'+'+flight.healing,'#b3ffda');scene.pulse(caster.x,G.ground(room.terrain,caster.x)-40,0x9ff0ce,65);window.NativeAudio?.play('heal');}
      $('combat-feed').textContent=flight.damage.length?flight.damage.map(h=>`${room.actors.find(a=>a.id===h.id).name} −${h.amount} HP`).join(' · '):'กระสุนพลาดเป้า · ลองปรับแรงหรือมุมในตาถัดไป';
      window.NativeAudio?.play(flight.skill==='burst'?'burst':'impact');hud();if(pendingReward)showReward(pendingReward);
    }});
  }
  function showReward(msg){pendingReward=msg;if(flying)return;if(!rewardPlayed){rewardPlayed=true;celebrate(msg.won);}$('result-title').textContent=msg.won?'ชัยชนะแห่งจันทรา':'พักก่อน… แล้วลองใหม่';$('result-medal').textContent=msg.won?'✦':'☽';$('result-description').textContent=msg.won?'รางวัลถูกเก็บเข้าตัวละครแล้ว':'ทุกการเดินทางทำให้เราแข็งแกร่งขึ้น';$('result-loot').innerHTML=`<div class="loot-cell">${NativeUI.icon('gold')}<b>+${msg.loot.gold}</b><small>เหรียญ</small></div><div class="loot-cell">${NativeUI.icon('enhancement_stone')}<b>+${msg.loot.stones}</b><small>หินตีบวก</small></div><div class="loot-cell">${NativeUI.icon('experience_vial')}<b>+${msg.loot.xp}</b><small>EXP</small></div>`;$('retry').textContent=room?.mode==='solo'?'เล่นด่านนี้อีกครั้ง →':'กลับไปจับคู่ใหม่ →';if(!$('result-dialog').open)setTimeout(()=>{if(pendingReward===msg&&!$('result-dialog').open)$('result-dialog').showModal();},650);}
  document.addEventListener('native-room',event=>{const msg=event.detail,changed=room&&room.id!==msg.room.id;room=msg.room;if(changed&&scene){for(const v of scene.actors.values())v.container.destroy();scene.actors.clear();pendingReward=null;rewardPlayed=false;$('combat-feed').textContent='';}if(msg.type==='shot')animate(msg);else{flying=room.phase==='flight';scene?.renderRoom();hud();if(room.phase==='finished'&&!pendingReward){$('result-title').textContent='จบการต่อสู้';}}});
  document.addEventListener('native-reward',event=>showReward(event.detail));
  document.addEventListener('native-offline',()=>{hud();$('turn-badge').textContent='ขาดการเชื่อมต่อ · กำลังเชื่อมใหม่';});
  $('angle').addEventListener('input',updateAim);$('power').addEventListener('input',updateAim);
  function motionLabel(){$('battle-motion-toggle').textContent=reduced?'✧ เปิดการเคลื่อนไหว':'✧ เคลื่อนไหวเปิดอยู่';$('battle-motion-toggle').setAttribute('aria-pressed',String(!reduced));}
  $('battle-motion-toggle').addEventListener('click',()=>{reduced=!reduced;try{localStorage.setItem('thainative-motion',reduced?'off':'on');}catch{}if(scene)for(const view of scene.actors.values()){scene.tweens.killTweensOf(view.sprite);view.sprite.setAngle(0).setY(-4).setScale(view.baseX,view.baseY);scene.idle(view);}motionLabel();});motionLabel();
  document.querySelectorAll('[data-skill]').forEach(button=>button.addEventListener('click',()=>{skill=button.dataset.skill;hud();updateAim();}));
  function fire(){if(!myTurn()||$('fire').disabled)return;if(C.send({type:'shoot',angle:angle(),power:power(),skill})){$('fire').disabled=true;$('fire').querySelector('span').textContent='ปล่อยอาคม';}}
  $('fire').addEventListener('click',fire);$('guard').addEventListener('click',()=>C.send({type:'guard'}));$('move-left').addEventListener('click',()=>C.send({type:'move',direction:-1}));$('move-right').addEventListener('click',()=>C.send({type:'move',direction:1}));$('face').addEventListener('click',()=>C.send({type:'face',direction:-me().facing}));
  document.addEventListener('keydown',event=>{if(event.target.matches('input,textarea,button')||document.querySelector('dialog[open]')||!myTurn())return;if(event.code==='Space'){event.preventDefault();if(!event.repeat)fire();}else if(['ArrowUp','ArrowDown'].includes(event.code)){event.preventDefault();$('angle').value=G.clamp(angle()+(event.code==='ArrowUp'?1:-1),10,85);updateAim();}else if(['ArrowLeft','ArrowRight'].includes(event.code)){event.preventDefault();$('power').value=G.clamp(power()+(event.code==='ArrowRight'?1:-1),15,100);updateAim();}});
  $('leave-battle').addEventListener('click',()=>{if(!room||room.phase==='finished'){location.href='./';return;}$('leave-dialog').showModal();});$('stay').addEventListener('click',()=>$('leave-dialog').close());$('confirm-leave').addEventListener('click',()=>{C.send({type:'leave'});$('leave-dialog').close();});
  $('retry').addEventListener('click',()=>{if(room.mode!=='solo'){location.href='./';return;}$('result-dialog').close();pendingReward=null;C.send({type:'play',mode:'solo',stage:room.stage});});
  setInterval(()=>{if(room)$('turn-clock').textContent=room.phase==='aim'?Math.max(0,Math.ceil((room.deadline-Date.now())/1000)):'·';},200);
  setTimeout(()=>{if(!room)$('empty-battle').hidden=false;},5000);
  try{new Phaser.Game({type:Phaser.AUTO,parent:'battle-stage',width:1200,height:675,backgroundColor:'#102234',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},scene:[Arena],audio:{noAudio:true}});}catch{C.toast('เปิดสนามไม่สำเร็จ กรุณารีเฟรชหรือใช้เบราว์เซอร์ที่รองรับ Canvas');}
})();
