(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./rpg-core.js'),require('./sprite-character-data.js'));else root.NativePaintedCharacter=factory(root.NativeRPG,root.NativeSpriteParts);})(typeof globalThis!=='undefined'?globalThis:this,(G,D)=>{
  'use strict';
  const actions=['idle','move','aim','cast','hit','guard','victory','defeat'],images={},parts=new Map(),previews=new Map(),choices=new Map(),urls=new WeakMap();let loaded=false;
  const canvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
  function hsv(r,g,b){r/=255;g/=255;b/=255;const v=Math.max(r,g,b),n=Math.min(r,g,b),d=v-n;let h=d?(v===r?(g-b)/d+(g<b?6:0):v===g?(b-r)/d+2:(r-g)/d+4)*60:0;return [h,v?d/v:0,v];}
  function rgb(h,s,v){const c=v*s,x=c*(1-Math.abs(h/60%2-1)),m=v-c,a=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return a.map(n=>Math.round((n+m)*255));}
  const clamp=v=>Math.max(0,Math.min(1,v));
  function palette(a){return Object.fromEntries(['skinColor','hairColor','outfitColor','accentColor','headColor'].map(key=>{const hex=a[key];return [key,hsv(parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16))];}));}
  function dye(rgbValue,kind,a,colors,skin=true){
    const [h,s,v]=hsv(...rgbValue);let key,base=.65;
    if(skin&&h>=9&&h<40&&s>.08&&s<.65&&v>.55){key='skinColor';base=.94;}
    else if(kind==='body'&&h>=155&&h<=255&&s>.2&&v>.13){key='outfitColor';base=.55;}
    else if(kind!=='face'&&h>=25&&h<66&&s>.35&&v>.28){key='accentColor';base=.85;}
    else if((kind==='hair'||kind==='head')&&h>=255&&s>.12&&v>.12){key=kind==='hair'?'hairColor':'headColor';base=.52;}
    if(!key)return rgbValue;
    const target=(colors||palette(a))[key];
    return rgb(target[0],clamp(target[1]*(.75+s*.35)),clamp(target[2]+(v-base)*.85));
  }
  function bodyRef(a){const legacy={ranger:'forest',medium:'spirit',jade:'royal'},id=legacy[a.outfit]?`${a.gender}-${legacy[a.outfit]}-1`:a.outfit;const sheet=legacy[a.outfit]?a.gender:[a.gender+'-extra',a.gender+'-world',a.gender].find(key=>D.sheets[key].frames[id]);return {sheet,id};}
  function faceRef(a){const id=a.gender+'-'+a.face;return {sheet:D.sheets['faces-extra'].frames[id]?'faces-extra':'parts',id};}
  const skinAt=(f,x,y)=>f.skin?.some(([left,top,right,bottom])=>x>=left&&x<right&&y>=top&&y<bottom)||false;
  function part(sheet,id,kind,a){
    const keys={face:['skinColor'],body:['skinColor','outfitColor','accentColor'],hair:['skinColor','hairColor','accentColor'],head:['skinColor','headColor','accentColor']}[kind];
    const key=JSON.stringify([sheet,id,kind,...keys.map(key=>a[key])]);if(parts.has(key))return parts.get(key);
    const f=D.sheets[sheet].frames[id],c=canvas(f.w,f.h),ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(images[sheet],f.x,f.y,f.w,f.h,0,0,f.w,f.h);const pixels=ctx.getImageData(0,0,f.w,f.h);
    const colors=palette(a);
    for(let i=0;i<pixels.data.length;i+=4){const x=i/4%f.w,y=Math.floor(i/4/f.w),span=f.spans?.[y];if(pixels.data[i+3]<8||(span&&(x<span[0]||x>=span[1]))){pixels.data[i+3]=0;continue;}const color=dye([pixels.data[i],pixels.data[i+1],pixels.data[i+2]],kind,a,colors,kind!=='body'||skinAt(f,x,y));pixels.data.set(color,i);}
    ctx.putImageData(pixels,0,0);if(parts.size>=80)parts.delete(parts.keys().next().value);parts.set(key,c);return c;
  }
  function frameLayout(a,action='idle',frame=0){
    const layers=[],ref=bodyRef(a),body=D.sheets[ref.sheet].frames[ref.id],bodyWidth=body.w/body.h*142;
    const add=(sheet,id,kind,x,y,w,h)=>{const f=D.sheets[sheet].frames[id];layers.push({sheet,id,kind,x,y,w,h:h??f.h/f.w*w});};
    const face=faceRef(a);add(ref.sheet,ref.id,'body',128-bodyWidth/2,154,bodyWidth);add(face.sheet,face.id,'face',64,43,128);
    const extraHair=D.sheets['hair-extra'].frames[a.hair],hair=extraHair?.placement||{crop:[38,20,180],bob:[38,25,180],tails:[33,15,190],long:[38,15,180]}[a.hair];add(extraHair?'hair-extra':'parts',a.hair,'hair',...hair);
    if(a.head!=='none')add('parts',a.head,'head',...{flower:[161,29,43],ribbon:[158,22,58],crown:[66,0,124],cat:[63,0,130]}[a.head]);
    const phase=[0,1,0,-1][frame],bob=action==='move'?-Math.abs(phase)*5:action==='victory'?-Math.abs(phase)*12:action==='idle'?phase*1.5:0;
    const tilt=action==='cast'?[0,-5,8,1][frame]:action==='hit'?-8:action==='defeat'?[0,-8,-18,-26][frame]:action==='move'?phase*3:action==='guard'?-4:action==='aim'?3:0;
    const angle=tilt*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle),corners=layers.flatMap(l=>[[l.x,l.y],[l.x+l.w,l.y],[l.x,l.y+l.h],[l.x+l.w,l.y+l.h]]).map(([x,y])=>[cos*(x-128)-sin*(y-285),sin*(x-128)+cos*(y-285)]);
    const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]),scale=Math.min(1,248/(Math.max(...xs)-Math.min(...xs)),312/(Math.max(...ys)-Math.min(...ys)));
    const left=128+Math.min(...xs)*scale,right=128+Math.max(...xs)*scale,top=285+bob+Math.min(...ys)*scale,bottom=285+bob+Math.max(...ys)*scale;
    const dx=Math.max(4-left,Math.min(0,252-right)),dy=Math.max(4-top,Math.min(0,316-bottom));
    return {layers,angle,scale,x:128+dx,y:285+bob+dy,bounds:{left:left+dx,right:right+dx,top:top+dy,bottom:bottom+dy}};
  }
  function paint(ctx,a,action='idle',frame=0){
    const layout=frameLayout(a,action,frame);
    // shortcut: layered idle/recoil poses; replace with articulated limbs for full walk/attack cycles.
    ctx.save();ctx.translate(layout.x,layout.y);ctx.scale(layout.scale,layout.scale);ctx.rotate(layout.angle);ctx.translate(-128,-285);
    for(const l of layout.layers)ctx.drawImage(part(l.sheet,l.id,l.kind,a),l.x,l.y,l.w,l.h);
    ctx.restore();
  }
  function uri(value){if(!loaded)return 'assets/npc-summon.png';const a=G.validateAppearance(value),key=JSON.stringify(a);if(previews.has(key))return previews.get(key);const c=canvas(256,320);paint(c.getContext('2d'),a);const result=c.toDataURL();if(previews.size>=40)previews.delete(previews.keys().next().value);previews.set(key,result);return result;}
  function thumbnail(o,value){if(!loaded)return 'assets/npc-summon.png';const a={...value,...(value.outfit===o.id?{}:o.colors),outfit:o.id},ref=bodyRef(a),body=part(ref.sheet,ref.id,'body',a);if(!urls.has(body))urls.set(body,body.toDataURL());return urls.get(body);}
  function choiceThumbnail(kind,id,value){
    if(!loaded)return 'assets/npc-summon.png';const a=G.validateAppearance({...value,[kind]:id,head:'none'}),key=JSON.stringify([kind,id,a.gender,a.face,a.hair,a.skinColor,a.hairColor,a.accentColor]);if(choices.has(key))return choices.get(key);
    const c=canvas(256,240),ctx=c.getContext('2d');
    if(kind==='face'){const ref=faceRef(a),face=part(ref.sheet,ref.id,'face',a);ctx.drawImage(face,28,24,200,face.height/face.width*200);}
    else for(const l of frameLayout(a).layers.filter(l=>l.kind==='hair'||l.kind==='face'))ctx.drawImage(part(l.sheet,l.id,l.kind,a),l.x,l.y,l.w,l.h);
    const result=c.toDataURL();if(choices.size>=48)choices.delete(choices.keys().next().value);choices.set(key,result);return result;
  }
  function textureSheet(value){const a=G.validateAppearance(value),c=canvas(1024,2560),ctx=c.getContext('2d');actions.forEach((action,row)=>{for(let f=0;f<4;f++){ctx.save();ctx.translate(f*256,row*320);paint(ctx,a,action,f);ctx.restore();}});return c;}
  const ready=typeof Image==='undefined'?Promise.resolve():Promise.all(Object.entries(D.sheets).map(([key,sheet])=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{images[key]=image;resolve();};image.onerror=()=>reject(Error('โหลดชุดตัวละครไม่สำเร็จ'));image.src=sheet.image;}))).then(()=>{loaded=true;});
  return {ready,uri,thumbnail,choiceThumbnail,textureSheet,dye,bodyRef,frameLayout,skinAt};
});
