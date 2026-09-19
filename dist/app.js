const clips = [
  ["Just Do It", "media/01-just-do-it.mp4"],
  ["How Winning Is Done", "media/02-how-winning-is-done.mp4"],
  ["Good", "media/03-good.mp4"],
  ["Protect Your Dream", "media/04-protect-your-dream.mp4"],
  ["Break Procrastination", "media/05-break-procrastination.mp4"],
  ["Two Minutes. Get Moving.", "media/06-two-minutes.mp4"],
  ["Your Value", "media/07-your-value.mp4"],
  ["As Bad as You Want to Breathe", "media/08-breathe.mp4"],
  ["Six Rules of Success", "media/09-six-rules.mp4"],
  ["Arnold’s Motivational Speech", "media/10-arnold-speech.mp4"],
  ["Fight Back", "media/11-fight-back.mp4"],
  ["You Need Clarity", "media/12-clarity.mp4"],
  ["Hard Work", "media/13-hard-work.mp4"],
  ["Keep Showing Up", "media/14-keep-showing-up.mp4"],
  ["Lone Wolf", "media/15-lone-wolf.mp4"],
  ["Fight Through It", "media/16-fight-through-it.mp4"],
  ["Put in the Work", "media/17-put-in-the-work.mp4"],
  ["Today Is the Day", "media/18-today-is-the-day.mp4"],
  ["Overcome Self-Doubt", "media/19-overcome-self-doubt.mp4"],
  ["What Is Your Why?", "media/20-what-is-your-why.mp4"],
  ["Focus", "media/21-focus.mp4"],
  ["Believe", "media/22-believe.mp4"],
  ["Time for War", "media/23-time-for-war.mp4"]
];

const mediaVersion = "mobile-h264-v1";

const players = [document.querySelector("#video-a"), document.querySelector("#video-b")];
const previousButton = document.querySelector("#previous");
const nextButton = document.querySelector("#next");
const startButton = document.querySelector("#start");
const retryButton = document.querySelector("#retry");
const errorBox = document.querySelector("#error");
const buffering = document.querySelector("#buffering");
const gestureZone = document.querySelector("#gesture-zone");
const timeReadout = document.querySelector("#time-readout");
const title = document.querySelector("#title");
const count = document.querySelector("#count");

let index = 0;
let active = 0;
let transitioning = false;
let hasStarted = false;
let userPaused = false;
let timeHideTimer = 0;

function clipIndex(value) {
  return (value + clips.length) % clips.length;
}

function updateLabel() {
  title.textContent = clips[index][0];
  count.textContent = `${index + 1} / ${clips.length}`;
  document.title = `${clips[index][0]} — Momentum`;
}

function activePlayer() {
  return players[active];
}

function formatSeconds(value, roundUp = false) {
  if (!Number.isFinite(value) || value < 0) return "0s";
  return `${roundUp ? Math.ceil(value) : Math.floor(value)}s`;
}

function updateTimeReadout() {
  const player = activePlayer();
  timeReadout.textContent = `${formatSeconds(player.currentTime)} / ${formatSeconds(player.duration, true)}`;
}

function showTimeReadout({ sticky = false } = {}) {
  window.clearTimeout(timeHideTimer);
  updateTimeReadout();
  timeReadout.classList.add("is-visible");

  if (!sticky) {
    timeHideTimer = window.setTimeout(() => {
      if (!activePlayer().paused) timeReadout.classList.remove("is-visible");
    }, 900);
  }
}

function updateGestureLabel() {
  gestureZone.setAttribute("aria-label", activePlayer().paused ? "Play video" : "Pause video");
}

function videoFrame() {
  const player = activePlayer();
  const stageWidth = document.documentElement.clientWidth;
  const stageHeight = document.documentElement.clientHeight;

  if (!player.videoWidth || !player.videoHeight) {
    return { left: 0, top: 0, width: stageWidth, height: stageHeight };
  }

  const scale = Math.min(stageWidth / player.videoWidth, stageHeight / player.videoHeight);
  const width = player.videoWidth * scale;
  const height = player.videoHeight * scale;
  return {
    left: (stageWidth - width) / 2,
    top: (stageHeight - height) / 2,
    width,
    height
  };
}

function positionGestureZone() {
  const frame = videoFrame();
  gestureZone.style.left = `${frame.left}px`;
  gestureZone.style.top = `${frame.top}px`;
  gestureZone.style.width = `${frame.width}px`;
  gestureZone.style.height = `${frame.height}px`;
}

function seekToPointer(clientX) {
  const player = activePlayer();
  const frame = videoFrame();
  if (!Number.isFinite(player.duration) || player.duration <= 0 || frame.width <= 0) return;

  const ratio = Math.min(1, Math.max(0, (clientX - frame.left) / frame.width));
  player.currentTime = player.duration * ratio;
  showTimeReadout({ sticky: true });
}

async function togglePlayback() {
  if (transitioning || !hasStarted) return;
  const player = activePlayer();

  if (player.paused) {
    try {
      await player.play();
      userPaused = false;
      updateGestureLabel();
      showTimeReadout();
    } catch {
      startButton.hidden = false;
    }
  } else {
    player.pause();
    userPaused = true;
    updateGestureLabel();
    showTimeReadout({ sticky: true });
  }
}

function setSource(player, targetIndex) {
  const source = clips[targetIndex][1];
  if (player.dataset.source !== source) {
    player.src = `${source}?v=${mediaVersion}`;
    player.dataset.source = source;
    player.load();
  }
}

function queueNext() {
  const standby = players[1 - active];
  setSource(standby, clipIndex(index + 1));
  standby.preload = "metadata";
}

function waitUntilPlayable(player) {
  if (player.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Video load timed out"));
    }, 45000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      player.removeEventListener("canplay", ready);
      player.removeEventListener("error", failed);
    };
    const ready = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error("Video failed to load")); };

    player.addEventListener("canplay", ready, { once: true });
    player.addEventListener("error", failed, { once: true });
  });
}

async function playCurrent({ userInitiated = false } = {}) {
  const player = players[active];
  setSource(player, index);
  player.muted = false;
  player.volume = 1;
  updateLabel();
  errorBox.hidden = true;
  buffering.classList.add("is-active");

  try {
    await waitUntilPlayable(player);
    await player.play();
    hasStarted = true;
    userPaused = false;
    startButton.hidden = true;
    player.classList.add("is-visible");
    updateGestureLabel();
    positionGestureZone();
    queueNext();
  } catch (error) {
    if (!userInitiated && error?.name === "NotAllowedError") {
      startButton.hidden = false;
    } else {
      errorBox.hidden = false;
    }
  } finally {
    buffering.classList.remove("is-active");
  }
}

async function move(direction) {
  if (transitioning) return;
  transitioning = true;

  const oldPlayer = players[active];
  const nextActive = 1 - active;
  const nextPlayer = players[nextActive];
  const target = clipIndex(index + direction);

  errorBox.hidden = true;
  startButton.hidden = true;
  buffering.classList.add("is-active");
  setSource(nextPlayer, target);
  nextPlayer.muted = false;
  nextPlayer.volume = 1;

  try {
    await waitUntilPlayable(nextPlayer);
    nextPlayer.currentTime = 0;
    await nextPlayer.play();
    nextPlayer.classList.add("is-visible");
    oldPlayer.classList.remove("is-visible");

    index = target;
    active = nextActive;
    hasStarted = true;
    userPaused = false;
    updateLabel();
    updateTimeReadout();
    updateGestureLabel();
    positionGestureZone();

    window.setTimeout(() => {
      oldPlayer.pause();
      queueNext();
    }, 360);
  } catch (error) {
    nextPlayer.pause();
    nextPlayer.classList.remove("is-visible");
    oldPlayer.classList.add("is-visible");
    if (error?.name === "NotAllowedError") startButton.hidden = false;
    else errorBox.hidden = false;
  } finally {
    buffering.classList.remove("is-active");
    transitioning = false;
  }
}

players.forEach((player) => {
  player.disablePictureInPicture = true;
  player.addEventListener("ended", () => {
    if (player === players[active]) move(1);
  });
  player.addEventListener("waiting", () => {
    if (player === players[active]) buffering.classList.add("is-active");
  });
  player.addEventListener("playing", () => buffering.classList.remove("is-active"));
  player.addEventListener("timeupdate", () => {
    if (player === activePlayer()) updateTimeReadout();
  });
  player.addEventListener("loadedmetadata", () => {
    if (player === activePlayer()) {
      updateTimeReadout();
      positionGestureZone();
    }
  });
});

function bindGesture(element, tapAction) {
  let gesture = null;

  element.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || transitioning || !hasStarted) return;
    gesture = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      wasPlaying: !activePlayer().paused,
      scrubbing: false
    };
    element.setPointerCapture(event.pointerId);
  });

  element.addEventListener("pointermove", (event) => {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;

    if (!gesture.scrubbing && Math.abs(deltaX) >= 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
      gesture.scrubbing = true;
      activePlayer().pause();
    }

    if (gesture.scrubbing) {
      event.preventDefault();
      seekToPointer(event.clientX);
    }
  });

  const finishGesture = async (event, cancelled = false) => {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const finished = gesture;
    gesture = null;

    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);

    if (finished.scrubbing) {
      if (finished.wasPlaying) {
        try {
          await activePlayer().play();
          userPaused = false;
          updateGestureLabel();
          showTimeReadout();
        } catch {
          startButton.hidden = false;
        }
      } else {
        userPaused = true;
        updateGestureLabel();
        showTimeReadout({ sticky: true });
      }
      return;
    }

    if (!cancelled) tapAction();
  };

  element.addEventListener("pointerup", (event) => finishGesture(event));
  element.addEventListener("pointercancel", (event) => finishGesture(event, true));
  element.addEventListener("click", (event) => {
    if (event.detail === 0) tapAction();
  });
}

bindGesture(previousButton, () => move(-1));
bindGesture(nextButton, () => move(1));
bindGesture(gestureZone, togglePlayback);
startButton.addEventListener("click", () => playCurrent({ userInitiated: true }));
retryButton.addEventListener("click", () => playCurrent({ userInitiated: true }));

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") move(-1);
  if (event.key === "ArrowRight") move(1);
  if (event.code === "Space") {
    event.preventDefault();
    togglePlayback();
  }
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && hasStarted && activePlayer().paused && !userPaused) {
    players[active].play().catch(() => { startButton.hidden = false; });
  }
});

window.addEventListener("resize", positionGestureZone);

setSource(players[0], index);
updateLabel();
playCurrent();
