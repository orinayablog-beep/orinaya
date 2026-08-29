const ARTICLE_RE = /\/clanek-[^/]+\.html$/i;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.mode !== 'navigate' || url.origin !== self.location.origin || !ARTICLE_RE.test(url.pathname)) {
    return;
  }

  event.respondWith((async () => {
    const res = await fetch(req);
    if (!res.ok) return res;

    let html = await res.text();

    const css = `
<style id="orinaya-article-enhance-css">
/* Malé elegantní linky u předchozího/dalšího článku */
.article-nav a{
  position:relative !important;
  width:max-content !important;
  max-width:100% !important;
  padding-bottom:8px !important;
  border-bottom:0 !important;
  justify-self:start;
}
.article-nav a::after{
  content:"" !important;
  position:absolute !important;
  left:0 !important;
  bottom:0 !important;
  width:34px !important;
  height:1px !important;
  background:rgba(215,170,87,.52) !important;
  transition:width .22s ease !important;
}
.article-nav a:hover::after{width:52px !important}
.article-nav .back-blog{justify-self:center}
.article-nav a:last-child{justify-self:end}
@media(max-width:760px){
  .article-nav a,
  .article-nav .back-blog,
  .article-nav a:last-child{justify-self:start !important}
}

/* ORINAYA hudba */
.music-toggle{
  position:fixed;right:22px;bottom:22px;z-index:9990;
  display:flex;align-items:center;gap:9px;padding:10px 14px;
  border:1px solid rgba(215,170,87,.34);border-radius:999px;
  background:rgba(8,6,17,.80);color:#ead9b8;
  font:400 9px/1 "Montserrat",Arial,sans-serif;
  letter-spacing:.13em;text-transform:uppercase;
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  box-shadow:0 8px 28px rgba(0,0,0,.26);cursor:pointer;opacity:.80;
}
.music-toggle .music-icon{
  width:18px;height:18px;display:grid;place-items:center;flex:0 0 auto;
  border:1px solid rgba(215,170,87,.32);border-radius:50%;
  font-size:10px;color:#f1d79b;
}
.music-toggle.is-playing .music-icon{box-shadow:0 0 12px rgba(215,170,87,.32)}
@media(max-width:760px){
  .music-toggle{right:14px;bottom:14px;padding:9px 11px;gap:7px;font-size:8px;background:rgba(8,6,17,.86)}
}
</style>`;

    const controls = `
<audio id="orinaya-music" src="/orinaya-piano.mp3" preload="metadata" loop></audio>
<button class="music-toggle" id="music-toggle" type="button" aria-label="Pustit atmosféru" aria-pressed="false">
  <span class="music-icon" aria-hidden="true">♪</span>
  <span class="music-label">Pustit atmosféru</span>
</button>`;

    const script = `
<script id="orinaya-article-music">
(function(){
  const audio=document.getElementById('orinaya-music');
  const button=document.getElementById('music-toggle');
  if(!audio||!button)return;
  const label=button.querySelector('.music-label');
  const KEY='orinayaMusicStateV1';
  audio.volume=.18;

  function readState(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return {}}}
  function saveState(){
    try{
      localStorage.setItem(KEY,JSON.stringify({
        playing:!audio.paused,
        time:Number.isFinite(audio.currentTime)?audio.currentTime:0,
        updated:Date.now()
      }));
    }catch(e){}
  }
  function setButton(playing,wantsResume){
    button.classList.toggle('is-playing',playing);
    button.setAttribute('aria-pressed',playing?'true':'false');
    if(playing){
      button.setAttribute('aria-label','Ztišit atmosféru');
      if(label)label.textContent='Ztišit atmosféru';
    }else if(wantsResume){
      button.setAttribute('aria-label','Pokračovat v atmosféře');
      if(label)label.textContent='Pokračovat v atmosféře';
    }else{
      button.setAttribute('aria-label','Pustit atmosféru');
      if(label)label.textContent='Pustit atmosféru';
    }
  }

  const state=readState();
  let wantsResume=!!state.playing;

  audio.addEventListener('loadedmetadata',async function(){
    if(Number.isFinite(state.time)&&state.time>0&&audio.duration){
      audio.currentTime=state.time%audio.duration;
    }
    if(wantsResume){
      try{await audio.play();setButton(true,false)}
      catch(e){setButton(false,true)}
    }else setButton(false,false);
  },{once:true});

  button.addEventListener('click',async function(){
    if(audio.paused){
      try{await audio.play();wantsResume=true;setButton(true,false);saveState()}
      catch(e){setButton(false,true)}
    }else{
      wantsResume=false;
      audio.pause();
      setButton(false,false);
      saveState();
    }
  });

  audio.addEventListener('play',()=>{wantsResume=true;setButton(true,false);saveState()});
  audio.addEventListener('pause',()=>{setButton(false,wantsResume);saveState()});

  let last=0;
  audio.addEventListener('timeupdate',()=>{
    const now=Date.now();
    if(now-last>1000){last=now;saveState()}
  });
  window.addEventListener('pagehide',saveState);
  window.addEventListener('beforeunload',saveState);
})();
<\/script>`;

    if (!html.includes('orinaya-article-enhance-css')) {
      html = html.replace('</head>', css + '\n</head>');
    }
    if (!html.includes('id="orinaya-music"')) {
      html = html.replace('<body>', '<body>\n' + controls);
    }
    if (!html.includes('orinaya-article-music')) {
      html = html.replace('</body>', script + '\n</body>');
    }

    const headers = new Headers(res.headers);
    headers.set('content-type','text/html; charset=utf-8');
    headers.delete('content-length');
    return new Response(html,{status:res.status,statusText:res.statusText,headers});
  })());
});
