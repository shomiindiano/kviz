const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cors = require("cors");

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const QUESTIONS_DIR = path.join(__dirname, "questions");

const app = express();

// Kreiraj data folder ako ne postoji
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log("Kreiran folder data/");
}

// Kopiraj pitanja iz questions u data, samo ako ih tamo nema
if (fs.existsSync(QUESTIONS_DIR)) {
  const files = fs.readdirSync(QUESTIONS_DIR);
  files.forEach(file => {
    const src = path.join(QUESTIONS_DIR, file);
    const dest = path.join(DATA_DIR, file);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      console.log(`Učitano iz questions: ${file}`);
    }
  });
} else {
  console.log("QUESTIONS DIR ne postoji! Dodaj folder questions sa .json fajlovima na Git.");
}

app.use(cors());
app.use(express.json());

// Konfiguracija za upload fajlova
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, DATA_DIR),
  filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

// --- Rute ---
app.get("/", (req, res) => res.json({ status: "API is running" }));

app.get("/files", (req, res) => {
  fs.readdir(DATA_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: "Greška pri čitanju fajlova." });
    res.json({ files });
  });
});

app.get("/questions/:name", (req, res) => {
  const filePath = path.join(DATA_DIR, req.params.name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Fajl ne postoji." });

  try {
    const data = fs.readFileSync(filePath, "utf8");
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: "Greška pri čitanju fajla." });
  }
});

app.get("/files/:name", (req, res) => {
  const filePath = path.join(DATA_DIR, req.params.name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Fajl ne postoji." });
  res.sendFile(filePath);
});

app.post("/upload", upload.single("file"), (req, res) => {
  res.json({ message: "Fajl uspešno otpremljen." });
});

app.delete("/files/:name", (req, res) => {
  const filePath = path.join(DATA_DIR, req.params.name);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Fajl ne postoji." });

  fs.unlink(filePath, (err) => {
    if (err) return res.status(500).json({ error: "Greška pri brisanju fajla." });
    res.json({ message: "Fajl obrisan." });
  });
});

app.listen(PORT, () => console.log(`Server radi na portu ${PORT}`));
