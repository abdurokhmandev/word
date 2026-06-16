/* =========================================================
   data.js — shared storage layer (used by index.html va admin.html)
   Bu yerda barcha so'zlar brauzerning localStorage'ida saqlanadi,
   ya'ni server kerak emas, lekin ma'lumotlar faqat shu brauzerda turadi.
   ========================================================= */

const STORAGE_KEY = "vocab_words_v1";
const SEED_FLAG_KEY = "vocab_seeded_v1";
const KNOWN_KEY = "vocab_known_v1";

/* ---- boshlang'ich namuna ma'lumotlar (faqat birinchi marta yuklanadi) ---- */
const SEED_DATA = [
  { unit: "1-unit", word: "relative", pos: "noun", meaning: "qarindosh", example: "She invited all her relatives to the wedding." },
  { unit: "1-unit", word: "sibling", pos: "noun", meaning: "aka-uka / opa-singil", example: "I don't have any siblings, I'm an only child." },
  { unit: "1-unit", word: "spouse", pos: "noun", meaning: "turmush o'rtog'i", example: "Please bring your spouse to the party." },
  { unit: "1-unit", word: "raise", pos: "verb", meaning: "tarbiyalamoq, voyaga yetkazmoq", example: "It's not easy to raise three children alone." },
  { unit: "2-unit", word: "commute", pos: "verb", meaning: "ishga/maktabga qatnamoq", example: "He commutes to work by train every day." },
  { unit: "2-unit", word: "chore", pos: "noun", meaning: "uy yumushi", example: "Doing the dishes is my least favorite chore." },
  { unit: "2-unit", word: "exhausted", pos: "adjective", meaning: "juda charchagan", example: "I was exhausted after the long meeting." },
  { unit: "2-unit", word: "in advance", pos: "phrase", meaning: "oldindan", example: "You should book your tickets in advance." },
  { unit: "3-unit", word: "ingredient", pos: "noun", meaning: "tarkibiy qism", example: "Flour is the main ingredient in bread." },
  { unit: "3-unit", word: "recipe", pos: "noun", meaning: "retsept", example: "My grandmother gave me her secret recipe." },
  { unit: "3-unit", word: "leftover", pos: "noun", meaning: "qolgan ovqat", example: "We had the leftovers for dinner the next day." },
  { unit: "3-unit", word: "bland", pos: "adjective", meaning: "ta'msiz", example: "The soup tasted bland without any salt." },
];

function generateId() {
  return "w_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

function loadWords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("So'zlarni o'qishda xatolik:", e);
    return [];
  }
}

function saveWords(words) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

function seedIfEmpty() {
  if (localStorage.getItem(SEED_FLAG_KEY)) return;
  const existing = loadWords();
  if (existing.length === 0) {
    const withIds = SEED_DATA.map((w) => ({ id: generateId(), ...w }));
    saveWords(withIds);
  }
  localStorage.setItem(SEED_FLAG_KEY, "1");
}

function getWords() {
  seedIfEmpty();
  return loadWords();
}

function wordKey(word, unit) {
  return `${String(word || "").trim().toLowerCase()}|${String(unit || "").trim().toLowerCase()}`;
}

function existsWord(word, unit) {
  const key = wordKey(word, unit);
  return loadWords().some((w) => wordKey(w.word, w.unit) === key);
}

function addWord({ unit, word, pos, meaning, example }) {
  const u = (unit || "").trim();
  const wd = (word || "").trim();
  const mn = (meaning || "").trim();
  if (!u || !wd || !mn) return null; // required fields

  // check duplicate by (word + unit)
  if (existsWord(wd, u)) return null;

  const words = loadWords();
  const entry = {
    id: generateId(),
    unit: u,
    word: wd,
    pos: (pos || "").trim(),
    meaning: mn,
    example: (example || "").trim(),
  };
  words.push(entry);
  saveWords(words);
  return entry;
}

function updateWord(id, updates) {
  const words = loadWords();
  const idx = words.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  words[idx] = { ...words[idx], ...updates };
  saveWords(words);
  return words[idx];
}

function deleteWord(id) {
  const words = loadWords().filter((w) => w.id !== id);
  saveWords(words);
}

function getUnits(words) {
  const set = new Set((words || loadWords()).map((w) => w.unit));
  return Array.from(set).sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
    return a.localeCompare(b);
  });
}

/*
  importWords — takomillashtirilgan versiya
  newWords: Array yoki { words: Array }
  mode: "replace" | "merge"
  - replace: to'liq almashtiradi (yangi array STORAGE_KEY ga yoziladi)
  - merge: mavjudlarga qo'shadi, lekin so'z+unit ziddiyligi bo'lsa o'tkaziladi
  RETURN: statistik obyekti { added, skipped, replaced }
*/
function importWords(newWords, mode) {
  // normalize input to array
  let arr = null;
  if (Array.isArray(newWords)) arr = newWords;
  else if (newWords && Array.isArray(newWords.words)) arr = newWords.words;
  else throw new Error("Noto'g'ri import format: array yoki { words: [...] } kerak");

  // normalize entries and ensure required fields & ids
  const normalized = arr.map((w) => ({
    id: w && w.id ? String(w.id) : generateId(),
    unit: (w && w.unit ? String(w.unit) : "").trim(),
    word: (w && w.word ? String(w.word) : "").trim(),
    pos: (w && w.pos ? String(w.pos) : "").trim(),
    meaning: (w && w.meaning ? String(w.meaning) : "").trim(),
    example: (w && w.example ? String(w.example) : "").trim(),
  }));

  let added = 0;
  let skipped = 0;
  let replaced = 0;

  if (mode === "replace") {
    // remove duplicates inside normalized by word+unit (keep first)
    const seen = new Set();
    const deduped = [];
    for (const w of normalized) {
      const k = wordKey(w.word, w.unit);
      if (!w.word || !w.unit || !w.meaning) { skipped++; continue; }
      if (seen.has(k)) { skipped++; continue; }
      seen.add(k);
      // ensure id
      if (!w.id) w.id = generateId();
      deduped.push(w);
      added++;
    }
    saveWords(deduped);
    replaced = added; // replaced count roughly
  } else {
    const existing = loadWords();
    const existingKeys = new Set(existing.map((w) => wordKey(w.word, w.unit)));
    const toAdd = [];
    for (const w of normalized) {
      if (!w.word || !w.unit || !w.meaning) { skipped++; continue; }
      const k = wordKey(w.word, w.unit);
      if (existingKeys.has(k)) { skipped++; continue; }
      // ensure id uniqueness
      if (!w.id || existing.some((e) => e.id === w.id)) w.id = generateId();
      toAdd.push(w);
      existingKeys.add(k);
      added++;
    }
    const merged = existing.concat(toAdd);
    saveWords(merged);
  }

  // mark seeded so seedIfEmpty won't overwrite later
  localStorage.setItem(SEED_FLAG_KEY, "1");

  return { added, skipped, replaced };
}

function exportWords() {
  return JSON.stringify(loadWords(), null, 2);
}

/* ---- "bilaman" sifatida belgilangan so'zlar (flashcard rejimi uchun) ---- */

function getKnownIds() {
  try {
    const raw = localStorage.getItem(KNOWN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
}

function setKnown(id, isKnown) {
  const known = getKnownIds();
  if (isKnown) known.add(id);
  else known.delete(id);
  localStorage.setItem(KNOWN_KEY, JSON.stringify(Array.from(known)));
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
