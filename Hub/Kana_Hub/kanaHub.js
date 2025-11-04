async function loadKanaProgress() {
  const user = await getCurrentUser();
  if (!user || !user.kanaProgress) return;

  kanaData.forEach((k, i) => {
    const saved = user.kanaProgress[k.kana]; // clé = caractère
    if (saved) {
      k.level = saved.level ?? 0;
      k.xp = saved.xp ?? 0;
      k.lastReviewed = saved.lastReviewed ? new Date(saved.lastReviewed) : null;
      k.cooldown = saved.cooldown ?? 0;
    }
  });
}

async function saveKanaProgress() {
  const progress = {};
  kanaData.forEach(k => {
    progress[k.kana] = {
      level: k.level ?? 0,
      xp: k.xp ?? 0,
      lastReviewed: k.lastReviewed ?? null,
      cooldown: k.cooldown ?? 0
    };
  });

  await saveUser({ kanaProgress: progress });
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

function getKanaPerLevel(totalKana, niveauUtilisateur) {
  const percent = Math.min(niveauUtilisateur, 10) * 10;
  return Math.floor((percent / 100) * totalKana);
}

function createKanaCard(kana, accessible) {
  const div = document.createElement("div");
  div.classList.add("kana-card");

  if (!accessible) {
    div.classList.add("card-locked");
    div.textContent = kana.kana;
    div.setAttribute("data-level", "Verrouillé");
    return div;
  }

  const level = Math.min(kana.level || 0, 10);
  div.classList.add(`kana-level-${level}`);
  div.textContent = kana.kana;
  div.setAttribute("data-level", `Niveau ${level}`);
  div.addEventListener("click", () => {
    window.location.href = `kanaDetail.html?kana=${kana.kana}`;
  });
  return div;
}



function groupByAccessLevel(kanaData) {
  const groupes = {};
  const total = kanaData.length;
  const groupSize = Math.floor(total / 10);
  const surplusStart = groupSize * 9;

  for (let i = 0; i < total; i++) {
    const groupe = i < surplusStart
      ? Math.floor(i / groupSize) + 1
      : 10;

    if (!groupes[groupe]) groupes[groupe] = [];
    groupes[groupe].push(kanaData[i]);
  }

  return groupes;
}

const groupes = groupByAccessLevel(kanaData);


async function renderKanaList() {
  const user = await getCurrentUser();
  const niveauUtilisateur = user.level || 1;
  const container = document.getElementById("kana-list");
  container.innerHTML = "";

  const totalKana = kanaData.length;
  const maxVisible = getKanaPerLevel(totalKana, niveauUtilisateur);
  const kanaVisibles = kanaData.slice(0, maxVisible);

  const groupes = groupByAccessLevel(kanaData, Math.ceil(totalKana / 10));

  for (let niveau = 1; niveau <= 10; niveau++) {
    const section = document.createElement("section");
    const titre = document.createElement("h3");
    titre.textContent = `Cartes débloquées au niveau ${niveau} :`;
    section.appendChild(titre);

    const cards = document.createElement("div");
    cards.className = "kana-card-row";

    const cartes = groupes[niveau] || [];
    cartes.forEach(kana => {
      const accessible = kanaVisibles.includes(kana);
      cards.appendChild(createKanaCard(kana, accessible));
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

function isAvailable(kana) {
  if (!kana.lastReviewed || !kana.cooldown) return true;
  return (Date.now() - kana.lastReviewed) >= kana.cooldown;
}

async function updateExerciseButtons() {
  const user = await getCurrentUser();
  const niveauUtilisateur = user.level || 1;
  const totalKana = kanaData.length;
  const maxVisible = Math.floor((Math.min(niveauUtilisateur, 10) * totalKana) / 10);
  const accessibles = kanaData.slice(0, maxVisible);
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
  loadKanaProgress();
  renderKanaList();
  updateExerciseButtons();
});

document.getElementById("logout").addEventListener("click", () => {
  localStorage.removeItem("currentUser"); api && api.logout && api.logout();
  window.location.href = "../../index.html";
});
