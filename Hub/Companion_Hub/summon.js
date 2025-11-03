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

function resolveCompanionImage(user) {
    return `../../companions/${user.mainCompanion}.png`;

}

async function mountHeaderUserInfo() {
  const user = await getCurrentUser();
  if (!user) return;

  document.getElementById("user-name").textContent = user.username;
  document.getElementById("user-level").textContent = `Niveau ${user.level}`;
  document.getElementById("user-coins").textContent = user.coins;
  document.getElementById("user-companion").src = `../../companions/${user.mainCompanion}.png`;
}

async function looseCoins(amount = 10){
  const user = await getCurrentUser();
  if (!user) return;
  user.coins = (user.coins || 0) - amount;
  await saveUser({ coins: user.coins})
}

function getRandomCompanion() {
  const rates = {
    commun: 60,
    rare: 25,
    epique: 10,
    legendaire: 5
  };

  const rand = Math.random() * 100;
  let sum = 0;
  let rarity = "common";

  for (const [key, value] of Object.entries(rates)) {
    sum += value;
    if (rand <= sum) {
      rarity = key;
      break;
    }
  }

  const pool = companionsData.filter(c => c.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

function displayResult(companion, alreadyOwned) {
  const resultDiv = document.getElementById("summon-result");
  const resultImg = document.getElementById("result-image");
  const resultName = document.getElementById("result-name");

  resultImg.src = companion.image;
  resultName.textContent = alreadyOwned
    ? `${companion.name} (déjà possédé)`
    : `Nouveau ! ${companion.name}`;
  resultName.className = companion.rarity;

  resultDiv.style.display = "block";
}

function playSummonAnimation(companion) {
  document.getElementById("summon-sound").play();

  const overlay = document.getElementById("summon-animation");
  const resultDiv = document.getElementById("summon-animation-box");
  const spark = document.getElementById("spark");

  resultDiv.innerHTML = "";
  resultDiv.style.visibility = "hidden";
  overlay.classList.remove("hidden");

  const rarityColors = {
    "commun": "#aaa",
    "rare": "#4f46e5",
    "epique": "#a21caf",
    "legendaire": "#d97706"
  };

  const color = rarityColors[companion.rarity] || "#fff";
  spark.style.backgroundColor = color;

  spark.classList.remove("spark");
  void spark.offsetWidth;
  spark.classList.add("spark");

  setTimeout(() => {
    resultDiv.style.visibility = "visible";

    const img = document.createElement("img");
    img.src = companion.image;
    img.alt = companion.name;

    const name = document.createElement("span");
    name.textContent = companion.name;
    name.classList.add(companion.rarity);

    resultDiv.appendChild(img);
    resultDiv.appendChild(name);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Fermer";
    closeBtn.style.marginTop = "1rem";
    closeBtn.onclick = () => overlay.classList.add("hidden");

    resultDiv.appendChild(closeBtn);
  }, 1500);
}

document.getElementById("summon-btn").addEventListener("click", async() => {
  const user = await getCurrentUser();
  const companion = getRandomCompanion();
  const alreadyOwned = user.unlockedCompanions.includes(companion.id);
  looseCoins(10)
  if (!alreadyOwned) {
    user.unlockedCompanions.push(companion.id);
    saveUser(user);
  }

  playSummonAnimation(companion);
});
document.addEventListener("DOMContentLoaded", mountHeaderUserInfo);