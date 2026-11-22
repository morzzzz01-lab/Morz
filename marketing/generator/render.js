// Usage: node render.js <config.json> <out.mp4> [--stills]
// Downloads product images, renders the reel frame by frame with Playwright, encodes with ffmpeg, adds music.
const {chromium}=require('playwright');const {spawn,execFileSync}=require('child_process');
const fs=require('fs'),path=require('path'),os=require('os');
(async()=>{
  const [cfgPath,out,flag]=process.argv.slice(2);
  const C=JSON.parse(fs.readFileSync(cfgPath,'utf8'));
  const work=fs.mkdtempSync(path.join(os.tmpdir(),'reel-'));
  for(const f of fs.readdirSync(path.join(__dirname,'assets'))) fs.copyFileSync(path.join(__dirname,'assets',f),path.join(work,f));
  fs.copyFileSync(path.join(__dirname,'scene.html'),path.join(work,'scene.html'));
  for(const [i,p] of C.products.entries()){
    if(/^https?:/.test(p.img)){const r=await fetch(p.img);if(!r.ok)throw new Error('image '+p.img+' '+r.status);
      fs.writeFileSync(path.join(work,`p${i}.img`),Buffer.from(await r.arrayBuffer()));p.img=`p${i}.img`;}
  }
  const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1080,height:1920}});
  await pg.addInitScript(c=>{window.CONFIG=c},C);
  await pg.goto('file://'+path.join(work,'scene.html'));await pg.waitForLoadState('networkidle');
  await pg.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
  const dur=await pg.evaluate(()=>DURATION), fps=30, n=Math.round(dur*fps);
  if(flag==='--stills'){ // contact sheet frames for a quick visual check
    const ts=[1.5,...C.products.map((_,i)=>2.5+i*(C.segment||2.5)+1.4),dur-1];
    for(const [i,t] of ts.entries()){await pg.evaluate(t=>render(t),t);await pg.screenshot({path:out.replace(/\.mp4$/,`_still${i}.png`)});}
    await b.close();return;
  }
  const silent=path.join(work,'silent.mp4');
  const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(fps),'-i','-','-c:v','libx264','-pix_fmt','yuv420p','-crf','19','-preset','medium',silent],{stdio:['pipe','ignore','inherit']});
  for(let i=0;i<n;i++){await pg.evaluate(t=>render(t),i/fps);ff.stdin.write(await pg.screenshot({type:'jpeg',quality:92}));}
  ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();
  const wav=path.join(work,'music.wav');
  execFileSync('python3',[path.join(__dirname,'music.py'),String(C.seed||7),String(dur),wav],{stdio:'inherit'});
  execFileSync('ffmpeg',['-y','-loglevel','error','-i',silent,'-i',wav,'-c:v','copy','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart',out],{stdio:'inherit'});
  fs.rmSync(work,{recursive:true,force:true});
  console.log('wrote',out,dur+'s');
})().catch(e=>{console.error(e);process.exit(1)});
