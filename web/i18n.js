(() => {
  "use strict";

  const translations = {
    en: {
      menuButton: "Menu",
      rotateHint: "Rotate your phone for a better experience ↻",
      resetGame: "Reset game",
      resetLifePoints: "Reset life points",
      toggleTimer: "Add/Remove timer",
      shareApp: "Share app",
      scanToOpen: "Scan to open Life Counter",
      cancel: "Cancel",
      resetConfirmMessage: "Are you sure you want to reset the game?",
      yes: "Yes",
      no: "No",
      setTimerValue: "Set timer value (minutes)",
      ok: "OK",
      history: "History",
      close: "Close",
      historyEntry: (value, date) => `Life Points: ${value} at ${date}`,
    },
    fr: {
      menuButton: "Menu",
      rotateHint: "Tourne ton téléphone pour une meilleure expérience ↻",
      resetGame: "Réinitialiser la partie",
      resetLifePoints: "Réinitialiser les points de vie",
      toggleTimer: "Ajouter/Retirer le minuteur",
      shareApp: "Partager l'appli",
      scanToOpen: "Scanne pour ouvrir Life Counter",
      cancel: "Annuler",
      resetConfirmMessage: "Es-tu sûr de vouloir réinitialiser la partie ?",
      yes: "Oui",
      no: "Non",
      setTimerValue: "Définir la durée du minuteur (minutes)",
      ok: "OK",
      history: "Historique",
      close: "Fermer",
      historyEntry: (value, date) => `Points de vie : ${value} à ${date}`,
    },
  };

  function detectLang() {
    const candidates = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || "en"];
    for (const candidate of candidates) {
      const short = candidate.slice(0, 2).toLowerCase();
      if (translations[short]) {
        return short;
      }
    }
    return "en";
  }

  const lang = detectLang();
  document.documentElement.lang = lang;

  function apply() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const value = translations[lang][el.dataset.i18n];
      if (typeof value === "string") {
        el.textContent = value;
      }
    });
  }

  apply();

  window.i18n = {
    lang,
    t(key, ...args) {
      const entry = translations[lang][key];
      return typeof entry === "function" ? entry(...args) : entry;
    },
  };
})();
