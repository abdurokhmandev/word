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

function addWord({ unit, word, pos, meaning, example }) {
  const words = loadWords();
  const entry = {
    id: generateId(),
    unit: unit.trim(),
    word: word.trim(),
    pos: (pos || "").trim(),
    meaning: meaning.trim(),
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

function importWords(newWords, mode) {
  // mode: "replace" | "merge"
  if (mode === "replace") {
    saveWords(newWords);
  } else {
    const existing = loadWords();
    const existingIds = new Set(existing.map((w) => w.id));
    const merged = existing.concat(
      newWords.map((w) => (existingIds.has(w.id) ? { ...w, id: generateId() } : w))
    );
    saveWords(merged);
  }
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
