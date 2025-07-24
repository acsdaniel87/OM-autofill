const fs = require("fs");
const https = require("https");
const XLSX = require("xlsx");

const XLSX_URL = process.env.XLSX_URL;
const TEMP_FILE = "temp_download.xlsx";
const CSV_FOLDER = "azonositok";
const CSV_NAME = "kir_mukodo_intezmenyek.csv";
const OUTPUT_PATH = `${CSV_FOLDER}/${CSV_NAME}`;

function download(url, dest, cb) {
  const file = fs.createWriteStream(dest);
  https.get(url, (res) => {
    if (res.statusCode !== 200) return cb(new Error("Letöltési hiba"));
    res.pipe(file);
    file.on("finish", () => file.close(cb));
  }).on("error", cb);
}

function convert(xlsxPath, csvPath) {
  const workbook = XLSX.readFile(xlsxPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const rows = data
    .slice(1) // Fejléc kihagyása
    .map(r => `${(r[0] || "").toString().trim()};${(r[1] || "").toString().trim()}`);

  if (!fs.existsSync(CSV_FOLDER)) fs.mkdirSync(CSV_FOLDER);
  fs.writeFileSync(csvPath, rows.join("\n"), "utf8");
}

download(XLSX_URL, TEMP_FILE, (err) => {
  if (err) throw err;
  convert(TEMP_FILE, OUTPUT_PATH);
  fs.unlinkSync(TEMP_FILE);
  console.log(`✅ Mentve: ${OUTPUT_PATH}`);
});
