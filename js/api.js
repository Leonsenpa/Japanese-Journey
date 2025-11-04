
(() => {
  const API_BASE = window.API_BASE || "/api";

  function getAuth() {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
    return { token, userId };
  }

  function setAuth({ token, userId }) {
    if (token) localStorage.setItem("token", token);
    if (userId) localStorage.setItem("userId", userId);
  }

  async function getCurrentUser() {
    const { token, userId } = getAuth();
    if (!token || !userId) return null;

    const res = await fetch(`${API_BASE}/user/${userId}`, {
      headers: { Authorization: "Bearer " + token }
    });
    if (!res.ok) return null;
    return await res.json();
  }

  async function saveUser(updates) {
    const { token, userId } = getAuth();
    if (!token || !userId) throw new Error("Not authenticated");

    const res = await fetch(`${API_BASE}/user/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token
      },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error("Failed to save user");
    return await res.json();
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
  }

  window.api = { API_BASE, getAuth, setAuth, getCurrentUser, saveUser, logout };
})();
