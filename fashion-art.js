(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.NativeFashionArt=factory();})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const cuts={
    male:{
      siam:'M96 175L160 175 166 236 151 245 128 235 104 245 89 236Z',
      forest:'M94 175L162 175 172 235 147 241 128 232 107 241 84 235Z',
      spirit:'M96 173L160 173 182 267 147 258 128 276 109 258 74 267Z',
      royal:'M93 174L163 174 173 225 159 251 128 239 97 251 83 225Z',
      street:'M91 175Q128 163 165 175L174 237 82 237Z',
      academy:'M96 174L160 174 168 243 145 239 128 230 110 239 88 243Z',
      festival:'M91 173L165 173 178 246 143 241 128 256 113 241 78 246Z',
      sea:'M96 174L160 174 166 232Q128 244 90 232Z',
      craft:'M95 176L161 176 167 245 89 245Z',
      winter:'M91 174L165 174 180 264Q128 279 76 264Z'
    },
    female:{
      siam:'M103 172L155 178 158 216 174 267Q128 280 86 267L99 215Z',
      forest:'M98 175L158 175 161 217 180 250 155 246 142 257 128 247 113 257 100 246 76 250 96 217Z',
      spirit:'M102 173L154 173 157 210 189 263 163 258 146 277 128 266 110 277 93 258 67 263 99 210Z',
      royal:'M98 174L158 174 156 210 189 261Q160 280 128 266Q96 280 67 261L100 210Z',
      street:'M92 173L164 173 168 217 155 224 174 252 82 252 101 224 88 217Z',
      academy:'M99 174L157 174 161 215 180 254 76 254 95 215Z',
      festival:'M99 173L157 173 157 209Q171 235 190 262Q161 277 128 269Q95 277 66 262Q85 235 99 209Z',
      sea:'M97 174L159 174 159 211 181 255Q128 270 75 255L97 211Z',
      craft:'M98 174L158 174 158 210 177 263Q128 276 79 263L98 210Z',
      winter:'M96 173L160 173 166 223 185 272Q128 286 71 272L90 223Z'
    }
  };
  const path=(d,fill,extra='')=>`<path d="${d}" fill="${fill}" ${extra}/>`;
  function draw(o,a){
    const female=o.gender==='female',v=o.variant,c=a.outfitColor,t=a.accentColor;
    const line=(d,width=2)=>path(d,'none',`stroke="${t}" stroke-width="${width}"`);
    const bow=(x,y,size=1)=>`<g transform="translate(${x} ${y}) scale(${size})">${path('M0 0L-14 -9 -16 7 0 3 16 7 14 -9Z',t)}<circle r="3" fill="${c}"/></g>`;
    const button=(x,y)=>`<circle cx="${x}" cy="${y}" r="3" fill="${t}" stroke-width="1"/>`;
    const pocket=(x,y)=>`<rect x="${x}" y="${y}" width="17" height="17" rx="3" fill="${t}"/>${path(`M${x} ${y+5}h17`,'none','stroke-width="1.5"')}`;
    const flower=(x,y)=>`<g transform="translate(${x} ${y})" fill="${t}" stroke-width="1">${[0,72,144,216,288].map(r=>`<ellipse cy="-5" rx="3.5" ry="5" transform="rotate(${r})"/>`).join('')}<circle r="3" fill="${c}"/></g>`;
    const star=(x,y)=>path(`M${x} ${y-9}l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z`,t,'stroke-width="1.5"');
    const belt=path(`M94 215Q128 ${female?225:219} 162 215L164 224Q128 231 92 224Z`,t)+`<rect x="122" y="215" width="12" height="12" rx="2" fill="${c}"/>`;
    let back='';
    if(['spirit','royal'].includes(o.theme)||v===1){back=path(female?'M93 172Q72 203 67 256L89 246 106 269 128 244 150 269 167 246 189 256Q184 203 163 172Z':'M91 173L70 258 98 249 111 264 128 249 145 264 158 249 186 258 165 173Z',t)+line('M89 199L80 242M167 199L176 242');}
    let body=path(cuts[o.gender][o.theme],c);
    const themeDetails={
      siam:female?path('M102 174L158 200 150 214 98 184Z',t)+line('M104 231L98 261M116 233L111 266M140 233L145 266M152 231L158 261'):line('M128 179V231',4)+[190,202,214].map(y=>button(135,y)).join('')+path('M104 238L113 265 126 246 132 265 150 238',c),
      forest:line('M105 179L112 210M151 179L144 210',6)+pocket(91,201)+pocket(148,201)+path('M170 210Q191 208 188 231L172 236Z',t),
      spirit:path('M104 174L128 202 152 174 156 187 128 214 100 187Z',t)+path('M128 198L137 215 128 227 119 215Z',t)+line('M90 247L102 254M154 254L166 247',3),
      royal:path('M98 182L128 194 158 182 154 210 128 228 102 210Z',t)+path('M128 195L138 207 128 220 118 207Z',c)+path('M93 176L79 180 74 199 96 195M163 176L177 180 182 199 160 195',t),
      street:path('M104 175Q128 200 152 175L157 187Q128 213 99 187Z',t)+line('M117 195V208M139 195V208')+path('M110 211L146 211 151 225 105 225Z',t),
      academy:path('M107 174L128 190 149 174 153 188 140 201 128 190 116 201 103 188Z',t)+(female?bow(128,191,.65):path('M124 189L132 189 137 211 128 219 119 211Z',t))+line('M128 219V234'),
      festival:path('M102 173L151 210 163 190 153 177 148 195 115 172Z',t)+flower(102,207)+flower(157,237),
      sea:path('M99 175L128 195 157 175 163 189 128 211 93 189Z',t)+line('M98 230H158M96 236H160',3)+(female?bow(128,199,.7):line('M128 198V219M120 216Q128 227 136 216',3)),
      craft:path(female?'M108 175L114 198 142 198 148 175 158 178 151 202 165 256Q128 264 91 256L105 202 98 178Z':'M106 176L112 198 144 198 150 176 159 180 153 202 163 247 93 247 103 202 97 180Z',t)+`<rect x="114" y="213" width="28" height="20" rx="4" fill="${c}"/>`+line('M122 216V229M134 216V229'),
      winter:path('M96 174Q128 191 160 174L167 188Q128 210 89 188Z',t)+path(female?'M144 194L159 236 145 244 132 197Z':'M113 194L98 235 113 242 126 197Z',t)+line(female?'M145 236L153 232':'M103 232L111 236',3)+line(female?'M80 266Q128 278 176 266':'M82 260Q128 270 174 260',7)
    };
    body+=themeDetails[o.theme];
    // Variants change stitching, overlays, fasteners and hems, even with identical colors.
    body+=(female?[
      bow(128,218)+line('M101 232L93 251M115 232L111 255M141 232L145 255M155 232L163 251'),
      path('M155 181Q177 202 159 227L147 222Q160 204 145 191Z',t)+flower(154,223)+flower(105,249),
      path('M91 236Q103 245 115 236Q128 247 141 236Q153 245 165 236L170 247Q155 257 142 247Q128 258 114 247Q101 257 86 247Z',t)+star(128,214),
      path('M111 202L145 202 148 227 108 227Z',t)+path('M119 205L137 213 119 221 137 225M137 205L119 213 137 221','none','stroke-width="2"')+bow(153,231,.8),
      pocket(95,232)+pocket(145,232)+path('M107 179L112 215M149 179L144 215','none',`stroke="${t}" stroke-width="5"`)+flower(128,218)
    ]:[
      belt+[195,205].map(y=>button(118,y)).join('')+line('M98 231L110 234M146 234L158 231',3),
      path('M102 178L161 218 154 229 95 189Z',t)+`<circle cx="150" cy="221" r="6" fill="${c}"/>`+path('M146 225L159 252 169 240Z',t),
      path('M100 179L115 185 123 213 109 234 95 228ZM156 179L141 185 133 213 147 234 161 228Z',t)+pocket(147,232),
      path('M103 181L151 181 161 220 137 248 129 223 98 235Z',t)+line('M113 190L146 221',3)+[197,208,219].map(y=>button(106,y)).join(''),
      path('M100 182L111 181 108 230 113 258 93 252ZM156 182L145 181 148 230 143 258 163 252Z',t)+pocket(118,210)+line('M118 237H138',4)
    ])[v];
    if(o.theme==='royal')body+=star(128,204);
    if(o.theme==='forest')body+=path('M123 231Q109 221 117 214Q131 220 123 231Q140 218 143 228Q135 241 123 231Z',t,'stroke-width="1.5"');
    if(o.theme==='spirit')body+=line('M123 235L133 235 123 242 133 242',2);
    const longSleeves=['spirit','winter','academy','royal','street'].includes(o.theme)||v===4;
    const sleeve=(side)=>path(side==='left'?(longSleeves?'M97 176Q74 176 67 217L88 224 108 188Z':'M97 176Q74 176 71 208L90 217 108 188Z'):(longSleeves?'M157 176Q180 176 189 217L168 224 148 188Z':'M157 176Q180 176 184 208L166 217 148 188Z'),c)+(side==='left'?line(longSleeves?'M69 214L89 221':'M73 205L92 213',4):line(longSleeves?'M187 214L167 221':'M182 205L165 213',4));
    return {back,body,leftSleeve:sleeve('left'),rightSleeve:sleeve('right')};
  }
  return {draw};
});
