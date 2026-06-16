/* =========================================================
   main.js — bosh sahifa mantiqi (/ index.html)
   ========================================================= */

let allWords = [];
let currentUnit = "all";
let currentMode = "dict";
let searchTerm = "";

/* ---- flashcard study state ---- */
let studyList = [];
let studyIndex = 0;

/* ---- quiz state ---- */
let quizPool = [];
let quizCurrent = null;
let quizScore = { correct: 0, total: 0 };
let quizAnswered = false;

document.addEventListener("DOMContentLoaded", init);

function init() {
  allWords = getWords();
  renderStats();
  renderWordOfDay();
  renderUnitTabs();
  renderDictionary();
  bindControls();
}

/* ========================= STATS & HEADER ========================= */

function renderStats() {
  const units = getUnits(allWords);
  const known = getKnownIds();
  document.getElementById("statTotal").textContent = allWords.length;
  document.getElementById("statUnits").textContent = units.length;
  document.getElementById("statKnown").textContent = known.size;
}

function renderWordOfDay() {
  const card = document.getElementById("wodCard");
  if (allWords.length === 0) {
    document.getElementById("wodWord").textContent = "—";
    document.getElementById("wodMeaning").textContent = "Hali so'z qo'shilmagan";
    return;
  }
  const dayIndex = Math.floor(Date.now() / 86400000) % allWords.length;
  const w = allWords[dayIndex];
  document.getElementById("wodWord").textContent = w.word;
  document.getElementById("wodPos").textContent = w.pos || "";
  document.getElementById("wodMeaning").textContent = w.meaning;
  document.getElementById("wodExample").textContent = w.example || "";
  card.classList.remove("flipped");
  card.onclick = () => card.classList.toggle("flipped");
}

/* ========================= UNIT TABS ========================= */

function renderUnitTabs() {
  const wrap = document.getElementById("unitTabs");
  const units = getUnits(allWords);
  wrap.innerHTML = "";

  const allTab = document.createElement("button");
  allTab.className = "unit-tab" + (currentUnit === "all" ? " active" : "");
  allTab.textContent = "Barchasi";
  allTab.onclick = () => { currentUnit = "all"; onFilterChange(); };
  wrap.appendChild(allTab);

  units.forEach((u) => {
    const tab = document.createElement("button");
    tab.className = "unit-tab" + (currentUnit === u ? " active" : "");
    tab.textContent = u;
    tab.onclick = () => { currentUnit = u; onFilterChange(); };
    wrap.appendChild(tab);
  });
}

function onFilterChange() {
  renderUnitTabs();
  if (currentMode === "dict") renderDictionary();
  if (currentMode === "study") startStudyMode();
  if (currentMode === "quiz") startQuizMode();
}

/* ========================= FILTERED LIST ========================= */

function getFilteredWords() {
  return allWords.filter((w) => {
    const unitMatch = currentUnit === "all" || w.unit === currentUnit;
    const term = searchTerm.trim().toLowerCase();
    const textMatch =
      term === "" ||
      w.word.toLowerCase().includes(term) ||
      w.meaning.toLowerCase().includes(term);
    return unitMatch && textMatch;
  });
}

/* ========================= CONTROLS BINDING ========================= */

function bindControls() {
  document.getElementById("searchInput").addEventListener("input", (e) => {
    searchTerm = e.target.value;
    if (currentMode === "dict") renderDictionary();
  });

  document.querySelectorAll("#modeSwitch button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#modeSwitch button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentMode = btn.dataset.mode;
      switchView(currentMode);
    });
  });

  document.getElementById("studyPrev").onclick = () => moveStudy(-1);
  document.getElementById("studyNext").onclick = () => moveStudy(1);
  document.getElementById("studyShuffle").onclick = shuffleStudy;
  document.getElementById("studyKnown").onclick = () => markStudy(true);
  document.getElementById("studyUnknown").onclick = () => markStudy(false);
}

function switchView(mode) {
  document.getElementById("dictView").style.display = mode === "dict" ? "" : "none";
  document.getElementById("studyView").style.display = mode === "study" ? "" : "none";
  document.getElementById("quizView").style.display = mode === "quiz" ? "" : "none";

  if (mode === "dict") renderDictionary();
  if (mode === "study") startStudyMode();
  if (mode === "quiz") startQuizMode();
}

/* ========================= DICTIONARY MODE ========================= */

function renderDictionary() {
  const grid = document.getElementById("cardGrid");
  const empty = document.getElementById("emptyState");
  const list = getFilteredWords();
  grid.innerHTML = "";

  if (list.length === 0) {
    empty.style.display = "";
    grid.style.display = "none";
    return;
  }
  empty.style.display = "none";
  grid.style.display = "";

  list.forEach((w) => {
    const card = document.createElement("div");
    card.className = "word-card";
    card.innerHTML = `
      <div class="word-card-inner">
        <div class="word-face front">
          <div class="punch"></div>
          <span class="word-tab">${escapeHtml(w.unit)}</span>
          <span class="headword">${escapeHtml(w.word)}</span>
          <span class="pos-tag">${escapeHtml(w.pos || "")}</span>
          <span class="tap-hint">ma'nosini ko'rish uchun bosing</span>
        </div>
        <div class="word-face back">
          <span class="word-tab">${escapeHtml(w.unit)}</span>
          <span class="meaning-uz">${escapeHtml(w.meaning)}</span>
          <span class="example">${escapeHtml(w.example || "")}</span>
        </div>
      </div>
    `;
    card.addEventListener("click", () => card.classList.toggle("flipped"));
    grid.appendChild(card);
  });
}

/* ========================= FLASHCARD STUDY MODE ========================= */

function startStudyMode() {
  studyList = getFilteredWords();
  studyIndex = 0;
  renderStudyCard();
}

function renderStudyCard() {
  const card = document.getElementById("studyCard");
  card.classList.remove("flipped");

  if (studyList.length === 0) {
    document.getElementById("studyProgress").textContent = "0 / 0";
    document.getElementById("studyWord").textContent = "So'z topilmadi";
    document.getElementById("studyMeaning").textContent = "—";
    document.getElementById("studyPos").textContent = "";
    document.getElementById("studyExample").textContent = "";
    document.getElementById("studyUnitTab").textContent = "";
    return;
  }

  const w = studyList[studyIndex];
  document.getElementById("studyProgress").textContent = `${studyIndex + 1} / ${studyList.length}`;
  document.getElementById("studyUnitTab").textContent = w.unit;
  document.getElementById("studyWord").textContent = w.word;
  document.getElementById("studyPos").textContent = w.pos || "";
  document.getElementById("studyMeaning").textContent = w.meaning;
  document.getElementById("studyExample").textContent = w.example || "";
  card.onclick = () => card.classList.toggle("flipped");
}

function moveStudy(delta) {
  if (studyList.length === 0) return;
  studyIndex = (studyIndex + delta + studyList.length) % studyList.length;
  renderStudyCard();
}

function shuffleStudy() {
  for (let i = studyList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [studyList[i], studyList[j]] = [studyList[j], studyList[i]];
  }
  studyIndex = 0;
  renderStudyCard();
}

function markStudy(isKnown) {
  if (studyList.length === 0) return;
  setKnown(studyList[studyIndex].id, isKnown);
  renderStats();
  moveStudy(1);
}

/* ========================= QUIZ MODE ========================= */

function startQuizMode() {
  quizPool = getFilteredWords();
  quizScore = { correct: 0, total: 0 };
  nextQuizQuestion();
}

function nextQuizQuestion() {
  quizAnswered = false;
  document.getElementById("quizNextBtn").style.display = "none";

  if (quizPool.length < 2) {
    document.getElementById("quizWord").textContent = "Kamida 2 ta so'z kerak";
    document.getElementById("quizUnitLabel").textContent = "Test";
    document.getElementById("quizOptions").innerHTML = "";
    return;
  }

  quizCurrent = quizPool[Math.floor(Math.random() * quizPool.length)];

  // generate wrong options from the rest of the words (prefer same filtered pool)
  const others = quizPool.filter((w) => w.id !== quizCurrent.id);
  const wrongChoices = shuffleArray(others).slice(0, 3).map((w) => w.meaning);
  const options = shuffleArray([quizCurrent.meaning, ...wrongChoices]);

  document.getElementById("quizUnitLabel").textContent = quizCurrent.unit;
  document.getElementById("quizWord").textContent = quizCurrent.word;
  updateQuizScore();

  const optWrap = document.getElementById("quizOptions");
  optWrap.innerHTML = "";
  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option";
    btn.textContent = opt;
    btn.onclick = () => answerQuiz(btn, opt);
    optWrap.appendChild(btn);
  });
}

function answerQuiz(btn, chosen) {
  if (quizAnswered) return;
  quizAnswered = true;
  quizScore.total++;
  const isCorrect = chosen === quizCurrent.meaning;
  if (isCorrect) quizScore.correct++;

  document.querySelectorAll(".quiz-option").forEach((b) => {
    b.disabled = true;
    if (b.textContent === quizCurrent.meaning) b.classList.add("correct");
    else if (b === btn) b.classList.add("wrong");
  });

  updateQuizScore();
  document.getElementById("quizNextBtn").style.display = "inline-flex";
}

function updateQuizScore() {
  document.getElementById("quizScore").textContent = `Ball: ${quizScore.correct} / ${quizScore.total}`;
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("quizNextBtn").onclick = nextQuizQuestion;
});

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
