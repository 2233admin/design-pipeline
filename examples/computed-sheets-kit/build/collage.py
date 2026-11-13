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
# (unused) Gray-Scott, kept for comparison; panel C is the porous crust below
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
# Panel 3 redo: porous crust (bone / foam / pumice) seen from the side.
# White material with spherical cavities at three scales; each cavity is shaded as a concave sphere lit from
# the upper left, so its lower-right inner rim catches light. The crust fades into black with depth.
from scipy.spatial import cKDTree
rng=np.random.default_rng(11); W=H=600
yy,xx=np.mgrid[0:H,0:W].astype(float)
crest=250+45*np.sin(np.arange(W)/110)+25*np.sin(np.arange(W)/37+1)+np.cumsum(rng.normal(0,1,W))*.8
below=yy>crest[None,:]
mat=np.ones((H,W)); shade=np.ones((H,W))
L=np.array([-.5,-.6,.62]); L/=np.linalg.norm(L)
for n,rmin,rmax,seed in [(45,18,40,1),(260,7,18,2),(900,2.5,7,3)]:
    r=np.random.default_rng(seed); s=np.stack([r.random(n)*W, r.uniform(150,H+40,n)],1); rad=r.uniform(rmin,rmax,n)
    d,i=cKDTree(s).query(np.stack([xx.ravel(),yy.ravel()],1)); d=d.reshape(H,W); i=i.reshape(H,W)
    rr=rad[i]; inside=d<rr
    dx=(xx-s[i,0])/rr; dy=(yy-s[i,1])/rr; z=np.sqrt(np.clip(1-dx*dx-dy*dy,0,1))
    nrm=np.stack([dx,dy,-z],-1)*-1   # concave: normals point back to the centre
    lam=np.clip((nrm@L),0,1)
    edge=np.exp(-((d-rr)/1.6)**2)
    hole=np.where(inside,.14+.8*lam*(1-z*.5)+edge*.5,1-edge*.25)
    shade=np.minimum(shade,hole)
# material texture + depth falloff
tex=np.array(Image.fromarray((rng.random((H//6,W//6))*255).astype(np.uint8)).resize((W,H),Image.BICUBIC))/255.
depth=np.clip((yy-crest[None,:])/360,0,1)
v=np.where(below,shade*(.78+.22*tex)*np.clip(1.1-depth*1.15,0,1),0)
rim=np.exp(-((yy-crest[None,:])/4)**2)*below
v=np.clip(v+rim*.5,0,1)
glow=np.array(Image.fromarray((v*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(10)))/255.
v=np.clip(v*.92+glow*.25,0,1)
FOAM=v

C=np.stack([FOAM,FOAM,np.clip(FOAM*1.02,0,1)],-1)
img=np.concatenate([A,B,C],1)
img=np.clip(img+np.random.default_rng(2).normal(0,.06,img.shape[:2])[...,None],0,1)
img[:, P-2:P+2]=0; img[:, 2*P-2:2*P+2]=0
import os; Image.fromarray((img*255).astype(np.uint8)).save(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'art', 'collage.jpg'), quality=88); print('ok')
