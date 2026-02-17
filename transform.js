const fs = require("fs");

const inputPath = "kanji.js";
const outputPath = "kanji.updated.js";

let text = fs.readFileSync(inputPath, "utf8");

/**
 * Objectif :
 * - Supprimer le bloc "onReading": [...] (avec sa virgule)
 * - Supprimer le bloc "kunReading": [...] (avec sa virgule)
 * - Ajouter "unlocked_level": 1 juste après "mnemonic": "..."
 * - Laisser le reste inchangé
 *
 * Hypothèses :
 * - onReading et kunReading sont toujours des tableaux `[...]`
 * - mnemonic existe toujours et est une string
 */

// 1) enlever onReading (avec la virgule éventuelle après le tableau)
text = text.replace(
  /,\s*"onReading"\s*:\s*\[[\s\S]*?\]\s*(?=,\s*"kunReading")/g,
  ""
);

// 2) enlever kunReading (avec la virgule éventuelle après le tableau)
text = text.replace(
  /,\s*"kunReading"\s*:\s*\[[\s\S]*?\]\s*(?=,\s*"mnemonic")/g,
  ""
);

// 3) insérer unlocked_level juste après mnemonic
text = text.replace(
  /("mnemonic"\s*:\s*"[\s\S]*?")\s*,\s*\n\s*"level"\s*:\s*0/g,
  `$1,\n    "unlocked_level": 1,\n\n    "level": 0`
);

fs.writeFileSync(outputPath, text, "utf8");
console.log("✅ Fichier généré :", outputPath);
