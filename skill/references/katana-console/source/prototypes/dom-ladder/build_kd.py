import os,sys
"""拼页：local（本地测试页）/ card（设计系统 DOMLadder 卡预览）/ artifact（独立样机页）。路径相对本文件。"""
HERE=os.path.dirname(os.path.abspath(__file__));R=lambda *a:os.path.join(HERE,*a)
mode=sys.argv[1] if len(sys.argv)>1 else 'local'
CE=R('..','chart-engine');tokens=open(os.path.join(CE,'tokens.css')).read();base=open(os.path.join(CE,'base.css')).read()
style=open(R('kd_style.css')).read()+"\nhtml,body{height:100%;margin:0;background:#141311}\n"
body=open(R('kd_body.html')).read();js=open(R('kdom.js')).read()
fonts='<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Doto:wght@500&family=Noto+Sans+SC:wght@400;700&display=swap" rel="stylesheet">'
if mode=='card':
    hdr='<!-- @dsCard group="订单流" height=480 subtitle="DOMLadder 实装：ATAS Smart DOM / DOM Trader 1:1 且一切可定制——设置面板（常规 / 列 / 交易 / DOM Trader / 颜色 / 模板）改即生效、localStorage 持久化；列显隐 / 拖排 / 拖右缘改宽、Bid/Ask Ladder、三种买卖量模式、深度变化（Pulling / Stacking）、当前成交 2.5s 自清、轮廓、排队估算；四种 DOM Trader 模式 + Liquidity map 参数组（配色 / cutoff / 对比度 / 平滑 / 动画 / 对数 / 透明度 / 最优线）；模板 Load Save Add Delete Rename Reset Defaults Export Import + 三套预设；右键菜单 + 设计模式（隐藏 / 重排元素）；L2 快照 + 增量 + 序列状态在引擎 reduce；默认锁定，点击 = 草稿，↵ 提交到 PAPER 撮合（FIFO / LIFO，DAY / GTC）；set 命令 = Agent 同一入口；DOMArtifact；FIXTURE" -->\n'
    html=hdr+'<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">\n'+fonts+'\n<style>'+base+'\n'+style+'</style></head><body>\n'+body+'\n<script>\n'+js+'\n</script></body></html>\n'
    out=R('..','..','project','components','DOMLadder','preview.html')
elif mode=='artifact':
    html='<title>KATANA DOM 梯子</title>\n'+fonts+'\n<style>'+tokens+'\n'+base+'\n'+style+'</style>\n'+body+'\n<script>\n'+js+'\n</script>\n'
    out=R('index.html')
else:
    html='<!doctype html><meta charset="utf-8"><title>kd</title>\n<style>'+tokens+'\n'+base+'\n'+style+'</style>\n'+body+'\n<script>\n'+js+'\n</script>\n'
    out=R('kd_local.html')
os.makedirs(os.path.dirname(out),exist_ok=True);open(out,'w').write(html);print(os.path.relpath(out,HERE),len(html))
