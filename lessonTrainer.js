function getLessonType() {
  const params = new URLSearchParams(window.location.search);
  return params.get("lesson")
}

function getLessonData(lessonType) {
  return lessonData.find(k => k.id === lessonType);
}

function get_lesson() {
  const lessonType = getLessonType()
  return getLessonData(lessonType)
}


function getCurrentUser() {
  const email = localStorage.getItem("currentUser");
  if (!email) return null;
  const raw = localStorage.getItem(`user_${email}`);
  return raw ? JSON.parse(raw) : null;
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

function saveLessonProgress() {
  localStorage.setItem("lessonProgress", JSON.stringify(lessonData));
}

function loadLessonProgress() {
  const data = localStorage.getItem("lessonProgress");
  if (data) {
    const saved = JSON.parse(data);
    lessonData.forEach((k, i) => {
      if (saved[i]) {
        k.level = saved[i].level ?? 0;
        k.xp = saved[i].xp ?? 0;
        k.lastReviewed = saved[i].lastReviewed ?? null;
        k.cooldown = saved[i].cooldown ?? 0;
      }
    });
  }
}

function renderLevel0(lesson, k) {
  if (k >= lesson.lesson.length) {
    if (lesson.level === 0) {
      console.log(lesson.level)
      lesson.level = 1;
      alert(`🎉 Vous avez maîtrisé ${lesson.nom} !`);
      rewardCoins(10);
      saveLessonProgress();
    }
    window.location.href = "Hub/Kana_Hub/kanaHub.html";
    return;
  }
  console.log(lesson.level)
  const container = document.getElementById("quiz-container");
  container.innerHTML = `
  <h2 class="lesson-title">${lesson.nom}</h2>

  <div class="dialogue-stage">
    <div class="dialogue-wrapper">
      <img src="companions/tanuki_basic.png" alt="Tanuki" class="dialogue-character" />
      <div class="dialogue-bubble">
        <p>${lesson.lesson[k]}</p>
      </div>
    </div>

    <div class="button-container">
      <button id="next-btn" type="button">Suivant</button>
    </div>
  </div>
`;



  document.getElementById("next-btn").addEventListener("click", () => {
    k += 1;
    renderLevel0(lesson, k);
  });
}

function rewardCoins(amount = 1) {
  const email = localStorage.getItem("currentUser");
  const user = JSON.parse(localStorage.getItem(`user_${email}`));

  user.coins = (user.coins || 0) + amount;

  localStorage.setItem(`user_${email}`, JSON.stringify(user));
}


window.addEventListener("DOMContentLoaded", () => {
  loadLessonProgress();
  renderLevel0(get_lesson(), 0)
});