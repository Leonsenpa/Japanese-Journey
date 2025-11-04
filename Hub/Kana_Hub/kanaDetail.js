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

function getKanaFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("kana");
}

function getKanaData(kanaChar) {
  return kanaData.find(k => k.kana === kanaChar);
}

async function loadKanaDetail() {
  const user = await getCurrentUser();
  const kanaChar = getKanaFromURL();
  const kana = getKanaData(kanaChar);

  if (!kana || !user.kanaProgress[kana.kana]) {
    document.getElementById("kana-detail").innerHTML = "<p>Kana introuvable.</p>";
    return;
  }

  const savedKana = user.kanaProgress[kana.kana]
  if (savedKana) {
  kana.level = savedKana.level ?? 0;
  kana.xp = savedKana.xp ?? 0;
  kana.lastReviewed = savedKana.lastReviewed ?? null;
  kana.cooldown = savedKana.cooldown ?? 0;
  }

  document.getElementById("kana-char").textContent = kana.kana;
  document.getElementById("kana-romaji").textContent = kana.romaji;
  document.getElementById("kana-mnemonic").textContent = kana.mnemonic;
  document.getElementById("kana-level").textContent = kana.level ?? 0;
  document.getElementById("kana-xp").textContent = kana.xp ?? 0;
  document.getElementById("kana-trace").src = `../../kana_trace/${kana.kana}_stroke_order_animation.gif`;
  document.getElementById("kana-availability").textContent = formatCooldown(kana);
  const audio = document.getElementById("kana-audio");
  audio.src = `audio/kana/${kana.kana}.mp3`;

  document.getElementById("play-audio").addEventListener("click", () => {
    audio.play();
  });

}

function formatCooldown(kana) {
  if (!kana.lastReviewed || !kana.cooldown) return "Disponible";
  const cooldown = kana.cooldown;
  const last = new Date(kana.lastReviewed).getTime();
  const end = Date.now() - last;

  const remaining = cooldown - end;

  if (remaining <= 0) return "Disponible";

  const minutes = Math.floor((remaining / 1000 / 60) % 60);
  const hours = Math.floor((remaining / 1000 / 60 / 60));

  return `Disponible dans ${hours}h ${minutes}min`;
}

window.addEventListener("DOMContentLoaded", loadKanaDetail);
