/* DOMLadder 可定制性测试：设置 schema / 面板 / 列宽 / 模板九动作 / 设计模式 / 右键菜单 / 持久化 / 引擎参数 */
const {chromium}=require('playwright');const path=require('path');const PAGE='file://'+path.resolve(__dirname,'kd_local.html');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1100,height:560}});const p=await ctx.newPage();const logs=[];p.on('pageerror',e=>logs.push('PAGEERROR: '+e.message));
await p.goto(PAGE);await p.waitForTimeout(1500);const run=c=>p.evaluate(c=>window.KDOM.run(c),c);const ev=f=>p.evaluate(f);const fails=[];const check=(n,ok,i='')=>{console.log((ok?'PASS':'FAIL')+' '+n+(i?' · '+i:''));if(!ok)fails.push(n)};
const S=()=>ev(()=>window.KDOM.settings);
// 1 schema：set 覆盖 + 范围钳制
await run('set rowH 30');let h=await ev(()=>document.querySelector('#rows .row').style.height);check('set rowH 30 → 行高 30px',h==='30px',h);
await run('set rowH 99');check('超范围钳制到 40',(await S()).rowH===40);
check('非法键被拒',(await run('set nope 1'))===false);
await run('set fontSize 13');let fs=await ev(()=>getComputedStyle(document.querySelector('#kd')).fontSize);check('set fontSize 13 → 字号',fs==='13px',fs);await run('set fontSize 11');await run('set rowH 22');
// 2 DOM Trader 参数
await run('set dtMode liq');await p.waitForTimeout(300);let bg=await ev(()=>document.querySelector('#rows .row.bb .c-bids').style.background);check('Liquidity map → 行内 rgba 底色',/rgba\(60, 134, 216/.test(bg),bg);
await run('set liqScheme thermal');await p.waitForTimeout(300);bg=await ev(()=>document.querySelector('#rows .row.bb .c-bids').style.background);check('配色 thermal → 不再是买蓝',bg&&!/60, 134, 216/.test(bg),bg);
await run('set liqLog true');await run('set liqContrast 90');await run('set liqAlpha 30');await p.waitForTimeout(200);bg=await ev(()=>document.querySelector('#rows .row.bb .c-bids').style.background);check('对数 / 对比度 / 不透明度生效（alpha ≤ .3）',/, 0\.(0|1|2|30)/.test(bg),bg);
await run('set liqSmoothing manual');await run('set liqAnimMs 500');let ms=await ev(()=>document.querySelector('#kd').style.getPropertyValue('--kd-liq-ms'));check('平滑 Manual 500ms → CSS 变量',ms==='500ms',ms);
await run('set bboStyle dashed');await run('set bboWidth 3');let bs=await ev(()=>{const r=document.querySelector('#rows .row.bb');const cs=getComputedStyle(r);return cs.borderBottomStyle+' '+cs.borderBottomWidth});check('最优买卖线 dashed 3px',bs==='dashed 3px',bs);
await run('set dtMode dom');await run('set liqScheme classic');await run('set liqLog false');await run('set liqContrast 50');await run('set liqAlpha 60');await run('set bboStyle solid');await run('set bboWidth 2');await run('set liqSmoothing auto');
// 3 颜色：token 覆盖与还原
await run('set colBid #00ffc8');await p.waitForTimeout(200);let c=await ev(()=>({v:document.querySelector('#kd').style.getPropertyValue('--bid'),sh:getComputedStyle(document.querySelector('#rows .row.bb .c-bids')).boxShadow}));check('set colBid → --bid 覆盖并进入最优买线',c.v==='#00ffc8'&&/0, 255, 200/.test(c.sh),JSON.stringify(c));
await run('set colBid');c=await ev(()=>document.querySelector('#kd').style.getPropertyValue('--bid'));check('set colBid（空）→ 回到 token',c==='');
await run('set colBuy #ff00ff');let cb=await ev(()=>document.querySelector('#kd').style.getPropertyValue('--kd-buy'));check('buyColor → --kd-buy',cb==='#ff00ff');await run('set colBuy');
// 4 列宽：命令 + 拖列头右缘
await run('width bids 90');let g=await ev(()=>document.querySelector('#head').style.gridTemplateColumns);check('width bids 90 → 列宽模板',/ 90px /.test(' '+g+' '),g);
const rz=await p.$('#head .h.c-asks .rz');const bb=await rz.boundingBox();await p.mouse.move(bb.x+2,bb.y+8);await p.mouse.down();await p.mouse.move(bb.x+30,bb.y+8,{steps:4});await p.mouse.up();await p.waitForTimeout(100);let w=await ev(()=>window.KDOM.cols.find(c=>c.id==='asks').w);check('拖列头右缘改宽（66 → ~94）',w>=90&&w<=98,'w '+w);
let rowG=await ev(()=>document.querySelector('#rows .row').style.gridTemplateColumns);check('行与表头同一列宽模板',rowG===(await ev(()=>document.querySelector('#head').style.gridTemplateColumns)));
// 5 面板：schema 渲染 / 改即生效
await run('settings colors');let pn=await ev(()=>({open:!document.querySelector('#panel').hidden,tab:document.querySelector('#panelTabs .tab.on').textContent,n:document.querySelectorAll('#panelBody input[type=color]').length}));check('设置面板 › 颜色：11 个颜色项',pn.open&&pn.tab==='颜色'&&pn.n===11,JSON.stringify(pn));
await run('settings general');await p.fill('#panelBody input[type=number][data-k="rowH"]','18');await p.waitForTimeout(100);h=await ev(()=>document.querySelector('#rows .row').style.height);check('面板改行高 → 立即生效',h==='18px',h);
await p.selectOption('#panelBody select[data-k="volFmt"]','full');await p.waitForTimeout(300);let full=await ev(()=>[...document.querySelectorAll('#rows .c-bids')].some(d=>/\d,\d{3}/.test(d.textContent)));check('量显示 千分位',full);await run('set volFmt short');
await run('settings columns');let cr=await ev(()=>document.querySelectorAll('#panelBody .cr').length);check('列 tab 列出 14 列',cr===14,String(cr));
await p.click('#panelBody .cr[data-id="hist"] .sw');await p.waitForTimeout(100);let hist=await ev(()=>!!document.querySelector('#rows .c-hist'));check('列 tab 关掉轮廓 → DOM 树里无该列',!hist);
await p.fill('#panelBody .cr[data-id="bids"] input','70');await p.waitForTimeout(100);g=await ev(()=>document.querySelector('#head').style.gridTemplateColumns);check('列 tab 改宽 70',/ 70px /.test(' '+g+' '),g);
await run('settings close');check('settings close',await ev(()=>document.querySelector('#panel').hidden));
// 6 交易设置
await run('set tif GTC');let tif=await ev(()=>document.querySelector('#tifSel').value);check('订单有效期 GTC → 工具条',tif==='GTC');
await run('set qtyPresets 2,4,8,16');let qp=await ev(()=>[...document.querySelectorAll('[data-qty]')].map(x=>x.textContent).join(','));check('快捷手数可定义',qp==='2,4,8,16',qp);
await run('lock');await run('order buy '+(await ev(()=>(window.KDOM.data.bbo.bid*window.KDOM.data.cfg.tick).toFixed(2)))+' 3');await run('submit');await p.waitForTimeout(400);let o=await ev(()=>window.KDOM.data.account.orders[0]);check('挂单携带 TIF',o&&o.tif==='GTC',JSON.stringify(o));await run('cancel all');
await run('set oneClick true');await run('mkt buy 2');await p.waitForTimeout(300);await run('flatten');await p.waitForTimeout(400);let st=await ev(()=>({pos:window.KDOM.data.account.pos,note:document.querySelector('#note').style.display}));check('One-Click：Flatten 不弹确认直接平',st.pos===0&&st.note!=='block',JSON.stringify(st));await run('set oneClick false');
await run('set calcMode LIFO');await p.waitForTimeout(400);let calc=await ev(()=>window.KDOM.data.account.calc);check('盈亏算法 LIFO 送达引擎',calc==='LIFO');await run('set calcMode FIFO');await run('lock');
// 7 常规 → 引擎参数
await run('set depth 20');await p.waitForTimeout(500);let dp=await ev(()=>window.KDOM.data.cfg.depth);check('深度 20 → 引擎重建簿',dp===20);
const s0=await ev(()=>window.KDOM.data.seq);await run('set frameMs 50');await p.waitForTimeout(1000);const s1=await ev(()=>window.KDOM.data.seq);check('帧间隔 50ms → 序列推进更快（>12/s）',s1-s0>12,'Δseq '+(s1-s0));await run('set frameMs 120');await run('set depth 50');
await run('set filterMin 999999');await p.waitForTimeout(300);let empty=await ev(()=>[...document.querySelectorAll('#rows .c-bids')].every(d=>d.textContent===''));check('过滤阈值 → 小量全部隐藏',empty);await run('set filterMin 0');
await run('set gridMajor 10');await p.waitForTimeout(200);let mj=await ev(()=>document.querySelectorAll('#rows .row.major').length);check('主网格每 10 档',mj>=1&&mj<=4,String(mj));await run('set gridMajor 5');
// 8 模板九动作
await run('set rowH 16');check('template add',await run('template add 测试A'));let t=await ev(()=>window.KDOM.templates());check('列表含 测试A 且为当前',t.list.includes('测试A')&&t.current==='测试A'&&!t.dirty,JSON.stringify(t));
await run('set rowH 24');t=await ev(()=>window.KDOM.templates());check('改设置 → 未保存标记 ●',t.dirty);
await run('template save');t=await ev(()=>window.KDOM.templates());check('template save → 清除 ●',!t.dirty);
await run('set rowH 30');await run('template load 测试A');await p.waitForTimeout(200);await p.click('#note [data-a="ok"]').catch(()=>{});await p.waitForTimeout(100);check('template load → rowH 回到 24',(await S()).rowH===24,String((await S()).rowH));
await run('settings templates');await p.click('#panelBody .ti[data-n="测试A"]');await p.fill('#tplName','测试B');await p.click('#panelBody [data-a="rename"]');await p.waitForTimeout(100);t=await ev(()=>window.KDOM.templates());check('Rename 测试A → 测试B（当前模板随之改名）',t.list.includes('测试B')&&!t.list.includes('测试A')&&t.current==='测试B',JSON.stringify(t));
await p.click('#panelBody .ti[data-n="测试B"]');await p.click('#panelBody [data-a="defaults"]');t=await ev(()=>window.KDOM.templates());check('Defaults → 新面板默认',t.default==='测试B');
await p.click('#panelBody [data-a="export"]');let io=await ev(()=>document.querySelector('#tplIo').value);let parsed=null;try{parsed=JSON.parse(io)}catch(e){}check('Export → JSON（含 settings.rowH 24 与 cols）',parsed&&parsed.name==='测试B'&&parsed.settings.rowH===24&&Array.isArray(parsed.cols),io.slice(0,80));
const nBefore=(await ev(()=>window.KDOM.templates())).list.length;await p.fill('#tplIo','this is not json');await p.click('#panelBody [data-a="import"]');let msg=await ev(()=>document.querySelector('#tplMsg').textContent);check('Import 非 JSON → 明确报错且不新增',/格式不兼容/.test(msg)&&(await ev(()=>window.KDOM.templates())).list.length===nBefore,msg);
await p.fill('#tplIo',JSON.stringify({name:'bad',settings:{}}));await p.click('#panelBody [data-a="import"]');msg=await ev(()=>document.querySelector('#tplMsg').textContent);check('Import 缺 cols → 报错',/缺少/.test(msg),msg);
await p.fill('#tplIo',io);await p.click('#panelBody [data-a="import"]');t=await ev(()=>window.KDOM.templates());check('Import 合法 JSON → 新条目（同名加后缀）',t.list.includes('测试B (2)'),JSON.stringify(t.list));
await p.click('#panelBody .ti[data-n="测试B (2)"]');await p.click('#panelBody [data-a="delete"]');await p.waitForTimeout(100);let conf=await ev(()=>document.querySelector('#note').style.display==='block'&&document.querySelector('#note').textContent);check('Delete 先弹确认（不可撤销文案）',/不可撤销/.test(conf||''),String(conf).slice(0,40));await p.click('#note [data-a="ok"]');await p.waitForTimeout(100);t=await ev(()=>window.KDOM.templates());check('确认后删除',!t.list.includes('测试B (2)'));
await p.click('#panelBody .ti[data-n="★ 精简盘口"]');await p.click('#panelBody [data-a="delete"]');msg=await ev(()=>document.querySelector('#tplMsg').textContent);check('内置预设不可删除',/不可删除/.test(msg),msg);
await run('template load ★ DOM Trader 刮头皮');await p.waitForTimeout(200);await p.click('#note [data-a="ok"]').catch(()=>{});await p.waitForTimeout(200);let pr=await S();let vis=await ev(()=>window.KDOM.cols.filter(c=>c.on).map(c=>c.id).join(','));check('预设 DOM Trader → liq / 18px / 精简列',pr.dtMode==='liq'&&pr.rowH===18&&/ltq/.test(vis)&&!/hist/.test(vis),vis);
check('模板不改锁定（红线）',pr.locked===true);
await run('reset');await p.waitForTimeout(200);pr=await S();t=await ev(()=>window.KDOM.templates());check('Reset → 出厂（rowH 22 / dom / 无当前模板）',pr.rowH===22&&pr.dtMode==='dom'&&t.current===null,JSON.stringify({rowH:pr.rowH,cur:t.current}));
await run('settings close');
// 9 设计模式 + 右键菜单
await run('design on');let dm=await ev(()=>document.querySelector('#kd').classList.contains('design')&&!document.querySelector('#designBar').hidden);check('设计模式开',dm);
await p.click('#btnExit',{force:true});await p.waitForTimeout(100);let hid=await ev(()=>({cls:document.querySelector('#btnExit').classList.contains('hid'),ui:window.KDOM.ui.hidden.join(',')}));check('设计模式点元素 → 隐藏',hid.cls&&hid.ui==='exit',JSON.stringify(hid));
await p.click('.fx',{force:true});await p.waitForTimeout(100);let keep=await ev(()=>!document.querySelector('.fx').classList.contains('hid')&&!window.KDOM.ui.hidden.includes('fx'));check('FIXTURE 标不可隐藏（验收 3）',keep);
await run('design off');let gone=await ev(()=>getComputedStyle(document.querySelector('#btnExit')).display);check('退出设计模式后隐藏元素不占位',gone==='none',gone);
await run('showall');hid=await ev(()=>window.KDOM.ui.hidden.length);check('显示全部元素',hid===0);
await p.click('#head .h.c-price',{button:'right'});await p.waitForTimeout(100);let cm=await ev(()=>({open:!document.querySelector('#ctx').hidden,items:[...document.querySelectorAll('#ctx .mi')].map(x=>x.textContent)}));check('右键菜单：锁定 / 设计模式 / 显示全部 / 设置 / 模板',cm.open&&cm.items.some(x=>/锁定交易|解锁交易/.test(x))&&cm.items.some(x=>/设计模式/.test(x))&&cm.items.some(x=>/显示全部元素/.test(x))&&cm.items.some(x=>/设置/.test(x))&&cm.items.some(x=>/模板 › /.test(x)),cm.items.join('|'));
await p.keyboard.press('Escape');check('Esc 关菜单',await ev(()=>document.querySelector('#ctx').hidden));
// 10 持久化：reload 后设置 / 列宽 / 列显隐恢复；锁定始终恢复为锁定
await run('set rowH 26');await run('width bids 88');await run('col queue');await run('lock');await run('set colAsk #123456');await p.waitForTimeout(200);
await p.reload();await p.waitForTimeout(1500);let re=await ev(()=>({rowH:window.KDOM.settings.rowH,w:window.KDOM.cols.find(c=>c.id==='bids').w,q:window.KDOM.cols.find(c=>c.id==='queue').on,locked:window.KDOM.settings.locked,ask:window.KDOM.settings.colAsk,h:document.querySelector('#rows .row').style.height}));check('reload 恢复 rowH / 列宽 / 列显隐 / 颜色',re.rowH===26&&re.w===88&&re.q===true&&re.ask==='#123456'&&re.h==='26px',JSON.stringify(re));check('reload 后交易仍锁定',re.locked===true);
t=await ev(()=>window.KDOM.templates());check('reload 后模板列表保留（测试B + 3 预设）',t.list.includes('测试B')&&t.list.length===4,JSON.stringify(t.list));
// 11 回归点（Codex 在基线 f294a9c 复现）：坏列数组原子拒绝 / price 不可藏 / 编辑控件与修饰键不触发快捷键 / 拖边只改宽 / 全列窄窗横向可达
await ev(()=>{localStorage.setItem('kdom.cols',JSON.stringify([null,{id:'price',on:false},{id:'hist',on:false}]));localStorage.setItem('kdom.settings',JSON.stringify({locked:false,rowH:'abc',dtMode:'nope',fontSize:12}))});
await p.reload();await p.waitForTimeout(1500);let bad=await ev(()=>({order:window.KDOM.cols.map(c=>c.id).join(','),price:window.KDOM.cols.find(c=>c.id==='price').on,hist:window.KDOM.cols.find(c=>c.id==='hist').on,locked:window.KDOM.settings.locked,rowH:window.KDOM.settings.rowH,dt:window.KDOM.settings.dtMode,fs:window.KDOM.settings.fontSize}));
check('含 null 的列数组整体拒绝 → 出厂列（不部分应用）',bad.order==='notes,mybuy,bidcur,bids,price,asks,askcur,mysell,chg,trades,hist,ltq,queue,pnl'&&bad.hist===true,bad.order);
check('price 不能被存档隐藏',bad.price===true);check('存档 locked:false 不解锁 · 非法值回默认 · 合法值保留',bad.locked===true&&bad.rowH===22&&bad.dt==='dom'&&bad.fs===12,JSON.stringify(bad));
await ev(()=>{localStorage.setItem('kdom.cols',JSON.stringify([{id:'price',on:false,w:'x'},{id:'bids',on:true,w:90}]))});await p.reload();await p.waitForTimeout(1200);bad=await ev(()=>({price:window.KDOM.cols.find(c=>c.id==='price'),bids:window.KDOM.cols.find(c=>c.id==='bids')}));check('合法条目逐项校验：price 仍显示且宽度非法回默认 · bids 90',bad.price.on&&bad.price.w===72&&bad.bids.w===90,JSON.stringify(bad));
await p.focus('#tifSel');await p.keyboard.press('l');await p.keyboard.press('a');let lk=await ev(()=>({l:window.KDOM.settings.locked,a:window.KDOM.settings.autoCenter}));check('SELECT 聚焦时 L / A 不触发',lk.l===true&&lk.a===true,JSON.stringify(lk));
await run('settings templates');await p.focus('#tplIo');await p.keyboard.type('l a c /');lk=await ev(()=>({l:window.KDOM.settings.locked,a:window.KDOM.settings.autoCenter,cmd:document.querySelector('#cmd').hidden,v:document.querySelector('#tplIo').value}));check('TEXTAREA 输入 l a c / 不触发快捷键',lk.l===true&&lk.a===true&&lk.cmd===true&&lk.v==='l a c /',JSON.stringify(lk));await run('settings close');
await ev(()=>{const d=document.createElement('div');d.id='ce';d.contentEditable='true';document.body.appendChild(d);d.focus()});await p.keyboard.press('l');lk=await ev(()=>window.KDOM.settings.locked);check('contenteditable 聚焦时 L 不触发',lk===true);await ev(()=>document.querySelector('#ce').remove());
await p.click('#head .h.c-price');await p.keyboard.press('Control+l');await p.keyboard.press('Meta+a');await p.keyboard.press('Alt+c');lk=await ev(()=>({l:window.KDOM.settings.locked,a:window.KDOM.settings.autoCenter}));check('修饰键组合不触发 L / A',lk.l===true&&lk.a===true,JSON.stringify(lk));
await p.keyboard.press('l');lk=await ev(()=>window.KDOM.settings.locked);check('纯 L 仍可切换',lk===false);await run('lock');
const order0=await ev(()=>window.KDOM.cols.map(c=>c.id).join(','));const rz2=await p.$('#head .h.c-bids .rz');const bb2=await rz2.boundingBox();await p.mouse.move(bb2.x+2,bb2.y+8);await p.mouse.down();await p.mouse.move(bb2.x+120,bb2.y+8,{steps:6});await p.mouse.up();await p.waitForTimeout(100);let rzr=await ev(()=>({order:window.KDOM.cols.map(c=>c.id).join(','),w:window.KDOM.cols.find(c=>c.id==='bids').w}));check('拖列头右缘只改宽、不排序',rzr.order===order0&&rzr.w>=200,JSON.stringify(rzr));await run('width bids 66');
await p.dragAndDrop('#head .h.c-hist','#head .h.c-chg');await p.waitForTimeout(150);let od=await ev(()=>window.KDOM.cols.map(c=>c.id).join(','));check('拖列头主体 → 排序（hist 到 chg 前）',/mysell,hist,chg,trades/.test(od),od);
await p.setViewportSize({width:600,height:560});await p.waitForTimeout(300);for(const id of ['notes','bidcur','askcur','ltq','queue','pnl'])await run('col '+id);await p.waitForTimeout(300);let hs=await ev(()=>{const sc=document.querySelector('#scroll');return {sw:sc.scrollWidth,cw:sc.clientWidth,n:document.querySelectorAll('#head .h').length}});check('全部 14 列 + 600px 窗：横向可滚（scrollWidth > clientWidth）',hs.n===14&&hs.sw>hs.cw,JSON.stringify(hs));
await ev(()=>{const sc=document.querySelector('#scroll');sc.scrollLeft=sc.scrollWidth});await p.waitForTimeout(100);let reach=await ev(()=>{const hs=[...document.querySelectorAll('#head .h')];const last=hs[hs.length-1].getBoundingClientRect();const lad=document.querySelector('#ladder').getBoundingClientRect();const first=hs[0].getBoundingClientRect();return {lastRight:Math.round(last.right),ladRight:Math.round(lad.right),firstLeft:Math.round(first.left),id:hs[hs.length-1].dataset.id,rowCols:document.querySelector('#rows .row').children.length}});check('滚到最右：最后一列完整可见且行列数一致',reach.lastRight<=reach.ladRight+1&&reach.rowCols===14,JSON.stringify(reach));
await p.screenshot({path:'kd7.png'});await p.setViewportSize({width:1100,height:560});await p.waitForTimeout(300);
await run('reset');await p.waitForTimeout(300);await p.screenshot({path:'kd5.png'});
await run('settings dt');await p.waitForTimeout(200);await p.screenshot({path:'kd6.png'});
await ev(()=>localStorage.clear());
console.log(logs.join('\n')||'no page errors');await b.close();process.exit(fails.length?1:0)})().catch(e=>{console.error(e);process.exit(1)});
