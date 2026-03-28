const $=id=>document.getElementById(id);
let player=null,videoId=null,isPlaying=false,isMuted=false,currentVol=100;
let progressTimer=null,hideTimer=null;
let autoStopTimer=null,autoStopMs=0,autoStopEndOfVideo=false,autoStopStart=0;
let isDragging=false;
const gotourl = "https://inloretube.web.app/"

const _workerBlob = new Blob([`
  let timers = {};
  self.onmessage = function(e) {
    const { type, id, interval } = e.data;
    if (type === 'start') {
      if (timers[id]) clearInterval(timers[id]);
      timers[id] = setInterval(() => self.postMessage({ tick: id }), interval);
    } else if (type === 'stop') {
      clearInterval(timers[id]); delete timers[id];
    } else if (type === 'stopAll') {
      Object.keys(timers).forEach(k => clearInterval(timers[k])); timers = {};
    }
  };
`], { type: 'application/javascript' });
const _bgWorker = new Worker(URL.createObjectURL(_workerBlob));
const BG_TIMER_PROGRESS  = 1;
const BG_TIMER_AUTOSTOP  = 2;
const BG_TIMER_PIPMPROGR = 3;

_bgWorker.onmessage = function(e) {
  const id = e.data.tick;
  if (id === BG_TIMER_PROGRESS)  _bgProgressTick();
  if (id === BG_TIMER_AUTOSTOP)  _bgAutoStopTick();
  if (id === BG_TIMER_PIPMPROGR) _bgPipMpTick();
};
function _bgStartTimer(id, ms) { _bgWorker.postMessage({ type: 'start', id, interval: ms }); }
function _bgStopTimer(id)      { _bgWorker.postMessage({ type: 'stop',  id }); }

let _lastEndedCheck = 0;
function _bgProgressTick() {
  if (!player) return;
  try {
    const cur = player.getCurrentTime() || 0;
    const dur = player.getDuration()    || 0;
    const pct = dur > 0 ? (cur / dur) * 100 : 0;

    if (!document.hidden) {
      $('seekFill').style.width = pct + '%';
      // Drive per-chapter fills if chapter markers are active
      { const _ct = $('seekTrack'); if(_ct && _ct._chapProgress) _ct._chapProgress(pct); }
      $('timeDisplay').textContent = fmt(cur) + ' / ' + fmt(dur);
    }
    if (autoStopEndOfVideo && !loopEnabled && dur > 0 && cur >= dur - 0.5) {
      player.pauseVideo(); clearAutoStop();
    }
    checkVideoTimeStop(cur);
    checkChapterChange(cur);
    try { window.parent.postMessage({event:'timeUpdate',videoId,currentTime:cur,duration:dur,progress:pct},'*'); } catch(_) {}

    if (mpActive && !pipWin && !document.hidden) {
      if ($('mpSeekFill')) $('mpSeekFill').style.width = pct + '%';
      const f2 = s => { s=Math.floor(s||0); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };
      if ($('mpTime')) $('mpTime').textContent = f2(cur) + ' / ' + f2(dur);
      if (isPlaying) { if ($('mpThumb')) $('mpThumb').classList.add('hidden'); }
      else { if ($('mpThumb')) { $('mpThumb').src = $('thumbnail').src||''; $('mpThumb').classList.remove('hidden'); } }
    }

    
    const now = Date.now();
    if (dur > 0 && cur >= dur - 1.2 && now - _lastEndedCheck > 1500) {
      _lastEndedCheck = now;
      try {
        const state = player.getPlayerState();
        if (state === 0) _handleEndedInBackground(dur); 
      } catch(_) {}
    }
  } catch(e) {}
}

function _handleEndedInBackground(dur) {
  if (loopEnabled) {
    try { player.seekTo(0, true); player.playVideo(); } catch(_) {}
    return;
  }
  if (!isPlaying) return; 
  isPlaying = false; setPlayIcon(false);
  try { window.parent.postMessage({event:'ended', videoId, duration: dur}, '*'); } catch(_) {}
  clearAutoStop();
  if (plAutoplay && autoplayEnabled && playlist.length > 0) {
    window._bgSwitching = true; // tell visibilitychange guard a switch is happening
    setTimeout(() => plNext(true), 800);
  }
}

function _bgAutoStopTick() {
  if (asMode === 'timer') asTimerTick();
  else if (asMode === 'clock') asClockTick();
}
function _bgPipMpTick() {
  if (typeof pipSync === 'function') pipSync();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  if (!player) return;
  // Only resume if we were actively playing before hiding
  if (!isPlaying) return;
  window._bgSwitching = false;
  setTimeout(() => {
    try {
      const state = player.getPlayerState();
      // Only call playVideo if truly paused (2) — never interrupt loading (-1), buffering (3), or playing (1)
      if (state === 2) {
        if(!isMuted){ player.unMute(); player.setVolume(currentVol); }
        player.playVideo();
      }
    } catch(_) {}
  }, 400);
});

let _wakeLock = null;
async function _requestWakeLock() {
  try {
    if ('wakeLock' in navigator && !_wakeLock) {
      _wakeLock = await navigator.wakeLock.request('screen');
      _wakeLock.addEventListener('release', () => { _wakeLock = null; });
    }
  } catch(_) {}
}
async function _releaseWakeLock() {
  try { if (_wakeLock) { await _wakeLock.release(); _wakeLock = null; } } catch(_) {}
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && isPlaying) _requestWakeLock();
});

let chapters = [];       
let lastChapIdx = -1;
let chapBadgeTimer = null;

function setChapters(json){
  try{
    const raw = typeof json === 'string' ? JSON.parse(json) : json;
    // Support YouTube API response format (chapter.json style)
    if(raw && raw.playerOverlays){
      setChaptersFromYTJson(raw); return;
    }
    // Support raw chapter array (sent from index.html as chapArr)
    if(Array.isArray(raw)){
      chapters = raw.map(c=>{
        const r = c.chapterRenderer || c;
        const sec = Math.round((r.timeRangeStartMillis||0)/1000);
        const title = (typeof r.title === 'string') ? r.title
                    : r.title?.simpleText || r.title?.runs?.[0]?.text || '';
        const thumbs = r.thumbnail?.thumbnails || [];
        const img = thumbs.length ? thumbs[thumbs.length-1].url : '';
        return { sec, title, sub:'', img };
      }).sort((a,b)=>a.sec-b.sec);
      buildChapterMarkers();
      buildPipChapterMarkers();
      showToast('Chapters loaded ('+chapters.length+')');
      return;
    }
    chapters = Object.entries(raw).map(([ts, val])=>{
      const sec = parseTimestamp(ts);
      // val might be a plain string, [title,sub,img] array, or accidentally a YT object
      if(val && typeof val === 'object' && !Array.isArray(val)){
        // raw YT chapterRenderer object keyed by timestamp string
        const title = val.title?.simpleText || val.title?.runs?.[0]?.text || String(val.title||'');
        const thumbs = val.thumbnail?.thumbnails || [];
        const img = thumbs.length ? thumbs[thumbs.length-1].url : '';
        return { sec, title, sub:'', img };
      }
      const arr = Array.isArray(val) ? val : [val];
      return { sec, title: arr[0]||'', sub: arr[1]||'', img: arr[2]||'' };
    }).sort((a,b)=>a.sec-b.sec);
    buildChapterMarkers();
    buildPipChapterMarkers();
    showToast('Chapters loaded ('+chapters.length+')');
  }catch(e){ console.warn('setChapters error',e); }
}

function setChaptersFromYTJson(raw){
  try{
    // Navigate to chapters array in YouTube API response
    const markersMap = raw?.playerOverlays?.playerOverlayRenderer
      ?.decoratedPlayerBarRenderer?.decoratedPlayerBarRenderer
      ?.playerBar?.multiMarkersPlayerBarRenderer?.markersMap;
    if(!markersMap) return;
    let chapArr = null;
    for(const m of markersMap){
      if(m?.value?.chapters){ chapArr = m.value.chapters; break; }
    }
    if(!chapArr || !chapArr.length) return;
    chapters = chapArr.map(c=>{
      const r = c.chapterRenderer || c;
      const sec = Math.round((r.timeRangeStartMillis||0)/1000);
      const title = r.title?.simpleText || r.title?.runs?.[0]?.text || '';
      // Pick highest-res thumbnail
      const thumbs = r.thumbnail?.thumbnails || [];
      const img = thumbs.length ? thumbs[thumbs.length-1].url : '';
      return { sec, title, sub:'', img };
    }).sort((a,b)=>a.sec-b.sec);
    buildChapterMarkers();
    buildPipChapterMarkers();
    showToast('Chapters loaded ('+chapters.length+')');
  }catch(e){ console.warn('setChaptersFromYTJson error',e); }
}

function parseTimestamp(ts){
  ts = String(ts).trim();
  const parts = ts.split(':').map(Number);
  if(parts.length===3) return parts[0]*3600+parts[1]*60+parts[2];
  if(parts.length===2) return parts[0]*60+parts[1];
  return parseFloat(ts)||0;
}

function buildChapterMarkers(){
  document.querySelectorAll('.seek-chapter-gap,.seek-chap-seg,.seek-chap-fill').forEach(e=>e.remove());
  $('seekFill').classList.remove('chap-hidden');
  { const _ct=$('seekTrack'); if(_ct){ _ct._chapProgress=null;
    _ct._chapHoverBound && _ct.removeEventListener('mousemove',_ct._chapHoverBound);
    _ct._chapLeaveBound && _ct.removeEventListener('mouseleave',_ct._chapLeaveBound);
  }}
  if(!chapters.length||!player) return;
  let dur=0; try{dur=player.getDuration()||0;}catch(_){}
  if(!dur) return;
  const track=$('seekTrack');
  const GAP=3; // px gap between chapter segments

  const pts = chapters.map(c=>c.sec/dur*100);
  const n   = chapters.length;

  chapters.forEach((c,i)=>{
    const startPct = pts[i];
    const endPct   = i+1 < n ? pts[i+1] : 100;

    // ── background rail segment (the grey unfilled part of this chapter)
    const seg = document.createElement('div');
    seg.className = 'seek-chap-seg';
    seg.style.cssText = `left:${startPct}%;width:calc(${endPct-startPct}% - ${i+1<n?GAP:0}px)`;
    seg.dataset.idx = i;
    track.appendChild(seg);

    // ── filled part of this chapter (mirrors seekFill but per-chapter)
    const fill = document.createElement('div');
    fill.className = 'seek-chap-fill';
    fill.id = 'chapFill'+i;
    fill.style.cssText = `left:${startPct}%;width:0;max-width:calc(${endPct-startPct}% - ${i+1<n?GAP:0}px)`;
    track.appendChild(fill);
  });

  // Hide the global seekFill (we draw per-chapter fills instead)
  $('seekFill').classList.add('chap-hidden');

  // Override the progress tick to drive per-chapter fills
  track._chapProgress = (pct)=>{
    for(let i=0;i<n;i++){
      const startPct = pts[i];
      const endPct   = i+1 < n ? pts[i+1] : 100;
      const f = document.getElementById('chapFill'+i);
      if(!f) continue;
      if(pct <= startPct){
        f.style.width='0';
      } else if(pct >= endPct){
        f.style.width=`calc(${endPct-startPct}% - ${i+1<n?GAP:0}px)`;
      } else {
        // partial fill within this chapter
        const segW   = endPct - startPct;
        const filled = pct - startPct;
        const ratio  = filled / segW;
        f.style.width=`calc((${endPct-startPct}% - ${i+1<n?GAP:0}px) * ${ratio.toFixed(4)})`;
      }
    }
  };

  // Segment hover highlight
  track._chapHoverBound && track.removeEventListener('mousemove', track._chapHoverBound);
  track._chapLeaveBound && track.removeEventListener('mouseleave', track._chapLeaveBound);
  track._chapHoverBound = (e)=>{
    const r = track.getBoundingClientRect();
    const pct = Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
    const idx = getChapterIdxAt(pct*(player?.getDuration()||0));
    track.querySelectorAll('.seek-chap-seg').forEach((s,si)=>s.classList.toggle('hov',si===idx));
  };
  track._chapLeaveBound = ()=>{
    track.querySelectorAll('.seek-chap-seg').forEach(s=>s.classList.remove('hov'));
  };
  track.addEventListener('mousemove', track._chapHoverBound);
  track.addEventListener('mouseleave', track._chapLeaveBound);
}

function buildPipChapterMarkers(){
  
  const mpTrack=$('mpSeekTrack');
  if(!mpTrack) return;
  mpTrack.querySelectorAll('.pip-chap-gap').forEach(e=>e.remove());
  if(!chapters.length||!player) return;
  let dur=0; try{dur=player.getDuration()||0;}catch(_){}
  if(!dur) return;
  chapters.forEach(c=>{
    if(c.sec<=0||c.sec>=dur) return;
    const pct=(c.sec/dur)*100;
    const gap=document.createElement('div');
    gap.className='pip-chap-gap';
    gap.style.left=pct+'%';
    mpTrack.appendChild(gap);
  });
}

function getChapterAt(sec){
  if(!chapters.length) return null;
  let found=null;
  for(let i=0;i<chapters.length;i++){
    if(chapters[i].sec<=sec) found=chapters[i];
    else break;
  }
  return found;
}

function getChapterIdxAt(sec){
  if(!chapters.length) return -1;
  let idx=-1;
  for(let i=0;i<chapters.length;i++){
    if(chapters[i].sec<=sec) idx=i;
    else break;
  }
  return idx;
}

function checkChapterChange(cur){
  if(!chapters.length) return;
  const idx=getChapterIdxAt(cur);
  if(idx!==lastChapIdx && idx>=0){
    lastChapIdx=idx;
    showChapBadge(chapters[idx]);
    try{ window.parent.postMessage({event:'chapterChange', index:idx}, '*'); }catch(_){}
  }
}

function showChapBadge(c){
  const badge=$('chapBadge');
  const tEl=$('chapBadgeTitle'), sEl=$('chapBadgeSub'), iEl=$('chapBadgeImg');
  if(!badge) return;
  if(chapBadgeTimer){ clearTimeout(chapBadgeTimer); chapBadgeTimer=null; }
  tEl.textContent=c.title||'';
  sEl.textContent=c.sub||'';
  if(c.img){ iEl.src=c.img; iEl.classList.add('show'); } else { iEl.classList.remove('show'); iEl.src=''; }
  badge.classList.add('visible');
  chapBadgeTimer=setTimeout(()=>badge.classList.remove('visible'),2800);
}

function getChapterLabelAt(sec){
  const c=getChapterAt(sec);
  return c?c.title:'';
}

(function(){
  const p=new URLSearchParams(location.search);
  const v=p.get('v'),t=p.get('t');
  if(v){window._autoId=v;window._autoT=t?parseInt(t):0;}
})();

let viInfoOpen = false;
function toggleVideoInfo(){
  viInfoOpen = !viInfoOpen;
  $('videoInfoPanel').classList.toggle('show', viInfoOpen);
  
  const btns = $('settingsMenu').querySelectorAll('button');
  btns.forEach(b=>{ if(b.textContent==='Show Info'||b.textContent==='Hide Info') b.textContent=viInfoOpen?'Hide Info':'Show Info'; });
}

async function fetchVideoInfo(id){
  if(!id) return;
  
  if($('vi-title'))   $('vi-title').textContent   = 'Loading…';
  if($('vi-author'))  $('vi-author').textContent  = '…';
  if($('vi-type'))    $('vi-type').textContent    = '…';
  if($('vi-thumbsize'))$('vi-thumbsize').textContent='…';
  if($('vi-version')) $('vi-version').textContent = '…';
  if($('vi-width'))   $('vi-width').textContent   = '…';
  if($('vi-url'))     $('vi-url').textContent     = '…';
  if($('vi-thumb'))   $('vi-thumb').src           = '';
  try{
    const res = await fetch('https://noembed.com/embed?url=https://www.youtube.com/watch?v=' + id + '&format=json');
    if(!res.ok){ if($('vi-title'))$('vi-title').textContent='Failed to load'; return; }
    const d = await res.json();

    
    if(d.title) document.title = d.title;

    
    let favLink = document.querySelector("link[rel='icon']");
    if(!favLink){ favLink=document.createElement('link'); favLink.rel='icon'; document.head.appendChild(favLink); }
    if(d.thumbnail_url) favLink.href = d.thumbnail_url;

    
    if($('vi-thumb'))  $('vi-thumb').src  = d.thumbnail_url || '';
    if($('vi-title'))  $('vi-title').textContent = d.title || '—';

    
    if($('vi-author')){
      const authorPath = d.author_url.replace('https://www.youtube.com/',gotourl)
      $('vi-author').textContent  = d.author_name || '—';
      $('vi-author').href         = authorPath;
    }

    
    if($('vi-type'))     $('vi-type').textContent     = d.type || '—';

    
    if($('vi-thumbsize') && d.thumbnail_width && d.thumbnail_height)
      $('vi-thumbsize').textContent = d.thumbnail_width + '×' + d.thumbnail_height;

    
    if($('vi-version'))  $('vi-version').textContent  = d.version || '—';

    
    if($('vi-width'))    $('vi-width').textContent    = d.width ? d.width + 'px' : '—';

    
    if($('vi-url')){
      const vidPath = gotourl + 'watch/?v=' + id;
      $('vi-url').textContent = id;
      $('vi-url').href        = vidPath;
    }

  }catch(err){ console.warn('noembed fetch failed:', err); }
}

function toggleDd(id){const el=$(id),was=el.classList.contains('open');document.querySelectorAll('.dd.open').forEach(d=>d.classList.remove('open'));if(!was)el.classList.add('open');}
document.addEventListener('click',e=>{if(!e.target.closest('.dd'))document.querySelectorAll('.dd.open').forEach(d=>d.classList.remove('open'));});

const Q={highres:'4K',hd2160:'4K',hd1440:'1440p',hd1080:'1080p HD',hd720:'720p HD',large:'480p',medium:'360p',small:'240p',tiny:'144p',auto:'Auto'};

window.onYouTubeIframeAPIReady=()=>{};
function loadYTApi(){if(window.YT&&window.YT.Player)return Promise.resolve();return new Promise(res=>{window.onYouTubeIframeAPIReady=res;const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';document.head.appendChild(s);});}
function extractId(s){s=s.trim();const m=s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/)||s.match(/^([A-Za-z0-9_-]{11})$/);return m?m[1]:null;}

async function loadVideo(id,startSec){
  videoId=id; startSec=startSec||0; showToast('Loading…');

  // Mute immediately to prevent old video audio blip during switch
  // Skip when tab is hidden — muting in background causes silent stall on next video
  let _switchMuted = false;
  if(player && !document.hidden){
    try{ if(!isMuted){ player.mute(); _switchMuted=true; } }catch(_){}
  }
  window._switchMuted = _switchMuted;

  const th=$('thumbnail');
  th.src='https://img.youtube.com/vi/'+id+'/maxresdefault.jpg';
  th.onerror=()=>{
    th.onerror=()=>{
      th.onerror=()=>{ th.onerror=null; th.src='https://i.giphy.com/6FMCMhZ1pGMKbPjYB8.webp'; };
      th.src='https://img.youtube.com/vi/'+id+'/hqdefault.jpg';
    };
    th.src='https://img.youtube.com/vi/'+id+'/sddefault.jpg';
  };
  th.classList.remove('hidden','fast');
  $('controls').classList.add('visible');
  updateControlsVisibility?.();
  fetchVideoInfo(id);
  lastChapIdx=-1;
  document.querySelectorAll('.seek-chapter-gap').forEach(e=>e.remove());
  document.querySelectorAll('.pip-chap-gap').forEach(e=>e.remove());

  await loadYTApi();
  if(is360Mode) stop360();

  
  if(player){
    try{
      player.loadVideoById({videoId:id, startSeconds:startSec});
      buildQualityMenu();
      setTimeout(()=>{ buildChapterMarkers(); buildPipChapterMarkers(); },600);
      if(currentSpeed!==1){ try{player.setPlaybackRate(currentSpeed);}catch(_){} }
      return;
    }catch(e){  }
  }

  
  if(player){try{player.destroy();}catch(e){}player=null;}
  $('ytPlayerContainer').innerHTML='<div id="ytPlayer"></div>';
  try{
    player=new YT.Player('ytPlayer',{
      videoId:id,
      playerVars:{
        autoplay:1,controls:0,rel:0,modestbranding:1,
        iv_load_policy:3,playsinline:1,cc_load_policy:0,
        enablejsapi:1,start:startSec,
        vq:'hd1080',html5:1,fs:0,
      },
      events:{onReady:onReady,onStateChange:onState,onPlaybackQualityChange:onQualChange,onError:onErr}
    });
  }catch(ytErr){
    console.warn('YT.Player init failed:',ytErr);
    showToast('Invalid video ID',true);
    th.onerror=null; th.src='https://i.giphy.com/6FMCMhZ1pGMKbPjYB8.webp';
    th.style.transition='none'; th.style.opacity='1'; th.classList.remove('hidden');
    const fi=player&&player.getIframe?player.getIframe():null;
    if(fi){fi.style.transition='none';fi.style.opacity='0';}
  }
}

function onReady(e){
  const f=e.target.getIframe();
  Object.assign(f.style,{position:'absolute',top:'0',left:'0',width:'100%',height:'100%',border:'none',opacity:'0',transition:'none',pointerEvents:'none'});
  f.setAttribute('allow','autoplay; fullscreen; picture-in-picture');
  
  try{
    // Restore volume after switch-mute
    if(window._switchMuted){ window._switchMuted=false; player.unMute(); }
    if(!isMuted){ player.unMute(); player.setVolume(currentVol); }
    player.setPlaybackQuality('hd1080');
    player.playVideo();
  }catch(er){}
  buildQualityMenu();resizeVideo();detect360();hideToast();
  
  setTimeout(()=>{ buildChapterMarkers(); buildPipChapterMarkers(); },600);
  
  if(currentSpeed!==1){try{player.setPlaybackRate(currentSpeed);}catch(_){}}

  // Background play retry: browsers silently ignore playVideo() when tab is hidden.
  // Poll every 600ms for up to 8s until state confirms PLAYING or BUFFERING.
  _bgPlayRetry(0);
}

// Retry playVideo() in background — browser blocks the first call when tab is hidden.
// Once state=PLAYING(1) or BUFFERING(3) is confirmed, stop retrying.
function _bgPlayRetry(attempt){
  if(attempt > 13) return; // give up after ~8s
  setTimeout(()=>{
    if(!player) return;
    try{
      const state = player.getPlayerState();
      if(state === 1 || state === 3) return; // already going — done
      if(!isMuted){ try{ player.unMute(); player.setVolume(currentVol); }catch(_){} }
      player.playVideo();
    }catch(_){}
    _bgPlayRetry(attempt + 1);
  }, 600);
}

function buildQualityMenu(){
  const menu=$('qualityMenu');[...menu.querySelectorAll('button')].forEach(b=>b.remove());
  let levels=[];try{levels=player.getAvailableQualityLevels()||[];}catch(e){}
  if(!levels.length)levels=['auto','hd1080','hd720','large','medium','small','tiny'];
  const cur=getCurQuality();
  levels.forEach(q=>{const btn=document.createElement('button');btn.textContent=Q[q]||q;btn.dataset.q=q;if(q===cur)btn.classList.add('on');btn.onclick=()=>applyQuality(q);menu.appendChild(btn);});
}
function getCurQuality(){try{return player?player.getPlaybackQuality():'auto';}catch(e){return'auto';}}
function applyQuality(q){
  try{const was=isPlaying,cur=player.getCurrentTime()||0;player.setPlaybackQuality(q);player.seekTo(cur,true);player.setPlaybackQuality(q);if(was)player.playVideo();else player.pauseVideo();showToast('Quality: '+(Q[q]||q));}catch(e){}
  
  
  [...$('qualityMenu').querySelectorAll('button')].forEach(b=>b.classList.toggle('on',b.dataset.q===q));
  document.querySelectorAll('.dd.open').forEach(d=>d.classList.remove('open'));
}
function onQualChange(e){
  [...$('qualityMenu').querySelectorAll('button')].forEach(b=>b.classList.toggle('on',b.dataset.q===e.data));}

function onState(e){
  const S=YT.PlayerState;
  if(e.data===S.PLAYING){
    isPlaying=true;setPlayIcon(true);detect360();_requestWakeLock();
    // Restore volume if we muted during video switch
    if(window._switchMuted){ window._switchMuted=false; try{ player.unMute(); player.setVolume(currentVol); }catch(_){} }
    $('bigPlay').classList.add('hidden');
    const f=player.getIframe();clearTimeout(seekReleaseTimer);f.style.transition='opacity 0.35s ease';f.style.opacity='1';
    const th=$('thumbnail');th.style.transition='opacity 0.35s ease';th.classList.add('hidden');
    startProgress();resetHideTimer();buildQualityMenu();
    if(autoStopMs>0&&!autoStopEndOfVideo)startAutoStop();
    if(autoStopEndOfVideo){$('asBadge').classList.add('visible');$('asLabel').textContent='STOP: END OF VIDEO';}
  }else if(e.data===S.PAUSED){
    isPlaying=false;setPlayIcon(false);_releaseWakeLock();$('bigPlay').classList.remove('hidden');stopProgress();showControls();clearAutoStop();
    
    const thP=$('thumbnail');
    if(thP){thP.style.transition='opacity 0.3s ease';thP.classList.remove('hidden');}
    const fP=player.getIframe?player.getIframe():null;
    if(fP){fP.style.transition='opacity 0.3s ease';fP.style.opacity='0';}
  }else if(e.data===S.ENDED){
    if(loopEnabled){
      try{player.seekTo(0,true);player.playVideo();}catch(_){}
      return;
    }
    isPlaying=false;setPlayIcon(false);$('bigPlay').classList.remove('hidden');
    const f=player.getIframe();if(f){f.style.transition='none';f.style.opacity='0';}
    const th=$('thumbnail');th.classList.add('fast');th.classList.remove('hidden');
    stopProgress();showControls();clearAutoStop();
    
    let dur2=0;try{dur2=player.getDuration()||0;}catch(_){}
    try{window.parent.postMessage({event:'ended',videoId,duration:dur2},'*');}catch(_){}
    
    if(plAutoplay && autoplayEnabled && playlist.length>0){
      setTimeout(()=>plNext(true), 800);
    }
  }else if(e.data===S.BUFFERING){
    showToast('Buffering…');
    
    const thB=$('thumbnail');
    if(thB){thB.style.transition='none';thB.style.opacity='1';thB.classList.remove('hidden');}
    const fB=player.getIframe?player.getIframe():null;
    if(fB){fB.style.transition='none';fB.style.opacity='0';}
  }
  else if(e.data===S.CUED){
    hideToast();
    
    const thC=$('thumbnail');
    if(thC){thC.style.transition='none';thC.style.opacity='1';thC.classList.remove('hidden');}
  }
}
function onErr(e){
  const m={2:'Invalid video ID',5:'HTML5 error',100:'Video not found',101:'Embedding disabled',150:'Embedding disabled'};
  showToast(m[e.data]||'Playback error',true);
  const th=$('thumbnail');
  th.onerror=null; th.src='https://i.giphy.com/6FMCMhZ1pGMKbPjYB8.webp';
  th.style.transition='none'; th.style.opacity='1'; th.classList.remove('hidden');
  const fi=player&&player.getIframe?player.getIframe():null;
  if(fi){fi.style.transition='none';fi.style.opacity='0';}
}

function togglePlay(){if(!player)return;try{(isPlaying) ? player.pauseVideo() : player.playVideo();}catch(e){}}
function setPlayIcon(p){
  const path=p?'<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>':'<path d="M8 5v14l11-7z"/>';
  $('playIcon').innerHTML=path;
  if($('mpPlayIcon'))$('mpPlayIcon').innerHTML=path;
  if($('mpBigPlayIcon'))$('mpBigPlayIcon').innerHTML=path;
  if($('mpBigPlay'))$('mpBigPlay').classList.toggle('hidden',p);
}

function onVolBar(val){
  currentVol=parseInt(val);
  $('volPct').textContent=currentVol+'%';
  $('volBar').style.background='linear-gradient(to right,var(--accent) '+currentVol+'%,rgba(255,255,255,0.18) '+currentVol+'%)';
  if(!player)return;
  try{if(currentVol===0){player.mute();isMuted=true;}else{player.unMute();isMuted=false;player.setVolume(currentVol);}updateMuteIcon();}catch(e){}
}
function toggleMuteClick(e){e.stopPropagation();toggleMute();}
function toggleMute(){
  if(!player)return;
  try{
    if(isMuted){player.unMute();isMuted=false;const v=currentVol||50;player.setVolume(v);$('volBar').value=v;onVolBar(v);}
    else{player.mute();isMuted=true;$('volBar').value=0;$('volPct').textContent='0%';$('volBar').style.background='rgba(255,255,255,0.18)';}
    updateMuteIcon();
  }catch(e){}
}
function updateMuteIcon(){
  const muted=isMuted||currentVol===0;
  $('muteIcon').innerHTML=muted
    ?'<path d="M16.5 12c0-1.77-.77-3.36-2-4.47v2.87l1.99 1.99c0-.13.01-.26.01-.39zm2 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>'
    :currentVol<50
    ?'<path d="M18.5 12c0-1.77-.77-3.36-2-4.47v8.94c1.23-1.11 2-2.7 2-4.47zM5 9v6h4l5 5V4L9 9H5z"/>'
    :'<path d="M3 9v6h4l5 5V4l-5 5H3zm13.5 3c0-1.77-.77-3.36-2-4.47v8.94c1.23-1.11 2-2.7 2-4.47zM19 12c0 2.21-1.03 4.19-2.65 5.5l1.41 1.41C20.02 16.97 21 14.61 21 12s-.98-4.97-2.24-6.91l-1.41 1.41C18.97 7.81 19 9.79 19 12z"/>';
  $('muteBtn').style.color=muted?'var(--accent)':'';
  if($('mpMuteIcon'))$('mpMuteIcon').innerHTML=$('muteIcon').innerHTML;
}

function startProgress(){
  stopProgress();
  _bgStartTimer(BG_TIMER_PROGRESS, 500);
  progressTimer = true; 
}
function stopProgress(){
  _bgStopTimer(BG_TIMER_PROGRESS);
  progressTimer = null;
}
function fmt(s){s=Math.floor(s||0);return Math.floor(s/3600)+':'+String(Math.floor((s%3600)/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}

let seekReleaseTimer=null;
function seekCoverOn(){
  const f=player&&player.getIframe?player.getIframe():null;
  if(!f)return;
  
  f.style.transition='none';
  f.style.opacity='0';
  
  const th=$('thumbnail');
  if(th){ th.classList.remove('hidden'); th.style.transition='none'; th.style.opacity='1'; }
}
function seekAt(e){
  if(!player)return;
  const r=$('seekTrack').getBoundingClientRect();
  const x=(e.touches?e.touches[0].clientX:e.clientX)-r.left;
  const pct=Math.max(0,Math.min(1,x/r.width));
  try{
    seekCoverOn();
    
    
    $('seekFill').style.width=(pct*100)+'%';
    const targetSec=pct*(player.getDuration()||0);
    clearTimeout(seekReleaseTimer);
    
    player.seekTo(targetSec,true);
    seekReleaseTimer=setTimeout(()=>{
      
      const f=player&&player.getIframe?player.getIframe():null;
      if(f){ f.style.transition='opacity 0.3s ease'; f.style.opacity='1'; }
      const th=$('thumbnail');
      if(th){ th.style.transition='opacity 0.3s ease'; th.classList.add('hidden'); }
    },600);
  }catch(e2){}
}
$('seekTrack').addEventListener('mousedown',e=>{isDragging=true;seekAt(e);});
$('seekTrack').addEventListener('touchstart',e=>{isDragging=true;seekAt(e);},{passive:true});
document.addEventListener('mousemove',e=>{if(isDragging)seekAt(e);});
document.addEventListener('touchmove',e=>{if(isDragging)seekAt(e);},{passive:true});
document.addEventListener('mouseup',()=>{isDragging=false;});
document.addEventListener('touchend',()=>{isDragging=false;});

$('seekTrack').addEventListener('mousemove',e=>{
  if(!player)return;
  const r=$('seekTrack').getBoundingClientRect();
  const pct=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
  const timeSec=pct*(player.getDuration()||0);
  const tooltip=$('seekTooltip');
  
  const tipW=70;
  let lx=e.clientX-r.left;
  lx=Math.max(tipW/2, Math.min(r.width-tipW/2, lx));
  tooltip.style.left=lx+'px';
  tooltip.classList.add('visible');
  const f=s=>{s=Math.floor(s||0);const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60;return h>0?h+':'+String(m).padStart(2,'0')+':'+String(sc).padStart(2,'0'):m+':'+String(sc).padStart(2,'0');};
  $('sbTime').textContent=f(timeSec);
  
  const chapLabel=getChapterLabelAt(timeSec);
  if($('sbChap')) $('sbChap').textContent=chapLabel;
});
$('seekTrack').addEventListener('mouseleave',()=>{
  $('seekTooltip').classList.remove('visible');
});

function setCC(lang){
  ['ccOff','ccEn','ccTh'].forEach(id=>$(id).classList.remove('on'));
  if(!player)return;
  try{if(lang==='off'){player.unloadModule('captions');$('ccOff').classList.add('on');}else{player.loadModule('captions');player.setOption('captions','track',{languageCode:lang});$('cc'+lang[0].toUpperCase()+lang.slice(1)).classList.add('on');}}catch(e){}
}

let loopEnabled=false;
function toggleLoop(){
  loopEnabled=!loopEnabled;
  
  if($('loopBtn')){
    $('loopBtn').textContent='Loop: '+(loopEnabled?'On':'Off');
    $('loopBtn').classList.toggle('on',loopEnabled);
  }
  showToast('Loop '+(loopEnabled?'on':'off'));
}

let currentSpeed=1;
function setSpeed(rate){
  currentSpeed=rate;
  try{player&&player.setPlaybackRate(rate);}catch(_){}
  const lbl=rate===1?'1×':rate+'×';
  
  document.querySelectorAll('[data-spd]').forEach(b=>{
    b.classList.toggle('on', parseFloat(b.dataset.spd)===rate);
  });
  document.querySelectorAll('.dd.open').forEach(d=>d.classList.remove('open'));
  if(rate!==1) showToast('Speed: '+lbl);
}

let asMode=null;       
let asTargetMs=0;      
let asTargetSec=0;     
let asModalTab='timer';

function openAsModal(){
  $('asModal').classList.add('open');
  
  const d=new Date(Date.now()+30*60000);
  $('asClockInput').value=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  
  document.querySelectorAll('.as-quick').forEach(b=>b.classList.remove('on'));
}
function closeAsModal(){ $('asModal').classList.remove('open'); }

function switchAsTab(tab){
  asModalTab=tab;
  ['timer','clock','video'].forEach(t=>{
    $('tab'+t.charAt(0).toUpperCase()+t.slice(1)).classList.toggle('on',t===tab);
    const panel=$(t==='timer'?'asTimerPanel':t==='clock'?'asClockPanel':'asVideoPanel');
    if(panel) panel.style.display=t===tab?'flex':'none';
    if(t==='asClockPanel') $('asClockPanel').classList.toggle('show',tab==='clock');
  });
  
  $('asTimerPanel').style.display=tab==='timer'?'flex':'none';
  $('asClockPanel').style.display=tab==='clock'?'flex':'none';
}

function asQuick(min){
  document.querySelectorAll('.as-quick').forEach(b=>b.classList.remove('on'));
  event.target.classList.add('on');
  if(min===-1){
    
    clearAutoStop();
    asMode='video'; autoStopEndOfVideo=true;
    $('asBadge').classList.add('visible'); $('asLabel').textContent='STOP: END OF VIDEO';
    closeAsModal(); return;
  }
  
  const totalSec=min*60;
  $('asHourIn').value=Math.floor(totalSec/3600);
  $('asMinIn').value=Math.floor((totalSec%3600)/60);
  $('asSecIn').value=totalSec%60;
}

function applyAsModal(){
  clearAutoStop();
  if(asModalTab==='timer'){
    const h=parseInt($('asHourIn').value)||0;
    const m=parseInt($('asMinIn').value)||0;
    const s=parseInt($('asSecIn').value)||0;
    const totalMs=(h*3600+m*60+s)*1000;
    if(totalMs<=0){showToast('Enter a valid duration',true);return;}
    autoStopMs=totalMs; autoStopEndOfVideo=false; asMode='timer';
    autoStopStart=Date.now();
    $('asBadge').classList.add('visible'); updateAsBadge(autoStopMs);
    _bgStartTimer(BG_TIMER_AUTOSTOP, 500); autoStopTimer = true;
  } else if(asModalTab==='clock'){
    const val=$('asClockInput').value;
    if(!val){showToast('Pick a time',true);return;}
    const [hh,mm]=val.split(':').map(Number);
    const now=new Date(), target=new Date();
    target.setHours(hh,mm,0,0);
    if(target<=now) target.setDate(target.getDate()+1); 
    asTargetMs=target.getTime(); asMode='clock'; autoStopEndOfVideo=false;
    $('asBadge').classList.add('visible'); updateClockBadge();
    _bgStartTimer(BG_TIMER_AUTOSTOP, 1000); autoStopTimer = true;
  } else if(asModalTab==='video'){
    const h=parseInt($('asVHourIn').value)||0;
    const m=parseInt($('asVMinIn').value)||0;
    const s=parseInt($('asVSecIn').value)||0;
    asTargetSec=h*3600+m*60+s;
    if(asTargetSec<=0){showToast('Enter a valid video timestamp',true);return;}
    asMode='video'; autoStopEndOfVideo=false;
    $('asBadge').classList.add('visible');
    const fmtT=sec=>{const mm=Math.floor(sec/60),ss=sec%60;return mm+':'+String(ss).padStart(2,'0');};
    $('asLabel').textContent='STOP AT '+fmtT(asTargetSec);
  }
  closeAsModal();
  if(asMode) showToast('Sleep timer set');
}

function asTimerTick(){
  const rem=autoStopMs-(Date.now()-autoStopStart);
  if(rem<=0){ pauseAndClear(); showToast('Auto-stopped — sleep timer'); }
  else updateAsBadge(rem);
}

function asClockTick(){
  const rem=asTargetMs-Date.now();
  if(rem<=0){ pauseAndClear(); showToast('Auto-stopped — sleep timer'); }
  else updateClockBadge();
}
function updateClockBadge(){
  const rem=asTargetMs-Date.now();
  const s=Math.ceil(rem/1000), h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sc=s%60;
  $('asLabel').textContent='STOP IN '+(h>0?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(sc).padStart(2,'0');
}

function checkVideoTimeStop(cur){
  if(asMode==='video'&&!autoStopEndOfVideo&&asTargetSec>0&&cur>=asTargetSec){
    pauseAndClear(); showToast('Auto-stopped at '+fmt(asTargetSec));
  }
  if(asMode==='video'&&autoStopEndOfVideo){}
}

function pauseAndClear(){ try{player&&player.pauseVideo();}catch(_){} clearAutoStop(); }

function updateAsBadge(ms){
  const s=Math.ceil(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60;
  $('asLabel').textContent='STOP IN '+(h>0?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(sc).padStart(2,'0');
}
function clearAutoStop(keep){
  if(autoStopTimer){_bgStopTimer(BG_TIMER_AUTOSTOP);autoStopTimer=null;}
  asMode=null; autoStopMs=0; autoStopEndOfVideo=false; asTargetMs=0; asTargetSec=0;
  if(!keep) $('asBadge').classList.remove('visible');
}

$('asBadge').addEventListener('click',openAsModal);

$('downloadBtn').addEventListener('click',()=>{
  if(!videoId)return;
  const q=getCurQuality();
  const vq=q==='hd1440'||q==='hd2160'||q==='highres'?'1080':q==='hd1080'?'1080':q==='hd720'?'720':q==='large'?'480':'720';
  window.open('https://cobalt.meowing.de/?u=https://www.youtube.com/watch?v='+videoId+'&vCodec=h264&vQuality='+vq,'_blank');
});

let _touching=false;
function showControls(){$('controls').classList.add('visible');resetHideTimer();}
function updateControlsVisibility(){if(!document.fullscreenElement){clearTimeout(hideTimer);$('controls').classList.add('visible');}}
document.addEventListener('fullscreenchange',()=>{updateControlsVisibility();resizeVideo();});
function resetHideTimer(){
  clearTimeout(hideTimer);
  if(isPlaying&&!_touching)hideTimer=setTimeout(()=>{$('controls').classList.remove('visible');},3000);
}
document.addEventListener('mousemove',()=>{$('controls').classList.add('visible');resetHideTimer();});
document.addEventListener('touchstart',()=>{_touching=true;$('controls').classList.add('visible');clearTimeout(hideTimer);},{passive:true});
document.addEventListener('touchmove',()=>{_touching=true;$('controls').classList.add('visible');clearTimeout(hideTimer);},{passive:true});
document.addEventListener('touchend',()=>{_touching=false;resetHideTimer();},{passive:true});

let dtTimer=null, dtCount=0, dtSide=null;
function flashSeek(side){
  const el=$(side==='right'?'dtRight':'dtLeft');
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  try{
    const t=(player.getCurrentTime()||0)+(side==='right'?10:-10);
    player.seekTo(Math.max(0,t),true);
    showControls();
  }catch(_){}
}

let _lastTapTime=0,_lastTapSide=null;
function _handleTap(clientX){
  const rect=$('videoAspect').getBoundingClientRect();
  const side=clientX<rect.left+rect.width/2?'left':'right';
  const now=Date.now();
  const gap=now-_lastTapTime;
  if(gap<350&&gap>30&&_lastTapSide===side){
    _lastTapTime=0;_lastTapSide=null;
    clearTimeout(dtTimer);dtCount=0;
    flashSeek(side);
  }else{
    _lastTapTime=now;_lastTapSide=side;
    dtCount=1;
    clearTimeout(dtTimer);
    dtTimer=setTimeout(()=>{
      if(dtCount===1){
        if(!$('controls').classList.contains('visible')){showControls();}
        else{togglePlay();}
      }
      dtCount=0;
    },300);
  }
}
$('videoWrapper').addEventListener('click',e=>{
  if(e.target.closest('#controls')||e.target.closest('#bigPlay')||e.target.closest('#ctrl360'))return;
  if(!player||!videoId){showControls();return;}
  _handleTap(e.clientX);
});
$('bigPlay').addEventListener('click',e=>{e.stopPropagation();togglePlay();});
$('dtLeft').addEventListener('click',e=>{e.stopPropagation();if(player&&videoId)flashSeek('left');});
$('dtRight').addEventListener('click',e=>{e.stopPropagation();if(player&&videoId)flashSeek('right');});
$('playBtn').addEventListener('click',e=>{e.stopPropagation();togglePlay();});
$('fsBtn').addEventListener('click',e=>{
  e.stopPropagation();
  if(!document.fullscreenElement){$('app').requestFullscreen&&$('app').requestFullscreen();$('fsIcon').innerHTML='<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>';}
  else{document.exitFullscreen&&document.exitFullscreen();$('fsIcon').innerHTML='<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>';}
});

let toastT=null;
function showToast(msg,err=false){const t=$('toast');t.textContent=msg;t.classList.toggle('error',err);t.classList.add('visible');clearTimeout(toastT);toastT=setTimeout(hideToast,3000);}
function hideToast(){$('toast').classList.remove('visible');}

let is360Mode=false, sphere={yaw:0,pitch:0,roll:0};
function detect360(){
  if(!player)return;
  try{
    const props=player.getSphericalProperties?.();
    const is360=props&&Object.keys(props).length>0;
    if(is360){$('btn360').style.display='';if(!is360Mode)start360();}
    else{$('btn360').style.display='none';$('ctrl360').classList.remove('visible');}
  }catch(e){}
}
function toggle360(){is360Mode?stop360():start360();}
function start360(){
  if(!player)return;
  try{
    player.setSphericalProperties({enableOrientationSensor:false,fov:100,yaw:sphere.yaw,pitch:sphere.pitch,roll:0});
    is360Mode=true;$('btn360').classList.add('btn360on');$('ctrl360').classList.add('visible');
    initJoystick();enableDrag360();showToast('360° — use joystick or drag');
  }catch(e){showToast('360° not available',true);}
}
function stop360(){
  disableDrag360();destroyJoystick();
  is360Mode=false;$('btn360').classList.remove('btn360on');$('ctrl360').classList.remove('visible');
  sphere={yaw:0,pitch:0,roll:0};
  try{player.setSphericalProperties({enableOrientationSensor:false,fov:100,yaw:0,pitch:0,roll:0});}catch(e){}
}
function setSphere(){try{player.setSphericalProperties({enableOrientationSensor:false,fov:100,yaw:sphere.yaw,pitch:sphere.pitch,roll:0});}catch(e){}}

let joyActive=false,joyOrigin={x:0,y:0},joyRAF=null;
const JOY_RADIUS=29;
const JOY_SPEED=3.5;
let _joyInited=false;

function initJoystick(){
  if(_joyInited) return; 
  _joyInited=true;
  const base=$('joystick-base');
  base.addEventListener('mousedown',joyDown);
  base.addEventListener('touchstart',joyDown,{passive:false});
}
function destroyJoystick(){
  _joyInited=false;
  const base=$('joystick-base');
  base.removeEventListener('mousedown',joyDown);
  base.removeEventListener('touchstart',joyDown);
  joyStop();
}
function joyDown(e){
  e.preventDefault();e.stopPropagation();
  const base=$('joystick-base');
  const r=base.getBoundingClientRect();
  joyOrigin={x:r.left+r.width/2, y:r.top+r.height/2};
  joyActive=true;
  window.addEventListener('mousemove',joyMove);
  window.addEventListener('touchmove',joyMove,{passive:false});
  window.addEventListener('mouseup',joyUp);
  window.addEventListener('touchend',joyUp);
  if(joyRAF) cancelAnimationFrame(joyRAF);
  joyRAF=requestAnimationFrame(joyLoop);
}
let joyDelta={x:0,y:0};
function joyMove(e){
  e.preventDefault();
  const pt=e.touches?{x:e.touches[0].clientX,y:e.touches[0].clientY}:{x:e.clientX,y:e.clientY};
  let dx=pt.x-joyOrigin.x, dy=pt.y-joyOrigin.y;
  const dist=Math.sqrt(dx*dx+dy*dy);
  if(dist>JOY_RADIUS){const sc=JOY_RADIUS/dist;dx*=sc;dy*=sc;}
  joyDelta={x:dx,y:dy};
  
  const knob=$('joystick-knob');
  knob.style.transform=`translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}
function joyLoop(){
  if(!joyActive){ joyRAF=null; return; }
  
  const nx=joyDelta.x/JOY_RADIUS, ny=joyDelta.y/JOY_RADIUS;
  if(Math.abs(nx)>0.05||Math.abs(ny)>0.05){
    sphere.yaw   -= nx*JOY_SPEED;
    sphere.pitch  = Math.max(-85,Math.min(85,sphere.pitch+ny*JOY_SPEED));
    setSphere();
  }
  joyRAF=requestAnimationFrame(joyLoop);
}
function joyUp(){
  joyActive=false; joyDelta={x:0,y:0};
  cancelAnimationFrame(joyRAF); joyRAF=null;
  window.removeEventListener('mousemove',joyMove);
  window.removeEventListener('touchmove',joyMove);
  window.removeEventListener('mouseup',joyUp);
  window.removeEventListener('touchend',joyUp);
  
  const knob=$('joystick-knob');
  knob.style.transition='transform 0.18s cubic-bezier(.22,1,.36,1)';
  knob.style.transform='translate(-50%,-50%)';
  setTimeout(()=>{knob.style.transition='';},200);
}
function joyStop(){joyActive=false;joyDelta={x:0,y:0};cancelAnimationFrame(joyRAF);joyRAF=null;}

function getXY(e){return e.touches?{x:e.touches[0].clientX,y:e.touches[0].clientY}:{x:e.clientX,y:e.clientY};}
let drag360=null;
function enableDrag360(){const el=$('videoWrapper');el.addEventListener('mousedown',onDragStart360);el.addEventListener('touchstart',onDragStart360,{passive:true});window.addEventListener('mousemove',onDragMove360);window.addEventListener('touchmove',onDragMove360,{passive:true});window.addEventListener('mouseup',onDragEnd360);window.addEventListener('touchend',onDragEnd360);}
function disableDrag360(){const el=$('videoWrapper');el.removeEventListener('mousedown',onDragStart360);el.removeEventListener('touchstart',onDragStart360);window.removeEventListener('mousemove',onDragMove360);window.removeEventListener('touchmove',onDragMove360);window.removeEventListener('mouseup',onDragEnd360);window.removeEventListener('touchend',onDragEnd360);}
function onDragStart360(e){if(!is360Mode||e.target.closest('#ctrl360'))return;const{x,y}=getXY(e);drag360={x,y,yaw:sphere.yaw,pitch:sphere.pitch};}
function onDragMove360(e){if(!drag360)return;const{x,y}=getXY(e);sphere.yaw=drag360.yaw-(x-drag360.x)*0.3;sphere.pitch=Math.max(-85,Math.min(85,drag360.pitch+(y-drag360.y)*0.2));setSphere();}
function onDragEnd360(){drag360=null;}

document.addEventListener('keydown',e=>{
  if(document.activeElement&&document.activeElement.tagName==='INPUT')return;
  if(e.key===' '||e.key==='k'){e.preventDefault();togglePlay();}
  if(e.key==='m')toggleMute();
  if(e.key==='f')$('fsBtn').click();
  if(e.key==='d'||e.key==='D'){if(is360Mode){sphere.yaw-=5;setSphere();}else{flashSeek('right');}}
  if(e.key==='a'||e.key==='A'){if(is360Mode){sphere.yaw+=5;setSphere();}else{flashSeek('left');}}
  if(e.key==='ArrowUp'){currentVol=Math.min(100,currentVol+5);$('volBar').value=currentVol;onVolBar(currentVol);}
  if(e.key==='ArrowDown'){currentVol=Math.max(0,currentVol-5);$('volBar').value=currentVol;onVolBar(currentVol);}
});

function resizeVideo(){
  const container = $('ytPlayerContainer');
  if(!container) return;

  // Get the real fullscreen size (more reliable than window.innerWidth)
  const fsEl = document.fullscreenElement || 
               document.webkitFullscreenElement || 
               document.mozFullScreenElement;
  
  const vw = fsEl ? fsEl.clientWidth  : window.innerWidth;
  const vh = fsEl ? fsEl.clientHeight : window.innerHeight;

  let w, h;

  // ── FORCE LETTERBOX (black top + bottom) in fullscreen ──
  if(fsEl){
    w = vw;                          // always full width
    h = Math.round(vw * 9 / 16);     // exact 16:9 height
  } 
  // Normal (non-fullscreen) mode - keep your original smart fit
  else {
    if(vw / vh > 16/9){
      w = vw;
      h = Math.round(vw * 9 / 16);
    } else {
      h = vh;
      w = Math.round(vh * 16 / 9);
    }
  }

  container.style.width  = w + 'px';
  container.style.height = h + 'px';

  // Center perfectly when in fullscreen (black bars appear top & bottom)
  if(fsEl){
    container.style.position  = 'absolute';
    container.style.left      = '50%';
    container.style.top       = '50%';
    container.style.transform = 'translate(-50%, -50%)';
  } else {
    // Reset for normal view
    container.style.position  = '';
    container.style.left      = '';
    container.style.top       = '';
    container.style.transform = '';
  }
}

window.addEventListener('resize',resizeVideo);
resizeVideo();

if(window._autoId){loadVideo(window._autoId,window._autoT||0);}

const hasDPiP='documentPictureInPicture' in window;
const hasVidPiP='pictureInPictureEnabled' in document&&document.pictureInPictureEnabled;
const isTouchDevice = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  || (navigator.platform==='MacIntel' && navigator.maxTouchPoints > 1)
  || (isTouchDevice && !/Win|Linux|X11/.test(navigator.platform));

if(isMobile || isTouchDevice){
  const mpBtn=$('miniplayerBtn');
  if(mpBtn) mpBtn.style.display='none';
}
let mpActive=false,pipWin=null,mpProgressTimer=null;
let mpDragging=false,mpResizing=false,mpDragOffset={x:0,y:0},mpResizeStart={};
const MP_W=340,MP_W_MIN=220,MP_W_MAX=600,MP_M=12;

async function enterMiniplayer(){
  if(!videoId){showToast('Load a video first',true);return;}
  if(isMobile||(!hasDPiP&&hasVidPiP)){await enterNativePiP();}
  else if(hasDPiP){await enterDocPiP();}
  else{enterBrowserMiniplayer();}
}

async function enterNativePiP(){
  try{
    if(document.pictureInPictureElement){await document.exitPictureInPicture();return;}
    const iframe=player&&player.getIframe?player.getIframe():null;
    if(!iframe)throw new Error('no iframe');
    iframe.setAttribute('allow','autoplay; fullscreen; picture-in-picture');
    let vid=null;
    try{vid=iframe.contentDocument&&iframe.contentDocument.querySelector('video');}catch(_){}
    if(vid&&vid.requestPictureInPicture){await vid.requestPictureInPicture();showToast('PiP active');return;}
    try{iframe.contentWindow.postMessage(JSON.stringify({event:'command',func:'requestPictureInPicture',args:[]}),'*');}catch(_){}
    showToast('Tap the PiP button in your browser controls',true);
  }catch(err){
    if(err.name==='NotAllowedError')showToast('Enable PiP in device Settings',true);
    else showToast('PiP not supported on this browser',true);
  }
}

let captureStream=null,captureCanvas=null,captureCtx=null,captureVideo=null,captureRAF=null;
async function enterDocPiP(){
  try{
    if(pipWin&&!pipWin.closed){pipWin.close();await new Promise(r=>setTimeout(r,80));}
    let stream=null;
    try{stream=await navigator.mediaDevices.getDisplayMedia({video:{displaySurface:'browser',frameRate:30},audio:false,preferCurrentTab:true,selfBrowserSurface:'include',systemAudio:'exclude'});}catch(capErr){console.warn('capture:',capErr);}
    pipWin=await window.documentPictureInPicture.requestWindow({width:480,height:300,disallowReturnToOpener:false});
    const doc=pipWin.document;
    doc.documentElement.style.cssText='margin:0;padding:0;background:#000;overflow:hidden;width:100%;height:100%;';
    doc.body.style.cssText='margin:0;padding:0;width:100%;height:100%;display:flex;flex-direction:column;font-family:system-ui,sans-serif;overflow:hidden;';
    const st=doc.createElement('style');
    st.textContent=`
      *{box-sizing:border-box;margin:0;padding:0;user-select:none;}
      :root{--a:#3b82f6;--ag:rgba(59,130,246,.5);--bg:rgba(9,9,15,.97);--dim:#94a3b8;--bd:rgba(255,255,255,.09);}
      body{display:flex;flex-direction:column;width:100%;height:100%;}
      #pva{position:relative;flex:1;min-height:0;background:#000;overflow:hidden;cursor:pointer;}
      #plv{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;}
      #pth{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;transition:opacity .4s;}
      #pth.h{opacity:0;}
      #pbp{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
           width:64px;height:64px;border-radius:50%;z-index:5;
           background:rgba(255,255,255,0.08);border:1.5px solid rgba(255,255,255,.2);
           backdrop-filter:blur(16px) saturate(1.8);
           display:flex;align-items:center;justify-content:center;
           transition:transform .25s cubic-bezier(.34,1.56,.64,1),background .2s,border-color .2s;
           cursor:pointer;
           box-shadow:0 8px 28px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.05) inset;}
      #pbp::before{content:'';position:absolute;inset:0;border-radius:50%;
           background:radial-gradient(circle at 35% 35%,rgba(255,255,255,.18) 0%,transparent 60%);
           pointer-events:none;}
      #pbp:hover{background:rgba(59,130,246,.25);border-color:rgba(59,130,246,.6);
           transform:translate(-50%,-50%) scale(1.1);
           box-shadow:0 12px 36px rgba(0,0,0,.5),0 0 18px rgba(59,130,246,.3);}
      #pbp:active{transform:translate(-50%,-50%) scale(.95);}
      #pbp.h{opacity:0;pointer-events:none;transform:translate(-50%,-50%) scale(.8);}
      #pbp svg{width:28px;height:28px;fill:#fff;margin-left:3px;filter:drop-shadow(0 1px 3px rgba(0,0,0,.5));}
      #pnc{position:absolute;top:10px;left:50%;transform:translateX(-50%);
           background:rgba(0,0,0,.72);backdrop-filter:blur(8px);border:1px solid var(--bd);
           border-radius:5px;padding:4px 12px;font-size:10px;color:rgba(255,255,255,.5);
           letter-spacing:.05em;pointer-events:none;display:none;white-space:nowrap;}
      #pc{flex-shrink:0;background:var(--bg);border-top:1px solid var(--bd);padding:7px 12px 10px;}
      #psk-row{position:relative;margin-bottom:8px;}
      #psk{width:100%;height:4px;background:rgba(255,255,255,.16);border-radius:2px;
           cursor:pointer;position:relative;transition:height .12s;}
      #psk:hover{height:6px;}
      #psf{height:100%;background:linear-gradient(90deg,var(--a),#60a5fa);width:0;
           border-radius:2px;pointer-events:none;position:relative;}
      #psf::after{content:"";position:absolute;right:-6px;top:50%;transform:translateY(-50%);
           width:12px;height:12px;background:var(--a);border-radius:50%;
           display:none;box-shadow:0 0 8px var(--ag);}
      #psk:hover #psf::after{display:block;}
      #psk-tip{position:absolute;bottom:calc(100% + 8px);
           background:rgba(10,10,15,.92);backdrop-filter:blur(10px);
           border:1px solid rgba(255,255,255,.12);border-radius:5px;
           padding:3px 9px;font-size:11px;font-weight:600;color:#fff;
           font-variant-numeric:tabular-nums;white-space:nowrap;
           pointer-events:none;display:none;transform:translateX(-50%);}
      #psk:hover ~ #psk-tip{display:block;}
      #prw{display:flex;align-items:center;gap:4px;}
      .pb{width:30px;height:30px;background:none;border:none;color:var(--dim);cursor:pointer;
          border-radius:6px;display:flex;align-items:center;justify-content:center;
          transition:color .12s,background .12s;flex-shrink:0;}
      .pb:hover{color:#fff;background:rgba(255,255,255,.1);}
      .pb svg{width:16px;height:16px;fill:currentColor;}
      #pti{font-size:11px;color:var(--dim);font-variant-numeric:tabular-nums;
           white-space:nowrap;flex-shrink:0;margin:0 4px;}
      #pvol{-webkit-appearance:none;appearance:none;
            flex:1;height:4px;border-radius:2px;outline:none;cursor:pointer;
            background:linear-gradient(to right,var(--a) 100%,rgba(255,255,255,.18) 100%);}
      #pvol::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
            width:14px;height:14px;border-radius:50%;background:var(--a);cursor:pointer;
            box-shadow:0 0 5px var(--ag);}
      #pvol::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
            background:var(--a);cursor:pointer;border:none;}
      #pvpct{font-size:11px;color:var(--dim);font-variant-numeric:tabular-nums;
             white-space:nowrap;min-width:28px;text-align:right;flex-shrink:0;}
      .pcg{position:absolute;top:0;bottom:0;width:2px;background:#000;border-radius:1px;pointer-events:none;z-index:4;transform:translateX(-50%);}
    `;
    doc.head.appendChild(st);
    doc.body.innerHTML=`
      <div id="pva">
        <video id="plv" autoplay muted playsinline></video>
        <img id="pth" alt="">
        <div id="pnc">&#9642; Thumbnail &#8212; capture off</div>
        <div id="pbp"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
      </div>
      <div id="pc">
        <div id="psk-row">
          <div id="psk"><div id="psf"></div></div>
          <div id="psk-tip">0:00</div>
        </div>
        <div id="prw">
          <button class="pb" id="ppl"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>
          <button class="pb" id="pmu"><svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4l-5 5H3zm13.5 3c0-1.77-.77-3.36-2-4.47v8.94c1.23-1.11 2-2.7 2-4.47z"/></svg></button>
          <input id="pvol" type="range" min="0" max="100" value="100">
          <span id="pvpct">100%</span>
          <span id="pti">0:00 / 0:00</span>
          <button class="pb" id="pcl" style="color:rgba(255,255,255,.4)"><svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
        </div>
      </div>
    `;
    const plv=doc.getElementById('plv'),pth=doc.getElementById('pth'),pnc=doc.getElementById('pnc');
    const pbp=doc.getElementById('pbp'),ppl=doc.getElementById('ppl'),pmu=doc.getElementById('pmu');
    const psk=doc.getElementById('psk'),psf=doc.getElementById('psf'),pti=doc.getElementById('pti');
    const pcl=doc.getElementById('pcl'),pva=doc.getElementById('pva');
    pth.src=$('thumbnail').src;
    if(stream){
      captureStream=stream;
      captureVideo=document.createElement('video');captureVideo.style.cssText='position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:.01;';captureVideo.muted=true;captureVideo.playsInline=true;captureVideo.srcObject=stream;document.body.appendChild(captureVideo);await captureVideo.play();
      captureCanvas=document.createElement('canvas');captureCanvas.width=960;captureCanvas.height=540;captureCtx=captureCanvas.getContext('2d');
      const pipStream=captureCanvas.captureStream(30);plv.srcObject=pipStream;plv.play().catch(()=>{});
      captureVideo.addEventListener('playing',()=>{pth.classList.add('h');},{once:true});
      function cropLoop(){
        if(!pipWin||pipWin.closed){stopCapture();return;}
        if(captureCtx&&captureVideo&&captureVideo.readyState>=2){
          const iframe=player&&player.getIframe?player.getIframe():null;
          if(iframe){const r=iframe.getBoundingClientRect();const vw=captureVideo.videoWidth,vh=captureVideo.videoHeight,sw=window.innerWidth,sh=window.innerHeight;const sx=(r.left/sw)*vw,sy=(r.top/sh)*vh,sW=(r.width/sw)*vw,sH=(r.height/sh)*vh;if(sW>0&&sH>0){captureCtx.clearRect(0,0,960,540);captureCtx.drawImage(captureVideo,sx,sy,sW,sH,0,0,960,540);pth.classList.add('h');}}
        }
        captureRAF=requestAnimationFrame(cropLoop);
      }
      cropLoop();
      stream.getVideoTracks()[0].addEventListener('ended',()=>{stopCapture();pth.classList.remove('h');pnc.style.display='block';});
      pnc.style.display='none';
    }else{pth.classList.remove('h');pnc.style.display='block';}
    const pvol=doc.getElementById('pvol');
    const pvpct=doc.getElementById('pvpct');
    const pskTip=doc.getElementById('psk-tip');
    const pskRow=doc.getElementById('psk-row');
    pva.addEventListener('click',()=>togglePlay());
    ppl.addEventListener('click',e=>{e.stopPropagation();togglePlay();});
    pmu.addEventListener('click',e=>{e.stopPropagation();toggleMute();});
    pcl.addEventListener('click',()=>pipWin.close());
    pbp.addEventListener('click',e=>{e.stopPropagation();togglePlay();});

    
    const fmt3=s=>{s=Math.floor(s||0);const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60;return h>0?h+':'+String(m).padStart(2,'0')+':'+String(sc).padStart(2,'0'):m+':'+String(sc).padStart(2,'0');};
    psk.addEventListener('mousemove',ev=>{
      if(!player)return;
      const r=psk.getBoundingClientRect();
      const pct2=Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width));
      const t2=pct2*(player.getDuration()||0);
      if(pskTip){
        const tipW=60;
        let lx=ev.clientX-r.left;
        lx=Math.max(tipW/2,Math.min(r.width-tipW/2,lx));
        pskTip.style.left=lx+'px';
        pskTip.style.display='block';
        pskTip.textContent=fmt3(t2);
      }
    });
    psk.addEventListener('mouseleave',()=>{ if(pskTip)pskTip.style.display='none'; });

    
    function updatePvol(v){
      if(pvol) pvol.style.background='linear-gradient(to right,#3b82f6 '+v+'%,rgba(255,255,255,.18) '+v+'%)';
      if(pvpct) pvpct.textContent=v+'%';
    }
    if(pvol){
      pvol.value=currentVol;
      updatePvol(currentVol);
      pvol.addEventListener('input',e=>{
        e.stopPropagation();
        const v=parseInt(pvol.value);
        currentVol=v;
        $('volBar').value=v;
        onVolBar(v);
        updatePvol(v);
      });
    }
    function psAt(e){if(!player)return;const r=psk.getBoundingClientRect();const x=(e.touches?e.touches[0].clientX:e.clientX)-r.left;const pct=Math.max(0,Math.min(1,x/r.width));try{player.seekTo(pct*(player.getDuration()||0),true);psf.style.width=(pct*100)+'%';}catch(_){}}
    psk.addEventListener('mousedown',e=>{e.stopPropagation();psAt(e);const mm=ev=>psAt(ev);const mu=()=>{doc.removeEventListener('mousemove',mm);doc.removeEventListener('mouseup',mu);};doc.addEventListener('mousemove',mm);doc.addEventListener('mouseup',mu);});
    
    function buildPipDocChapters(){
      psk.querySelectorAll('.pcg').forEach(e=>e.remove());
      if(!chapters.length||!player) return;
      let dur=0; try{dur=player.getDuration()||0;}catch(_){}
      if(!dur) return;
      chapters.forEach(c=>{
        if(c.sec<=0||c.sec>=dur) return;
        const pct=(c.sec/dur)*100;
        const g=doc.createElement('div'); g.className='pcg'; g.style.left=pct+'%';
        psk.appendChild(g);
      });
    }
    buildPipDocChapters();
    const fmt2=s=>{s=Math.floor(s||0);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
    const PP='<path d="M8 5v14l11-7z"/>',PA='<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    const MU='<path d="M16.5 12c0-1.77-.77-3.36-2-4.47v2.87l1.99 1.99c0-.13.01-.26.01-.39zm2 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>',VM='<path d="M3 9v6h4l5 5V4l-5 5H3zm13.5 3c0-1.77-.77-3.36-2-4.47v8.94c1.23-1.11 2-2.7 2-4.47z"/>';
    function pipSync(){
      if(!player||!pipWin||pipWin.closed)return;
      try{
        const cur=player.getCurrentTime()||0,dur=player.getDuration()||0;
        psf.style.width=(dur>0?(cur/dur)*100:0)+'%';pti.textContent=fmt2(cur)+' / '+fmt2(dur);
        ppl.querySelector('svg').innerHTML=isPlaying?PA:PP;pbp.querySelector('svg').innerHTML=isPlaying?PA:PP;pbp.classList.toggle('h',isPlaying);
        const muted=isMuted||currentVol===0;pmu.querySelector('svg').innerHTML=muted?MU:VM;pmu.style.color=muted?'#3b82f6':'';
        if(captureStream){if(isPlaying)pth.classList.add('h');else pth.classList.remove('h');}
        if(pvol&&pvol.value!=currentVol){pvol.value=currentVol;pvol.style.background='linear-gradient(to right,#3b82f6 '+currentVol+'%,rgba(255,255,255,.18) '+currentVol+'%)';}if(pvpct)pvpct.textContent=currentVol+'%';
      }catch(_){}
    }
    pipSync();_bgStartTimer(BG_TIMER_PIPMPROGR,400);mpProgressTimer=true;
    pipWin.addEventListener('pagehide',()=>{_bgStopTimer(BG_TIMER_PIPMPROGR);mpProgressTimer=null;stopCapture();pipWin=null;mpActive=false;});
    mpActive=true;
  }catch(err){console.warn('DocPiP:',err);stopCapture();showToast('PiP failed — using miniplayer');enterBrowserMiniplayer();}
}
function stopCapture(){if(captureRAF){cancelAnimationFrame(captureRAF);captureRAF=null;}if(captureStream){captureStream.getTracks().forEach(t=>t.stop());captureStream=null;}if(captureVideo){captureVideo.srcObject=null;captureVideo.remove();captureVideo=null;}captureCanvas=null;captureCtx=null;}

function enterBrowserMiniplayer(){
  if(!videoId)return;
  const mp=$('miniplayer');mpActive=true;mp.classList.add('active');
  const vw=window.innerWidth,vh=window.innerHeight;
  mp.style.width=Math.min(MP_W,vw-20)+'px';
  requestAnimationFrame(()=>{snapToCorner(vw-mp.offsetWidth-MP_M,vh-mp.offsetHeight-MP_M,false);});
  $('mpThumb').src=$('thumbnail').src;
  if(isPlaying)$('mpThumb').classList.add('hidden');else $('mpThumb').classList.remove('hidden');
}
function exitMiniplayer(){
  if(pipWin&&!pipWin.closed){pipWin.close();pipWin=null;}
  if(document.pictureInPictureElement)document.exitPictureInPicture().catch(()=>{});
  mpActive=false;$('miniplayer').classList.remove('active');
  _bgStopTimer(BG_TIMER_PIPMPROGR);mpProgressTimer=null;stopCapture();
}
function closeMiniplayer(){exitMiniplayer();try{player&&player.pauseVideo();}catch(e){}}
function snapToCorner(x,y,animate){const mp=$('miniplayer');const cx=x+mp.offsetWidth/2<window.innerWidth/2?MP_M:window.innerWidth-mp.offsetWidth-MP_M;const cy=y+mp.offsetHeight/2<window.innerHeight/2?MP_M:window.innerHeight-mp.offsetHeight-MP_M;if(animate){mp.classList.add('snapping');setTimeout(()=>mp.classList.remove('snapping'),300);}mp.style.left=cx+'px';mp.style.top=cy+'px';}
function getEvtXY(e){return e.touches?{x:e.touches[0].clientX,y:e.touches[0].clientY}:{x:e.clientX,y:e.clientY};}
if($('miniplayer')){$('miniplayer').addEventListener('mousedown',mpDragDown);$('miniplayer').addEventListener('touchstart',mpDragDown,{passive:false});}
function mpDragDown(e){if(e.target.closest('#mpControls')||e.target.closest('.mp-top-btn')||e.target.closest('#mpResize')||e.target.closest('.mp-btn')||e.target.closest('#mpBigPlay'))return;e.preventDefault();const mp=$('miniplayer'),{x,y}=getEvtXY(e);mpDragging=true;mp.classList.add('dragging');const rect=mp.getBoundingClientRect();mpDragOffset={x:x-rect.left,y:y-rect.top};window.addEventListener('mousemove',mpDragMove);window.addEventListener('mouseup',mpDragUp);window.addEventListener('touchmove',mpDragMove,{passive:false});window.addEventListener('touchend',mpDragUp);}
function mpDragMove(e){if(!mpDragging)return;e.preventDefault();const{x,y}=getEvtXY(e),mp=$('miniplayer');mp.style.left=Math.max(0,Math.min(window.innerWidth-mp.offsetWidth,x-mpDragOffset.x))+'px';mp.style.top=Math.max(0,Math.min(window.innerHeight-mp.offsetHeight,y-mpDragOffset.y))+'px';}
function mpDragUp(){if(!mpDragging)return;mpDragging=false;$('miniplayer').classList.remove('dragging');window.removeEventListener('mousemove',mpDragMove);window.removeEventListener('mouseup',mpDragUp);window.removeEventListener('touchmove',mpDragMove);window.removeEventListener('touchend',mpDragUp);const mp=$('miniplayer');snapToCorner(parseFloat(mp.style.left)||0,parseFloat(mp.style.top)||0,true);}
if($('mpResize')){$('mpResize').addEventListener('mousedown',mpResizeDown);$('mpResize').addEventListener('touchstart',mpResizeDown,{passive:false});}
function mpResizeDown(e){e.preventDefault();e.stopPropagation();const mp=$('miniplayer'),{x}=getEvtXY(e);mpResizing=true;mpResizeStart={x,w:mp.offsetWidth};window.addEventListener('mousemove',mpResizeMove);window.addEventListener('mouseup',mpResizeUp);window.addEventListener('touchmove',mpResizeMove,{passive:false});window.addEventListener('touchend',mpResizeUp);}
function mpResizeMove(e){if(!mpResizing)return;e.preventDefault();const{x}=getEvtXY(e),mp=$('miniplayer');mp.style.width=Math.max(MP_W_MIN,Math.min(MP_W_MAX,mpResizeStart.w+(x-mpResizeStart.x),window.innerWidth-MP_M*2))+'px';}
function mpResizeUp(){if(!mpResizing)return;mpResizing=false;window.removeEventListener('mousemove',mpResizeMove);window.removeEventListener('mouseup',mpResizeUp);window.removeEventListener('touchmove',mpResizeMove);window.removeEventListener('touchend',mpResizeUp);const mp=$('miniplayer');snapToCorner(parseFloat(mp.style.left)||0,parseFloat(mp.style.top)||0,true);}
window.addEventListener('resize',()=>{if(!mpActive||pipWin)return;const mp=$('miniplayer'),vw=window.innerWidth;if(vw<=480){mp.style.width=(vw-20)+'px';mp.style.left='10px';}snapToCorner(parseFloat(mp.style.left)||0,parseFloat(mp.style.top)||0,false);});
if($('mpSeekTrack')){$('mpSeekTrack').addEventListener('mousedown',mpSeekStart);$('mpSeekTrack').addEventListener('touchstart',mpSeekStart,{passive:true});}
function mpSeekStart(e){e.stopPropagation();mpSeekAt(e);const mm=ev=>mpSeekAt(ev);const mu=()=>{window.removeEventListener('mousemove',mm);window.removeEventListener('mouseup',mu);window.removeEventListener('touchmove',mm);window.removeEventListener('touchend',mu);};window.addEventListener('mousemove',mm);window.addEventListener('mouseup',mu);window.addEventListener('touchmove',mm,{passive:true});window.addEventListener('touchend',mu);}
function mpSeekAt(e){if(!player)return;const r=$('mpSeekTrack').getBoundingClientRect();const x=(e.touches?e.touches[0].clientX:e.clientX)-r.left;const pct=Math.max(0,Math.min(1,x/r.width));try{player.seekTo(pct*(player.getDuration()||0),true);$('mpSeekFill').style.width=(pct*100)+'%';}catch(_){}}

window.addEventListener('message', e => {
  const d = e.data;
  if(!d || typeof d !== 'object' || !d.cmd) return;
  const reply = (data) => { try{(e.source||window.parent).postMessage(data,'*');}catch(_){} };

  switch(d.cmd){
    case 'load':
      if(d.videoId){
        if(d.videoId !== videoId){ loadVideo(d.videoId, d.t||0); }
        else{ try{ player.seekTo(d.t||0,true); player.playVideo(); }catch(_){} }
      }
      return;
    case 'chapters':
    case 'setChapters':
      if(d.data !== undefined) document.getElementById('sbChap').className = "chap-label-visible"; setChapters(d.data);
      return;
    case 'seekTo':
      try{ if(player){ player.seekTo(d.t||0,true); player.playVideo(); } }catch(_){}
      return;
    case 'play':   player.playVideo(); return;
    case 'pause':  try{player&&player.pauseVideo();}catch(_){} return;
    case 'seek':   try{player&&player.seekTo(d.t||0,true);}catch(_){} return;
    case 'volume':
      currentVol=Math.max(0,Math.min(100,d.v||0));
      $('volBar').value=currentVol; onVolBar(currentVol); return;
    case 'speed':  setSpeed(d.r||1); return;
    case 'loop':   if(d.on!==undefined&&d.on!==loopEnabled)toggleLoop(); return;
    case 'getState': replyState(e.source||window.parent); return;
    
    case 'playlist':
      if(Array.isArray(d.tracks)){
        playlist=d.tracks.map(t=>({id:t.id||t,title:t.title||t.id||t}));
        plIdx=-1; plSyncControls();
      }
      return;
    case 'plAdd':
      if(d.id) plAddTrackDirect(d.id, d.title||'');
      return;
    case 'plNext': plNext(true); return;
    case 'plPrev': plPrev(); return;
    case 'plGoto': plGoto(d.index||0, true); return;
    case 'plClear': plClearAll(); return;
    case 'setAutoplay':
      if(d.on !== undefined && d.on !== autoplayEnabled) toggleAutoplay();
      return;
    case 'getAutoplay':
      reply({event:'autoplayChanged', autoplay:autoplayEnabled});
      return;
  }

  function qOne(sel){ try{return sel?document.querySelector(sel):null;}catch(_){return null;} }
  function qAll(sel){ try{return sel?[...document.querySelectorAll(sel)]:[];}catch(_){return[];} }
  function elInfo(el){
    if(!el)return null;
    const attrs={};
    [...el.attributes].forEach(a=>attrs[a.name]=a.value);
    return{id:el.id,tag:el.tagName,text:el.textContent?.trim(),html:el.innerHTML,
           value:el.value,attrs,class:el.className,
           style:el.getAttribute('style')||''};
  }

  switch(d.cmd){
    case 'getEl':{
      const el=qOne(d.selector);
      reply({event:'elResult',requestId:d.requestId,found:!!el,...(el?{el:elInfo(el)}:{})});
      break;}
    case 'getEls':{
      const els=qAll(d.selector);
      reply({event:'elsResult',requestId:d.requestId,items:els.map(elInfo)});
      break;}
    case 'setText':    qAll(d.selector).forEach(el=>el.textContent=d.text??''); break;
    case 'setHtml':    qAll(d.selector).forEach(el=>el.innerHTML=d.html??''); break;
    case 'setAttr':    qAll(d.selector).forEach(el=>el.setAttribute(d.attr,d.value??'')); break;
    case 'removeAttr': qAll(d.selector).forEach(el=>el.removeAttribute(d.attr)); break;
    case 'setStyle':   qAll(d.selector).forEach(el=>el.style[d.prop]=d.value??''); break;
    case 'addClass':   qAll(d.selector).forEach(el=>el.classList.add(...(d.cls||'').split(' '))); break;
    case 'removeClass':qAll(d.selector).forEach(el=>el.classList.remove(...(d.cls||'').split(' '))); break;
    case 'toggleClass':qAll(d.selector).forEach(el=>el.classList.toggle(d.cls)); break;
    case 'setValue':   qAll(d.selector).forEach(el=>{el.value=d.value??'';el.dispatchEvent(new Event('input',{bubbles:true}));}); break;
    case 'click':      qAll(d.selector).forEach(el=>el.click()); break;
    case 'focus':      {const el=qOne(d.selector);if(el)el.focus();break;}
    case 'remove':     qAll(d.selector).forEach(el=>el.remove()); break;
    case 'append':     qAll(d.selector).forEach(el=>{const t=document.createElement('template');t.innerHTML=d.html;el.appendChild(t.content.cloneNode(true));}); break;
    case 'prepend':    qAll(d.selector).forEach(el=>{const t=document.createElement('template');t.innerHTML=d.html;el.prepend(t.content.cloneNode(true));}); break;
    case 'insertBefore':qAll(d.selector).forEach(el=>{const t=document.createElement('template');t.innerHTML=d.html;el.parentNode?.insertBefore(t.content.cloneNode(true),el);}); break;
    case 'insertAfter': qAll(d.selector).forEach(el=>{const t=document.createElement('template');t.innerHTML=d.html;el.parentNode?.insertBefore(t.content.cloneNode(true),el.nextSibling);}); break;
    case 'replace':    qAll(d.selector).forEach(el=>{const t=document.createElement('template');t.innerHTML=d.html;el.replaceWith(t.content.cloneNode(true));}); break;
    case 'on':{
      const lid=d.listenerId||Math.random().toString(36).slice(2);
      const handler=ev=>{
        reply({event:'domEvent',listenerId:lid,type:ev.type,
               targetId:ev.target?.id,targetClass:ev.target?.className,
               value:ev.target?.value,text:ev.target?.textContent?.trim()});
      };
      qAll(d.selector).forEach(el=>el.addEventListener(d.event,handler));
      if(!window._pmListeners)window._pmListeners={};
      window._pmListeners[lid]={handler,selector:d.selector,event:d.event};
      reply({event:'onResult',listenerId:lid});
      break;}
    case 'off':{
      const entry=window._pmListeners?.[d.listenerId];
      if(entry) qAll(entry.selector).forEach(el=>el.removeEventListener(entry.event,entry.handler));
      delete window._pmListeners?.[d.listenerId];
      break;}
  }
});

function replyState(target){
  let cur=0, dur=0;
  try{ cur=player.getCurrentTime()||0; dur=player.getDuration()||0; }catch(_){}
  target.postMessage({
    event:'state',
    videoId, isPlaying, currentTime:cur, duration:dur,
    volume:currentVol, speed:currentSpeed, loop:loopEnabled,
    autoplay:autoplayEnabled
  }, '*');
}

const _origSetPlayIcon2 = setPlayIcon;
setPlayIcon = function(p){
  _origSetPlayIcon2(p);
  replyState(window.parent);
};

let autoplayEnabled = true;
/* Restore persisted autoplay preference */
try{ if(localStorage.getItem('watchAutoplayOff')==='1'){ autoplayEnabled=false; } } catch(_){}
function toggleAutoplay(){
  autoplayEnabled = !autoplayEnabled;
  const btn = $('autoplayBtn');
  if(btn){
    btn.textContent = 'Auto-play: '+(autoplayEnabled?'On':'Off');
    btn.classList.toggle('on', autoplayEnabled);
  }
  /* Persist so parent watch page can also respect it */
  try{ localStorage.setItem('watchAutoplayOff', autoplayEnabled ? '0' : '1'); } catch(_){}
  showToast('Auto-play '+(autoplayEnabled?'on':'off'));
  /* Notify parent so it can sync its own UI without localStorage access */
  try{ window.parent.postMessage({event:'autoplayChanged', autoplay:autoplayEnabled}, '*'); }catch(_){}
}

let playlist = [];       
let plIdx    = -1;       
let plAutoplay  = true;  
let plShuffle   = false;
let plRepeat    = false;
let plRepeatOne = false; // new: repeat single track

function plCycleRepeat(){
  if(!plRepeat && !plRepeatOne){ plRepeat=true; plRepeatOne=false; plShuffle=false; }
  else if(plRepeat && !plRepeatOne){ plRepeat=false; plRepeatOne=true; plShuffle=false; }
  else { plRepeat=false; plRepeatOne=false; }
  plSyncControls();
  const label = plRepeatOne ? 'Repeat: One' : plRepeat ? 'Repeat: All' : 'Repeat: Off';
  showToast(label);
}

function plToggleMode(mode){
  if(mode==='auto'){
    plAutoplay = !plAutoplay;
  } else if(mode==='shuffle'){
    plShuffle = !plShuffle;
    if(plShuffle) { plRepeat=false; plRepeatOne=false; }
  } else if(mode==='repeat'){
    plCycleRepeat(); return;
  }
}

function extractYtId(s){
  s=String(s).trim();
  const m=s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/)||s.match(/^([A-Za-z0-9_-]{11})$/);
  return m?m[1]:s;
}

function plAddTrackDirect(rawId, title){
  const id = extractYtId(rawId);
  playlist.push({id, title: title||id});
  plSyncControls();
  showToast('Added to queue: '+(title||id));
}

function plClearAll(){
  playlist=[]; plIdx=-1;
  plSyncControls();
  showToast('Queue cleared');
}

function plSyncControls(){
  const pb=$('plPrevBtn'), nb=$('plNextBtn'), rb=$('plRepeatBtn');
  if(pb) pb.style.display=playlist.length>1?'':'none';
  if(nb) nb.style.display=playlist.length>1?'':'none';
  if(rb){
    rb.style.display=playlist.length>0?'':'none';
    if(plRepeatOne){ rb.classList.add('on'); rb.title='Repeat: One'; rb.querySelector('svg').innerHTML='<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v5zm-4-2V9h-1l-2 1v1h1.5v4H13z"/>'; }
    else if(plRepeat){ rb.classList.add('on'); rb.title='Repeat: All'; rb.querySelector('svg').innerHTML='<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v5z"/>'; }
    else { rb.classList.remove('on'); rb.title='Repeat: Off'; rb.querySelector('svg').innerHTML='<path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v5z"/>'; }
  }
}

function plGoto(i, autoplay){
  if(i<0||i>=playlist.length) return;
  plIdx=i;
  const track=playlist[i];
  // Clear the bg-switching flag now — the new video is already loading.
  // visibilitychange must NOT call playVideo() on top of a freshly loading video.
  window._bgSwitching = false;
  loadVideo(track.id, 0);
  plSyncControls();
  
  try{window.parent.postMessage({event:'plTrack',index:i,track,total:playlist.length},'*');}catch(_){}
}

function plNext(autoplay){
  if(!playlist.length) return;
  if(plRepeatOne){ plGoto(plIdx>=0?plIdx:0, autoplay); return; }
  let next;
  if(plShuffle){
    next=Math.floor(Math.random()*playlist.length);
    if(playlist.length>1) while(next===plIdx) next=Math.floor(Math.random()*playlist.length);
  } else {
    next=plIdx+1;
    if(next>=playlist.length){
      if(plRepeat) next=0;
      else { showToast('End of queue'); return; }
    }
  }
  plGoto(next, autoplay);
}

function plPrev(){
  if(!playlist.length) return;
  
  let cur=0; try{cur=player?.getCurrentTime()||0;}catch(_){}
  if(cur>3){ try{player.seekTo(0,true);}catch(_){} return; }
  let prev=plIdx-1;
  if(prev<0) prev=plRepeat?playlist.length-1:0;
  plGoto(prev, true);
}

function plRemove(i){
  playlist.splice(i,1);
  if(plIdx>=playlist.length) plIdx=playlist.length-1;
  plSyncControls();
}

function escH(s){ return String(s).replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

const _origOnState = window.onYouTubeIframeAPIReady; 

(function(){
  const p=new URLSearchParams(location.search);
  const plParam=p.get('pl');
  if(plParam){
    const ids=plParam.split(',').map(s=>s.trim()).filter(Boolean);
    if(ids.length){
      playlist=ids.map(id=>({id,title:id}));
      plIdx=0;
      
      if(!window._autoId){
        window._autoId=ids[0];
        window._autoT=0;
      }
      setTimeout(()=>{ plSyncControls(); }, 100);
    }
  }
})();
