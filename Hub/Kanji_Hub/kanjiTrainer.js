let currentIndex = 0;
let currentKanji = null;


function getMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("mode") || "evolution";
}

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

function normalize(str) {
  return (str ?? "").toString().trim().toLowerCase();
}

async function getCurrentUser() {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  if (!token || !userId) return null;

  const response = await fetch(`/api/user/${userId}`, {
    headers: { Authorization: "Bearer " + token }
  });
  if (!response.ok) return null;
  return await response.json();
}

async function saveUser(updates) {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  if (!token || !userId) return;

  const response = await fetch(`/api/user/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify(updates)
  });

  return await response.json();
}

async function mountHeaderUserInfo() {
  const user = await getCurrentUser();
  if (!user) return;

  document.getElementById("user-name").textContent = user.username;
  document.getElementById("user-level").textContent = `Niveau ${user.level}`;
  document.getElementById("user-coins").textContent = user.coins;
  document.getElementById("user-companion").src = `../../companions/${user.mainCompanion}.png`;
}
document.addEventListener("DOMContentLoaded", mountHeaderUserInfo);

function getCooldownForLevel(level) {
  const minutes = [
    0,          // niveau 0
    5,          // niveau 1
    30,         // niveau 2
    2 * 60,     // niveau 3
    8 * 60,     // niveau 4
    12 * 60,    // niveau 5
    20 * 60,    // niveau 6
    30 * 60,    // niveau 7
    38 * 60,    // niveau 8
    48 * 60     // niveau 9
  ];

  const min = minutes[Math.min(level, 9)] || 0;
  return min * 60 * 1000; // ms
}

async function pickKanjiForUser() {
  const user = await getCurrentUser();
  const niveauUtilisateur = user?.level || 1;
  const mode = getMode();

  const totalKanji = kanjiData.length;
  const maxVisible = Math.floor((Math.min(niveauUtilisateur-10, 10) * totalKanji) / 10);

  const accessibles = kanjiData.slice(0, maxVisible).filter(kanji => {
    if (!kanji.lastReviewed || !kanji.cooldown) return true;
    return (Date.now() - kanji.lastReviewed) >= kanji.cooldown;
  });

  let filteredKanji;
  if (mode === "decouverte") {
    filteredKanji = accessibles.filter(k => (k.level ?? 0) === 0);
  } else {
    filteredKanji = accessibles.filter(k => (k.level ?? 0) > 0);
  }

  if (filteredKanji.length === 0) {
    alert("Aucun kanji disponible pour ce mode !");
    return null;
  }

  return filteredKanji[Math.floor(Math.random() * filteredKanji.length)];
}

function checkLevelUpUtilisateur() {
  const email = localStorage.getItem("currentUser");
  const user = JSON.parse(localStorage.getItem(`user_${email}`));

  if (!user) return;
  if (!user.level) user.level = 1;

  const totalKanji = kanjiData.length;
  const maxVisible = Math.floor((Math.min(user.level, 10) * totalKanji) / 10);
  const kanjiVisibles = kanjiData.slice(0, maxVisible);

  const tousAuMoins5 = kanjiVisibles.every(kanji => (kanji.level || 0) >= 5);
  if (tousAuMoins5 && user.level < 11) {
    user.level += 1;
    localStorage.setItem(`user_${email}`, JSON.stringify(user));
    alert(`🎉 Tu es passé au niveau ${user.level} !`);
  }
}

async function loadKanjiProgress() {
  const user = await getCurrentUser();
  if (!user || !user.kanjiProgress) return;

  kanjiData.forEach((k) => {
    const saved = user.kanjiProgress[k.kanji]; // clé = caractère
    if (saved) {
      k.level = saved.level ?? 0;
      k.xp = saved.xp ?? 0;
      k.lastReviewed = (typeof saved.lastReviewed === "number")
        ? saved.lastReviewed
        : (saved.lastReviewed ? new Date(saved.lastReviewed).getTime() : null);
      k.cooldown = saved.cooldown ?? 0;
    }
  });
}

async function saveKanjiProgress() {
  const progress = {};
  kanjiData.forEach(k => {
    progress[k.kanji] = {
      level: k.level ?? 0,
      xp: k.xp ?? 0,
      lastReviewed: (typeof k.lastReviewed === "number" || k.lastReviewed === null) ? k.lastReviewed : (k.lastReviewed ? new Date(k.lastReviewed).getTime() : null),
      cooldown: k.cooldown ?? 0
    };
  });

  await saveUser({ kanjiProgress: progress });
}

function gainXP(kanji, amount) {
  const mode = getMode();
  if (mode !== "evolution") return;

  kanji.xp = (kanji.xp ?? 0) + amount;
  kanji.lastReviewed = Date.now();
  kanji.cooldown = getCooldownForLevel(kanji.level ?? 0);

  if ((kanji.xp ?? 0) >= 30 && (kanji.level ?? 0) < 10) {
    kanji.level = (kanji.level ?? 0) + 1;
    kanji.xp = 0;
    alert(`🎉 ${kanji.kanji} passe au niveau ${kanji.level} !`);
    checkLevelUpUtilisateur();
    rewardCoins((kanji.level ?? 1) - 1);
  }

  rewardCoins(1);
  saveKanjiProgress();
}

function loseXP(kanji, amount) {
  const mode = getMode();
  if (mode !== "evolution") return;

  kanji.xp = (kanji.xp ?? 0) - amount;
  kanji.lastReviewed = Date.now();
  kanji.cooldown = getCooldownForLevel(kanji.level ?? 0);

  if ((kanji.xp ?? 0) < 0) {
    if ((kanji.level ?? 0) > 0) kanji.level = (kanji.level ?? 0) - 1;
    kanji.xp = 0;
    alert(`❌ ${kanji.kanji} redescend au niveau ${kanji.level}...`);
  }
  saveKanjiProgress();
}

function renderLevel0(kanji) {
  const container = document.getElementById("quiz-container");
  container.innerHTML = `
    <h2>Découverte du kanji</h2>
    <div id="kanji-card">
      <div id="kanji-char" style="font-size: 5rem;">${kanji.kanji}</div>
      <p><strong>Lecture onyomi :</strong> ${kanji.onReading}</p>
      <p><strong>Lecture kunyomi :</strong> ${kanji.kunReading}</p>
      <p><strong>Signification :</strong> ${kanji.meaning}</p>
      <p id="kanji-mnemonic">${kanji.mnemonic}</p>
      <button id="next-btn">Suivant</button>
    </div>
  `;

  const nextBtn = document.getElementById("next-btn");
  nextBtn.addEventListener("click", () => {
    kanji.level = 1;
    kanji.xp = 0;
    kanji.lastReviewed = Date.now();
    kanji.cooldown = getCooldownForLevel(1);
    saveKanjiProgress();
    showNextQuestion();
  });
}

function renderQCMKanjiToReading(kanji, onDone) {
  const container = document.getElementById("quiz-container");

  const answers = shuffle([
    "kunReading : " + kanji.kunReading + "   onReading : " + kanji.onReading,
    ...shuffle(kanjiData.filter(k => k.kunReading + k.onReading !== kanji.kunReading + kanji.onReading)).slice(0, 3).map(k => "kunReading : " + k.kunReading + "   onReading : " + k.onReading)
  ]);

  container.innerHTML = `
    <h2>Quelle est la prononciation de ce kanji ?</h2>
    <div id="kanji-card">
      <div id="kanji-char" style="font-size: 5rem;">${kanji.kanji}</div>
      <div id="answers"></div>
      <div id="feedback"></div>
      <button id="next-btn" class="next-btn hidden">Suivant →</button>
    </div>
  `;

  const answerDiv = document.getElementById("answers");
  const feedback  = document.getElementById("feedback");
  const nextBtn   = document.getElementById("next-btn");

  let answered = false;

  answers.forEach(rep => {
    const btn = document.createElement("button");
    btn.textContent = rep;
    btn.type = "button";
    btn.className = "answer-btn";
    btn.onclick = () => {
      if (answered) return;
      answered = true;

      const btns = Array.from(answerDiv.querySelectorAll(".answer-btn"));
      btns.forEach(b => {
        b.classList.add("locked");
        const isCorrect = b.textContent === "kunReading : " + kanji.kunReading + "   onReading : " + kanji.onReading;
        if (isCorrect) b.classList.add("correct");
        if (!isCorrect && b === btn) b.classList.add("wrong");
      });

      if (rep === "kunReading : " + kanji.kunReading + "   onReading : " + kanji.onReading) {
        feedback.textContent = "✅ Bonne réponse !";
        feedback.className = "good";
        gainXP(kanji, 10);
      } else {
        feedback.textContent = `❌ Mauvaise réponse. Bonne réponse : “${"kunReading : " + kanji.kunReading + "   onReading : " + kanji.onReading}”.`;
        feedback.className = "bad";
        loseXP(kanji, 5);
      }

      nextBtn.classList.remove("hidden");
      nextBtn.onclick = (e) => { e.preventDefault(); onDone(); };
    };
    answerDiv.appendChild(btn);
  });
}

function renderQCMKanjiToMeaning(kanji, onDone) {
  const container = document.getElementById("quiz-container");

  const answers = shuffle([
    kanji.meaning,
    ...shuffle(kanjiData.filter(k => k.meaning !== kanji.meaning)).slice(0, 3).map(k => k.meaning)
  ]);

  container.innerHTML = `
    <h2>Quelle est la signification de ce kanji ?</h2>
    <div id="kanji-card">
      <div id="kanji-char" style="font-size: 5rem;">${kanji.kanji}</div>
      <div id="answers"></div>
      <div id="feedback"></div>
      <button id="next-btn" class="next-btn hidden">Suivant →</button>
    </div>
  `;

  const answerDiv = document.getElementById("answers");
  const feedback  = document.getElementById("feedback");
  const nextBtn   = document.getElementById("next-btn");

  let answered = false;

  answers.forEach(rep => {
    const btn = document.createElement("button");
    btn.textContent = rep;
    btn.type = "button";
    btn.className = "answer-btn";
    btn.onclick = () => {
      if (answered) return;
      answered = true;

      const btns = Array.from(answerDiv.querySelectorAll(".answer-btn"));
      btns.forEach(b => {
        b.classList.add("locked");
        const isCorrect = b.textContent === kanji.meaning;
        if (isCorrect) b.classList.add("correct");
        if (!isCorrect && b === btn) b.classList.add("wrong");
      });

      if (rep === kanji.meaning) {
        feedback.textContent = "✅ Bonne réponse !";
        feedback.className = "good";
        gainXP(kanji, 10);
      } else {
        feedback.textContent = `❌ Mauvaise réponse. Bonne réponse : “${kanji.meaning}”.`;
        feedback.className = "bad";
        loseXP(kanji, 5);
      }

      nextBtn.classList.remove("hidden");
      nextBtn.onclick = (e) => { e.preventDefault(); onDone(); };
    };
    answerDiv.appendChild(btn);
  });
}

function renderQCMReadingToKanji(kanji, onDone) {
  const container = document.getElementById("quiz-container");

  const answers = shuffle([
    kanji.kanji,
    ...shuffle(kanjiData.filter(k => k.kanji !== kanji.kanji && "kunReading : " + k.kunReading + "   onReading : " + k.onReading === "kunReading : " + kanji.kunReading + "   onReading : " + kanji.onReading)).slice(0, 1).map(k => k.kanji),
    ...shuffle(kanjiData.filter(k => k.kanji !== kanji.kanji)).slice(0, 3).map(k => k.kanji)
  ]);

  container.innerHTML = `
    <h2>Quel kanji correspond à : ${"kunReading : " + kanji.kunReading + "   onReading : " + kanji.onReading} ?</h2>
    <div id="answers"></div>
    <div id="feedback"></div>
    <button id="next-btn" class="next-btn hidden">Suivant →</button>
  `;

  const answerDiv = document.getElementById("answers");
  const feedback  = document.getElementById("feedback");
  const nextBtn   = document.getElementById("next-btn");

  let answered = false;

  answers.forEach(rep => {
    const btn = document.createElement("button");
    btn.textContent = rep;
    btn.type = "button";
    btn.className = "answer-btn";
    btn.onclick = () => {
      if (answered) return;
      answered = true;

      const btns = Array.from(answerDiv.querySelectorAll(".answer-btn"));
      btns.forEach(b => {
        b.classList.add("locked");
        const isCorrect = b.textContent === kanji.kanji;
        if (isCorrect) b.classList.add("correct");
        if (!isCorrect && b === btn) b.classList.add("wrong");
      });

      if (rep === kanji.kanji) {
        feedback.textContent = "✅ Bonne réponse !";
        feedback.className = "good";
        gainXP(kanji, 10);
      } else {
        feedback.textContent = `❌ Mauvaise réponse. Bonne réponse : “${kanji.kanji}”.`;
        feedback.className = "bad";
        loseXP(kanji, 5);
      }

      nextBtn.classList.remove("hidden");
      nextBtn.onclick = (e) => { e.preventDefault(); onDone(); };
    };
    answerDiv.appendChild(btn);
  });
}

function renderQCMMeaningToKanji(kanji, onDone) {
  const container = document.getElementById("quiz-container");

  const answers = shuffle([
    kanji.kanji,
    ...shuffle(kanjiData.filter(k => k.kanji !== kanji.kanji)).slice(0, 3).map(k => k.kanji)
  ]);

  container.innerHTML = `
    <h2>Quel kanji correspond à : ${kanji.meaning} ?</h2>
    <div id="answers"></div>
    <div id="feedback"></div>
    <button id="next-btn" class="next-btn hidden">Suivant →</button>
  `;

  const answerDiv = document.getElementById("answers");
  const feedback  = document.getElementById("feedback");
  const nextBtn   = document.getElementById("next-btn");

  let answered = false;

  answers.forEach(rep => {
    const btn = document.createElement("button");
    btn.textContent = rep;
    btn.type = "button";
    btn.className = "answer-btn";
    btn.onclick = () => {
      if (answered) return;
      answered = true;

      const btns = Array.from(answerDiv.querySelectorAll(".answer-btn"));
      btns.forEach(b => {
        b.classList.add("locked");
        const isCorrect = b.textContent === kanji.kanji;
        if (isCorrect) b.classList.add("correct");
        if (!isCorrect && b === btn) b.classList.add("wrong");
      });

      if (rep === kanji.kanji) {
        feedback.textContent = "✅ Bonne réponse !";
        feedback.className = "good";
        gainXP(kanji, 10);
      } else {
        feedback.textContent = `❌ Mauvaise réponse. Bonne réponse : “${kanji.kanji}”.`;
        feedback.className = "bad";
        loseXP(kanji, 5);
      }

      nextBtn.classList.remove("hidden");
      nextBtn.onclick = (e) => { e.preventDefault(); onDone(); };
    };
    answerDiv.appendChild(btn);
  });
}

function renderOpenReading(kanji, onDone) {
  const container = document.getElementById("quiz-container");
  container.innerHTML = `
    <h2>Quelle est la prononciation de ce kanji ?</h2>
    <div id="kanji-char" style="font-size: 5rem;">${kanji.kanji}</div>
    <input type="text" id="kanji-input" placeholder="Écris la lecture (ou les lectures) en romaji" />
    <button id="show-solution-btn">Voir la solution</button>
    <div id="feedback"></div>
    <div id="self-eval" style="display:none; margin-top:0.5rem;">
      <p>Est-ce que tu considères ta réponse correcte ?</p>
      <button id="self-correct-btn">Oui, j'avais juste</button>
      <button id="self-wrong-btn">Non, je me suis trompé</button>
    </div>
    <button id="next-btn" class="next-btn" style="display:none; margin-top:0.5rem;">Suivant →</button>
  `;

  const input       = document.getElementById("kanji-input");
  const showSolutionBtn = document.getElementById("show-solution-btn");
  const feedback    = document.getElementById("feedback");
  const selfEval    = document.getElementById("self-eval");
  const selfCorrect = document.getElementById("self-correct-btn");
  const selfWrong   = document.getElementById("self-wrong-btn");
  const nextBtn     = document.getElementById("next-btn");

  let solutionShown = false;
  let judged = false;

  showSolutionBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (solutionShown) return;
    solutionShown = true;

    const val = input.value || "(vide)";

    // On lock l'input et le bouton
    input.disabled = true;
    showSolutionBtn.disabled = true;

    // On affiche la réponse de l’utilisateur + les lectures possibles
    feedback.innerHTML = `
      <p>Ta réponse : <strong>${val}</strong></p>
      <p>Lectures possibles : <strong>${"kunReading : " + kanji.kunReading + "   onReading : " + kanji.onReading}</strong></p>
    `;
    feedback.className = ""; // reset couleur

    // On affiche la zone d'auto-évaluation
    selfEval.style.display = "block";
  });

  selfCorrect.addEventListener("click", (e) => {
    e.preventDefault();
    if (judged) return;
    judged = true;

    feedback.innerHTML += `<p>✅ Tu as validé ta réponse comme correcte.</p>`;
    feedback.className = "good";
    gainXP(kanji, 10);

    selfEval.style.display = "none";
    nextBtn.style.display = "inline-block";
    nextBtn.onclick = (e2) => { e2.preventDefault(); onDone(); };
  });

  selfWrong.addEventListener("click", (e) => {
    e.preventDefault();
    if (judged) return;
    judged = true;

    feedback.innerHTML += `<p>❌ Tu as indiqué que ta réponse était incorrecte.</p>`;
    feedback.className = "bad";
    loseXP(kanji, 5);

    selfEval.style.display = "none";
    nextBtn.style.display = "inline-block";
    nextBtn.onclick = (e2) => { e2.preventDefault(); onDone(); };
  });
}

function renderOpenMeaning(kanji, onDone) {
  const container = document.getElementById("quiz-container");
  container.innerHTML = `
    <h2>Quelle est la signification de ce kanji ?</h2>
    <div id="kanji-char" style="font-size: 5rem;">${kanji.kanji}</div>
    <input type="text" id="kanji-input" placeholder="Écris la signification (ou une des significations)" />
    <button id="show-solution-btn">Voir la solution</button>
    <div id="feedback"></div>
    <div id="self-eval" style="display:none; margin-top:0.5rem;">
      <p>Est-ce que tu considères ta réponse correcte ?</p>
      <button id="self-correct-btn">Oui, j'avais juste</button>
      <button id="self-wrong-btn">Non, je me suis trompé</button>
    </div>
    <button id="next-btn" class="next-btn" style="display:none; margin-top:0.5rem;">Suivant →</button>
  `;

  const input       = document.getElementById("kanji-input");
  const showSolutionBtn = document.getElementById("show-solution-btn");
  const feedback    = document.getElementById("feedback");
  const selfEval    = document.getElementById("self-eval");
  const selfCorrect = document.getElementById("self-correct-btn");
  const selfWrong   = document.getElementById("self-wrong-btn");
  const nextBtn     = document.getElementById("next-btn");

  let solutionShown = false;
  let judged = false;

  showSolutionBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (solutionShown) return;
    solutionShown = true;

    const val = input.value || "(vide)";

    input.disabled = true;
    showSolutionBtn.disabled = true;

    feedback.innerHTML = `
      <p>Ta réponse : <strong>${val}</strong></p>
      <p>Signification(s) possible(s) : <strong>${kanji.meaning}</strong></p>
    `;
    feedback.className = "";

    selfEval.style.display = "block";
  });

  selfCorrect.addEventListener("click", (e) => {
    e.preventDefault();
    if (judged) return;
    judged = true;

    feedback.innerHTML += `<p>✅ Tu as validé ta réponse comme correcte.</p>`;
    feedback.className = "good";
    gainXP(kanji, 10);

    selfEval.style.display = "none";
    nextBtn.style.display = "inline-block";
    nextBtn.onclick = (e2) => { e2.preventDefault(); onDone(); };
  });

  selfWrong.addEventListener("click", (e) => {
    e.preventDefault();
    if (judged) return;
    judged = true;

    feedback.innerHTML += `<p>❌ Tu as indiqué que ta réponse était incorrecte.</p>`;
    feedback.className = "bad";
    loseXP(kanji, 5);

    selfEval.style.display = "none";
    nextBtn.style.display = "inline-block";
    nextBtn.onclick = (e2) => { e2.preventDefault(); onDone(); };
  });
}


async function showNextQuestion() {
  const kanji = await pickKanjiForUser();
  if (!kanji) return;

  currentKanji = kanji;
  const level = kanji.level ?? 0;

  if (level === 0) {
    renderLevel0(kanji);
  } else if (level <= 2) {
    renderQCMKanjiToReading(kanji, () => {
      renderQCMKanjiToMeaning(kanji, () => {
        showNextQuestion();
      });
    });
  } else if (level <= 4) {
    renderQCMReadingToKanji(kanji, () => {
      renderQCMMeaningToKanji(kanji, () => {
        showNextQuestion();
      });
    });
  } else {
    renderOpenReading(kanji, () => {
      renderOpenMeaning(kanji, () => {
        showNextQuestion();
      });
    });
  }
}

async function rewardCoins(amount = 1) {
  const user = await getCurrentUser();
  if (!user) return;
  user.coins = (user.coins || 0) + amount;
  await saveUser({ coins: user.coins });
}


window.addEventListener("DOMContentLoaded", () => {
  loadKanjiProgress();
  showNextQuestion();
});
