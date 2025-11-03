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

  renderCollection(user);
}

function renderCollection(user) {
  const unlocked = user.unlockedCompanions;
  const container = document.getElementById("companions-grid");
  container.innerHTML = "";

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

    if (isUnlocked) name.classList.add(companion.rarity);

    div.appendChild(img);
    div.appendChild(name);
    div.addEventListener("click", () => {
      if (!isUnlocked) return;
      openMascotModal(companion);
    });

    container.appendChild(div);
  });
}

let pendingMascotId = null;
function openMascotModal(companion) {
  pendingMascotId = companion.id;
  document.getElementById("mascot-question").textContent = `Définir "${companion.name}" comme nouvelle mascotte ?`;
  document.getElementById("mascot-modal").classList.remove("hidden");
}
function closeMascotModal() {
  pendingMascotId = null;
  document.getElementById("mascot-modal").classList.add("hidden");
}
async function confirmMascotSelection() {
  if (!pendingMascotId) return;
  await saveUser({ mainCompanion: pendingMascotId });
  closeMascotModal();
  mountHeaderUserInfo();
}

document.addEventListener("DOMContentLoaded", () => {
  mountHeaderUserInfo();
  document.getElementById("confirm-mascot").addEventListener("click", confirmMascotSelection);
  document.getElementById("cancel-mascot").addEventListener("click", closeMascotModal);
  document.getElementById("mascot-modal").addEventListener("click", (e) => {
    if (e.target.id === "mascot-modal") closeMascotModal();
  });
});
