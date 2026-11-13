# Grit pass: make the clean render look photographed off dirty glass in a dark megastructure.
import numpy as np, sys
from PIL import Image
from scipy.ndimage import gaussian_filter, shift
src,dst=sys.argv[1],sys.argv[2]
# --light: for imagery that must stay readable inside a document (a hero window under vector text).
# Same faults, a third of the strength, no halftone or torn lines; pixel sizes scale with the render width.
LIGHT='--light' in sys.argv
im=np.array(Image.open(src).convert('RGB')).astype(float)/255; H,W,_=im.shape; rng=np.random.default_rng(5)
yy,xx=np.mgrid[0:H,0:W]; S=W/1920; k=.35 if LIGHT else 1
def noise(scale,seed):
    r=np.random.default_rng(seed); g=r.random((H//scale+2,W//scale+2))
    return np.array(Image.fromarray((g*255).astype(np.uint8)).resize((W,H),Image.BICUBIC)).astype(float)/255
# 1 projection instability: horizontal bands of brightness + a few torn lines displaced sideways
band=1+k*(.10*np.sin(yy/(3.1*S))+.06*(noise(int(40*S),1)-.5))
im=im*band[...,None]
for _ in range(0 if LIGHT else 7):
    y0=rng.integers(0,H-20); h=rng.integers(2,10); dx=rng.integers(-24,24); im[y0:y0+h]=np.roll(im[y0:y0+h],dx,1)*1.15
# 2 channel misregistration (stronger at the edges)
r_=shift(im[...,0],(0,(1 if LIGHT else 3)*S),order=1); b_=shift(im[...,2],(0,-(1 if LIGHT else 3)*S),order=1); im=np.stack([r_,im[...,1],b_],-1)
# 3 dirty glass: smudges modulate a soft haze, fingerprints of low-frequency noise
smudge=gaussian_filter(noise(int(6*S),2),6*S); smudge=np.clip((smudge-.45)*2.4,0,1)
glow=np.stack([gaussian_filter(im[...,c],22*S) for c in range(3)],-1)
im=im+glow*smudge[...,None]*.9*k
# 4 ink grain: dark speckle in shadows, ordered halftone where luminance is low
lum=im.mean(-1); speck=(rng.random((H,W))<.0025*k*(1-lum))
im[speck]*=.15
dots=((xx%5-2)**2+(yy%5-2)**2)<(4*np.clip(lum*3,0,1))
im=im if LIGHT else np.where((lum<.08)[...,None],im*(.6+.4*dots[...,None]),im)
# 5 scratches and dust on the lens
scr=np.zeros((H,W))
for _ in range(40):
    x0,y0=rng.integers(0,W),rng.integers(0,H); L=int(rng.integers(40,400)*S); a=rng.normal(0,.25)+np.pi/2*rng.integers(0,2)
    t=np.arange(L); xs=np.clip((x0+np.cos(a)*t).astype(int),0,W-1); ys=np.clip((y0+np.sin(a)*t).astype(int),0,H-1); scr[ys,xs]=rng.uniform(.2,.7)
for _ in range(300):
    x0,y0=rng.integers(0,W),rng.integers(0,H); scr[max(0,y0-1):y0+2,max(0,x0-1):x0+2]=rng.uniform(.1,.5)
scr=gaussian_filter(scr,.6*S)
im=im+scr[...,None]*np.array([1,.8,.6])*.55*k
# 6 film grain + vignette + slight lift of blacks to a dirty brown
im=im+rng.normal(0,.045*(.45 if LIGHT else 1),(H,W))[...,None]
v=1-np.clip(((xx/W-.5)**2+(yy/H-.5)**2)*(.6 if LIGHT else 1.3),0,.7); im=im*v[...,None]
im=im*.96+np.array([.03,.012,.006])
Image.fromarray((np.clip(im,0,1)*255).astype(np.uint8)).save(dst,quality=92)
