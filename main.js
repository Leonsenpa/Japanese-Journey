// Animation sur le bouton "Commencer"
const startBtn = document.getElementById('start-btn');

startBtn.addEventListener('mouseover', () => {
  startBtn.style.transform = 'scale(1.08)';
  startBtn.style.transition = 'transform 0.2s ease';
});

startBtn.addEventListener('mouseout', () => {
  startBtn.style.transform = 'scale(1)';
});

// Clique sur le bouton → affiche un message (ou redirige)
startBtn.addEventListener('click', () => {
  alert("Prochaine étape : créer un compte pour commencer ton aventure !");
  // Plus tard tu pourras faire : window.location.href = "inscription.html";
});

// Animation à l’apparition de la mascotte
window.addEventListener('DOMContentLoaded', () => {
  const mascot = document.querySelector('.hero-image img');
  mascot.style.opacity = 0;
  mascot.style.transform = 'translateY(30px)';
  
  setTimeout(() => {
    mascot.style.transition = 'all 0.8s ease';
    mascot.style.opacity = 1;
    mascot.style.transform = 'translateY(0)';
  }, 200);
});
document.getElementById("start-btn").addEventListener("click", () => {
  const currentUser = localStorage.getItem("currentUser");

  if (!currentUser) {
    alert("Tu dois te connecter ou t'inscrire pour commencer !");
    return;
  }

  // Sinon, on continue vers la page d’exercices (à créer)
  window.location.href = "exercice.html";
});
