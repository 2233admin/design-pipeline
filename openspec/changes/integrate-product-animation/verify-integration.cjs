// Read-only target preservation plus evidence capture around the authorized Git integration.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const mode=process.argv[2],target=path.resolve(process.argv[3]||'.');
const evidence=path.join(__dirname,'evidence');fs.mkdirSync(evidence,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function git(args){const r=spawnSync('git',['-C',target,...args],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);return r.stdout;}
const save=(name,data)=>fs.writeFileSync(path.join(evidence,name),JSON.stringify(data,null,2)+'\n');
if(mode==='baseline'){
 const files=[...new Set([...git(['diff','--name-only','-z']).split('\0'),...git(['diff','--cached','--name-only','-z']).split('\0'),...git(['ls-files','--others','--exclude-standard','-z']).split('\0')].filter(Boolean))].sort();
 const hashes=Object.fromEntries(files.map(file=>[file,sha(fs.readFileSync(path.join(target,file)))]));
 save('osprey-before.json',{target,head:git(['rev-parse','HEAD']).trim(),status:git(['status','--porcelain=v1','-uall']),hashes});
 console.log(JSON.stringify({mode,files:files.length,target}));
}else if(mode==='preserve'){
 const baseline=JSON.parse(fs.readFileSync(path.join(evidence,'osprey-before.json'),'utf8'));assert.equal(target,baseline.target);
 const changed=Object.entries(baseline.hashes).filter(([file,hash])=>!fs.existsSync(path.join(target,file))||sha(fs.readFileSync(path.join(target,file)))!==hash).map(([file])=>file);
 const status=git(['status','--porcelain=v1','-uall']);assert.deepEqual(changed,[],'User file bytes changed');assert.equal(status,baseline.status,'User worktree status changed');
 const result={status:'passed',target,head:git(['rev-parse','HEAD']).trim(),filesPreserved:Object.keys(baseline.hashes).length,changed,statusByteIdentical:true,recordedAt:new Date().toISOString()};save('osprey-preserved.json',result);console.log(JSON.stringify(result));
}else if(mode==='qa'){
 const r=spawnSync(process.execPath,['scripts/qa.cjs'],{cwd:target,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024});
 const log=(r.stdout||'')+(r.stderr||'');
 const label=path.basename(target)==='osprey'?'qa-osprey':'qa-task';
 fs.writeFileSync(path.join(evidence,label+'.log'),log);
 const summary=log.split(/\r?\n/).filter(line=>/^(FAIL|✖|ℹ (tests|pass|fail)|OK (repository tests|installed-package|QA leaves|reproducible|package reproducibility))/.test(line));
 const result={command:'node scripts/qa.cjs',cwd:target,exitCode:r.status,summary,logSha256:sha(log),recordedAt:new Date().toISOString()};save(label+'.json',result);console.log(JSON.stringify(result));process.exitCode=r.status??1;
}else throw new Error('Use baseline, preserve, or qa with target path');
