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

function getKanjiFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("kanji");
}

function getKanjiData(kanjiChar) {
  return kanjiData.find(k => k.kanji === kanjiChar);
}

async function loadKanjiDetail() {
  const user = await getCurrentUser();
  const kanjiChar = getKanjiFromURL();
  const kanji = getKanjiData(kanjiChar);

  if (!kanji || !user.kanjiProgress[kanji.kanji]) {
    document.getElementById("kanji-detail").innerHTML = "<p>Kanji introuvable.</p>";
    return;
  }

  const savedKanji = user.kanjiProgress[kanji.kanji]
  if (savedKanji) {
  kanji.level = savedKanji.level ?? 0;
  kanji.xp = savedKanji.xp ?? 0;
  kanji.lastReviewed = savedKanji.lastReviewed ?? null;
  kanji.cooldown = savedKanji.cooldown ?? 0;
  }

  document.getElementById("kanji-char").textContent = kanji.kanji;
  document.getElementById("kanji-onReading").textContent = kanji.onReading;
  document.getElementById("kanji-kunReading").textContent = kanji.kunReading;
  document.getElementById("kanji-meaning").textContent = kanji.meaning;
  document.getElementById("kanji-mnemonic").textContent = kanji.mnemonic;
  document.getElementById("kanji-level").textContent = kanji.level ?? 0;
  document.getElementById("kanji-xp").textContent = kanji.xp ?? 0;
  document.getElementById("kanji-trace").src = `../../kanji_trace/${kanji.kanji}_stroke_order_animation.gif`;
  document.getElementById("kanji-availability").textContent = formatCooldown(kanji);

  const audio = document.getElementById("kanji-audio");
  audio.src = `audio/kanji/${kanji.kanji}.mp3`;

  document.getElementById("play-audio").addEventListener("click", () => {
    audio.play();
  });

}

function formatCooldown(kanji) {
  if (!kanji.lastReviewed || !kanji.cooldown) return "Disponible";
  const cooldown = kanji.cooldown;
  const last = new Date(kanji.lastReviewed).getTime();
  const end = Date.now() - last;

  const remaining = cooldown - end;

  if (remaining <= 0) return "Disponible";

  const minutes = Math.floor((remaining / 1000 / 60) % 60);
  const hours = Math.floor((remaining / 1000 / 60 / 60));

  return `Disponible dans ${hours}h ${minutes}min`;
}

window.addEventListener("DOMContentLoaded", loadKanjiDetail);
