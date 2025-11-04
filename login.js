document.getElementById("login-form").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const message = document.getElementById("login-message");

  if (email === "" || password === "") {
    message.textContent = "❌ Veuillez remplir tous les champs.";
    message.style.color = "#c0392b";
    return;
  }

  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      // On sauvegarde le token JWT pour les futures requêtes
      localStorage.setItem("token", data.token);

      message.textContent = "✅ Connexion réussie !";
      message.style.color = "#2ecc71";

      setTimeout(() => {
        window.location.href = "../../Hub/Main_Hub/hub.html";
      }, 1500);

    } else {
      message.textContent = "❌ " + (data.error || "Erreur de connexion");
      message.style.color = "#c0392b";
    }

  } catch (error) {
    console.error("Erreur login:", error);
    message.textContent = "⚠️ Impossible de se connecter au serveur.";
    message.style.color = "#e67e22";
  }
});
