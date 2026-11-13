# A tiny "real-time-engine" look for the order-book canyon: heightfield ray marching in numpy.
# Scene: x = price level (bid < 0 < ask), z = snapshot age (0 = now), y = cumulative size. Simulated L2 (SIM).
import numpy as np, time, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'art'))
from PIL import Image, ImageFilter
t0=time.time(); rng=np.random.default_rng(43)
T,L=91,10
mid=np.cumsum(rng.normal(0,.012,T))
lv=np.arange(1,L+1)
base=40+22*lv[None,:]+18*np.sin(np.arange(T)[:,None]/9+lv[None,:])
bid=base*(.7+.6*rng.random((T,L)))*1.15; ask=base*(.7+.6*rng.random((T,L)))
ask[31:,5]*=3.2
cb=np.cumsum(bid,1); ca=np.cumsum(ask,1)
SCALE=1/520.
def height(x,z):
    # x in levels (continuous), z in snapshots
    zi=np.clip(z,0,T-1.001); z0=np.floor(zi).astype(int); fz=zi-z0
    ax=np.abs(x-mid[z0]*3)-.35; side=np.sign(x-mid[z0]*3)
    k=np.clip(ax,0,L-1.001); k0=np.floor(k).astype(int); fk=k-k0
    def cum(zz):
        A=np.where(side>0,ca[zz,k0],cb[zz,k0]); B=np.where(side>0,ca[zz,np.minimum(k0+1,L-1)],cb[zz,np.minimum(k0+1,L-1)])
        prev=np.where(k0>0,np.where(side>0,ca[zz,np.maximum(k0-1,0)],cb[zz,np.maximum(k0-1,0)]),0)
        return prev+(A-prev)*np.clip(fk*1.6,0,1)   # terraced steps per level
    h=(cum(z0)*(1-fz)+cum(np.minimum(z0+1,T-1))*fz)*SCALE
    h=np.where(ax<0,-0.4,h)                                        # the spread: a dark trench
    h=np.where(ax>L-1,h+np.minimum(np.clip(ax-(L-1),0,None)*.35,1.2),h)                    # walls rise beyond L10
    return h
W,H=1280,720
cam=np.array([-1.5,9.5,-10.0]); look=np.array([1.5,0.0,45.])
fw=look-cam; fw/=np.linalg.norm(fw); rt=np.cross([0,1,0],fw); rt/=np.linalg.norm(rt); up=np.cross(fw,rt)
u=(np.arange(W)-W/2)/H*1.25; v=-(np.arange(H)-H/2)/H*1.25
U,V=np.meshgrid(u,v); D=fw[None,None,:]+U[...,None]*rt+V[...,None]*up; D/=np.linalg.norm(D,axis=-1,keepdims=True)
D=D.reshape(-1,3); N=D.shape[0]
tt=np.full(N,.5); hit=np.zeros(N,bool); alive=np.ones(N,bool); FAR=150
for i in range(420):
    p=cam+D[alive]*tt[alive,None]; h=height(p[:,0],p[:,2]); dy=p[:,1]-h
    idx=np.where(alive)[0]; nh=dy<0.02; hit[idx[nh]]=True; alive[idx[nh]]=False
    tt[idx[~nh]]+=np.maximum(dy[~nh]*.35,.04)
    far=tt>FAR; alive&=~far
    if not alive.any(): break
P=cam+D*tt[:,None]; e=.05
hx=height(P[:,0]+e,P[:,2])-height(P[:,0]-e,P[:,2]); hz=height(P[:,0],P[:,2]+e)-height(P[:,0],P[:,2]-e)
Nn=np.stack([-hx,np.full(N,2*e),-hz],1); Nn/=np.linalg.norm(Nn,axis=1,keepdims=True)
sun=np.array([.38,.16,.91]); sun/=np.linalg.norm(sun)
# soft shadow toward the sun
sh=np.ones(N); s=np.full(N,.15)
for i in range(48):
    q=P+sun*s[:,None]+Nn*.02; d=q[:,1]-height(q[:,0],q[:,2]); sh=np.minimum(sh,np.clip(8*d/s,0,1)); s+=np.clip(d,.08,.6)
sh=np.where(hit,np.clip(sh,0,1),1)
# ambient occlusion: sample heights along the normal
ao=np.ones(N)
for k,dist in enumerate([.15,.4,.9,1.6]):
    q=P+Nn*dist; ao-=np.clip(dist-(q[:,1]-height(q[:,0],q[:,2])),0,None)*(.5**k)*.45
ao=np.clip(ao,0,1)
# albedo: level heat ramp; ask wall emissive
ax=np.abs(P[:,0]-np.interp(P[:,2],np.arange(T),mid*3))-.35; side=np.sign(P[:,0]-np.interp(P[:,2],np.arange(T),mid*3))
lvlf=np.clip(ax/(L-1),0,1)
c0=np.array([1.0,.86,.62]); c1=np.array([.62,.13,.05])
alb=c0*(1-lvlf[:,None])+c1*lvlf[:,None]
alb=np.where((ax<0)[:,None],np.array([.02,.02,.025]),alb)
alb=np.where((ax>L-1)[:,None],np.array([.08,.035,.03]),alb)
wall=(side>0)&(ax>5)&(ax<6.1)&(P[:,2]>31)&(P[:,2]<T)
emis=np.where(wall[:,None],np.array([1.0,.62,.25])*2.4,0)
trench=(ax<0)&hit&(np.abs(P[:,0]-np.interp(P[:,2],np.arange(T),mid*3))<.12)
emis+=np.where(trench[:,None],np.array([.25,.75,1.0])*3.0,0)
ndl=np.clip(Nn@sun,0,1)
spec=np.clip((Nn*(sun-D)/np.linalg.norm(sun-D,axis=1,keepdims=True)).sum(1),0,1)**48*.6
sky=np.array([.16,.08,.08]); sunc=np.array([4.2,2.6,1.5])
col=alb*(sunc*ndl[:,None]*sh[:,None]+sky*(.5+.5*Nn[:,1:2])*ao[:,None])+spec[:,None]*sh[:,None]*sunc+emis
# sky + volumetric height fog with in-scattering toward the sun
mu=np.clip(D@sun,0,1)
skyc=np.array([.02,.012,.016])+np.array([1.0,.45,.18])*(mu**6)[:,None]*1.2+np.array([6.,4.,2.5])*(mu**900)[:,None]+np.array([.35,.12,.06])*np.clip(1-D[:,1]*3,0,1)[:,None]*.5
col=np.where(hit[:,None],col,skyc)
dist=np.where(hit,tt,FAR)
fogd=1-np.exp(-dist*.013*np.exp(-np.clip(cam[1]+D[:,1]*dist*.5,0,None)*.12))
fogc=np.array([.55,.24,.12])*(.4+1.6*mu[:,None]**4)
col=col*(1-fogd[:,None])+fogc*fogd[:,None]
img=col.reshape(H,W,3); depth=dist.reshape(H,W)
np.save('img.npy',img); np.save('depth.npy',depth); print('march',round(time.time()-t0,1),'s', hit.mean())

sd=sun-fw*0; ps=np.array([sun@rt,sun@up])/(sun@fw)/1.25*H
np.save('sun.npy',np.array([W/2+ps[0],H/2-ps[1]]))
