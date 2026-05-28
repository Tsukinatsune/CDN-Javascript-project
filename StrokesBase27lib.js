'use strict';

const KANJI_URL = 'https://cdn.jsdelivr.net/gh/Tsukinatsune/Daily-use-Japanese-letter@master/Kanji.json';
const STROKE_URL = 'https://cdn.jsdelivr.net/gh/Tsukinatsune/Daily-use-Japanese-letter@master/Stroke.json';


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
        ENCODER_ALPHABET.indexOf(encoded[i + 1]));
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

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }
  return response.json();
}

async function fetchKanjiData() {
  const json = await fetchJson(KANJI_URL);
  return Array.isArray(json) ? json : [json];
}

async function fetchStrokeData() {
  const json = await fetchJson(STROKE_URL);
  const strokeMap = {};
  for (const [kanji, raw] of Object.entries(json)) {
    try {
      const paths = decodeStrokeEntry(raw);
      if (paths.length > 0) {
        strokeMap[kanji] = paths;
      }
    } catch (err) {
      console.warn(`[kanji-lib] Skipping "${kanji}":`, err.message);
    }
  }
  return strokeMap;
}

async function loadBothFromCdn() {
  const [kanji, strokes] = await Promise.all([
    fetchKanjiData(),
    fetchStrokeData(),
  ]);
  return {kanji, strokes};
}

function loadKanjiFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Cannot read file: ${file.name}`));
    reader.onload = (event) => {
      try {
        const raw = JSON.parse(event.target.result);
        const entries = Array.isArray(raw) ? raw : [raw];
        if (entries.length === 0) {
          reject(new Error('No entries found in kanji file.'));
          return;
        }
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
      try {
        const json = JSON.parse(event.target.result);
        const strokeMap = {};
        for (const [kanji, raw] of Object.entries(json)) {
          try {
            const paths = decodeStrokeEntry(raw);
            if (paths.length > 0) {
              strokeMap[kanji] = paths;
            }
          } catch (err) {
            console.warn(`[kanji-lib] Skipping "${kanji}":`, err.message);
          }
        }
        resolve(strokeMap);
      } catch (err) {
        reject(new Error(`Invalid JSON in ${file.name}: ${err.message}`));
      }
    };
    reader.readAsText(file);
  });
}

const kanjiLib = {
  fetchKanjiData,
  fetchStrokeData,
  loadBothFromCdn,
  loadKanjiFromFile,
  loadStrokesFromFile,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = kanjiLib;
} else if (typeof globalThis !== 'undefined') {
  globalThis.kanjiLib = kanjiLib;
}
