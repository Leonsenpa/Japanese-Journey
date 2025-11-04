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

function getVocabularyFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("vocabulary");
}

function getVocabularyData(vocabularyChar) {
  return vocabularyData.find(k => k.kanji === vocabularyChar);
}

async function loadVocabularyDetail() {
  const user = await getCurrentUser();
  const vocabularyChar = getVocabularyFromURL();
  const vocabulary = getVocabularyData(vocabularyChar);

  if (!vocabulary || !user.vocabularyProgress[vocabulary.kanji]) {
    document.getElementById("vocabulary-detail").innerHTML = "<p>Vocabulary introuvable.</p>";
    return;
  }
 
  const savedVocabulary = user.vocabularyProgress[vocabulary.kanji];
  if (savedVocabulary) {
  vocabulary.level = savedVocabulary.level ?? 0;
  vocabulary.xp = savedVocabulary.xp ?? 0;
  vocabulary.lastReviewed = savedVocabulary.lastReviewed ?? null;
  vocabulary.cooldown = savedVocabulary.cooldown ?? 0;
  }

  document.getElementById("vocabulary-char").textContent = vocabulary.kanji;
  document.getElementById("vocabulary-kana").textContent = vocabulary.kana;
  document.getElementById("vocabulary-meaning").textContent = vocabulary.meaning;
  document.getElementById("vocabulary-mnemonic").textContent = vocabulary.mnemonic;
  document.getElementById("vocabulary-level").textContent = vocabulary.level ?? 0;
  document.getElementById("vocabulary-xp").textContent = vocabulary.xp ?? 0;
  document.getElementById("vocabulary-trace").src = `../../vocabulary_trace/${vocabulary.vocabulary}_stroke_order_animation.gif`;
  document.getElementById("vocabulary-availability").textContent = formatCooldown(vocabulary);

  const audio = document.getElementById("vocabulary-audio");
  audio.src = `audio/vocabulary/${vocabulary.vocabulary}.mp3`;

  document.getElementById("play-audio").addEventListener("click", () => {
    audio.play();
  });

}

function formatCooldown(vocabulary) {
  if (!vocabulary.lastReviewed || !vocabulary.cooldown) return "Disponible";
  const cooldown = vocabulary.cooldown;
  const last = new Date(vocabulary.lastReviewed).getTime();
  const end = Date.now() - last;

const remaining = cooldown - end

  if (remaining <= 0) return "Disponible";

  const minutes = Math.floor((remaining / 1000 / 60) % 60);
  const hours = Math.floor((remaining / 1000 / 60 / 60));

  return `Disponible dans ${hours}h ${minutes}min`;
}

window.addEventListener("DOMContentLoaded", loadVocabularyDetail);
