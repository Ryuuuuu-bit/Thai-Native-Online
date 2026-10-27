(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.NativeContent=api;})(typeof window!=='undefined'?window:globalThis,()=>{
'use strict';
const quests=[
{id:'play',name:'ร่วมประลอง',text:'เล่นจนจบ 2 เกมที่เข้าเงื่อนไข',key:'games',goal:2,tickets:1,xp:60,coins:50},
{id:'summon',name:'ผูกมิตรวิญญาณ',text:'อัญเชิญจากมือสะสม 10 ตัว',key:'summons',goal:10,tickets:1,xp:60,coins:30},
{id:'shield',name:'วิชาป้องกัน',text:'ป้องกันความเสียหายสะสม 12 หน่วย',key:'blocked',goal:12,tickets:1,xp:70,coins:40},
{id:'damage',name:'ลองคมอาคม',text:'ทำความเสียหายสะสม 40 หน่วย',key:'damage',goal:40,tickets:1,xp:60,coins:30},
{id:'heal',name:'คืนขวัญ',text:'ฟื้นฟูชีวิตสะสม 12 หน่วย',key:'healing',goal:12,tickets:1,xp:70,coins:40},
{id:'attack',name:'อ่านจังหวะ',text:'สั่งโจมตีสะสม 8 ครั้ง',key:'attacks',goal:8,tickets:1,xp:60,coins:30}
];
const lessons=[{id:'summon',name:'บทที่ 1 · เรียกเพื่อนร่วมทาง',text:'เลือกผีเรือนจิ๋วในมือ แล้วกดอัญเชิญ',goal:'อัญเชิญภูติ 1 ตัว',metric:'summons'},
{id:'shield',name:'บทที่ 2 · ปกป้องด้วยโล่',text:'เลือกภูติตะกร้าหวาย แล้วเลือกเพื่อนบนสนามเพื่อมอบโล่',goal:'มอบโล่ 1 ครั้ง',metric:'shields'},
{id:'attack',name:'บทที่ 3 · แลกตัวและโต้กลับ',text:'เลือกสมิงขอบเขียว แล้วเลือกศัตรูเพื่อโจมตี ทั้งสองแลกความเสียหายพร้อมกัน',goal:'สั่งโจมตี 1 ครั้ง',metric:'attacks'}];
const puzzles=[{id:'lethal',name:'สองจังหวะปิดตำนาน',text:'คู่ต่อสู้เหลือ 3 HP ใช้ภูติที่พร้อมอยู่แล้วชนะภายในเทิร์นนี้',maxTurn:1},
{id:'freeze',name:'หยุดเขี้ยวพยัคฆ์',text:'คู่ต่อสู้เหลือ 4 HP ตรึงเป้าหมายก่อนโจมตีเพื่อเพิ่มความเสียหายให้จระเข้',maxTurn:1},
{id:'shield',name:'โล่ก่อนลุย',text:'มอบโล่อย่างน้อย 1 ครั้ง แล้วใช้ภูติทั้งสองชนะภายในเทิร์นนี้',maxTurn:1,requiresShield:true}];
const bosses=[{id:'wood',name:'ราชินีไทรพันวิญญาณ',text:'เริ่มเทิร์นบอส: เรียกภูติจิ๋วเพิ่ม 1 ตัว',card:'g020'},
{id:'fire',name:'พญาสมิงสุริยัน',text:'บอสเริ่มด้วยอาคมสูงสุดเพิ่ม 1 และชีวิต 36',card:'g040'},
{id:'water',name:'พญานาคจันทราสินธุ์',text:'เริ่มเทิร์นบอส: มอบโล่ให้ภูติที่ชีวิตต่ำที่สุด',card:'g060'},
{id:'shadow',name:'พญาภูติราตรีพันเงา',text:'เริ่มเทิร์นบอส: ชุบภูติต้นทุนไม่เกิน 2 จำนวน 1 ตัว',card:'g080'},
{id:'light',name:'มหาภูติพิทักษ์สยาม',text:'เริ่มเทิร์นบอส: ฟื้นชีวิตบอส 1 สูงสุด 36',card:'g100'}];
const cosmetics=[{id:'back-default',type:'back',name:'หลังการ์ดแสงโคม',price:0,color:'#b69c77'},
{id:'avatar-default',type:'avatar',name:'ผู้ผูกวิญญาณ',price:0,icon:'✧'},
{id:'board-default',type:'board',name:'ลานจันทรา',price:0,color:'#243b37'},
{id:'back-jade',type:'back',name:'หลังการ์ดหยกพฤกษา',price:300,color:'#7bd6a1'},
{id:'back-violet',type:'back',name:'หลังการ์ดราตรี',price:300,color:'#c19de3'},
{id:'avatar-fox',type:'avatar',name:'จิ้งจอกเฝ้าศาล',price:500,icon:'❀'},
{id:'board-gold',type:'board',name:'ลานโคมทอง',price:700,color:'#68513e'},
{id:'back-boss',type:'back',name:'หลังการ์ดห้าตำนาน',price:null,color:'#f1d088'},
{id:'avatar-master',type:'avatar',name:'ตราจ้าวภูติ',price:null,icon:'♛'},
{id:'back-season',type:'back',name:'หลังการ์ดฤดูกาล',price:null,color:'#9ccddd'}];
const achievements=[{id:'student',name:'ศิษย์แห่งแสงโคม',text:'ผ่านบทฝึกทั้ง 3 บท',tickets:2},
{id:'puzzler',name:'นักอ่านอาคม',text:'ผ่านปริศนาทั้ง 3 ข้อ',tickets:3},
{id:'bosses',name:'ผู้พิชิตห้าตำนาน',text:'ชนะบอสทั้งห้าธาตุ',tickets:3,cosmetic:'back-boss'},
{id:'basic',name:'วิชาพื้นฐานขั้นครู',text:'ชนะเกมที่เข้าเงื่อนไขด้วยเด็คเฉพาะ C และ B',tickets:2},
{id:'elements',name:'สหายห้าธาตุ',text:'ใช้การ์ดครบทั้ง 5 ธาตุในเกมที่เข้าเงื่อนไข',tickets:2}];
const emotes=[{id:'hello',text:'สวัสดี สหายวิญญาณ ✧'},{id:'thanks',text:'ขอบคุณนะ ❀'},{id:'nice',text:'อาคมยอดเยี่ยม! ✦'},{id:'think',text:'ขอคิดสักครู่… ☽'},{id:'oops',text:'ภูติแกล้งอีกแล้ว! 👻'},{id:'gg',text:'เป็นการประลองที่ดี ⚔'}];
const craft={C:30,B:60,A:150,S:480,SS:1200},dust={C:5,B:10,A:25,S:80,SS:200};
const ranks=[{min:0,name:'ผู้ฝึกอาคม'},{min:1100,name:'ผู้ผูกวิญญาณ'},{min:1250,name:'เจ้าศาล'},{min:1400,name:'จ้าวภูติ'},{min:1600,name:'ตำนานสยาม'}];
function rank(rating){return ranks.filter(r=>rating>=r.min).at(-1).name;}
function period(now=Date.now()){const day=Math.floor((now+7*3600000)/86400000),week=Math.floor((day+3)/7),season=Math.floor((day-20752)/28);return {day,week,season:'S'+(season+1),seasonEnd:(20752+(season+1)*28)*86400000-7*3600000};}
function weekly(now=Date.now()){return period(now).week%2?{id:'low',name:'คืนแห่งวิชาพื้นฐาน',text:'ใช้ได้เฉพาะการ์ด C และ B',faction:'fire'}:{id:'dual',name:'สองธาตุผสานวิญญาณ',text:'เด็คมีได้ไม่เกินสองธาตุ',faction:'water'};}
function titleName(id){const [kind,key]=(id||'').split(':');return kind==='achievement'?achievements.find(a=>a.id===key)?.name||'':kind==='faction'?{wood:'ศิษย์พฤกษา',fire:'ศิษย์อัคคี',water:'ศิษย์จันทราสินธุ์',shadow:'ศิษย์ราตรี',light:'ศิษย์แสงโคม'}[key]||'':kind==='card'?'สหายภูติ':'';}
return {quests,lessons,puzzles,bosses,cosmetics,achievements,emotes,craft,dust,ranks,rank,period,weekly,titleName};
});
