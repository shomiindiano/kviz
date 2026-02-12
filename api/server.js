const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cors = require("cors");

const DATA_DIR = path.join(__dirname, "data");
const QUESTIONS_DIR = path.join(__dirname, "questions");

const app = express();

app.use(cors());
app.use(express.json());

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
