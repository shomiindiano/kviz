const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, "data");

// osiguraj da folder postoji
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// upload konfiguracija
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DATA_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// listanje fajlova
app.get("/files", (req, res) => {
  fs.readdir(DATA_DIR, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Greška pri čitanju fajlova." });
    }
    res.json({ files });
  });
});

// vraćanje sadržaja fajla za kviz
app.get("/questions/:name", (req, res) => {
  const filePath = path.join(DATA_DIR, req.params.name);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Fajl ne postoji." });
  }
  try {
    const data = fs.readFileSync(filePath, "utf8");
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: "Greška pri čitanju fajla." });
  }
});

// preuzimanje fajla direktno
app.get("/files/:name", (req, res) => {
  const filePath = path.join(DATA_DIR, req.params.name);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Fajl ne postoji." });
  }
  res.sendFile(filePath);
});

// upload fajla
app.post("/upload", upload.single("file"), (req, res) => {
  res.json({ message: "Fajl uspešno otpremljen." });
});

// brisanje fajla
app.delete("/files/:name", (req, res) => {
  const filePath = path.join(DATA_DIR, req.params.name);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Fajl ne postoji." });
  }
  fs.unlink(filePath, (err) => {
    if (err) {
      return res.status(500).json({ error: "Greška pri brisanju fajla." });
    }
    res.json({ message: "Fajl obrisan." });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server radi na portu ${PORT}`);
});
