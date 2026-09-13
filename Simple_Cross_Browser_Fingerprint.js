const BrowserPrint = (() => {
  'use strict';

  const SIGNAL_DEFS = [
    { key: 'webgl',        label: 'WebGL parameters',   bits: 6, stable: true },
    { key: 'screen',       label: 'Screen resolution',  bits: 5, stable: true },
    { key: 'timezone',     label: 'Timezone',           bits: 4, stable: true },
    { key: 'platform',     label: 'Platform',           bits: 3, stable: true },
    { key: 'touch',        label: 'Touch support',      bits: 1, stable: true },
    { key: 'cookies',      label: 'Cookies enabled',    bits: 1, stable: true },
    { key: 'localStorage', label: 'localStorage',       bits: 1, stable: true },
  ];

  const VISIBLE_KEYS = [
    'webgl', 'screen', 'timezone', 'platform', 'touch', 'cookies', 'localStorage',
  ];

  async function sha256Hex(str) {
    const bytes = new TextEncoder().encode(str);
    const digestBuf = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digestBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function collectCanvas() {
    try {
      const cv = document.createElement('canvas');
      cv.width = 280; cv.height = 60;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#f0f0f0'; ctx.fillRect(0, 0, 280, 60);
      ctx.font = '14px Arial'; ctx.fillStyle = '#333';
      ctx.fillText('BrowserFingerprint 🖥️', 10, 30);
      ctx.strokeStyle = 'rgba(100,200,150,0.5)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(240, 30, 18, 0, Math.PI * 2); ctx.stroke();
      const data = cv.toDataURL();
      const h = await sha256Hex(data);
      return { hash: '#' + h.slice(0, 16), blocked: false };
    } catch (e) {
      return { hash: 'blocked', blocked: true };
    }
  }

  function collectWebGL() {
    const gl = document.createElement('canvas').getContext('webgl')
              || document.createElement('canvas').getContext('experimental-webgl');
    if (!gl) return null;
    const ext = gl.getExtension('WEBGL_draw_buffers');
    const vp = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    return {
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxViewport: vp ? [vp[0], vp[1]] : null,
      maxDrawBuffers: ext ? gl.getParameter(ext.MAX_DRAW_BUFFERS_WEBGL) : null,
      maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
      maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
    };
  }

  function landscapeDims(w, h) {
    return w >= h ? [w, h] : [h, w];
  }

  function collectScreen() {
    const [w, h]   = landscapeDims(screen.width, screen.height);
    const [aw, ah] = landscapeDims(screen.availWidth, screen.availHeight);
    return {
      width: w, height: h,
      availWidth: aw, availHeight: ah,
      devicePixelRatio: Math.round(window.devicePixelRatio * 100) / 100,
      orientation: 'landscape',
    };
  }

  function spoofPlatform(raw) {
    if (raw === 'iPhone' || raw === 'iPad') return 'MacIntel';
    return raw;
  }

  function collectSystem() {
    const rawPlatform = navigator.platform || null;
    const isIOS = rawPlatform === 'iPhone' || rawPlatform === 'iPad';
    return {
      cores: navigator.hardwareConcurrency || null,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      language: navigator.language || null,
      languages: navigator.languages ? navigator.languages.join(',') : (navigator.language || null),
      platform: isIOS ? 'MacIntel' : (rawPlatform || null),
      maxTouchPoints: isIOS ? 0 : (navigator.maxTouchPoints || 0),
    };
  }

  function collectBrowser() {
    const dnt = navigator.doNotTrack === '1' ? 'on'
              : navigator.doNotTrack === '0' ? 'off' : 'unset';
    let lsOk = false;
    try { localStorage.setItem('_fp','1'); localStorage.removeItem('_fp'); lsOk = true; } catch(e) {}
    return {
      doNotTrack: dnt,
      cookiesEnabled: navigator.cookieEnabled,
      localStorageAvailable: lsOk,
      pluginCount: navigator.plugins ? navigator.plugins.length : 0,
    };
  }

  async function collect(signals) {
    const all = !signals;
    const inc = k => all || signals.includes(k);
    const data = {};
    if (inc('canvas'))    data.canvas  = await collectCanvas();
    if (inc('webgl'))     data.webgl   = collectWebGL();
    if (inc('screen'))    data.screen  = collectScreen();
    if (inc('cpu') || inc('timezone') || inc('platform') || inc('touch')
        || inc('languages'))
                          data.system  = collectSystem();
    if (inc('plugins') || inc('cookies') || inc('localStorage'))
                          data.browser = collectBrowser();
    return data;
  }

  function buildParts(data, keys) {
    const all = !keys;
    const inc = k => all || keys.includes(k);
    const parts = [];
    if (inc('canvas') && data.canvas)
      parts.push('canvas:' + data.canvas.hash);
    if (inc('webgl') && data.webgl) {
      const g = data.webgl;
      parts.push('webgl:' + [g.maxViewport, g.maxDrawBuffers,
        g.maxVertexUniformVectors, g.maxFragmentUniformVectors].join(','));
    }
    if (inc('screen') && data.screen) {
      const s = data.screen;
      parts.push('screen:' + s.width + 'x' + s.height);
    }
    if (data.system) {
      if (inc('cpu'))       parts.push('cpu:'   + data.system.cores);
      if (inc('timezone'))  parts.push('tz:'    + data.system.timezone);
      if (inc('platform'))  parts.push('plat:'  + data.system.platform);
      if (inc('touch'))     parts.push('touch:' + data.system.maxTouchPoints);
      if (inc('languages')) parts.push('lang:'  + data.system.languages);
    }
    if (inc('plugins') && data.browser)
      parts.push('plug:' + data.browser.pluginCount);
    if (inc('cookies') && data.browser)
      parts.push('cookies:' + data.browser.cookiesEnabled);
    if (inc('localStorage') && data.browser)
      parts.push('ls:' + data.browser.localStorageAvailable);
    return parts;
  }

  async function hash(data, keys) {
    const str = buildParts(data, keys).join('|');
    return await sha256Hex(str);
  }

  function breakdown(data, keys) {
    return buildParts(data, keys);
  }

  function snapshot(data, keys) {
    const all = !keys;
    const inc = k => all || keys.includes(k);
    const out = {};
    if (inc('canvas') && data.canvas) out.canvas = data.canvas.hash;
    if (inc('webgl') && data.webgl) {
      const g = data.webgl;
      out.webgl = {
        maxViewport: g.maxViewport,
        maxDrawBuffers: g.maxDrawBuffers,
        maxVertexUniformVectors: g.maxVertexUniformVectors,
        maxFragmentUniformVectors: g.maxFragmentUniformVectors,
      };
    }
    if (inc('screen') && data.screen) out.screen = data.screen.width + 'x' + data.screen.height;
    if (data.system) {
      if (inc('cpu'))       out.cpu = data.system.cores;
      if (inc('timezone'))  out.timezone = data.system.timezone;
      if (inc('platform'))  out.platform = data.system.platform;
      if (inc('touch'))     out.touch = data.system.maxTouchPoints;
      if (inc('languages')) out.languages = data.system.languages;
    }
    if (inc('plugins') && data.browser) out.plugins = data.browser.pluginCount;
    if (inc('cookies') && data.browser) out.cookies = data.browser.cookiesEnabled;
    if (inc('localStorage') && data.browser) out.localStorage = data.browser.localStorageAvailable;
    return out;
  }

  function entropy(data, keys) {
    const all = !keys;
    const inc = k => all || keys.includes(k);
    let bits = 0;
    SIGNAL_DEFS.forEach(s => { if (inc(s.key)) bits += s.bits; });
    return bits;
  }

  async function fingerprint(keys) {
    const data = await collect(keys);
    const h = await hash(data, keys);
    const bits = entropy(data, keys);
    return { hash: h, data, bits };
  }

  async function getHash(keys) {
    const data = await collect(keys || VISIBLE_KEYS);
    return await hash(data, keys || VISIBLE_KEYS);
  }

  function format(h) {
    return h;
  }

  return { collect, hash, breakdown, snapshot, entropy, fingerprint, getHash, format,
    SIGNAL_DEFS, VISIBLE_KEYS, landscapeDims };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BrowserPrint;
}
