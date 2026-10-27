'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{promisify}=require('node:util'),derive=promisify(crypto.scrypt);
function accounts(dataDir){
  const file=path.join(dataDir,'card-accounts.json'),records=Object.assign(Object.create(null),fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{}),attempts=new Map(),locks=new Set();
  function save(){fs.writeFileSync(file+'.tmp',JSON.stringify(records));fs.renameSync(file+'.tmp',file);}
  function limited(key,max){const now=Date.now(),a=attempts.get(key);if(a&&now-a.time<900000&&a.count>=max)throw Error('ลองหลายครั้งเกินไป กรุณารอ 15 นาที');if(!a||now-a.time>=900000)attempts.set(key,{time:now,count:1});else a.count++;if(attempts.size>5000)for(const [k,v]of attempts)if(now-v.time>=900000)attempts.delete(k);}
  const keyHash=key=>crypto.createHash('sha256').update(key).digest('hex');
  async function action(input,profile,ip){
    const username=typeof input.username==='string'?input.username.trim().toLowerCase():'';
    if(!/^[a-z0-9_]{4,24}$/.test(username))throw Error('ชื่อบัญชีใช้ a-z, 0-9, _ จำนวน 4–24 ตัว');
    if(!['register','login','recover'].includes(input.action))throw Error('ไม่พบคำสั่งบัญชี');
    if(typeof input.password!=='string'||input.password.length<10||input.password.length>128)throw Error('รหัสผ่านต้องมี 10–128 ตัวอักษร');
    limited('user:'+username,8);limited('ip:'+ip,60);if(locks.has(username))throw Error('กำลังตรวจสอบบัญชี กรุณารอสักครู่');locks.add(username);
    try{
      const existing=records[username];
      if(input.action==='register'){
        if(existing||Object.values(records).some(a=>a.profileId===profile.id))throw Error('ชื่อบัญชีนี้ถูกใช้แล้ว หรือบัญชีนี้ผูกไว้แล้ว');
        const salt=crypto.randomBytes(16).toString('hex'),hash=await derive(input.password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024}),recovery=crypto.randomBytes(24).toString('hex');
        if(Object.values(records).some(a=>a.profileId===profile.id))throw Error('บัญชีนี้ผูกไว้แล้ว');
        records[username]={profileId:profile.id,salt,hash:hash.toString('hex'),recovery:keyHash(recovery)};save();return {profileId:profile.id,recovery,username};
      }
      // Run scrypt even when the username is missing, so the error path does comparable work.
      const hash=await derive(input.password,existing?.salt||'missing-account-dummy-salt',64,{N:32768,r:8,p:3,maxmem:64*1024*1024});
      if(input.action==='login'){
        if(!existing||!crypto.timingSafeEqual(hash,Buffer.from(existing.hash,'hex')))throw Error('ชื่อบัญชีหรือข้อมูลยืนยันไม่ถูกต้อง');
      }else{
        if(!existing||typeof input.recovery!=='string'||!/^[a-f0-9]{48}$/.test(input.recovery)||!crypto.timingSafeEqual(Buffer.from(keyHash(input.recovery),'hex'),Buffer.from(existing.recovery,'hex')))throw Error('ชื่อบัญชีหรือข้อมูลยืนยันไม่ถูกต้อง');
        const salt=crypto.randomBytes(16).toString('hex'),newHash=await derive(input.password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024}),recovery=crypto.randomBytes(24).toString('hex');existing.salt=salt;existing.hash=newHash.toString('hex');existing.recovery=keyHash(recovery);save();return {profileId:existing.profileId,recovery,username};
      }
      return {profileId:existing.profileId,username};
    }finally{locks.delete(username);}
  }
  return {action,username:id=>Object.entries(records).find(([,a])=>a.profileId===id)?.[0]||null};
}
module.exports={accounts};
