const fs = require("fs");
const https = require("https");
const XLSX = require("xlsx");
const path = require("path");

const XLSX_URL = process.env.XLSX_URL;
const TEMP_FILE = "temp_download.xlsx";
const CSV_DIR = "azonositok";
const ARCHIVE_DIR = path.join(CSV_DIR, "archivum");
const CURRENT_FILE = path.join(CSV_DIR, "kir_mukodo_intezmenyek.csv");

// 🌐 Elérhetőség tesztelése HEAD kéréssel
function testUrlReachable(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "HEAD", timeout }, (res) => {
      res.statusCode === 200 ? resolve(true) : reject(new Error(`HTTP ${res.statusCode}`));
    });
    req.on("error", reject);
    req.on("timeout", () => reject(new Error("Timeout")));
    req.end();
  });
}

// 🧾 Letöltés megnövelt timeouttal
function download(url, dest, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, { timeout }, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    });
    req.on("error", reject);
    req.on("timeout", () => reject(new Error("Letöltés timeout")));
  });
}

// 📦 Archiválás
function archiveOldFile() {
  if (!fs.existsSync(CURRENT_FILE)) return;
  if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR);

  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "_");
  const archiveName = `kir_mukodo_intezmenyek_${timestamp}.csv`;
  fs.renameSync(CURRENT_FILE, path.join(ARCHIVE_DIR, archiveName));
  console.log(`📦 Archív fájl mentve: ${archiveName}`);
}

// 🔁 Konvertálás CSV-be
function convert(xlsxPath, csvPath) {
  const workbook = XLSX.readFile(xlsxPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const output = data.slice(1).map(row => {
    const om = (row[0] || "").toString().trim();
    const name = (row[1] || "").toString().trim();
    return `${om};${name}`;
  });

  if (!fs.existsSync(CSV_DIR)) fs.mkdirSync(CSV_DIR);
  fs.writeFileSync(csvPath, output.join("\n"), "utf8");
  console.log(`✅ CSV mentve: ${csvPath}`);
}

// 🚀 Fő folyamat
(async () => {
  try {
    console.log("🌐 URL elérhetőség ellenőrzése...");
    await testUrlReachable(XLSX_URL);
    console.log("✅ Elérhető. Letöltés indul...");

    await download(XLSX_URL, TEMP_FILE);
    archiveOldFile();
    convert(TEMP_FILE, CURRENT_FILE);
    fs.unlinkSync(TEMP_FILE);
  } catch (err) {
    console.error("❌ Hiba:", err.message);
    process.exit(1);
  }
})();
