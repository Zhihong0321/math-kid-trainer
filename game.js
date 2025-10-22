const OPTION_COUNT = 5;
const playerName = "ShuLaw";

const DIFFICULTY_SETTINGS = {
  easy: { label: "Easy", maxTarget: 10, timeLimit: 10, maxOffset: 9 },
  medium: { label: "Medium", maxTarget: 20, timeLimit: 8, maxOffset: 12 },
  hard: { label: "Hard", maxTarget: 40, timeLimit: 7, maxOffset: 15 },
};

let currentDifficulty = "easy";
let currentSettings = DIFFICULTY_SETTINGS[currentDifficulty];

const stage = document.getElementById("stage");
const fallingBox = document.getElementById("fallingBox");
const targetBox = document.getElementById("targetBox");
const choices = document.getElementById("choices");
const equationPanel = document.getElementById("equationPanel");
const playButton = document.getElementById("playButton");
const timerFill = document.getElementById("timerFill");
const timerCount = document.getElementById("timerCount");
const confettiLayer = document.getElementById("confettiLayer");
const scoreValue = document.getElementById("scoreValue");
const streakValue = document.getElementById("streakValue");
const bestValue = document.getElementById("bestValue");
const difficultyButtons = document.querySelectorAll(".difficulty-button");
const difficultyNote = document.getElementById("difficultyNote");

let score = 0;
let streak = 0;
let bestStreak = 0;
let roundActive = false;
let currentBase = 0;
let currentTarget = 0;
let currentAnswer = 0;
let timerInterval = null;
let fallTimeout = null;

const successPhrases = [
  "Awesome aim, {name}!",
  "Math hero mode: {name}!",
  "Number ninja moves, {name}!",
  "Brain power boost for {name}!",
  "Equation expert vibes, {name}!",
];

const encouragements = [
  "Great try, {name}! You'll nail the next one!",
  "Keep going, {name}! Superstars grow with practice!",
  "Every hero keeps training, {name}!",
  "Math muscles growing strong, {name}!",
  "You're getting stronger every round, {name}!",
];

difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selected = button.dataset.difficulty;
    if (selected === currentDifficulty) return;

    currentDifficulty = selected;
    currentSettings = DIFFICULTY_SETTINGS[currentDifficulty];

    difficultyButtons.forEach((btn) => {
      btn.classList.toggle("active", btn === button);
    });

    resetGame();
    updateDifficultyDetails();

    if (roundActive) {
      roundActive = false;
      clearTimers();
      setTimeout(() => {
        startRound();
      }, 300);
    } else {
      refreshTimerIdle();
    }
  });
});

playButton.addEventListener("click", () => {
  if (!roundActive) {
    playButton.disabled = true;
    playButton.textContent = "Training...";
    resetGame();
    updateDifficultyDetails();
    startRound();
  }
});

function resetGame() {
  score = 0;
  streak = 0;
  updateScoreboard();
}

function startRound() {
  clearTimers();
  roundActive = true;
  removeStageEffects();
  fallingBox.className = "falling-box";
  fallingBox.style.top = "";
  fallingBox.style.transition = "";
  fallingBox.style.transform = "translateX(-50%)";
  fallingBox.style.setProperty(
    "--drop-duration",
    `${currentSettings.timeLimit}s`
  );
  void fallingBox.offsetWidth;
  fallingBox.classList.add("ready");

  equationPanel.innerHTML = "";

  const { base, offset, target, options } = createPuzzle();
  currentBase = base;
  currentAnswer = offset;
  currentTarget = target;

  fallingBox.textContent = base;
  targetBox.textContent = target;

  renderOptions(options);
  launchTimer();

  requestAnimationFrame(() => {
    fallingBox.classList.add("drop");
  });
}

function createPuzzle() {
  const { maxTarget, maxOffset } = currentSettings;
  const target = randomInt(4, maxTarget);
  const minBase = Math.max(0, target - maxOffset);
  const base = randomInt(minBase, target - 1);
  const offset = target - base;

  const options = new Set([offset]);
  const optionMax = Math.max(maxOffset, offset + 4);
  while (options.size < OPTION_COUNT) {
    const candidate = randomInt(1, optionMax);
    options.add(candidate);
  }

  return { base, offset, target, options: shuffle([...options]) };
}

function renderOptions(options) {
  choices.innerHTML = "";
  options.forEach((option) => {
    const button = document.createElement("button");
    button.className = "choice-button";
    button.type = "button";
    button.textContent = `+${option}`;
    button.dataset.value = option;
    button.addEventListener("click", () => handleChoice(option, button));
    choices.appendChild(button);
  });
}

function handleChoice(value, button) {
  if (!roundActive) return;

  if (value === currentAnswer) {
    celebrateSuccess(button);
  } else {
    showMistake(button);
  }
}

function celebrateSuccess(button) {
  roundActive = false;
  clearTimers();
  disableChoices();
  streak += 1;
  score += 1;
  bestStreak = Math.max(bestStreak, streak);
  updateScoreboard();

  stage.classList.add("celebrate");
  animateFallingBoxTowardsTarget();
  button.classList.add("launch-answer");

  const phrase = pickPersonalized(successPhrases);
  const tagline =
    streak > 1 ? `${phrase} Streak x${streak}!` : phrase;
  setEquationCard(
    "correct",
    `${currentBase} + ${currentAnswer} = ${currentTarget}`,
    tagline
  );

  spawnConfetti();
  setTimeout(() => {
    startRound();
  }, 2000);
}

function showMistake(button) {
  roundActive = false;
  clearTimers();
  disableChoices();
  streak = 0;
  updateScoreboard();

  button.classList.add("incorrect");
  highlightCorrectOption();
  stage.classList.add("boom");
  animateCrash();

  setEquationCard(
    "oops",
    `${currentBase} + ${currentAnswer} = ${currentTarget}`,
    pickPersonalized(encouragements)
  );

  setTimeout(() => {
    startRound();
  }, 2200);
}

function timeRanOut() {
  if (!roundActive) return;
  roundActive = false;
  streak = 0;
  updateScoreboard();
  disableChoices();
  highlightCorrectOption();
  stage.classList.add("boom");
  animateCrash();

  setEquationCard(
    "oops",
    `${currentBase} + ${currentAnswer} = ${currentTarget}`,
    `Time's up, ${playerName}! Let's try another!`
  );

  setTimeout(() => {
    startRound();
  }, 2200);
}

function animateFallingBoxTowardsTarget() {
  const stageRect = stage.getBoundingClientRect();
  const targetRect = targetBox.getBoundingClientRect();
  const boxRect = fallingBox.getBoundingClientRect();

  const currentTop = boxRect.top - stageRect.top;
  const targetCenter = targetRect.top - stageRect.top + targetRect.height / 2;
  const finalTop = targetCenter - boxRect.height / 2;

  fallingBox.classList.remove("drop");
  fallingBox.style.top = `${currentTop}px`;
  void fallingBox.offsetWidth;
  fallingBox.style.transition = "top 0.5s ease-out, transform 0.5s ease-out";
  fallingBox.style.top = `${finalTop}px`;
  fallingBox.style.transform = "translateX(-50%) scale(0.9) rotate(-6deg)";
}

function animateCrash() {
  const stageRect = stage.getBoundingClientRect();
  const targetRect = targetBox.getBoundingClientRect();
  const boxRect = fallingBox.getBoundingClientRect();
  const currentTop = boxRect.top - stageRect.top;
  const targetCenter = targetRect.top - stageRect.top + targetRect.height / 2;
  const finalTop = targetCenter - boxRect.height / 2;

  fallingBox.classList.remove("drop");
  fallingBox.style.top = `${currentTop}px`;
  void fallingBox.offsetWidth;
  fallingBox.style.transition = "top 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.2), transform 0.6s";
  fallingBox.style.top = `${finalTop}px`;
  fallingBox.style.transform = "translateX(-50%) rotate(12deg) scale(0.95)";
}

function setEquationCard(type, equation, tagline) {
  const card = document.createElement("div");
  card.className = `equation-card ${type}`;

  const equationText = document.createElement("span");
  equationText.textContent = equation;
  card.appendChild(equationText);

  if (tagline) {
    const tag = document.createElement("span");
    tag.className = "message-tagline";
    tag.textContent = tagline;
    card.appendChild(tag);
  }

  equationPanel.innerHTML = "";
  equationPanel.appendChild(card);
}

function launchTimer() {
  timerFill.style.width = "100%";
  timerFill.classList.remove("low");
  timerCount.textContent = currentSettings.timeLimit;
  let timeRemaining = currentSettings.timeLimit;

  timerInterval = setInterval(() => {
    timeRemaining -= 1;
    timerCount.textContent = Math.max(timeRemaining, 0);
    timerFill.style.width = `${(timeRemaining / currentSettings.timeLimit) * 100}%`;
    if (timeRemaining <= 2) {
      timerFill.classList.add("low");
    }
    if (timeRemaining <= 0) {
      clearTimers();
      timeRanOut();
    }
  }, 1000);

  fallTimeout = setTimeout(() => {
    clearTimers();
    timeRanOut();
  }, currentSettings.timeLimit * 1000);
}

function disableChoices() {
  const buttons = choices.querySelectorAll("button");
  buttons.forEach((button) => {
    button.disabled = true;
  });
}

function highlightCorrectOption() {
  const correctButton = choices.querySelector(
    `[data-value="${currentAnswer}"]`
  );
  if (correctButton) {
    correctButton.classList.add("correct-answer");
  }
}

function removeStageEffects() {
  stage.classList.remove("boom", "celebrate");
}

function updateScoreboard() {
  scoreValue.textContent = score;
  streakValue.textContent = streak;
  bestValue.textContent = `Best ${bestStreak}`;
}

function spawnConfetti() {
  confettiLayer.innerHTML = "";
  const colors = ["#ff6f91", "#ff9671", "#ffc75f", "#f9f871", "#7afcff", "#70d6ff"];
  const pieces = 28;
  for (let i = 0; i < pieces; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.background = colors[i % colors.length];
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.setProperty("--x-move", `${Math.random() * 120 - 60}px`);
    piece.style.animationDelay = `${Math.random() * 0.4}s`;
    confettiLayer.appendChild(piece);
  }

  setTimeout(() => {
    confettiLayer.innerHTML = "";
  }, 1800);
}

function clearTimers() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (fallTimeout) {
    clearTimeout(fallTimeout);
    fallTimeout = null;
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

window.addEventListener("blur", () => {
  if (roundActive) {
    clearTimers();
    timeRanOut();
  }
});

function pickPersonalized(messages) {
  const raw = messages[Math.floor(Math.random() * messages.length)];
  return raw.replaceAll("{name}", playerName);
}

function updateDifficultyDetails() {
  const { maxTarget, timeLimit } = currentSettings;
  difficultyNote.textContent = `Numbers up to ${maxTarget} • ${timeLimit} seconds to connect`;
  refreshTimerIdle();
}

function refreshTimerIdle() {
  timerFill.style.width = "100%";
  timerFill.classList.remove("low");
  timerCount.textContent = currentSettings.timeLimit;
}

updateDifficultyDetails();
updateScoreboard();
