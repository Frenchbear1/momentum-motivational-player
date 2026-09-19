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

const players = [document.querySelector("#video-a"), document.querySelector("#video-b")];
const previousButton = document.querySelector("#previous");
const nextButton = document.querySelector("#next");
const startButton = document.querySelector("#start");
const retryButton = document.querySelector("#retry");
const errorBox = document.querySelector("#error");
const buffering = document.querySelector("#buffering");
const title = document.querySelector("#title");
const count = document.querySelector("#count");

let index = 0;
let active = 0;
let transitioning = false;
let hasStarted = false;

function clipIndex(value) {
  return (value + clips.length) % clips.length;
}

function updateLabel() {
  title.textContent = clips[index][0];
  count.textContent = `${index + 1} / ${clips.length}`;
  document.title = `${clips[index][0]} — Momentum`;
}

function setSource(player, targetIndex) {
  const source = clips[targetIndex][1];
  if (player.dataset.source !== source) {
    player.src = source;
    player.dataset.source = source;
    player.load();
  }
}

function queueNext() {
  const standby = players[1 - active];
  setSource(standby, clipIndex(index + 1));
  standby.preload = "auto";
}

function waitUntilPlayable(player) {
  if (player.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Video load timed out"));
    }, 20000);

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
    startButton.hidden = true;
    player.classList.add("is-visible");
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
    updateLabel();

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
});

previousButton.addEventListener("click", () => move(-1));
nextButton.addEventListener("click", () => move(1));
startButton.addEventListener("click", () => playCurrent({ userInitiated: true }));
retryButton.addEventListener("click", () => playCurrent({ userInitiated: true }));

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") move(-1);
  if (event.key === "ArrowRight") move(1);
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && hasStarted && players[active].paused) {
    players[active].play().catch(() => { startButton.hidden = false; });
  }
});

setSource(players[0], index);
updateLabel();
playCurrent();
