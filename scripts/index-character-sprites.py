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

for gender,rows in [('male',[0,172,342,522,705,886,1068,1243,1420,1590,1774]),('female',[0,166,339,517,694,873,1052,1229,1407,1581,1774])]:
    name=f'assets/sprites/npc-style-{gender}.png'
    im=Image.open(ROOT/name).convert('RGBA'); alpha=np.array(im)[:,:,3]
    cols=[0,177,354,532,709,887]
    frames={f'{gender}-{theme}-{col+1}':frame(alpha,(cols[col],rows[row],cols[col+1],rows[row+1])) for row,theme in enumerate(themes) for col in range(5)}
    data['sheets'][gender]=dict(image=name,width=im.width,height=im.height,frames=frames)

def separate_bodies(alpha):
    # Wide hems overlap rectangular cells; index connected silhouettes instead of cutting skirts.
    mask=alpha>128; components=[]
    for y,x in zip(*np.where(mask)):
        if not mask[y,x]: continue
        queue=[(int(x),int(y))];mask[y,x]=False
        for cx,cy in queue:
            for nx,ny in [(cx-1,cy),(cx+1,cy),(cx,cy-1),(cx,cy+1)]:
                if 0<=ny<mask.shape[0] and 0<=nx<mask.shape[1] and mask[ny,nx]:
                    mask[ny,nx]=False;queue.append((nx,ny))
        if len(queue)<2000: continue
        xs,ys=zip(*queue);x0=max(0,min(xs)-2);y0=max(0,min(ys)-2)
        x1=min(mask.shape[1],max(xs)+3);y1=min(mask.shape[0],max(ys)+3)
        spans=[[x1-x0,0] for _ in range(y1-y0)]
        for px,py in queue:
            for row in range(max(y0,py-2),min(y1,py+3)):
                spans[row-y0][0]=min(spans[row-y0][0],max(0,px-x0-2))
                spans[row-y0][1]=max(spans[row-y0][1],min(x1-x0,px-x0+3))
        components.append(dict(x=x0,y=y0,w=x1-x0,h=y1-y0,spans=spans))
    assert len(components)==20, f'Expected 20 complete bodies, found {len(components)}'
    ordered=sorted(components,key=lambda f:f['y']+f['h']/2)
    return [f for row in range(4) for f in sorted(ordered[row*5:row*5+5],key=lambda f:f['x']+f['w']/2)]

for gender in ['male','female']:
    name=f'assets/sprites/npc-style-{gender}-world.png'
    im=Image.open(ROOT/name).convert('RGBA'); alpha=np.array(im)[:,:,3]
    bodies=separate_bodies(alpha)
    frames={f'{gender}-{theme}-{col+1}':bodies[row*5+col] for row,theme in enumerate(['royal','academy','sea','craft']) for col in range(5)}
    data['sheets'][gender+'-world']=dict(image=name,width=im.width,height=im.height,frames=frames)

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
