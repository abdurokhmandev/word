/* =========================================================
   admin.js — admin panel mantiqi (/admin.html)

   PAROLNI O'ZGARTIRISH: pastdagi ADMIN_PASSWORD qiymatini
   o'zingiz xohlagan parolga almashtiring.
   ========================================================= */

const ADMIN_PASSWORD = "lugat2026";
const AUTH_KEY = "vocab_admin_auth_v1";

let editingId = null;
let adminSearchTerm = "";
let adminUnitFilter = "all";

document.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem(AUTH_KEY) === "1") {
    showDashboard();
  } else {
    showLogin();
  }
  bindLogin();
});

/* ========================= AUTH ========================= */

function showLogin() {
  document.getElementById("loginWrap").style.display = "flex";
  document.getElementById("adminShell").style.display = "none";
  document.getElementById("logoutLink").style.display = "none";
}

function showDashboard() {
  document.getElementById("loginWrap").style.display = "none";
  document.getElementById("adminShell").style.display = "block";
  document.getElementById("logoutLink").style.display = "inline";
  initDashboard();
}

function bindLogin() {
  const btn = document.getElementById("loginBtn");
  const input = document.getElementById("passwordInput");
  const errorEl = document.getElementById("loginError");

  function attempt() {
    if (input.value === ADMIN_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, "1");
      errorEl.textContent = "";
      showDashboard();
    } else {
      errorEl.textContent = "Parol noto'g'ri. Qaytadan urinib ko'ring.";
      const card = document.querySelector(".login-card");
      card.classList.remove("shake");
      requestAnimationFrame(() => card.classList.add("shake"));
      input.value = "";
      input.focus();
    }
  }

  btn.addEventListener("click", attempt);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") attempt(); });

  document.getElementById("logoutLink").addEventListener("click", (e) => {
    e.preventDefault();
    sessionStorage.removeItem(AUTH_KEY);
    showLogin();
  });
}

/* ========================= DASHBOARD INIT ========================= */

function initDashboard() {
  refreshUnitOptions();
  renderStats();
  renderTable();
  bindForm();
  bindToolbar();
  bindImportExport();
}

function renderStats() {
  const words = getWords();
  document.getElementById("adminStatTotal").textContent = words.length;
  document.getElementById("adminStatUnits").textContent = getUnits(words).length;
}

/* ========================= UNIT <select> OPTIONS ========================= */

function refreshUnitOptions() {
  const units = getUnits(getWords());
  const select = document.getElementById("unitSelect");
  const filter = document.getElementById("adminUnitFilter");

  select.innerHTML =
    units.map((u) => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join("") +
    `<option value="__new__">+ Yangi unit qo'shish</option>`;

  filter.innerHTML =
    `<option value="all">Barcha unitlar</option>` +
    units.map((u) => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join("");

  if (units.length === 0) {
    select.value = "__new__";
    toggleNewUnitInput(true);
  } else {
    toggleNewUnitInput(false);
  }

  select.onchange = () => toggleNewUnitInput(select.value === "__new__");
}

function toggleNewUnitInput(show) {
  const input = document.getElementById("unitNewInput");
  input.style.display = show ? "block" : "none";
  if (show) {
    input.focus();
  } else {
    input.value = "";
  }
}

function getSelectedUnitValue() {
  const select = document.getElementById("unitSelect");
  const input = document.getElementById("unitNewInput");
  return select.value === "__new__" ? input.value.trim() : select.value;
}

/* ========================= FORM (add / edit) ========================= */

function bindForm() {
  const form = document.getElementById("wordForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const unit = getSelectedUnitValue();
    const word = document.getElementById("wordInput").value.trim();
    const pos = document.getElementById("posSelect").value;
    const meaning = document.getElementById("meaningInput").value.trim();
    const example = document.getElementById("exampleInput").value.trim();

    if (!unit || !word || !meaning) {
      showToast("Unit, so'z va ma'no maydonlarini to'ldiring.", true);
      return;
    }

    if (editingId) {
      updateWord(editingId, { unit, word, pos, meaning, example });
      showToast(`"${word}" yangilandi.`);
      exitEditMode();
    } else {
      addWord({ unit, word, pos, meaning, example });
      showToast(`"${word}" qo'shildi.`);
      form.reset();
    }

    refreshUnitOptions();
    renderStats();
    renderTable();
  });

  document.getElementById("cancelEditBtn").addEventListener("click", exitEditMode);
}

function enterEditMode(w) {
  editingId = w.id;
  document.getElementById("formTitle").textContent = `"${w.word}" so'zini tahrirlash`;
  document.getElementById("submitBtn").textContent = "Saqlash";
  document.getElementById("cancelEditBtn").style.display = "inline-flex";

  const select = document.getElementById("unitSelect");
  const hasUnit = Array.from(select.options).some((o) => o.value === w.unit);
  if (hasUnit) {
    select.value = w.unit;
    toggleNewUnitInput(false);
  } else {
    select.value = "__new__";
    toggleNewUnitInput(true);
    document.getElementById("unitNewInput").value = w.unit;
  }

  document.getElementById("wordInput").value = w.word;
  document.getElementById("posSelect").value = w.pos || "";
  document.getElementById("meaningInput").value = w.meaning;
  document.getElementById("exampleInput").value = w.example || "";

  document.getElementById("wordForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

function exitEditMode() {
  editingId = null;
  document.getElementById("formTitle").textContent = "Yangi so'z qo'shish";
  document.getElementById("submitBtn").textContent = "So'z qo'shish";
  document.getElementById("cancelEditBtn").style.display = "none";
  document.getElementById("wordForm").reset();
  refreshUnitOptions();
}

/* ========================= TABLE ========================= */

function bindToolbar() {
  document.getElementById("adminSearch").addEventListener("input", (e) => {
    adminSearchTerm = e.target.value;
    renderTable();
  });
  document.getElementById("adminUnitFilter").addEventListener("change", (e) => {
    adminUnitFilter = e.target.value;
    renderTable();
  });
}

function renderTable() {
  const words = getWords().filter((w) => {
    const unitMatch = adminUnitFilter === "all" || w.unit === adminUnitFilter;
    const term = adminSearchTerm.trim().toLowerCase();
    const textMatch =
      term === "" || w.word.toLowerCase().includes(term) || w.meaning.toLowerCase().includes(term);
    return unitMatch && textMatch;
  });

  const body = document.getElementById("wordTableBody");
  const empty = document.getElementById("adminEmpty");
  body.innerHTML = "";

  if (words.length === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  words.forEach((w) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(w.word)}</strong>${w.pos ? `<br><span class="uz" style="font-size:11px;">${escapeHtml(w.pos)}</span>` : ""}</td>
      <td class="uz">${escapeHtml(w.meaning)}</td>
      <td><span class="unit-pill">${escapeHtml(w.unit)}</span></td>
      <td>
        <div class="row-actions">
          <button class="btn btn-ghost btn-sm" data-action="edit">Tahrirlash</button>
          <button class="btn btn-brick btn-sm" data-action="delete">O'chirish</button>
        </div>
      </td>
    `;
    tr.querySelector('[data-action="edit"]').addEventListener("click", () => enterEditMode(w));
    tr.querySelector('[data-action="delete"]').addEventListener("click", () => {
      if (confirm(`"${w.word}" so'zini o'chirishni tasdiqlaysizmi?`)) {
        deleteWord(w.id);
        showToast(`"${w.word}" o'chirildi.`);
        refreshUnitOptions();
        renderStats();
        renderTable();
      }
    });
    body.appendChild(tr);
  });
}

/* ========================= IMPORT / EXPORT ========================= */

function bindImportExport() {
  document.getElementById("exportBtn").addEventListener("click", () => {
    const blob = new Blob([exportWords()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lugat-zaxira.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("JSON fayl yuklab olindi.");
  });

  const fileInput = document.getElementById("importFile");
  document.getElementById("importBtn").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);

        // Accept either an Array or { words: Array }
        let dataArray = null;
        if (Array.isArray(parsed)) dataArray = parsed;
        else if (parsed && Array.isArray(parsed.words)) dataArray = parsed.words;
        else throw new Error("Noto'g'ri format");

        const merge = confirm("Mavjud so'zlar bilan birlashtirilsinmi?\nOK = birlashtirish, Bekor qilish = almashtirish");
        importWords(dataArray, merge ? "merge" : "replace");
        showToast("Ma'lumotlar muvaffaqiyatli yuklandi.");
        refreshUnitOptions();
        renderStats();
        renderTable();
      } catch (err) {
        console.error("Import error:", err);
        showToast("Fayl noto'g'ri formatda.", true);
      }
      fileInput.value = "";
    };
    reader.readAsText(file);
  });
}

/* ========================= TOAST ========================= */

let toastTimer = null;
function showToast(message, isError) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.toggle("err", !!isError);
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}
