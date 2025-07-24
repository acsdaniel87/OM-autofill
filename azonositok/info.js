// OM ➝ Intézmény név adatlekérő modul
// Forrás: kir_mukodo_intezmenyek_2025_07_23.csv

const CSV_URL = "https://raw.githubusercontent.com/acsdaniel87/OM-autofill/main/azonositok/kir_mukodo_intezmenyek_2025_07_23.csv";

let omInstitutionMap = {}; // OM azonosító ➝ intézménynév

// 🔽 CSV betöltése egyszer
async function loadInstitutionData() {
  if (Object.keys(omInstitutionMap).length) return; // már betöltve

  try {
    const response = await fetch(CSV_URL);
    const text = await response.text();
    const lines = text.trim().split("\n");

    for (let i = 1; i < lines.length; i++) { // fejléc kihagyása
      const [om, name] = lines[i].split(";");
      if (om && name) {
        omInstitutionMap[om.trim()] = name.trim();
      }
    }
  } catch (err) {
    console.warn("⚠️ Intézménynév CSV betöltése sikertelen:", err);
  }
}

// 🔍 OM alapján intézménynév lekérése
async function getInstitutionName(omId) {
  await loadInstitutionData();
  return omInstitutionMap[omId] || null;
}
