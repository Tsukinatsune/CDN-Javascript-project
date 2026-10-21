(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.ColorLibrary = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  

  
  function hexToRGB(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length !== 6) return null;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (isNaN(r) || isNaN(g) || isNaN(b)) ? null : { r, g, b };
  }

  
  function toHex(r, g, b) {
    return '#' + [r, g, b]
      .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('');
  }

  
  function rgbToHSL(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  
  function hslToRGB(h, s, l) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h / 30) % 12;
      return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
  }

  
  function rgbToHSV(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h, s = max === 0 ? 0 : d / max, v = max;
    if (d === 0) { h = 0; }
    else {
      switch (max) {
        case r: h = ((g - b) / d) % 6; break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
    }
    h = Math.round((h / 6) * 360 + 360) % 360;
    return { h, s: Math.round(s * 100), v: Math.round(v * 100) };
  }

  
  function rgbToCMYK(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const k = 1 - Math.max(r, g, b);
    if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
    const c = (1 - r - k) / (1 - k);
    const m = (1 - g - k) / (1 - k);
    const y = (1 - b - k) / (1 - k);
    return { c: Math.round(c * 100), m: Math.round(m * 100), y: Math.round(y * 100), k: Math.round(k * 100) };
  }

  
  function rgbToXYZ(r, g, b) {
    const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const R = lin(r), G = lin(g), B = lin(b);
    return {
      x: (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) * 100,
      y: (R * 0.2126729 + G * 0.7151522 + B * 0.0721750) * 100,
      z: (R * 0.0193339 + G * 0.1191920 + B * 0.9503041) * 100,
    };
  }

  
  function xyzToLAB(x, y, z) {
    const fn = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
    const fx = fn(x / 95.047), fy = fn(y / 100), fz = fn(z / 108.883);
    return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
  }

  
  function rgbToLAB(r, g, b) {
    const xyz = rgbToXYZ(r, g, b);
    return xyzToLAB(xyz.x, xyz.y, xyz.z);
  }

  
  function labToLCH(L, a, b) {
    const C = Math.sqrt(a * a + b * b);
    let H = Math.atan2(b, a) * (180 / Math.PI);
    if (H < 0) H += 360;
    return { L, C, H };
  }

  
  function rgbToLCH(r, g, b) {
    const lab = rgbToLAB(r, g, b);
    return labToLCH(lab.L, lab.a, lab.b);
  }

  
  function rgbToOklch(r, g, b) {
    const xyz = rgbToXYZ(r, g, b);
    const fx = xyz.x / 100, fy = xyz.y / 100, fz = xyz.z / 100;
    const l = Math.cbrt(0.8189330101 * fx + 0.3618667424 * fy - 0.1288597137 * fz);
    const m = Math.cbrt(0.0329845436 * fx + 0.9293118715 * fy + 0.0361456387 * fz);
    const s = Math.cbrt(0.0482003018 * fx + 0.2643662691 * fy + 0.6338517070 * fz);
    const L = 0.2104542553 * (l + m) - 0.7936177850 * (l + m) / 2 + 0.3799122022 * (l - m) / 2;
    const a = 1.9779984951 * (l + m) - 2.4285922050 * (l + m) / 2 + 0.4505965719 * (l - m) / 2;
    const bv = 0.0259040371 * (l + m) + 0.7827717662 * (l + m) / 2 - 0.8086757660 * (l - m) / 2;
    const C = Math.sqrt(a * a + bv * bv);
    let H = Math.atan2(bv, a) * (180 / Math.PI); if (H < 0) H += 360;
    return { L: +(L * 100).toFixed(1), C: +C.toFixed(4), H: +H.toFixed(1) };
  }

  
  function relativeLuminance(r, g, b) {
    const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }

  
  function contrastRatio(r1, g1, b1, r2, g2, b2) {
    const l1 = relativeLuminance(r1, g1, b1), l2 = relativeLuminance(r2, g2, b2);
    const bright = Math.max(l1, l2), dark = Math.min(l1, l2);
    return (bright + 0.05) / (dark + 0.05);
  }

  
  function perceivedBrightness(r, g, b) {
    return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  
  function hueName(h) {
    const names = [
      ['Red', 0], ['Red-Orange', 15], ['Orange', 30], ['Yellow-Orange', 45],
      ['Yellow', 60], ['Yellow-Green', 75], ['Chartreuse', 90], ['Green', 120],
      ['Teal-Green', 150], ['Cyan', 180], ['Sky Blue', 210], ['Blue', 240],
      ['Blue-Violet', 270], ['Violet', 285], ['Purple', 300], ['Magenta', 315],
      ['Pink', 330], ['Rose', 345], ['Red', 360],
    ];
    for (let i = names.length - 1; i >= 0; i--) if (h >= names[i][1]) return names[i][0];
    return 'Red';
  }

  

  function _toneWord(h, s) {
    if (s < 35) return '';
    if (h >= 180 && h < 260 && s > 55) return 'Cool';
    if (h >= 260 && h < 310) return 'Warm';
    return '';
  }

  function _chromaWord(s) {
    if (s < 18) return '';
    if (s < 28) return 'Dusty';
    if (s < 42) return 'Muted';
    if (s < 58) return 'Soft';
    if (s > 90) return 'Electric';
    if (s > 82) return 'Vivid';
    if (s > 70) return 'Bold';
    return '';
  }

  function _valueWord(l) {
    if (l > 88) return 'Pale';
    if (l > 75) return 'Light';
    if (l > 36) return '';
    if (l > 24) return 'Dark';
    if (l > 14) return 'Shadow';
    return 'Midnight';
  }

  function _hueFamilyWord(h, s, l, mode) {
    const dark = l < 30, light = l > 65, vivid = s > 70;
    const hn = h % 360;
    const pick = (muted, tinted, dk, vv, lt, mid) => {
      if (mode === 'muted') return muted;
      if (mode === 'tinted') return tinted;
      if (dark) return dk;
      if (vivid) return vv;
      if (light) return lt;
      return mid;
    };
    if (hn >= 345 || hn < 12)  return pick('Red',    'Rose',      'Garnet',       'Scarlet',        'Blush',       'Crimson');
    if (hn < 25)               return pick('Red',    'Salmon',    'Rust',         'Flame',          'Coral',       'Vermillion');
    if (hn < 42)               return pick('Orange', 'Peach',     'Burnt Orange', 'Tangerine',      'Apricot',     'Orange');
    if (hn < 52)               return pick('Amber',  'Honey',     'Bronze',       'Amber',          'Marigold',    'Amber');
    if (hn < 62)               return pick('Gold',   'Straw',     'Ochre',        'Saffron',        'Butter',      'Gold');
    if (hn < 75)               return pick('Yellow', 'Cream',     'Olive',        'Canary',         'Lemon',       'Yellow');
    if (hn < 92)               return pick('Green',  'Celadon',   'Avocado',      'Chartreuse',     'Pistachio',   'Lime');
    if (hn < 112)              return pick('Green',  'Sage',      'Fern',         'Grass',          'Mint',        'Leaf Green');
    if (hn < 145)              return pick('Green',  'Sage',      'Forest',       'Emerald',        'Spearmint',   'Green');
    if (hn < 165)              return pick('Teal',   'Sea Foam',  'Hunter Green', 'Jade',           'Sea Foam',    'Viridian');
    if (hn < 185)              return pick('Teal',   'Aqua',      'Deep Teal',    'Teal',           'Aquamarine',  'Teal');
    if (hn < 200)              return pick('Teal',   'Sky',       'Petrol',       'Cyan',           'Turquoise',   'Cyan Teal');
    if (hn < 218)              return pick('Blue',   'Sky',       'Steel Blue',   'Cerulean',       'Baby Blue',   'Sky Blue');
    if (hn < 240)              return pick('Blue',   'Periwinkle','Cobalt',        'Royal Blue',     'Cornflower',  'Blue');
    if (hn < 255)              return pick('Blue',   'Periwinkle','Navy',          'Ultramarine',    'Periwinkle',  'Deep Blue');
    if (hn < 272)              return pick('Indigo', 'Wisteria',  'Midnight Blue', 'Indigo',         'Iris',        'Indigo');
    if (hn < 288)              return pick('Violet', 'Lavender',  'Byzantium',    'Electric Violet','Lavender',    'Violet');
    if (hn < 308)              return pick('Purple', 'Lilac',     'Grape',        'Purple',         'Lilac',       'Purple');
    if (hn < 330)              return pick('Plum',   'Mauve',     'Eggplant',     'Amethyst',       'Mauve',       'Plum');
    return                           pick('Pink',    'Rose',      'Berry',        'Magenta',        'Pink',        'Rose');
  }

  
  function synthesizeName(r, g, b) {
    const { h, s, l } = rgbToHSL(r, g, b);

    if (s < 6) {
      if (l > 97) return 'Pure White';
      if (l > 93) return 'Snow';
      if (l > 88) return 'Ivory';
      if (l > 82) return 'Pearl';
      if (l > 75) return 'Parchment';
      if (l > 67) return 'Silver';
      if (l > 58) return 'Light Grey';
      if (l > 48) return 'Grey';
      if (l > 38) return 'Slate Grey';
      if (l > 28) return 'Charcoal';
      if (l > 18) return 'Graphite';
      if (l > 10) return 'Onyx';
      if (l > 4)  return 'Ebony';
      return 'Pure Black';
    }

    if (s < 18) {
      const tone = l > 75 ? 'Warm ' : '';
      if (l > 85) return tone + 'White';
      if (l > 70) return _hueFamilyWord(h, s, l, 'tinted') + ' White';
      if (l > 55) return 'Misty '  + _hueFamilyWord(h, s, l, 'muted');
      if (l > 40) return 'Ashen '  + _hueFamilyWord(h, s, l, 'muted');
      if (l > 25) return 'Smoky '  + _hueFamilyWord(h, s, l, 'muted');
      return 'Shadow ' + _hueFamilyWord(h, s, l, 'muted');
    }

    const chroma = _chromaWord(s);
    const value  = _valueWord(l);
    const tone   = _toneWord(h, s);
    const base   = _hueFamilyWord(h, s, l, 'full');

    const mods = [];
    if (chroma && value) {
      const chromaStrong = s > 70 || s < 25;
      const valueStrong  = l > 72 || l < 28;
      if (chromaStrong && valueStrong) { mods.push(value, base); }
      else if (chromaStrong)           { mods.push(chroma, base); }
      else if (valueStrong)            { mods.push(value, base); }
      else                             { mods.push(chroma, base); }
    } else if (chroma) {
      mods.push(chroma, base);
    } else if (value) {
      mods.push(value, base);
    } else if (tone) {
      mods.push(tone, base);
    } else {
      mods.push(base);
    }

    return mods.join(' ');
  }

  

  function _rotateHue(r, g, b, deg) {
    const { h, s, l } = rgbToHSL(r, g, b);
    return hslToRGB((h + deg + 360) % 360, s, l);
  }

  function _shiftL(r, g, b, dl) {
    const { h, s, l } = rgbToHSL(r, g, b);
    return hslToRGB(h, s, Math.max(0, Math.min(100, l + dl)));
  }

  function _shiftS(r, g, b, ds) {
    const { h, s, l } = rgbToHSL(r, g, b);
    return hslToRGB(h, Math.max(0, Math.min(100, s + ds)), l);
  }

  
  function getHarmonies(r, g, b) {
    const hsl = rgbToHSL(r, g, b);
    const base = { r, g, b };
    return {
      comp:                 [base, _rotateHue(r, g, b, 180)],
      analogous:            [_rotateHue(r,g,b,-60), _rotateHue(r,g,b,-30), base, _rotateHue(r,g,b,30), _rotateHue(r,g,b,60)],
      triadic:              [base, _rotateHue(r,g,b,120), _rotateHue(r,g,b,240)],
      tetradic:             [base, _rotateHue(r,g,b,90), _rotateHue(r,g,b,180), _rotateHue(r,g,b,270)],
      splitComplementary:   [base, _rotateHue(r,g,b,150), _rotateHue(r,g,b,210)],
      doubleComplement:     [base, _rotateHue(r,g,b,60), _rotateHue(r,g,b,180), _rotateHue(r,g,b,240)],
      shades:               [0,-10,-20,-30,-40,-50].map(d => _shiftL(r,g,b,d)),
      tints:                [50,40,30,20,10,0].map(d => _shiftL(r,g,b,d)),
      tones:                [0,-20,-40,-60,-80].map(d => _shiftS(r,g,b,d)),
      monochromatic:        [20,35,50,65,80,90].map(lv => hslToRGB(hsl.h, hsl.s, lv)),
    };
  }

  
  function materialScale(r, g, b) {
    const { h, s } = rgbToHSL(r, g, b);
    const stops = [
      ['50',  hslToRGB(h, Math.min(100, s-10), 96)],
      ['100', hslToRGB(h, Math.min(100, s-5),  90)],
      ['200', hslToRGB(h, s, 80)],
      ['300', hslToRGB(h, s, 70)],
      ['400', hslToRGB(h, s, 60)],
      ['500', {r,g,b}],
      ['600', hslToRGB(h, Math.min(100, s+5),  45)],
      ['700', hslToRGB(h, Math.min(100, s+10), 38)],
      ['800', hslToRGB(h, Math.min(100, s+12), 30)],
      ['900', hslToRGB(h, Math.min(100, s+14), 22)],
    ];
    return stops.map(([label, c]) => ({ label, hex: toHex(c.r, c.g, c.b), ...c }));
  }

  
  function tailwindScale(r, g, b) {
    const { h, s } = rgbToHSL(r, g, b);
    const stops = [
      ['50',  hslToRGB(h, Math.max(0, s-20), 97)],
      ['100', hslToRGB(h, Math.max(0, s-15), 94)],
      ['200', hslToRGB(h, Math.max(0, s-10), 87)],
      ['300', hslToRGB(h, s, 77)],
      ['400', hslToRGB(h, s, 65)],
      ['500', hslToRGB(h, s, 55)],
      ['600', {r,g,b}],
      ['700', hslToRGB(h, Math.min(100, s+8),  42)],
      ['800', hslToRGB(h, Math.min(100, s+10), 33)],
      ['900', hslToRGB(h, Math.min(100, s+12), 25)],
      ['950', hslToRGB(h, Math.min(100, s+14), 16)],
    ];
    return stops.map(([label, c]) => ({ label, hex: toHex(c.r, c.g, c.b), ...c }));
  }

  
  function getPalettes(r, g, b) {
    const degs  = [0,30,60,90,150,210];
    const degs2 = [0,40,80,140,200,280];
    const degs3 = [0,40,80,160,220,300];

    const mapHue = (dlist, sFn, lv) => dlist.map(d => {
      const c = _rotateHue(r,g,b,d);
      const { h: h2, s: s2 } = rgbToHSL(c.r, c.g, c.b);
      const cc = hslToRGB(h2, sFn(s2), lv);
      return toHex(cc.r, cc.g, cc.b);
    });

    return {
      pastel:  mapHue([0,30,60,90,120,180], s => Math.min(50, s), 85),
      vibrant: mapHue([0,30,60,90,150,210], () => 100, 55),
      muted:   mapHue(degs2, s => Math.min(35, s), 50),
      dark:    mapHue(degs3, s => Math.min(80, s), 25),
      curated: [
        toHex(r,g,b),
        toHex(...Object.values(_rotateHue(r,g,b,30))),
        toHex(...Object.values(_rotateHue(r,g,b,180))),
        toHex(...Object.values(_shiftL(r,g,b,25))),
        toHex(...Object.values(_shiftL(r,g,b,-25))),
      ],
    };
  }

  

  
  function mixRGB(r1, g1, b1, r2, g2, b2, t) {
    return {
      r: Math.round(r1 + (r2 - r1) * t),
      g: Math.round(g1 + (g2 - g1) * t),
      b: Math.round(b1 + (b2 - b1) * t),
    };
  }

  
  function mixHSL(r1, g1, b1, r2, g2, b2, t) {
    const a = rgbToHSL(r1,g1,b1), B2 = rgbToHSL(r2,g2,b2);
    let dh = B2.h - a.h;
    if (dh > 180) dh -= 360; if (dh < -180) dh += 360;
    return hslToRGB(a.h + dh*t, a.s + (B2.s - a.s)*t, a.l + (B2.l - a.l)*t);
  }

  
  function interpolate(r1, g1, b1, r2, g2, b2, steps, mode = 'rgb') {
    steps = Math.max(2, Math.min(20, steps));
    const result = [];
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const c = mode === 'hsl'
        ? mixHSL(r1,g1,b1,r2,g2,b2,t)
        : mixRGB(r1,g1,b1,r2,g2,b2,t);
      result.push({ ...c, hex: toHex(c.r, c.g, c.b), t });
    }
    return result;
  }

  
  function blendOnWhite(r, g, b) {
    const R = r/255, G = g/255, B = b/255;
    const overlay = (s, d) => d < 0.5 ? 2*s*d : 1 - 2*(1-s)*(1-d);
    const softLight = (s, d) => d < 0.5 ? 2*s*d + s*s*(1-2*d) : 2*s*(1-d) + Math.sqrt(d)*(2*s-1);
    const pack = (mode, rr, gg, bb) => ({
      mode, r: Math.round(rr), g: Math.round(gg), b: Math.round(bb),
      hex: toHex(Math.round(rr), Math.round(gg), Math.round(bb)),
    });
    return [
      pack('Normal',     r, g, b),
      pack('Multiply',   R*255,        G*255,        B*255),
      pack('Screen',     (1-(1-R)*(0))*255, (1-(1-G)*(0))*255, (1-(1-B)*(0))*255),
      pack('Overlay',    overlay(R,1)*255,  overlay(G,1)*255,  overlay(B,1)*255),
      pack('Hard Light', overlay(1,R)*255,  overlay(1,G)*255,  overlay(1,B)*255),
      pack('Soft Light', softLight(R,1)*255,softLight(G,1)*255,softLight(B,1)*255),
      pack('Difference', Math.abs(R-1)*255, Math.abs(G-1)*255, Math.abs(B-1)*255),
      pack('Exclusion',  (R+1-2*R*1)*255,   (G+1-2*G*1)*255,   (B+1-2*B*1)*255),
    ];
  }

  
  function opacityVariants(r, g, b, opacities = [100, 80, 60, 40, 20, 10]) {
    const onWhite = opacities.map(op => {
      const t = (100-op)/100;
      const c = { r: Math.round(r+(255-r)*t), g: Math.round(g+(255-g)*t), b: Math.round(b+(255-b)*t) };
      return { opacity: op, ...c, hex: toHex(c.r, c.g, c.b) };
    });
    const onBlack = opacities.map(op => {
      const c = { r: Math.round(r*op/100), g: Math.round(g*op/100), b: Math.round(b*op/100) };
      return { opacity: op, ...c, hex: toHex(c.r, c.g, c.b) };
    });
    return { onWhite, onBlack };
  }

  

  
  function buildGradients(r, g, b) {
    const hsl  = rgbToHSL(r, g, b);
    const h    = toHex(r, g, b);
    const comp = _rotateHue(r,g,b,180);
    const tri1 = _rotateHue(r,g,b,120);
    const tri2 = _rotateHue(r,g,b,240);
    const lt   = _shiftL(r,g,b, 30), dk = _shiftL(r,g,b,-30);
    const ph   = hslToRGB(hsl.h,40,85), ph2 = hslToRGB((hsl.h+60)%360,40,85);
    const dh   = hslToRGB(hsl.h,80,15), dk2 = hslToRGB((hsl.h+30)%360,80,25);
    return [
      { name: 'To Complement',  css: `linear-gradient(135deg,${h},${toHex(comp.r,comp.g,comp.b)})` },
      { name: 'Light → Dark',   css: `linear-gradient(135deg,${toHex(lt.r,lt.g,lt.b)},${toHex(dk.r,dk.g,dk.b)})` },
      { name: 'To White',       css: `linear-gradient(135deg,${h},#ffffff)` },
      { name: 'To Black',       css: `linear-gradient(135deg,${h},#000000)` },
      { name: 'Triadic',        css: `linear-gradient(135deg,${h},${toHex(tri1.r,tri1.g,tri1.b)},${toHex(tri2.r,tri2.g,tri2.b)})` },
      { name: 'Rainbow Arc',    css: `linear-gradient(135deg,hsl(${hsl.h},80%,60%),hsl(${(hsl.h+60)%360},80%,60%),hsl(${(hsl.h+120)%360},80%,60%),hsl(${(hsl.h+180)%360},80%,60%))` },
      { name: 'Conic',          css: `conic-gradient(${h},${toHex(comp.r,comp.g,comp.b)},${h})` },
      { name: 'Warm Glow',      css: `radial-gradient(circle,${h},${toHex(dk.r,dk.g,dk.b)})` },
      { name: 'Soft Pastel',    css: `linear-gradient(135deg,${toHex(ph.r,ph.g,ph.b)},${toHex(ph2.r,ph2.g,ph2.b)})` },
      { name: 'Deep Dark',      css: `linear-gradient(135deg,${toHex(dh.r,dh.g,dh.b)},${toHex(dk2.r,dk2.g,dk2.b)})` },
    ];
  }

  

  function _wcagLevel(ratio) {
    return {
      ratio:      +ratio.toFixed(2),
      AA_normal:  ratio >= 4.5,
      AA_large:   ratio >= 3,
      AAA_normal: ratio >= 7,
      AAA_large:  ratio >= 4.5,
    };
  }

  
  function wcagReport(r, g, b) {
    return {
      onWhite: _wcagLevel(contrastRatio(r,g,b,255,255,255)),
      onBlack: _wcagLevel(contrastRatio(r,g,b,0,0,0)),
    };
  }

  
  function wcagAgainst(r, g, b, br, bg, bb) {
    return _wcagLevel(contrastRatio(r,g,b,br,bg,bb));
  }

  
  function bestTextColor(r, g, b) {
    return relativeLuminance(r,g,b) > 0.179 ? '#000000' : '#ffffff';
  }

  

  
  function colorTags(r, g, b) {
    const { h, s, l } = rgbToHSL(r, g, b);
    const tags = [];
    if (l > 85)       tags.push('Light');
    else if (l < 15)  tags.push('Dark');
    if (s < 15)       tags.push('Neutral/Grey');
    else if (s > 85)  tags.push('Vivid');
    else if (s < 40)  tags.push('Muted');
    if (s > 20) {
      if (h < 20 || h >= 340)  tags.push('Red');
      else if (h < 45)         tags.push('Orange');
      else if (h < 70)         tags.push('Yellow');
      else if (h < 165)        tags.push('Green');
      else if (h < 195)        tags.push('Cyan');
      else if (h < 265)        tags.push('Blue');
      else if (h < 290)        tags.push('Purple');
      else                     tags.push('Pink/Magenta');
    }
    if (l > 70 && s > 40 && s < 80)  tags.push('Pastel');
    if (l < 40 && s > 60)            tags.push('Deep');
    if (l > 40 && l < 65 && s > 70)  tags.push('Pure/Bold');
    return tags;
  }

  

  
  function buildColorObject(r, g, b, name) {
    const hex    = toHex(r,g,b);
    const hsl    = rgbToHSL(r,g,b);
    const hsv    = rgbToHSV(r,g,b);
    const cmyk   = rgbToCMYK(r,g,b);
    const lab    = rgbToLAB(r,g,b);
    const lch    = rgbToLCH(r,g,b);
    const xyz    = rgbToXYZ(r,g,b);
    const ok     = rgbToOklch(r,g,b);
    const lum    = relativeLuminance(r,g,b);
    const bright = perceivedBrightness(r,g,b);
    return {
      name:   name || synthesizeName(r,g,b),
      hex:    hex.toUpperCase(),
      hex8:   hex.toUpperCase() + 'FF',
      r, g, b,
      hsl:  { h: hsl.h, s: hsl.s, l: hsl.l },
      hsv:  { h: hsv.h, s: hsv.s, v: hsv.v },
      cmyk: { c: cmyk.c, m: cmyk.m, y: cmyk.y, k: cmyk.k },
      lab:  { L: +lab.L.toFixed(3), a: +lab.a.toFixed(3), b: +lab.b.toFixed(3) },
      lch:  { L: +lch.L.toFixed(3), C: +lch.C.toFixed(3), H: +lch.H.toFixed(2) },
      xyz:  { x: +xyz.x.toFixed(4), y: +xyz.y.toFixed(4), z: +xyz.z.toFixed(4) },
      oklch: { L: ok.L, C: ok.C, H: ok.H },
      luminance:           +lum.toFixed(5),
      perceivedBrightness: bright,
      bestTextColor:       bestTextColor(r,g,b),
      hueName:             hueName(hsl.h),
      tags:                colorTags(r,g,b),
      wcag:                wcagReport(r,g,b),
      css: {
        hex:   hex.toUpperCase(),
        rgb:   `rgb(${r}, ${g}, ${b})`,
        rgba:  `rgba(${r}, ${g}, ${b}, 1)`,
        hsl:   `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
        hsla:  `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 1)`,
        oklch: `oklch(${ok.L}% ${ok.C} ${ok.H})`,
      },
      snippets: {
        cssVar:    `--color-primary: ${hex.toUpperCase()};`,
        cssOklch:  `color: oklch(${ok.L}% ${ok.C} ${ok.H});`,
        tailwind:  `bg-[${hex.toUpperCase()}]`,
        swift:     `UIColor(red:${(r/255).toFixed(3)}, green:${(g/255).toFixed(3)}, blue:${(b/255).toFixed(3)}, alpha:1)`,
        android:   `<color name="primary">${hex.toUpperCase()}</color>`,
        python:    `'${hex.toUpperCase()}'  # or (${(r/255).toFixed(4)}, ${(g/255).toFixed(4)}, ${(b/255).toFixed(4)})`,
        sass:      `$color-primary: ${hex.toUpperCase()};`,
      },
    };
  }

  
  function toCSSVariables(r, g, b, varName = 'color') {
    const hex = toHex(r,g,b);
    const { h, s, l } = rgbToHSL(r,g,b);
    const mat = materialScale(r,g,b);
    const tw  = tailwindScale(r,g,b);
    return [
      ':root {',
      `  --${varName}: ${hex.toUpperCase()};`,
      `  --${varName}-r: ${r};`,
      `  --${varName}-g: ${g};`,
      `  --${varName}-b: ${b};`,
      `  --${varName}-hsl: hsl(${h}, ${s}%, ${l}%);`,
      '',
      '  ',
      ...mat.map(s => `  --${varName}-${s.label}: ${s.hex.toUpperCase()};`),
      '',
      '  ',
      ...tw.map(s => `  --${varName}-tw-${s.label}: ${s.hex.toUpperCase()};`),
      '}',
    ].join('\n');
  }

  

  const CSV_URL = 'https://raw.githubusercontent.com/meodai/color-names/refs/heads/main/src/colornames.csv';

  
  class ColorLibrary {
    constructor(csvUrl = CSV_URL) {
      this._csvUrl   = csvUrl;
      this._colors   = [];
      this._rArr     = null;
      this._gArr     = null;
      this._bArr     = null;
      this._labL     = null;
      this._labA     = null;
      this._labB     = null;
      this._voxel    = null;
      this._ready    = false;
      this._nameCache = new Map();
      this._nameToKey = new Map();

      this.hexToRGB            = hexToRGB;
      this.toHex               = toHex;
      this.rgbToHSL            = rgbToHSL;
      this.hslToRGB            = hslToRGB;
      this.rgbToHSV            = rgbToHSV;
      this.rgbToCMYK           = rgbToCMYK;
      this.rgbToXYZ            = rgbToXYZ;
      this.xyzToLAB            = xyzToLAB;
      this.rgbToLAB            = rgbToLAB;
      this.labToLCH            = labToLCH;
      this.rgbToLCH            = rgbToLCH;
      this.rgbToOklch          = rgbToOklch;
      this.relativeLuminance   = relativeLuminance;
      this.contrastRatio       = contrastRatio;
      this.perceivedBrightness = perceivedBrightness;
      this.hueName             = hueName;
      this.synthesizeName      = synthesizeName;
      this.getHarmonies        = getHarmonies;
      this.materialScale       = materialScale;
      this.tailwindScale       = tailwindScale;
      this.getPalettes         = getPalettes;
      this.mixRGB              = mixRGB;
      this.mixHSL              = mixHSL;
      this.interpolate         = interpolate;
      this.blendOnWhite        = blendOnWhite;
      this.opacityVariants     = opacityVariants;
      this.buildGradients      = buildGradients;
      this.wcagReport          = wcagReport;
      this.wcagAgainst         = wcagAgainst;
      this.bestTextColor       = bestTextColor;
      this.colorTags           = colorTags;
      this.buildColorObject    = buildColorObject;
      this.toCSSVariables      = toCSSVariables;
    }

    

    
    async init(onProgress) {
      const prog = onProgress || (() => {});
      prog('fetch', 0);
      let text;
      try {
        const res = await fetch(this._csvUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        text = await res.text();
      } catch (e) {
        throw new Error('ColorLibrary.init(): failed to fetch color database — ' + e.message);
      }
      prog('parse', 0.2);

      const raw = [];
      const lines = text.trim().split('\n');
      for (let i = 1; i < lines.length; i++) {
        const p = lines[i].trim().split(',');
        if (p.length < 2) continue;
        const name = p[0].trim(), hex = p[1].trim(), good = p[2] ? p[2].trim() === 'x' : false;
        if (!hex || hex.length !== 7 || hex[0] !== '#') continue;
        const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
        if (isNaN(r)||isNaN(g)||isNaN(b)) continue;
        raw.push({ name, hex: hex.toLowerCase(), r, g, b, good });
      }

      {
        const seenNames = new Map(), seenHex = new Set(), deduped = [];
        for (const c of raw) {
          const key = c.name.toLowerCase().trim();
          if (!seenNames.has(key) || (c.good && !seenNames.get(key).good)) seenNames.set(key, c);
        }
        for (const c of seenNames.values()) {
          if (!seenHex.has(c.hex)) { seenHex.add(c.hex); deduped.push(c); }
        }
        this._colors = deduped;
      }

      prog('index', 0.5);
      const n = this._colors.length;
      this._rArr = new Uint8Array(n); this._gArr = new Uint8Array(n); this._bArr = new Uint8Array(n);
      for (let i = 0; i < n; i++) { this._rArr[i] = this._colors[i].r; this._gArr[i] = this._colors[i].g; this._bArr[i] = this._colors[i].b; }
      this._buildVoxelGrid();

      prog('lab', 0.75);
      this._buildLABArrays();

      this._ready = true;
      prog('done', 1);
      return this;
    }

    
    get colorCount() { return this._colors.length; }

    
    get isReady()    { return this._ready; }

    

    _buildVoxelGrid() {
      const VSIZE = 16;
      this._voxelSize = VSIZE;
      this._voxel = new Array(VSIZE * VSIZE * VSIZE).fill(null).map(() => []);
      for (let i = 0; i < this._colors.length; i++) {
        const vr = this._rArr[i] >> 4, vg = this._gArr[i] >> 4, vb = this._bArr[i] >> 4;
        this._voxel[vr * VSIZE * VSIZE + vg * VSIZE + vb].push(i);
      }
    }

    _buildLABArrays() {
      const n = this._colors.length;
      this._labL = new Float32Array(n); this._labA = new Float32Array(n); this._labB = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const lab = rgbToLAB(this._colors[i].r, this._colors[i].g, this._colors[i].b);
        this._labL[i] = lab.L; this._labA[i] = lab.a; this._labB[i] = lab.b;
      }
    }

    
    _findNearestRGB(r, g, b, k = 12) {
      const VSIZE = this._voxelSize;
      const vr = r >> 4, vg = g >> 4, vb = b >> 4;
      const candidates = [];
      for (let radius = 0; radius <= VSIZE && (candidates.length < k * 4 || radius <= 1); radius++) {
        for (let dr = -radius; dr <= radius; dr++)
        for (let dg = -radius; dg <= radius; dg++)
        for (let db = -radius; db <= radius; db++) {
          if (Math.abs(dr) < radius && Math.abs(dg) < radius && Math.abs(db) < radius) continue;
          const nr = vr+dr, ng = vg+dg, nb = vb+db;
          if (nr<0||nr>=VSIZE||ng<0||ng>=VSIZE||nb<0||nb>=VSIZE) continue;
          const cell = this._voxel[nr*VSIZE*VSIZE + ng*VSIZE + nb];
          for (const i of cell) {
            const d2 = (r-this._rArr[i])**2 + (g-this._gArr[i])**2 + (b-this._bArr[i])**2;
            candidates.push({ i, d2 });
          }
        }
        if (candidates.length >= k * 3 && radius >= 1) break;
      }
      return candidates.sort((a,b) => a.d2 - b.d2).slice(0, k);
    }

    

    
    getName(r, g, b) {
      if (!this._ready) {
        return { name: synthesizeName(r, g, b), confidence: 50, exact: false };
      }
      const nearest = this._findNearestRGB(r, g, b, 12);
      const top = nearest[0];
      const exact = top.d2 === 0;
      const topColor = this._colors[top.i];
      if (exact) return { name: topColor.name, confidence: 100, exact: true, parents: [{ ...topColor, weight: 1 }] };

      const k = 7, kN = nearest.slice(0, k);
      let totalW = 0;
      const weighted = kN.map(({ i, d2 }) => { const w = 1 / (d2 + 0.001); totalW += w; return { color: this._colors[i], w, d2 }; });
      weighted.forEach(x => x.norm = x.w / totalW);
      const topW = weighted[0].norm;

      let name, conf;
      if (topW >= 0.70) {
        name = weighted[0].color.name;
        conf = Math.round(70 + topW * 30);
      } else {
        name = synthesizeName(r, g, b);
        conf = Math.round(40 + topW * 40);
      }
      conf = Math.min(99, Math.max(20, conf));
      return {
        name, confidence: conf, exact: false,
        closest: weighted[0].color,
        dist: Math.sqrt(top.d2).toFixed(1),
        parents: weighted.slice(0, 5).map(x => ({ ...x.color, weight: x.norm, d2: x.d2 })),
      };
    }

    
    getNameString(r, g, b) {
      const k = (r << 16) | (g << 8) | b;
      if (this._nameCache.has(k)) return this._nameCache.get(k);
      let n = this.getName(r, g, b).name;

      if (this._nameToKey.has(n) && this._nameToKey.get(n) !== k) {
        let syn = synthesizeName(r, g, b);
        if (!this._nameToKey.has(syn) || this._nameToKey.get(syn) === k) { n = syn; }
        else {
          const sfx = ((r<<16|g<<8|b)>>>0).toString(16).padStart(6,'0').slice(-4).toUpperCase();
          n = syn + ' #' + sfx;
        }
      }
      if (this._nameCache.size > 8000) { this._nameCache.clear(); this._nameToKey.clear(); }
      this._nameCache.set(k, n);
      if (!this._nameToKey.has(n)) this._nameToKey.set(n, k);
      return n;
    }

    

    
    findNearest(r, g, b, k = 16) {
      this._assertReady('findNearest');
      return this._findNearestRGB(r, g, b, k).map(({ i, d2 }) => ({
        ...this._colors[i], dist: +Math.sqrt(d2).toFixed(2),
      }));
    }

    
    findNearestPerceptual(r, g, b, k = 16) {
      this._assertReady('findNearestPerceptual');
      const tgt = rgbToLAB(r, g, b);
      const cands = this._findNearestRGB(r, g, b, Math.max(k * 4, 64));
      const scored = cands.map(({ i }) => {
        const dL = tgt.L - this._labL[i], da = tgt.a - this._labA[i], db = tgt.b - this._labB[i];
        return { i, d2: dL*dL + da*da + db*db };
      });
      scored.sort((a, b) => a.d2 - b.d2);
      return scored.slice(0, k).map(({ i, d2 }) => ({
        ...this._colors[i], dist: +Math.sqrt(d2).toFixed(2),
      }));
    }

    

    
    analyze(r, g, b) {
      const nameResult = this.getName(r, g, b);
      const base = buildColorObject(r, g, b, nameResult.name);
      return {
        ...base,
        nameResult,
        harmonies:  getHarmonies(r, g, b),
        palettes:   getPalettes(r, g, b),
        scales: {
          material: materialScale(r, g, b),
          tailwind: tailwindScale(r, g, b),
        },
        blends:     blendOnWhite(r, g, b),
        opacities:  opacityVariants(r, g, b),
        gradients:  buildGradients(r, g, b),
        cssVars:    toCSSVariables(r, g, b),
        nearestRGB: this._ready ? this.findNearest(r, g, b, 9) : [],
      };
    }

    

    
    randomRGB() {
      return { r: Math.floor(Math.random()*256), g: Math.floor(Math.random()*256), b: Math.floor(Math.random()*256) };
    }

    
    randomNamed() {
      this._assertReady('randomNamed');
      const good = this._colors.filter(c => c.good);
      return good[Math.floor(Math.random() * good.length)];
    }

    
    get allColors() {
      this._assertReady('allColors');
      return this._colors.slice();
    }

    

    _assertReady(method) {
      if (!this._ready) throw new Error(`ColorLibrary.${method}(): call init() first`);
    }
  }

  

  ColorLibrary.hexToRGB            = hexToRGB;
  ColorLibrary.toHex               = toHex;
  ColorLibrary.rgbToHSL            = rgbToHSL;
  ColorLibrary.hslToRGB            = hslToRGB;
  ColorLibrary.rgbToHSV            = rgbToHSV;
  ColorLibrary.rgbToCMYK           = rgbToCMYK;
  ColorLibrary.rgbToXYZ            = rgbToXYZ;
  ColorLibrary.xyzToLAB            = xyzToLAB;
  ColorLibrary.rgbToLAB            = rgbToLAB;
  ColorLibrary.labToLCH            = labToLCH;
  ColorLibrary.rgbToLCH            = rgbToLCH;
  ColorLibrary.rgbToOklch          = rgbToOklch;
  ColorLibrary.relativeLuminance   = relativeLuminance;
  ColorLibrary.contrastRatio       = contrastRatio;
  ColorLibrary.perceivedBrightness = perceivedBrightness;
  ColorLibrary.hueName             = hueName;
  ColorLibrary.synthesizeName      = synthesizeName;
  ColorLibrary.getHarmonies        = getHarmonies;
  ColorLibrary.materialScale       = materialScale;
  ColorLibrary.tailwindScale       = tailwindScale;
  ColorLibrary.getPalettes         = getPalettes;
  ColorLibrary.mixRGB              = mixRGB;
  ColorLibrary.mixHSL              = mixHSL;
  ColorLibrary.interpolate         = interpolate;
  ColorLibrary.blendOnWhite        = blendOnWhite;
  ColorLibrary.opacityVariants     = opacityVariants;
  ColorLibrary.buildGradients      = buildGradients;
  ColorLibrary.wcagReport          = wcagReport;
  ColorLibrary.wcagAgainst         = wcagAgainst;
  ColorLibrary.bestTextColor       = bestTextColor;
  ColorLibrary.colorTags           = colorTags;
  ColorLibrary.buildColorObject    = buildColorObject;
  ColorLibrary.toCSSVariables      = toCSSVariables;

  return ColorLibrary;
});
