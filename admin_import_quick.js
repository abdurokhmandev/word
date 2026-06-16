/* ========================= IMPORT / EXPORT & QUICK ADD ========================= */

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
        const res = importWords(dataArray, merge ? "merge" : "replace");
        showToast(`Import: ${res.added} qo'shildi, ${res.skipped} o'tkazildi${res.replaced? ', ' + res.replaced + ' almashtirildi':''}`);
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

  // Quick add UI (textarea)
  const quickToggle = document.getElementById("quickAddToggle");
  const quickArea = document.getElementById("quickAddArea");
  const quickInput = document.getElementById("quickAddInput");
  const quickApply = document.getElementById("quickAddApply");
  const quickClear = document.getElementById("quickAddClear");

  quickToggle.addEventListener("click", () => {
    quickArea.style.display = quickArea.style.display === "none" ? "block" : "none";
    if (quickArea.style.display === "block") quickInput.focus();
  });

  quickClear.addEventListener("click", () => { quickInput.value = ""; quickArea.style.display = "none"; });

  quickApply.addEventListener("click", () => {
    const raw = quickInput.value.trim();
    if (!raw) { showToast("Hech narsa kiritilmadi.", true); return; }

    let entries = [];
    // try JSON
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) entries = parsed;
      else showToast("JSON array topilmadi.", true);
    } catch (e) {
      // parse lines: word|meaning|unit|pos|example
      const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        const parts = line.split("|");
        if (parts.length < 3) continue; // need at least word|meaning|unit
        entries.push({ word: parts[0].trim(), meaning: parts[1].trim(), unit: parts[2].trim(), pos: (parts[3]||"").trim(), example: (parts[4]||"").trim() });
      }
    }

    if (entries.length === 0) { showToast("Hech yaroqli yozuv topilmadi.", true); return; }

    let added = 0; let skipped = 0;
    for (const e of entries) {
      const res = addWord({ unit: e.unit, word: e.word, pos: e.pos, meaning: e.meaning, example: e.example });
      if (res) added++; else skipped++;
    }

    showToast(`Tez qo'shish: ${added} qo'shildi, ${skipped} o'tkazildi`);
    quickInput.value = "";
    quickArea.style.display = "none";
    refreshUnitOptions();
    renderStats();
    renderTable();
  });
}
