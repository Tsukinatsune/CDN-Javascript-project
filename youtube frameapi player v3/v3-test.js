(function(){

  
  var LS = {
    saveSettings : 'watchSaveSettings',
    saveProgress : 'watchSaveProgress',
    showResume   : 'watchShowResume',
    speed        : 'watchSpeed',
    cc           : 'watchCC',
    quality      : 'watchQuality',
    loop         : 'watchLoop',
    volume       : 'watchVolume',
    saveZones    : 'watchSaveLores',
  };

  function flag(key){ try{ return localStorage.getItem(key); }catch(_){ return null; } }
  function setFlag(key,val){ try{ localStorage.setItem(key,String(val)); }catch(_){} }

  function saveSettingsOn(){ return flag(LS.saveSettings)!=='0'; }
  function saveProgressOn(){ return flag(LS.saveProgress)==='1'; }
  function showResumeOn()  { return saveProgressOn(); }
  function saveZonesOn()   { return flag(LS.saveZones)   !=='0'; }

  
  function refreshOptionBtns(){
    var ss=document.getElementById('saveSettingsBtn');
    var sp=document.getElementById('saveProgressBtn');
    var sr=document.getElementById('showResumeBtn');
    if(ss){ ss.textContent='Save Settings: '+(saveSettingsOn()?'On':'Off'); ss.classList.toggle('on',saveSettingsOn()); }
    if(sp){ sp.textContent='Save Progress: '+(saveProgressOn()?'On':'Off'); sp.classList.toggle('on',saveProgressOn()); }
    var sz=document.getElementById('saveZonesBtn');
    if(sz){ sz.textContent='Save Lores: '+(saveZonesOn()?'On':'Off'); sz.classList.toggle('on',saveZonesOn()); }
  }
  window.toggleSaveSettings=function(){ setFlag(LS.saveSettings,saveSettingsOn()?'0':'1'); refreshOptionBtns(); };
  window.toggleSaveProgress=function(){ setFlag(LS.saveProgress,saveProgressOn()?'0':'1'); refreshOptionBtns(); };
  window.toggleShowResume  =function(){ setFlag(LS.showResume,  showResumeOn()  ?'0':'1'); refreshOptionBtns(); };
  window.toggleSaveZones   =function(){ setFlag(LS.saveZones,   saveZonesOn()   ?'0':'1'); refreshOptionBtns(); };

  

  
  function hookSpeed(){
    if(window._cwSpeedHooked) return;
    if(typeof window.setSpeed!=='function'){ setTimeout(hookSpeed,400); return; }
    window._cwSpeedHooked=true;
    var _prev=window.setSpeed;
    window.setSpeed=function(v){
      _prev.apply(this,arguments);
      if(saveSettingsOn()) setFlag(LS.speed, Math.round(v*100)/100);
    };
  }
  hookSpeed(); setTimeout(hookSpeed,600); setTimeout(hookSpeed,2000);

  
  function hookCC(){
    if(window._cwCCHooked) return;
    if(typeof window.setCC!=='function'){ setTimeout(hookCC,400); return; }
    window._cwCCHooked=true;
    var _prev=window.setCC;
    window.setCC=function(lang){
      _prev.apply(this,arguments);
      if(saveSettingsOn()) setFlag(LS.cc, lang||'off');
    };
  }
  hookCC(); setTimeout(hookCC,600); setTimeout(hookCC,2000);

  
  (function hookQuality(){
    var qMenu=document.getElementById('qualityMenu');
    if(!qMenu){ setTimeout(hookQuality,600); return; }
    qMenu.addEventListener('click',function(e){
      var btn=e.target.closest('button'); if(!btn) return;
      if(!saveSettingsOn()) return;
      var q=btn.getAttribute('data-q')||btn.getAttribute('data-quality')||btn.textContent.trim();
      if(q) setFlag(LS.quality, q);
    },true);
  })();

  
  function hookLoop(){
    if(window._cwLoopHooked) return;
    if(typeof window.toggleLoop!=='function'){ setTimeout(hookLoop,400); return; }
    window._cwLoopHooked=true;
    var _prev=window.toggleLoop;
    window.toggleLoop=function(){
      _prev.apply(this,arguments);
      if(!saveSettingsOn()) return;
      setTimeout(function(){
        var btn=document.getElementById('loopBtn');
        setFlag(LS.loop,(btn&&btn.classList.contains('on'))?'1':'0');
      },50);
    };
  }
  hookLoop(); setTimeout(hookLoop,600); setTimeout(hookLoop,2000);

  
  function hookVolume(){
    if(window._cwVolHooked) return;
    if(typeof window.onVolBar!=='function'){ setTimeout(hookVolume,400); return; }
    window._cwVolHooked=true;
    var _prev=window.onVolBar;
    window.onVolBar=function(v){
      _prev.apply(this,arguments);
      if(saveSettingsOn()) setFlag(LS.volume, Math.round(v));
    };
  }
  hookVolume(); setTimeout(hookVolume,600); setTimeout(hookVolume,2000);

  
  function restoreSettings(){
    if(!saveSettingsOn()) return;
    
    try{
      var vol=flag(LS.volume);
      if(vol!==null){
        var vv=parseFloat(vol);
        var vb=document.getElementById('volBar');
        if(vb){ vb.value=vv; }
        try{ if(typeof player!=='undefined'&&player.setVolume) player.setVolume(vv); }catch(_){}
        
        try{ if(typeof onVolBar==='function') onVolBar(vv); }catch(_){}
      }
    }catch(_){}
    
    setTimeout(function(){
      try{
        
        var spd=parseFloat(flag(LS.speed));
        if(spd>0&&typeof setSpeed==='function') setSpeed(spd);
        
        var cc=flag(LS.cc);
        if(cc&&typeof setCC==='function') setCC(cc);
        
        var q=flag(LS.quality);
        if(q){
          try{ if(typeof player!=='undefined'&&player.setPlaybackQuality) player.setPlaybackQuality(q); }catch(_){}
          
          document.querySelectorAll('#qualityMenu button').forEach(function(b){
            var bq=b.getAttribute('data-q')||b.getAttribute('data-quality')||b.textContent.trim();
            b.classList.toggle('on',bq===q);
          });
        }
        
        if(flag(LS.loop)==='1'){
          var lb=document.getElementById('loopBtn');
          if(lb&&!lb.classList.contains('on')&&typeof toggleLoop==='function') toggleLoop();
        }
      }catch(_){}
    },1800);
    
  }

  
  function getVideoId(){
    try{
      if(typeof player!=='undefined'&&player&&player.getVideoData){
        var vd=player.getVideoData(); if(vd&&vd.video_id) return vd.video_id;
      }
      var iframes=document.querySelectorAll('#ytPlayerContainer iframe');
      for(var i=0;i<iframes.length;i++){
        var m=(iframes[i].src||'').match(/[?&]v=([^&]+)/);
        if(m) return m[1];
      }
      
      try{
        if(typeof player!=='undefined'&&player&&player.getVideoUrl){
          var vu=player.getVideoUrl()||'';
          var mv=vu.match(/[?&]v=([^&]+)/);
          if(mv) return mv[1];
        }
      }catch(_){}
      
      try{
        var ml=window.location.search.match(/[?&]v=([^&]+)/);
        if(ml) return ml[1];
        var mh=window.location.hash.match(/[?&]v=([^&]+)/);
        if(mh) return mh[1];
      }catch(_){}
    }catch(_){}
    return null;
  }

  /* ── progress index: tracks up to MAX_PROG videos, evicts oldest ── */
  var MAX_PROG = 10;
  var PROG_IDX = 'watchProgressIndex'; /* JSON array of {id, ts} newest-first */

  function getProgIndex(){
    try{ var r=localStorage.getItem(PROG_IDX); return r?JSON.parse(r):[]; }catch(_){ return []; }
  }
  function setProgIndex(arr){
    try{ localStorage.setItem(PROG_IDX, JSON.stringify(arr)); }catch(_){}
  }
  function touchProgIndex(id){
    /* move id to front, evict beyond MAX_PROG */
    var idx=getProgIndex().filter(function(e){ return e.id!==id; });
    idx.unshift({id:id, ts:Date.now()});
    var evicted=idx.splice(MAX_PROG); /* keep only MAX_PROG */
    evicted.forEach(function(e){
      try{ localStorage.removeItem('watchPos_'+e.id); }catch(_){}
      try{ localStorage.removeItem('watchDur_'+e.id); }catch(_){}
    });
    setProgIndex(idx);
  }

  function saveProgress(){
    if(!saveProgressOn()) return;
    try{
      var id=getVideoId(); if(!id) return;
      var cur=0,dur=0;
      try{ cur=player.getCurrentTime(); }catch(_){}
      try{ dur=player.getDuration(); }catch(_){}
      if(!cur||cur<5) return;
      if(dur>30&&cur>dur-30) return;
      touchProgIndex(id);
      setFlag('watchPos_'+id, cur);
      setFlag('watchDur_'+id, dur);
    }catch(_){}
  }

  window.clearSavedProgress=function(){
    try{
      var id=getVideoId(); if(!id) return;
      localStorage.removeItem('watchPos_'+id);
      localStorage.removeItem('watchDur_'+id);
      /* remove from index too */
      var idx=getProgIndex().filter(function(e){ return e.id!==id; });
      setProgIndex(idx);
    }catch(_){}
  };
  
  

  var _progInterval=null;
  function startProgressTick(){
    if(_progInterval) return;
    _progInterval=setInterval(saveProgress,10000);
  }

  
  function isDefaultLoreState(){
    /* "default" = no zones AND global toggle is on (the factory default).
       Nothing worth persisting in this case. */
    var zones=window._skipZones||[];
    var globalOn=(window._skipGlobal!==false); /* default is true */
    return zones.length===0 && globalOn;
  }

  function saveZones(){
    if(!saveZonesOn()) return;
    try{
      var id=getVideoId();
      if(!id){
        /* no id yet — snapshot and retry once id is available */
        var snapshot=JSON.stringify(window._skipZones||[]);
        var globalSnap=!!window._skipGlobal;
        /* if nothing to save, don't bother retrying */
        if(isDefaultLoreState()) return;
        var _retries=0;
        (function retry(){
          var rid=getVideoId();
          if(rid){
            /* re-check at write time too */
            if(!isDefaultLoreState()){
              try{ localStorage.setItem('watchLores_'+rid, JSON.stringify({ lores: JSON.parse(snapshot), global: globalSnap })); }catch(_){}
            }
          } else if(++_retries<20){
            setTimeout(retry,500);
          }
        })();
        return;
      }
      /* if state is default, remove any stale entry and bail */
      if(isDefaultLoreState()){
        try{ localStorage.removeItem('watchLores_'+id); }catch(_){}
        return;
      }
      var data={ lores: window._skipZones||[], global: !!window._skipGlobal };
      localStorage.setItem('watchLores_'+id, JSON.stringify(data));
    }catch(_){}
  }

  function restoreZones(){
    if(!saveZonesOn()) return;
    var id=getVideoId();
    if(!id){
      
      if((restoreZones._tries=(restoreZones._tries||0)+1) < 30){
        setTimeout(restoreZones, 500);
      }
      return;
    }
    restoreZones._tries=0;
    try{
      var raw=localStorage.getItem('watchLores_'+id); if(!raw) return;
      var data=JSON.parse(raw);

      /* if the stored value is the default {lores:[],global:true}, clean it up and bail */
      var saved=data.lores||data.zones||[];
      if(saved.length===0 && data.global!==false){
        try{ localStorage.removeItem('watchLores_'+id); }catch(_){}
        return;
      }
      if(saved.length){
        
        var existing=(window._skipZones||[]).map(function(z){ return z.id; });
        saved.forEach(function(z){
          if(existing.indexOf(z.id)===-1) window._skipZones.push(z);
        });
        
        try{
          window._skipZones.forEach(function(z){
            var m=z.id&&z.id.match(/^sz(\d+)$/);
            if(m){ var n=parseInt(m[1],10); if(n>window._smIdCtr) window._smIdCtr=n; }
          });
        }catch(_){}
        
        window._skipZones.forEach(function(z){
          z._loopsDone=0; z._atEndBoundary=false; z._finalPass=false; z._done=false;
          if(z.type==='pause') z._pauseFired=false;
        });
      }
      if(typeof data.global==='boolean'){
        window._skipGlobal=data.global;
        var gt=document.getElementById('skipGlobalToggle');
        if(gt){ gt.classList.toggle('on',data.global); gt.textContent=(data.global?'All Lores — On':'All Lores — Off'); }
      }
      
      if(window._barBuild) window._barBuild();
      if(window._dirtyBarKey) window._dirtyBarKey();
      
      try{
        var inner=document.getElementById('smListInner');
        if(inner&&typeof renderList==='function') renderList();
      }catch(_){}
    }catch(_){}
  }

  
  window._restoreZonesReady = restoreZones;

  window.clearSavedZones=function(){
    try{
      var id=getVideoId(); if(!id) return;
      localStorage.removeItem('watchLores_'+id);
    }catch(_){}
  };

  
  function hookZoneSave(){
    if(window._cwZoneHooked) return;
    if(typeof window.smDone!=='function'){ setTimeout(hookZoneSave,400); return; }
    window._cwZoneHooked=true;
    var _prev=window.smDone;
    window.smDone=function(){
      _prev.apply(this,arguments);
      setTimeout(saveZones,80); 
    };
    
    if(typeof window.renderList==='function'){
      var _prevRL=window.renderList;
      window.renderList=function(){
        _prevRL.apply(this,arguments);
        setTimeout(saveZones,80);
      };
    }
    
    var _origGT=window.skipToggleGlobal;
    if(typeof _origGT==='function'){
      window.skipToggleGlobal=function(){
        _origGT.apply(this,arguments);
        setTimeout(saveZones,80);
      };
    }
    
    
    if(typeof window.rebuildBar==='undefined'){
      
      var _prevBB=window._barBuild;
      if(typeof _prevBB==='function'){
        window._barBuild=function(){
          _prevBB.apply(this,arguments);
          setTimeout(saveZones,80);
        };
      }
    }
  }
  hookZoneSave();
  setTimeout(hookZoneSave,600);
  setTimeout(hookZoneSave,2000);

  
  function fmt(s){ s=Math.floor(s||0); var h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=s%60; if(h) return h+':'+String(m).padStart(2,'0')+':'+String(ss).padStart(2,'0'); return m+':'+String(ss).padStart(2,'0'); }

  var _cwPos=0;
  var _cwCountTimer=null;
  var _cwCountTotal=15;
  function showCWModal(pos,dur){
    _cwPos=pos;
    var modal=document.getElementById('cwModal'); if(!modal) return;
    var lbl=document.getElementById('cwTime');
    if(lbl) lbl.textContent='You were at '+fmt(pos)+(dur>0?' of '+fmt(dur):'');
    
    try{ player.pauseVideo(); }catch(_){}
    modal.style.display='flex';
    var cover=document.getElementById('iframeCover'); if(cover) cover.style.display='block';
    
    var iframe=document.querySelector('#ytPlayerContainer iframe'); if(iframe) iframe.style.visibility='hidden';
    
    _startCwCountdown();
  }
  function hideCWModal(){
    var m=document.getElementById('cwModal'); if(m) m.style.display='none';
    var cover=document.getElementById('iframeCover'); if(cover) cover.style.display='none';
    var iframe=document.querySelector('#ytPlayerContainer iframe'); if(iframe) iframe.style.visibility='visible';
    _stopCwCountdown();
  }
  function _stopCwCountdown(){
    if(_cwCountTimer){ clearInterval(_cwCountTimer); _cwCountTimer=null; }
  }
  function _startCwCountdown(){
    _stopCwCountdown();
    var total=_cwCountTotal;
    var left=total;
    var ring=document.getElementById('cwCountRing');
    var num=document.getElementById('cwCountNum');
    var circum=138.2;
    function tick(){
      if(num) num.textContent=left;
      if(ring) ring.style.strokeDashoffset=String(circum*(1-(left/total)));
      if(left<=0){ _stopCwCountdown(); cwStart(); return; }
      left--;
    }
    tick();
    _cwCountTimer=setInterval(tick,1000);
  }

  

  
  var _cwBlocking=false;
  var _cwPlayPending=false;
  var _origPlayVideo=null;

  function _installPlayGate(){
    if(!player||typeof player.playVideo!=='function'||player.__cwGated) return;
    player.__cwGated=true;
    _origPlayVideo=player.playVideo.bind(player);
    player.playVideo=function(){
      if(_cwBlocking){ _cwPlayPending=true; return; }
      _origPlayVideo();
    };
  }

  function _releasePlayGate(andPlay){
    _cwBlocking=false;
    
    if(_origPlayVideo&&player){ player.playVideo=_origPlayVideo; _origPlayVideo=null; }
    if(andPlay||_cwPlayPending){ _cwPlayPending=false; try{ player.playVideo(); }catch(_){} }
  }

  function checkResume(){
    if(!saveProgressOn()||!showResumeOn()){
      _releasePlayGate(true);
      return;
    }
    var id=getVideoId(); if(!id){ _releasePlayGate(true); return; }
    try{
      var pos=parseFloat(localStorage.getItem('watchPos_'+id));
      var dur=parseFloat(localStorage.getItem('watchDur_'+id)||'0');
      if(!pos||pos<5){ _releasePlayGate(true); return; }
      if(dur>30&&pos>dur-30){ clearSavedProgress(); _releasePlayGate(true); return; }
      showCWModal(pos,dur);
    }catch(_){ _releasePlayGate(false); }
  }

  
  var _origCwResume=window.cwResume;
  window.cwResume=function(){
    hideCWModal();
    _releasePlayGate(false); 
    setTimeout(function(){
      try{ player.seekTo(_cwPos,true); }catch(_){}
      try{ player.playVideo(); }catch(_){}
    },400);
  };
  var _origCwStart=window.cwStart;
  window.cwStart=function(){
    hideCWModal();
    clearSavedProgress();
    _releasePlayGate(false); 
    setTimeout(function(){
      try{ player.seekTo(0,true); }catch(_){}
      try{ player.playVideo(); }catch(_){}
    },400);
  };
  

  
  (function hookReady(){
    var _origReady=null;
    function tryHookReady(){
      if(typeof window.onPlayerReady==='function'&&!window._cwHookedReady){
        window._cwHookedReady=true;
        _origReady=window.onPlayerReady;
        window.onPlayerReady=function(e){
          if(_origReady) _origReady.apply(this,arguments);
          restoreSettings();
          
          if(saveProgressOn()&&showResumeOn()){
            _cwBlocking=true;
            _installPlayGate();
            try{ player.pauseVideo(); }catch(_){}
          }
          setTimeout(checkResume,600);
          startProgressTick();
        };
      } else if(!window._cwHookedReady){
        setTimeout(tryHookReady,300);
      }
    }
    tryHookReady();
    
    setTimeout(function(){
      if(!window._cwHookedReady){
        restoreSettings();
        if(saveProgressOn()&&showResumeOn()){
          _cwBlocking=true;
          _installPlayGate();
          try{ player.pauseVideo(); }catch(_){}
        }
        setTimeout(checkResume,600);
        startProgressTick();
      }
    },3500);
  })();

  refreshOptionBtns();

})();




(function(){
  var _live = false;
  window._isLiveStream = false;

  
  function checkDuration(){
    try{
      if(typeof player==='undefined'||!player||!player.getDuration) return null;
      var d = player.getDuration();
      if(d===Infinity || d!==d || d<=0) return true; 
      if(d > 86400*2) return true; 
      return false;
    }catch(e){ return null; }
  }

  
  function checkVideoData(){
    try{
      if(typeof player==='undefined'||!player||!player.getVideoData) return null;
      var vd = player.getVideoData();
      if(!vd) return null;
      if(vd.isLive===true) return true;
      if(vd.isLive===false) return false;
      
      if(vd.live_broadcast_content==='live') return true;
      if(vd.live_broadcast_content==='none') return false;
      return null;
    }catch(e){ return null; }
  }

  
  function checkURL(){
    try{
      
      var iframes = document.querySelectorAll('#ytPlayerContainer iframe');
      for(var i=0;i<iframes.length;i++){
        var src = iframes[i].src||'';
        if(/\/live\b/i.test(src)) return true;
        if(/live=1/i.test(src)) return true;
      }
      
      if(typeof player!=='undefined'&&player&&player.getVideoUrl){
        var url = player.getVideoUrl()||'';
        if(/\/live\b/i.test(url)) return true;
      }
      return null;
    }catch(e){ return null; }
  }

  
  function checkTimeDisplay(){
    try{
      var el = document.getElementById('timeDisplay');
      if(!el) return null;
      var t = el.textContent||'';
      if(/\bLIVE\b/i.test(t)) return true;
      
      if(t.trim()&&t.indexOf('/')===-1&&t.indexOf('--')===0) return null; 
      return null;
    }catch(e){ return null; }
  }

  
  var _stateChecks = 0;
  function checkPlayerState(){
    try{
      if(typeof player==='undefined'||!player||!player.getPlayerState) return null;
      var st = player.getPlayerState();
      
      if((st===1||st===3)&&_stateChecks>3){
        var d2 = checkDuration();
        if(d2===true) return true;
        
        if(typeof player.getDuration==='function'){
          var dur = player.getDuration();
          if(dur===Infinity||dur!==dur) return true;
        }
      }
      _stateChecks++;
      return null;
    }catch(e){ return null; }
  }

  
  function detectLive(){
    
    var signals = [checkVideoData(), checkDuration(), checkURL(), checkTimeDisplay(), checkPlayerState()];
    var trueCount=0, falseCount=0;
    for(var i=0;i<signals.length;i++){
      if(signals[i]===true) trueCount++;
      else if(signals[i]===false) falseCount++;
    }
    
    if(trueCount>0) return true;
    if(falseCount>0&&trueCount===0) return false;
    return _live; 
  }

  
  function setLive(live){
    if(_live===live) return;
    _live=live;
    window._isLiveStream=live;

    
    

    
    var seekFill=document.getElementById('seekFill');
    var seekTrack=document.getElementById('seekTrack');
    if(live){
      if(seekFill) seekFill.setAttribute('data-live-locked','1');
      if(seekTrack) seekTrack.classList.add('is-live');
      
      if(!seekTrack._liveClickBlocker){
        seekTrack._liveClickBlocker = function(e){
          if(!window._isLiveStream) return;
          e.stopImmediatePropagation();
          e.preventDefault();
        };
        seekTrack.addEventListener('mousedown',  seekTrack._liveClickBlocker, true);
        seekTrack.addEventListener('pointerdown',seekTrack._liveClickBlocker, true);
        seekTrack.addEventListener('touchstart', seekTrack._liveClickBlocker, {capture:true, passive:false});
        seekTrack.addEventListener('click',      seekTrack._liveClickBlocker, true);
      }
      
      if(!seekTrack._liveMoveHandler){
        seekTrack._liveMoveHandler = function(e){
          if(!window._isLiveStream) return;
          var r=seekTrack.getBoundingClientRect();
          var frac=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
          var cur=0; try{ if(typeof player!=='undefined'&&player&&player.getCurrentTime) cur=player.getCurrentTime(); }catch(_){}
          var t=Math.round(frac*cur);
          var h=Math.floor(t/3600),m=Math.floor((t%3600)/60),s=t%60;
          var str=(h>0?h+':':'')+(h>0?String(m).padStart(2,'0'):m)+':'+String(s).padStart(2,'0');
          var tip=document.getElementById('seekTooltip'), sb=document.getElementById('sbTime');
          if(sb) sb.textContent=str;
          if(tip){ tip.classList.add('visible'); tip.style.left=Math.round(frac*r.width)+'px'; }
        };
        seekTrack._liveLeaveHandler = function(){ if(!window._isLiveStream) return; var tip=document.getElementById('seekTooltip'); if(tip) tip.classList.remove('visible'); };
        seekTrack.addEventListener('mousemove', seekTrack._liveMoveHandler);
        seekTrack.addEventListener('mouseleave', seekTrack._liveLeaveHandler);
      }
    } else {
      if(seekFill){ seekFill.style.width=''; seekFill.removeAttribute('data-live-locked'); }
      if(seekTrack){
        seekTrack.classList.remove('is-live');
        if(seekTrack._liveClickBlocker){
          seekTrack.removeEventListener('mousedown',  seekTrack._liveClickBlocker, true);
          seekTrack.removeEventListener('pointerdown',seekTrack._liveClickBlocker, true);
          seekTrack.removeEventListener('touchstart', seekTrack._liveClickBlocker, true);
          seekTrack.removeEventListener('click',      seekTrack._liveClickBlocker, true);
          seekTrack._liveClickBlocker=null;
        }
      }
    }

    
    var td=document.getElementById('timeDisplay');
    if(td){
      if(live){
        td.setAttribute('data-live-saved',td.textContent);
        td.textContent='Live';
        td.style.color='#ffffff';
        td.style.fontWeight='700';
        td.style.letterSpacing='.06em';
      } else {
        var saved=td.getAttribute('data-live-saved');
        if(saved) td.textContent=saved;
        td.style.color='';
        td.style.fontWeight='';
        td.style.letterSpacing='';
      }
    }

    
    var manageBtn=document.querySelector('#settingsMenu button[onclick*="openSkipModal"]');
    if(manageBtn){
      manageBtn.classList.toggle('zone-disabled',live);
      manageBtn.title=live?'Not available for live streams':'';
    }

    
    if(live){
      var bar=document.getElementById('skipMarkBar');
      if(bar&&bar.classList.contains('smActive')) bar.classList.remove('smActive');
    }
  }

  function checkAndApply(){
    var result=detectLive();
    if(result!==_live) setLive(result);
    
  }

  
  setInterval(checkAndApply, 2000);
  
  setTimeout(checkAndApply, 800);
  setTimeout(checkAndApply, 2000);
  setTimeout(checkAndApply, 4000);

  
  (function tryHook(){
    if(typeof window.onPlayerStateChange==='function'){
      var _orig=window.onPlayerStateChange;
      window.onPlayerStateChange=function(e){
        _orig.apply(this,arguments);
        _stateChecks=0;
        setTimeout(checkAndApply,300);
        setTimeout(checkAndApply,1200);
      };
    } else { setTimeout(tryHook,400); }
  })();

  
  (function tryGate(){
    if(typeof window.openWatchMark==='function'&&typeof window.openSkipModal==='function'){
      var _owm=window.openWatchMark;
      window.openWatchMark=function(){
        if(window._isLiveStream){ if(window.showToast) showToast('Lores are not available for live streams'); return; }
        _owm.apply(this,arguments);
      };
      var _osm=window.openSkipModal;
      window.openSkipModal=function(){
        if(window._isLiveStream){ if(window.showToast) showToast('Lores are not available for live streams'); return; }
        _osm.apply(this,arguments);
      };
    } else { setTimeout(tryGate,400); }
  })();

  
  (function tryGateZone(){
    if(typeof window._checkSkipZones==='function'){
      var _orig=window._checkSkipZones;
      window._checkSkipZones=function(cur){
        if(window._isLiveStream) return;
        _orig.apply(this,arguments);
      };
    } else { setTimeout(tryGateZone,400); }
  })();

  
  (function tryGateBar(){
    if(typeof window._barBuild==='function'){
      var _origBar=window._barBuild;
      window._barBuild=function(){
        if(window._isLiveStream) return;
        _origBar.apply(this,arguments);
      };
    } else { setTimeout(tryGateBar,400); }
  })();

  
  (function(){
    var el=document.getElementById('timeDisplay');
    if(!el||typeof MutationObserver==='undefined') return;
    var obs=new MutationObserver(function(){
      var t=(el.textContent||'').toUpperCase();
      if(t.indexOf('LIVE')!==-1) setLive(true);
      
      if(_live && el.textContent!=='Live'){
        el.textContent='Live';
        el.style.color='#ffffff';
        el.style.fontWeight='700';
        el.style.letterSpacing='.06em';
      }
    });
    obs.observe(el,{childList:true,characterData:true,subtree:true});
  })();

  
  (function tryPatchFills(){
    if(typeof window._abUpdateFills==='function'&&!window._abUpdateFills_orig){
      window._abUpdateFills_orig=window._abUpdateFills;
      window._abUpdateFills=function(pct){ if(window._isLiveStream){ var sf=document.getElementById('seekFill'); if(sf) sf.style.width='100%'; return; } window._abUpdateFills_orig(pct); };
    } else if(!window._abUpdateFills){ setTimeout(tryPatchFills,300); }
  })();
})();




(function patchPauseUntil(){
  
  function tryPatch(){
    if(typeof window.switchAsTab !== 'function'){ setTimeout(tryPatch, 200); return; }
    var _origSwitch = window.switchAsTab;
    window.switchAsTab = function(tab){
      
      var pu = document.getElementById('asPauseUntilPanel');
      var vp = document.getElementById('asVideoPanel');
      var tp = document.getElementById('asTimerPanel');
      var cp = document.getElementById('asClockPanel');
      var tabs = ['tabTimer','tabClock','tabVideo','tabPauseUntil'];
      if(tab === 'pauseuntil'){
        
        if(tp){ tp.classList.remove('show'); tp.style.display='none'; }
        if(cp){ cp.classList.remove('show'); cp.style.display='none'; }
        if(vp) vp.style.display='none';
        if(pu) pu.style.display='flex';
        tabs.forEach(function(id){
          var b=document.getElementById(id);
          if(b) b.classList.toggle('on', id==='tabPauseUntil');
        });
        updatePauseUntilHint();
      } else {
        if(pu) pu.style.display='none';
        _origSwitch.call(this, tab);
        
        var btn=document.getElementById('tabPauseUntil');
        if(btn) btn.classList.remove('on');
      }
    };

    
    var _origApply = window.applyAsModal;
    window.applyAsModal = function(){
      var tabPU = document.getElementById('tabPauseUntil');
      if(tabPU && tabPU.classList.contains('on')){
        applyPauseUntil();
      } else {
        _origApply.apply(this, arguments);
      }
    };
  }
  tryPatch();

  function getNowUTC(){
    var n=new Date();
    return { h:n.getUTCHours(), m:n.getUTCMinutes(), s:n.getUTCSeconds() };
  }
  function updatePauseUntilHint(){
    var hint=document.getElementById('asPauseUntilHint'); if(!hint) return;
    var now=getNowUTC();
    hint.textContent='Current GMT time: '+pad(now.h)+':'+pad(now.m)+':'+pad(now.s)+' — video will pause at the GMT time you set';
  }
  function pad(n){ return String(n).padStart(2,'0'); }

  
  setInterval(function(){
    var pu=document.getElementById('asPauseUntilPanel');
    if(pu && pu.style.display==='flex') updatePauseUntilHint();
  }, 1000);

  var _puTimer=null;
  function applyPauseUntil(){
    var h=parseInt(document.getElementById('asPUHourIn').value)||0;
    var m=parseInt(document.getElementById('asPUMinIn').value)||0;
    var s=parseInt(document.getElementById('asPUSecIn').value)||0;
    h=Math.max(0,Math.min(23,h)); m=Math.max(0,Math.min(59,m)); s=Math.max(0,Math.min(59,s));

    
    var now=new Date();
    var target=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate(),h,m,s));
    if(target<=now) target.setUTCDate(target.getUTCDate()+1); 
    var msLeft=target-now;

    clearPauseUntilTimer();
    _puTimer=setTimeout(function(){
      _puTimer=null;
      try{ player.pauseVideo(); }catch(_){}
      if(window.showToast) showToast('Paused — it\'s '+pad(h)+':'+pad(m)+':'+pad(s)+' GMT');
      clearAutoStopBadge();
    }, msLeft);

    
    startPauseUntilBadge(h,m,s,target);
    if(typeof closeAsModal==='function') closeAsModal();
    if(window.showToast) showToast('Pausing at '+pad(h)+':'+pad(m)+':'+pad(s)+' GMT');
  }

  function clearPauseUntilTimer(){
    if(_puTimer){ clearTimeout(_puTimer); _puTimer=null; }
    if(_puBadgeInterval){ clearInterval(_puBadgeInterval); _puBadgeInterval=null; }
  }

  var _puBadgeInterval=null;
  function startPauseUntilBadge(h,m,s,target){
    var badge=document.getElementById('asBadge'), lbl=document.getElementById('asLabel');
    if(!badge||!lbl) return;
    badge.classList.add('visible');
    
    badge._puClear=function(){ clearPauseUntilTimer(); clearAutoStopBadge(); };
    badge.onclick=badge._puClear;
    function tick(){
      var msLeft=target-new Date();
      if(msLeft<=0){ lbl.textContent='PAUSING…'; return; }
      var totalS=Math.ceil(msLeft/1000);
      var hh=Math.floor(totalS/3600), mm=Math.floor((totalS%3600)/60), ss=totalS%60;
      lbl.textContent='PAUSE AT '+pad(h)+':'+pad(m)+':'+pad(s)+' GMT  (in '+pad(hh)+':'+pad(mm)+':'+pad(ss)+')';
    }
    tick();
    _puBadgeInterval=setInterval(tick,1000);
  }

  function clearAutoStopBadge(){
    var badge=document.getElementById('asBadge'), lbl=document.getElementById('asLabel');
    if(badge) badge.classList.remove('visible');
    if(lbl) lbl.textContent='STOP IN --:--';
    if(_puBadgeInterval){ clearInterval(_puBadgeInterval); _puBadgeInterval=null; }
  }

  
  (function tryPatchClear(){
    if(typeof window.clearAutoStop!=='function'){ setTimeout(tryPatchClear,300); return; }
    var _origClear=window.clearAutoStop;
    window.clearAutoStop=function(){
      clearPauseUntilTimer();
      _origClear.apply(this,arguments);
    };
  })();
})();




(function(){
  
  function _fallbackSetSpeed(v){
    v=Math.round(v*100)/100;
    try{ if(typeof player!=='undefined') player.setPlaybackRate(v); }catch(_){}
    if(window.syncSpeedUI) window.syncSpeedUI(v);
  }

  var _orig=null, _wrapped=false;
  function tryWrap(){
    
    if(_wrapped) return;
    if(typeof window.setSpeed==='function'){
      _orig=window.setSpeed;
      _wrapped=true;
      window.setSpeed=function(v){
        
        if(window._setUserOverrideSpd){
          var zones=window._skipZones||[];
          var cur=0; try{ if(typeof player!=='undefined'&&player.getCurrentTime) cur=player.getCurrentTime(); }catch(_){}
          var inZone=zones.some(function(z){
            return z.enabled&&(z.type==='spd'||(z.type==='combo'&&z.spd!=null))&&cur>=z.start&&cur<z.end;
          });
          window._setUserOverrideSpd(inZone);
        }
        
        if(_orig) _orig.apply(this,arguments); else _fallbackSetSpeed(v);
        if(window.syncSpeedUI) window.syncSpeedUI(v);
      };
    }
  }
  
  tryWrap();
  setTimeout(tryWrap,500);
  setTimeout(tryWrap,1500);
  
  setTimeout(function(){
    if(typeof window.setSpeed!=='function') window.setSpeed=_fallbackSetSpeed;
  },3000);
})();



(function(){
  try{
    const off=localStorage.getItem('watchAutoplayOff')==='1';
    const btn=document.getElementById('autoplayBtn');
    if(btn){ btn.textContent='Auto-play: '+(off?'Off':'On'); btn.classList.toggle('on',!off); }
  }catch(_){}
})();

(function(){
  function lock(){ try{ if(screen.orientation&&screen.orientation.lock) screen.orientation.lock('landscape').catch(function(){}); else if(window.screen.lockOrientation) window.screen.lockOrientation('landscape'); }catch(e){} }
  function unlock(){ try{ if(screen.orientation&&screen.orientation.unlock) screen.orientation.unlock(); else if(window.screen.unlockOrientation) window.screen.unlockOrientation(); }catch(e){} }
  document.addEventListener('fullscreenchange',function(){ if(document.fullscreenElement) lock(); else unlock(); });
  document.addEventListener('webkitfullscreenchange',function(){ if(document.fullscreenElement||document.webkitFullscreenElement) lock(); else unlock(); });
})();

window.resizeVideo=function(){
  var c=document.getElementById('ytPlayerContainer'); if(!c) return;
  var fsEl=document.fullscreenElement||document.webkitFullscreenElement||document.mozFullScreenElement;
  if(fsEl){
    var vw=window.innerWidth||fsEl.clientWidth, vh=window.innerHeight||fsEl.clientHeight, w,h;
    if(vw/vh>16/9){ h=vh; w=Math.round(vh*16/9); } else { w=vw; h=Math.round(vw*9/16); }
    c.style.cssText='position:absolute;width:'+w+'px;height:'+h+'px;left:50%;top:50%;transform:translate(-50%,-50%)';
  } else {
    c.style.cssText='position:absolute;width:100%;height:100%;left:0;top:0;transform:none';
  }
};

(function(){
  var fsBtn=document.getElementById('fsBtn'), fsIcon=document.getElementById('fsIcon');
  if(!fsBtn||!fsIcon) return;
  fsBtn.removeAttribute('onclick');
  fsBtn.addEventListener('click',function(e){
    e.stopPropagation();
    var fsEl=document.fullscreenElement||document.webkitFullscreenElement;
    if(!fsEl){ var rqEl=document.documentElement; var rq=rqEl.requestFullscreen||rqEl.webkitRequestFullscreen||rqEl.mozRequestFullScreen; if(rq) rq.call(rqEl); fsIcon.innerHTML='<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>'; }
    else { var ex=document.exitFullscreen||document.webkitExitFullscreen||document.mozCancelFullScreen; if(ex) ex.call(document); fsIcon.innerHTML='<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>'; }
  });
  document.addEventListener('fullscreenchange',function(){
    var f=document.fullscreenElement||document.webkitFullscreenElement;
    fsIcon.innerHTML=f?'<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>':'<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>';
    window.resizeVideo();
    
    var bar=document.getElementById('skipMarkBar');
    var smBtn=document.getElementById('smFsBtn');
    if(bar){
      if(f){
        
        if(!bar._fsPrevParent){
          bar._fsPrevParent=bar.parentNode;
          bar._fsPrevNext=bar.nextSibling;
          f.appendChild(bar);
        }
        bar.classList.add('smFs');
        if(smBtn){ smBtn.classList.add('smFsOn'); smBtn.textContent='Exit FS'; smBtn.title='Exit Fullscreen'; }
      } else {
        
        if(bar._fsPrevParent){
          if(bar._fsPrevNext) bar._fsPrevParent.insertBefore(bar,bar._fsPrevNext);
          else bar._fsPrevParent.appendChild(bar);
          bar._fsPrevParent=null; bar._fsPrevNext=null;
        }
        bar.classList.remove('smFs');
        if(smBtn){ smBtn.classList.remove('smFsOn'); smBtn.textContent='⛶'; smBtn.title='Fullscreen'; }
      }
    }
  });
})();




(function(){
  var H=2;
  function getDur(){ try{ if(player&&player.getDuration){ var d=player.getDuration(); if(d>0) return d; } }catch(e){} return 0; }
  var _builtKey='';
  function makeKey(dur){
    if(!dur) return 'none';
    var c=(window._barChapPcts||[]).map(function(p){ return Math.round(p*100); }).join(',');
    var s=(window._skipZones||[]).filter(function(z){ return z.enabled&&z.type!=='pause'; }).map(function(z){ return Math.round(z.start/dur*10000)+'-'+Math.round(z.end/dur*10000)+(z.hideLabel?'L':'')+(z.hideHighlight?'H':''); }).join(',');
    var p=(window._skipZones||[]).filter(function(z){ return z.enabled&&z.type==='pause'; }).map(function(z){ return 'p'+Math.round(z.position/dur*10000); }).join(',');
    if(!c&&!s&&!p) return 'none';
    return c+'|'+s+'|'+p;
  }
  window._barBuild=function(){
    var track=document.getElementById('seekTrack'), fill=document.getElementById('seekFill');
    if(!track||!fill) return;
    var dur=getDur(), key=makeKey(dur);
    if(key===_builtKey) return;
    _builtKey=key;
    track.querySelectorAll('.bar-seg,.bar-fill,.bar-skip-label,.bar-pause-label').forEach(function(e){ e.remove(); });
    track.querySelectorAll('.ab-seg,.ab-fill,.seek-chap-seg,.seek-chap-fill,.seek-chapter-gap').forEach(function(e){ e.remove(); });
    fill.classList.remove('bar-hidden'); track.classList.remove('bar-active');
    track._abProgress=null; track._chapProgress=null;
    if(key==='none') return;
    var pts=[0];
    (window._barChapPcts||[]).forEach(function(p){ if(p>0&&p<100) pts.push(p); });
    function addPt(pct){ for(var i=0;i<pts.length;i++){ if(Math.abs(pts[i]-pct)<0.2) return; } pts.push(pct); }
    (window._skipZones||[]).forEach(function(z){
      if(!z.enabled) return;
      if(z.type==='pause'){ if(z.position!=null) addPt(z.position/dur*100); }
      else { addPt(z.start/dur*100); addPt(z.end/dur*100); }
    });
    pts.push(100); pts.sort(function(a,b){ return a-b; });
    var clean=[pts[0]];
    for(var i=1;i<pts.length;i++){ if(pts[i]-clean[clean.length-1]>0.05) clean.push(pts[i]); }
    pts=clean;
    fill.classList.add('bar-hidden'); track.classList.add('bar-active');
    var colorMap={ skip:'rgba(239,68,68,0.7)', vol:'rgba(59,130,246,0.6)', spd:'rgba(59,130,246,0.6)', loop:'rgba(59,130,246,0.6)', combo:'rgba(59,130,246,0.6)' };
    var zoneRanges=(window._skipZones||[]).filter(function(z){ return z.enabled&&z.type!=='pause'; }).map(function(z){
      return { id:z.id, s:z.start/dur*100, e:z.end/dur*100, type:z.type||'skip', spd:z.spd, vol:z.vol, loopCount:z.loopCount, label:z.label, hideLabel:z.hideLabel||false, hideHighlight:z.hideHighlight||false, labelPlaced:false };
    });
    function zoneAt(m){ for(var i=0;i<zoneRanges.length;i++){ var r=zoneRanges[i]; if(m>=r.s&&m<r.e) return r; } return null; }
    track._zoneSeg=[]; var fills=[];
    for(var i=0;i<pts.length-1;i++){
      var s=pts[i],e=pts[i+1], gL=i>0?H:0, gR=i<pts.length-2?H:0;
      var left=gL===0?s+'%':'calc('+s+'% + '+gL+'px)';
      var width='calc('+(e-s)+'% - '+(gL+gR)+'px)';
      var zr=zoneAt((s+e)/2), seg=document.createElement('div');
      seg.className='bar-seg'; seg.style.cssText='left:'+left+';width:'+width;
      if(zr){
        var isSkip=(zr.type==='skip');
        if(isSkip&&!zr.hideHighlight){ seg.style.background=colorMap.skip; seg.style.opacity='1'; seg.style.zIndex='4'; }
        else if(!isSkip){ track._zoneSeg.push({seg:seg,zr:zr}); }
        track.appendChild(seg);
        if(!zr.labelPlaced&&zr.label&&!zr.hideLabel){
          zr.labelPlaced=true;
          var cp=(zr.s+zr.e)/2, lbl=document.createElement('div');
          lbl.className='bar-skip-label';
          lbl.textContent=zr.label;
          var bg='#1d4ed8';
          lbl.style.cssText='left:'+cp+'%;background:'+bg+';color:#fff';
          lbl._zoneS=zr.s; lbl._zoneE=zr.e; lbl._zoneId=zr.id; lbl._zoneBaseLabel=zr.label; 
          track.appendChild(lbl);
        }
        if(isSkip){ fills.push({f:null,s:s,e:e,w:width,skip:true}); }
        else { var fz=document.createElement('div'); fz.className='bar-fill'; fz.style.cssText='left:'+left+';width:0;max-width:'+width; track.appendChild(fz); fills.push({f:fz,s:s,e:e,w:width,skip:false}); }
      } else {
        track.appendChild(seg);
        var f=document.createElement('div'); f.className='bar-fill'; f.style.cssText='left:'+left+';width:0;max-width:'+width; track.appendChild(f);
        fills.push({f:f,s:s,e:e,w:width,skip:false});
      }
    }
    (window._skipZones||[]).forEach(function(z){
      if(z.type!=='pause'||!z.enabled||z.position==null) return;
      var pct=z.position/dur*100; if(pct<0||pct>100) return;
      var lbl=document.createElement('div'); lbl.className='bar-pause-label bar-skip-label';
      lbl.textContent=z.label+(z.pauseMode==='timer'?' ('+z.pauseSec+'s)':'');
      lbl.style.left=pct+'%';
      lbl._zoneS=Math.max(0,pct-1.5); lbl._zoneE=Math.min(100,pct+1.5); 
      track.appendChild(lbl);
    });
    track._barHoverBound&&track.removeEventListener('mousemove',track._barHoverBound);
    track._barLeaveBound&&track.removeEventListener('mouseleave',track._barLeaveBound);
    track._barHoverBound=function(e){
      var r=track.getBoundingClientRect(), pct=Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100));
      track.querySelectorAll('.bar-seg').forEach(function(seg,si){ seg.classList.toggle('bar-hov',pct>=fills[si].s&&pct<fills[si].e); });
      
      track.querySelectorAll('.bar-skip-label,.bar-pause-label').forEach(function(lbl){
        var inside=(lbl._zoneS!=null)?(pct>=lbl._zoneS&&pct<lbl._zoneE):false;
        lbl.classList.toggle('bar-label-show', inside);
      });
    };
    track._barLeaveBound=function(){
      track.querySelectorAll('.bar-seg').forEach(function(s){ s.classList.remove('bar-hov'); });
      track.querySelectorAll('.bar-skip-label,.bar-pause-label').forEach(function(lbl){ lbl.classList.remove('bar-label-show'); });
    };
    track.addEventListener('mousemove',track._barHoverBound); track.addEventListener('mouseleave',track._barLeaveBound);
    track._abProgress=function(pct){
      for(var i=0;i<fills.length;i++){
        var seg=fills[i]; if(seg.skip||!seg.f) continue;
        var w; if(pct<=seg.s) w='0'; else if(pct>=seg.e) w=seg.w; else w='calc('+seg.w+' * '+((pct-seg.s)/(seg.e-seg.s)).toFixed(4)+')';
        if(seg.f.style.width!==w) seg.f.style.width=w;
      }
    };
    track._chapProgress=track._abProgress;
    track._updateZoneColors=function(pct){
      var segs=track._zoneSeg; if(!segs||!segs.length) return;
      for(var zi=0;zi<segs.length;zi++){
        var entry=segs[zi], zr=entry.zr;
        if(zr.hideHighlight){ entry.seg.style.background=''; entry.seg.style.zIndex=''; entry.seg.style.opacity=''; continue; }
        
        var inside=(pct>=zr.s&&pct<zr.e);
        var baseColor=colorMap[zr.type]||colorMap.combo;
        var wantBg=baseColor;
        var wantOpacity=inside?'1':'0.55';
        var wantZ=inside?'4':'3';
        if(entry.seg.style.background!==wantBg){ entry.seg.style.background=wantBg; }
        entry.seg.style.zIndex=wantZ;
        entry.seg.style.opacity=wantOpacity;
      }
      
      track.querySelectorAll('.bar-skip-label,.bar-pause-label').forEach(function(lbl){
        if(lbl._zoneS==null) return;
        var inZone=(pct>=lbl._zoneS&&pct<lbl._zoneE);
        
        lbl.classList.toggle('bar-label-play', inZone);
      });
    };
    
    var _rDur=getDur();
    if(_rDur>0){ var _rT=0; try{ _rT=player.getCurrentTime(); }catch(_){} window._abUpdateFills(_rT/_rDur*100); }
  };
  window._abUpdateFills=function(pct){
    var t=document.getElementById('seekTrack'); if(!t) return;
    if(t._abProgress) t._abProgress(pct);
    if(t._updateZoneColors) t._updateZoneColors(pct);
    
    t.querySelectorAll('.bar-skip-label,.bar-pause-label').forEach(function(lbl){
      if(lbl._zoneS==null) return;
      lbl.classList.toggle('bar-label-play', pct>=lbl._zoneS&&pct<lbl._zoneE);
    });
  };
  window._dirtyBarKey=function(){ _builtKey=''; };
  
  window._updateLoopLabel=function(zoneId, text){
    var track=document.getElementById('seekTrack'); if(!track) return;
    track.querySelectorAll('.bar-skip-label').forEach(function(lbl){
      if(lbl._zoneId===zoneId){ lbl.textContent=text; }
    });
  };
  document.addEventListener('click',function(e){ if(e.target&&e.target.closest&&e.target.closest('#settingsDd')) setTimeout(window._barBuild,80); });

  
  (function(){
    var track=document.getElementById('seekTrack'); if(!track) return;
    function showLabelAtPct(pct){
      track.querySelectorAll('.bar-skip-label,.bar-pause-label').forEach(function(lbl){
        var inside=(lbl._zoneS!=null)?(pct>=lbl._zoneS&&pct<lbl._zoneE):false;
        lbl.classList.toggle('bar-label-show', inside);
      });
    }
    function getPctFromTouch(e){
      var t=e.touches&&e.touches[0]||e.changedTouches&&e.changedTouches[0]; if(!t) return null;
      var r=track.getBoundingClientRect();
      return Math.max(0,Math.min(100,(t.clientX-r.left)/r.width*100));
    }
    track.addEventListener('mousedown', function(e){
      var r=track.getBoundingClientRect(), pct=Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100));
      showLabelAtPct(pct);
    });
    track.addEventListener('touchstart', function(e){
      var pct=getPctFromTouch(e); if(pct!==null) showLabelAtPct(pct);
    }, {passive:true});
    track.addEventListener('touchmove', function(e){
      var pct=getPctFromTouch(e); if(pct!==null) showLabelAtPct(pct);
    }, {passive:true});
    function endSeek(){
      track.querySelectorAll('.bar-skip-label,.bar-pause-label').forEach(function(lbl){ lbl.classList.remove('bar-label-show'); });
    }
    document.addEventListener('mouseup', endSeek);
    document.addEventListener('touchend', endSeek);
  })();

  /* ── seekTooltip: show on hover for non-live + show lore name ── */
  (function(){
    var track=document.getElementById('seekTrack');
    var tip=document.getElementById('seekTooltip');
    var sb=document.getElementById('sbTime');
    var sbChap=document.getElementById('sbChap');
    if(!track||!tip||!sb) return;

    function fmt(sec){
      sec=Math.round(sec);
      var h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
      return (h>0?h+':':'')+(h>0?String(m).padStart(2,'0'):m)+':'+String(s).padStart(2,'0');
    }

    function getDur(){
      try{ if(typeof player!=='undefined'&&player&&player.getDuration){ var d=player.getDuration(); if(d>0) return d; } }catch(_){}
      return 0;
    }

    function getLoreAtPct(pct){
      /* check zone segments painted on the bar */
      var segs=track.querySelectorAll('.bar-seg[data-zone-id]');
      for(var i=0;i<segs.length;i++){
        var seg=segs[i];
        var s=parseFloat(seg.dataset.zoneS||'-1'), e=parseFloat(seg.dataset.zoneE||'-1');
        if(s>=0&&pct>=s&&pct<e) return seg.dataset.zoneLabel||null;
      }
      /* fallback: scan _skipZones directly */
      var dur=getDur(); if(!dur) return null;
      var zones=window._skipZones||[];
      for(var j=0;j<zones.length;j++){
        var z=zones[j];
        if(!z.enabled||z.type==='pause') continue;
        var zs=z.start/dur*100, ze=z.end/dur*100;
        if(pct>=zs&&pct<ze) return z.label||null;
      }
      return null;
    }

    track.addEventListener('mousemove', function(e){
      if(window._isLiveStream) return; /* live has its own handler */
      var dur=getDur(); if(!dur) return;
      var r=track.getBoundingClientRect();
      var frac=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
      var pct=frac*100;
      var t=frac*dur;
      sb.textContent=fmt(t);

      /* show lore name if cursor is over a lore zone */
      if(sbChap){
        var loreName=getLoreAtPct(pct);
        if(loreName){
          sbChap.textContent=loreName;
          sbChap.className='chap-label-visible';
        } else {
          sbChap.textContent='';
          sbChap.className='chap-label';
        }
      }

      tip.classList.add('visible');
      tip.style.left=Math.round(frac*r.width)+'px';
    });

    track.addEventListener('mouseleave', function(){
      if(window._isLiveStream) return;
      tip.classList.remove('visible');
      if(sbChap){ sbChap.textContent=''; sbChap.className='chap-label'; }
    });
  })();

})();




(function(){
  window._skipZones  = window._skipZones  || [];
  window._skipGlobal = (window._skipGlobal != null) ? window._skipGlobal : true;

  var _idCtr=(window._smIdCtr||0), _toastTimer=null, _lastSkipId=null;
  
  var _editId=null;
  
  var _smType='zone';
  
  var _smZoneMode='skip';
  var _smFxSpd=true, _smFxVol=true;
  var _smFxLoop=true; 
  var _smFxTeleport=false; 
  var _smTeleportZoneId=null; 
  var _smTeleportTimeSec=null; 
  var _smSpd=1, _smVol=0, _smLoopCount=0;
  var _smStartSec=null, _smEndSec=null, _smPausePosSec=null;

  
  var _inVolZoneId=null, _preZoneVol=null;
  var _volZoneMuted=false; 
  var _userOverrideSpd=false; 
  var _userMuteLocked=false; 
  var _inSpdZoneId=null, _preZoneSpd=null;
  var _inLoopZoneId=null;
  var _loopSeekActive=false;
  var _inComboZoneId=null, _preComboSpd=null, _preComboVol=null;

  
  var _smthVolCur=null, _smthVolTgt=null;
  var _smthSpdCur=null, _smthSpdTgt=null;
  var _smthRaf=null;
  var SMTH=0.12; 

  function _smthTick(){
    var busy=false;
    if(_smthVolTgt!==null&&_smthVolCur!==null){
      if(_volZoneMuted||_userMuteLocked){ _smthVolTgt=null; _smthVolCur=null; }
      else {
        var dv=_smthVolTgt-_smthVolCur;
        if(Math.abs(dv)<0.3){ _smthVolCur=_smthVolTgt; _smthVolTgt=null; }
        else { _smthVolCur+=dv*SMTH; busy=true; }
        _setVolRaw(Math.round(_smthVolCur));
      }
    }
    if(_smthSpdTgt!==null&&_smthSpdCur!==null){
      if(_userOverrideSpd){ _smthSpdTgt=null; _smthSpdCur=null; }
      else {
        var ds=_smthSpdTgt-_smthSpdCur;
        if(Math.abs(ds)<0.002){ _smthSpdCur=_smthSpdTgt; _smthSpdTgt=null; }
        else { _smthSpdCur+=ds*SMTH; busy=true; }
        var spd2=Math.round(_smthSpdCur*100)/100;
        try{ player.setPlaybackRate(spd2); }catch(_){}
        syncSpeedUI(spd2);
      }
    }
    _smthRaf=busy?requestAnimationFrame(_smthTick):null;
  }
  
  function syncSpeedUI(val){
    var spds=[0.25,0.5,0.75,1,1.25,1.5,1.75,2]; 
    var closest=spds.reduce(function(a,b){ return Math.abs(b-val)<Math.abs(a-val)?b:a; });
    document.querySelectorAll('#settingsMenu [data-spd]').forEach(function(b){
      var bv=parseFloat(b.getAttribute('data-spd'));
      b.classList.toggle('on', bv===closest);
    });
  }
  window.syncSpeedUI=syncSpeedUI;

  
  window._setVolZoneMuted=function(muted){
    _volZoneMuted=muted;
    if(muted){ _smthVolTgt=null; _smthVolCur=null; } 
  };

  
  window._toggleUserMuteLock=function(lock){
    _userMuteLocked=lock;
    if(lock){
      
      _smthVolTgt=null; _smthVolCur=null;
      _volZoneMuted=true;
    } else {
      
      _volZoneMuted=false;
    }
  };

  
  window._setUserOverrideSpd=function(active){
    _userOverrideSpd=active;
    if(active){ _smthSpdTgt=null; _smthSpdCur=null; } 
  };

  function _isMutedNow(){ var m=false; try{ m=!!isMuted; }catch(_){} if(!m){ try{ m=!!player.isMuted(); }catch(_){} } return m; }
  function _setVolRaw(v){ if(_userMuteLocked) return; v=Math.max(0,Math.min(100,Math.round(v))); if(_isMutedNow()) return;  try{ player.setVolume(v); }catch(e){} var vb=document.getElementById('volBar'); if(vb){ vb.value=v; if(window.onVolBar) onVolBar(v); } }
  function setVolSmooth(tgt){ if(_volZoneMuted||_userMuteLocked) return; if(_smthVolCur===null) _smthVolCur=getRealVol(); _smthVolTgt=tgt; if(!_smthRaf) _smthRaf=requestAnimationFrame(_smthTick); }
  function setSpdSmooth(tgt){ if(_userOverrideSpd) return; if(_smthSpdCur===null) _smthSpdCur=(typeof currentSpeed!=='undefined')?currentSpeed:1; _smthSpdTgt=tgt; syncSpeedUI(tgt); if(!_smthRaf) _smthRaf=requestAnimationFrame(_smthTick); }
  function stopSmooth(){ _smthVolTgt=null; _smthSpdTgt=null; _smthVolCur=null; _smthSpdCur=null; if(_smthRaf){ cancelAnimationFrame(_smthRaf); _smthRaf=null; } }

  
  function fmt(s){ if(s==null||isNaN(s)) return '--:--'; s=Math.floor(s); var h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=s%60; if(h) return h+':'+String(m).padStart(2,'0')+':'+String(ss).padStart(2,'0'); return m+':'+String(ss).padStart(2,'0'); }
  function getCur(){ try{ if(player&&player.getDuration&&player.getDuration()>0) return player.getCurrentTime(); }catch(e){} return 0; }
  function getRealVol(){ if(typeof currentVol!=='undefined'&&currentVol>0) return currentVol; try{ var v=player.getVolume(); if(v>0) return v; }catch(e){} return 100; }
  function setVolUI(v){ if(_userMuteLocked) return; v=Math.max(0,Math.min(100,Math.round(v))); if(_isMutedNow()) return; try{ player.setVolume(v); }catch(e){} var vb=document.getElementById('volBar'); if(vb){ vb.value=v; if(window.onVolBar) onVolBar(v); } }
  function escH(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function rebuildBar(){ if(window._dirtyBarKey) window._dirtyBarKey(); if(window._barBuild) window._barBuild(); }
  function find(id){ return window._skipZones.find(function(z){ return z.id===id; }); }
  function parseLoop(raw){ raw=(raw||'').trim(); if(raw==='0') return 0; if(raw==='∞'||raw.toLowerCase()==='inf') return -1; var n=Math.max(2,parseInt(raw)||2); return n; }

  
  var _pal={ skip:['#3b82f6','#60a5fa','#2563eb','#1d4ed8'], spd:['#3b82f6','#60a5fa','#2563eb','#1d4ed8'], vol:['#3b82f6','#60a5fa','#2563eb','#1d4ed8'], loop:['#3b82f6','#60a5fa','#2563eb','#1d4ed8'], combo:['#3b82f6','#60a5fa','#2563eb','#1d4ed8'], pause:['#ef4444','#dc2626','#b91c1c','#f87171'] };
  var _ctr={}; function nextColor(t){ _ctr[t]=(_ctr[t]||0); var p=_pal[t]||_pal.skip; return p[(_ctr[t]++)%p.length]; }

  
  function otherZones(skipId){ return window._skipZones.filter(function(z){ return z.id!==skipId&&z.enabled&&z.type!=='pause'; }).slice().sort(function(a,b){ return a.start-b.start; }); }
  function clampNoOverlap(s,e,others){ if(s>=e) return null; var rs=s,re=e; for(var i=0;i<others.length;i++){ var o=others[i]; if(o.type==='pause'||o.start==null||o.end==null) continue; if(re<=o.start||rs>=o.end) continue; if(rs<o.start) re=Math.min(re,o.start); else rs=Math.max(rs,o.end); if(rs>=re) return null; } return {start:rs,end:re}; }
  function wouldOverlap(s,e,skipId){ return window._skipZones.some(function(z){ return z.id!==skipId&&z.enabled&&z.type!=='pause'&&z.start!=null&&z.end!=null&&s<z.end&&e>z.start; }); }

  
  function toast(msg){  }
  function loopToast(msg){
    
    if(typeof showToast==='function'){ showToast(msg); return; }
    var el=document.getElementById('toast'); if(!el) return;
    el.textContent=msg;
    el.classList.remove('error');
    el.classList.add('visible');
    clearTimeout(el._lt);
    el._lt=setTimeout(function(){ el.classList.remove('visible'); },2500);
  }

  
  function showEditBanner(name){
    var b=document.getElementById('smEditBanner'), lbl=document.getElementById('smEditBannerLabel');
    if(!b) return;
    if(lbl) lbl.textContent='Editing: '+name;
    b.classList.add('show');
    var doneBtn=document.getElementById('smDone'); if(doneBtn) doneBtn.textContent='Update';
    var tabBtn=document.getElementById('smTabAdd'); if(tabBtn) tabBtn.textContent='Edit Lore';
  }
  function hideEditBanner(){
    var b=document.getElementById('smEditBanner'); if(b) b.classList.remove('show');
    var doneBtn=document.getElementById('smDone'); if(doneBtn) doneBtn.textContent='Add';
    var tabBtn=document.getElementById('smTabAdd'); if(tabBtn) tabBtn.textContent='Add Lore';
    _editId=null;
  }

  
  window.smSetZoneMode=function(mode){
    _smZoneMode=mode;
    var bSkip=document.getElementById('smModeSkip'), bFx=document.getElementById('smModeEffect');
    if(bSkip) bSkip.className='sm-zone-mode-btn'+(mode==='skip'?' modeSkipOn':'');
    if(bFx)   bFx.className  ='sm-zone-mode-btn'+(mode==='effect'?' modeEffectOn':'');
    var sn=document.getElementById('smSkipNote'), eb=document.getElementById('smEffectBlock');
    smH.before();
    if(sn) sn.style.display=mode==='skip'?'block':'none';
    if(eb) eb.style.display=mode==='effect'?'flex':'none';
    smRefresh();
    smH.after();
  };

  
  window.smSetType=function(type){
    _smType=type;
    var isZone=(type!=='pause');
    document.getElementById('smTypZone').className='sm-type-btn'+(isZone?' smTypeZoneOn':'');
    document.getElementById('smTypPause').className='sm-type-btn'+(type==='pause'?' smTypePauseOn':'');
    smH.before();
    var zr=document.getElementById('smZoneRow'); if(zr) zr.style.display=isZone?'flex':'none';
    var pr=document.getElementById('smPauseRow'); if(pr) pr.classList.toggle('smPauseOn',type==='pause');
    var mr=document.getElementById('smMarkRow'); if(mr) mr.style.display=(type==='pause')?'none':'flex';
    var pp=document.getElementById('smPausePosRow'); if(pp) pp.style.display=(type==='pause')?'flex':'none';
    smRefresh();
    smH.after();
  };

  
  var _smPauseMode='normal';
  var _smPauseUntilClockInterval=null;
  window.smSetPauseMode=function(mode){
    _smPauseMode=mode;
    document.getElementById('smPauseModeNormal').classList.toggle('smPauseModeOn',mode==='normal');
    document.getElementById('smPauseModeTimer').classList.toggle('smPauseModeOn',mode==='timer');
    var btnUntil=document.getElementById('smPauseModeUntil');
    if(btnUntil) btnUntil.classList.toggle('smPauseModeOn',mode==='pauseuntil');
    smH.before();
    var tr=document.getElementById('smPauseTimerRow'); if(tr) tr.style.display=mode==='timer'?'flex':'none';
    var pu=document.getElementById('smPauseUntilRow'); if(pu) pu.style.display=mode==='pauseuntil'?'flex':'none';
    var h=document.getElementById('smPauseModeHint');
    if(h) h.textContent=mode==='timer'?'Video pauses for the set duration, then resumes automatically':mode==='pauseuntil'?'Video pauses when playback enters this zone AND current GMT time ≥ set time':'Video pauses when playback enters this zone';
    smH.after();
    
    if(_smPauseUntilClockInterval){ clearInterval(_smPauseUntilClockInterval); _smPauseUntilClockInterval=null; }
    if(mode==='pauseuntil'){
      function _tickUntilClock(){
        var d=new Date(), el=document.getElementById('smPauseUntilClock');
        if(el) el.textContent='Current GMT: '+String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0')+':'+String(d.getUTCSeconds()).padStart(2,'0');
      }
      _tickUntilClock();
      _smPauseUntilClockInterval=setInterval(_tickUntilClock,1000);
    }
  };

  
  var CV_X1=28, CV_X2=268, CV_Y1=4, CV_Y2=56;
  
  var CV_VOL_Y1=4, CV_VOL_Y2=84, CV_VOL_H=90;

  var CV = {
    spd: {
      pts: [{pct:0,val:1},{pct:100,val:1}],
      svgId:'cvSpdSvg', lineId:'cvSpdLine', areaId:'cvSpdArea', dotsId:'cvSpdDots',
      valLblId:'smSpdVal', color:'rgba(255,255,255,.9)', fillId:'cvSpdFill',
      minVal:0.25, maxVal:2,
      y1:CV_VOL_Y1, y2:CV_VOL_Y2,
      fmtVal:function(v){ return (Math.round(v*100)/100).toFixed(2)+'×'; },
      snapVal:function(v){ return Math.round(v*100)/100; }
    },
    vol: {
      pts: [{pct:0,val:100},{pct:100,val:100}],
      svgId:'cvVolSvg', lineId:'cvVolLine', areaId:'cvVolArea', dotsId:'cvVolDots',
      valLblId:'smVolVal', color:'rgba(255,255,255,.9)', fillId:'cvVolFill',
      minVal:0, maxVal:100,
      y1:CV_VOL_Y1, y2:CV_VOL_Y2,
      fmtVal:function(v){ return Math.round(v*10)/10+'%'; },
      snapVal:function(v){ return Math.round(v*10)/10; }
    }
  };
  function cvPctToX(p){ return CV_X1 + p/100*(CV_X2-CV_X1); }
  function cvValToY(c,v){
    var y1=c.y1!=null?c.y1:CV_Y1, y2=c.y2!=null?c.y2:CV_Y2;
    return y2 - (v-c.minVal)/(c.maxVal-c.minVal)*(y2-y1);
  }
  function cvXToPct(x){ return Math.max(0,Math.min(100, (x-CV_X1)/(CV_X2-CV_X1)*100 )); }
  function cvYToVal(c,y){
    var y1=c.y1!=null?c.y1:CV_Y1, y2=c.y2!=null?c.y2:CV_Y2;
    return c.minVal + (y2-y)/(y2-y1)*(c.maxVal-c.minVal);
  }
  function cvClientToSvg(svg,cx,cy){
    var r=svg.getBoundingClientRect();
    var vbH=parseFloat(svg.getAttribute('viewBox').split(' ')[3])||60;
    return {x:(cx-r.left)/r.width*272, y:(cy-r.top)/r.height*vbH};
  }

  function cvInterp(pts,pct){
    var s=pts.slice().sort(function(a,b){return a.pct-b.pct;});
    if(pct<=s[0].pct) return s[0].val;
    if(pct>=s[s.length-1].pct) return s[s.length-1].val;
    for(var i=0;i<s.length-1;i++){
      if(pct>=s[i].pct&&pct<=s[i+1].pct){
        var t=(pct-s[i].pct)/(s[i+1].pct-s[i].pct);
        return s[i].val + t*(s[i+1].val-s[i].val);
      }
    }
    return s[s.length-1].val;
  }

  function cvRender(key){
    var c=CV[key];
    var svg=document.getElementById(c.svgId); if(!svg) return;
    var s=c.pts.slice().sort(function(a,b){return a.pct-b.pct;});
    var linePts=s.map(function(p){return cvPctToX(p.pct)+','+cvValToY(c,p.val);}).join(' ');
    var last=s[s.length-1],first=s[0];
    var y2close=c.y2!=null?c.y2:CV_Y2;
    var areaPts=linePts+' '+cvPctToX(last.pct)+','+y2close+' '+cvPctToX(first.pct)+','+y2close;
    var line=document.getElementById(c.lineId), area=document.getElementById(c.areaId);
    if(line) line.setAttribute('points',linePts);
    if(area) area.setAttribute('points',areaPts);
    var g=document.getElementById(c.dotsId); if(!g) return;
    g.innerHTML='';
    s.forEach(function(p,i){
      var cx=cvPctToX(p.pct), cy=cvValToY(c,p.val);
      var ring=document.createElementNS('http://www.w3.org/2000/svg','circle');
      ring.setAttribute('cx',cx); ring.setAttribute('cy',cy); ring.setAttribute('r','7');
      ring.setAttribute('fill',c.color); ring.setAttribute('fill-opacity','.1');
      ring.setAttribute('stroke','none'); ring.setAttribute('class','cv-dot-ring');
      g.appendChild(ring);
      var dot=document.createElementNS('http://www.w3.org/2000/svg','circle');
      dot.setAttribute('cx',cx); dot.setAttribute('cy',cy); dot.setAttribute('r','5');
      dot.setAttribute('fill',c.color); dot.setAttribute('fill-opacity','.9');
      dot.setAttribute('stroke','#fff'); dot.setAttribute('stroke-width','1.5');
      dot.setAttribute('class','cv-dot');
      dot.setAttribute('data-key',key); dot.setAttribute('data-idx',i);
      g.appendChild(dot);
      var lbl=document.createElementNS('http://www.w3.org/2000/svg','text');
      var ky1=c.y1!=null?c.y1:CV_Y1; var lyOff=cy>ky1+10?-8:10;
      lbl.setAttribute('x',cx); lbl.setAttribute('y',cy+lyOff);
      lbl.setAttribute('text-anchor','middle');
      lbl.setAttribute('style','font-size:7px;font-family:inherit;font-weight:700;fill:rgba(255,255,255,.85);pointer-events:none;');
      lbl.textContent=c.fmtVal(p.val);
      g.appendChild(lbl);
      dot.addEventListener('mousedown',cvDragStart); dot.addEventListener('touchstart',cvDragStart,{passive:false});
      dot.addEventListener('dblclick',function(e){ e.stopPropagation(); var idx=parseInt(this.getAttribute('data-idx')); if(c.pts.length<=2) return; var sorted=c.pts.slice().sort(function(a,b){return a.pct-b.pct;}); var pt=sorted[idx]; if(pt.pct===0||pt.pct===100) return; c.pts=c.pts.filter(function(p){ return !(p.pct===pt.pct&&p.val===pt.val); }); cvRender(key); });
    });
    var vlbl=document.getElementById(c.valLblId);
    
    var dispVal;
    if(c._lastSelVal!=null){ dispVal=c._lastSelVal; }
    else { var mid=cvInterp(c.pts,50); dispVal=mid; }
    if(vlbl){ vlbl.textContent=c.fmtVal(dispVal); }
    
    if(key==='spd'){ var si=document.getElementById('smSpdInput'); if(si) si.value=(Math.round(dispVal*100)/100).toFixed(2); }
    if(key==='vol'){ var vi=document.getElementById('smVolInput'); if(vi) vi.value=Math.round(dispVal*10)/10; }
  }

  var _cvDrag=null;
  function cvDragStart(e){
    e.stopPropagation(); e.preventDefault();
    var key=this.getAttribute('data-key'), idx=parseInt(this.getAttribute('data-idx'));
    var c=CV[key];
    var sorted=c.pts.slice().sort(function(a,b){return a.pct-b.pct;});
    var pt=sorted[idx];
    var origIdx=c.pts.findIndex(function(p){ return p===pt || (p.pct===pt.pct&&p.val===pt.val); });
    _cvDrag={key:key, origIdx:origIdx, origPct:pt.pct};
    document.addEventListener('mousemove',cvDragMove); document.addEventListener('touchmove',cvDragMove,{passive:false});
    document.addEventListener('mouseup',cvDragEnd); document.addEventListener('touchend',cvDragEnd);
  }
  function cvDragMove(e){
    if(!_cvDrag) return; e.preventDefault();
    var c=CV[_cvDrag.key];
    var svg=document.getElementById(c.svgId); if(!svg) return;
    var touch=e.touches?e.touches[0]:e;
    var pos=cvClientToSvg(svg,touch.clientX,touch.clientY);
    
    var newPct=Math.round(cvXToPct(pos.x)*10)/10;
    var newVal=c.snapVal(cvYToVal(c,pos.y));
    newVal=Math.max(c.minVal,Math.min(c.maxVal,newVal));
    var isFirst=(_cvDrag.origPct===0), isLast=(_cvDrag.origPct===100);
    if(isFirst) newPct=0; if(isLast) newPct=100;
    var conflict=c.pts.some(function(p,j){ return j!==_cvDrag.origIdx&&Math.abs(p.pct-newPct)<0.05; });
    if(!conflict){
      c.pts[_cvDrag.origIdx].pct=newPct;
      c.pts[_cvDrag.origIdx].val=newVal;
      c._lastSelVal=newVal;
      cvRender(_cvDrag.key);
    }
  }
  function cvDragEnd(){
    _cvDrag=null;
    document.removeEventListener('mousemove',cvDragMove); document.removeEventListener('touchmove',cvDragMove);
    document.removeEventListener('mouseup',cvDragEnd); document.removeEventListener('touchend',cvDragEnd);
  }

  function cvInitSvg(key){
    var c=CV[key];
    var svg=document.getElementById(c.svgId); if(!svg) return;
    svg.addEventListener('click',function(e){
      if(e.target.classList.contains('cv-dot')) return;
      var pos=cvClientToSvg(svg,e.clientX,e.clientY);
      if(pos.x<CV_X1-4||pos.x>CV_X2+4) return;
      var newPct=Math.round(cvXToPct(pos.x)*10)/10;
      if(c.pts.some(function(p){ return Math.abs(p.pct-newPct)<0.1; })) return;
      var newVal=c.snapVal(cvYToVal(c,pos.y));
      newVal=Math.max(c.minVal,Math.min(c.maxVal,newVal));
      c.pts.push({pct:newPct,val:newVal});
      c._lastSelVal=newVal;
      cvRender(key);
    });
  }

  
  window.cvSetFlat=function(key,val){
    var c=CV[key];
    c.pts=[{pct:0,val:val},{pct:100,val:val}];
    c._lastSelVal=val;
    cvRender(key);
    
    if(key==='spd'){
      document.querySelectorAll('.sm-spd-preset').forEach(function(b){ b.classList.toggle('on', parseFloat(b.textContent)===val); });
      var inp=document.getElementById('smSpdInput'); if(inp) inp.value=val.toFixed(2);
    }
    if(key==='vol'){
      document.querySelectorAll('.sm-vol-preset').forEach(function(b){ b.classList.toggle('on', parseFloat(b.textContent)===val); });
      var inp2=document.getElementById('smVolInput'); if(inp2) inp2.value=val;
    }
  };

  
  window.cvSetFlatVal=function(key,raw){
    var v=parseFloat(raw);
    if(isNaN(v)) return;
    var c=CV[key];
    v=Math.max(c.minVal,Math.min(c.maxVal,v));
    
    c.pts.forEach(function(p){ p.val=v; });
    c._lastSelVal=v;
    cvRender(key);
    if(key==='spd') document.querySelectorAll('.sm-spd-preset').forEach(function(b){ b.classList.remove('on'); });
    if(key==='vol') document.querySelectorAll('.sm-vol-preset').forEach(function(b){ b.classList.remove('on'); });
  };

  window.cvReset=function(key){
    var c=CV[key];
    if(key==='spd'){ c.pts=[{pct:0,val:1},{pct:100,val:1}]; var si=document.getElementById('smSpdInput'); if(si) si.value='1.00'; document.querySelectorAll('.sm-spd-preset').forEach(function(b){ b.classList.toggle('on',b.textContent==='1×'); }); }
    if(key==='vol'){ c.pts=[{pct:0,val:100},{pct:100,val:100}]; var vi=document.getElementById('smVolInput'); if(vi) vi.value='100'; document.querySelectorAll('.sm-vol-preset').forEach(function(b){ b.classList.toggle('on',b.textContent==='100%'); }); }
    cvRender(key);
  };

  
  window.cvSetVolCurrent=function(){
    var v=100;
    try{
      if(_preZoneVol!=null)               v=Math.round(_preZoneVol*10)/10;
      else if(_preComboVol!=null)          v=Math.round(_preComboVol*10)/10;
      else if(typeof getRealVol==='function') v=Math.round(getRealVol()*10)/10;
      else if(typeof player!=='undefined'&&player.getVolume) v=Math.round(player.getVolume()*10)/10;
    }catch(_){}
    cvSetFlat('vol',v);
    var btn=document.getElementById('smVolCurrentBtn');
    if(btn){ btn.classList.add('on'); setTimeout(function(){ btn.classList.remove('on'); },1200); }
  };

  window.cvSetSpdCurrent=function(){
    var v=1;
    try{
      if(_preZoneSpd!=null)               v=Math.round(_preZoneSpd*100)/100;
      else if(_preComboSpd!=null)          v=Math.round(_preComboSpd*100)/100;
      else if(typeof currentSpeed!=='undefined'&&currentSpeed) v=Math.round(currentSpeed*100)/100;
      else if(typeof player!=='undefined'&&player.getPlaybackRate) v=Math.round(player.getPlaybackRate()*100)/100;
    }catch(_){}
    cvSetFlat('spd',v);
    var btn=document.getElementById('smSpdCurrentBtn');
    if(btn){ btn.classList.add('on'); setTimeout(function(){ btn.classList.remove('on'); },1200); }
  };

  (function(){
    function initCurves(){
      ['spd','vol'].forEach(function(key){ cvInitSvg(key); cvRender(key); });
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initCurves);
    else initCurves();
  })();

  window.smSpdSet=function(v){ _smSpd=v/100; };
  window.smVolSet=function(v){ _smVol=parseInt(v); };
  window.smVolSliderMove=window.smVolSet;
  window.smSpdSliderMove=function(v){ window.smSpdSet(Math.round(parseInt(v)/5)*5); };
  window.smLoopSet=function(n){ _smLoopCount=n; var inp=document.getElementById('smLoopCountIn'); if(inp) inp.value=(n===-1?'inf':(n===0?'0':n)); document.querySelectorAll('.sm-loop-preset').forEach(function(b){ b.classList.toggle('on',(b.textContent==='inf'&&n===-1)||(b.textContent==='0'&&n===0)||(b.textContent===n+'×')); }); };

  
  
  var smH = (function(){
    var bar, fromH, rafId, cleanupFn;
    function getBar(){ return document.getElementById('skipMarkBar'); }
    function before(){
      bar = getBar();
      if(!bar || !bar.classList.contains('smActive')){ bar=null; return; }
      
      if(rafId){ cancelAnimationFrame(rafId); rafId=null; }
      if(cleanupFn){ bar.removeEventListener('transitionend', cleanupFn); cleanupFn=null; }
      fromH = bar.offsetHeight;
      
      bar.style.transition = 'none';
      bar.style.height = fromH + 'px';
    }
    function after(){
      if(!bar) return;
      
      bar.style.transition = '';
      
      rafId = requestAnimationFrame(function(){
        var maxH = parseInt(getComputedStyle(bar).maxHeight) || 560;
        
        bar.style.height = 'auto';
        var toH = Math.min(bar.scrollHeight, maxH);
        
        bar.style.transition = 'none';
        bar.style.height = fromH + 'px';
        rafId = requestAnimationFrame(function(){
          
          bar.style.transition = '';
          bar.style.height = toH + 'px';
          cleanupFn = function(e){
            if(e.propertyName !== 'height') return;
            bar.style.height = '';
            bar.removeEventListener('transitionend', cleanupFn);
            cleanupFn = null;
          };
          bar.addEventListener('transitionend', cleanupFn);
        });
      });
    }
    return { before:before, after:after };
  })();

  function smAnimateBarHeight(){
    
    var bar = document.getElementById('skipMarkBar');
    if(!bar || !bar.classList.contains('smActive')) return;
    var fromH = bar.offsetHeight;
    bar.style.transition = 'none';
    bar.style.height = fromH + 'px';
    requestAnimationFrame(function(){
      bar.style.transition = '';
      bar.style.height = 'auto';
      var maxH = parseInt(getComputedStyle(bar).maxHeight) || 560;
      var toH = Math.min(bar.scrollHeight, maxH);
      bar.style.transition = 'none';
      bar.style.height = fromH + 'px';
      requestAnimationFrame(function(){
        bar.style.transition = '';
        bar.style.height = toH + 'px';
        var done = function(e){
          if(e.propertyName !== 'height') return;
          bar.style.height = '';
          bar.removeEventListener('transitionend', done);
        };
        bar.addEventListener('transitionend', done);
      });
    });
  }
  window._smAnimateBarHeight=smAnimateBarHeight;

  
  window.smSwitchTab=function(tab){
    smH.before();
    document.getElementById('smTabAdd').classList.toggle('smTabOn',tab==='add');
    document.getElementById('smTabList').classList.toggle('smTabOn',tab==='list');
    document.getElementById('smAddPanel').classList.toggle('smPanelOn',tab==='add');
    document.getElementById('smListPanel').classList.toggle('smPanelOn',tab==='list');
    if(tab==='list') renderList();
    if(tab==='list'&&_editId){ hideEditBanner(); }
    smH.after();
  };

  
  window.smToggleFs=function(){
    var bar=document.getElementById('skipMarkBar'), btn=document.getElementById('smFsBtn');
    if(!bar) return;
    var browserFs=document.fullscreenElement||document.webkitFullscreenElement;
    if(browserFs){
      
      var ex=document.exitFullscreen||document.webkitExitFullscreen||document.mozCancelFullScreen;
      if(ex) ex.call(document);
    } else {
      
      var isFs=bar.classList.toggle('smFs');
      if(btn){ btn.classList.toggle('smFsOn',isFs); btn.textContent=isFs?'⊡':'⛶'; btn.title=isFs?'Exit Fullscreen':'Fullscreen'; }
    }
  };

  
  function renderList(){
    var inner=document.getElementById('smListInner'); if(!inner) return;
    var empty=document.getElementById('smListEmpty');
    inner.querySelectorAll('.smz-row').forEach(function(r){ r.remove(); });
    if(empty) empty.style.display=window._skipZones.length?'none':'block';
    updateCount();
    window._skipZones.forEach(function(z){ buildRow(z,inner); });
  }
  function updateCount(){ var el=document.getElementById('smZoneCount'); if(!el) return; el.textContent=window._skipZones.length?'('+window._skipZones.length+')':''; }

  
  var typeChip={ skip:'#3b82f6', spd:'#3b82f6', vol:'#3b82f6', loop:'#3b82f6', combo:'#3b82f6', pause:'#ef4444' };
  var typeBadge={
    skip:  { text:'SKIP',         bg:'rgba(59,130,246,.18)',   color:'#60a5fa' },
    spd:   { text:'EFFECT ZONE',  bg:'rgba(59,130,246,.18)',   color:'#60a5fa' },
    vol:   { text:'EFFECT ZONE',  bg:'rgba(59,130,246,.18)',   color:'#60a5fa' },
    loop:  { text:'EFFECT ZONE',  bg:'rgba(59,130,246,.18)',   color:'#60a5fa' },
    combo: { text:'EFFECT ZONE',  bg:'rgba(59,130,246,.18)',   color:'#60a5fa' },
    pause: { text:'PAUSE',        bg:'rgba(239,68,68,.18)',    color:'#f87171' }
  };

  function buildRow(z,container){
    var row=document.createElement('div');
    row.className='smz-row'+(z.enabled?'':' smz-disabled'); row.dataset.id=z.id;
    var chip=typeChip[z.type]||'#4af';
    var bd=typeBadge[z.type]||typeBadge.skip;
    var sw='<label class="smz-switch'+(z.enabled?' is-on':'')+'"><input type="checkbox" class="smz-chk" data-id="'+z.id+'"'+(z.enabled?' checked':'')+'><span class="smz-switch-track"></span></label>';
    var timeStr=z.type==='pause'
      ? (function(){
          var base='Pause at '+fmt(z.position);
          if(z.pauseMode==='pauseuntil'&&z.pauseUntilUTC!=null){
            var _h=Math.floor(z.pauseUntilUTC/3600), _m=Math.floor((z.pauseUntilUTC%3600)/60), _s=z.pauseUntilUTC%60;
            base+=' · until '+String(_h).padStart(2,'0')+':'+String(_m).padStart(2,'0')+':'+String(_s).padStart(2,'0')+' GMT';
          } else if(z.pauseMode==='timer'&&z.pauseSec>0){
            base+=' · for '+z.pauseSec+'s';
          }
          return base;
        })()
      : fmt(z.start)+' → '+fmt(z.end)+'<span style="color:#333;margin-left:4px;">('+fmt(z.end-z.start)+')</span>';
    row.innerHTML=
      '<div class="smz-chip" style="background:'+chip+'"></div>'+
      '<div class="smz-info">'+
        '<div class="smz-name">'+escH(z.label)+'</div>'+
        '<div class="smz-time">'+timeStr+'</div>'+
      '</div>'+
      '<div class="smz-btns">'+
        '<button class="smz-btn smz-eye'+(z.hideLabel?'':' eye-on')+'" data-id="'+z.id+'" title="Toggle label">TXT</button>'+
        '<button class="smz-btn smz-hl'+(z.hideHighlight?'':' hl-on')+'"  data-id="'+z.id+'" title="Toggle highlight">▬</button>'+
        sw+
        '<button class="smz-btn smz-edt" data-id="'+z.id+'">Edit</button>'+
        '<button class="smz-btn smz-del" data-id="'+z.id+'">Del</button>'+
      '</div>';
    container.appendChild(row);
    row.querySelector('.smz-chk').addEventListener('change',function(){ z.enabled=this.checked; row.classList.toggle('smz-disabled',!z.enabled); var sw2=row.querySelector('.smz-switch'); if(sw2) sw2.classList.toggle('is-on',z.enabled); rebuildBar(); if(window.showToast) showToast((z.enabled?'Zone on: ':'Zone off: ')+z.label); });
    row.querySelector('.smz-eye').addEventListener('click',function(){ z.hideLabel=!z.hideLabel; this.classList.toggle('eye-on',!z.hideLabel); rebuildBar(); });
    row.querySelector('.smz-hl').addEventListener('click',function(){ z.hideHighlight=!z.hideHighlight; this.classList.toggle('hl-on',!z.hideHighlight); rebuildBar(); });
    
    row.querySelector('.smz-edt').addEventListener('click',function(){ smOpenEdit(z.id); });
    row.querySelector('.smz-del').addEventListener('click',function(){ if(_editId===z.id) smCancelEdit(); window._skipZones=window._skipZones.filter(function(zz){ return zz.id!==z.id; }); renderList(); rebuildBar(); });
  }

  
  window.smOpenEdit=function(id){
    var z=find(id); if(!z) return;
    _editId=id;

    
    _smStartSec=null; _smEndSec=null; _smPausePosSec=null;

    
    var lbl=document.getElementById('smLabel'); if(lbl) lbl.value=z.label||'';

    if(z.type==='pause'){
      smSetType('pause');
      _smPausePosSec=z.position!=null?z.position:null;
      smSetPauseMode(z.pauseMode||'normal');
      var ps=document.getElementById('smPauseSec'); if(ps&&z.pauseSec) ps.value=z.pauseSec;
      if(z.pauseMode==='pauseuntil'&&z.pauseUntilUTC!=null){
        var puh=document.getElementById('smPauseUntilH'); var pum=document.getElementById('smPauseUntilM'); var pus=document.getElementById('smPauseUntilS');
        if(puh) puh.value=Math.floor(z.pauseUntilUTC/3600);
        if(pum) pum.value=Math.floor((z.pauseUntilUTC%3600)/60);
        if(pus) pus.value=z.pauseUntilUTC%60;
      }
    } else {
      smSetType('zone');
      _smStartSec=z.start!=null?z.start:null;
      _smEndSec=z.end!=null?z.end:null;

      if(z.type==='skip'){
        smSetZoneMode('skip');
      } else {
        smSetZoneMode('effect');
        
        _smFxSpd=(z.spd!=null||!!(z.spdCurve&&z.spdCurve.length));
        _smFxVol=(z.vol!=null||!!(z.volCurve&&z.volCurve.length));
        _smFxSyncUI();
        
        if(z.spdCurve&&z.spdCurve.length){
          CV.spd.pts=z.spdCurve.map(function(p){ return {pct:p.pct,val:p.val}; });
        } else if(z.spd!=null){
          CV.spd.pts=[{pct:0,val:z.spd},{pct:100,val:z.spd}];
        } else {
          CV.spd.pts=[{pct:0,val:1},{pct:100,val:1}];
        }
        cvRender('spd');
        
        if(z.volCurve&&z.volCurve.length){
          CV.vol.pts=z.volCurve.map(function(p){ return {pct:p.pct,val:p.val}; });
        } else if(z.vol!=null){
          CV.vol.pts=[{pct:0,val:z.vol},{pct:100,val:z.vol}];
        } else {
          CV.vol.pts=[{pct:0,val:100},{pct:100,val:100}];
        }
        cvRender('vol');
        
        var lcRaw=z.loopCount!=null?z.loopCount:0;
        var inp=document.getElementById('smLoopCountIn');
        if(inp) inp.value=lcRaw===-1?'inf':(lcRaw===0?'0':lcRaw);
        _smLoopCount=lcRaw;

        
        var hasTp=!!(z.teleportTimeSec!=null);
        _smFxTeleport=hasTp;
        _smTeleportTimeSec=hasTp?z.teleportTimeSec:null;
        var togTe=document.getElementById('smTeleportToggle'); if(togTe) togTe.classList.toggle('is-on',hasTp);
        var bodyTe=document.getElementById('smTeleportBody'); if(bodyTe) bodyTe.style.display=hasTp?'flex':'none';
        if(hasTp){
          
          var _tpSec=z.teleportTimeSec;
          var _tpH=Math.floor(_tpSec/3600),_tpM=Math.floor((_tpSec%3600)/60),_tpS=Math.floor(_tpSec%60);
          var inpTpH=document.getElementById('smTeleportH'),inpTpM=document.getElementById('smTeleportM'),inpTpS=document.getElementById('smTeleportS');
          if(inpTpH) inpTpH.value=_tpH; if(inpTpM) inpTpM.value=_tpM; if(inpTpS) inpTpS.value=_tpS;
          
          var prevTe=document.getElementById('smTeleportPreview'), prevTeTm=document.getElementById('smTeleportPreviewTime');
          if(prevTeTm) prevTeTm.textContent=fmt(_tpSec);
          if(prevTe) prevTe.style.display='inline';
        }
      }
    }

    smRefresh();
    showEditBanner(z.label||'zone');
    smSwitchTab('add');
  };

  
  window.smCancelEdit=function(){
    hideEditBanner();
    
    _smStartSec=null; _smEndSec=null; _smPausePosSec=null;
    var lbl=document.getElementById('smLabel'); if(lbl) lbl.value='';
    
    CV.spd.pts=[{pct:0,val:1},{pct:100,val:1}]; cvRender('spd');
    CV.vol.pts=[{pct:0,val:100},{pct:100,val:100}]; cvRender('vol');
    var inp=document.getElementById('smLoopCountIn'); if(inp) inp.value='0';
    _smLoopCount=0;
    
    smSetType('zone');
    smSetZoneMode('effect');
    smSetPauseMode('normal');
    
    var puh=document.getElementById('smPauseUntilH'); var pum=document.getElementById('smPauseUntilM'); var pus=document.getElementById('smPauseUntilS');
    if(puh) puh.value='0'; if(pum) pum.value='0'; if(pus) pus.value='0';
    
    _smFxTeleport=false; _smTeleportZoneId=null;
    var togT=document.getElementById('smTeleportToggle'); if(togT) togT.classList.remove('is-on');
    var bodyT=document.getElementById('smTeleportBody'); if(bodyT) bodyT.style.display='none';
    var selT=document.getElementById('smTeleportSelect'); if(selT) selT.value='';
    var lblT=document.getElementById('smTeleportLabel'); if(lblT) lblT.textContent='— none (no teleport) —';
    smRefresh();
  };

  
  function smRefresh(){
    var done=document.getElementById('smDone'), warn=document.getElementById('smOverlapWarn');
    if(_smType==='pause'){
      var valid=_smPausePosSec!==null;
      var pt=document.getElementById('smPausePosTime'), pc=document.getElementById('smPausePosCard');
      if(pt) pt.textContent=_smPausePosSec!==null?fmt(_smPausePosSec):'--:--';
      if(pc) pc.classList.toggle('smSet',valid);
      if(warn) warn.classList.remove('smWarnOn');
      if(done) done.disabled=!valid;
      return;
    }
    var anyFx=_smZoneMode==='effect'&&(_smFxSpd||_smFxVol||_smFxLoop); 
    var st=document.getElementById('smStartTime'), et=document.getElementById('smEndTime');
    var sc=document.getElementById('smStartCard'), ec=document.getElementById('smEndCard');
    if(st) st.textContent=fmt(_smStartSec); if(et) et.textContent=fmt(_smEndSec);
    if(sc) sc.classList.toggle('smSet',_smStartSec!==null); if(ec) ec.classList.toggle('smSet',_smEndSec!==null);
    var marksOk=_smStartSec!==null&&_smEndSec!==null&&_smStartSec<_smEndSec;
    var overlaps=marksOk&&wouldOverlap(_smStartSec,_smEndSec,_editId);
    if(warn) warn.classList.toggle('smWarnOn',overlaps);
    var needsFx=(_smZoneMode==='effect'&&!anyFx);
    if(done) done.disabled=!marksOk||needsFx;
  }

  window.smMark=function(field){ if(field==='start') _smStartSec=getCur(); else _smEndSec=getCur(); if(_smStartSec!==null&&_smEndSec!==null&&_smStartSec>_smEndSec){ var tmp=_smStartSec; _smStartSec=_smEndSec; _smEndSec=tmp; } smRefresh(); };
  window.smMarkPause=function(){ _smPausePosSec=getCur(); smRefresh(); };

  
  window.openWatchMark=function(tab){
    
    if(!_editId){
      _smStartSec=null; _smEndSec=null; _smPausePosSec=null;
      var lbl=document.getElementById('smLabel'); if(lbl) lbl.value='';
      CV.spd.pts=[{pct:0,val:1},{pct:100,val:1}]; cvRender('spd');
      CV.vol.pts=[{pct:0,val:100},{pct:100,val:100}]; cvRender('vol');
      var inp=document.getElementById('smLoopCountIn'); if(inp) inp.value='0';
      _smLoopCount=0;
      _smPauseMode='normal'; smSetPauseMode('normal');
      smSetType('zone');
      smSetZoneMode('effect');
      _smFxSpd=true; _smFxVol=true;
      _smFxSyncUI();
      hideEditBanner();
    }
    smRefresh();
    document.getElementById('skipMarkBar').classList.add('smActive');
    window.smSwitchTab(tab||'add');
  };

  
  function smResetForm(){
    _smStartSec=null; _smEndSec=null; _smPausePosSec=null;
    var lbl=document.getElementById('smLabel'); if(lbl) lbl.value='';
    CV.spd.pts=[{pct:0,val:1},{pct:100,val:1}]; cvRender('spd');
    CV.vol.pts=[{pct:0,val:100},{pct:100,val:100}]; cvRender('vol');
    var loopIn=document.getElementById('smLoopCountIn'); if(loopIn) loopIn.value='0';
    _smLoopCount=0;
    _smPauseMode='normal'; smSetPauseMode('normal');
    smSetType('zone');
    smSetZoneMode('effect');
    _smFxSpd=true; _smFxVol=true;
    _smFxSyncUI();
    hideEditBanner();
    
    var puh=document.getElementById('smPauseUntilH'); var pum=document.getElementById('smPauseUntilM'); var pus=document.getElementById('smPauseUntilS');
    if(puh) puh.value='0'; if(pum) pum.value='0'; if(pus) pus.value='0';
    
    _smFxTeleport=false; _smTeleportZoneId=null;
    var togTR=document.getElementById('smTeleportToggle'); if(togTR) togTR.classList.remove('is-on');
    var bodyTR=document.getElementById('smTeleportBody'); if(bodyTR) bodyTR.style.display='none';
    var selTR=document.getElementById('smTeleportSelect'); if(selTR) selTR.value='';
    var lblTR=document.getElementById('smTeleportLabel'); if(lblTR) lblTR.textContent='— none (no teleport) —';
    smRefresh();
  }

  
  window.smDone=function(){
    
    if(_smType==='pause'){
      if(_smPausePosSec===null) return;
      var name=(document.getElementById('smLabel').value||'').trim()||'Pause Point';

      if(_editId){
        
        var ez=find(_editId);
        if(ez){
          ez.label=name;
          ez.position=_smPausePosSec;
          ez.pauseMode=_smPauseMode;
          ez.pauseSec=_smPauseMode==='timer'?(function(){ var ps=document.getElementById('smPauseSec'); return Math.max(1,parseInt((ps?ps.value:'10'))||10); })():0;
          if(_smPauseMode==='pauseuntil'){
            var _epuh=parseInt(document.getElementById('smPauseUntilH').value)||0;
            var _epum=parseInt(document.getElementById('smPauseUntilM').value)||0;
            var _epus=parseInt(document.getElementById('smPauseUntilS').value)||0;
            _epuh=Math.max(0,Math.min(23,_epuh)); _epum=Math.max(0,Math.min(59,_epum)); _epus=Math.max(0,Math.min(59,_epus));
            ez.pauseUntilUTC=_epuh*3600+_epum*60+_epus;
          } else { ez.pauseUntilUTC=null; }
          ez._pauseFired=false;
        }
        hideEditBanner();
        smRefresh(); renderList(); rebuildBar();
        if(window.showToast) showToast('"'+name+'" updated');
        smResetForm(); window.smSwitchTab('list');
        return;
      }

      
      var _puUTC=0;
      if(_smPauseMode==='pauseuntil'){
        var _puh=parseInt(document.getElementById('smPauseUntilH').value)||0;
        var _pum=parseInt(document.getElementById('smPauseUntilM').value)||0;
        var _pus=parseInt(document.getElementById('smPauseUntilS').value)||0;
        _puh=Math.max(0,Math.min(23,_puh)); _pum=Math.max(0,Math.min(59,_pum)); _pus=Math.max(0,Math.min(59,_pus));
        _puUTC=_puh*3600+_pum*60+_pus;
      }
      if((window._smIdCtr||0)>_idCtr) _idCtr=window._smIdCtr;
      var pz={ id:'sz'+(++_idCtr), label:name, type:'pause', position:_smPausePosSec, color:nextColor('pause'), enabled:true, pauseMode:_smPauseMode, pauseSec:_smPauseMode==='timer'?(function(){ var ps=document.getElementById('smPauseSec'); return Math.max(1,parseInt((ps?ps.value:'10'))||10); })():0, pauseUntilUTC:_smPauseMode==='pauseuntil'?_puUTC:null, _pauseFired:false };
      window._skipZones.push(pz); _smPausePosSec=null;
      var lbl=document.getElementById('smLabel'); if(lbl) lbl.value='';
      smRefresh(); renderList(); rebuildBar();
      if(window.showToast) showToast('"'+pz.label+'" added at '+fmt(pz.position));
      smResetForm(); window.smSwitchTab('list'); return;
    }

    
    if(_smStartSec===null||_smEndSec===null) return; if(_smStartSec>_smEndSec){ var tmp=_smStartSec; _smStartSec=_smEndSec; _smEndSec=tmp; } if(_smStartSec===_smEndSec) return;

    var clamped=clampNoOverlap(_smStartSec,_smEndSec,otherZones(_editId));
    if(!clamped){ if(window.showToast) showToast('Zone fully overlapped — not saved'); return; }

    
    var loopInp=document.getElementById('smLoopCountIn');
    var loopCountVal=parseLoop(loopInp?loopInp.value:'');
    var hasLoop=(loopCountVal!==0);
    var zoneType;
    if(_smZoneMode==='skip')                      zoneType='skip';
    else if(_smFxSpd&&!_smFxVol&&!hasLoop)        zoneType='spd';
    else if(_smFxVol&&!_smFxSpd&&!hasLoop)        zoneType='vol';
    else if(hasLoop&&!_smFxSpd&&!_smFxVol)        zoneType='loop';
    else                                           zoneType='combo';

    var nameMap={ skip:'Skip Zone', spd:'Effect Zone', vol:'Effect Zone', loop:'Effect Zone', combo:'Effect Zone' };
    var name=(document.getElementById('smLabel').value||'').trim()||(nameMap[zoneType]||'Zone');

    if(_editId){
      
      var ez2=find(_editId);
      if(ez2){
        ez2.label=name;
        ez2.type=zoneType;
        ez2.start=clamped.start;
        ez2.end=clamped.end;
        if(_smZoneMode==='skip'){
          delete ez2.spd; delete ez2.spdCurve;
          delete ez2.vol; delete ez2.volCurve;
          delete ez2.loopCount; delete ez2._loopsDone;
          delete ez2.teleportToZoneId;
        } else {
          if(_smFxSpd){ ez2.spd=_smSpd; ez2.spdCurve=CV.spd.pts.slice().sort(function(a,b){return a.pct-b.pct;}); }
          else { delete ez2.spd; delete ez2.spdCurve; }
          if(_smFxVol){ ez2.vol=_smVol; ez2.volCurve=CV.vol.pts.slice().sort(function(a,b){return a.pct-b.pct;}); }
          else { delete ez2.vol; delete ez2.volCurve; }
          var inp2=document.getElementById('smLoopCountIn');
          var lc2=parseLoop(inp2?inp2.value:'');
          if(lc2!==0){ ez2.loopCount=lc2; ez2._loopsDone=0; ez2._done=false; }
          else { delete ez2.loopCount; delete ez2._loopsDone; delete ez2._done; }
          
          delete ez2.teleportToZoneId;
          if(_smFxTeleport&&_smTeleportTimeSec!=null){ ez2.teleportTimeSec=_smTeleportTimeSec; } else { delete ez2.teleportTimeSec; }
        }
      }
      hideEditBanner();
      _smStartSec=null; _smEndSec=null;
      
      _inSpdZoneId=null; _inVolZoneId=null; _inComboZoneId=null;
      var lbl3=document.getElementById('smLabel'); if(lbl3) lbl3.value='';
      smRefresh(); renderList(); rebuildBar();
      
      (function(){
        var cur=getCur();
        if(ez2&&ez2.enabled&&cur>=ez2.start&&cur<ez2.end){
          var pct=(ez2.end>ez2.start)?(cur-ez2.start)/(ez2.end-ez2.start)*100:0;
          if(ez2.spd!=null||ez2.spdCurve){
            var sv=ez2.spdCurve?cvInterp(ez2.spdCurve,pct):(ez2.spd||1);
            sv=Math.round(sv*100)/100;
            _smthSpdCur=(typeof currentSpeed!=='undefined')?currentSpeed:1;
            setSpdSmooth(sv);
          }
          if(ez2.vol!=null||ez2.volCurve){
            var vv=ez2.volCurve?cvInterp(ez2.volCurve,pct):(ez2.vol!=null?ez2.vol:100);
            _smthVolCur=getRealVol();
            setVolSmooth(Math.round(vv*10)/10);
          }
        }
      })();
      if(window.showToast) showToast('"'+name+'" updated');
      smResetForm(); window.smSwitchTab('list');
      return;
    }

    
    if((window._smIdCtr||0)>_idCtr) _idCtr=window._smIdCtr;
    var z={ id:'sz'+(++_idCtr), label:name, type:zoneType, start:clamped.start, end:clamped.end, color:nextColor(zoneType), enabled:true };
    if(_smFxSpd){ z.spd=_smSpd; z.spdCurve=CV.spd.pts.slice().sort(function(a,b){return a.pct-b.pct;}); }
    if(_smFxVol){ z.vol=_smVol; z.volCurve=CV.vol.pts.slice().sort(function(a,b){return a.pct-b.pct;}); }
    var loopInpNew=document.getElementById('smLoopCountIn');
    var lcNew=parseLoop(loopInpNew?loopInpNew.value:'');
    if(lcNew!==0){ z.loopCount=lcNew; z._loopsDone=0; z._done=false; }
    if(_smFxTeleport&&_smTeleportTimeSec!=null){ z.teleportTimeSec=_smTeleportTimeSec; } else { delete z.teleportTimeSec; }
    window._skipZones.push(z); _smStartSec=null; _smEndSec=null;
    var lbl2=document.getElementById('smLabel'); if(lbl2) lbl2.value='';
    smRefresh(); renderList(); rebuildBar();
    
    (function(nz){
      var cur=getCur();
      if(nz.enabled&&cur>=nz.start&&cur<nz.end){
        var pct=(nz.end>nz.start)?(cur-nz.start)/(nz.end-nz.start)*100:0;
        if(nz.spd!=null||nz.spdCurve){ var sv=nz.spdCurve?cvInterp(nz.spdCurve,pct):(nz.spd||1); _smthSpdCur=(typeof currentSpeed!=='undefined')?currentSpeed:1; setSpdSmooth(Math.round(sv*100)/100); }
        if(nz.vol!=null||nz.volCurve){ var vv=nz.volCurve?cvInterp(nz.volCurve,pct):(nz.vol!=null?nz.vol:100); _smthVolCur=getRealVol(); setVolSmooth(Math.round(vv*10)/10); }
      }
    })(z);
    if(window.showToast) showToast('"'+name+'" added');
    smResetForm(); window.smSwitchTab('list');
  };

  window.smCancel=function(){
    document.getElementById('skipMarkBar').classList.remove('smActive');
    hideEditBanner();
    _smStartSec=null; _smEndSec=null; _smPausePosSec=null;
  };

  
  window.smToggleFx=function(key){
    if(key==='spd') _smFxSpd=!_smFxSpd;
    else if(key==='vol') _smFxVol=!_smFxVol;
    _smFxSyncUI();
    smRefresh();
  };

  
  window.smToggleTeleport=function(){
    _smFxTeleport=!_smFxTeleport;
    var tog=document.getElementById('smTeleportToggle');
    if(tog) tog.classList.toggle('is-on',_smFxTeleport);
    var body=document.getElementById('smTeleportBody');
    if(body) body.style.display=_smFxTeleport?'flex':'none';
    if(!_smFxTeleport){
      
      _smTeleportTimeSec=null;
      var inpH=document.getElementById('smTeleportH'),inpM=document.getElementById('smTeleportM'),inpS=document.getElementById('smTeleportS');
      if(inpH) inpH.value=0; if(inpM) inpM.value=0; if(inpS) inpS.value=0;
      var prev=document.getElementById('smTeleportPreview');
      if(prev) prev.style.display='none';
    } else {
      
      smTeleportTimeChanged();
    }
  };

  
  window.smTeleportTimeChanged=function(){
    var h=parseInt((document.getElementById('smTeleportH')||{}).value)||0;
    var m=parseInt((document.getElementById('smTeleportM')||{}).value)||0;
    var s=parseInt((document.getElementById('smTeleportS')||{}).value)||0;
    h=Math.max(0,Math.min(23,h)); m=Math.max(0,Math.min(59,m)); s=Math.max(0,Math.min(59,s));
    _smTeleportTimeSec=h*3600+m*60+s;
    var prev=document.getElementById('smTeleportPreview');
    var prevT=document.getElementById('smTeleportPreviewTime');
    if(prevT) prevT.textContent=fmt(_smTeleportTimeSec);
    if(prev) prev.style.display=_smFxTeleport?'inline':'none';
  };

  window.smTeleportMarkNow=function(){
    var cur=getCur();
    var h=Math.floor(cur/3600), m=Math.floor((cur%3600)/60), s=Math.floor(cur%60);
    var inpH=document.getElementById('smTeleportH'), inpM=document.getElementById('smTeleportM'), inpS=document.getElementById('smTeleportS');
    if(inpH) inpH.value=h; if(inpM) inpM.value=m; if(inpS) inpS.value=s;
    smTeleportTimeChanged();
    if(window.showToast) showToast('Teleport target: '+fmt(cur));
  };

  
  function smTeleportSetValue(val,label,color){
    
    var inp=document.getElementById('smTeleportSelect');
    if(inp) inp.value=val||'';
    _smTeleportZoneId=val||null;
    
    var lbl=document.getElementById('smTeleportLabel');
    if(lbl) lbl.textContent=label||(val?val:'— none (no teleport) —');
    
    var items=document.querySelectorAll('#smTeleportItems .tp-dd-opt');
    items.forEach(function(el){ el.classList.toggle('tp-selected', el.dataset.val===val); });
    
    smTeleportDdClose();
  }
  window.smTeleportSetValue=smTeleportSetValue;

  window.smTeleportDdToggle=function(e){
    e.stopPropagation();
    var dd=document.getElementById('smTeleportDd');
    if(!dd) return;
    var isOpen=dd.classList.contains('tp-open');
    if(!isOpen) smPopulateTeleportSelect();
    dd.classList.toggle('tp-open',!isOpen);
  };
  function smTeleportDdClose(){
    var dd=document.getElementById('smTeleportDd');
    if(dd) dd.classList.remove('tp-open');
  }
  
  document.addEventListener('click',function(e){
    var dd=document.getElementById('smTeleportDd');
    if(dd&&!dd.contains(e.target)) smTeleportDdClose();
  });

  
  function smPopulateTeleportSelect(){
    var container=document.getElementById('smTeleportItems'); if(!container) return;
    var currentVal=(document.getElementById('smTeleportSelect')||{}).value||'';
    container.innerHTML='';

    
    var noneBtn=document.createElement('button');
    noneBtn.className='tp-dd-opt tp-none'+(currentVal===''?' tp-selected':'');
    noneBtn.dataset.val='';
    noneBtn.type='button';
    noneBtn.innerHTML='<span class="tp-dd-name">— none (no teleport) —</span>';
    noneBtn.onclick=function(){ smTeleportSetValue('','— none (no teleport) —'); };
    container.appendChild(noneBtn);

    var zones=window._skipZones||[];
    
    var typeColor={'skip':'#f97316','effect':'#3b82f6','combo':'#8b5cf6','vol':'#10b981','spd':'#f59e0b','loop':'#ec4899','pause':'#6b7280'};
    zones.forEach(function(z){
      if(z.type==='pause') return;
      if(_editId&&z.id===_editId) return;
      var color=typeColor[z.type]||'#3b82f6';
      var timeStr=fmt(z.start)+' → '+fmt(z.end);
      var btn=document.createElement('button');
      btn.className='tp-dd-opt'+(z.id===currentVal?' tp-selected':'');
      btn.dataset.val=z.id;
      btn.type='button';
      btn.innerHTML='<span class="tp-dd-chip" style="background:'+color+'"></span>'
        +'<span class="tp-dd-name">'+z.label+'</span>'
        +'<span class="tp-dd-time">'+timeStr+'</span>';
      btn.onclick=(function(zid,zlabel,zcolor){
        return function(){ smTeleportSetValue(zid,zlabel,zcolor); };
      })(z.id,z.label,color);
      container.appendChild(btn);
    });

    
    if(currentVal){
      var found=zones.find(function(z){ return z.id===currentVal; });
      if(found){
        var lbl=document.getElementById('smTeleportLabel');
        if(lbl) lbl.textContent=found.label;
      }
    }
    _smTeleportZoneId=currentVal||null;
  }
  window.smPopulateTeleportSelect=smPopulateTeleportSelect;

  function _smFxSyncUI(){
    var togSpd=document.getElementById('smFxToggleSpd');
    var togVol=document.getElementById('smFxToggleVol');
    if(togSpd) togSpd.classList.toggle('is-on',_smFxSpd);
    if(togVol) togVol.classList.toggle('is-on',_smFxVol);
    
    var bodySpd=document.getElementById('smFxBodySpd');
    var curveSpd=document.getElementById('smFxCurveSpd');
    var bodyVol=document.getElementById('smFxBodyVol');
    var curveVol=document.getElementById('smFxCurveVol');
    var rowSpd=document.getElementById('smFxRowSpd');
    var rowVol=document.getElementById('smFxRowVol');
    if(bodySpd){ bodySpd.style.display='flex'; }
    if(curveSpd){ curveSpd.style.display='flex'; }
    if(rowSpd){ rowSpd.style.opacity=_smFxSpd?'1':'0.4'; }
    if(bodyVol){ bodyVol.style.display='flex'; }
    if(curveVol){ curveVol.style.display='flex'; }
    if(rowVol){ rowVol.style.opacity=_smFxVol?'1':'0.4'; }
    
    var rowLoop=document.getElementById('smFxRowLoop');
    if(rowLoop) rowLoop.style.opacity='1';
  }
  
  (function(){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',_smFxSyncUI); else _smFxSyncUI(); })();

  
  window._skipGlobal=true;
  window.skipToggleGlobal=function(){
    window._skipGlobal=!window._skipGlobal;
    (window._skipZones||[]).forEach(function(z){ z.enabled=window._skipGlobal; });
    var btn=document.getElementById('skipGlobalToggle'); if(btn){ btn.textContent='ALL ZONES  '+(window._skipGlobal?'ON':'OFF'); btn.classList.toggle('on',window._skipGlobal); }
    renderList(); rebuildBar();
    if(window.showToast) showToast('All zones '+(window._skipGlobal?'enabled':'disabled'));
  };

  window.openSkipModal=function(tab){ document.querySelectorAll('.dd.open').forEach(function(d){ d.classList.remove('open'); }); window.openWatchMark(tab||'add'); };
  window.closeSkipModal=function(){ window.smCancel(); };

  (function(){ var btn=document.getElementById('skipGlobalToggle'); if(!btn) return; btn.textContent='ALL ZONES  ON'; btn.classList.add('on'); })();

  
  window._checkSkipZones=function(cur){
    var zones=window._skipZones;

    for(var i=0;i<zones.length;i++){
      var z=zones[i]; if(z.type!=='skip'||!z.enabled) continue;
      if(cur>=z.start-0.05&&cur<z.end-0.3){
        if(_lastSkipId===z.id) continue;
        _lastSkipId=z.id; try{ player.seekTo(z.end,true); }catch(_){} toast('Skipped: '+z.label); return;
      }
    }
    if(!zones.some(function(z){ return z.type==='skip'&&z.enabled&&cur>=z.start-0.05&&cur<z.end; })) _lastSkipId=null;

    var avz=null; for(var j=0;j<zones.length;j++){ var vz=zones[j]; if(vz.type==='vol'&&vz.enabled&&cur>=vz.start&&cur<vz.end){ avz=vz; break; } }
    if(avz){
      if(_inVolZoneId!==avz.id){ _preZoneVol=getRealVol(); _smthVolCur=_preZoneVol; _inVolZoneId=avz.id; _userMuteLocked=false; _volZoneMuted=false; toast('Volume curve: '+avz.label); }
      var vzPct=(avz.end>avz.start)?(cur-avz.start)/(avz.end-avz.start)*100:0;
      var vzVal=avz.volCurve?cvInterp(avz.volCurve,vzPct):(avz.vol!=null?avz.vol:100);
      setVolSmooth(Math.round(vzVal*10)/10);
    }
    else { if(_inVolZoneId!==null){ var _exitVz=null; for(var _vi=0;_vi<zones.length;_vi++){ if(zones[_vi].id===_inVolZoneId){ _exitVz=zones[_vi]; break; } } _inVolZoneId=null; if(!_userMuteLocked) _volZoneMuted=false; if(_preZoneVol!==null){ setVolSmooth(_preZoneVol); _preZoneVol=null; } if(_exitVz&&_exitVz.teleportTimeSec!=null){ try{ player.seekTo(_exitVz.teleportTimeSec,true); }catch(_){} toast('Teleport: '+_exitVz.label); } } }

    var asz=null; for(var si=0;si<zones.length;si++){ var sz=zones[si]; if(sz.type==='spd'&&sz.enabled&&cur>=sz.start&&cur<sz.end){ asz=sz; break; } }
    if(asz){
      if(_inSpdZoneId!==asz.id){ _preZoneSpd=(typeof currentSpeed!=='undefined')?currentSpeed:1; _smthSpdCur=_preZoneSpd; _inSpdZoneId=asz.id; _userOverrideSpd=false; toast('Speed curve: '+asz.label); }
      var szPct=(asz.end>asz.start)?(cur-asz.start)/(asz.end-asz.start)*100:0;
      var szVal=asz.spdCurve?cvInterp(asz.spdCurve,szPct):(asz.spd!=null?asz.spd:1);
      setSpdSmooth(Math.round(szVal*100)/100);
    }
    else { if(_inSpdZoneId!==null){ var _exitSz=null; for(var _si2=0;_si2<zones.length;_si2++){ if(zones[_si2].id===_inSpdZoneId){ _exitSz=zones[_si2]; break; } } _inSpdZoneId=null; _userOverrideSpd=false; var rs=_preZoneSpd!==null?_preZoneSpd:1; _preZoneSpd=null; setSpdSmooth(rs); syncSpeedUI(rs); if(_exitSz&&_exitSz.teleportTimeSec!=null){ try{ player.seekTo(_exitSz.teleportTimeSec,true); }catch(_){} toast('Teleport: '+_exitSz.label); } } }

    for(var pi=0;pi<zones.length;pi++){
      var pz=zones[pi]; if(pz.type!=='pause'||!pz.enabled) continue;
      var near=cur>=pz.position-0.1&&cur<pz.position+0.5;
      if(near){
        if(!pz._pauseFired){
          if(pz.pauseMode==='pauseuntil'&&pz.pauseUntilUTC!=null){
            
            var _nd=new Date();
            var _nowUTCS=_nd.getUTCHours()*3600+_nd.getUTCMinutes()*60+_nd.getUTCSeconds();
            if(_nowUTCS>=pz.pauseUntilUTC){
              
              pz._pauseFired=true;
            } else {
              
              pz._pauseFired=true;
              try{ player.pauseVideo(); }catch(_){} toast('Paused until GMT: '+pz.label);
              (function(zone){
                var _poll=setInterval(function(){
                  var nd=new Date();
                  var nowS=nd.getUTCHours()*3600+nd.getUTCMinutes()*60+nd.getUTCSeconds();
                  
                  var passed=(nowS>=zone.pauseUntilUTC)||(zone.pauseUntilUTC>82800&&nowS<3600);
                  if(passed){ clearInterval(_poll); try{ player.playVideo(); }catch(_){} toast('Resuming: '+zone.label); }
                },1000);
              })(pz);
            }
          } else {
            pz._pauseFired=true; try{ player.pauseVideo(); }catch(_){}
            if(pz.pauseMode==='timer'&&pz.pauseSec>0){
              toast('Paused for '+pz.pauseSec+'s  ('+pz.label+')');
              (function(zone){ setTimeout(function(){ try{ player.playVideo(); }catch(_){} toast('Resuming: '+zone.label); },zone.pauseSec*1000); })(pz);
            } else toast('Paused: '+pz.label);
          }
        }
      }
      else pz._pauseFired=false;
    }

    var acz=null; for(var ci=0;ci<zones.length;ci++){ var cz=zones[ci]; if(cz.type==='combo'&&cz.enabled&&cur>=cz.start&&cur<cz.end){ acz=cz; break; } }
    if(acz){
      if(_inComboZoneId!==acz.id){
        _inComboZoneId=acz.id; _userOverrideSpd=false; _userMuteLocked=false; _volZoneMuted=false; var cparts=[];
        if(acz.spd!=null){ _preComboSpd=(typeof currentSpeed!=='undefined')?currentSpeed:1; cparts.push('spd curve'); }
        if(acz.vol!=null){ _preComboVol=getRealVol(); cparts.push('vol curve'); }
        if(acz.loopCount!=null&&acz.loopCount!==0){
          cparts.push('loop');
          if(!_loopSeekActive&&!acz._done){
            acz._finalPass=false;
            if(window._updateLoopLabel) window._updateLoopLabel(acz.id, acz.label+' ('+(acz.loopCount===-1?'inf':'0')+')');
          }
        }
        toast((cparts.length?cparts.join(' + ')+' ':'')+'('+acz.label+')');
      }
      var czPct=(acz.end>acz.start)?(cur-acz.start)/(acz.end-acz.start)*100:0;
      if(acz.spd!=null){ var czSpd=acz.spdCurve?cvInterp(acz.spdCurve,czPct):acz.spd; setSpdSmooth(Math.round(czSpd*100)/100); }
      if(acz.vol!=null){ var czVol=acz.volCurve?cvInterp(acz.volCurve,czPct):acz.vol; setVolSmooth(Math.round(czVol*10)/10); }
      
      if(acz._atEndBoundary&&cur<acz.end-0.8){ acz._atEndBoundary=false; }
      if(acz.loopCount!=null&&acz.loopCount!==0&&cur>=acz.end-1.5&&cur<acz.end+5.0){
        if(!acz._atEndBoundary){
          acz._atEndBoundary=true;
          var aczInf=(acz.loopCount===-1);
          if(!acz._done&&(aczInf||(acz._loopsDone||0)<acz.loopCount)){
            acz._loopsDone=(acz._loopsDone||0)+1;
            
            _loopSeekActive=true;
            try{ player.seekTo(acz.start,true); }catch(_){}
            setTimeout(function(){ _loopSeekActive=false; },800);
            var aczCountStr=aczInf?'inf':acz._loopsDone;
            loopToast('('+aczCountStr+') '+acz.label);
            if(window._updateLoopLabel) window._updateLoopLabel(acz.id, acz.label+' ('+aczCountStr+')');
          } else if(!acz._done&&!acz._finalPass){
            
            acz._finalPass=true;
            _loopSeekActive=true;
            try{ player.seekTo(acz.start,true); }catch(_){}
            setTimeout(function(){ _loopSeekActive=false; },800);
            loopToast('(−) '+acz.label);
            if(window._updateLoopLabel) window._updateLoopLabel(acz.id, acz.label+' (-)');
          } else if(!acz._done){
            
            acz._done=true; acz._finalPass=false; _inComboZoneId=null;
            if(acz.teleportTimeSec!=null){ try{ player.seekTo(acz.teleportTimeSec,true); }catch(_){} toast('Teleport: '+acz.label); }
          }
          return;
        }
      }
    } else {
      if(_inComboZoneId!==null&&!_loopSeekActive){
        var _exitAcz=null; for(var _ei=0;_ei<zones.length;_ei++){ if(zones[_ei].id===_inComboZoneId){ _exitAcz=zones[_ei]; break; } }
        
        if(_exitAcz&&cur>=_exitAcz.end&&!_exitAcz._atEndBoundary&&!_exitAcz._done&&_exitAcz.loopCount!=null&&_exitAcz.loopCount!==0){
          var _aczInfEx=(_exitAcz.loopCount===-1);
          if(_aczInfEx||(_exitAcz._loopsDone||0)<_exitAcz.loopCount){
            _exitAcz._atEndBoundary=true; _exitAcz._loopsDone=(_exitAcz._loopsDone||0)+1;
            _loopSeekActive=true; try{ player.seekTo(_exitAcz.start,true); }catch(_){}
            setTimeout(function(){ _loopSeekActive=false; },800);
            var _aczExStr=_aczInfEx?'inf':_exitAcz._loopsDone;
            loopToast('('+_aczExStr+') '+_exitAcz.label);
            if(window._updateLoopLabel) window._updateLoopLabel(_exitAcz.id, _exitAcz.label+' ('+_aczExStr+')');
            return;
          } else if(!_exitAcz._finalPass){
            _exitAcz._atEndBoundary=true; _exitAcz._finalPass=true;
            _loopSeekActive=true; try{ player.seekTo(_exitAcz.start,true); }catch(_){}
            setTimeout(function(){ _loopSeekActive=false; },800);
            loopToast('(−) '+_exitAcz.label);
            if(window._updateLoopLabel) window._updateLoopLabel(_exitAcz.id, _exitAcz.label+' (-)');
            return;
          }
        }
        
        
        var _exitCz=null; for(var _eci=0;_eci<zones.length;_eci++){ if(zones[_eci].id===_inComboZoneId){ _exitCz=zones[_eci]; break; } }
        _userOverrideSpd=false; if(!_userMuteLocked) _volZoneMuted=false; if(_preComboSpd!==null){ setSpdSmooth(_preComboSpd); _preComboSpd=null; } if(_preComboVol!==null){ setVolSmooth(_preComboVol); _preComboVol=null; } _inComboZoneId=null;
        if(_exitCz&&_exitCz.teleportTimeSec!=null){ try{ player.seekTo(_exitCz.teleportTimeSec,true); }catch(_){} toast('Teleport: '+_exitCz.label); }
      }
    }

    for(var li=0;li<zones.length;li++){
      var lz=zones[li]; if(lz.type!=='loop'||!lz.enabled) continue;
      if(lz.loopCount===0) continue;
      var lzIn=cur>=lz.start&&cur<lz.end;
      var lzNearEnd=cur>=lz.end-1.5&&cur<lz.end+5.0;
      var lzTracking=(_inLoopZoneId===lz.id);
      
      if(lzIn&&!lzTracking&&!lzNearEnd){
        
        if(_inLoopZoneId!==null&&_inLoopZoneId!==lz.id){
          
          for(var _cli=0;_cli<zones.length;_cli++){
            if(zones[_cli].id===_inLoopZoneId){ zones[_cli]._atEndBoundary=false; break; }
          }
          _inLoopZoneId=null;
        }
        _inLoopZoneId=lz.id;
        if(!_loopSeekActive&&!lz._done){
          lz._atEndBoundary=false; lz._finalPass=false;
          
          if(window._updateLoopLabel) window._updateLoopLabel(lz.id, lz.label+' ('+(lz.loopCount===-1?'inf':'0')+')');
        }
      }
      
      if(!lzIn&&!lzNearEnd&&lzTracking&&!_loopSeekActive){
        
        if(cur>=lz.end&&!lz._atEndBoundary&&!lz._done){
          var lzInfEx=(lz.loopCount===-1);
          if(lzInfEx||(lz._loopsDone||0)<lz.loopCount){
            lz._atEndBoundary=true; lz._loopsDone=(lz._loopsDone||0)+1;
            _loopSeekActive=true; try{ player.seekTo(lz.start,true); }catch(_){}
            setTimeout(function(){ _loopSeekActive=false; },800);
            var lzExStr=lzInfEx?'inf':lz._loopsDone;
            if(window.showToast) showToast('('+lzExStr+') '+lz.label);
            if(window._updateLoopLabel) window._updateLoopLabel(lz.id, lz.label+' ('+lzExStr+')');
            return;
          } else if(!lz._finalPass){
            lz._atEndBoundary=true; lz._finalPass=true;
            _loopSeekActive=true; try{ player.seekTo(lz.start,true); }catch(_){}
            setTimeout(function(){ _loopSeekActive=false; },800);
            if(window.showToast) showToast('(−) '+lz.label);
            if(window._updateLoopLabel) window._updateLoopLabel(lz.id, lz.label+' (-)');
            return;
          }
        }
        _inLoopZoneId=null; lz._atEndBoundary=false;
        
        continue;
      }
      if(!lzIn&&!lzNearEnd) continue;
      
      if(lz._atEndBoundary&&cur<lz.end-1.5){ lz._atEndBoundary=false; }
      
      if(cur>=lz.end-1.5){
        
        if(!lzTracking){
          
          if(_inLoopZoneId!==null&&_inLoopZoneId!==lz.id){
            for(var _lci=0;_lci<zones.length;_lci++){
              if(zones[_lci].id===_inLoopZoneId){ zones[_lci]._atEndBoundary=false; break; }
            }
          }
          _inLoopZoneId=lz.id;
        }
        if(lz._atEndBoundary) continue; 
        lz._atEndBoundary=true;
        var lzInf=(lz.loopCount===-1);
        if(!lz._done&&(lzInf||(lz._loopsDone||0)<lz.loopCount)){
          lz._loopsDone=(lz._loopsDone||0)+1;
          _loopSeekActive=true;
          try{ player.seekTo(lz.start,true); }catch(_){}
          setTimeout(function(){ _loopSeekActive=false; },800);
          var lzCountStr=lzInf?'inf':lz._loopsDone;
          if(window.showToast) showToast('('+lzCountStr+') '+lz.label);
          if(window._updateLoopLabel) window._updateLoopLabel(lz.id, lz.label+' ('+lzCountStr+')');
        } else if(!lz._done&&!lz._finalPass){
          
          lz._finalPass=true;
          _loopSeekActive=true;
          try{ player.seekTo(lz.start,true); }catch(_){}
          setTimeout(function(){ _loopSeekActive=false; },800);
          if(window.showToast) showToast('(−) '+lz.label);
          if(window._updateLoopLabel) window._updateLoopLabel(lz.id, lz.label+' (-)');
        } else if(!lz._done){
          
          lz._done=true; lz._finalPass=false; _inLoopZoneId=null;
          if(lz.teleportTimeSec!=null){ try{ player.seekTo(lz.teleportTimeSec,true); }catch(_){} toast('Teleport: '+lz.label); }
        }
        return;
      }
    }
  };

  
  (function tryWrapMute(){
    if(typeof window.toggleMuteClick==='function'){
      var _om=window.toggleMuteClick;
      window.toggleMuteClick=function(e){
        
        var wasMuted=false;
        try{ wasMuted=!!isMuted; }catch(_){ try{ wasMuted=!!player.isMuted(); }catch(_2){} }
        _om.call(this,e);
        
        setTimeout(function(){
          var nowMuted=false;
          try{ nowMuted=!!isMuted; }catch(_){ try{ nowMuted=!!player.isMuted(); }catch(_2){} }
          if(wasMuted&&!nowMuted&&!_userMuteLocked){
            
            _inVolZoneId=null; _inComboZoneId=null;
            _volZoneMuted=false; _smthVolCur=null; _smthVolTgt=null;
            
            var cur=getCur(), zones=window._skipZones||[];
            for(var i=0;i<zones.length;i++){
              var z=zones[i];
              if((z.type==='vol'||(z.type==='combo'&&z.vol!=null))&&z.enabled&&cur>=z.start&&cur<z.end){
                var pct=(z.end>z.start)?(cur-z.start)/(z.end-z.start)*100:0;
                var tgt=z.volCurve?cvInterp(z.volCurve,pct):(z.vol!=null?z.vol:100);
                _smthVolCur=getRealVol(); setVolSmooth(Math.round(tgt*10)/10);
                break;
              }
            }
          }
        },50);
      };
    } else {
      setTimeout(tryWrapMute,600);
    }
  })();

  window._snapSeekPastZones=function(t){
    var dvz=null; var vz2=window._skipZones.filter(function(z){ return z.enabled&&(z.type==='vol'||(z.type==='combo'&&z.vol!=null)); });
    for(var i=0;i<vz2.length;i++){ if(t>=vz2[i].start&&t<vz2[i].end){ dvz=vz2[i]; break; } }
    if(dvz){
      
      _userMuteLocked=false; _volZoneMuted=false;
      if(dvz.id!==_inVolZoneId){ if(_inVolZoneId!==null&&_preZoneVol!==null){ setVolUI(_preZoneVol); _preZoneVol=null; } _inVolZoneId=null; }
    }
    else { if(_inVolZoneId!==null&&_preZoneVol!==null){ if(!_userMuteLocked) setVolUI(_preZoneVol); _preZoneVol=null; } _inVolZoneId=null; if(!_userMuteLocked) _volZoneMuted=false; }
    var dsz=null; var sz2=window._skipZones.filter(function(z){ return z.enabled&&(z.type==='spd'||(z.type==='combo'&&z.spd!=null)); });
    for(var j=0;j<sz2.length;j++){ if(t>=sz2[j].start&&t<sz2[j].end){ dsz=sz2[j]; break; } }
    
    if(dsz){ _userOverrideSpd=false; }
    if(!dsz||dsz.id!==_inSpdZoneId){ if(_inSpdZoneId!==null&&_preZoneSpd!==null){ var rsp=_preZoneSpd; _preZoneSpd=null; try{ player.setPlaybackRate(rsp); }catch(_){} syncSpeedUI(rsp); } _inSpdZoneId=null; _userOverrideSpd=false; }
    
    var wasLoopSeek=_loopSeekActive;
    if(_loopSeekActive){ _loopSeekActive=false; }
    if(!wasLoopSeek){ _inLoopZoneId=null; }
    if(!wasLoopSeek&&_inComboZoneId!==null){ if(_preComboSpd!==null){ try{ player.setPlaybackRate(_preComboSpd); }catch(_){} _preComboSpd=null; } if(_preComboVol!==null&&!_userMuteLocked){ setVolUI(_preComboVol); } _preComboVol=null; _inComboZoneId=null; }
    
    if(!wasLoopSeek){ window._skipZones.forEach(function(z){ if(z.loopCount!=null&&z.loopCount!==0){ z._loopsDone=0; z._atEndBoundary=false; z._finalPass=false; z._done=false; if(window._updateLoopLabel) window._updateLoopLabel(z.id, z.label); } }); }
    window._skipZones.forEach(function(z){ if(z.type==='pause'&&(t<z.position||t>z.position+1)) z._pauseFired=false; });
    return t;
  };

  
  (function tryRestore(){
    if(typeof window._restoreZonesReady==='function'){
      window._restoreZonesReady();
    } else {
      setTimeout(tryRestore, 100);
    }
  })();
})();

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
      // Drive unified seek bar (chapters + A-B merged into one set of segments)
      if(window._abUpdateFills) window._abUpdateFills(pct);
      // Only update plain seekFill when unified bar is NOT active
      if(!$('seekTrack').classList.contains('bar-active'))
        $('seekFill').style.width = pct + '%';
      $('timeDisplay').textContent = fmt(cur) + ' / ' + fmt(dur);
    }
    if (autoStopEndOfVideo && !loopEnabled && dur > 0 && cur >= dur - 0.5) {
      player.pauseVideo(); clearAutoStop();
    }
    checkVideoTimeStop(cur);
    checkChapterChange(cur);
    if(window._checkSkipZones) window._checkSkipZones(cur);

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
  /* Feed chapter cut points (as % of duration) into the unified bar system.
     window._barChapPcts holds the internal boundary percentages.
     window._barBuild() merges them with any A/B points and builds one DOM. */
  window._barChapPcts = [];

  /* Remove any legacy chapter DOM elements that may exist */
  document.querySelectorAll('.seek-chapter-gap,.seek-chap-seg,.seek-chap-fill').forEach(e=>e.remove());

  if(!chapters.length||!player) {
    if(window._barBuild) window._barBuild();
    return;
  }
  let dur=0; try{dur=player.getDuration()||0;}catch(_){}
  if(!dur){ if(window._barBuild) window._barBuild(); return; }

  /* Chapter boundaries: skip first chapter (it starts at 0) */
  window._barChapPcts = chapters.slice(1).map(c=>c.sec/dur*100).filter(p=>p>0&&p<100);

  if(window._barBuild) window._barBuild();
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
      window.ytPlayer = player; // keep reference in sync
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
    window.ytPlayer = player; // expose for A-B loop and other scripts
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
    let targetSec=pct*(player.getDuration()||0);
    // Snap past any skip zone the user dragged into
    if(window._snapSeekPastZones) targetSec=window._snapSeekPastZones(targetSec);
    const snappedPct=targetSec/(player.getDuration()||1);
    if(!$('seekTrack').classList.contains('bar-active'))
      $('seekFill').style.width=(snappedPct*100)+'%';
    else if(window._abUpdateFills) window._abUpdateFills(snappedPct*100);
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
