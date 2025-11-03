// src/dom.js

// Main sections
export const uploadSection = document.getElementById('upload-section');
export const examSection = document.getElementById('exam-section');
export const resultSection = document.getElementById('result-section');

// Upload controls
export const file1Input = document.getElementById('file1');
export const file2Input = document.getElementById('file2');
export const file1Name = document.getElementById('file1-name');
export const file2Name = document.getElementById('file2-name');
export const startBtn = document.getElementById('start-btn');

// Exam controls
export const submitBtn = document.getElementById('submit-btn');
export const restartBtn = document.getElementById('restart-btn');
export const pauseBtn = document.getElementById('pause-btn');
export const abandonBtn = document.getElementById('abandon-btn');

// Timer settings
export const timerModeSelect = document.getElementById('timer-mode');
export const countdownMinutesInput = document.getElementById('countdown-minutes');

// History section
export const historyBtn = document.getElementById('history-btn');
export const historySection = document.getElementById('history-section');
export const historyDetailSection = document.getElementById('history-detail-section');
export const clearHistoryBtn = document.getElementById('clear-history-btn');
export const backToUploadBtn = document.getElementById('back-to-upload-btn');
export const backToHistoryBtn = document.getElementById('back-to-history-btn');
export const historyListEl = document.getElementById('history-list');

// Exam UI elements
export const totalQuestionsEl = document.getElementById('total-questions');
export const questionNumberEl = document.getElementById('question-number');
export const readingContentEl = document.getElementById('reading-content');
export const readingTitleEl = document.getElementById('reading-title');
export const passageNavEl = document.getElementById('passage-nav');
export const prevPassageBtn = document.getElementById('prev-passage-btn');
export const nextPassageBtn = document.getElementById('next-passage-btn');
export const questionContentEl = document.getElementById('question-content');
export const optionsContainer = document.getElementById('options-container');
export const prevBtn = document.getElementById('prev-btn');
export const nextBtn = document.getElementById('next-btn');
export const timerDisplayEl = document.getElementById('timer-display');

// Result detail UI elements
export function getResultDetailUI(prefix) {
    return {
        total: document.getElementById(`${prefix}-total`),
        answered: document.getElementById(`${prefix}-answered`),
        time: document.getElementById(`${prefix}-time`),
        answersList: document.getElementById(`${prefix}-answers-list`)
    };
}

// History detail UI elements
export const historyDetailDateEl = document.getElementById('history-detail-date');
export const historyDetailTitleEl = document.getElementById('history-detail-title');
export const historyReadingContentEl = document.getElementById('history-reading-content');
export const historyReadingTitleEl = document.getElementById('history-reading-title');
export const historyPassageNavEl = document.getElementById('history-passage-nav');
export const historyPrevPassageBtn = document.getElementById('history-prev-passage-btn');
export const historyNextPassageBtn = document.getElementById('history-next-passage-btn');
