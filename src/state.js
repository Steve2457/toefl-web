// src/state.js

// Global state
export let examData = {
    readingPassages: [], // [{content: "...", startQuestion: 1, endQuestion: 10}, ...]
    questions: [], // [{number: 1, content: "...", options: [...], passageIndex: 0}, ...]
    filenames: [], // Store uploaded filenames
    answers: {},
    answerTimestamps: {}, // Record timestamp for each question {questionNumber: timestamp}
    startTime: null,
    currentQuestionIndex: 0,
    timerMode: 'normal', // 'normal' or 'countdown'
    countdownMinutes: 60, // Countdown minutes
    paused: false,
    pauseStartTime: null
};

export let timerInterval = null;
export let currentHistoryEntry = null;
export let currentHistoryPassageIndex = 0;

export function setTimerInterval(interval) {
    timerInterval = interval;
}

export function setCurrentHistoryEntry(entry) {
    currentHistoryEntry = entry;
}

export function setCurrentHistoryPassageIndex(index) {
    currentHistoryPassageIndex = index;
}

// Reset exam data
export function resetExamData() {
    examData.readingPassages = [];
    examData.questions = [];
    examData.filenames = [];
    examData.answers = {};
    examData.answerTimestamps = {};
    examData.startTime = null;
    examData.currentQuestionIndex = 0;
    examData.timerMode = 'normal';
    examData.countdownMinutes = 60;
    examData.paused = false;
    examData.pauseStartTime = null;
}
