const {chromium}=require('playwright');const path=require('path');const PAGE='file://'+path.resolve(__dirname,'kd_local.html');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1100,height:560}});const logs=[];p.on('console',m=>{if(m.type()==='error')logs.push('ERR: '+m.text())});p.on('pageerror',e=>logs.push('PAGEERROR: '+e.message));
await p.goto(PAGE);await p.waitForTimeout(2000);await p.screenshot({path:'kd1.png'});
const st=await p.evaluate(()=>({state:window.KDOM.state.state,levels:window.KDOM.data.levels.size,bbo:window.KDOM.data.bbo,rows:document.querySelectorAll('#rows .row').length}));console.log(JSON.stringify(st));
console.log(logs.join('\n')||'no errors');await b.close()})().catch(e=>{console.error(e);process.exit(1)});
