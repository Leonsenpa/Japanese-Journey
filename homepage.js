function updateNav(isLoggedIn) {
  const nav = document.getElementById("nav-links");
  nav.innerHTML = "";

  if (isLoggedIn) {
    nav.innerHTML = `
      <li><a href="dashboard.html">Mon compte</a></li>
      <li><a href="#" id="logout">Déconnexion</a></li>
    `;
    document.getElementById("logout").addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      window.location.reload();
    });
  } else {
    nav.innerHTML = `
      <li><a href="#">Connexion</a></li>
      <li><a href="inscription.html">S'inscrire</a></li>
    `;
  }
}

function showLoginForm() {
  const main = document.getElementById("main-content");
  main.innerHTML = `
    <h2>Connexion</h2>
    <form id="login-form">
      <label for="email">Email</label>
      <input type="email" id="email" required />

      <label for="password">Mot de passe</label>
      <input type="password" id="password" required />

      <button type="submit">Se connecter</button>
    </form>
    <p id="login-message"></p>
    <p style="text-align:center; margin-top: 1rem;">Pas encore de compte ? <a href="inscription.html">S'inscrire</a></p>
  `;

  document.getElementById("login-form").addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const message = document.getElementById("login-message");

    try {
      const response = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // 🔥 On stocke token + id utilisateur
        localStorage.setItem("token", data.token);
        localStorage.setItem("userId", data.id);

        message.style.color = "#2ecc71";
        message.textContent = "✅ Connexion réussie !";

        setTimeout(() => window.location.href = "../../Hub/Main_Hub/hub.html", 1000);
      } else {
        message.style.color = "#c0392b";
        message.textContent = "❌ " + (data.error || "Identifiants incorrects");
      }
    } catch (error) {
      console.error("Erreur login:", error);
      message.style.color = "#e67e22";
      message.textContent = "⚠️ Erreur de connexion au serveur.";
    }
  });
}

async function showHomePage() {
  const main = document.getElementById("main-content");
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  if (!token || !userId) {
    showLoginForm();
    return;
  }

  try {
    const response = await fetch(`http://localhost:3000/api/user/${userId}`, {
      headers: { Authorization: "Bearer " + token }
    });

    const user = await response.json();

    if (response.ok) {
      main.innerHTML = `
        <h2>Bienvenue ${user.username} !</h2>
        <p>Redirection vers ta page d'accueil...</p>
      `;
      setTimeout(() => window.location.href = "../../Hub/Main_Hub/hub.html", 1000);
    } else {
      showLoginForm();
    }
  } catch (error) {
    console.error("Erreur:", error);
    showLoginForm();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  updateNav(!!token && !!userId);

  if (token && userId) {
    showHomePage();
  } else {
    showLoginForm();
  }
});
