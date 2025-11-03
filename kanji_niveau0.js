let currentIndex = 0;

function displayKanji(index) {
  const k = kanjiData[index];

  document.getElementById("kanji-char").textContent = k.kanji;
  document.getElementById("kanji-meaning").textContent = k.meaning;
  document.getElementById("kanji-on").textContent = k.onReading.join(", ");
  document.getElementById("kanji-kun").textContent = k.kunReading.join(", ");
  document.getElementById("kanji-mnemonic").textContent = k.mnemonic;
}

document.getElementById("next-btn").addEventListener("click", () => {
  currentIndex++;

  if (currentIndex < kanjiData.length) {
    displayKanji(currentIndex);
  } else {
    alert("Tu as vu tous les kanji disponibles pour l’instant !");
    currentIndex = 0;
    displayKanji(currentIndex);
  }
});

window.addEventListener("DOMContentLoaded", () => {
  displayKanji(currentIndex);
});
