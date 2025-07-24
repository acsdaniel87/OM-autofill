const fs = require("fs");
const https = require("https");
const XLSX = require("xlsx");
const path = require("path");

const XLSX_URL = process.env.XLSX_URL;
const TEMP_FILE = "temp_download.xlsx";

const CSV_DIR = "azonositok";
const ARCHIVE_DIR = path.join(CSV_DIR, "archivum");
const CURRENT_FILE = path.join(CSV_DIR, "kir_mukodo_intezmenyek.csv");

function download(url, dest, cb) {
  const file = fs.createWriteStream(dest);
  https.get(url, (res) => {
    if (res.statusCode !== 200) return cb(new Error("Letöltési hiba"));
    res.pipe(file);
    file.on("finish", () => file.close(cb));
  }).on("error", cb);
}

function archiveOldFile() {
  if (!fs.existsSync(CURRENT_FILE)) return;
  if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR);

  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "_");
  const archiveName = `kir_mukodo_intezmenyek_${timestamp}.csv`;
  const archivePath = path.join(ARCHIVE_DIR, archiveName);

  fs.renameSync(CURRENT_FILE, archivePath);
  console.log(`📦 Archív fájl mentve: ${archivePath}`);
}

function convert(xlsxPath, csvPath) {
  const wb = XLSX.readFile(xlsxPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const output = rows
    .slice(1)
    .map(r => `${(r[0] || "").toString().trim()};${(r[1] || "").toString().trim()}`);

  if (!fs.existsSync(CSV_DIR)) fs.mkdirSync(CSV_DIR);
  fs.writeFileSync(csvPath, output.join("\n"), "utf8");
  console.log(`✅ Új CSV mentve: ${csvPath}`);
}

download(XLSX_URL, TEMP_FILE, (err) => {
  if (err) throw err;
  archiveOldFile();
  convert(TEMP_FILE, CURRENT_FILE);
  fs.unlinkSync(TEMP_FILE);
});
