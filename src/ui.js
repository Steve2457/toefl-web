// src/ui.js
import { examData, currentHistoryEntry, currentHistoryPassageIndex, setCurrentHistoryPassageIndex } from './state.js';
import * as dom from './dom.js';
import { getCurrentTimerString } from './timer.js';

/**
 * Get the passage index for a given question number
 * @param {number} questionNumber - Question number
 * @returns {number} - Passage index
 */
function getPassageIndexForQuestion(questionNumber) {
    for (let i = 0; i < examData.readingPassages.length; i++) {
        const passage = examData.readingPassages[i];
        if (questionNumber >= passage.startQuestion && questionNumber <= passage.endQuestion) {
            return i;
        }
    }
    return examData.readingPassages.length > 0 ? 0 : -1;
}

/**
 * Update the state of previous/next buttons
 */
export function updateNavigationButtons() {
    dom.prevBtn.disabled = examData.currentQuestionIndex === 0;
    dom.nextBtn.disabled = examData.currentQuestionIndex === examData.questions.length - 1;
}

/**
 * Display the question at the specified index
 * @param {number} index - Index of the question in the questions array
 */
export function displayQuestion(index) {
    if (index < 0 || index >= examData.questions.length) {
        return;
    }

    examData.currentQuestionIndex = index;
    const question = examData.questions[index];

    dom.questionNumberEl.textContent = question.number;

    const passageIndex = question.passageIndex !== undefined 
        ? question.passageIndex 
        : getPassageIndexForQuestion(question.number);
    
    if (passageIndex >= 0 && passageIndex < examData.readingPassages.length) {
        dom.readingContentEl.innerHTML = examData.readingPassages[passageIndex].content;
        
        if (examData.readingPassages.length > 1) {
            dom.readingTitleEl.textContent = `Reading ${passageIndex + 1} / ${examData.readingPassages.length}`;
            dom.passageNavEl.classList.remove('hidden');
            dom.prevPassageBtn.disabled = passageIndex === 0;
            dom.nextPassageBtn.disabled = passageIndex === examData.readingPassages.length - 1;
        } else {
            dom.readingTitleEl.textContent = 'Reading';
        }
    }

    if (question.content || question.imageHtml) {
        let finalContent = (question.content || '') + (question.imageHtml || '');
        dom.questionContentEl.innerHTML = finalContent;
        dom.questionContentEl.style.display = 'block';
    } else {
        dom.questionContentEl.style.display = 'none';
    }

    dom.optionsContainer.innerHTML = '';
    question.options.forEach(option => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option-item';
        if (examData.answers[question.number] === option.label) {
            optionDiv.classList.add('selected');
        }

        optionDiv.innerHTML = `
            <span class="option-label">${option.label}.</span>
            <span>${option.text}</span>
        `;

        optionDiv.addEventListener('click', () => {
            dom.optionsContainer.querySelectorAll('.option-item').forEach(item => {
                item.classList.remove('selected');
            });
            optionDiv.classList.add('selected');
            examData.answers[question.number] = option.label;
            examData.answerTimestamps[question.number] = getCurrentTimerString();
        });

        dom.optionsContainer.appendChild(optionDiv);
    });

    updateNavigationButtons();
}

/**
 * Initialize the exam interface
 */
export function initializeExam() {
    dom.totalQuestionsEl.textContent = examData.questions.length;
    displayQuestion(0);
    updateNavigationButtons();
}

/**
 * Display result details
 * @param {string} sectionPrefix - 'result' or 'history-detail'
 * @param {object} data - Object containing result data
 */
export function displayResultDetails(sectionPrefix, data) {
    const isHistory = sectionPrefix === 'history-detail';
    const ui = dom.getResultDetailUI(sectionPrefix);

    ui.total.textContent = data.total;
    ui.answered.textContent = data.answered;
    ui.time.textContent = data.time;

    if (isHistory) {
        dom.historyDetailDateEl.textContent = new Date(data.date).toLocaleString();
        const title = data.customTitle || (data.filenames || []).join(', ') || 'Practice';
        dom.historyDetailTitleEl.textContent = title;
    }

    ui.answersList.innerHTML = '';

    const questionsToShow = isHistory
        ? data.questions.filter(q => q.passageIndex === currentHistoryPassageIndex)
        : data.questions;

    questionsToShow.forEach(question => {
        const answerItem = document.createElement('div');
        answerItem.className = 'answer-item';

        const isAnswered = data.answers.hasOwnProperty(question.number);
        const selectedAnswer = data.answers[question.number] || 'N/A';
        const answerTime = data.answerTimestamps[question.number] || 'N/A';

        let optionsHtml = '<div class="options-container">';
        question.options.forEach(option => {
            let optionClass = 'option-item';
            if (option.label === selectedAnswer) {
                optionClass += ' selected';
            }
            optionsHtml += `
                <div class="${optionClass}">
                    <span class="option-label">${option.label}.</span>
                    <span>${option.text}</span>
                </div>
            `;
        });
        optionsHtml += '</div>';

        answerItem.innerHTML = `
            <div class="answer-header">
                <span class="answer-question-number">Question ${question.number}</span>
                <span class="answer-status ${isAnswered ? 'answered' : 'unanswered'}">${isAnswered ? 'Answered' : 'Unanswered'}</span>
            </div>
            <div class="answer-question">${question.content}${question.imageHtml || ''}</div>
            <div class="answer-selected"><strong>Your answer: </strong>${selectedAnswer} (Answered at: ${answerTime})</div>
            ${optionsHtml}
        `;

        ui.answersList.appendChild(answerItem);
    });
}

/**
 * Display content for the history detail page (passage and questions)
 */
export function displayHistoryContent() {
    if (!currentHistoryEntry) return;

    displayResultDetails('history-detail', currentHistoryEntry);

    const passages = currentHistoryEntry.readingPassages || [];
    if (passages.length > 0 && passages[currentHistoryPassageIndex]) {
        dom.historyReadingContentEl.innerHTML = passages[currentHistoryPassageIndex].content;
        
        if (passages.length > 1) {
            dom.historyReadingTitleEl.textContent = `Reading ${currentHistoryPassageIndex + 1} / ${passages.length}`;
            dom.historyPassageNavEl.classList.remove('hidden');
            dom.historyPrevPassageBtn.disabled = currentHistoryPassageIndex === 0;
            dom.historyNextPassageBtn.disabled = currentHistoryPassageIndex === passages.length - 1;
        } else {
            dom.historyReadingTitleEl.textContent = 'Reading';
            dom.historyPassageNavEl.classList.add('hidden');
        }
    } else {
        dom.historyReadingContentEl.innerHTML = '<p>Reading passage not available.</p>';
        dom.historyReadingTitleEl.textContent = 'Reading';
        dom.historyPassageNavEl.classList.add('hidden');
    }
}
