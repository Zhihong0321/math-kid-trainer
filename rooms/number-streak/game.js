const playerName = "ShuLaw";

const SPEED_INCREMENT = 0.01;
const SPEED_LIMIT = 1.5;
const OPTION_COUNT = 5;

const DIFFICULTY_SETTINGS = {
  easy: {
    label: "Easy",
    step: 1,
    responseWindow: 5.5,
    blanks: 3,
    length: 11,
    startRange: [1, 9],
  },
  medium: {
    label: "Medium",
    step: 2,
    responseWindow: 4.6,
    blanks: 3,
    length: 11,
    startRange: [2, 14],
  },
  hard: {
    label: "Hard",
    step: 3,
    responseWindow: 4.1,
    blanks: 4,
    length: 12,
    startRange: [3, 18],
  },
};

const stage = document.getElementById("sequenceStage");
const row = document.getElementById("sequenceRow");
const highlightWindow = document.getElementById("highlightWindow");
const promptPanel = document.getElementById("promptPanel");
const choices = document.getElementById("choices");
const playButton = document.getElementById("playButton");
const scoreValue = document.getElementById("scoreValue");
const streakValue = document.getElementById("streakValue");
const bestValue = document.getElementById("bestValue");
const speedValue = document.getElementById("speedValue");
const timeValue = document.getElementById("timeValue");
const difficultyNote = document.getElementById("difficultyNote");
const difficultyButtons = document.querySelectorAll(".difficulty-button");

let currentDifficulty = "easy";
let currentSettings = DIFFICULTY_SETTINGS[currentDifficulty];

let score = 0;
let streak = 0;
let bestStreak = 0;
let speedMultiplier = 1;
let roundActive = false;
let animationId = null;
let animationActive = false;
let lastFrame = null;
let rowPosition = 0;
let blanks = [];
let activeBlankIndex = -1;
let answerDeadline = null;
let nextRoundTimeout = null;
let introPlayed = false;

const successPhrases = [
  "Lightning quick, {name}!",
  "Streak superstar move, {name}!",
  "Number ninja reflexes, {name}!",
  "Perfect placement, {name}!",
  "Boom! Another streak boost, {name}!",
];

const encouragements = [
  "Keep watching the rhythm, {name}!",
  "Shake it off, {name}—the next one is yours!",
  "Every streak grows with practice, {name}!",
  "Deep breath, {name}. Lock onto the next gap!",
  "You&apos;re still in the game, {name}!",
];

const coachingPhrases = [
  "Counting by {step}s means {prev} + {step} = {answer}.",
  "Slide from {prev} adds {step} to land on {answer}.",
  "We jump by {step}s, so after {prev} comes {answer}.",
];

playButton.addEventListener("click", () => {
  if (!introPlayed) {
    introPlayed = true;
  }
  playButton.disabled = true;
  playButton.textContent = "Loading numbers...";
  resetSession();
  startRound();
  setTimeout(() => {
    playButton.disabled = false;
    playButton.textContent = "Restart Number Streak";
  }, 800);
});

difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selected = button.dataset.difficulty;
    if (selected === currentDifficulty) return;

    currentDifficulty = selected;
    currentSettings = DIFFICULTY_SETTINGS[currentDifficulty];
    difficultyButtons.forEach((btn) => {
      btn.classList.toggle("active", btn === button);
    });
    updateDifficultyNote();
    speedMultiplier = 1;
    updateSpeedDisplay();
    score = 0;
    streak = 0;
    updateScoreboard();
    promptPanel.textContent = `New rhythm unlocked! Tap start when you&apos;re ready, ${playerName}.`;

    if (roundActive || animationId !== null) {
      resetSession(false);
      startRound();
    }
  });
});

window.addEventListener("resize", () => {
  // Recalculate starting position to keep motion smooth on resize
  if (!roundActive) return;
  const stageWidth = stage.getBoundingClientRect().width;
  rowPosition = Math.min(rowPosition, stageWidth + 60);
  row.style.transform = `translateX(${rowPosition}px)`;
});

function resetSession(resetBest = true) {
  cancelAnimation();
  clearTimeout(nextRoundTimeout);
  nextRoundTimeout = null;
  roundActive = false;
  blanks = [];
  activeBlankIndex = -1;
  answerDeadline = null;
  updateTimeDisplay();
  choices.innerHTML = "";
  row.innerHTML = "";
  rowPosition = 0;
  row.style.transform = "translateX(0)";
  if (resetBest) {
    score = 0;
    streak = 0;
    updateScoreboard();
  }
  speedMultiplier = 1;
  updateSpeedDisplay();
}

function startRound() {
  clearTimeout(nextRoundTimeout);
  nextRoundTimeout = null;
  cancelAnimation();
  blanks = [];
  activeBlankIndex = -1;
  answerDeadline = null;
  updateTimeDisplay();
  row.innerHTML = "";
  choices.innerHTML = "";
  promptPanel.textContent = `Eyes on the train, ${playerName}! The glowing box is next.`;

  const cells = createSequence();
  const fragment = document.createDocumentFragment();
  cells.forEach((cell) => fragment.appendChild(cell.element));
  row.appendChild(fragment);

  requestAnimationFrame(() => {
    collectBlankData(cells);
    const stageWidth = stage.getBoundingClientRect().width;
    rowPosition = stageWidth + 60;
    row.style.transform = `translateX(${rowPosition}px)`;
    if (!blanks.length) {
      promptPanel.textContent = `All numbers are filled! Starting a new streak for you, ${playerName}.`;
      scheduleNextRound(1200);
      return;
    }
    activeBlankIndex = 0;
    focusOnBlank(blanks[activeBlankIndex]);
    roundActive = true;
    lastFrame = null;
    animationActive = true;
    animationId = requestAnimationFrame(step);
  });
}

function createSequence() {
  const settings = currentSettings;
  const step = settings.step;
  const length = settings.length;
  const [startMin, startMax] = settings.startRange;
  const startValue = randomInt(startMin, startMax);
  const numbers = Array.from({ length }, (_, index) => startValue + index * step);

  const blankIndices = new Set();
  const minIndex = 1;
  const maxIndex = length - 2;
  while (blankIndices.size < settings.blanks && blankIndices.size < length - 2) {
    const candidate = randomInt(minIndex, maxIndex);
    blankIndices.add(candidate);
  }

  return numbers.map((value, index) => {
    const element = document.createElement("div");
    element.className = "sequence-cell";
    element.textContent = String(value);
    let blankData = null;
    if (blankIndices.has(index)) {
      element.classList.add("blank");
      element.textContent = "";
      blankData = {
        value,
        index,
        previous: index > 0 ? numbers[index - 1] : null,
        next: index < numbers.length - 1 ? numbers[index + 1] : null,
        element,
        options: buildOptions(value, step),
        answered: false,
        started: false,
      };
    }
    return { element, blankData };
  });
}

function collectBlankData(cells) {
  blanks = cells
    .filter((cell) => cell.blankData)
    .map((cell) => ({
      ...cell.blankData,
      offset: cell.blankData.element.offsetLeft,
    }))
    .sort((a, b) => a.offset - b.offset);
}

function focusOnBlank(blank) {
  blanks.forEach((entry) => {
    entry.element.classList.remove("active");
  });
  blank.element.classList.add("active");
  blank.element.classList.remove("filled", "revealed", "solved");
  blank.answered = false;
  blank.started = false;
  answerDeadline = null;
  updateTimeDisplay();
  renderChoices(blank.options, true);
}

function renderChoices(optionValues, disabled = false) {
  choices.innerHTML = "";
  optionValues.forEach((value) => {
    const button = document.createElement("button");
    button.className = "choice-button";
    button.type = "button";
    button.textContent = String(value);
    button.disabled = disabled;
    button.addEventListener("click", () => handleChoice(value, button));
    choices.appendChild(button);
  });
}

function handleChoice(value, button) {
  const blank = blanks[activeBlankIndex];
  if (!blank || blank.answered || button.disabled) return;

  disableChoices();

  if (value === blank.value) {
    button.classList.add("correct");
    revealCorrect(blank, value);
    handleSuccess(blank);
  } else {
    button.classList.add("wrong");
    revealMiss(blank);
    handleMiss(blank, value);
  }
}

function revealCorrect(blank, value) {
  blank.element.dataset.value = value;
  blank.element.classList.add("filled", "solved");
  blank.element.classList.remove("active");
  blank.answered = true;
  blank.started = false;
  answerDeadline = null;
  updateTimeDisplay();
}

function revealMiss(blank) {
  blank.element.dataset.value = blank.value;
  blank.element.classList.add("filled", "revealed");
  blank.element.classList.remove("active");
  blank.answered = true;
  blank.started = false;
  answerDeadline = null;
  updateTimeDisplay();
}

function handleSuccess(blank) {
  const step = currentSettings.step;
  const messageTemplate = randomPick(successPhrases);
  const coaching = randomPick(coachingPhrases)
    .replaceAll("{step}", step)
    .replaceAll("{prev}", blank.previous ?? blank.value - step)
    .replaceAll("{answer}", blank.value);

  promptPanel.innerHTML = `${messageTemplate.replace("{name}", playerName)}<br /><span class="hint">${coaching}</span>`;

  score += 1;
  streak += 1;
  if (streak > bestStreak) {
    bestStreak = streak;
  }
  updateScoreboard();

  speedMultiplier = Math.min(speedMultiplier + SPEED_INCREMENT, SPEED_LIMIT);
  updateSpeedDisplay();

  scheduleNextBlank();
}

function handleMiss(blank, chosenValue = null) {
  const encouragement = randomPick(encouragements).replace("{name}", playerName);
  const step = currentSettings.step;
  const explanation = `We hop by ${step}s, so ${blank.previous ?? blank.value - step} + ${step} = ${blank.value}.`;
  if (chosenValue !== null) {
    promptPanel.innerHTML = `${encouragement}<br /><span class="hint">${explanation}</span>`;
  } else {
    promptPanel.innerHTML = `${encouragement}<br /><span class="hint">${explanation}</span>`;
  }

  streak = 0;
  updateScoreboard();
  speedMultiplier = 1;
  updateSpeedDisplay();

  scheduleNextBlank();
}

function scheduleNextBlank() {
  disableChoices();
  answerDeadline = null;
  updateTimeDisplay();
  setTimeout(() => {
    activeBlankIndex += 1;
    if (activeBlankIndex < blanks.length) {
      focusOnBlank(blanks[activeBlankIndex]);
    } else {
      finishRound();
    }
  }, 900);
}

function finishRound() {
  roundActive = false;
  cancelAnimation();
  promptPanel.innerHTML = `Great streak, ${playerName}! Ready for the next train?`;
  disableChoices();
  updateTimeDisplay();
  scheduleNextRound(1600);
}

function scheduleNextRound(delay = 1400) {
  clearTimeout(nextRoundTimeout);
  nextRoundTimeout = setTimeout(() => {
    if (!roundActive) {
      startRound();
    }
  }, delay);
}

function disableChoices() {
  choices.querySelectorAll("button").forEach((btn) => {
    btn.disabled = true;
  });
}

function startAnswerWindow(blank) {
  if (blank.started) return;
  blank.started = true;
  choices.querySelectorAll("button").forEach((btn) => {
    btn.disabled = false;
  });
  const windowSeconds = currentSettings.responseWindow / speedMultiplier;
  answerDeadline = performance.now() + windowSeconds * 1000;
  updateTimeDisplay(windowSeconds);
  promptPanel.textContent = `Quick, fill the gap before it slides away, ${playerName}!`;
}

function handleTimeout() {
  const blank = blanks[activeBlankIndex];
  if (!blank || blank.answered) return;
  revealMiss(blank);
  handleMiss(blank);
}

function step(timestamp) {
  if (!animationActive) {
    animationId = null;
    return;
  }
  if (lastFrame == null) {
    lastFrame = timestamp;
  }
  const delta = (timestamp - lastFrame) / 1000;
  lastFrame = timestamp;

  const stageRect = stage.getBoundingClientRect();
  const highlightRect = highlightWindow.getBoundingClientRect();
  const activeBlank = blanks[activeBlankIndex];
  const blankRect = activeBlank ? activeBlank.element.getBoundingClientRect() : null;
  const cellWidth = blankRect ? blankRect.width : 80;

  const distance = Math.max(
    60,
    highlightRect.left + highlightRect.width / 2 - (stageRect.left + cellWidth / 2)
  );
  const baseSpeed = distance / currentSettings.responseWindow;
  const speed = baseSpeed * speedMultiplier;

  rowPosition -= speed * delta;
  row.style.transform = `translateX(${rowPosition}px)`;

  if (activeBlank && !activeBlank.started) {
    const blankCenter = blankRect.left + blankRect.width / 2;
    if (blankCenter <= highlightRect.right) {
      startAnswerWindow(activeBlank);
    }
  }

  if (answerDeadline) {
    const remaining = (answerDeadline - performance.now()) / 1000;
    if (remaining <= 0) {
      answerDeadline = null;
      updateTimeDisplay();
      handleTimeout();
    } else {
      updateTimeDisplay(remaining);
    }
  }

  if (activeBlank && !activeBlank.answered) {
    if (blankRect.right <= stageRect.left + 4) {
      handleTimeout();
    }
  }

  const rowWidth = row.scrollWidth || 0;
  if (rowPosition + rowWidth <= -stageRect.width * 0.6) {
    cancelAnimation();
    if (!roundActive) {
      scheduleNextRound(900);
    }
    return;
  }

  if (!animationActive) {
    animationId = null;
    return;
  }
  animationId = requestAnimationFrame(step);
}

function cancelAnimation() {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  animationActive = false;
  lastFrame = null;
}

function updateScoreboard() {
  scoreValue.textContent = String(score);
  streakValue.textContent = String(streak);
  bestValue.textContent = `Best ${bestStreak}`;
}

function updateSpeedDisplay() {
  speedValue.textContent = `${Math.round(speedMultiplier * 100)}%`;
}

function updateTimeDisplay(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    timeValue.textContent = value <= 0 ? "0.0" : value.toFixed(1);
  } else {
    timeValue.textContent = "--";
  }
}

function updateDifficultyNote() {
  difficultyNote.textContent = `Counting by ${currentSettings.step}s • about ${currentSettings.responseWindow.toFixed(
    1
  )}s to answer`;
}

function buildOptions(correct, step) {
  const options = new Set([correct]);
  const adjustments = [step, -step, step * 2, -step * 2, 1, -1, step + 1, -(step + 1)];
  let guard = 0;
  while (options.size < OPTION_COUNT && guard < 50) {
    const delta = adjustments[randomInt(0, adjustments.length - 1)];
    const candidate = correct + delta;
    if (candidate > 0) {
      options.add(candidate);
    }
    guard += 1;
  }
  while (options.size < OPTION_COUNT) {
    const candidate = correct + randomInt(-9, 9);
    if (candidate > 0) {
      options.add(candidate);
    }
  }
  return shuffle([...options]);
}

function randomPick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  const lower = Math.ceil(Math.min(min, max));
  const upper = Math.floor(Math.max(min, max));
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

updateDifficultyNote();
promptPanel.textContent = `Tap “Start Number Streak” to warm up the numbers, ${playerName}!`;
updateScoreboard();
updateSpeedDisplay();
updateTimeDisplay();
