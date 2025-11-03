async function loadVocabularyProgress() {
  const user = await getCurrentUser();
  if (!user || !user.vocabularyProgress) return;

  vocabularyData.forEach((k, i) => {
    const saved = user.vocabularyProgress[k.kanji]; // clé = caractère
    if (saved) {
      k.level = saved.level ?? 0;
      k.xp = saved.xp ?? 0;
      k.lastReviewed = saved.lastReviewed ? new Date(saved.lastReviewed) : null;
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

function getVocabularyPerLevel(totalVocabulary, niveauUtilisateur) {
  const percent = Math.max(Math.min(niveauUtilisateur, 20)-10, 0) * 10;
  return Math.floor((percent / 100) * totalVocabulary);
}

function createVocabularyCard(vocabulary, accessible) {
  const div = document.createElement("div");
  div.classList.add("vocabulary-card");

  if (!accessible) {
    div.classList.add("card-locked");
    div.textContent = vocabulary.kanji;
    div.setAttribute("data-level", "Verrouillé");
    return div;
  }

  const level = Math.min(vocabulary.level || 0, 10);
  div.classList.add(`vocabulary-level-${level}`);
  div.textContent = vocabulary.kanji;
  div.setAttribute("data-level", `Niveau ${level}`);
  div.addEventListener("click", () => {
    window.location.href = `vocabularyDetail.html?vocabulary=${vocabulary.kanji}`;
  });
  return div;
}



function groupByAccessLevel(vocabularyData) {
  const groupes = {};
  const total = vocabularyData.length;
  const groupSize = Math.floor(total / 10);
  const surplusStart = groupSize * 9;

  for (let i = 0; i < total; i++) {
    const groupe = i < surplusStart
      ? Math.floor(i / groupSize) + 11
      : 20;

    if (!groupes[groupe]) groupes[groupe] = [];
    groupes[groupe].push(vocabularyData[i]);
  }

  return groupes;
}

const groupes = groupByAccessLevel(vocabularyData);


async function renderVocabularyList() {
  const user = await getCurrentUser();
  const niveauUtilisateur = user.level || 1;
  const container = document.getElementById("vocabulary-list");
  container.innerHTML = "";

  const totalVocabulary = vocabularyData.length;
  const maxVisible = getVocabularyPerLevel(totalVocabulary, niveauUtilisateur);
  const vocabularyVisibles = vocabularyData.slice(0, maxVisible);

  const groupes = groupByAccessLevel(vocabularyData, Math.ceil(totalVocabulary / 10));

  for (let niveau = 11; niveau <= 20; niveau++) {
    const section = document.createElement("section");
    const titre = document.createElement("h3");
    titre.textContent = `Cartes débloquées au niveau ${niveau} :`;
    section.appendChild(titre);

    const cards = document.createElement("div");
    cards.className = "vocabulary-card-row";

    const cartes = groupes[niveau] || [];
    cartes.forEach(vocabulary => {
      const accessible = vocabularyVisibles.includes(vocabulary);
      cards.appendChild(createVocabularyCard(vocabulary, accessible));
    });

    section.appendChild(cards);
    container.appendChild(section);
  }
}

function getCooldownForLevel(level) {
  const minutes = [
    0, 5, 30, 2 * 60, 8 * 60, 12 * 60,
    20 * 60, 30 * 60, 38 * 60, 48 * 60
  ];
  const min = minutes[Math.min(level, 9)] || 0;
  return min * 60 * 1000;
}

function isAvailable(vocabulary) {
  if (!vocabulary.lastReviewed || !vocabulary.cooldown) return true;
  return (Date.now() - vocabulary.lastReviewed) >= vocabulary.cooldown;
}

async function updateExerciseButtons() {
  const user = await getCurrentUser();
  const niveauUtilisateur = user.level || 1;
  const totalVocabulary = vocabularyData.length;
  const maxVisible = Math.floor((Math.min(niveauUtilisateur-10, 10) * totalVocabulary) / 10);
  const accessibles = vocabularyData.slice(0, maxVisible);

  const disponibles = accessibles.filter(k => isAvailable(k));
  const nbDecouverte = disponibles.filter(k => k.level === 0).length;
  const nbEvolution = disponibles.filter(k => k.level > 0).length;

  const btnDecouverte = document.getElementById("btn-decouverte");
  const btnEvolution = document.getElementById("btn-evolution");

  btnDecouverte.textContent = `🔍 Découverte (${nbDecouverte})`;
  btnEvolution.textContent = `📈 Progression (${nbEvolution})`;

  if (nbDecouverte === 0) {
    btnDecouverte.classList.add("disabled");
    btnDecouverte.onclick = (e) => e.preventDefault();
  }

  if (nbEvolution === 0) {
    btnEvolution.classList.add("disabled");
    btnEvolution.onclick = (e) => e.preventDefault();
  }
}

// Initialisation
document.addEventListener("DOMContentLoaded", () => {
  loadVocabularyProgress();
  renderVocabularyList();
  updateExerciseButtons();
});

document.getElementById("logout").addEventListener("click", () => {
  localStorage.removeItem("currentUser"); api && api.logout && api.logout();
  window.location.href = "index.html";
});
