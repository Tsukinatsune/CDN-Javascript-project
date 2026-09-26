class FuzzySearch {
  constructor(items = [], options = {}) {
    this.items = items;
    this.fields = options.fields || ['title'];
    this.fieldWeights = options.fieldWeights || {};
    this.minScore = options.minScore ?? 0;
    this.limit = options.limit ?? Infinity;
    this.doHighlight = options.highlight !== false;
  }

  search(query = '') {
    const tokens = FuzzySearch._tok(query);
    if (!tokens.length) {
      const all = this.items.map(item => ({ item, score: 0, highlights: {} }));
      return all.slice(0, this.limit === Infinity ? all.length : this.limit);
    }
    const scored = [];
    for (const item of this.items) {
      const score = this._score(item, tokens);
      if (score <= this.minScore - 1) continue;
      const entry = { item, score };
      if (this.doHighlight) entry.highlights = this._hl(item, tokens);
      scored.push(entry);
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, this.limit === Infinity ? scored.length : this.limit);
  }

  static highlight(text, query) {
    return FuzzySearch._mark(text, FuzzySearch._tok(query));
  }

  _score(item, tokens) {
    let total = 0;
    for (const field of this.fields) {
      const raw = FuzzySearch._get(item, field);
      const vals = Array.isArray(raw) ? raw : [raw];
      const w = this.fieldWeights[field] ?? 1.0;
      const fs = vals.map(v => String(v ?? '')).join(' ').toLowerCase();
      let fScore = 0;
      for (const tok of tokens) {
        if (!FuzzySearch._fmatch(fs, tok)) { fScore = 0; break; }
        fScore += FuzzySearch._stok(fs, tok);
      }
      total += fScore * w;
    }
    const all = this.fields.map(f => {
      const v = FuzzySearch._get(item, f);
      return (Array.isArray(v) ? v : [v]).map(x => String(x ?? '')).join(' ');
    }).join(' ').toLowerCase();
    if (tokens.length > 1 && all.includes(tokens.join(''))) total += 30;
    return total;
  }

  _hl(item, tokens) {
    const out = {};
    for (const field of this.fields) {
      const raw = FuzzySearch._get(item, field);
      const vals = Array.isArray(raw) ? raw : [raw];
      out[field] = vals.map(v => FuzzySearch._mark(String(v ?? ''), tokens)).join(', ');
    }
    return out;
  }

  static _tok(q) { return String(q).toLowerCase().split(/\s+/).filter(Boolean); }
  static _get(o, p) { return p.split('.').reduce((x, k) => (x != null ? x[k] : undefined), o); }

  static _fmatch(str, tok) {
    if (str.includes(tok)) return true;
    let ti = 0;
    for (let i = 0; i < str.length && ti < tok.length; i++) if (str[i] === tok[ti]) ti++;
    return ti === tok.length;
  }

  static _stok(fl, tok) {
    if (!FuzzySearch._fmatch(fl, tok)) return 0;
    let s = fl === tok ? 100 : fl.startsWith(tok) ? 60 : fl.includes(tok) ? 40
          : (tok.length / Math.max(fl.length, 1)) * 20;
    fl.split(/[\s\-:']+/).forEach(w => {
      if (w === tok) s += 10; else if (w.startsWith(tok)) s += 15;
    });
    return s;
  }

  static _mark(text, tokens) {
    if (!tokens.length) return text;
    const lower = text.toLowerCase();
    const ranges = [];
    const getWords = s => { const w=[],re=/[^\s\-:'\u2019]+/g; let m; while((m=re.exec(s))!==null)w.push({word:m[0],start:m.index}); return w; };
    const fwr = (word, tok, off) => {
      const wl=word.toLowerCase(),tl=tok.toLowerCase(),ei=wl.indexOf(tl);
      if(ei!==-1)return[[off+ei,off+ei+tl.length]];
      let ti=0; const hits=[];
      for(let ci=0;ci<wl.length&&ti<tl.length;ci++) if(wl[ci]===tl[ti]){hits.push(ci);ti++;}
      if(ti<tl.length)return null;
      const r=[]; let rs=hits[0],re2=hits[0];
      for(let i=1;i<hits.length;i++){ if(hits[i]===re2+1)re2=hits[i]; else{r.push([off+rs,off+re2+1]);rs=re2=hits[i];} }
      r.push([off+rs,off+re2+1]); return r;
    };
    const words = getWords(lower);
    tokens.forEach(tok => {
      if(!tok)return; const tl=tok.toLowerCase(); let idx=0,found=false;
      while((idx=lower.indexOf(tl,idx))!==-1){ranges.push([idx,idx+tl.length]);idx++;found=true;}
      if(found)return;
      let bestR=null,bestS=-1;
      words.forEach(({word,start})=>{
        const wl=word.toLowerCase();
        let sc=wl===tl?3:wl.startsWith(tl)?2:wl.includes(tl)?2:1;
        if(sc>=bestS){const r=fwr(word,tl,start);if(r){bestR=r;bestS=sc;}}
      });
      if(bestR)bestR.forEach(r=>ranges.push(r));
    });
    if(!ranges.length)return text;
    ranges.sort((a,b)=>a[0]-b[0]);
    const merged=[ranges[0].slice()];
    for(let i=1;i<ranges.length;i++){
      const last=merged[merged.length-1];
      if(ranges[i][0]<=last[1])last[1]=Math.max(last[1],ranges[i][1]); else merged.push(ranges[i].slice());
    }
    let res='',pos=0;
    merged.forEach(([s,e])=>{res+=text.slice(pos,s)+'<mark>'+text.slice(s,e)+'</mark>';pos=e;});
    return res+text.slice(pos);
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = FuzzySearch;
else if (typeof define === 'function' && define.amd) define([], () => FuzzySearch);
else (typeof globalThis !== 'undefined' ? globalThis : window).FuzzySearch = FuzzySearch;
