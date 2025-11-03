
function loadGrammarProgress() {
  const data = localStorage.getItem("grammarProgress");
  if (data) {
    const saved = JSON.parse(data);
    grammarData.forEach((k, i) => {
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

function getGrammarPerLevel(totalGrammar, niveauUtilisateur) {
  const percent = Math.min(niveauUtilisateur, 10) * 10;
  return Math.floor((percent / 100) * totalGrammar);
}

function createGrammarCard(grammar, accessible) {
  const div = document.createElement("div");
  div.classList.add("grammar-card");

  if (!accessible) {
    div.classList.add("card-locked");
    div.textContent = grammar.grammar;
    div.setAttribute("data-level", "Verrouillé");
    return div;
  }

  const level = Math.min(grammar.level || 0, 10);
  div.classList.add(`grammar-level-${level}`);
  div.textContent = grammar.grammar;
  div.setAttribute("data-level", `Niveau ${level}`);
  div.addEventListener("click", () => {
    window.location.href = `grammarDetail.html?grammar=${grammar.grammar}`;
  });
  return div;
}



function groupByAccessLevel(grammarData) {
  const groupes = {};
  const total = grammarData.length;
  const groupSize = Math.floor(total / 10);
  const surplusStart = groupSize * 9;

  for (let i = 0; i < total; i++) {
    const groupe = i < surplusStart
      ? Math.floor(i / groupSize) + 1
      : 10;

    if (!groupes[groupe]) groupes[groupe] = [];
    groupes[groupe].push(grammarData[i]);
  }

  return groupes;
}

const groupes = groupByAccessLevel(grammarData);


function renderGrammarList() {
  const user = getCurrentUser();
  const niveauUtilisateur = user.level || 1;
  const container = document.getElementById("grammar-list");
  container.innerHTML = "";

  const totalGrammar = grammarData.length;
  const maxVisible = getGrammarPerLevel(totalGrammar, niveauUtilisateur);
  const grammarVisibles = grammarData.slice(0, maxVisible);

  const groupes = groupByAccessLevel(grammarData, Math.ceil(totalGrammar / 10));

  for (let niveau = 1; niveau <= 10; niveau++) {
    const section = document.createElement("section");
    const titre = document.createElement("h3");
    titre.textContent = `Cartes débloquées au niveau ${niveau} :`;
    section.appendChild(titre);

    const cards = document.createElement("div");
    cards.className = "grammar-card-row";

    const cartes = groupes[niveau] || [];
    cartes.forEach(grammar => {
      const accessible = grammarVisibles.includes(grammar);
      cards.appendChild(createGrammarCard(grammar, accessible));
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

function isAvailable(grammar) {
  if (!grammar.lastReviewed || !grammar.cooldown) return true;
  return (Date.now() - grammar.lastReviewed) >= grammar.cooldown;
}

function isAvailable(grammar) {
  if (!grammar.lastReviewed || !grammar.cooldown) return true;
  return (Date.now() - grammar.lastReviewed) >= grammar.cooldown;
}

function updateExerciseButtons() {
  const user = getCurrentUser();
  const niveauUtilisateur = user.level || 1;
  const totalGrammar = grammarData.length;
  const maxVisible = Math.floor((Math.min(niveauUtilisateur, 10) * totalGrammar) / 10);
  const accessibles = grammarData.slice(0, maxVisible);

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
  loadGrammarProgress();
  renderGrammarList();
  updateExerciseButtons();
});

document.getElementById("logout").addEventListener("click", () => {
  localStorage.removeItem("currentUser"); api && api.logout && api.logout();
  window.location.href = "../../index.html";
});
