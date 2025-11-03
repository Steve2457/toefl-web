// src/main.js
import { examData, resetExamData, currentHistoryPassageIndex, setCurrentHistoryPassageIndex, currentHistoryEntry } from './state.js';
import * as dom from './dom.js';
import { parseWordFile, parseReadingAndQuestions } from './parser.js';
import { startTimer, stopTimer, togglePause } from './timer.js';
import { initializeExam, displayQuestion, displayResultDetails, displayHistoryContent } from './ui.js';
import { saveHistory, showHistory, clearHistory } from './history.js';

/**
 * Check if the start button can be enabled
 */
function checkStartButton() {
    dom.startBtn.disabled = !dom.file1Input.files.length;
}

/**
 * Display exam results
 */
function showResults() {
    dom.examSection.classList.add('hidden');
    dom.resultSection.classList.remove('hidden');

    const totalQuestions = examData.questions.length;
    const answeredCount = Object.keys(examData.answers).length;
    
    let elapsed = Date.now() - examData.startTime;
    if (examData.paused && examData.pauseStartTime) {
        elapsed -= (Date.now() - examData.pauseStartTime);
    }
    
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    const timeString = 
        String(hours).padStart(2, '0') + ':' +
        String(minutes).padStart(2, '0') + ':' +
        String(seconds).padStart(2, '0');

    const resultData = {
        total: totalQuestions,
        answered: answeredCount,
        time: timeString,
        questions: JSON.parse(JSON.stringify(examData.questions)),
        readingPassages: JSON.parse(JSON.stringify(examData.readingPassages)),
        filenames: JSON.parse(JSON.stringify(examData.filenames)),
        answers: JSON.parse(JSON.stringify(examData.answers)),
        answerTimestamps: JSON.parse(JSON.stringify(examData.answerTimestamps)),
        date: new Date().toISOString()
    };

    displayResultDetails('result', resultData);
    saveHistory(resultData);
}

/**
 * Start the exam
 */
async function startExam() {
    try {
        const files = [];
        if (dom.file1Input.files.length > 0) files.push(dom.file1Input.files[0]);
        if (dom.file2Input.files.length > 0) files.push(dom.file2Input.files[0]);

        if (files.length === 0) {
            alert('Please upload at least one document.');
            return;
        }

        resetExamData();
        examData.filenames = files.map(f => f.name);
        examData.timerMode = document.querySelector('input[name="timer-mode"]:checked')?.value || 'normal';
        examData.countdownMinutes = parseInt(document.getElementById('countdown-minutes')?.value || 60);

        let questionNumberOffset = 0;
        for (let i = 0; i < files.length; i++) {
            const text = await parseWordFile(files[i]);
            const parsed = parseReadingAndQuestions(text, questionNumberOffset);
            
            if (parsed.readingContent && parsed.questions.length > 0) {
                examData.readingPassages.push({
                    content: parsed.readingContent,
                    startQuestion: questionNumberOffset + 1,
                    endQuestion: questionNumberOffset + parsed.questions.length,
                    index: examData.readingPassages.length
                });
                
                parsed.questions.forEach(q => {
                    q.passageIndex = examData.readingPassages.length - 1;
                    examData.questions.push(q);
                });
                
                questionNumberOffset += parsed.questions.length;
            }
        }

        dom.uploadSection.classList.add('hidden');
        dom.examSection.classList.remove('hidden');

        initializeExam();
        startTimer();
    } catch (error) {
        console.error('Failed to parse document:', error);
        alert('Failed to parse the document. Please ensure the file format is correct.');
    }
}

/**
 * Return to home and reset state
 */
function returnToHome() {
    stopTimer();
    resetExamData();
    
    // Reset UI
    dom.readingTitleEl.textContent = 'Reading';
    dom.passageNavEl.classList.add('hidden');

    // Reset file inputs
    dom.file1Input.value = '';
    dom.file2Input.value = '';
    dom.file1Name.textContent = '';
    dom.file2Name.textContent = '';
    dom.startBtn.disabled = true;

    // Switch pages
    dom.resultSection.classList.add('hidden');
    dom.examSection.classList.add('hidden');
    dom.historySection.classList.add('hidden');
    dom.historyDetailSection.classList.add('hidden');
    dom.uploadSection.classList.remove('hidden');

    // Reset pause button icon
    dom.pauseBtn.innerHTML = '&#10074;&#10074;';
    dom.pauseBtn.title = 'Pause';
    dom.pauseBtn.classList.remove('paused');
}

/**
 * Initialize event listeners
 */
function initializeEventListeners() {
    dom.file1Input.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            dom.file1Name.textContent = e.target.files[0].name;
            checkStartButton();
        }
    });

    dom.file2Input.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            dom.file2Name.textContent = e.target.files[0].name;
        }
        checkStartButton();
    });

    document.querySelectorAll('input[name="timer-mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const countdownSettings = document.getElementById('countdown-settings');
            countdownSettings.style.display = e.target.value === 'countdown' ? 'block' : 'none';
        });
    });

    dom.startBtn.addEventListener('click', startExam);

    dom.prevBtn.addEventListener('click', () => {
        if (examData.currentQuestionIndex > 0) {
            displayQuestion(examData.currentQuestionIndex - 1);
        }
    });

    dom.nextBtn.addEventListener('click', () => {
        if (examData.currentQuestionIndex < examData.questions.length - 1) {
            displayQuestion(examData.currentQuestionIndex + 1);
        }
    });

    dom.prevPassageBtn.addEventListener('click', () => {
        const currentQuestion = examData.questions[examData.currentQuestionIndex];
        const currentPassageIndex = currentQuestion.passageIndex;
        if (currentPassageIndex > 0) {
            const firstQuestionIndex = examData.questions.findIndex(q => q.passageIndex === currentPassageIndex - 1);
            if (firstQuestionIndex >= 0) displayQuestion(firstQuestionIndex);
        }
    });

    dom.nextPassageBtn.addEventListener('click', () => {
        const currentQuestion = examData.questions[examData.currentQuestionIndex];
        const currentPassageIndex = currentQuestion.passageIndex;
        if (currentPassageIndex < examData.readingPassages.length - 1) {
            const firstQuestionIndex = examData.questions.findIndex(q => q.passageIndex === currentPassageIndex + 1);
            if (firstQuestionIndex >= 0) displayQuestion(firstQuestionIndex);
        }
    });

    dom.pauseBtn.addEventListener('click', togglePause);

    dom.submitBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to submit? You cannot continue after submitting.')) {
            stopTimer();
            showResults();
        }
    });

    dom.restartBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to restart? Your current progress will be lost.')) {
            returnToHome();
        }
    });

    dom.abandonBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to abandon this attempt and return to the home page?')) {
            returnToHome();
        }
    });

    // History event listeners
    dom.historyBtn.addEventListener('click', showHistory);
    dom.clearHistoryBtn.addEventListener('click', clearHistory);

    dom.backToUploadBtn.addEventListener('click', () => {
        dom.historySection.classList.add('hidden');
        dom.uploadSection.classList.remove('hidden');
    });

    dom.backToHistoryBtn.addEventListener('click', () => {
        dom.historyDetailSection.classList.add('hidden');
        dom.historySection.classList.remove('hidden');
    });
    
    dom.historyPrevPassageBtn.addEventListener('click', () => {
        if (currentHistoryPassageIndex > 0) {
            setCurrentHistoryPassageIndex(currentHistoryPassageIndex - 1);
            displayHistoryContent();
        }
    });
    
    dom.historyNextPassageBtn.addEventListener('click', () => {
        if (currentHistoryEntry && currentHistoryPassageIndex < currentHistoryEntry.readingPassages.length - 1) {
            setCurrentHistoryPassageIndex(currentHistoryPassageIndex + 1);
            displayHistoryContent();
        }
    });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    checkStartButton();
});
