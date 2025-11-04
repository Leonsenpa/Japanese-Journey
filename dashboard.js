window.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");
  const logoutBtn = document.getElementById("logout-btn");

  if (!token || !userId) {
    alert("Tu dois être connecté pour accéder à ton tableau de bord.");
    window.location.href = "connexion.html";
    return;
  }

  try {
    const response = await fetch(`/api/user/${userId}`, {
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    const user = await response.json();

    if (response.ok) {
      document.getElementById("username").textContent = user.username;
      document.getElementById("email").textContent = user.email;
      document.getElementById("level").textContent = user.level || 0;
      document.getElementById("coins").textContent = user.coins ?? 0;

      // 👉 Si tu veux aussi afficher le compagnon principal
      if (user.mainCompanion) {
        const companionImg = document.getElementById("main-companion");
        if (companionImg) {
          companionImg.src = `../../companions/${user.mainCompanion}.png`;
        }
      }

    } else {
      alert("❌ Erreur : " + (user.error || "Impossible de charger le profil"));
      window.location.href = "connexion.html";
    }
  } catch (err) {
    console.error("Erreur dashboard:", err);
    alert("⚠️ Erreur de connexion au serveur.");
    window.location.href = "connexion.html";
  }

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    window.location.href = "index.html";
  });
});
