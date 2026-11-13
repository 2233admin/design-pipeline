# Constructivist composition from computed materials (faktura): each material is cut by a geometric mask.
import numpy as np, os
ART = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'art')
from PIL import Image
W,H=1920,1080; yy,xx=np.mgrid[0:H,0:W].astype(float); rng=np.random.default_rng(4)
def fbm(h,w,seed,oct=5):
    r=np.random.default_rng(seed); out=np.zeros((h,w))
    for o in range(oct):
        g=r.random((h//max(2,48>>o)+2,w//max(2,48>>o)+2)); out+=np.array(Image.fromarray((g*255).astype(np.uint8)).resize((w,h),Image.BICUBIC))/255./(2**o*.8)
    return (out-out.min())/(out.max()-out.min())
paper=np.stack([np.full((H,W),.93),np.full((H,W),.90),np.full((H,W),.84)],-1)*(0.93+.07*fbm(H,W,1))[...,None]
img=paper.copy()
def put(mask,tex): 
    global img; img=np.where(mask[...,None],tex,img)
# 1 · dusk disc
cx,cy,R=1240,430,330; disc=(xx-cx)**2+(yy-cy)**2<R*R
t=(yy-(cy-R))/(2*R); k=np.clip((.6-t)/.6,0,1)
blue=np.array([.33,.52,.82]); vio=np.array([.62,.55,.72]); ora=np.array([1.0,.42,.1])
sky=np.where(k[...,None]>.35,blue*((k[...,None]-.35)/.65)+vio*(1-(k[...,None]-.35)/.65),vio*(k[...,None]/.35)+ora*(1-k[...,None]/.35))
sky=np.where((t>.6)[...,None],np.array([.09,.05,.06]),sky)+np.exp(-((t-.6)/.008)**2)[...,None]*np.array([1,.6,.2])
put(disc,sky)
# 2 · sand ripples in a long diagonal band (−24°)
a=np.deg2rad(-24); u=(xx-200)*np.cos(a)+(yy-760)*np.sin(a); v=-(xx-200)*np.sin(a)+(yy-760)*np.cos(a)
band=(np.abs(v)<120)&(u>-200)&(u<1900)
rip=np.sin((v+fbm(H,W,3)*40+u*.05)/7)
sand=np.where(rip>.55,.16,.82)*(0.85+.15*fbm(H,W,4)); sandc=np.stack([sand*.95+.04,sand*.86+.03,sand*.7+.02],-1)
put(band,sandc)
# 3 · porous crust in a rectangle, black above its crest
rx0,ry0,rx1,ry1=120,120,620,620; rect=(xx>=rx0)&(xx<rx1)&(yy>=ry0)&(yy<ry1)
foam=np.array(Image.open(os.path.join(ART, 'foam.png')).convert('L').resize((rx1-rx0,ry1-ry0)))/255.
f=np.zeros((H,W)); f[ry0:ry1,rx0:rx1]=foam; put(rect,np.stack([f,f,f],-1))
# 4 · red wedge cutting the disc, and black bars
wedge=(yy>-0.62*(xx-860)+620)&(yy<-0.62*(xx-860)+700)&(xx>760)&(xx<1700)
put(wedge,np.array([.80,.12,.08])*np.ones((H,W,3)))
put((xx>1660)&(xx<1700)&(yy>120)&(yy<960),np.zeros((H,W,3))+.05)
put((xx>120)&(xx<1000)&(yy>900)&(yy<930),np.zeros((H,W,3))+.05)
# 5 · yellow paper square, torn edge on top, rotated 8°
b=np.deg2rad(8); uu=(xx-1450)*np.cos(b)+(yy-830)*np.sin(b); vv=-(xx-1450)*np.sin(b)+(yy-830)*np.cos(b)
tear=-130+np.interp(uu,np.arange(-200,200),np.cumsum(rng.normal(0,1.4,400)))
yel=(np.abs(uu)<150)&(vv>tear)&(vv<150)
put(yel,np.stack([np.full((H,W),.93),np.full((H,W),.78),np.full((H,W),.22)],-1)*(0.9+.1*fbm(H,W,6))[...,None])
img=np.clip(img+np.random.default_rng(2).normal(0,.045,(H,W))[...,None],0,1)
Image.fromarray((img*255).astype(np.uint8)).save(os.path.join(ART, 'constructivist.jpg'), quality=88); print('ok')
