"use strict";

const MANIFEST_URL = "data/samples.json";
const resultsRoot = document.querySelector("#results-root");
let activeAudio = null;

const playIcon = `
  <svg class="play-icon" viewBox="0 0 12 12" aria-hidden="true">
    <path d="M3 1.7v8.6L10 6z"></path>
  </svg>
  <svg class="pause-icon" viewBox="0 0 12 12" aria-hidden="true">
    <path d="M2.6 2h2.3v8H2.6zM7.1 2h2.3v8H7.1z"></path>
  </svg>`;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function titleCase(value) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function pauseAllExcept(exception) {
  document.querySelectorAll("audio.audio-element").forEach((audio) => {
    if (audio !== exception && !audio.paused) audio.pause();
  });
  activeAudio = exception;
}

function createPlayer(sample, kind) {
  const isEdited = kind === "edited";
  const label = isEdited ? "Edited result" : "Source audio";
  const path = isEdited ? sample.editedAudio : sample.sourceAudio;
  const player = element("div", `audio-player ${isEdited ? "edited" : "source"}`);

  const heading = element("div", "player-heading");
  heading.append(element("span", "player-label", label));
  const duration = element("span", "player-duration", "0:00");
  heading.append(duration);

  const controls = element("div", "player-controls");
  const button = element("button", "play-button");
  button.type = "button";
  button.innerHTML = playIcon;
  button.setAttribute("aria-label", `Play ${label} for ${titleCase(sample.transition)}`);

  const progressWrap = element("div", "progress-wrap");
  const range = element("input", "progress-range");
  range.type = "range";
  range.min = "0";
  range.max = "1000";
  range.step = "1";
  range.value = "0";
  range.setAttribute("aria-label", `Seek ${label} for ${titleCase(sample.transition)}`);
  range.style.setProperty("--progress", "0%");
  const currentTime = element("span", "player-time", "0:00");
  progressWrap.append(range, currentTime);
  controls.append(button, progressWrap);

  const audio = element("audio", "audio-element");
  audio.preload = "metadata";
  audio.src = path;

  const setPlaying = (playing) => {
    button.classList.toggle("is-playing", playing);
    button.setAttribute(
      "aria-label",
      `${playing ? "Pause" : "Play"} ${label} for ${titleCase(sample.transition)}`,
    );
  };

  const syncProgress = () => {
    const percent = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
    range.value = String(Math.round(percent * 10));
    range.style.setProperty("--progress", `${percent}%`);
    currentTime.textContent = formatTime(audio.currentTime);
  };

  button.addEventListener("click", async () => {
    if (audio.paused) {
      pauseAllExcept(audio);
      try {
        await audio.play();
      } catch (error) {
        setPlaying(false);
        player.classList.add("has-error");
        duration.textContent = "Unavailable";
        console.error(`Unable to play ${path}`, error);
      }
    } else {
      audio.pause();
    }
  });

  range.addEventListener("input", () => {
    if (!Number.isFinite(audio.duration)) return;
    audio.currentTime = (Number(range.value) / 1000) * audio.duration;
    syncProgress();
  });

  audio.addEventListener("loadedmetadata", () => {
    duration.textContent = formatTime(audio.duration);
  });
  audio.addEventListener("durationchange", () => {
    duration.textContent = formatTime(audio.duration);
  });
  audio.addEventListener("timeupdate", syncProgress);
  audio.addEventListener("play", () => {
    pauseAllExcept(audio);
    setPlaying(true);
  });
  audio.addEventListener("pause", () => setPlaying(false));
  audio.addEventListener("ended", () => {
    setPlaying(false);
    audio.currentTime = 0;
    syncProgress();
    if (activeAudio === audio) activeAudio = null;
  });
  audio.addEventListener("error", () => {
    setPlaying(false);
    player.classList.add("has-error");
    duration.textContent = "Unavailable";
  });

  player.append(heading, controls, audio);
  return player;
}

function createSampleCard(sample, index) {
  const card = element("article", "sample-card");
  card.setAttribute(
    "aria-label",
    `${titleCase(sample.sourceClass)} to ${titleCase(sample.targetClass)} example`,
  );

  const topLine = element("div", "card-topline");
  const transition = element("span", "transition-pill");
  transition.append(element("span", "", titleCase(sample.sourceClass)));
  const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  arrow.setAttribute("viewBox", "0 0 20 10");
  arrow.setAttribute("aria-hidden", "true");
  arrow.innerHTML = '<path d="M1 5h16M13 1l4 4-4 4"></path>';
  transition.append(arrow, element("span", "", titleCase(sample.targetClass)));
  topLine.append(transition, element("span", "sample-number", `Ex. ${String(index).padStart(2, "0")}`));

  const promptFlow = element("div", "prompt-flow");
  const sourcePrompt = element("div", "prompt-block source");
  sourcePrompt.append(
    element("span", "prompt-label", "Original prompt"),
    element("span", "prompt-text", sample.sourcePrompt),
  );
  const promptArrow = element("span", "prompt-arrow");
  promptArrow.setAttribute("aria-hidden", "true");
  promptArrow.innerHTML = `
    <svg viewBox="0 0 20 12"><path d="M1 6h16M13 2l4 4-4 4"></path></svg>`;
  const targetPrompt = element("div", "prompt-block target");
  targetPrompt.append(
    element("span", "prompt-label", "Target prompt"),
    element("span", "prompt-text", sample.targetPrompt),
  );
  promptFlow.append(sourcePrompt, promptArrow, targetPrompt);

  const comparison = element("div", "audio-comparison");
  comparison.append(createPlayer(sample, "source"), createPlayer(sample, "edited"));

  const details = element("details", "reference-details");
  details.append(
    element("summary", "", "Full source description — reference only"),
    element("p", "", sample.sourceFullDescription),
  );

  card.append(topLine, promptFlow, comparison, details);
  return card;
}

function createExperimentPanel(experiment) {
  const panel = element("section", "result-panel");
  panel.id = `panel-${experiment.id}`;
  panel.setAttribute("aria-labelledby", `${experiment.id}-title`);

  const header = element("header", "experiment-header");
  const headingBlock = element("div");
  const title = element("h3", "experiment-title", experiment.label);
  title.id = `${experiment.id}-title`;
  headingBlock.append(element("p", "experiment-eyebrow", experiment.eyebrow), title);
  header.append(headingBlock, element("p", "experiment-description", experiment.description));
  panel.append(header);

  experiment.classes.forEach((sourceClass, classIndex) => {
    const samples = experiment.samples.filter(
      (sample) => sample.sourceClass === sourceClass,
    );
    const group = element("section", "class-group");
    group.setAttribute("aria-labelledby", `${experiment.id}-${sourceClass}-heading`);

    const groupHeading = element("header", "group-heading");
    groupHeading.append(
      element("span", "group-number", String(classIndex + 1).padStart(2, "0")),
    );
    const heading = element("h4", "", titleCase(sourceClass));
    heading.id = `${experiment.id}-${sourceClass}-heading`;
    groupHeading.append(heading);
    groupHeading.append(
      element(
        "p",
        "",
        `Edited into ${samples.map((sample) => titleCase(sample.targetClass)).join(", ")}`,
      ),
    );

    const grid = element("div", "sample-grid");
    samples.forEach((sample, sampleIndex) => {
      grid.append(createSampleCard(sample, classIndex * 3 + sampleIndex + 1));
    });
    group.append(groupHeading, grid);
    panel.append(group);
  });

  return panel;
}

function validateManifest(data) {
  if (!data || data.selectionMode !== "fixed" || !Array.isArray(data.experiments)) {
    throw new Error("The sample manifest has an unexpected shape.");
  }
  if (data.experiments.length !== 2) {
    throw new Error("The sample manifest must contain two experiments.");
  }
  data.experiments.forEach((experiment) => {
    if (!Array.isArray(experiment.samples) || experiment.samples.length !== 12) {
      throw new Error(`${experiment.label || "Experiment"} must contain 12 examples.`);
    }
    const transitions = new Set(experiment.samples.map((sample) => sample.transition));
    if (transitions.size !== 12) {
      throw new Error(`${experiment.label} contains duplicate transitions.`);
    }
  });
}

async function initialize() {
  try {
    const response = await fetch(MANIFEST_URL);
    if (!response.ok) throw new Error(`Manifest request failed with ${response.status}`);
    const data = await response.json();
    validateManifest(data);

    const fragment = document.createDocumentFragment();
    data.experiments.forEach((experiment) => {
      fragment.append(createExperimentPanel(experiment));
    });
    resultsRoot.replaceChildren(fragment);
    resultsRoot.setAttribute("aria-busy", "false");
  } catch (error) {
    console.error("Unable to initialize the listening demo", error);
    const state = element("div", "error-state");
    state.setAttribute("role", "alert");
    state.append(
      element("strong", "", "Audio examples could not be loaded"),
      element(
        "span",
        "",
        "Start a local HTTP server from the demo directory and refresh this page.",
      ),
    );
    resultsRoot.replaceChildren(state);
    resultsRoot.setAttribute("aria-busy", "false");
  }
}

initialize();
