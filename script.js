"use strict";

const audio = document.getElementById("audio");
const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");

const buttonA = document.getElementById("buttonA");
const buttonB = document.getElementById("buttonB");
const resetButton = document.getElementById("resetButton");

const playPauseButton = document.getElementById("playPauseButton");
const backButton = document.getElementById("backButton");
const forwardButton = document.getElementById("forwardButton");

const currentTimeDisplay = document.getElementById("currentTime");
const durationDisplay = document.getElementById("duration");
const timeADisplay = document.getElementById("timeA");
const timeBDisplay = document.getElementById("timeB");
const loopStatus = document.getElementById("loopStatus");

const seekBar = document.getElementById("seekBar");

const pauseButtons = document.querySelectorAll(".pauseButton");

const repeatButtons = document.querySelectorAll(".repeatButton");

const playerStatus = document.getElementById("playerStatus");

let repeatLimit = Number(localStorage.getItem("abPlayerRepeatLimit")) || 0;

let repeatCount = 0;
let loopPause = Number(localStorage.getItem("abPlayerPause")) || 0;
let waitingForLoop = false;
let pointA = null;
let pointB = null;
let loopEnabled = false;
let audioFileUrl = null;

function formatTime(seconds) {
    if (!Number.isFinite(seconds)) {
        return "00:00.0";
    }

    const safeSeconds = Math.max(0, seconds);

    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;

    const formattedMinutes = String(minutes).padStart(2, "0");
    const formattedSeconds = remainingSeconds
        .toFixed(1)
        .padStart(4, "0");

    return `${formattedMinutes}:${formattedSeconds}`;
}

function updateLoopStatus() {
    if (loopEnabled && pointA !== null && pointB !== null) {
        loopStatus.textContent =
            `Se repetă intervalul ${formatTime(pointA)} – ${formatTime(pointB)}`;

        loopStatus.classList.add("active");
    } else {
        loopStatus.textContent = "Repetarea A–B este oprită";
        loopStatus.classList.remove("active");
    }
    updatePlayerStatus();
}

function resetAB() {
    pointA = null;
    pointB = null;
    loopEnabled = false;
    repeatCount = 0;

    timeADisplay.textContent = "—";
    timeBDisplay.textContent = "—";

    updateLoopStatus();
    updateMarkerButtons();
}

function fileIsLoaded() {
    return Boolean(audio.src);
}

function updateMarkerButtons() {
    buttonA.classList.toggle("marker-active", pointA !== null);
    buttonB.classList.toggle("marker-active", pointB !== null);
}

function updatePlayerStatus() {
    const speed = audio.playbackRate.toFixed(2);

    const pauseText =
        loopPause === 0
            ? "0s"
            : `${loopPause}s`;

    const repeatText =
        repeatLimit === 0
            ? "∞"
            : `${repeatLimit}×`;

    if (
        loopEnabled &&
        pointA !== null &&
        pointB !== null
    ) {
        playerStatus.textContent =
            `Loop activ · ${repeatText} · Pauză ${pauseText} · Viteză ${speed}×`;

        playerStatus.classList.add("loop-active");
    } else {
        playerStatus.textContent =
            `Viteză ${speed}× · Pauză ${pauseText} · Repetări ${repeatText}`;

        playerStatus.classList.remove("loop-active");
    }
}

fileInput.addEventListener("change", function () {
    const selectedFile = fileInput.files[0];

    if (!selectedFile) {
        return;
    }

    if (audioFileUrl) {
        URL.revokeObjectURL(audioFileUrl);
    }

    audioFileUrl = URL.createObjectURL(selectedFile);

    audio.src = audioFileUrl;
    fileName.textContent = selectedFile.name;

    resetAB();

    audio.load();
    audio.play();

    playPauseButton.textContent = "Pause";
});

buttonA.addEventListener("click", function () {
    if (!fileIsLoaded()) {
        alert("Deschide mai întâi un fișier audio.");
        return;
    }

    pointA = audio.currentTime;

    if (pointB !== null && pointB <= pointA) {
        pointB = null;
        loopEnabled = false;
        timeBDisplay.textContent = "—";
    }

    timeADisplay.textContent = formatTime(pointA);
    updateMarkerButtons();

    updateLoopStatus();
});

buttonB.addEventListener("click", function () {
    if (!fileIsLoaded()) {
        alert("Deschide mai întâi un fișier audio.");
        return;
    }

    if (pointA === null) {
        alert("Setează mai întâi punctul A.");
        return;
    }

    const selectedPointB = audio.currentTime;

    if (selectedPointB <= pointA) {
        alert("Punctul B trebuie să fie după punctul A.");
        return;
    }

    pointB = selectedPointB;
    loopEnabled = true;
    repeatCount = 0;

    timeBDisplay.textContent = formatTime(pointB);
    updateMarkerButtons();

    updateLoopStatus();
});

resetButton.addEventListener("click", resetAB);

playPauseButton.addEventListener("click", function () {
    if (!fileIsLoaded()) {
        alert("Deschide mai întâi un fișier audio.");
        return;
    }

    if (audio.paused) {
        audio.play();
    } else {
        audio.pause();
    }
});

backButton.addEventListener("click", function () {
    if (!fileIsLoaded()) {
        return;
    }

    audio.currentTime = Math.max(0, audio.currentTime - 5);
});

forwardButton.addEventListener("click", function () {
    if (!fileIsLoaded()) {
        return;
    }

    audio.currentTime = Math.min(
        audio.duration || Infinity,
        audio.currentTime + 5
    );
});

audio.addEventListener("play", function () {
    playPauseButton.textContent = "Pause";
});

audio.addEventListener("pause", function () {
    playPauseButton.textContent = "Play";
});

audio.addEventListener("loadedmetadata", function () {
    durationDisplay.textContent = formatTime(audio.duration);

    seekBar.min = 0;
    seekBar.max = audio.duration;
    seekBar.value = 0;
});

audio.addEventListener("timeupdate", function () {
    currentTimeDisplay.textContent = formatTime(audio.currentTime);
    seekBar.value = audio.currentTime;

        if (
            loopEnabled &&
            pointA !== null &&
            pointB !== null &&
            audio.currentTime >= pointB &&
            !waitingForLoop
        ) {
            repeatCount++;

            // 0 înseamnă repetare infinită
            if (
                repeatLimit > 0 &&
                repeatCount >= repeatLimit
            ) {
                const endPoint = pointB;

                loopEnabled = false;
                waitingForLoop = false;

                pointA = null;
                pointB = null;
                repeatCount = 0;

                timeADisplay.textContent = "—";
                timeBDisplay.textContent = "—";

                audio.currentTime = endPoint;
                audio.play();

                updateLoopStatus();
                updateMarkerButtons();

                return;
            }

            waitingForLoop = true;

            audio.pause();

            setTimeout(function () {
                if (
                    loopEnabled &&
                    pointA !== null &&
                    pointB !== null
                ) {
                    audio.currentTime = pointA;
                    audio.play();
                }

                waitingForLoop = false;
            }, loopPause * 1000);
        }
});

audio.addEventListener("ended", function () {
    playPauseButton.textContent = "Play";
});

seekBar.addEventListener("input", function () {
    if (!fileIsLoaded()) {
        return;
    }

    audio.currentTime = Number(seekBar.value);
});

const aMinus = document.getElementById("aMinus");
const aPlus = document.getElementById("aPlus");
const bMinus = document.getElementById("bMinus");
const bPlus = document.getElementById("bPlus");

const speedButtons = document.querySelectorAll(".speedButton");

function updateMarkerDisplays() {
    timeADisplay.textContent =
        pointA === null ? "—" : formatTime(pointA);

    timeBDisplay.textContent =
        pointB === null ? "—" : formatTime(pointB);

        updateMarkerButtons();
        updateLoopStatus();
}

aMinus.addEventListener("click", function () {
    if (pointA === null) {
        return;
    }

    pointA = Math.max(0, pointA - 0.2);

    updateMarkerDisplays();
});

aPlus.addEventListener("click", function () {
    if (pointA === null) {
        return;
    }

    let newA = pointA + 0.2;

    if (pointB !== null) {
        newA = Math.min(newA, pointB - 0.05);
    }

    pointA = newA;

    updateMarkerDisplays();
});

bMinus.addEventListener("click", function () {
    if (pointB === null) {
        return;
    }

    let newB = pointB - 0.2;

    if (pointA !== null) {
        newB = Math.max(newB, pointA + 0.05);
    }

    pointB = newB;

    updateMarkerDisplays();
});

bPlus.addEventListener("click", function () {
    if (pointB === null) {
        return;
    }

    pointB = Math.min(
        audio.duration || Infinity,
        pointB + 0.2
    );

    updateMarkerDisplays();
});

speedButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        const speed = Number(button.dataset.speed);

        audio.playbackRate = speed;
        updatePlayerStatus();

        localStorage.setItem("abPlayerSpeed", speed);

        speedButtons.forEach(function (otherButton) {
            otherButton.classList.remove("active-speed");
        });

        button.classList.add("active-speed");
    });
});

const savedSpeed =
    Number(localStorage.getItem("abPlayerSpeed")) || 1;

audio.playbackRate = savedSpeed;

speedButtons.forEach(function (button) {
    if (Number(button.dataset.speed) === savedSpeed) {
        button.classList.add("active-speed");
    }
});

document.addEventListener("keydown", function (event) {
    // Nu executăm comenzile dacă utilizatorul scrie într-un câmp.
    const activeElement = document.activeElement;

    if (
        activeElement &&
        (
            activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA"
        )
    ) {
        return;
    }

    // Împiedică repetarea comenzii când tasta este ținută apăsată.
    if (event.repeat) {
        return;
    }

    const key = event.key.toLowerCase();

    if (key === "a") {
        buttonA.click();
        return;
    }

    if (key === "v") {
        buttonB.click();
        return;
    }

    if (key === "r") {
        resetButton.click();
        return;
    }

    if (event.code === "Space") {
        event.preventDefault();
        playPauseButton.click();
        return;
    }

    if (event.code === "ArrowLeft") {
        event.preventDefault();
        backButton.click();
        return;
    }

    if (event.code === "ArrowRight") {
        event.preventDefault();
        forwardButton.click();
    }
});

pauseButtons.forEach(function (button) {
    const buttonPause = Number(button.dataset.pause);

    if (buttonPause === loopPause) {
        button.classList.add("active-pause");
    }

    button.addEventListener("click", function () {
        loopPause = Number(button.dataset.pause);
        updatePlayerStatus();

        localStorage.setItem("abPlayerPause", loopPause);

        pauseButtons.forEach(function (otherButton) {
            otherButton.classList.remove("active-pause");
        });

        button.classList.add("active-pause");
    });
});

repeatButtons.forEach(function (button) {
    const value = Number(button.dataset.repeat);

    if (value === repeatLimit) {
        button.classList.add("active-repeat");
    }

    button.addEventListener("click", function () {
        repeatLimit = Number(button.dataset.repeat);
        updatePlayerStatus();

        localStorage.setItem(
            "abPlayerRepeatLimit",
            repeatLimit
        );

        repeatCount = 0;

        repeatButtons.forEach(function (otherButton) {
            otherButton.classList.remove("active-repeat");
        });

        button.classList.add("active-repeat");
    });
});

updatePlayerStatus();
