import numpy as np, time, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'art'))  # outputs land in art/
from PIL import Image
rng=np.random.default_rng(1)
def tone(acc, gamma=.5, tint=(1,1,1.04), q=99.7):
    a=np.log1p(acc); a/=np.percentile(a[a>0],q) if (a>0).any() else 1; a=np.clip(a,0,1)**gamma
    return np.stack([np.clip(a*255*t,0,255) for t in tint],-1).astype(np.uint8)

def buddhabrot(W=1920,H=1080,samples=12_000_000,maxit=600):
    acc=np.zeros((H,W)); x0,x1,y0,y1=-2.05,1.0,-0.86,0.86   # landscape: real axis horizontal
    for _ in range(samples//1_000_000):
        c=(rng.uniform(-2.1,1.1,1_000_000)+1j*rng.uniform(-1.3,1.3,1_000_000))
        z=np.zeros_like(c); alive=np.ones(c.size,bool); esc=np.zeros(c.size,bool)
        for i in range(maxit):
            z[alive]=z[alive]**2+c[alive]; out=alive&(np.abs(z)>4); esc|=out; alive&=~out
        cc=c[esc]; z=np.zeros_like(cc); act=np.ones(cc.size,bool)
        for i in range(maxit):
            z[act]=z[act]**2+cc[act]; act&=np.abs(z)<4
            if not act.any(): break
            zz=z[act]; xi=((zz.real-x0)/(x1-x0)*W).astype(int); yi=((zz.imag-y0)/(y1-y0)*H).astype(int)
            ok=(xi>=0)&(xi<W)&(yi>=0)&(yi<H); np.add.at(acc,(yi[ok],xi[ok]),1); np.add.at(acc,(H-1-yi[ok],xi[ok]),1)
    b=np.log1p(acc); b=b-np.percentile(b,40); b=np.clip(b,0,None); b/=np.percentile(b,99.97); b=np.clip(b,0,1)**1.35
    Image.fromarray(np.stack([b*255,b*244,b*226],-1).astype(np.uint8)).save('buddha.png')

def standard_map(W=1920,H=1080,K=0.971635,n=600,steps=2500):
    acc=np.zeros((H,W)); th=rng.uniform(0,2*np.pi,n*4); p=rng.uniform(0,2*np.pi,n*4)
    for i in range(steps):
        p=(p+K*np.sin(th))%(2*np.pi); th=(th+p)%(2*np.pi)
        xi=(th/(2*np.pi)*W).astype(int); yi=((1-p/(2*np.pi))*H).astype(int); np.add.at(acc,(np.clip(yi,0,H-1),np.clip(xi,0,W-1)),1)
    Image.fromarray(tone(acc,1.25,(1,1,1.04),99.99)).save('stdmap.png')

def dejong(W=1920,H=1080,a=1.4,b=-2.3,c=2.4,d=-2.1,walkers=600_000,steps=80):
    acc=np.zeros((H,W)); x=rng.uniform(-2,2,walkers); y=rng.uniform(-2,2,walkers)
    for i in range(steps):
        x,y=np.sin(a*y)-np.cos(b*x), np.sin(c*x)-np.cos(d*y)
        if i>8:
            xi=((x+2.2)/4.4*H+(W-H)/2).astype(int); yi=((y+2.2)/4.4*H).astype(int); np.add.at(acc,(yi,xi),1)
    Image.fromarray(tone(acc,.5,(1,.98,.95))).save('dejong.png')

def lyapunov(S=1350,seq='AABAB',it=420,warm=60):
    a=np.linspace(2.5,4.0,S); b=np.linspace(2.5,4.0,S); A,B=np.meshgrid(a,b[::-1]); x=np.full(A.shape,.5); lam=np.zeros(A.shape)
    for n in range(it):
        r=A if seq[n%len(seq)]=='A' else B; x=r*x*(1-x)
        if n>=warm: lam+=np.log(np.abs(r*(1-2*x))+1e-12)
    lam/=it-warm; np.save('lam.npy',lam)
    neg=np.clip(-lam,0,None); v=(neg/np.percentile(neg,99))**.6; v=np.clip(v,0,1)
    gold=np.stack([v*240,v*196,v*92],-1); edge=np.clip(1-np.abs(lam)*14,0,1)[...,None]*np.array([255,255,255])*.35
    Image.fromarray(np.clip(gold+edge,0,255).astype(np.uint8)).save('lyap.png')

def lorenz_cloud(W=1920,H=1080,walkers=60_000,steps=1600,dt=.004):
    s,r,b=10,28,8/3; x=rng.normal(0,10,walkers); y=rng.normal(0,10,walkers); z=rng.uniform(5,40,walkers); acc=np.zeros((H,W))
    for i in range(steps):
        dx=s*(y-x); dy=x*(r-z)-y; dz=x*y-b*z; x+=dx*dt; y+=dy*dt; z+=dz*dt
        if i>500:
            xi=(W/2+x*34).astype(int); yi=(H-60-z*18).astype(int); ok=(xi>=0)&(xi<W)&(yi>=0)&(yi<H); np.add.at(acc,(yi[ok],xi[ok]),1)
    b=np.log1p(acc); b/=np.percentile(b[b>0],99.99); b=np.clip(b,0,1)**2.2
    Image.fromarray(np.stack([b*255,b*236,b*222],-1).astype(np.uint8)).save('lorenzcloud.png')



def clifford(W=1920,H=1080,a=-1.4,b=1.6,c=1.0,d=0.7,walkers=600_000,steps=80):
    acc=np.zeros((H,W)); x=rng.uniform(-1,1,walkers); y=rng.uniform(-1,1,walkers)
    for i in range(steps):
        x,y=np.sin(a*y)+c*np.cos(a*x), np.sin(b*x)+d*np.cos(b*y)
        if i>8:
            xi=((x+2.1)/4.2*H*1.25+(W-H*1.25)/2).astype(int); yi=((y+1.75)/3.5*H).astype(int); ok=(xi>=0)&(xi<W)&(yi>=0)&(yi<H); np.add.at(acc,(yi[ok],xi[ok]),1)
    b2=np.log1p(acc); b2/=np.percentile(b2[b2>0],99.9); b2=np.clip(b2,0,1)**.9
    Image.fromarray(np.stack([b2*120,b2*210,b2*255],-1).astype(np.uint8)).save('clifford.png')


def bifurcation(W=2400,H=1350):
    img=np.zeros((H,W),dtype=np.float32); rs=np.linspace(2.8,4.0,W*2); x=np.full_like(rs,0.5)
    for _ in range(600): x=rs*x*(1-x)
    for _ in range(900):
        x=rs*x*(1-x); xi=((rs-2.8)/1.2*(W-1)).astype(int); yi=((1-x)*(H-140)+40).astype(int); np.add.at(img,(yi,xi),1)
    img=np.log1p(img); img=img/img.max(); g=(img**.55*235).astype(np.uint8)
    Image.fromarray(np.stack([g,g,np.minimum(255,g.astype(int)+8).astype(np.uint8)],-1)).save('bifurcation.png')

import sys
NAMES = sys.argv[1:] or ['standard_map','dejong','lyapunov','buddhabrot','clifford','bifurcation']
for f in [globals()[n] for n in NAMES if n in globals()]:
    t=time.time(); f(); print(f.__name__, round(time.time()-t,1),'s', flush=True)

# pages reference JPEGs; keep the repository light
for png in [f for f in os.listdir('.') if f.endswith('.png')]:
    name = {'lyap.png': 'lyapunov.jpg'}.get(png, png[:-4] + '.jpg')
    Image.open(png).convert('RGB').save(name, quality=88); os.remove(png)
