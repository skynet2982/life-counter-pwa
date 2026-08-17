(() => {
  "use strict";

  const STARTING_LIFE = 20;
  const SWIPE_THRESHOLD = 100;
  const INACTIVITY_TIMEOUT = 1000;
  const LONG_PRESS_DELAY = 500;
  const DEFAULT_TIMER_MS = 50 * 60 * 1000;

  // ---------- state ----------

  function createPlayer(pointsEl, historyEl) {
    return {
      current: STARTING_LIFE,
      previous: STARTING_LIFE,
      lastTouchTs: Date.now(),
      historyEntries: [], // { timestamp, value }
      historyLines: [],
      pointsEl,
      historyEl,
    };
  }

  const players = {
    1: createPlayer(document.getElementById("player1Points"), document.getElementById("player1History")),
    2: createPlayer(document.getElementById("player2Points"), document.getElementById("player2History")),
  };

  let difference = 0;
  let activePlayer = null;

  const differenceEl = document.getElementById("differenceView");

  const timer = {
    currentTime: DEFAULT_TIMER_MS,
    running: false,
    displayed: false,
    intervalId: null,
  };
  const timerEl = document.getElementById("timerView");

  // ---------- rendering ----------

  function refreshPlayerView(player) {
    player.pointsEl.textContent = String(player.current);
  }

  function refreshDifferenceView() {
    if (difference === 0) {
      differenceEl.textContent = "";
      differenceEl.classList.remove("hasValue");
    } else if (difference > 0) {
      differenceEl.textContent = "+" + difference;
      differenceEl.style.color = "#2e7d32";
      differenceEl.classList.add("hasValue");
    } else {
      differenceEl.textContent = String(difference);
      differenceEl.style.color = "#c62828";
      differenceEl.classList.add("hasValue");
    }
  }

  function resetDifference() {
    difference = 0;
    refreshDifferenceView();
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function toDisplayTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return pad2(minutes) + ":" + pad2(seconds);
  }

  function formatDate(timestamp) {
    const d = new Date(timestamp);
    return (
      pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1) + "/" + d.getFullYear() +
      " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds())
    );
  }

  function refreshTimerView() {
    timerEl.textContent = toDisplayTime(timer.currentTime);
    timerEl.classList.toggle("bordered", timer.displayed);
    timerEl.classList.toggle("running", timer.running);
  }

  // ---------- history ----------

  function addToHistory(player) {
    if (player.current === player.previous) {
      return;
    }
    const lastLine = player.historyLines[player.historyLines.length - 1];
    if (lastLine !== undefined && lastLine === String(player.current)) {
      return;
    }
    player.historyLines.push(String(player.current));
    player.historyEntries.push({ timestamp: Date.now(), value: player.current });
    player.historyEl.textContent = player.historyLines.join("\n");
    player.historyEl.scrollTop = player.historyEl.scrollHeight;
    player.previous = player.current;
  }

  function resetPlayerHistory(player) {
    player.historyEntries = [];
    player.historyLines = [];
    player.historyEl.textContent = "";
  }

  // ---------- game actions ----------

  function refreshViews() {
    refreshPlayerView(players[1]);
    refreshPlayerView(players[2]);
    refreshDifferenceView();
  }

  function resetGameKeepTimer() {
    Object.values(players).forEach((player) => {
      player.current = STARTING_LIFE;
      player.previous = STARTING_LIFE;
      resetPlayerHistory(player);
    });
    activePlayer = null;
    resetDifference();
    refreshViews();
  }

  function resetTimer() {
    stopTimer();
    timer.currentTime = DEFAULT_TIMER_MS;
    timer.displayed = false;
    timerEl.classList.add("hidden");
    refreshTimerView();
  }

  function resetGame() {
    resetGameKeepTimer();
    resetTimer();
  }

  // ---------- timer ----------

  function startTimer() {
    if (timer.running) return;
    timer.running = true;
    timer.intervalId = setInterval(() => {
      timer.currentTime = Math.max(0, timer.currentTime - 1000);
      refreshTimerView();
      if (timer.currentTime === 0) {
        stopTimer();
      }
    }, 1000);
    refreshTimerView();
  }

  function stopTimer() {
    timer.running = false;
    if (timer.intervalId !== null) {
      clearInterval(timer.intervalId);
      timer.intervalId = null;
    }
    refreshTimerView();
  }

  function toggleTimerDisplay() {
    if (timer.displayed) {
      resetTimer();
    } else {
      timer.displayed = true;
      timerEl.classList.remove("hidden");
      refreshTimerView();
    }
  }

  timerEl.addEventListener("click", () => {
    if (!timer.displayed) return;
    if (timer.running) {
      stopTimer();
    } else {
      startTimer();
    }
  });

  let timerLongPressTimeout = null;
  timerEl.addEventListener("pointerdown", () => {
    timerLongPressTimeout = setTimeout(() => {
      timerLongPressTimeout = null;
      openTimerInputDialog();
    }, LONG_PRESS_DELAY);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach((evt) => {
    timerEl.addEventListener(evt, () => {
      if (timerLongPressTimeout !== null) {
        clearTimeout(timerLongPressTimeout);
        timerLongPressTimeout = null;
      }
    });
  });

  // ---------- player touch handling ----------

  function handlePointerDown(player, event) {
    if (timer.displayed && !timer.running) {
      startTimer();
    }

    if (activePlayer !== null && activePlayer !== player) {
      addToHistory(activePlayer);
      resetDifference();
    }
    activePlayer = player;
    player.startY = event.clientY;
  }

  function handlePointerUp(player, event) {
    const endY = event.clientY;
    const deltaY = player.startY - endY;

    if (Math.abs(deltaY) > SWIPE_THRESHOLD) {
      if (deltaY > SWIPE_THRESHOLD) {
        player.current += 5;
        difference += 5;
      } else {
        player.current -= 5;
        difference -= 5;
      }
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      const relativeY = event.clientY - rect.top;
      if (relativeY < rect.height / 2) {
        player.current += 1;
        difference += 1;
      } else {
        player.current -= 1;
        difference -= 1;
      }
    }

    refreshViews();
    player.lastTouchTs = Date.now();
  }

  document.querySelectorAll(".player").forEach((el) => {
    const player = players[el.dataset.player];
    el.addEventListener("pointerdown", (e) => handlePointerDown(player, e));
    el.addEventListener("pointerup", (e) => handlePointerUp(player, e));
  });

  setInterval(() => {
    if (activePlayer !== null) {
      const now = Date.now();
      if (now - activePlayer.lastTouchTs >= INACTIVITY_TIMEOUT) {
        addToHistory(activePlayer);
        resetDifference();
        activePlayer = null;
      }
    }
  }, INACTIVITY_TIMEOUT);

  // ---------- history long-press dialog ----------

  function openHistoryDialog(player) {
    const list = document.getElementById("historyList");
    list.innerHTML = "";
    player.historyEntries.forEach((entry) => {
      const li = document.createElement("li");
      li.textContent = window.i18n.t("historyEntry", entry.value, formatDate(entry.timestamp));
      list.appendChild(li);
    });
    showOverlay("historyDialog");
  }

  function attachLongPress(el, onLongPress) {
    let timeoutId = null;
    let startX = 0;
    let startY = 0;
    const MOVE_TOLERANCE = 15;

    el.addEventListener("pointerdown", (e) => {
      startX = e.clientX;
      startY = e.clientY;
      timeoutId = setTimeout(() => {
        timeoutId = null;
        onLongPress();
      }, LONG_PRESS_DELAY);
    });

    el.addEventListener("pointermove", (e) => {
      if (timeoutId === null) return;
      if (Math.abs(e.clientX - startX) > MOVE_TOLERANCE || Math.abs(e.clientY - startY) > MOVE_TOLERANCE) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    });

    ["pointerup", "pointerleave", "pointercancel"].forEach((evt) => {
      el.addEventListener(evt, () => {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      });
    });
  }

  attachLongPress(players[1].historyEl, () => openHistoryDialog(players[1]));
  attachLongPress(players[2].historyEl, () => openHistoryDialog(players[2]));

  // ---------- overlays / dialogs ----------

  function showOverlay(id) {
    document.getElementById(id).classList.remove("hidden");
  }

  function hideOverlay(id) {
    document.getElementById(id).classList.add("hidden");
  }

  document.getElementById("menuButton").addEventListener("click", () => showOverlay("menuSheet"));
  document.getElementById("menuCancelBtn").addEventListener("click", () => hideOverlay("menuSheet"));

  document.getElementById("resetGameBtn").addEventListener("click", () => {
    hideOverlay("menuSheet");
    showOverlay("resetConfirmDialog");
  });
  document.getElementById("resetConfirmYes").addEventListener("click", () => {
    resetGame();
    hideOverlay("resetConfirmDialog");
  });
  document.getElementById("resetConfirmNo").addEventListener("click", () => hideOverlay("resetConfirmDialog"));

  document.getElementById("resetLifeBtn").addEventListener("click", () => {
    hideOverlay("menuSheet");
    resetGameKeepTimer();
  });

  document.getElementById("toggleTimerBtn").addEventListener("click", () => {
    hideOverlay("menuSheet");
    toggleTimerDisplay();
  });

  document.getElementById("shareBtn").addEventListener("click", () => {
    hideOverlay("menuSheet");
    showOverlay("qrShareDialog");
  });
  document.getElementById("qrCloseBtn").addEventListener("click", () => hideOverlay("qrShareDialog"));

  function renderShareQrCode() {
    const qr = qrcode(0, "M");
    qr.addData(location.href);
    qr.make();
    document.getElementById("qrCodeContainer").innerHTML = qr.createSvgTag({ cellSize: 6, margin: 8 });
  }

  function openTimerInputDialog() {
    const input = document.getElementById("timerInput");
    input.value = "";
    showOverlay("timerInputDialog");
    input.focus();
  }

  document.getElementById("timerInputOk").addEventListener("click", () => {
    const input = document.getElementById("timerInput");
    const minutes = parseInt(input.value, 10);
    if (!isNaN(minutes) && minutes >= 0) {
      timer.currentTime = minutes * 60 * 1000;
      refreshTimerView();
    }
    hideOverlay("timerInputDialog");
  });
  document.getElementById("timerInputCancel").addEventListener("click", () => hideOverlay("timerInputDialog"));

  document.getElementById("historyCloseBtn").addEventListener("click", () => hideOverlay("historyDialog"));

  // ---------- orientation lock (best effort, ignored where unsupported e.g. iOS Safari) ----------

  function tryLockOrientation() {
    if (screen.orientation && typeof screen.orientation.lock === "function") {
      screen.orientation.lock("landscape").catch(() => {});
    }
  }

  window.addEventListener("load", tryLockOrientation);
  document.addEventListener("pointerdown", tryLockOrientation, { once: true });

  // ---------- init ----------

  refreshViews();
  refreshTimerView();
  renderShareQrCode();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js", { updateViaCache: "none" }).then((reg) => {
        reg.update();
      }).catch(() => {
        /* offline support is best-effort */
      });
    });
  }
})();
