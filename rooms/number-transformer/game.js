const playerName = "ShuLaw";
const OPTION_COUNT = 5;

const DIFFICULTY_SETTINGS = {
  easy: {
    label: "Easy",
    range: [6, 90],
    targets: [{ place: 10, label: "Nearest 10" }],
    timeLimit: 9,
    note: "Nearest tens • numbers up to 90 • 9s to transform",
  },
  medium: {
    label: "Medium",
    range: [18, 480],
    targets: [
      { place: 10, label: "Nearest 10" },
      { place: 100, label: "Nearest 100" },
    ],
    timeLimit: 8.2,
    note: "Nearest tens or hundreds • up to 480 • ~8s to respond",
  },
  hard: {
    label: "Hard",
    range: [45, 980],
    targets: [
      { place: 10, label: "Nearest 10" },
      { place: 50, label: "Nearest 50" },
      { place: 100, label: "Nearest 100" },
    ],
    timeLimit: 7.2,
    note: "Mix of tens, 50s & hundreds • up to 980 • ~7s to respond",
  },
};

const transformStage = document.getElementById("transformStage");
const sourceValue = document.getElementById("sourceValue");
const markerLabel = document.getElementById("markerLabel");
const targetValue = document.getElementById("targetValue");
const arrowLabel = document.getElementById("arrowLabel");
const lowerLabel = document.getElementById("lowerLabel");
const upperLabel = document.getElementById("upperLabel");
const targetMarkerLabel = document.getElementById("targetMarkerLabel");
const sourceMarker = document.getElementById("sourceMarker");
const targetMarker = document.getElementById("targetMarker");
const lineHighlight = document.getElementById("lineHighlight");
const timerFill = document.getElementById("timerFill");
const feedbackPanel = document.getElementById("feedbackPanel");
const choicesContainer = document.getElementById("choices");
const startButton = document.getElementById("startButton");
const difficultyButtons = document.querySelectorAll(".difficulty-button");
const difficultyNote = document.getElementById("difficultyNote");
const scoreValue = document.getElementById("scoreValue");
const streakValue = document.getElementById("streakValue");
const bestValue = document.getElementById("bestValue");
const accuracyValue = document.getElementById("accuracyValue");
const timeValue = document.getElementById("timeValue");

let currentDifficulty = "easy";
let currentSettings = DIFFICULTY_SETTINGS[currentDifficulty];
let activeTimeLimit = currentSettings.timeLimit;

let currentPrompt = null;
let roundActive = false;
let timerHandle = null;
let roundDelayHandle = null;
let lastTickSecond = Infinity;

let score = 0;
let streak = 0;
let bestStreak = 0;
let totalRounds = 0;
let correctRounds = 0;

const successPhrases = [
  "Electric change-up, {name}! {start} becomes {target}.",
  "Transformer champ move, {name}! {target} is the friendliest fit.",
  "Star rounding, {name}! {start} zooms to {target}.",
  "Crystal clear pick, {name}! {target} wins the distance race.",
  "Number magic unlocked, {name}! {start} ≈ {target}.",
];

const coachingPhrases = [
  "Check which friendly number is closer, {name}.",
  "Look at the distance to each side, {name}!",
  "Think about which end is only a tiny hop away, {name}.",
  "Trace the number line glow to find the winner, {name}!",
  "You&apos;ve got this pattern, {name}—focus on the highlighted place!",
];

const timeoutPhrases = [
  "Time warp! Keep your eyes on the glow zone, {name}.",
  "The timer faded, but your focus can brighten the next one, {name}.",
  "That one drifted by. Let&apos;s spark up the next transform, {name}!",
];

const SOUND_LIBRARY = {
  success: [
    { freq: 523, duration: 0.18, type: "square", gain: 0.28 },
    { freq: 659, duration: 0.2, type: "triangle", gain: 0.24, offset: 0.12 },
    { freq: 784, duration: 0.26, type: "square", gain: 0.22, offset: 0.24 },
  ],
  fail: [
    { freq: 220, glide: 180, duration: 0.32, type: "sawtooth", gain: 0.24 },
    { freq: 180, glide: 150, duration: 0.4, type: "triangle", gain: 0.18, offset: 0.18 },
  ],
  tick: [{ freq: 920, duration: 0.08, type: "square", gain: 0.16 }],
  start: [
    { freq: 392, duration: 0.16, type: "triangle", gain: 0.22 },
    { freq: 523, duration: 0.18, type: "square", gain: 0.2, offset: 0.12 },
  ],
};

const BGM_BEAT_DURATION = 0.42;
const BGM_LOOP_BEATS = 8;
const BGM_SEQUENCE = [
  { beat: 0, freq: 392, duration: 0.28, type: "square", gain: 0.16 },
  { beat: 0.5, freq: 523, duration: 0.22, type: "triangle", gain: 0.15 },
  { beat: 1, freq: 659, duration: 0.24, type: "square", gain: 0.15 },
  { beat: 2, freq: 494, duration: 0.24, type: "triangle", gain: 0.14 },
  { beat: 2.5, freq: 587, duration: 0.26, type: "square", gain: 0.14 },
  { beat: 3, freq: 784, duration: 0.28, type: "square", gain: 0.16 },
  { beat: 4, freq: 523, duration: 0.22, type: "triangle", gain: 0.14 },
  { beat: 4.5, freq: 659, duration: 0.26, type: "square", gain: 0.15 },
  { beat: 5.5, freq: 587, duration: 0.24, type: "triangle", gain: 0.13 },
  { beat: 6, freq: 698, duration: 0.3, type: "square", gain: 0.15 },
  { beat: 7, freq: 659, duration: 0.28, type: "triangle", gain: 0.14 },
];

const BGM_BASS_SEQUENCE = [
  { beat: 0, freq: 147, duration: 0.54, type: "sawtooth", gain: 0.12 },
  { beat: 2, freq: 196, duration: 0.54, type: "sawtooth", gain: 0.12 },
  { beat: 4, freq: 131, duration: 0.54, type: "sawtooth", gain: 0.12 },
  { beat: 6, freq: 175, duration: 0.54, type: "sawtooth", gain: 0.12 },
];

let audioContext = null;
let audioReady = false;
let masterGain = null;
let sfxGain = null;
let bgmGain = null;
let backgroundInterval = null;
let backgroundNextTime = 0;

startButton.addEventListener("click", () => {
  void unlockAudio();
  startButton.disabled = true;
  startButton.textContent = "Loading...";
  resetSession();
  playSound("start");
  startRound();
  setTimeout(() => {
    startButton.disabled = false;
    startButton.textContent = "Restart Transforming";
  }, 700);
});

difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    void unlockAudio();
    const selected = button.dataset.difficulty;
    if (selected === currentDifficulty) return;

    currentDifficulty = selected;
    currentSettings = DIFFICULTY_SETTINGS[currentDifficulty];
    activeTimeLimit = currentSettings.timeLimit;
    difficultyButtons.forEach((btn) => {
      btn.classList.toggle("active", btn === button);
    });
    difficultyNote.textContent = currentSettings.note;

    score = 0;
    streak = 0;
    bestStreak = 0;
    totalRounds = 0;
    correctRounds = 0;
    updateScoreboard();
    feedbackPanel.textContent = `Difficulty switched! Tap start when you\'re ready, ${playerName}.`;

    if (roundActive) {
      cancelAnimationFrame(timerHandle);
      timerHandle = null;
      clearTimeout(roundDelayHandle);
      roundDelayHandle = null;
      roundActive = false;
    }
  });
});

window.addEventListener("blur", () => {
  pauseBackgroundMusic();
});

window.addEventListener("focus", () => {
  if (audioReady) {
    startBackgroundMusic();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseBackgroundMusic();
  } else if (audioReady) {
    startBackgroundMusic();
  }
});

function resetSession() {
  cancelAnimationFrame(timerHandle);
  timerHandle = null;
  clearTimeout(roundDelayHandle);
  roundDelayHandle = null;
  roundActive = false;
  currentPrompt = null;
  score = 0;
  streak = 0;
  bestStreak = 0;
  totalRounds = 0;
  correctRounds = 0;
  updateScoreboard();
  setTimeDisplay(currentSettings.timeLimit);
  feedbackPanel.textContent = `Let\'s morph some numbers, ${playerName}!`;
  transformStage.classList.remove(
    "transform-stage--celebrate",
    "transform-stage--fail",
    "transform-stage--reveal"
  );
  targetValue.textContent = "?";
  targetMarkerLabel.textContent = "?";
}

function startRound() {
  clearTimeout(roundDelayHandle);
  roundDelayHandle = null;
  cancelAnimationFrame(timerHandle);
  timerHandle = null;

  roundActive = true;
  lastTickSecond = Infinity;
  transformStage.classList.remove(
    "transform-stage--celebrate",
    "transform-stage--fail",
    "transform-stage--reveal"
  );

  currentPrompt = createPrompt();
  activeTimeLimit = currentSettings.timeLimit;

  renderPrompt(currentPrompt);
  renderChoices(currentPrompt.options);
  feedbackPanel.textContent = `Which friendly value does ${currentPrompt.number} become, ${playerName}?`;

  setTimeDisplay(activeTimeLimit);
  startTimer(activeTimeLimit);
}

function createPrompt() {
  const [min, max] = currentSettings.range;
  const number = randomInt(min, max);
  const targetInfo = sample(currentSettings.targets);
  const place = targetInfo.place;
  const lower = Math.floor(number / place) * place;
  const upper = lower + place;
  const distanceDown = number - lower;
  const distanceUp = upper - number;
  const target = distanceUp < distanceDown ? upper : lower;
  const options = generateOptions({
    number,
    lower,
    upper,
    target,
    place,
    min,
    max,
  });

  return {
    number,
    lower,
    upper,
    distanceDown,
    distanceUp,
    target,
    place,
    label: targetInfo.label,
    options,
  };
}

function renderPrompt(prompt) {
  sourceValue.textContent = prompt.number;
  markerLabel.textContent = prompt.number;
  targetValue.textContent = "?";
  targetMarkerLabel.textContent = "?";
  arrowLabel.textContent = prompt.label;
  lowerLabel.textContent = prompt.lower;
  upperLabel.textContent = prompt.upper;

  const ratio = prompt.upper === prompt.lower ? 0 : (prompt.number - prompt.lower) / (prompt.upper - prompt.lower);
  const basePercent = 10 + ratio * 80;
  sourceMarker.style.left = `${basePercent}%`;
  const targetPercent = prompt.target === prompt.lower ? 10 : 90;
  targetMarker.style.left = `${targetPercent}%`;

  if (prompt.target === prompt.lower) {
    const widthPercent = Math.max(2, ratio * 80);
    lineHighlight.style.left = `10%`;
    lineHighlight.style.width = `${widthPercent}%`;
  } else {
    const widthPercent = Math.max(2, (1 - ratio) * 80);
    lineHighlight.style.left = `${basePercent}%`;
    lineHighlight.style.width = `${widthPercent}%`;
  }
}

function renderChoices(options) {
  choicesContainer.innerHTML = "";
  options.forEach((value) => {
    const button = document.createElement("button");
    button.className = "choice-button";
    button.type = "button";
    button.dataset.value = String(value);
    button.textContent = value.toString();
    button.addEventListener("click", () => handleChoice(button));
    choicesContainer.appendChild(button);
  });
}

function handleChoice(button) {
  if (!roundActive || !currentPrompt) return;
  void unlockAudio();
  const value = Number(button.dataset.value);
  const correct = value === currentPrompt.target;
  revealAnswer(correct, button, false);
}

function revealAnswer(correct, button, timedOut) {
  if (!currentPrompt) return;
  roundActive = false;
  cancelAnimationFrame(timerHandle);
  timerHandle = null;

  const buttons = Array.from(choicesContainer.querySelectorAll(".choice-button"));
  buttons.forEach((btn) => {
    btn.disabled = true;
    const btnValue = Number(btn.dataset.value);
    if (btnValue === currentPrompt.target) {
      btn.classList.add("choice-button--correct");
    }
  });

  if (button && !correct) {
    button.classList.add("choice-button--wrong");
  }

  transformStage.classList.remove("transform-stage--fail", "transform-stage--celebrate");
  transformStage.classList.add("transform-stage--reveal");
  targetValue.textContent = currentPrompt.target;
  targetMarkerLabel.textContent = currentPrompt.target;

  const explanation = buildExplanation(currentPrompt);

  if (correct && !timedOut) {
    score += 10;
    streak += 1;
    bestStreak = Math.max(bestStreak, streak);
    correctRounds += 1;
    const message = formatPhrase(sample(successPhrases), currentPrompt);
    feedbackPanel.innerHTML = `${message}<br /><span class="coach">${explanation}</span>`;
    transformStage.classList.add("transform-stage--celebrate");
    playSound("success");
    const delay = 1800;
    scheduleNextRound(delay);
  } else {
    streak = 0;
    const message = timedOut
      ? sample(timeoutPhrases)
      : sample(coachingPhrases);
    feedbackPanel.innerHTML = `${formatPhrase(message, currentPrompt)}<br /><span class="coach">${explanation}</span>`;
    transformStage.classList.add("transform-stage--fail");
    playSound("fail");
    const delay = 4200;
    scheduleNextRound(delay);
  }

  totalRounds += 1;
  updateScoreboard();
}

function scheduleNextRound(delay) {
  clearTimeout(roundDelayHandle);
  roundDelayHandle = setTimeout(() => {
    startRound();
  }, delay);
}

function buildExplanation(prompt) {
  const { number, lower, upper, target, place, distanceDown, distanceUp } = prompt;
  const placeLabel = formatPlaceLabel(place);

  if (distanceDown === distanceUp) {
    return `${number} is exactly halfway between ${lower} and ${upper}, so we round up to ${target}.`;
  }

  if (target === lower) {
    return `${number} is only ${distanceDown} away from ${lower} but ${distanceUp} away from ${upper}, so the nearest ${placeLabel} is ${target}.`;
  }

  return `${number} is ${distanceUp} away from ${upper} but ${distanceDown} away from ${lower}, so ${target} is the closest ${placeLabel}.`;
}

function formatPhrase(phrase, prompt) {
  return phrase
    .replace("{name}", playerName)
    .replace("{start}", prompt.number.toString())
    .replace("{target}", prompt.target.toString());
}

function formatPlaceLabel(place) {
  if (place === 10) return "10";
  if (place === 50) return "50";
  if (place === 100) return "100";
  if (place === 1000) return "1000";
  return place.toString();
}

function startTimer(limit) {
  const start = performance.now();
  const tick = (now) => {
    const elapsed = (now - start) / 1000;
    const remaining = Math.max(0, limit - elapsed);
    setTimeDisplay(remaining);
    if (!roundActive) {
      return;
    }
    const tickSecond = Math.ceil(remaining);
    if (tickSecond <= 3 && tickSecond < lastTickSecond) {
      playSound("tick");
      lastTickSecond = tickSecond;
    }
    if (remaining <= 0.01) {
      revealAnswer(false, null, true);
      return;
    }
    timerHandle = requestAnimationFrame(tick);
  };

  timerHandle = requestAnimationFrame(tick);
}

function setTimeDisplay(remaining) {
  const limit = activeTimeLimit || currentSettings.timeLimit;
  const clamped = Math.max(0, Math.min(remaining, limit));
  timeValue.textContent = clamped.toFixed(1);
  const ratio = limit === 0 ? 0 : clamped / limit;
  timerFill.style.transform = `scaleX(${ratio})`;
}

function updateScoreboard() {
  scoreValue.textContent = score.toString();
  streakValue.textContent = streak.toString();
  bestValue.textContent = `Best ${bestStreak}`;
  if (totalRounds === 0) {
    accuracyValue.textContent = "--%";
  } else {
    const accuracy = Math.round((correctRounds / totalRounds) * 100);
    accuracyValue.textContent = `${accuracy}%`;
  }
}

function generateOptions({ number, lower, upper, target, place, min, max }) {
  const options = new Set([target, lower, upper]);
  let offset = place;
  const minMultiple = Math.max(0, Math.floor(min / place) * place - place * 2);
  const maxMultiple = Math.ceil(max / place) * place + place * 2;

  while (options.size < OPTION_COUNT) {
    options.add(target + offset);
    if (options.size >= OPTION_COUNT) break;
    if (target - offset >= 0) {
      options.add(target - offset);
    }
    offset += place;
    if (offset > place * 6) break;
  }

  const optionsArray = Array.from(options).filter((value) => value >= 0);

  while (optionsArray.length < OPTION_COUNT) {
    const multiple = randomInt(minMultiple / place, maxMultiple / place) * place;
    if (!optionsArray.includes(multiple)) {
      optionsArray.push(multiple);
    }
  }

  return shuffle(optionsArray).slice(0, OPTION_COUNT);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sample(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function shuffle(array) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function unlockAudio() {
  if (audioReady) {
    if (audioContext && audioContext.state === "suspended") {
      void audioContext.resume();
    }
    return Promise.resolve();
  }

  if (!audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.8;
    sfxGain = audioContext.createGain();
    sfxGain.gain.value = 0.7;
    bgmGain = audioContext.createGain();
    bgmGain.gain.value = 0;

    sfxGain.connect(masterGain);
    bgmGain.connect(masterGain);
    masterGain.connect(audioContext.destination);
  }

  if (audioContext.state === "suspended") {
    return audioContext.resume().then(() => {
      audioReady = true;
      startBackgroundMusic();
    });
  }

  audioReady = true;
  startBackgroundMusic();
  return Promise.resolve();
}

function playSound(name) {
  if (!audioReady || !audioContext || !SOUND_LIBRARY[name]) return;
  const now = audioContext.currentTime;
  SOUND_LIBRARY[name].forEach((note) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = note.type || "sine";
    osc.frequency.setValueAtTime(note.freq, now + (note.offset || 0));
    if (note.glide) {
      osc.frequency.linearRampToValueAtTime(note.glide, now + (note.offset || 0) + note.duration);
    }
    gain.gain.setValueAtTime(note.gain ?? 0.2, now + (note.offset || 0));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (note.offset || 0) + note.duration);
    osc.connect(gain).connect(sfxGain);
    osc.start(now + (note.offset || 0));
    osc.stop(now + (note.offset || 0) + note.duration + 0.05);
  });
}

function scheduleBackgroundLoop(startTime) {
  BGM_SEQUENCE.forEach((note) => {
    playBackgroundNote(note, startTime + note.beat * BGM_BEAT_DURATION);
  });
  BGM_BASS_SEQUENCE.forEach((note) => {
    playBackgroundNote(note, startTime + note.beat * BGM_BEAT_DURATION);
  });
}

function playBackgroundNote(note, time) {
  if (!audioContext || !bgmGain) return;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = note.type || "square";
  osc.frequency.setValueAtTime(note.freq, time);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(note.gain ?? 0.1, time + 0.02);
  gain.gain.setTargetAtTime(0.0001, time + (note.duration ?? 0.25), 0.3);
  osc.connect(gain).connect(bgmGain);
  osc.start(time);
  osc.stop(time + (note.duration ?? 0.4) + 0.4);
}

function startBackgroundMusic() {
  if (!audioContext || !bgmGain) return;
  bgmGain.gain.cancelScheduledValues(audioContext.currentTime);
  bgmGain.gain.setTargetAtTime(0.28, audioContext.currentTime, 0.6);

  if (backgroundInterval) return;
  const now = audioContext.currentTime + 0.12;
  backgroundNextTime = now;
  scheduleBackgroundLoop(backgroundNextTime);
  backgroundInterval = setInterval(() => {
    if (!audioContext) return;
    backgroundNextTime += BGM_BEAT_DURATION * BGM_LOOP_BEATS;
    scheduleBackgroundLoop(backgroundNextTime);
  }, BGM_BEAT_DURATION * BGM_LOOP_BEATS * 1000);
}

function pauseBackgroundMusic() {
  if (!audioContext || !bgmGain) return;
  bgmGain.gain.cancelScheduledValues(audioContext.currentTime);
  bgmGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.3);
  if (backgroundInterval) {
    clearInterval(backgroundInterval);
    backgroundInterval = null;
  }
}

// Ensure timer bar is initialised for the default difficulty.
setTimeDisplay(currentSettings.timeLimit);
updateScoreboard();
