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

async function maybeShowFirstLoginOnboarding() {
  const user = await getCurrentUser();
  if (!user) return;

  // Si déjà fait, on ne montre pas.
  if (user.onboarding?.firstLoginDone) return;

  // Montre uniquement si niveau 0
  if ((user.level ?? 0) !== 0) return;

  // Personnalisation du message
  const overlay = document.getElementById("onb-overlay");
  const text = document.getElementById("onb-text");
  const yesBtn = document.getElementById("onb-yes");
  const noBtn  = document.getElementById("onb-no");

  // Pseudo: adapte la propriété selon ton user (username, pseudo, name…)
  const pseudo = user.username || user.pseudo || user.name || "aventurier·ère";

  text.innerHTML = `
    Bonjour, <strong>${pseudo}</strong> 👋<br/>
    Bienvenue sur <strong>JLPT Quest</strong> ! On espère qu’avec notre site
    tu atteindras tes objectifs en japonais et bien plus encore.
  `;

  // Affiche l'overlay
  overlay.hidden = false;
  overlay.setAttribute("aria-hidden", "false");

  // Gestion boutons
  yesBtn.onclick = () => {
    user.level = 11; // commence directement sur le contenu au-delà des kana
    user.onboarding = user.onboarding || {};
    user.onboarding.firstLoginDone = true;
    user.onboarding.kanaKnown = true;
    user.onboarding.completedAt = Date.now();
    saveUser(user);
    closeOnb();
    // Option: rediriger ou rafraîchir pour recalculer les cartes visibles
    location.reload();
  };

  noBtn.onclick = () => {
    user.level = 1; // commence au niveau 1 (déblocage 10% des kana)
    user.onboarding = user.onboarding || {};
    user.onboarding.firstLoginDone = true;
    user.onboarding.kanaKnown = false;
    user.onboarding.completedAt = Date.now();
    saveUser(user);
    closeOnb();
    location.reload();
  };

  function closeOnb() {
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
  }
}

// Lance le check au chargement
document.addEventListener("DOMContentLoaded", maybeShowFirstLoginOnboarding);
