'use strict';

const KANJI_URL      = 'https://cdn.jsdelivr.net/gh/Tsukinatsune/Daily-use-Japanese-letter@master/Kanji_v2.json';
const STROKE_URL     = 'https://cdn.jsdelivr.net/gh/Tsukinatsune/Daily-use-Japanese-letter@master/Stroke.json';
const ACCENT_URL     = 'https://cdn.jsdelivr.net/gh/Tsukinatsune/Daily-use-Japanese-letter@master/Accent%20%26%20Part%20of%20Speech.json';
const NZ_URL         = 'https://cdn.jsdelivr.net/gh/Tsukinatsune/Daily-use-Japanese-letter@master/Paleography/NZ%20code.json';
const BRAILLE_URL    = 'https://cdn.jsdelivr.net/gh/Tsukinatsune/Daily-use-Japanese-letter@master/Additional/Louis%20Braille.json';
const BACKGROUND_URL = 'https://cdn.jsdelivr.net/gh/Tsukinatsune/Daily-use-Japanese-letter@master/Paleography/Background.json';

const PALEO_BASE_URL = 'https://cdn.jsdelivr.net/gh/Tsukinatsune/Daily-use-Japanese-letter@master/Paleography/';

const KVG_URLS = [
  'https://cdn.jsdelivr.net/gh/Tsukinatsune/Daily-use-Japanese-letter@master/Kvg-order/Kvg%20order%201',
  'https://cdn.jsdelivr.net/gh/Tsukinatsune/Daily-use-Japanese-letter@master/Kvg-order/Kvg%20order%202',
  'https://cdn.jsdelivr.net/gh/Tsukinatsune/Daily-use-Japanese-letter@master/Kvg-order/Kvg%20order%203',
  'https://cdn.jsdelivr.net/gh/Tsukinatsune/Daily-use-Japanese-letter@master/Kvg-order/Kvg%20order%204',
];

const ENCODER_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ\u0e01';
const COUNT_WIDTH = 2;
const LENGTH_WIDTH = 4;

function decodeBase27(slice) {
  let result = 0;
  for (const ch of slice) {
    result = result * 27 + ENCODER_ALPHABET.indexOf(ch);
  }
  return result;
}

function decodePathBody(encoded) {
  let path = '';
  for (let i = 0; i < encoded.length; i += 2) {
    path += String.fromCharCode(
      ENCODER_ALPHABET.indexOf(encoded[i]) * 27 +
      ENCODER_ALPHABET.indexOf(encoded[i + 1])
    );
  }
  return path;
}

function decodeStrokeEntry(entry) {
  let pos = 0;
  const strokeCount = decodeBase27(entry.slice(pos, pos + COUNT_WIDTH));
  pos += COUNT_WIDTH;
  const lengths = [];
  for (let i = 0; i < strokeCount; i++) {
    lengths.push(decodeBase27(entry.slice(pos, pos + LENGTH_WIDTH)));
    pos += LENGTH_WIDTH;
  }
  const paths = [];
  for (const len of lengths) {
    paths.push(decodePathBody(entry.slice(pos, pos + len)));
    pos += len;
  }
  return paths;
}

function _decodeKvgStrokesInPlace(kvgData) {
  if (!kvgData || typeof kvgData !== 'object') return kvgData;
  for (const entry of Object.values(kvgData)) {
    if (entry && Array.isArray(entry.strokes)) {
      for (const stroke of entry.strokes) {
        if (stroke && typeof stroke === 'object' && typeof stroke.d === 'string') {
          if (!stroke.d.startsWith('M') && !stroke.d.startsWith('m')) {
            try {
              stroke.d = decodePathBody(stroke.d);
            } catch (err) {
              console.warn(`[kanji-lib] Failed to decode path body: ${stroke.d}`, err.message);
            }
          }
        }
      }
    }
  }
  return kvgData;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);
  return response.json();
}

async function _fetchGzipText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);

  const buffer = await response.arrayBuffer();
  const bytes  = new Uint8Array(buffer);
  const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b;

  if (isGzip) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error(
        '[kanji-lib] DecompressionStream is not available in this environment. ' +
        'Use Node >= 18 or a modern browser.'
      );
    }
    const ds     = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    writer.write(bytes);
    writer.close();
    const decompressed = await new Response(ds.readable).arrayBuffer();
    return new TextDecoder().decode(decompressed);
  }

  return new TextDecoder().decode(bytes);
}

async function _fetchKvgChunk(url) {
  const text = await _fetchGzipText(url);
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`[kanji-lib] Failed to parse JSON from ${url}: ${err.message}`);
  }
}

async function fetchKanjiData() {
  const json = await fetchJson(KANJI_URL);
  return Array.isArray(json) ? json : [json];
}

function _parseStrokeJson(json) {
  const strokeMap = {};
  for (const [kanji, raw] of Object.entries(json)) {
    try {
      let paths = [];
      if (typeof raw === 'string') {
        paths = decodeStrokeEntry(raw);
      } else if (raw && Array.isArray(raw.strokes)) {
        paths = raw.strokes.map(s =>
          (s && typeof s === 'object' && s.d)
            ? (s.d.startsWith('M') || s.d.startsWith('m') ? s.d : decodePathBody(s.d))
            : s
        );
      } else if (Array.isArray(raw)) {
        paths = raw.map(s =>
          (s && typeof s === 'object' && s.d)
            ? (s.d.startsWith('M') || s.d.startsWith('m') ? s.d : decodePathBody(s.d))
            : s
        );
      }
      if (paths.length > 0) strokeMap[kanji] = paths;
    } catch (err) {
      console.warn(`[kanji-lib] Skipping stroke for "${kanji}":`, err.message);
    }
  }
  return strokeMap;
}

async function fetchStrokeData() {
  return _parseStrokeJson(await fetchJson(STROKE_URL));
}

async function fetchAccentData() {
  return fetchJson(ACCENT_URL);
}

async function fetchNzData() {
  return fetchJson(NZ_URL);
}

function getNzCode(nzMap, kanji) {
  for (const [code, char] of Object.entries(nzMap)) {
    if (char === kanji) return code;
  }
  return null;
}

function buildKanjiToNzMap(nzMap) {
  const map = new Map();
  for (const [code, char] of Object.entries(nzMap)) {
    map.set(char, code);
  }
  return map;
}

async function fetchPaleographyByNzCode(nzCode) {
  const url  = `${PALEO_BASE_URL}${encodeURIComponent(nzCode)}`;
  const text = await _fetchGzipText(url);
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`[kanji-lib] Failed to parse paleography JSON for ${nzCode}: ${err.message}`);
  }
}

async function fetchPaleographyForKanji(nzMap, kanji) {
  const nzCode = getNzCode(nzMap, kanji);
  if (!nzCode) throw new Error(`[kanji-lib] No NZ code found for kanji "${kanji}"`);
  return fetchPaleographyByNzCode(nzCode);
}

async function fetchPaleographyBatch(nzMap, kanjiList) {
  const kanjiToNz = buildKanjiToNzMap(nzMap);
  const results   = {};

  await Promise.all(
    kanjiList.map(async (kanji) => {
      const nzCode = kanjiToNz.get(kanji);
      if (!nzCode) {
        console.warn(`[kanji-lib] No NZ code for "${kanji}", skipping.`);
        return;
      }
      try {
        results[kanji] = await fetchPaleographyByNzCode(nzCode);
      } catch (err) {
        console.warn(`[kanji-lib] Failed to fetch paleography for "${kanji}":`, err.message);
      }
    })
  );

  return results;
}

function loadPaleographyFromFile(file, kanji = null) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Cannot read file: ${file.name}`));
    reader.onload = async (event) => {
      try {
        const buffer = event.target.result;
        const bytes  = new Uint8Array(buffer);
        const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b;
        let text;

        if (isGzip) {
          if (typeof DecompressionStream === 'undefined') {
            throw new Error('[kanji-lib] DecompressionStream not available.');
          }
          const ds     = new DecompressionStream('gzip');
          const writer = ds.writable.getWriter();
          writer.write(bytes);
          writer.close();
          const out = await new Response(ds.readable).arrayBuffer();
          text = new TextDecoder().decode(out);
        } else {
          text = new TextDecoder().decode(bytes);
        }

        const data = JSON.parse(text);
        resolve({ nzCode: file.name, kanji, data });
      } catch (err) {
        reject(new Error(`[kanji-lib] Error processing ${file.name}: ${err.message}`));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

async function fetchBrailleData() {
  return fetchJson(BRAILLE_URL);
}

async function fetchBackgroundData() {
  return fetchJson(BACKGROUND_URL);
}

function _loadJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Cannot read file: ${file.name}`));
    reader.onload = (event) => {
      try {
        const raw = JSON.parse(event.target.result);
        if (typeof raw !== 'object' || Array.isArray(raw) || raw === null) {
          reject(new Error(`Expected a plain object in ${file.name}.`));
          return;
        }
        resolve(raw);
      } catch (err) {
        reject(new Error(`Invalid JSON in ${file.name}: ${err.message}`));
      }
    };
    reader.readAsText(file);
  });
}

function loadNzFromFile(file)         { return _loadJsonFile(file); }
function loadBrailleFromFile(file)    { return _loadJsonFile(file); }
function loadBackgroundFromFile(file) { return _loadJsonFile(file); }

function loadKanjiFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Cannot read file: ${file.name}`));
    reader.onload = (event) => {
      try {
        const raw     = JSON.parse(event.target.result);
        const entries = Array.isArray(raw) ? raw : [raw];
        if (entries.length === 0) { reject(new Error('No entries found in kanji file.')); return; }
        resolve(entries);
      } catch (err) {
        reject(new Error(`Invalid JSON in ${file.name}: ${err.message}`));
      }
    };
    reader.readAsText(file);
  });
}

function loadStrokesFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Cannot read file: ${file.name}`));
    reader.onload = (event) => {
      try { resolve(_parseStrokeJson(JSON.parse(event.target.result))); }
      catch (err) { reject(new Error(`Invalid JSON in ${file.name}: ${err.message}`)); }
    };
    reader.readAsText(file);
  });
}

function loadAccentFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Cannot read file: ${file.name}`));
    reader.onload = (event) => {
      try { resolve(JSON.parse(event.target.result)); }
      catch (err) { reject(new Error(`Invalid JSON in ${file.name}: ${err.message}`)); }
    };
    reader.readAsText(file);
  });
}

function _mergeKvgChunks(chunks) {
  function merge(target, source) {
    for (const [key, val] of Object.entries(source)) {
      if (
        val !== null &&
        typeof val === 'object' &&
        !Array.isArray(val) &&
        typeof target[key] === 'object' &&
        target[key] !== null &&
        !Array.isArray(target[key])
      ) {
        merge(target[key], val);
      } else {
        target[key] = val;
      }
    }
    return target;
  }
  return chunks.reduce((acc, chunk) => merge(acc, chunk), {});
}

async function fetchKvgData() {
  const chunks = await Promise.all(KVG_URLS.map(_fetchKvgChunk));
  return _decodeKvgStrokesInPlace(_mergeKvgChunks(chunks));
}

async function loadKvgFromFiles(files) {
  if (!files || files.length === 0) throw new Error('[kanji-lib] No KVG files provided.');
  const chunks = await Promise.all(
    Array.from(files).map(file =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error(`Cannot read file: ${file.name}`));
        reader.onload = async (event) => {
          try {
            const buffer = event.target.result;
            const bytes  = new Uint8Array(buffer);
            const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b;
            let text;
            if (isGzip) {
              if (typeof DecompressionStream === 'undefined') {
                throw new Error('[kanji-lib] DecompressionStream not available.');
              }
              const ds     = new DecompressionStream('gzip');
              const writer = ds.writable.getWriter();
              writer.write(bytes);
              writer.close();
              const out = await new Response(ds.readable).arrayBuffer();
              text = new TextDecoder().decode(out);
            } else {
              text = new TextDecoder().decode(bytes);
            }
            resolve(JSON.parse(text));
          } catch (err) {
            reject(new Error(`[kanji-lib] Error processing ${file.name}: ${err.message}`));
          }
        };
        reader.readAsArrayBuffer(file);
      })
    )
  );
  return _decodeKvgStrokesInPlace(_mergeKvgChunks(chunks));
}

function getKvgEntry(kvgData, kanji)          { return kvgData[kanji] ?? null; }
function getKvgStrokes(kvgData, kanji)        { return kvgData[kanji]?.strokes         ?? []; }
function getKvgRadicals(kvgData, kanji)       { return kvgData[kanji]?.radicals        ?? []; }
function getKvgComponents(kvgData, kanji)     { return kvgData[kanji]?.components      ?? []; }
function getKvgTxtBooks(kvgData, kanji)       { return kvgData[kanji]?.txt_books       ?? []; }
function getKvgTextbookSearch(kvgData, kanji) { return kvgData[kanji]?.textbook_search ?? []; }
function getKvgRadNameFile(kvgData, kanji)    { return kvgData[kanji]?.rad_name_file   ?? null; }
function getKvgKodansha(kvgData, kanji)       { return kvgData[kanji]?.Kodansha        ?? null; }
function getKvgNelson(kvgData, kanji)         { return kvgData[kanji]?.Classic_Nelson  ?? null; }

function mergeKvgIntoEntry(entry, kvgData, kanji) {
  const kvg = kvgData[kanji];
  if (!kvg) return entry;
  return {
    ...entry,
    strokes:         entry.strokes?.length         ? entry.strokes         : (kvg.strokes         ?? []),
    radicals:        entry.radicals?.length        ? entry.radicals        : (kvg.radicals        ?? []),
    components:      entry.components?.length      ? entry.components      : (kvg.components      ?? []),
    txt_books:       entry.txt_books?.length       ? entry.txt_books       : (kvg.txt_books       ?? []),
    textbook_search: entry.textbook_search?.length ? entry.textbook_search : (kvg.textbook_search ?? []),
    rad_name_file:   entry.rad_name_file           || kvg.rad_name_file    || '',
    Kodansha:        entry.Kodansha                || kvg.Kodansha         || '',
    Classic_Nelson:  entry.Classic_Nelson          || kvg.Classic_Nelson   || '',
  };
}

function mergeKvgIntoDb(db, kvgData) {
  const result = {};
  for (const [kanji, entry] of Object.entries(db)) {
    result[kanji] = mergeKvgIntoEntry(entry, kvgData, kanji);
  }
  return result;
}

function getMorphology(accentMap, kanji)           { return accentMap[kanji]?.morphology     ?? null; }
function getWaniKaniLevel(accentMap, kanji)        { return accentMap[kanji]?.wanikani_level ?? null; }
function getYear(accentMap, kanji)                 { return accentMap[kanji]?.year           ?? null; }

function getMorphologyByPos(accentMap, kanji, pos) {
  const entries = getMorphology(accentMap, kanji);
  if (!entries) return [];
  return entries.filter(e => e.pos && e.pos.includes(pos));
}

function getBraille(brailleMap, kanji)       { return brailleMap[kanji]    ?? null; }
function getBackground(backgroundMap, kanji) { return backgroundMap[kanji] ?? null; }

async function loadAllFromCdn() {
  const [kanji, strokes, accent, nz, braille, background] = await Promise.all([
    fetchKanjiData(),
    fetchStrokeData(),
    fetchAccentData(),
    fetchNzData(),
    fetchBrailleData(),
    fetchBackgroundData(),
  ]);
  return { kanji, strokes, accent, nz, braille, background };
}

async function loadBothFromCdn() {
  const [kanji, strokes] = await Promise.all([fetchKanjiData(), fetchStrokeData()]);
  return { kanji, strokes };
}

const kanjiLib = {
  fetchKanjiData,
  fetchStrokeData,
  fetchAccentData,
  fetchKvgData,
  fetchNzData,
  fetchBrailleData,
  fetchBackgroundData,

  fetchPaleographyByNzCode,
  fetchPaleographyForKanji,
  fetchPaleographyBatch,
  getNzCode,
  buildKanjiToNzMap,

  loadAllFromCdn,
  loadBothFromCdn,

  loadKanjiFromFile,
  loadStrokesFromFile,
  loadAccentFromFile,
  loadKvgFromFiles,
  loadNzFromFile,
  loadBrailleFromFile,
  loadBackgroundFromFile,
  loadPaleographyFromFile,

  getKvgEntry,
  getKvgStrokes,
  getKvgRadicals,
  getKvgComponents,
  getKvgTxtBooks,
  getKvgTextbookSearch,
  getKvgRadNameFile,
  getKvgKodansha,
  getKvgNelson,
  mergeKvgIntoEntry,
  mergeKvgIntoDb,

  getMorphology,
  getMorphologyByPos,
  getWaniKaniLevel,
  getYear,

  getBraille,
  getBackground,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = kanjiLib;
} else if (typeof globalThis !== 'undefined') {
  globalThis.kanjiLib = kanjiLib;
}
