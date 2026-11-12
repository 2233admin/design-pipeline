import os,sys
"""拼页：local（本地测试页）/ card（设计系统 PriceChart 卡预览）/ artifact（独立样机页）。路径相对本文件，可在任何 checkout 里运行。"""
HERE=os.path.dirname(os.path.abspath(__file__))
R=lambda *a:os.path.join(HERE,*a)
mode=sys.argv[1] if len(sys.argv)>1 else 'local'
tokens=open(R('tokens.css')).read();base=open(R('base.css')).read()
style=open(R('kc_style.css')).read()+"\nhtml,body{height:100%;margin:0;background:#141311}\n"
body=open(R('kc_body.html')).read();js=open(R('kchart.js')).read()
fonts='<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Doto:wght@500&family=Noto+Sans+SC:wght@400;700&display=swap" rel="stylesheet">'
if mode=='card':
    hdr='<!-- @dsCard group="图表" height=480 subtitle="PriceChart 实装：@katana/chart 第 1 段（自研）——K / 柱 / 线 / 面积 / HA / 足迹，量柱，CVD 与对照子窗格，8 种绘图（命中 / 拖柄 / 磁吸 / 撤销），历史分页，非时间柱（Range / Tick / Volume），回放同一条流，九种状态可注入，ChartArtifact；Worker 代替本机引擎算，前端只画；FIXTURE" -->\n'
    html=hdr+'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">\n'+fonts+'\n<style>'+base+'\n'+style+'</style></head><body>\n'+body+'\n<script>\n'+js+'\n</script></body></html>\n'
    out=R('..','..','project','components','PriceChart','preview.html')
elif mode=='artifact':
    html='<title>KATANA Chart 引擎</title>\n'+fonts+'\n<style>'+tokens+'\n'+base+'\n'+style+'</style>\n'+body+'\n<script>\n'+js+'\n</script>\n'
    out=R('index.html')
else:
    html='<!doctype html><meta charset="utf-8"><title>kc</title>\n<style>'+tokens+'\n'+base+'\n'+style+'</style>\n'+body+'\n<script>\n'+js+'\n</script>\n'
    out=R('kc_local.html')
os.makedirs(os.path.dirname(out),exist_ok=True)
open(out,'w').write(html);print(os.path.relpath(out,HERE),len(html))
