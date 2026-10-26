"""Read source alpha and write frame metadata only; original image pixels stay untouched."""
from pathlib import Path
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
data = {"version": 1, "sheets": {}}
themes = ['siam','forest','spirit','royal','street','academy','festival','sea','craft','winter']

def frame(alpha, box):
    x0,y0,x1,y1=box
    ys,xs=np.where(alpha[y0:y1,x0:x1]>32)
    if not len(xs): raise ValueError(f'Empty sprite cell: {box}')
    return dict(x=int(x0+xs.min()),y=int(y0+ys.min()),w=int(xs.max()-xs.min()+1),h=int(ys.max()-ys.min()+1))

def separate_bodies(alpha, row_count, columns=5, separators=()):
    # Wide hems overlap rectangular cells; index connected silhouettes instead of cutting skirts.
    mask=alpha>128; components=[]
    for x in separators:mask[:,x]=False
    for y,x in zip(*np.where(mask)):
        if not mask[y,x]: continue
        queue=[(int(x),int(y))];mask[y,x]=False
        for cx,cy in queue:
            for nx,ny in [(cx-1,cy),(cx+1,cy),(cx,cy-1),(cx,cy+1)]:
                if 0<=ny<mask.shape[0] and 0<=nx<mask.shape[1] and mask[ny,nx]:
                    mask[ny,nx]=False;queue.append((nx,ny))
        if len(queue)<1000: continue
        xs,ys=zip(*queue);x0=max(0,min(xs)-2);y0=max(0,min(ys)-2)
        x1=min(mask.shape[1],max(xs)+3);y1=min(mask.shape[0],max(ys)+3)
        spans=[[x1-x0,0] for _ in range(y1-y0)]
        for px,py in queue:
            for row in range(max(y0,py-2),min(y1,py+3)):
                spans[row-y0][0]=min(spans[row-y0][0],max(0,px-x0-2))
                spans[row-y0][1]=max(spans[row-y0][1],min(x1-x0,px-x0+3))
        components.append(dict(x=x0,y=y0,w=x1-x0,h=y1-y0,spans=spans))
    assert len(components)==row_count*columns, f'Expected {row_count*columns} complete parts, found {len(components)}: {[(f["x"],f["y"],f["w"],f["h"]) for f in components]}'
    ordered=sorted(components,key=lambda f:f['y']+f['h']/2)
    return [f for row in range(row_count) for f in sorted(ordered[row*columns:row*columns+columns],key=lambda f:f['x']+f['w']/2)]

def skin_regions(image, f):
    pixels=np.array(image)[f['y']:f['y']+f['h'],f['x']:f['x']+f['w']]
    rgb=pixels[:,:,:3]/255;v=rgb.max(2);delta=v-rgb.min(2);s=delta/(v+1e-8);h=np.zeros_like(v)
    for channel in range(3):
        match=(rgb[:,:,channel]==v)&(delta>0)
        h[match]=(((rgb[:,:,(channel+1)%3]-rgb[:,:,(channel+2)%3])/(delta+1e-8)+channel*2)[match]%6)*60
    mask=(pixels[:,:,3]>128)&(h>=9)&(h<40)&(s>.08)&(s<.65)&(v>.55)
    for row,(left,right) in enumerate(f['spans']):mask[row,:left]=False;mask[row,right:]=False
    regions=[]
    for y,x in zip(*np.where(mask)):
        if not mask[y,x]:continue
        queue=[(int(x),int(y))];mask[y,x]=False
        for cx,cy in queue:
            for nx,ny in [(cx-1,cy),(cx+1,cy),(cx,cy-1),(cx,cy+1)]:
                if 0<=ny<f['h'] and 0<=nx<f['w'] and mask[ny,nx]:mask[ny,nx]=False;queue.append((nx,ny))
        if len(queue)<18:continue
        xs,ys=zip(*queue);left,right=min(xs)/f['w'],max(xs)/f['w'];top,bottom=min(ys)/f['h'],max(ys)/f['h'];cx=(left+right)/2
        neck=top<.08 and bottom<.24 and .35<cx<.65
        skin_tone=h[ys,xs].mean()<32 and (.17 if neck else .21)<s[ys,xs].mean()<.55 and v[ys,xs].mean()>.85
        arm=bottom<.66 and (left<.25 or right>.74) and right-left<.43 and bottom-top<.43
        leg=top>.54 and .2<cx<.8 and right-left<.23 and bottom-top<.3
        torso=.26<top<.55 and bottom<.64 and .35<cx<.65 and right-left<.45 and bottom-top<.2
        if skin_tone and (neck or arm or leg or torso):regions.append([max(0,min(xs)-2),max(0,min(ys)-2),min(f['w'],max(xs)+3),min(f['h'],max(ys)+3)])
    return regions

for gender in ['male','female']:
    name=f'assets/sprites/npc-style-{gender}.png'
    im=Image.open(ROOT/name).convert('RGBA'); alpha=np.array(im)[:,:,3]
    bodies=separate_bodies(alpha,10)
    frames={f'{gender}-{theme}-{col+1}':bodies[row*5+col] for row,theme in enumerate(themes) for col in range(5)}
    for f in frames.values():f['skin']=skin_regions(im,f)
    data['sheets'][gender]=dict(image=name,width=im.width,height=im.height,frames=frames)

for gender in ['male','female']:
    name=f'assets/sprites/npc-style-{gender}-world.png'
    im=Image.open(ROOT/name).convert('RGBA'); alpha=np.array(im)[:,:,3]
    bodies=separate_bodies(alpha,4)
    frames={f'{gender}-{theme}-{col+1}':bodies[row*5+col] for row,theme in enumerate(['royal','academy','sea','craft']) for col in range(5)}
    for f in frames.values():f['skin']=skin_regions(im,f)
    data['sheets'][gender+'-world']=dict(image=name,width=im.width,height=im.height,frames=frames)

for gender in ['male','female']:
    name=f'assets/sprites/npc-style-{gender}-extra.png'
    # A metadata-only separator isolates the touching male mechanic and chef hand outlines.
    im=Image.open(ROOT/name).convert('RGBA');alpha=np.array(im)[:,:,3];bodies=separate_bodies(alpha,2,separators=[625] if gender=='male' else [])
    frames={f'{gender}-{theme}-{col+1}':bodies[row*5+col] for row,theme in enumerate(['urban','journey']) for col in range(5)}
    for f in frames.values():f['skin']=skin_regions(im,f)
    data['sheets'][gender+'-extra']=dict(image=name,width=im.width,height=im.height,frames=frames)

name='assets/sprites/npc-style-faces-extra.png'
im=Image.open(ROOT/name).convert('RGBA');faces=separate_bodies(np.array(im)[:,:,3],2)
data['sheets']['faces-extra']=dict(image=name,width=im.width,height=im.height,frames={f'{gender}-{expression}':faces[row*5+col] for row,gender in enumerate(['female','male']) for col,expression in enumerate(['wink','confident','shy','surprised','sleepy'])})

name='assets/sprites/npc-style-hair-extra.png'
im=Image.open(ROOT/name).convert('RGBA');hair=separate_bodies(np.array(im)[:,:,3],2,4)
placements=[[20,4,216,172],[26,4,204,172],[20,4,216,172],[28,4,200,172],[16,4,224,222],[20,4,216,180],[22,4,212,230],[24,4,208,228]]
frames={key:{**hair[i],'placement':placements[i]} for i,key in enumerate(['spike','curtain','curl','blunt','pony','buns','braid','layered'])}
data['sheets']['hair-extra']=dict(image=name,width=im.width,height=im.height,frames=frames)

name='assets/sprites/npc-style-headparts.png'
im=Image.open(ROOT/name).convert('RGBA');alpha=np.array(im)[:,:,3]
boxes={
    'female-bright':(60,30,345,290),'female-calm':(375,30,665,290),'female-joy':(690,30,990,290),
    'male-bright':(60,310,345,554),'male-calm':(375,310,665,554),'male-joy':(690,310,990,554),
    'crop':(0,556,355,858),'bob':(355,568,662,861),'tails':(662,566,1024,867),
    'long':(0,858,380,1252),'flower':(380,864,665,1242),'ribbon':(665,880,1024,1230),
    'crown':(0,1258,355,1536),'cat':(355,1242,725,1536)
}
data['sheets']['parts']=dict(image=name,width=im.width,height=im.height,frames={key:frame(alpha,box) for key,box in boxes.items()})
(ROOT/'sprite-character-data.js').write_text("(function(root){const data="+json.dumps(data,separators=(',',':'))+";if(typeof module==='object'&&module.exports)module.exports=data;else root.NativeSpriteParts=data;})(typeof globalThis!=='undefined'?globalThis:this);\n",encoding='utf-8')
print('Indexed',sum(len(s['frames']) for s in data['sheets'].values()),'raster sprite parts; source PNG files unchanged.')
