const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cors = require("cors");
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const QUESTIONS_DIR = path.join(__dirname, "questions");

const app = express();

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const QUESTIONS_DIR = path.join(__dirname, "questions");

// kreiraj data folder ako ne postoji
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log("Kreiran folder data/");
}

// kopiraj pitanja iz questions u data, ali samo ako ih tamo nema
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
}


app.use(cors());
app.use(express.json());


app.listen(PORT, () => {
  console.log(`Server radi na portu ${PORT}`);
});

app.get("/", (req, res) => {
  res.json({ status: "API is running" });
});

// osiguraj da folder postoji
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Kopiraj default pitanja iz questions u data (ako ne postoje)
if (fs.existsSync(QUESTIONS_DIR)) {
  const files = fs.readdirSync(QUESTIONS_DIR);

  files.forEach(file => {
    const src = path.join(QUESTIONS_DIR, file);
    const dest = path.join(DATA_DIR, file);

    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      console.log("Učitano iz questions:", file);
    }
  });
}

console.log("QUESTIONS DIR:", QUESTIONS_DIR);
console.log("DATA DIR:", DATA_DIR);
console.log("Questions postoji:", fs.existsSync(QUESTIONS_DIR));

if (fs.existsSync(QUESTIONS_DIR)) {
  console.log("Files in questions:", fs.readdirSync(QUESTIONS_DIR));
}
