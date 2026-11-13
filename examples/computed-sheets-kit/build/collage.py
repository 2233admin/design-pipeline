import numpy as np
from PIL import Image, ImageFilter
rng=np.random.default_rng(7)
W,H=1800,600; P=W//3
def fbm(h,w,oct=6,seed=0):
    r=np.random.default_rng(seed); out=np.zeros((h,w))
    for o in range(oct):
        s=2**o; g=r.random((h//(64//min(s,32))+2, w//(64//min(s,32))+2))
        im=np.array(Image.fromarray((g*255).astype(np.uint8)).resize((w,h),Image.BICUBIC))/255.
        out+=im/(s**.9)
    return (out-out.min())/(out.max()-out.min())
def grain(a,amt=.07,seed=1):
    return np.clip(a+np.random.default_rng(seed).normal(0,amt,a.shape),0,1)
# panel A: torn yellow paper over sand ripples (ripples: sin of warped coordinate)
y,x=np.mgrid[0:H,0:P]/1.
warp=fbm(H,P,5,3)*40
rip=np.sin((y+warp+x*.08)/7.5); sand=np.where(rip>.55,0.18,0.82)*(0.85+0.15*fbm(H,P,4,4))
sandc=np.stack([sand*.95+.04,sand*.86+.03,sand*.70+.02],-1)
edge=380+40*(fbm(1,P,6,5)[0]-.5)*2+np.cumsum(rng.normal(0,1.2,P))*.6
paper=y<edge[None,:]
yel=np.stack([np.full((H,P),.93),np.full((H,P),.78),np.full((H,P),.22)],-1)*(0.9+0.1*fbm(H,P,5,6))[...,None]
creases=np.zeros((H,P)); 
for cx in [120,330,520]: creases+=np.exp(-((x-cx-15*np.sin(y/90))**2)/4)*.25
yel=yel*(1-creases[...,None]); white=x<60+20*np.sin(y/70)
A=np.where(paper[...,None],np.where(white[...,None],np.array([.92,.9,.86])*(0.9+.1*fbm(H,P,4,8))[...,None],yel),sandc)
# panel B: dusk sky, Rayleigh-like: blue high, orange band at horizon, dark ground below
t=y/H; hz=.48
sky=np.zeros((H,P,3))
k=np.clip((hz-t)/hz,0,1)
blue=np.array([.33,.52,.82]); vio=np.array([.62,.55,.72]); ora=np.array([1.0,.42,.1])
c=np.where(k[...,None]>.35, blue*(k[...,None]-.35)/.65+vio*(1-(k[...,None]-.35)/.65), vio*(k[...,None]/.35)+ora*(1-k[...,None]/.35))
glow=np.exp(-((t-hz)/.012)**2)[...,None]*np.array([1,.6,.2])
ground=np.array([.1,.06,.07])*(1-.5*np.clip((t-hz)/.5,0,1))[...,None]
B=np.where((t<hz)[...,None],c,ground)+glow*.9
# panel C: Gray-Scott reaction-diffusion as a macro bone texture, lower half, on black
n=300; U=np.ones((n,n*2)); V=np.zeros((n,n*2)); s=rng.random((n,n*2))<.02; V[s]=.5; U[s]=.5
Du,Dv,F,K=.16,.08,.029,.057
def lap(Z): return np.roll(Z,1,0)+np.roll(Z,-1,0)+np.roll(Z,1,1)+np.roll(Z,-1,1)-4*Z
for i in range(5000):
    uvv=U*V*V; U+=Du*lap(U)-uvv+F*(1-U); V+=Dv*lap(V)+uvv-(F+K)*V
tex=np.array(Image.fromarray((np.clip(V*3,0,1)*255).astype(np.uint8)).resize((P,H),Image.BICUBIC))/255.
surf=310+60*np.sin(x/160)+30*fbm(1,P,5,9)[0][None,:]*2
mask=y>surf
shade=np.clip(1-(y-surf)/320,.15,1)
tb=np.array(Image.fromarray((tex*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6)))/255.
gy,gx=np.gradient(tb); relief=np.clip(.5+(-gx*.6-gy*.9)*9,0,1)
Cg=np.where(mask, np.clip(.12+tex*.55+relief*.45,0,1)*shade, 0.02)
C=np.stack([Cg,Cg,Cg*1.02],-1)
img=np.concatenate([A,B,C],1)
img=np.clip(img+np.random.default_rng(2).normal(0,.06,img.shape[:2])[...,None],0,1)
img[:, P-2:P+2]=0; img[:, 2*P-2:2*P+2]=0
import os; Image.fromarray((img*255).astype(np.uint8)).save(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'art', 'collage.jpg'), quality=88); print('ok')
