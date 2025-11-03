
function loadEcouteProgress() {
  const data = localStorage.getItem("ecouteProgress");
  if (data) {
    const saved = JSON.parse(data);
    ecouteData.forEach((k, i) => {
      if (saved[i]) {
        k.level = saved[i].level ?? 0;
        k.xp = saved[i].xp ?? 0;
        k.lastReviewed = saved[i].lastReviewed ?? null;
        k.cooldown = saved[i].cooldown ?? 0;
      }
    });
  }
}

function getCurrentUser() {
  const email = localStorage.getItem("currentUser");
  return JSON.parse(localStorage.getItem(`user_${email}`));
}

function saveUser(u) {
  if (u?.email) localStorage.setItem(`user_${u.email}`, JSON.stringify(u));
}

function resolveCompanionImage(user) {
  return `../../companions/${user.mainCompanion}.png`;
}

function mountHeaderUserInfo() {
  const elName   = document.getElementById("user-name");
  const elLevel  = document.getElementById("user-level");
  const elCoins  = document.getElementById("user-coins");
  const elImg    = document.getElementById("user-companion");

  if (!elName || !elLevel || !elCoins || !elImg) return;

  const user = getCurrentUser();
  if (!user) {
    document.getElementById("user-info")?.classList.add("hidden");
    return;
  }

  const pseudo = user.username
  const level  = Number(user.level);
  const coins  = Number(user.coins);
  elName.textContent  = pseudo;
  elLevel.textContent = `Niveau ${level}`;
  elCoins.textContent = coins.toLocaleString("fr-FR");

  const imgSrc = resolveCompanionImage(user);
  elImg.src = imgSrc;
}

document.addEventListener("DOMContentLoaded", mountHeaderUserInfo);

function getEcoutePerLevel(totalEcoute, niveauUtilisateur) {
  const percent = Math.min(niveauUtilisateur, 10) * 10;
  return Math.floor((percent / 100) * totalEcoute);
}

function createEcouteCard(ecoute, accessible) {
  const div = document.createElement("div");
  div.classList.add("ecoute-card");

  if (!accessible) {
    div.classList.add("card-locked");
    div.textContent = ecoute.ecoute;
    div.setAttribute("data-level", "Verrouillé");
    return div;
  }

  const level = Math.min(ecoute.level || 0, 10);
  div.classList.add(`ecoute-level-${level}`);
  div.textContent = ecoute.ecoute;
  div.setAttribute("data-level", `Niveau ${level}`);
  div.addEventListener("click", () => {
    window.location.href = `ecouteDetail.html?ecoute=${ecoute.ecoute}`;
  });
  return div;
}



function groupByAccessLevel(ecouteData) {
  const groupes = {};
  const total = ecouteData.length;
  const groupSize = Math.floor(total / 10);
  const surplusStart = groupSize * 9;

  for (let i = 0; i < total; i++) {
    const groupe = i < surplusStart
      ? Math.floor(i / groupSize) + 1
      : 10;

    if (!groupes[groupe]) groupes[groupe] = [];
    groupes[groupe].push(ecouteData[i]);
  }

  return groupes;
}

const groupes = groupByAccessLevel(ecouteData);


function renderEcouteList() {
  const user = getCurrentUser();
  const niveauUtilisateur = user.level || 1;
  const container = document.getElementById("ecoute-list");
  container.innerHTML = "";

  const totalEcoute = ecouteData.length;
  const maxVisible = getEcoutePerLevel(totalEcoute, niveauUtilisateur);
  const ecouteVisibles = ecouteData.slice(0, maxVisible);

  const groupes = groupByAccessLevel(ecouteData, Math.ceil(totalEcoute / 10));

  for (let niveau = 1; niveau <= 10; niveau++) {
    const section = document.createElement("section");
    const titre = document.createElement("h3");
    titre.textContent = `Cartes débloquées au niveau ${niveau} :`;
    section.appendChild(titre);

    const cards = document.createElement("div");
    cards.className = "ecoute-card-row";

    const cartes = groupes[niveau] || [];
    cartes.forEach(ecoute => {
      const accessible = ecouteVisibles.includes(ecoute);
      cards.appendChild(createEcouteCard(ecoute, accessible));
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

function isAvailable(ecoute) {
  if (!ecoute.lastReviewed || !ecoute.cooldown) return true;
  return (Date.now() - ecoute.lastReviewed) >= ecoute.cooldown;
}

function isAvailable(ecoute) {
  if (!ecoute.lastReviewed || !ecoute.cooldown) return true;
  return (Date.now() - ecoute.lastReviewed) >= ecoute.cooldown;
}

function updateExerciseButtons() {
  const user = getCurrentUser();
  const niveauUtilisateur = user.level || 1;
  const totalEcoute = ecouteData.length;
  const maxVisible = Math.floor((Math.min(niveauUtilisateur, 10) * totalEcoute) / 10);
  const accessibles = ecouteData.slice(0, maxVisible);

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
  loadEcouteProgress();
  renderEcouteList();
  updateExerciseButtons();
});

document.getElementById("logout").addEventListener("click", () => {
  localStorage.removeItem("currentUser"); api && api.logout && api.logout();
  window.location.href = "../../index.html";
});
