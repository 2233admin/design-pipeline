# Post: god rays (radial blur of bright sky), depth of field, bloom, ACES tonemap, grain, vignette, chromatic aberration.
import numpy as np, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'art'))
from PIL import Image, ImageFilter
img=np.load('img.npy'); depth=np.load('depth.npy'); H,W,_=img.shape
from scipy.ndimage import gaussian_filter
def blur(a,r): return np.stack([gaussian_filter(a[...,c],r) for c in range(3)],-1)
# god rays from the sun's screen position (upper right)
sx,sy=[int(v) for v in np.load('sun.npy')]; bright=np.clip(img-1.0,0,None)*(depth[...,None]>100)
rays=np.zeros_like(img); acc=bright.copy()
yy,xx=np.mgrid[0:H,0:W]
for i in range(1,40):
    f=1-i/40*0.9; X=np.clip((sx+(xx-sx)*f).astype(int),0,W-1); Y=np.clip((sy+(yy-sy)*f).astype(int),0,H-1)
    rays+=bright[Y,X]*(1-i/40)
img=img+rays*.06
# depth of field: focus at ~22 units
focus=30.; coc=np.clip((np.abs(depth-focus)/focus-.25)*1.1,0,1)
b1=blur(img,3); b2=blur(img,9)
img=img*(1-coc[...,None])+np.where(coc[...,None]>.5,b2,b1)*coc[...,None]
# bloom
br=np.clip(img-.9,0,None); img=img+blur(br,14)*.6+blur(br,40)*.4
# ACES filmic
a,b,c,d,e=2.51,.03,2.43,.59,.14; x=img*.7; img=np.clip((x*(a*x+b))/(x*(c*x+d)+e),0,1)
img=img**(1/2.2)
# chromatic aberration + vignette + grain
r=np.roll(img[...,0],2,1); bch=np.roll(img[...,2],-2,1); img=np.stack([r,img[...,1],bch],-1)
vy,vx=(yy/H-.5),(xx/W-.5); vig=1-np.clip((vx**2+vy**2)*1.1,0,.6); img*=vig[...,None]
img=np.clip(img+np.random.default_rng(1).normal(0,.018,img.shape[:2])[...,None],0,1)
out=Image.fromarray((img*255).astype(np.uint8)).resize((1920,1080),Image.LANCZOS); out.save('ue-depth.jpg', quality=90)
for f in ['img.npy','depth.npy','sun.npy']: os.remove(f)
