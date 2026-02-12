/* ===== FMIR Kviz – ES5 (IE11 friendly) ===== */

/* ---------- API base ---------- */
/* ---------- API base ---------- */
function getQueryParam(name) {
  var q = window.location.search || "";
  if (q.charAt(0) === "?") q = q.substring(1);
  var parts = q.split("&");
  for (var i = 0; i < parts.length; i++) {
    var kv = parts[i].split("=");
    if (decodeURIComponent(kv[0] || "") === name) {
      return decodeURIComponent(kv[1] || "");
    }
  }
  return null;
}
function rstripSlash(s) {
  return s ? s.replace(/\/+$/, "") : s;
}
function resolveApiBase() {
  // Privremeno – da isključimo sve nedoumice oko domena/porta
  return "http://localhost:3000";
}
var API_BASE = resolveApiBase();

// Endpointi
var ENDPOINTS = {
  LIST: function(){ return API_BASE + "/files"; },
  FILE: function(name){
    // osiguraj da ima .json ekstenziju
    if (!/\.json$/i.test(name)) {
      name = name + ".json";
    }
    return API_BASE + "/questions/" + encodeURIComponent(name);
  },
  UPLOAD: function(){ return API_BASE + "/upload"; },
  DELETE: function(name){ return API_BASE + "/files/" + encodeURIComponent(name); }
};



/* ---------- XHR helper ---------- */
function xhrJSON(method, url, body, headers, cb) {
  try {
    var x = new XMLHttpRequest();
    x.open(method, url, true);
    if (headers) {
      for (var k in headers) if (headers.hasOwnProperty(k)) {
        x.setRequestHeader(k, headers[k]);
      }
    }
    x.timeout = 15000; // 15s da uhvatimo eventualni hang

    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      // Loguj sve odgovore vidljivo u konzoli
      console.log("[XHR DONE]", method, url, "status:", x.status, "ctype:", x.getResponseHeader("Content-Type"));
      if (x.status >= 200 && x.status < 300) {
        var data = null;
        try {
          // Neki serveri vrate string; parsiraj ručno
          data = x.responseText ? JSON.parse(x.responseText) : null;
        } catch (e) {
          console.error("[XHR JSON parse error]", e, "responseText length:", (x.responseText||"").length);
          alert("Neispravan JSON odgovor sa " + url);
          return cb(new Error("Neispravan JSON odgovor"));
        }
        cb(null, data);
      } else {
        console.error("[XHR ERROR]", method, url, x.status, x.statusText, x.responseText);
        alert("Greška sa servera (" + x.status + "): " + (x.statusText || "") + "\n" + url);
        cb(new Error("HTTP " + x.status + " – " + (x.statusText || "")));
      }
    };

    x.onerror = function() {
      console.error("[XHR onerror]", method, url);
      alert("Mrežna greška pri pozivu: " + url);
      cb(new Error("Mrežna greška"));
    };
    x.ontimeout = function() {
      console.error("[XHR timeout]", method, url);
      alert("Isteklo vreme čekanja (timeout) za: " + url);
      cb(new Error("Timeout"));
    };

    console.log("[XHR SEND]", method, url);
    x.send(body || null);
  } catch (e) {
    console.error("[XHR exception]", e);
    alert("Greška u zahtevu: " + e.message);
    cb(e);
  }
}


/* ---------- DOM helpers ---------- */
function $(id){ return document.getElementById(id); }
function el(tag, className, text) {
  var e = document.createElement(tag);
  if (className) e.className = className;
  if (typeof text === "string") e.textContent = text;
  return e;
}
function show(node){ if (node) node.style.display = ""; }
function hide(node){ if (node) node.style.display = "none"; }
function clear(node){ if (node) node.innerHTML = ""; }

/* ---------- Elements ---------- */
var fileListEl = $("file-list");
var uploadInput = $("new-json-file");
var uploadBtn = $("upload-btn");
var uploadStatus = $("upload-status");
var fileNameEl = $("file-name");

var quizSection = $("quiz-section");
var questionContainer = $("question-container");
var questionTextEl = $("question-text");
var optionsContainer = $("options-container");
var feedbackEl = $("feedback");
var progressContainer = $("progress-container");
var progressBar = $("progress-bar");
var progressText = $("progress-text");

var statsEl = $("stats");
var questionCounterEl = $("question-counter");
var questionCountEl = $("question-count");
var correctCountEl = $("correct-count");
var incorrectCountEl = $("incorrect-count");
var accuracyEl = $("accuracy");

var navGridEl = $("navigation-grid");

var prevBtn = $("prev-btn");
var submitBtn = $("submit-btn");
var randomModeBtn = $("random-mode-btn");
var nextBtn = $("next-btn");

var resultsEl = $("results");
var finalScoreEl = $("final-score");
var resultMessageEl = $("result-message");
var restartBtn = $("restart-btn");
var backToFilesBtn = $("back-to-files-btn");

/* ---------- State ---------- */
var QUESTIONS = [];
var ORDER = [];
var currentIdx = 0;
var answered = {}; // qIndex -> {selected: [numbers], isCorrect: bool}
var correctCount = 0;
var incorrectCount = 0;
var randomMode = false;
var currentFileName = null;

/* ---------- File list ---------- */
function loadFileList() {
  clear(fileListEl);
  var loading = el("div", "file-item loading");
  loading.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Učitavanje setova pitanja...';
  fileListEl.appendChild(loading);

  xhrJSON("GET", ENDPOINTS.LIST(), null, null, function(err, data){
    clear(fileListEl);
    if (err) {
      var row = el("div", "file-item");
      row.innerHTML = '<div class="file-name">Greška: ' + err.message + '</div>';
      fileListEl.appendChild(row);
      return;
    }
    var files = (data && data.files && data.files.slice) ? data.files.slice() : [];
    if (!files.length) {
      var empty = el("div", "file-item");
      empty.innerHTML = '<div class="file-name">Nema dostupnih JSON setova.</div>';
      fileListEl.appendChild(empty);
      return;
    }
    files.sort();
    for (var i=0; i<files.length; i++) {
      (function(name){
        var row = el("div", "file-item");
        var title = el("div", "file-name", name);
        var actions = el("div", "file-actions");

        var loadBtn = el("button", "file-action-btn load-btn");
        loadBtn.innerHTML = '<i class="fas fa-play"></i> Učitaj';
        loadBtn.onclick = function(){ startQuizFromFile(name); };

        var delBtn = el("button", "file-action-btn delete-btn");
        delBtn.innerHTML = '<i class="fas fa-trash"></i> Obriši';
        delBtn.onclick = function(){ deleteFile(name); };

        actions.appendChild(loadBtn);
        actions.appendChild(delBtn);
        row.appendChild(title);
        row.appendChild(actions);
        fileListEl.appendChild(row);
      })(files[i]);
    }
  });
}

function deleteFile(name) {
  if (!confirm('Obrisati fajl "' + name + '"?')) return;
  xhrJSON("DELETE", ENDPOINTS.DELETE(name), null, null, function(err){
    if (err) return alert("Brisanje nije uspelo: " + err.message);
    loadFileList();
  });
}

/* ---------- Upload ---------- */
if (uploadInput) {
  uploadInput.onchange = function(){
    var file = uploadInput.files && uploadInput.files[0];
    fileNameEl.textContent = file ? file.name : "Nijedan fajl nije odabran";
    uploadStatus.textContent = "";
    uploadStatus.className = "upload-status";
  };
}
if (uploadBtn) {
  uploadBtn.onclick = function(){
    var file = uploadInput.files && uploadInput.files[0];
    if (!file) {
      uploadStatus.textContent = "Izaberite JSON fajl.";
      uploadStatus.className = "upload-status error-msg";
      return;
    }
    var fd = new FormData();
    fd.append("file", file);

    uploadStatus.textContent = "Otpremanje...";
    uploadStatus.className = "upload-status";

    var x = new XMLHttpRequest();
    x.open("POST", ENDPOINTS.UPLOAD(), true);
    x.onreadystatechange = function(){
      if (x.readyState !== 4) return;
      if (x.status >= 200 && x.status < 300) {
        uploadStatus.textContent = "Uspešno otpremljeno.";
        uploadStatus.className = "upload-status success-msg";
        uploadInput.value = "";
        fileNameEl.textContent = "Nijedan fajl nije odabran";
        loadFileList();
      } else {
        uploadStatus.textContent = "Greška pri otpremanju: HTTP " + x.status;
        uploadStatus.className = "upload-status error-msg";
      }
    };
    x.send(fd);
  };
}

/* ---------- Učitavanje kviza ---------- */
function startQuizFromFile(name) {
  currentFileName = name;
  var url = ENDPOINTS.FILE(name);
  console.log("[QUIZ LOAD] startQuizFromFile ->", name, "URL:", url);

  xhrJSON("GET", url, null, null, function(err, payload){
    if (err) {
      console.error("[QUIZ LOAD ERROR]", err);
      alert('Ne mogu da učitam "' + name + '": ' + err.message);
      return;
    }

    console.log("[QUIZ LOAD OK] payload tip:", Object.prototype.toString.call(payload), "primer:", payload && payload[0]);

    var arr = null;
    if (Object.prototype.toString.call(payload) === "[object Array]") arr = payload;
    else if (payload && Object.prototype.toString.call(payload.questions) === "[object Array]") arr = payload.questions;

    if (!arr) {
      console.error("[QUIZ PARSE] Neispravan format payloada:", payload);
      alert("Neispravan format fajla (očekivan je niz pitanja).");
      return;
    }
    if (!arr.length) { alert("Fajl ne sadrži pitanja."); return; }

    QUESTIONS = [];
    for (var i=0; i<arr.length; i++) {
      var q = arr[i] || {};
      var opts = (q.options && q.options.slice) ? q.options.slice() : [];
      var normOpts = [];
      for (var j=0; j<opts.length; j++) {
        var o = opts[j] || {};
        normOpts.push({
          text: (o.text != null ? String(o.text) : "").replace(/^\s+|\s+$/g, ""),
          correct: !!o.correct
        });
      }
      QUESTIONS.push({
        question: (q.question != null ? String(q.question) : "").replace(/^\s+|\s+$/g, ""),
        options: normOpts,
        explanation: (typeof q.explanation === "string") ? q.explanation : ""
      });
    }

    console.log("[QUIZ PARSE OK] broj pitanja:", QUESTIONS.length);

    ORDER = [];
    for (var k=0; k<QUESTIONS.length; k++) ORDER.push(k);
    currentIdx = 0;
    answered = {};
    correctCount = 0;
    incorrectCount = 0;
    randomMode = false;
    randomModeBtn.className = "btn random-mode-btn";
    randomModeBtn.innerHTML = '<i class="fas fa-random"></i> Nasumična pitanja: Isključeno';

    show(quizSection);
    quizSection.style.display = "block"; // forsiraj vidljivost
quizSection.style.visibility = "visible";
console.log("Quiz section visible?", quizSection);

    show(progressContainer);
    show(statsEl);
    show(questionContainer);
    show(navGridEl);

// --- Forsiraj vidljivost da nadjačamo CSS display:none ---
if (quizSection) {
  quizSection.style.display = "block";
  quizSection.style.visibility = "visible";
}
if (questionContainer) questionContainer.style.display = "block";     // .question-container je u CSS-u display:none
if (progressContainer)  progressContainer.style.display  = "block";   // .progress-container je u CSS-u display:none
if (statsEl)            statsEl.style.display            = "flex";    // .stats koristi flex layout
if (navGridEl)          navGridEl.style.display          = "grid";    // .navigation-grid koristi grid

console.log("[FORCE SHOW] Sekcije su prikazane (block/flex/grid).");


    hide(resultsEl);
    clear(feedbackEl);
    hide(feedbackEl);

    renderNavGrid();
    renderStats();
    renderProgress();
    renderQuestion();
    console.log("Rendering question:", q.question, "options:", q.options.length);
console.log("Options container innerHTML:", optionsContainer.innerHTML);


    // Vidljiv vizuelni indikator da je sve prošlo
    alert("Učitan set: " + name + " (" + QUESTIONS.length + " pitanja)");

    try { quizSection.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {}
  });
}


/* ---------- Render ---------- */
function renderNavGrid() {
  clear(navGridEl);
  for (var i=0; i<ORDER.length; i++) {
    (function(orderPos){
      var btn = el("button", "nav-btn", String(orderPos + 1));
      if (orderPos === currentIdx) btn.className += " current";
      var qIndex = ORDER[orderPos];
      if (answered[qIndex]) {
        btn.className += answered[qIndex].isCorrect ? " answered" : " incorrect";
      }
      btn.onclick = function(){
        currentIdx = orderPos;
        renderAllForMove();
      };
      navGridEl.appendChild(btn);
    })(i);
  }
}

function renderQuestion() {
  var qIndex = ORDER[currentIdx];
  var q = QUESTIONS[qIndex];

  questionCounterEl.textContent = "Pitanje " + (currentIdx + 1) + "/" + QUESTIONS.length;
  questionCountEl.textContent = (currentIdx + 1) + "/" + QUESTIONS.length;

  questionTextEl.textContent = q.question || "(prazno pitanje)";

  clear(optionsContainer);

  if (!q.options.length) {
    var empty = el("div", "explanation", "Ovo pitanje nema ponuđene odgovore u fajlu.");
    optionsContainer.appendChild(empty);
  } else {
    var correctTotal = 0;
    for (var i=0; i<q.options.length; i++) if (q.options[i].correct) correctTotal++;
    var inputType = correctTotal > 1 ? "checkbox" : "radio";
    var nameAttr = "q_" + qIndex;

    for (var j=0; j<q.options.length; j++) {
      (function(optIdx){
        var opt = q.options[optIdx];
        var wrap = el("div", "option");
        var input = document.createElement("input");
        input.type = inputType;
        input.name = nameAttr;
        input.value = String(optIdx);

        var prev = answered[qIndex] && answered[qIndex].selected || [];
        for (var t=0; t<prev.length; t++) {
          if (prev[t] === optIdx) { input.checked = true; break; }
        }

        var label = el("label", null, opt.text || "(prazan odgovor)");
        wrap.appendChild(input);
        wrap.appendChild(label);
        optionsContainer.appendChild(wrap);
      })(j);
    }
  }

  clear(feedbackEl); hide(feedbackEl);

  var btns = navGridEl.getElementsByClassName("nav-btn");
  for (var b=0; b<btns.length; b++) {
    if (btns[b].className.indexOf(" current") >= 0) {
      btns[b].className = btns[b].className.replace(" current", "");
    }
    if (b === currentIdx) btns[b].className += " current";
  }
}

/* ---------- Answer check ---------- */
function getSelectedIndices(qIndex) {
  var inputs = optionsContainer.querySelectorAll("input[type=checkbox],input[type=radio]");
  var out = [];
  for (var i=0; i<inputs.length; i++) {
    if (inputs[i].checked) {
      var num = parseInt(inputs[i].value, 10);
      if (!isNaN(num)) out.push(num);
    }
  }
  return out;
}
function isSelectionCorrect(qIndex, selectedArr) {
  var opts = QUESTIONS[qIndex].options;
  var trueArr = [];
  for (var i=0; i<opts.length; i++) if (opts[i].correct) trueArr.push(i);

  if (trueArr.length === 0) return false;
  if (trueArr.length !== selectedArr.length) return false;

  // proveri da su svi elementi isti skup (redosled nebitan)
  function contains(arr, v) {
    for (var k=0; k<arr.length; k++) if (arr[k] === v) return true;
    return false;
  }
  for (var j=0; j<selectedArr.length; j++) {
    if (!contains(trueArr, selectedArr[j])) return false;
  }
  return true;
}

function submitAnswer() {
  var qIndex = ORDER[currentIdx];
  var selected = getSelectedIndices(qIndex);

  if (!selected.length) {
    feedbackEl.className = "feedback incorrect";
    feedbackEl.innerHTML = "Niste izabrali nijedan odgovor.";
    show(feedbackEl);
    return;
  }

  var ok = isSelectionCorrect(qIndex, selected);
  answered[qIndex] = { selected: selected.slice(), isCorrect: ok };

  // prikaži boje
  var rows = optionsContainer.getElementsByClassName("option");
  for (var i=0; i<rows.length; i++) {
    var isTrue = !!(QUESTIONS[qIndex].options[i] && QUESTIONS[qIndex].options[i].correct);
    if (isTrue) rows[i].className += " correct-option";
    else {
      // ako je izabrana a nije tačna
      var chosen = false;
      for (var c=0; c<selected.length; c++) if (selected[c] === i) { chosen = true; break; }
      if (chosen) rows[i].className += " incorrect-option";
    }
  }

  if (ok) {
    correctCount++;
    feedbackEl.className = "feedback correct";
    feedbackEl.innerHTML = "Tačno!";
  } else {
    incorrectCount++;
    // sklopi tačne
    var texts = [];
    for (var t=0; t<QUESTIONS[qIndex].options.length; t++) {
      if (QUESTIONS[qIndex].options[t].correct) texts.push(QUESTIONS[qIndex].options[t].text);
    }
    feedbackEl.className = "feedback incorrect";
    feedbackEl.innerHTML = 'Netačno.<div class="correct-answer">Tačan/tačni: ' + (texts.join(", ") || "-") + "</div>";
  }

  if (QUESTIONS[qIndex].explanation) {
    var exp = el("div", "explanation", QUESTIONS[qIndex].explanation);
    feedbackEl.appendChild(exp);
  }

  show(feedbackEl);
  renderStats();
  renderNavGrid();

  if (allAnswered()) showResults();
}

/* ---------- Nav ---------- */
function nextQuestion(){ if (currentIdx < ORDER.length - 1) { currentIdx++; renderAllForMove(); } }
function prevQuestion(){ if (currentIdx > 0) { currentIdx--; renderAllForMove(); } }

function toggleRandomMode() {
  randomMode = !randomMode;
  if (randomMode) {
    randomizeOrder();
    randomModeBtn.className = "btn random-mode-btn active";
    randomModeBtn.innerHTML = '<i class="fas fa-random"></i> Nasumična pitanja: Uključeno';
  } else {
    ORDER = [];
    for (var i=0; i<QUESTIONS.length; i++) ORDER.push(i);
    currentIdx = 0;
    randomModeBtn.className = "btn random-mode-btn";
    randomModeBtn.innerHTML = '<i class="fas fa-random"></i> Nasumična pitanja: Isključeno';
  }
  renderNavGrid();
  renderAllForMove();
}

function randomizeOrder() {
  ORDER = [];
  for (var i=0; i<QUESTIONS.length; i++) ORDER.push(i);
  for (var j=ORDER.length - 1; j>0; j--) {
    var r = Math.floor(Math.random() * (j + 1));
    var tmp = ORDER[j]; ORDER[j] = ORDER[r]; ORDER[r] = tmp;
  }
  currentIdx = 0;
}

/* ---------- Stats/Progress ---------- */
function renderStats() {
  var totalAnswered = 0;
  for (var k in answered) if (answered.hasOwnProperty(k)) totalAnswered++;
  var total = QUESTIONS.length;
  var acc = totalAnswered ? Math.round((correctCount / totalAnswered) * 100) : 0;

  questionCountEl.textContent = (currentIdx + 1) + "/" + total;
  correctCountEl.textContent = String(correctCount);
  incorrectCountEl.textContent = String(incorrectCount);
  accuracyEl.textContent = acc + "%";
}
function renderProgress() {
  var totalAnswered = 0;
  for (var k in answered) if (answered.hasOwnProperty(k)) totalAnswered++;
  var total = QUESTIONS.length;
  var pct = total ? Math.round((totalAnswered / total) * 100) : 0;
  progressBar.style.width = pct + "%";
  progressText.textContent = pct + "%";
}
function renderAllForMove() {
  renderQuestion();
  renderStats();
  renderProgress();
}

/* ---------- Results ---------- */
function allAnswered() {
  var count = 0;
  for (var k in answered) if (answered.hasOwnProperty(k)) count++;
  return count === QUESTIONS.length;
}
function showResults() {
  finalScoreEl.textContent = String(correctCount) + "/" + String(QUESTIONS.length);
  var accuracy = QUESTIONS.length ? Math.round((correctCount / QUESTIONS.length) * 100) : 0;
  if (accuracy === 100) resultMessageEl.textContent = "Savršeno!";
  else if (accuracy >= 80) resultMessageEl.textContent = "Odlično!";
  else if (accuracy >= 60) resultMessageEl.textContent = "Dobro!";
  else resultMessageEl.textContent = "Probaj još jednom.";
  show(resultsEl);
}

/* ---------- Buttons ---------- */
if (submitBtn) submitBtn.onclick = submitAnswer;
if (nextBtn) nextBtn.onclick = nextQuestion;
if (prevBtn) prevBtn.onclick = prevQuestion;
if (randomModeBtn) randomModeBtn.onclick = toggleRandomMode;
if (restartBtn) restartBtn.onclick = function(){ if (currentFileName) startQuizFromFile(currentFileName); };
if (backToFilesBtn) backToFilesBtn.onclick = function(){
  hide(quizSection);
  loadFileList();
  try { window.scrollTo(0, 0); } catch (e) {}
};

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", function(){ loadFileList(); });
