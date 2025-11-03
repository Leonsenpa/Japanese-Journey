let currentIndex = 0;

function getMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("mode") || "evolution"; // "decouverte" | "evolution" | "revision" (si tu l'ajoutes)
}

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

async function getCurrentUser() {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  if (!token || !userId) return null;

  const response = await fetch(`http://localhost:3000/api/user/${userId}`, {
    headers: { Authorization: "Bearer " + token }
  });
  if (!response.ok) return null;
  return await response.json();
}

async function saveUser(updates) {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  if (!token || !userId) return;

  const response = await fetch(`http://localhost:3000/api/user/${userId}`, {
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

async function pickKanaForUser() {
  const user =  await getCurrentUser();
  const niveauUtilisateur = user?.level || 1;
  const mode = getMode();

  const totalKana = kanaData.length;
  const maxVisible = Math.floor((Math.min(niveauUtilisateur, 10) * totalKana) / 10);

  const accessibles = kanaData.slice(0, maxVisible).filter(kana => {
    if (!kana.lastReviewed || !kana.cooldown) return true;
    return (Date.now() - Number(kana.lastReviewed)) >= Number(kana.cooldown);
  });

  let filteredKana;
  if (mode === "decouverte") {
    filteredKana = accessibles.filter(k => (k.level ?? 0) === 0);
  } else {
    // "evolution" et autres → niveaux > 0
    filteredKana = accessibles.filter(k => (k.level ?? 0) > 0);
  }

  if (filteredKana.length === 0) {
    alert("Aucun kana disponible pour ce mode !");
    return null;
  }

  return filteredKana[Math.floor(Math.random() * filteredKana.length)];
}

function checkLevelUpUtilisateur() {
  const email = localStorage.getItem("currentUser");
  const user = JSON.parse(localStorage.getItem(`user_${email}`));

  if (!user) return;
  if (!user.level) user.level = 1;

  const totalKana = kanaData.length;
  const maxVisible = Math.floor((Math.min(user.level, 10) * totalKana) / 10);
  const kanaVisibles = kanaData.slice(0, maxVisible);

  const tousAuMoins5 = kanaVisibles.every(kana => (kana.level || 0) >= 5);
  if (tousAuMoins5 && user.level < 11) {
    user.level += 1;
    localStorage.setItem(`user_${email}`, JSON.stringify(user));
    alert(`🎉 Tu es passé au niveau ${user.level} !`);
  }
}

async function loadKanaProgress() {
  const user = await getCurrentUser();
  if (!user || !user.kanaProgress) return;

  kanaData.forEach((k) => {
    const saved = user.kanaProgress[k.kana]; // clé = caractère
    if (saved) {
      k.level        = saved.level ?? 0;
      k.xp           = saved.xp ?? 0;
      k.lastReviewed = (typeof saved.lastReviewed === "number")
        ? saved.lastReviewed
        : (saved.lastReviewed ? new Date(saved.lastReviewed).getTime() : null);
      k.cooldown     = saved.cooldown ?? 0;
    }
  });
}

async function saveKanaProgress() {
  const progress = {};
  kanaData.forEach(k => {
    progress[k.kana] = {
      level: k.level ?? 0,
      xp: k.xp ?? 0,
      lastReviewed: (typeof k.lastReviewed === "number" || k.lastReviewed === null) ? k.lastReviewed : (k.lastReviewed ? new Date(k.lastReviewed).getTime() : null),
      cooldown: k.cooldown ?? 0
    };
  });

  await saveUser({ kanaProgress: progress });
}

function gainXP(kana, amount) {
  const mode = getMode();
  if (mode !== "evolution") return;

  kana.xp = (kana.xp ?? 0) + amount;
  kana.lastReviewed = Date.now(); // number
  kana.cooldown = getCooldownForLevel(kana.level ?? 0);

  if ((kana.xp ?? 0) >= 30 && (kana.level ?? 0) < 10) {
    kana.level = (kana.level ?? 0) + 1;
    kana.xp = 0;
    alert(`🎉 ${kana.kana} passe au niveau ${kana.level} !`);
    checkLevelUpUtilisateur();
    rewardCoins((kana.level ?? 1) - 1);
  }

  rewardCoins(1);
  saveKanaProgress();
}

function loseXP(kana, amount) {
  const mode = getMode();
  if (mode !== "evolution") return;

  kana.xp = (kana.xp ?? 0) - amount;
  kana.lastReviewed = Date.now(); // number
  kana.cooldown = getCooldownForLevel(kana.level ?? 0);

  if ((kana.xp ?? 0) < 0) {
    if ((kana.level ?? 0) > 0) kana.level = (kana.level ?? 0) - 1;
    kana.xp = 0;
    alert(`❌ ${kana.kana} redescend au niveau ${kana.level}...`);
  }
  saveKanaProgress();
}

function renderLevel0(kana) {
  const container = document.getElementById("quiz-container");
  container.innerHTML = `
    <h2>Découverte du kana</h2>
    <div id="kanji-card">
      <div id="kanji-char" style="font-size: 5rem;">${kana.kana}</div>
      <p><strong>Lecture :</strong> ${kana.romaji}</p>
      <p id="kanji-mnemonic">${kana.mnemonic}</p>
      <button id="next-btn" class="next-btn">Suivant</button>
    </div>
  `;

  const nextBtn = document.getElementById("next-btn");
  nextBtn.addEventListener("click", () => {
    kana.level = 1;
    kana.xp = 0;
    kana.lastReviewed = Date.now(); // number
    kana.cooldown = getCooldownForLevel(1);
    saveKanaProgress();
    showNextQuestion();
  });
}

function renderQCMKanaToRomaji(kana) {
  const container = document.getElementById("quiz-container");

  const answers = shuffle([
    kana.romaji,
    ...shuffle(kanaData.filter(k => k.romaji !== kana.romaji)).slice(0, 3).map(k => k.romaji)
  ]);

  container.innerHTML = `
    <h2>Quel est la lecture de ce kana ?</h2>
    <div id="kanji-char" style="font-size: 5rem;">${kana.kana}</div>
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

      // Coloration + lock
      const btns = Array.from(answerDiv.querySelectorAll(".answer-btn"));
      btns.forEach(b => {
        b.classList.add("locked");
        const isCorrect = b.textContent === kana.romaji;
        if (isCorrect) b.classList.add("correct");
        if (!isCorrect && b === btn) b.classList.add("wrong");
      });

      // Feedback et XP
      if (rep === kana.romaji) {
        feedback.textContent = "✅ Bonne réponse !";
        feedback.className = "good";
        gainXP(kana, 10);
      } else {
        feedback.textContent = `❌ Mauvaise réponse. Bonne réponse : “${kana.romaji}”.`;
        feedback.className = "bad";
        loseXP(kana, 5);
      }

      // Bouton Suivant
      nextBtn.classList.remove("hidden");
      nextBtn.onclick = (e) => { e.preventDefault(); showNextQuestion(); };
    };
    answerDiv.appendChild(btn);
  });
}

function renderQCMRomajiToKana(kana) {
  const container = document.getElementById("quiz-container");

  const answers = shuffle([
    kana.kana,
    ...shuffle(kanaData.filter(k => k.kana !== kana.kana && k.romaji === kana.romaji)).slice(0, 1).map(k => k.kana),
    ...shuffle(kanaData.filter(k => k.kana !== kana.kana)).slice(0, 2).map(k => k.kana)
  ]);

  container.innerHTML = `
    <h2>Quel kana correspond à : ${kana.romaji} ?</h2>
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
        const isCorrect = b.textContent === kana.kana;
        if (isCorrect) b.classList.add("correct");
        if (!isCorrect && b === btn) b.classList.add("wrong");
      });

      if (rep === kana.kana) {
        feedback.textContent = "✅ Bonne réponse !";
        feedback.className = "good";
        gainXP(kana, 10);
      } else {
        feedback.textContent = `❌ Mauvaise réponse. Bonne réponse : “${kana.kana}”.`;
        feedback.className = "bad";
        loseXP(kana, 5);
      }

      nextBtn.classList.remove("hidden");
      nextBtn.onclick = (e) => { e.preventDefault(); showNextQuestion(); };
    };
    answerDiv.appendChild(btn);
  });
}

function renderOpenInput(kana) {
  const container = document.getElementById("quiz-container");
  container.innerHTML = `
    <h2>Quelle est la lecture de ce kana ?</h2>
    <div id="kanji-char" style="font-size: 5rem;">${kana.kana}</div>
    <input type="text" id="kana-input" placeholder="Écris la lecture en romaji" />
    <button id="validate-btn">Valider</button>
    <div id="feedback"></div>
    <button id="next-btn" class="next-btn hidden">Suivant →</button>
  `;

  const input    = document.getElementById("kana-input");
  const validate = document.getElementById("validate-btn");
  const feedback = document.getElementById("feedback");
  const nextBtn  = document.getElementById("next-btn");

  let answered = false;

  validate.addEventListener("click", (e) => {
    e.preventDefault();
    if (answered) return;
    answered = true;

    const val = (input.value || "").trim().toLowerCase();
    const ok = val === (kana.romaji || "").toLowerCase();

    if (ok) {
      feedback.textContent = "✅ Bonne réponse !";
      feedback.className = "good";
      gainXP(kana, 10);
    } 
    else {
      feedback.textContent = `❌ Mauvaise réponse. Solution attendue : ${kana.romaji}`;
      feedback.className = "bad";
      loseXP(kana, 5);
    }

    // lock input
    input.disabled = true;
    validate.disabled = true;

    nextBtn.classList.remove("hidden");
    nextBtn.onclick = (e2) => { e2.preventDefault(); showNextQuestion(); };
  });
}

async function showNextQuestion() {
  const kana = await pickKanaForUser();
  if (!kana) return;

  const level = kana.level ?? 0;

  if (level === 0) {
    renderLevel0(kana);
  } else if (level <= 2) {
    renderQCMKanaToRomaji(kana);
  } else if (level <= 4) {
    renderQCMRomajiToKana(kana);
  } else {
    renderOpenInput(kana);
  }
}

async function rewardCoins(amount = 1) {
  const user = await getCurrentUser();
  if (!user) return;
  user.coins = (user.coins || 0) + amount;
  await saveUser({ coins: user.coins });
}

window.addEventListener("DOMContentLoaded", async () => {
  await loadKanaProgress();
  await showNextQuestion();
});
