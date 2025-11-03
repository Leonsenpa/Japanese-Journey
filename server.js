require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const kanaData = require("./Ressources/kana.js");
const kanjiData = require("./Ressources/kanji.js");
const vocabularyData = require("./Ressources/vocabulary.js");


const app = express();
const cors = require("cors");
app.use(cors());


function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // format: "Bearer <token>"

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user; // contient { id, email }
    next();
  });
}

app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connecté'))
  .catch(err => console.error(err));

// --- Schéma utilisateur ---
const userSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  passwordHash: String,
  xp: { type: Number, default: 0 },
  coins: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  unlockedCompanions: { type: [String], default: ["tanuki_basic"] },
  mainCompanion: { type: String, default: "tanuki_basic" },
  kanaProgress: {
    type: Map,
    of: {
      level: { type: Number, default: 0 },
      xp: { type: Number, default: 0 },
      lastReviewed: { type: Date, default: null },
      cooldown: { type: Number, default: 0 }
    }
  },
  kanjiProgress: {
    type: Map,
    of: {
      level: { type: Number, default: 0 },
      xp: { type: Number, default: 0 },
      lastReviewed: { type: Date, default: null },
      cooldown: { type: Number, default: 0 }
    }
  },
  vocabularyProgress: {
    type: Map,
    of: {
      level: { type: Number, default: 0 },
      xp: { type: Number, default: 0 },
      lastReviewed: { type: Date, default: null },
      cooldown: { type: Number, default: 0 }
    }
  }
});

const User = mongoose.model("User", userSchema);

// --- Clé JWT ---
const JWT_SECRET = "super_secret_key"; // à mettre en variable d'environnement plus tard

// --- Routes ---

// Test route
app.use(express.static(__dirname));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});


// Inscription
app.post("/api/register", async (req, res) => {
  const { username, email, password, level, coins, unlockedCompanions, mainCompanion } = req.body;

  // Vérifie si l’email existe déjà
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ error: "Email déjà utilisé" });
  }

  // Hash du mot de passe
  const hashedPassword = await bcrypt.hash(password, 10);

  const initialKanaProgress = {};
  kanaData.forEach(k => {
    initialKanaProgress[k.kana] = {
      level: 0,
      xp: 0,
      lastReviewed: null,
      cooldown: 0
    };
  });

  const initialKanjiProgress = {};
  kanjiData.forEach(k => {
    initialKanjiProgress[k.kanji] = {
      level: 0,
      xp: 0,
      lastReviewed: null,
      cooldown: 0
    };
  });

  const initialVocabularyProgress = {};
  vocabularyData.forEach(k => {
    initialVocabularyProgress[k.kanji] = {
      level: 0,
      xp: 0,
      lastReviewed: null,
      cooldown: 0
    };
  });

  // Crée l’utilisateur
  const newUser = new User({
    username,
    email,
    passwordHash: hashedPassword,
    level: level ?? 0,
    coins: coins ?? 0,
    unlockedCompanions: unlockedCompanions ?? ["tanuki_basic"],
    mainCompanion: mainCompanion ?? "tanuki_basic",
    kanaProgress: initialKanaProgress,
    kanjiProgress: initialKanjiProgress,
    vocabularyProgress: initialVocabularyProgress

  });

  await newUser.save();
  res.json({ message: "Utilisateur créé avec succès" });
});

// Connexion
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ error: "Utilisateur introuvable" });
  }

  // ✅ Vérifie le mot de passe avec bcrypt
  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    return res.status(400).json({ error: "Mot de passe incorrect" });
  }

  // ✅ Génère un token JWT
  const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "1h" });

  res.json({ token, id: user._id });
});

app.listen(3000, () => {
  console.log("🚀 Serveur démarré sur http://localhost:3000");
});

// Récupérer les infos d’un utilisateur
app.get("/api/user/:id", authenticateToken, async (req, res) => {
  if (req.user.id !== req.params.id) {
    return res.status(403).json({ error: "Accès interdit" });
  }

  const user = await User.findById(req.params.id).select("-passwordHash");
  if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

  res.json(user);
});

// Mettre à jour les infos d’un utilisateur
app.put("/api/user/:id", authenticateToken, async (req, res) => {
  if (req.user.id !== req.params.id) {
    return res.status(403).json({ error: "Accès interdit" });
  }

  const updates = req.body;

  // Empêche la modification du mot de passe directement
  if (updates.passwordHash) delete updates.passwordHash;

  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select("-passwordHash");
  if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

  res.json({ message: "Mise à jour réussie", user });
});
