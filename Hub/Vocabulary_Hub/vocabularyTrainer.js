let currentIndex = 0;

function getMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("mode") || "evolution";
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
  return min * 60 * 1000; // converti en millisecondes
}

async function pickVocabularyForUser() {
  const user = await getCurrentUser();
  const niveauUtilisateur = user?.level || 1;
  const mode = getMode();

  const totalVocabulary = vocabularyData.length;
  const maxVisible = Math.floor((Math.min(niveauUtilisateur-10, 10) * totalVocabulary) / 10);

  const accessibles = vocabularyData.slice(0, maxVisible).filter(vocabulary => {
    if (!vocabulary.lastReviewed || !vocabulary.cooldown) return true;
    return (Date.now() - vocabulary.lastReviewed) >= vocabulary.cooldown;
  });

  let filteredVocabulary;
  if (mode === "decouverte") {
    filteredVocabulary = accessibles.filter(k => (k.level ?? 0) === 0);
  } else {
    filteredVocabulary = accessibles.filter(k => (k.level ?? 0) > 0);
  }

  if (filteredVocabulary.length === 0) {
    alert("Aucun vocabulary disponible pour ce mode !");
    return null;
  }

  return filteredVocabulary[Math.floor(Math.random() * filteredVocabulary.length)];
}

function checkLevelUpUtilisateur() {
  const email = localStorage.getItem("currentUser");
  const user = JSON.parse(localStorage.getItem(`user_${email}`));

  if (!user) return;
  if (!user.level) user.level = 1;

  const totalVocabulary = vocabularyData.length;
  const maxVisible = Math.floor((Math.min(user.level, 10) * totalVocabulary) / 10);
  const vocabularyVisibles = vocabularyData.slice(0, maxVisible);

  const tousAuMoins5 = vocabularyVisibles.every(vocabulary => (vocabulary.level || 0) >= 5);
  if (tousAuMoins5 && user.level < 11) {
    user.level += 1;
    localStorage.setItem(`user_${email}`, JSON.stringify(user));
    alert(`🎉 Tu es passé au niveau ${user.level} !`);
  }
}

async function loadVocabularyProgress() {
  const user = await getCurrentUser();
  if (!user || !user.vocabularyProgress) return;

  vocabularyData.forEach((k, i) => {
    const saved = user.vocabularyProgress[k.kanji]; // clé = caractère
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

async function saveVocabularyProgress() {
  const progress = {};
  vocabularyData.forEach(k => {
    progress[k.kanji] = {
      level: k.level ?? 0,
      xp: k.xp ?? 0,
      lastReviewed: k.lastReviewed ?? null,
      cooldown: k.cooldown ?? 0
    };
  });

  await saveUser({ vocabularyProgress: progress });
}

function gainXP(vocabulary, amount) {
  const mode = getMode();
  if (mode !== "evolution") return;

  vocabulary.xp = (vocabulary.xp ?? 0) + amount;
  vocabulary.lastReviewed = Date.now();
  vocabulary.cooldown = getCooldownForLevel(vocabulary.level);

  if (vocabulary.xp >= 30 && vocabulary.level < 10) {
    vocabulary.level++;
    vocabulary.xp = 0;
    alert(`🎉 ${vocabulary.kanji} passe au niveau ${vocabulary.level} !`);
    checkLevelUpUtilisateur();
    rewardCoins(vocabulary.level-1);
  }

  rewardCoins(1);
  saveVocabularyProgress();
}

function loseXP(vocabulary, amount) {
  const mode = getMode();
  if (mode !== "evolution") return;

  vocabulary.xp -= amount;
  vocabulary.lastReviewed = Date.now();
  vocabulary.cooldown = getCooldownForLevel(vocabulary.level);

  if (vocabulary.xp < 0) {
    if (vocabulary.level > 0) vocabulary.level--;
    vocabulary.xp = 0;
    alert(`❌ ${vocabulary.kanji} redescend au niveau ${vocabulary.level}...`);
  }
  saveVocabularyProgress();
}

function renderLevel0(vocabulary) {
  const container = document.getElementById("quiz-container");
  container.innerHTML = `
    <h2>Découverte du vocabulary</h2>
    <div id="kanji-card">
      <div id="kanji-char" style="font-size: 5rem;">${vocabulary.kanji}</div>
      <p><strong>Traduction :</strong> ${vocabulary.meaning}</p>
      <p id="kanji-mnemonic">${vocabulary.mnemonic}</p>
      <button id="next-btn">Suivant</button>
    </div>
  `;

  const nextBtn = document.getElementById("next-btn");
  nextBtn.addEventListener("click", () => {
    vocabulary.level = 1;
    vocabulary.xp = 0;
    vocabulary.lastReviewed = Date.now();
    vocabulary.cooldown = getCooldownForLevel(1);
    saveVocabularyProgress();
    showNextQuestion();
  });
}

function renderQCMVocabularyToTrad(vocabulary) {
  const container = document.getElementById("quiz-container");

  const answers = shuffle([
    vocabulary.meaning,
    ...shuffle(vocabularyData.filter(k => k.meaning !== vocabulary.meaning)).slice(0, 3).map(k => k.meaning)
  ]);

  container.innerHTML = `
    <h2>Quel est la lecture de ce mot ?</h2>
    <div id="kanji-card">
      <div id="kanji-char" style="font-size: 5rem;">${vocabulary.kanji}</div>
      <p><strong>Avec les kana :</strong> ${vocabulary.kana}</p>
      <div id="answers"></div>
      <div id="feedback"></div>
      <button id="next-btn" class="next-btn hidden">Suivant →</button>
    </div>
  `;

  const answerDiv = document.getElementById("answers");
  const feedback = document.getElementById("feedback");
  const nextBtn = document.getElementById("next-btn");
  
  let answered = false;

  answers.forEach(rep => {
    const btn = document.createElement("button");
    btn.textContent = rep;
    btn.type = "button"
    btn.className = "answer-btn"
    btn.onclick = () => {
      if (answered) return;
      answered = true;

      const btns = Array.from(answerDiv.querySelectorAll(".answer-btn"));
      btns.forEach(b => {
        b.classList.add("locked");
        const isCorrect = b.textContent === vocabulary.meaning;
        if (isCorrect) b.classList.add("Correct");
        if (!isCorrect && b === btn) b.classList.add("wrong");
      });

      if (rep === vocabulary.meaning) {
        feedback.textContent = "✅ Bonne réponse !";
        feedback.className = "good";
        gainXP(vocabulary, 10);
      } else {
        feedback.textContent = `❌ Mauvaise réponse. Bonne réponse : “${vocabulary.meaning}”.`;
        feedback.className = "bad";
        loseXP(vocabulary, 5);
      }

      nextBtn.classList.remove("hidden");
      nextBtn.onclick = (e) => { e.preventDefault(); showNextQuestion(); };
    };
    answerDiv.appendChild(btn);
  });
}

function renderQCMTradToVocabulary(vocabulary) {
  const container = document.getElementById("quiz-container");

  const answers = shuffle([
    vocabulary.kanji,
    ...shuffle(vocabularyData.filter(k => k.kanji !== vocabulary.kanji && k.meaning === vocabulary.meaning)).slice(0, 1).map(k => k.kanji),
    ...shuffle(vocabularyData.filter(k => k.kanji !== vocabulary.kanji)).slice(0, 2).map(k => k.kanji)
  ]);

  container.innerHTML = `
    <h2>Quel mot correspond à : ${vocabulary.meaning} ?</h2>
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
        const isCorrect = b.textContent === vocabulary.kanji;
        if (isCorrect) b.classList.add("correct");
        if (!isCorrect && b === btn) b.classList.add("wrong");
      });

      if (rep === vocabulary.kanji) {
        feedback.textContent = "✅ Bonne réponse !";
        feedback.className = "good";
        gainXP(vocabulary, 10);
      } else {
        feedback.textContent = `❌ Mauvaise réponse. Bonne réponse : “${vocabulary.kanji}”.`;
        feedback.className = "bad";
        loseXP(vocabulary, 5);
      }

      nextBtn.classList.remove("hidden");
      nextBtn.onclick = (e) => { e.preventDefault(); showNextQuestion(); };
    };
    answerDiv.appendChild(btn);
  });
}

function renderOpenInput(vocabulary) {
  const container = document.getElementById("quiz-container");
  container.innerHTML = `
    <h2>Quelle est la traduction de ce mot?</h2>
    <div id="kanji-char" style="font-size: 5rem;">${vocabulary.kanji}</div>
    <input type="text" id="vocabulary-input" placeholder="Donnes la traduction" />
    <button id="validate-btn">Valider</button>
    <div id="feedback"></div>
    <button id="next-btn" class="next-btn hidden">Suivant →</button>
  `;

  const input    = document.getElementById("vocabulary-input");
  const validate = document.getElementById("validate-btn");
  const feedback = document.getElementById("feedback");
  const nextBtn  = document.getElementById("next-btn");

  let answered = false;

  validate.addEventListener("click", (e) => {
    e.preventDefault();
    if (answered) return;
    answered = true;

    const val = (input.value || "").trim().toLowerCase();
    const ok = val === (vocabulary.kanji || "").toLowerCase();

    if (ok) {
      feedback.textContent = "✅ Bonne réponse !";
      feedback.className = "good";
      gainXP(vocabulary, 10);
    } 
    else {
      feedback.textContent = `❌ Mauvaise réponse. Solution attendue : ${vocabulary.meaning}`;
      feedback.className = "bad";
      loseXP(vocabulary, 5);
    }

    input.disabled = true;
    validate.disabled = true;

    nextBtn.classList.remove("hidden");
    nextBtn.onclick = (e2) => { e2.preventDefault(); showNextQuestion(); };
  });
}

async function showNextQuestion() {
  const vocabulary = await pickVocabularyForUser();
  if (!vocabulary) return;

  const level = vocabulary.level ?? 0;

  if (level === 0) {
    renderLevel0(vocabulary);
  } else if (level <= 2) {
    renderQCMVocabularyToTrad(vocabulary);
  } else if (level <= 4) {
    renderQCMTradToVocabulary(vocabulary);
  } else {
    renderOpenInput(vocabulary);
  }
}

async function rewardCoins(amount = 1) {
  const user = await getCurrentUser();
  if (!user) return;
  user.coins = (user.coins || 0) + amount;
  await saveUser({ coins: user.coins });
}


window.addEventListener("DOMContentLoaded", async () => {
  await loadVocabularyProgress();
  await showNextQuestion();
});