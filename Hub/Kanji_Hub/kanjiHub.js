async function loadKanjiProgress() {
  const user = await getCurrentUser();
  if (!user || !user.kanjiProgress) return;

  kanjiData.forEach((k, i) => {
    const saved = user.kanjiProgress[k.kanji]; // clé = caractère
    if (saved) {
      k.level = saved.level ?? 0;
      k.xp = saved.xp ?? 0;
      k.lastReviewed = saved.lastReviewed ? new Date(saved.lastReviewed) : null;
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
      lastReviewed: k.lastReviewed ?? null,
      cooldown: k.cooldown ?? 0
    };
  });

  await saveUser({ kanjiProgress: progress });
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
  document.getElementById("user-level").textContent = `Niveau de Kanji ${user.level_kanji}`;
  document.getElementById("user-coins").textContent = user.coins;
  document.getElementById("user-companion").src = `../../companions/${user.mainCompanion}.png`;

}

document.addEventListener("DOMContentLoaded", mountHeaderUserInfo);

function createKanjiCard(kanji, accessible) {
  const div = document.createElement("div");
  div.classList.add("kanji-card");

  if (!accessible) {
    div.classList.add("card-locked");
    div.textContent = kanji.kanji;
    div.setAttribute("data-level", "Verrouillé");
    return div;
  }

  const level = Math.min(kanji.level || 0, 10);
  div.classList.add(`kanji-level-${level}`);
  div.textContent = kanji.kanji;
  div.setAttribute("data-level", `Niveau ${level}`);
  div.addEventListener("click", () => {
    window.location.href = `kanjiDetail.html?kanji=${kanji.kanji}`;
  });
  return div;
}

///
function groupByAccessLevel(kanjiData) {
  const groupes = {};
  const total = kanjiData.length;

  for (let i = 0; i < total; i++) {
    if (!groupes[kanjiData[i].unlocked_level]) groupes[groupe] = [];
    groupes[groupe].push(kanjiData[i]);
  }

  return groupes;
}
///
const groupes = groupByAccessLevel(kanjiData);


async function renderKanjiList() {
  const user = await getCurrentUser();
  const niveauUtilisateur = user.level_kanji || 1;
  const container = document.getElementById("kanji-list");
  container.innerHTML = "";

  const totalKanji = kanjiData.length;
  const maxVisible = getKanjiPerLevel(totalKanji, niveauUtilisateur);
  const kanjiVisibles = kanjiData.slice(0, maxVisible);

  const groupes = groupByAccessLevel(kanjiData, Math.ceil(totalKanji / 10));

  for (let niveau = 1; niveau <= 10; niveau++) {
    const section = document.createElement("section");
    const titre = document.createElement("h3");
    titre.textContent = `Cartes débloquées (niveau ${niveau}) :`;
    section.appendChild(titre);

    const cards = document.createElement("div");
    cards.className = "kanji-card-row";

    const cartes = groupes[niveau] || [];
    cartes.forEach(kanji => {
      const accessible = kanjiVisibles.includes(kanji);
      cards.appendChild(createKanjiCard(kanji, accessible));
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

function isAvailable(kanji) {
  if (!kanji.lastReviewed || !kanji.cooldown) return true;
  return (Date.now() - kanji.lastReviewed) >= kanji.cooldown;
}

async function updateExerciseButtons() {
  const user = await getCurrentUser();
  const niveauUtilisateur = user.level_kanji || 1;
  const totalKanji = kanjiData.length;
  const maxVisible = Math.floor((Math.min(niveauUtilisateur, 10) * totalKanji) / 10);
  const accessibles = kanjiData.slice(0, maxVisible);
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
  loadKanjiProgress();
  renderKanjiList();
  updateExerciseButtons();
});

document.getElementById("logout").addEventListener("click", () => {
  localStorage.removeItem("currentUser"); api && api.logout && api.logout();
  window.location.href = "../../index.html";
});
