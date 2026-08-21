(() => {
  "use strict";

  const STARTING_LIFE_DEFAULT = 20;
  const STARTING_LIFE_MULTIPLAYER = 40;
  const SWIPE_THRESHOLD = 100;
  const INACTIVITY_TIMEOUT = 1000;
  const LONG_PRESS_DELAY = 500;
  const DEFAULT_TIMER_MS = 50 * 60 * 1000;

  // ---------- state ----------

  function createPlayer(id, el, pointsEl, historyEl, contentEl, differenceEl, crownEl, commanderDamageEl) {
    return {
      id,
      el,
      current: STARTING_LIFE_DEFAULT,
      previous: STARTING_LIFE_DEFAULT,
      lastTouchTs: Date.now(),
      historyEntries: [], // { timestamp, value }
      historyLines: [],
      pointsEl,
      historyEl,
      contentEl,
      differenceEl,
      crownEl,
      commanderDamageEl,
      rotation: 0,
      difference: 0, // per-player badge, used in 3/4-player mode only
    };
  }

  const players = {
    1: createPlayer(1, document.getElementById("player1"), document.getElementById("player1Points"), document.getElementById("player1History"), document.getElementById("player1Content"), document.getElementById("player1Difference"), document.getElementById("player1Crown"), document.getElementById("player1CommanderDamage")),
    2: createPlayer(2, document.getElementById("player2"), document.getElementById("player2Points"), document.getElementById("player2History"), document.getElementById("player2Content"), document.getElementById("player2Difference"), document.getElementById("player2Crown"), document.getElementById("player2CommanderDamage")),
    3: createPlayer(3, document.getElementById("player3"), document.getElementById("player3Points"), document.getElementById("player3History"), document.getElementById("player3Content"), document.getElementById("player3Difference"), document.getElementById("player3Crown"), document.getElementById("player3CommanderDamage")),
    4: createPlayer(4, document.getElementById("player4"), document.getElementById("player4Points"), document.getElementById("player4History"), document.getElementById("player4Content"), document.getElementById("player4Difference"), document.getElementById("player4Crown"), document.getElementById("player4CommanderDamage")),
  };

  let difference = 0;
  let activePlayer = null;
  let gameMode = 2;
  let fourPlayerLayout = "sides";

  // Commander damage (3/4-player only): commanderSource is the player who
  // long-pressed their crown (null when no session is active). commanderDamage
  // is a full attacker->target matrix so each player's damage dealt to each
  // opponent is remembered independently across sessions, matching how real
  // commander damage has to be tracked per opponent (21 from a single source
  // is a loss condition on its own).
  let commanderSource = null;
  const commanderDamage = {};
  Object.keys(players).forEach((attackerId) => {
    commanderDamage[attackerId] = {};
    Object.keys(players).forEach((targetId) => {
      commanderDamage[attackerId][targetId] = 0;
    });
  });

  // Rotation (degrees, clockwise) applied to each player's number so players
  // sitting across/beside the table can read it right-side up: local "up"
  // for a given rotation points away from that player's own seat, toward
  // the table's center (0->screen up, 90->right, 180->down, 270->left).
  const THREE_PLAYER_ROTATIONS = { 1: 90, 2: 180, 3: 0 };
  const FOUR_PLAYER_ROTATIONS = {
    sides: { 1: 180, 2: 180, 3: 0, 4: 0 },
    corners: { 1: 90, 2: 270, 3: 180, 4: 0 },
  };

  // Commander/multiplayer games conventionally start at 40 life rather than
  // the 1v1 default of 20.
  function getStartingLife() {
    return gameMode === 3 || gameMode === 4 ? STARTING_LIFE_MULTIPLAYER : STARTING_LIFE_DEFAULT;
  }

  function getRotation(playerId) {
    if (gameMode === 3) return THREE_PLAYER_ROTATIONS[playerId] || 0;
    if (gameMode === 4) return FOUR_PLAYER_ROTATIONS[fourPlayerLayout][playerId] || 0;
    return 0;
  }

  // The rotation class is applied to several independent elements (not just
  // .playerContent): .player itself (so CSS can position the history strip
  // and difference badge per-rotation without overflowing a non-square box -
  // see the historyStrip/playerDifference rules in style.css), the badge and
  // the crown button (so their own icon/text reads right-side up).
  function applyRotations() {
    Object.values(players).forEach((player) => {
      const rotation = getRotation(player.id);
      player.rotation = rotation;
      [player.el, player.contentEl, player.differenceEl, player.crownEl].forEach((el) => {
        el.classList.remove("rotate-90", "rotate-180", "rotate-270");
        if (rotation) {
          el.classList.add("rotate-" + rotation);
        }
      });
    });
  }

  // While a commander-damage session is active, every target zone's content
  // (number + hints, as one rotated block) displays using the SOURCE
  // player's rotation rather than its own - the source is the one reading
  // and tapping every zone during the session, so everything needs to read
  // correctly to them, not to the zone's usual owner. Tap-half detection
  // (below, in handlePointerUp) uses this same effective rotation so what
  // LOOKS like "the source's local top" also BEHAVES like it.
  function getEffectiveRotation(player) {
    if (commanderSource && player !== commanderSource) {
      return commanderSource.rotation;
    }
    return player.rotation;
  }

  function applyCommanderContentRotation() {
    Object.values(players).forEach((player) => {
      const rotation = getEffectiveRotation(player);
      player.contentEl.classList.remove("rotate-90", "rotate-180", "rotate-270");
      if (rotation) {
        player.contentEl.classList.add("rotate-" + rotation);
      }
    });
  }

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

  // Per-player difference badge, used instead of the single shared one in
  // 3/4-player mode so several players can tap concurrently without
  // stepping on each other's indicator.
  function refreshPlayerDifferenceView(player) {
    const el = player.differenceEl;
    if (player.difference === 0) {
      el.textContent = "";
      el.classList.remove("hasValue");
    } else if (player.difference > 0) {
      el.textContent = "+" + player.difference;
      el.style.color = "#2e7d32";
      el.classList.add("hasValue");
    } else {
      el.textContent = String(player.difference);
      el.style.color = "#c62828";
      el.classList.add("hasValue");
    }
  }

  function resetPlayerDifference(player) {
    player.difference = 0;
    refreshPlayerDifferenceView(player);
  }

  // ---------- commander damage ----------

  function refreshCommanderDamageView(target) {
    target.commanderDamageEl.textContent = String(commanderDamage[commanderSource.id][target.id]);
  }

  function enterCommanderMode(source) {
    commanderSource = source;
    Object.values(players).forEach((player) => {
      const isTarget = player !== source;
      player.el.classList.toggle("commanderTarget", isTarget);
      player.el.classList.toggle("commanderSource", !isTarget);
      if (isTarget) {
        refreshCommanderDamageView(player);
      }
    });
    applyCommanderContentRotation();
  }

  function exitCommanderMode() {
    if (!commanderSource) return;
    // Commit whatever life change the session produced to the source's
    // history right away, exactly like a normal burst of taps would once
    // the inactivity timer caught up - matches "comme si c'etait des
    // degats classiques".
    addToHistory(commanderSource);
    resetPlayerDifference(commanderSource);
    commanderSource = null;
    Object.values(players).forEach((player) => {
      player.el.classList.remove("commanderTarget", "commanderSource");
    });
    applyCommanderContentRotation();
  }

  // The source deals (or un-deals) 1 commander damage to target. Damage is
  // clamped at 0; the source's own life only moves by however much damage
  // actually changed (so tapping "-" at 0 does nothing, per the source's
  // life either).
  function applyCommanderDamage(source, target, amount) {
    const before = commanderDamage[source.id][target.id];
    const after = Math.max(0, before + amount);
    const applied = after - before;
    commanderDamage[source.id][target.id] = after;
    refreshCommanderDamageView(target);
    if (applied !== 0) {
      source.current -= applied;
      source.difference -= applied;
      refreshPlayerDifferenceView(source);
      refreshPlayerView(source);
      source.lastTouchTs = Date.now();
    }
  }

  function resetCommanderDamage() {
    Object.keys(commanderDamage).forEach((attackerId) => {
      Object.keys(commanderDamage[attackerId]).forEach((targetId) => {
        commanderDamage[attackerId][targetId] = 0;
      });
    });
    Object.values(players).forEach((player) => {
      player.commanderDamageEl.textContent = "0";
    });
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

  // Renders each history entry as its own element (rather than one text
  // blob) so it can carry the player's own rotation class - readable in the
  // same orientation as their life total, matching how .playerContent works.
  // In 3/4-player mode the strip itself is repositioned and reflowed
  // (vertical vs horizontal, normal vs reversed) per rotation in CSS - see
  // the #app.mode-3/.mode-4 .player.rotate-N .historyStrip rules.
  function renderHistoryStrip(player) {
    player.historyEl.innerHTML = "";
    const rotationClass = player.rotation ? "rotate-" + player.rotation : "";
    player.historyLines.forEach((line) => {
      const lineEl = document.createElement("div");
      lineEl.className = "historyEntryLine" + (rotationClass ? " " + rotationClass : "");
      lineEl.textContent = line;
      player.historyEl.appendChild(lineEl);
    });
    // scrollIntoView (rather than a hardcoded scrollTop/scrollLeft axis)
    // keeps the newest entry visible regardless of whether the strip is
    // currently laid out as a column or a row.
    const lastEl = player.historyEl.lastElementChild;
    if (lastEl) {
      lastEl.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

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
    renderHistoryStrip(player);
    player.previous = player.current;
  }

  function resetPlayerHistory(player) {
    player.historyEntries = [];
    player.historyLines = [];
    player.historyEl.innerHTML = "";
  }

  // ---------- game actions ----------

  function refreshViews() {
    Object.values(players).forEach(refreshPlayerView);
    refreshDifferenceView();
  }

  // Drops out of an active commander-damage session without touching
  // history/life (unlike exitCommanderMode) - used when a reset or mode
  // change already wipes/replaces that state itself, so there's nothing
  // meaningful left to commit.
  function forceExitCommanderMode() {
    commanderSource = null;
    Object.values(players).forEach((player) => {
      player.el.classList.remove("commanderTarget", "commanderSource");
    });
  }

  function resetGameKeepTimer() {
    stopRoulette();
    forceExitCommanderMode();
    resetCommanderDamage();
    const startingLife = getStartingLife();
    Object.values(players).forEach((player) => {
      player.current = startingLife;
      player.previous = startingLife;
      resetPlayerHistory(player);
      resetPlayerDifference(player);
    });
    activePlayer = null;
    resetDifference();
    refreshViews();
    applyCommanderContentRotation();
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

  function setGameMode(mode, layout) {
    const targetLayout = mode === 4 ? layout : fourPlayerLayout;
    if (mode === gameMode && targetLayout === fourPlayerLayout) return;
    stopRoulette();
    gameMode = mode;
    if (mode === 4) {
      fourPlayerLayout = layout;
    }
    const appEl = document.getElementById("app");
    appEl.classList.toggle("mode-3", mode === 3);
    appEl.classList.toggle("mode-4", mode === 4);
    appEl.classList.toggle("layout-sides", mode === 4 && fourPlayerLayout === "sides");
    appEl.classList.toggle("layout-corners", mode === 4 && fourPlayerLayout === "corners");
    applyRotations();
    resetGame();
  }

  // ---------- starting player roulette ----------

  const ROULETTE_MIN_DELAY = 70;
  const ROULETTE_MAX_DELAY = 350;
  const ROULETTE_BASE_TICKS = 18; // ~3s of decelerating ticks before landing
  const ROULETTE_HOLD_MS = 2000; // stay lit on the winner before clearing

  let rouletteRunning = false;
  let rouletteTimeoutId = null;

  function getActivePlayerList() {
    if (gameMode === 3) return [players[1], players[2], players[3]];
    if (gameMode === 4) return [players[1], players[2], players[3], players[4]];
    return [players[1], players[2]];
  }

  function clearRouletteHighlight() {
    Object.values(players).forEach((player) => player.el.classList.remove("rouletteHighlight"));
  }

  // Cancels any in-progress spin and clears its highlight - used when the
  // game mode changes or the game resets mid-spin, so nothing is left
  // pointing at a stale layout.
  function stopRoulette() {
    if (rouletteTimeoutId !== null) {
      clearTimeout(rouletteTimeoutId);
      rouletteTimeoutId = null;
    }
    rouletteRunning = false;
    clearRouletteHighlight();
  }

  function pickStartingPlayer() {
    if (rouletteRunning) return;
    rouletteRunning = true;

    const activePlayers = getActivePlayerList();
    const n = activePlayers.length;
    const winnerIndex = Math.floor(Math.random() * n);
    // The tick count is padded up to the next value that lands on the
    // winner (at most n-1 extra ticks) so the winner stays uniformly random
    // regardless of how many players are in the spin.
    let totalTicks = ROULETTE_BASE_TICKS;
    while ((totalTicks - 1) % n !== winnerIndex) {
      totalTicks++;
    }

    function showTick(i) {
      clearRouletteHighlight();
      activePlayers[i % n].el.classList.add("rouletteHighlight");
      if (i < totalTicks - 1) {
        // Quadratic ease-out: fast at the start, slowing into the landing.
        const progress = i / (totalTicks - 1);
        const delay = ROULETTE_MIN_DELAY + (ROULETTE_MAX_DELAY - ROULETTE_MIN_DELAY) * progress * progress;
        rouletteTimeoutId = setTimeout(() => showTick(i + 1), delay);
      } else {
        rouletteTimeoutId = setTimeout(() => {
          rouletteTimeoutId = null;
          rouletteRunning = false;
          clearRouletteHighlight();
        }, ROULETTE_HOLD_MS);
      }
    }

    showTick(0);
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

  // A rotated player's visual "up" points in a different raw screen direction
  // than an unrotated one (CSS rotate() is clockwise): 0deg->screen up,
  // 90deg->screen right, 180deg->screen down, 270deg->screen left. These
  // helpers translate a raw pointer delta/position into "does this count as
  // swiping/tapping toward that player's own up" so gestures feel natural
  // regardless of orientation.

  function effectiveSwipeDelta(rotation, dx, dy) {
    switch (rotation) {
      case 90: return dx;
      case 180: return dy;
      case 270: return -dx;
      default: return -dy;
    }
  }

  function isLocalTopHalf(rotation, relativeX, relativeY, width, height) {
    switch (rotation) {
      case 90: return relativeX > width / 2;
      case 180: return relativeY > height / 2;
      case 270: return relativeX < width / 2;
      default: return relativeY < height / 2;
    }
  }

  function handlePointerDown(player, event) {
    if (timer.displayed && !timer.running) {
      startTimer();
    }

    // Only 2-player mode uses the single shared badge/history-commit-on-switch
    // model (matches the original app). 3/4-player mode tracks each player
    // independently below, since several players can be mid-gesture at once.
    if (gameMode === 2) {
      if (activePlayer !== null && activePlayer !== player) {
        addToHistory(activePlayer);
        resetDifference();
      }
      activePlayer = player;
    }
    player.startX = event.clientX;
    player.startY = event.clientY;
  }

  function handlePointerUp(player, event) {
    // Swipe (+-5) is only available in 2-player mode - with 3 or 4 players
    // each quadrant is too small to reliably swipe in, so only tap (+-1) works.
    const swipeEnabled = gameMode === 2;
    // During a commander-damage session a target zone's tap-half detection
    // must use the SOURCE's rotation (matching what's actually drawn there -
    // see getEffectiveRotation), not its own.
    const rotation = getEffectiveRotation(player);
    const dx = event.clientX - player.startX;
    const dy = event.clientY - player.startY;
    const swipeDelta = swipeEnabled ? effectiveSwipeDelta(rotation, dx, dy) : 0;
    let amount;

    if (swipeEnabled && Math.abs(swipeDelta) > SWIPE_THRESHOLD) {
      amount = swipeDelta > SWIPE_THRESHOLD ? 5 : -5;
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      const relativeX = event.clientX - rect.left;
      const relativeY = event.clientY - rect.top;
      amount = isLocalTopHalf(rotation, relativeX, relativeY, rect.width, rect.height) ? 1 : -1;
    }

    if (commanderSource && player !== commanderSource) {
      applyCommanderDamage(commanderSource, player, amount);
      return;
    }

    player.current += amount;
    if (gameMode === 2) {
      difference += amount;
      refreshDifferenceView();
    } else {
      player.difference += amount;
      refreshPlayerDifferenceView(player);
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
    const now = Date.now();
    if (gameMode === 2) {
      if (activePlayer !== null && now - activePlayer.lastTouchTs >= INACTIVITY_TIMEOUT) {
        addToHistory(activePlayer);
        resetDifference();
        activePlayer = null;
      }
      return;
    }
    Object.values(players).forEach((player) => {
      if (player.difference !== 0 && now - player.lastTouchTs >= INACTIVITY_TIMEOUT) {
        addToHistory(player);
        resetPlayerDifference(player);
      }
    });
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
      // Stops the tap/swipe handler on the underlying .player zone (this
      // element's parent) from also firing a life-point change - without
      // this, every long-press here would also register as a normal tap.
      e.stopPropagation();
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
      el.addEventListener(evt, (e) => {
        e.stopPropagation();
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      });
    });
  }

  Object.values(players).forEach((player) => {
    attachLongPress(player.historyEl, () => openHistoryDialog(player));
  });

  // ---------- commander damage crown ----------

  Object.values(players).forEach((player) => {
    attachLongPress(player.crownEl, () => {
      if (commanderSource === player) {
        exitCommanderMode();
      } else if (commanderSource === null) {
        enterCommanderMode(player);
      }
      // A session started by a different player is active: the crown is
      // hidden on every other zone in that case (see .commanderTarget
      // .crownButton in style.css), so this branch shouldn't normally be
      // reachable - left unhandled on purpose rather than guarded twice.
    });
  });

  // ---------- overlays / dialogs ----------

  function showOverlay(id) {
    document.getElementById(id).classList.remove("hidden");
  }

  function hideOverlay(id) {
    document.getElementById(id).classList.add("hidden");
  }

  document.getElementById("menuButton").addEventListener("click", () => showOverlay("menuSheet"));
  document.getElementById("menuCancelBtn").addEventListener("click", () => hideOverlay("menuSheet"));

  document.getElementById("gameModeBtn").addEventListener("click", () => {
    hideOverlay("menuSheet");
    showOverlay("gameModeDialog");
  });
  document.getElementById("startingPlayerBtn").addEventListener("click", () => {
    hideOverlay("menuSheet");
    pickStartingPlayer();
  });
  document.getElementById("mode2Btn").addEventListener("click", () => {
    setGameMode(2);
    hideOverlay("gameModeDialog");
  });
  document.getElementById("mode3Btn").addEventListener("click", () => {
    setGameMode(3);
    hideOverlay("gameModeDialog");
  });
  document.getElementById("mode4Btn").addEventListener("click", () => {
    hideOverlay("gameModeDialog");
    showOverlay("fourPlayerLayoutDialog");
  });
  document.getElementById("gameModeCancelBtn").addEventListener("click", () => hideOverlay("gameModeDialog"));

  document.getElementById("layoutSidesBtn").addEventListener("click", () => {
    setGameMode(4, "sides");
    hideOverlay("fourPlayerLayoutDialog");
  });
  document.getElementById("layoutCornersBtn").addEventListener("click", () => {
    setGameMode(4, "corners");
    hideOverlay("fourPlayerLayoutDialog");
  });
  document.getElementById("fourPlayerLayoutCancelBtn").addEventListener("click", () => hideOverlay("fourPlayerLayoutDialog"));

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

  // ---------- screen wake lock (best effort, ignored where unsupported) ----------

  // A wake lock is auto-released whenever the tab/app goes to the
  // background (screen off, app switch, etc.) and has to be re-requested
  // once it's visible again - it does not survive on its own.
  let wakeLock = null;

  function requestWakeLock() {
    if (!("wakeLock" in navigator)) return;
    navigator.wakeLock.request("screen").then((lock) => {
      wakeLock = lock;
      wakeLock.addEventListener("release", () => {
        wakeLock = null;
      });
    }).catch(() => {
      /* best-effort - e.g. permission denied, low battery mode */
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      requestWakeLock();
    }
  });
  window.addEventListener("load", requestWakeLock);
  document.addEventListener("pointerdown", requestWakeLock, { once: true });

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
