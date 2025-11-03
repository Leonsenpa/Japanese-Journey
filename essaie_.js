function getCurrentUser() {
  const email = localStorage.getItem("currentUser");
  return JSON.parse(localStorage.getItem(`user_${email}`));
}

function saveUser(user) {
  localStorage.setItem(`user_${user.email}`, JSON.stringify(user));
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

function renderCollection() {
  const user = getCurrentUser();
  const unlocked = user.unlockedCompanions;
  const current_mascotte = user.mainCompanion
  const container = document.getElementById("companions-grid");
  container.innerHTML="";

  companionsData.forEach(companion => {
    const div = document.createElement("div");
    div.classList.add("companion-card");

    const isUnlocked = unlocked.includes(companion.id);
    if (!isUnlocked) div.classList.add("locked");
    if (user.mainCompanion === companion.id && isUnlocked) {
      div.classList.add("selected");
    }

    const img = document.createElement("img");
    img.src = companion.image;
    img.alt = companion.name;

    const name = document.createElement("span");
    name.textContent = isUnlocked ? companion.name : "???";

    if (isUnlocked) {
        name.classList.add(companion.rarity);
    }


    div.appendChild(img);
    div.appendChild(name);
    div.addEventListener("click", () => {
      if (!isUnlocked) return;
      openMascotModal(companion);
    });
    container.appendChild(div);
  });
}


function openMascotModal(companion) {
  pendingMascotId = companion.id;
  const modal = document.getElementById("mascot-modal");
  const question = document.getElementById("mascot-question");
  question.textContent = `Définir "${companion.name}" comme nouvelle mascotte ?`;
  modal.classList.remove("hidden");
}

function closeMascotModal() {
  pendingMascotId = null;
  document.getElementById("mascot-modal").classList.add("hidden");
}

function confirmMascotSelection() {
  if (!pendingMascotId) return;
  const user = getCurrentUser();
  user.mainCompanion = pendingMascotId;
  saveUser(user);
  closeMascotModal();
  renderCollection();
  mountHeaderUserInfo();
}

// Wiring modal boutons
document.addEventListener("DOMContentLoaded", () => {
  renderCollection();

  // boutons du modal
  document.getElementById("confirm-mascot").addEventListener("click", confirmMascotSelection);
  document.getElementById("cancel-mascot").addEventListener("click", closeMascotModal);

  // fermer modal si on clique en dehors de la boîte
  document.getElementById("mascot-modal").addEventListener("click", (e) => {
    if (e.target.id === "mascot-modal") closeMascotModal();
  });
});