document.getElementById("signup-form").addEventListener("submit", async function(e) {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const message = document.getElementById("signup-message");

  if (username === "" || email === "" || password === "") {
    message.textContent = "Veuillez remplir tous les champs.";
    message.style.color = "#c0392b";
    return;
  }

  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        email,
        password
      })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.userId);
      message.textContent = "Inscription réussie ! 🎉";
      message.style.color = "#2ecc71";

      // Redirection vers le hub (ou login si tu préfères)
      setTimeout(() => {
        window.location.href = "../../Hub/Main_Hub/hub.html";
      }, 2000);

    } else {
      message.textContent = "❌ Erreur : " + data.error;
      message.style.color = "#c0392b";
    }

  } catch (error) {
    console.error("Erreur lors de l'inscription :", error);
    message.textContent = "⚠️ Impossible de se connecter au serveur.";
    message.style.color = "#e67e22";
  }
});
