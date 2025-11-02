// Global state
let examData = {
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

let timerInterval = null;
let currentHistoryEntry = null;
let currentHistoryPassageIndex = 0;

// DOM elements
const uploadSection = document.getElementById('upload-section');
const examSection = document.getElementById('exam-section');
const resultSection = document.getElementById('result-section');
const file1Input = document.getElementById('file1');
const file2Input = document.getElementById('file2');
const file1Name = document.getElementById('file1-name');
const file2Name = document.getElementById('file2-name');
const startBtn = document.getElementById('start-btn');
const submitBtn = document.getElementById('submit-btn');
const restartBtn = document.getElementById('restart-btn');
const timerModeSelect = document.getElementById('timer-mode');
const countdownMinutesInput = document.getElementById('countdown-minutes');
const pauseBtn = document.getElementById('pause-btn');

// History DOM elements
const historyBtn = document.getElementById('history-btn');
const historySection = document.getElementById('history-section');
const historyDetailSection = document.getElementById('history-detail-section');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const backToUploadBtn = document.getElementById('back-to-upload-btn');
const backToHistoryBtn = document.getElementById('back-to-history-btn');


// File upload handling
file1Input.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        file1Name.textContent = e.target.files[0].name;
        checkStartButton();
    }
});

file2Input.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        file2Name.textContent = e.target.files[0].name;
    }
    checkStartButton();
});

// History button event listeners
historyBtn.addEventListener('click', showHistory);
backToUploadBtn.addEventListener('click', () => {
    historySection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
});
clearHistoryBtn.addEventListener('click', clearHistory);
backToHistoryBtn.addEventListener('click', () => {
    historyDetailSection.classList.add('hidden');
    historySection.classList.remove('hidden');
});

function checkStartButton() {
    startBtn.disabled = !file1Input.files.length;
}

// Timer mode toggle
document.querySelectorAll('input[name="timer-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const countdownSettings = document.getElementById('countdown-settings');
        if (e.target.value === 'countdown') {
            countdownSettings.style.display = 'block';
        } else {
            countdownSettings.style.display = 'none';
        }
    });
});

// Start exam
startBtn.addEventListener('click', async () => {
    try {
        const files = [];
        if (file1Input.files.length > 0) {
            files.push(file1Input.files[0]);
        }
        if (file2Input.files.length > 0) {
            files.push(file2Input.files[0]);
        }

        if (files.length === 0) {
            alert('Please upload at least one document.');
            return;
        }

        examData.filenames = files.map(f => f.name); // Save filenames

        // Get timer settings
        const timerMode = document.querySelector('input[name="timer-mode"]:checked')?.value || 'normal';
        const countdownMinutes = parseInt(document.getElementById('countdown-minutes')?.value || 60);

        // Parse each document
        examData.readingPassages = [];
        examData.questions = [];
        examData.answers = {};
        examData.answerTimestamps = {}; // Reset timestamps
        examData.currentQuestionIndex = 0;
        examData.timerMode = timerMode; // Save timer mode
        examData.countdownMinutes = countdownMinutes; // Save countdown minutes
        examData.paused = false;
        examData.pauseStartTime = null;
        
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

        // Show exam section
        uploadSection.classList.add('hidden');
        examSection.classList.remove('hidden');

        // Initialize exam UI
        initializeExam();
        startTimer();
    } catch (error) {
        console.error('Failed to parse document:', error);
        alert('Failed to parse the document. Please ensure the file format is correct.');
    }
});

// Parse Word document
async function parseWordFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    // Use HTML conversion to support images
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value;
}

function parseReadingAndQuestions(htmlString, questionNumberOffset = 0) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const allParagraphs = Array.from(doc.body.children);

    let readingContentHtml = '';
    let questionsHtml = [];
    let splitIndex = -1;

    // Find the boundary between reading and questions
    // Strategy: find the first paragraph starting with a question number (e.g., "1.")
    for (let i = 0; i < allParagraphs.length; i++) {
        const p = allParagraphs[i];
        const text = p.textContent.trim();
        if (/^\s*1[\.\)、]/.test(text)) {
            splitIndex = i;
            break;
        }
    }

    if (splitIndex !== -1) {
        readingContentHtml = allParagraphs.slice(0, splitIndex).map(p => p.outerHTML).join('');
        questionsHtml = allParagraphs.slice(splitIndex);
    } else {
        // If no split point is found, treat everything as reading content
        readingContentHtml = htmlString;
    }

    const questions = parseQuestions(questionsHtml, questionNumberOffset);

    return {
        readingContent: readingContentHtml,
        questions: questions
    };
}

function parseQuestions(paragraphs, questionNumberOffset = 0) {
    if (!paragraphs || paragraphs.length === 0) {
        return [];
    }

    const questions = [];
    let currentQuestionBlock = [];
    let questionNumber = questionNumberOffset + 1;

    for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        const text = p.textContent.trim();
        const isNewQuestion = /^\s*(\d+)[\.\)、]/.test(text);

        if (isNewQuestion && currentQuestionBlock.length > 0) {
            // Parse the previous question block
            const parsed = parseSingleQuestion(currentQuestionBlock, questionNumber - 1);
            if (parsed) {
                questions.push(parsed);
            }
            currentQuestionBlock = [];
            questionNumber++;
        }
        currentQuestionBlock.push(p);
    }

    // Parse the last question block
    if (currentQuestionBlock.length > 0) {
        const parsed = parseSingleQuestion(currentQuestionBlock, questionNumber -1);
        if (parsed) {
            questions.push(parsed);
        }
    }
    
    // Renumber questions to ensure they are sequential
    return questions.map((q, index) => {
        q.number = questionNumberOffset + index + 1;
        return q;
    });
}

function parseSingleQuestion(paragraphs, number) {
    let content = '';
    let imageHtml = '';
    const options = [];
    let optionsStarted = false;
    
    paragraphs.forEach(p => {
        const text = p.textContent.trim();
        const optionMatch = text.match(/^([A-F])[\.\)、]\s*(.*)/);

        if (optionMatch) {
            optionsStarted = true;
            // Use innerHTML and remove the label part to get full option content, preserving formatting
            const optionTextHtml = p.innerHTML.replace(/^\s*[A-F][\.\)、]\s*/, '').trim();
            options.push({
                label: optionMatch[1],
                text: optionTextHtml
            });
        } else {
            if (!optionsStarted) {
                // If options haven't started, this paragraph is part of the question content
                if (p.querySelector('img')) {
                    imageHtml += p.outerHTML;
                } else {
                    content += p.outerHTML;
                }
            }
            // Note: After options have started, we ignore paragraphs that don't match the option format.
        }
    });

    // If the question has an image and no options were parsed, auto-generate four empty options
    // This is common for sentence insertion or chart questions
    if (imageHtml && options.length === 0) {
        ['A', 'B', 'C', 'D'].forEach(label => {
            options.push({ label: label, text: '' });
        });
    }

    return {
        number: number,
        content: content.trim(),
        imageHtml: imageHtml,
        options: options
    };
}

// Initialize exam UI
function initializeExam() {
    // Display total question count
    document.getElementById('total-questions').textContent = examData.questions.length;
    
    // Debug: Log all question data
    console.log('All questions data:', examData.questions);
    examData.questions.forEach((q, idx) => {
        console.log(`Question ${idx} (Q${q.number}): "${q.content.substring(0, 50)}..."`);
    });
    
    // Display the first question (which will also show the corresponding passage)
    displayQuestion(0);
    
    // Initialize button states
    updateNavigationButtons();
}

// Get the passage index for a given question number
function getPassageIndexForQuestion(questionNumber) {
    for (let i = 0; i < examData.readingPassages.length; i++) {
        const passage = examData.readingPassages[i];
        if (questionNumber >= passage.startQuestion && questionNumber <= passage.endQuestion) {
            return i;
        }
    }
    // If not found, return the first one
    return examData.readingPassages.length > 0 ? 0 : -1;
}

// Display a question
function displayQuestion(index) {
    if (index < 0 || index >= examData.questions.length) {
        return;
    }

    examData.currentQuestionIndex = index;
    const question = examData.questions[index];

    // Update question number display
    document.getElementById('question-number').textContent = question.number;

    // Show the corresponding reading passage
    const passageIndex = question.passageIndex !== undefined 
        ? question.passageIndex 
        : getPassageIndexForQuestion(question.number);
    
    if (passageIndex >= 0 && passageIndex < examData.readingPassages.length) {
        const readingContentEl = document.getElementById('reading-content');
        readingContentEl.innerHTML = examData.readingPassages[passageIndex].content; // Use HTML directly
        
        // Update reading title to show which passage is active
        const readingTitle = document.getElementById('reading-title');
        if (examData.readingPassages.length > 1) {
            readingTitle.textContent = `Reading ${passageIndex + 1} / ${examData.readingPassages.length}`;
            
            // Show passage navigation buttons
            const passageNav = document.getElementById('passage-nav');
            passageNav.classList.remove('hidden');
            
            // Update button states
            const prevPassageBtn = document.getElementById('prev-passage-btn');
            const nextPassageBtn = document.getElementById('next-passage-btn');
            prevPassageBtn.disabled = passageIndex === 0;
            nextPassageBtn.disabled = passageIndex === examData.readingPassages.length - 1;
        } else {
            readingTitle.textContent = 'Reading';
        }
    }

    // Display question content (preserving line breaks)
    const questionContentEl = document.getElementById('question-content');
    if (question.content || question.imageHtml) {
        let finalContent = '';
        if (question.content) {
            finalContent += question.content; // Already HTML
        }
        if (question.imageHtml) {
            finalContent += question.imageHtml; // Add image HTML
        }
        questionContentEl.innerHTML = finalContent;
        questionContentEl.style.display = 'block';
    } else {
        questionContentEl.style.display = 'none';
    }

    // Display options
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';

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
            // Remove selection from other options
            optionsContainer.querySelectorAll('.option-item').forEach(item => {
                item.classList.remove('selected');
            });
            
            // Select the current option
            optionDiv.classList.add('selected');
            examData.answers[question.number] = option.label;
            examData.answerTimestamps[question.number] = getCurrentTimerString(); // Record timestamp from the timer
        });

        optionsContainer.appendChild(optionDiv);
    });

    updateNavigationButtons();
}

// Update navigation button states
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    prevBtn.disabled = examData.currentQuestionIndex === 0;
    nextBtn.disabled = examData.currentQuestionIndex === examData.questions.length - 1;
}

// Previous question
document.getElementById('prev-btn').addEventListener('click', () => {
    if (examData.currentQuestionIndex > 0) {
        displayQuestion(examData.currentQuestionIndex - 1);
    }
});

// Next question
document.getElementById('next-btn').addEventListener('click', () => {
    if (examData.currentQuestionIndex < examData.questions.length - 1) {
        displayQuestion(examData.currentQuestionIndex + 1);
    }
});

// Previous passage
document.getElementById('prev-passage-btn').addEventListener('click', () => {
    const currentQuestion = examData.questions[examData.currentQuestionIndex];
    const currentPassageIndex = currentQuestion.passageIndex;
    
    if (currentPassageIndex > 0) {
        // Jump to the first question of the previous passage
        const prevPassage = examData.readingPassages[currentPassageIndex - 1];
        const firstQuestionIndex = examData.questions.findIndex(q => q.passageIndex === currentPassageIndex - 1);
        if (firstQuestionIndex >= 0) {
            displayQuestion(firstQuestionIndex);
        }
    }
});

// Next passage
document.getElementById('next-passage-btn').addEventListener('click', () => {
    const currentQuestion = examData.questions[examData.currentQuestionIndex];
    const currentPassageIndex = currentQuestion.passageIndex;
    
    if (currentPassageIndex < examData.readingPassages.length - 1) {
        // Jump to the first question of the next passage
        const nextPassage = examData.readingPassages[currentPassageIndex + 1];
        const firstQuestionIndex = examData.questions.findIndex(q => q.passageIndex === currentPassageIndex + 1);
        if (firstQuestionIndex >= 0) {
            displayQuestion(firstQuestionIndex);
        }
    }
});

// Timer
function startTimer() {
    examData.startTime = Date.now();
    examData.paused = false;
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer();
}

function getCurrentTimerString() {
    if (!examData.startTime) return '00:00:00';
    
    if (examData.timerMode === 'countdown') {
        const totalMilliseconds = examData.countdownMinutes * 60 * 1000;
        const elapsed = examData.paused 
            ? examData.pauseStartTime - examData.startTime
            : Date.now() - examData.startTime;
        const remaining = totalMilliseconds - elapsed;
        
        const isTimeout = remaining < 0;
        const displayTime = isTimeout ? Math.abs(remaining) : remaining;

        const hours = Math.floor(displayTime / 3600000);
        const minutes = Math.floor((displayTime % 3600000) / 60000);
        const seconds = Math.floor((displayTime % 60000) / 1000);
        
        return (isTimeout ? '-' : '') +
            String(hours).padStart(2, '0') + ':' +
            String(minutes).padStart(2, '0') + ':' +
            String(seconds).padStart(2, '0');
    } else {
        const elapsed = examData.paused
            ? examData.pauseStartTime - examData.startTime
            : Date.now() - examData.startTime;
        const hours = Math.floor(elapsed / 3600000);
        const minutes = Math.floor((elapsed % 3600000) / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);

        return String(hours).padStart(2, '0') + ':' +
            String(minutes).padStart(2, '0') + ':' +
            String(seconds).padStart(2, '0');
    }
}

function updateTimer() {
    if (!examData.startTime) return;
    if (examData.paused) return; // Don't update if paused

    const timerDisplayEl = document.getElementById('timer-display');
    const timeString = getCurrentTimerString();
    timerDisplayEl.textContent = timeString;

    // Change color based on remaining time (countdown mode only)
    if (examData.timerMode === 'countdown') {
        const totalMilliseconds = examData.countdownMinutes * 60 * 1000;
        const elapsed = Date.now() - examData.startTime;
        const remaining = totalMilliseconds - elapsed;

        if (remaining < 0) {
            timerDisplayEl.style.color = '#dc3545'; // Red on timeout
        } else if (remaining < 60000) {
            timerDisplayEl.style.color = '#ff6b6b'; // Orange-red for less than 1 min
        } else if (remaining < 300000) {
            timerDisplayEl.style.color = '#ffc107'; // Yellow for less than 5 mins
        } else {
            timerDisplayEl.style.color = '#333'; // Normal
        }
    } else {
        timerDisplayEl.style.color = '#333'; // Restore default color
    }
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function togglePause() {
    const pauseBtn = document.getElementById('pause-btn');
    
    if (examData.paused) {
        // Resume timer
        examData.paused = false;
        pauseBtn.textContent = 'Pause';
        pauseBtn.classList.remove('paused');
        // Adjust startTime to account for the paused duration
        if (examData.pauseStartTime) {
            const pausedDuration = Date.now() - examData.pauseStartTime;
            examData.startTime += pausedDuration;
        }
    } else {
        // Pause timer
        examData.paused = true;
        examData.pauseStartTime = Date.now();
        pauseBtn.textContent = 'Resume';
        pauseBtn.classList.add('paused');
    }
}

// Pause button event listener
document.getElementById('pause-btn').addEventListener('click', togglePause);

// Submit exam
submitBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to submit? You cannot continue after submitting.')) {
        stopTimer();
        showResults();
    }
});

// Show results
function showResults() {
    examSection.classList.add('hidden');
    resultSection.classList.remove('hidden');

    const totalQuestions = examData.questions.length;
    const answeredCount = Object.keys(examData.answers).length;
    
    // Calculate actual time spent (accounting for pauses)
    let elapsed = Date.now() - examData.startTime;
    if (examData.paused && examData.pauseStartTime) {
        // If still paused, subtract the time from when pause began to now
        elapsed -= (Date.now() - examData.pauseStartTime);
    }
    
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    const timeString = 
        String(hours).padStart(2, '0') + ':' +
        String(minutes).padStart(2, '0') + ':' +
        String(seconds).padStart(2, '0');

    // Create a deep copy of the exam data to prevent reference issues
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

    // Display results in the UI
    displayResultDetails('result', resultData);

    // Save to history
    saveHistory(resultData);
}

// Display result details in a given section (either 'result' or 'history-detail')
function displayResultDetails(sectionPrefix, data) {
    const isHistory = sectionPrefix === 'history-detail';

    // Display summary
    document.getElementById(`${sectionPrefix}-total`).textContent = data.total;
    document.getElementById(`${sectionPrefix}-answered`).textContent = data.answered;
    document.getElementById(`${sectionPrefix}-time`).textContent = data.time;

    if (isHistory) {
        document.getElementById('history-detail-date').textContent = new Date(data.date).toLocaleString();
        const title = data.customTitle || (data.filenames || []).join(', ') || 'Practice';
        document.getElementById('history-detail-title').textContent = title;
    }

    // Display questions and answers
    const answersList = document.getElementById(`${sectionPrefix}-answers-list`);
    answersList.innerHTML = '';

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

        answersList.appendChild(answerItem);
    });
}


// History functions
function getHistory() {
    const history = localStorage.getItem('toeflPracticeHistory');
    return history ? JSON.parse(history) : [];
}

function saveHistory(resultData) {
    const history = getHistory();
    const historyEntry = {
        id: Date.now(),
        ...resultData
    };
    history.unshift(historyEntry); // Add to the beginning
    localStorage.setItem('toeflPracticeHistory', JSON.stringify(history));
}

function showHistory() {
    uploadSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    examSection.classList.add('hidden');
    historySection.classList.remove('hidden');

    const history = getHistory();
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';

    if (history.length === 0) {
        historyList.innerHTML = '<p>No history found.</p>';
        return;
    }

    history.forEach(entry => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        const title = entry.customTitle || (entry.filenames || []).join(', ') || 'Practice';

        historyItem.innerHTML = `
            <div class="history-item-main">
                <div class="history-item-title">
                    <span class="history-title-text">${title}</span>
                    <input type="text" class="history-title-input" value="${title}" style="display: none;">
                </div>
                <div class="history-item-details">
                    <span>${new Date(entry.date).toLocaleString()}</span>
                    <span>${entry.answered} / ${entry.total} answered</span>
                    <span>Time: ${entry.time}</span>
                </div>
            </div>
            <div class="history-item-actions">
                <button class="btn btn-secondary btn-small btn-edit">Edit</button>
                <button class="btn btn-primary btn-small btn-save" style="display: none;">Save</button>
                <button class="btn btn-secondary btn-small btn-view">View</button>
            </div>
        `;

        const titleText = historyItem.querySelector('.history-title-text');
        const titleInput = historyItem.querySelector('.history-title-input');
        const editBtn = historyItem.querySelector('.btn-edit');
        const saveBtn = historyItem.querySelector('.btn-save');
        const viewBtn = historyItem.querySelector('.btn-view');

        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            titleText.style.display = 'none';
            titleInput.style.display = 'block';
            titleInput.focus();
            editBtn.style.display = 'none';
            saveBtn.style.display = 'block';
            viewBtn.style.display = 'none';
        });

        const saveTitle = () => {
            const newTitle = titleInput.value.trim();
            if (newTitle) {
                updateHistoryEntryTitle(entry.id, newTitle);
                titleText.textContent = newTitle;
            }
            titleText.style.display = 'inline';
            titleInput.style.display = 'none';
            editBtn.style.display = 'inline-block';
            saveBtn.style.display = 'none';
            viewBtn.style.display = 'inline-block';
        };

        saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            saveTitle();
        });

        titleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveTitle();
            } else if (e.key === 'Escape') {
                // Cancel edit
                titleInput.value = titleText.textContent; // Reset to original
                titleText.style.display = 'inline';
                titleInput.style.display = 'none';
                editBtn.style.display = 'inline-block';
                saveBtn.style.display = 'none';
                viewBtn.style.display = 'inline-block';
            }
        });

        viewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showHistoryDetail(entry.id)
        });
        
        historyItem.querySelector('.history-item-main').addEventListener('click', () => showHistoryDetail(entry.id));

        historyList.appendChild(historyItem);
    });
}

function updateHistoryEntryTitle(id, newTitle) {
    const history = getHistory();
    const entryIndex = history.findIndex(item => item.id === id);
    if (entryIndex !== -1) {
        history[entryIndex].customTitle = newTitle;
        localStorage.setItem('toeflPracticeHistory', JSON.stringify(history));
    }
}

function showHistoryDetail(id) {
    const history = getHistory();
    currentHistoryEntry = history.find(item => item.id === id);

    if (currentHistoryEntry) {
        historySection.classList.add('hidden');
        historyDetailSection.classList.remove('hidden');
        currentHistoryPassageIndex = 0;
        displayHistoryContent();
    }
}

function displayHistoryContent() {
    if (!currentHistoryEntry) return;

    // Display summary info (total, answered, time, etc.)
    displayResultDetails('history-detail', currentHistoryEntry);

    // Display reading passage
    const readingContentEl = document.getElementById('history-reading-content');
    const readingTitleEl = document.getElementById('history-reading-title');
    const passageNavEl = document.getElementById('history-passage-nav');
    
    const passages = currentHistoryEntry.readingPassages || [];
    if (passages.length > 0 && passages[currentHistoryPassageIndex]) {
        readingContentEl.innerHTML = passages[currentHistoryPassageIndex].content;
        
        if (passages.length > 1) {
            readingTitleEl.textContent = `Reading ${currentHistoryPassageIndex + 1} / ${passages.length}`;
            passageNavEl.classList.remove('hidden');
            document.getElementById('history-prev-passage-btn').disabled = currentHistoryPassageIndex === 0;
            document.getElementById('history-next-passage-btn').disabled = currentHistoryPassageIndex === passages.length - 1;
        } else {
            readingTitleEl.textContent = 'Reading';
            passageNavEl.classList.add('hidden');
        }
    } else {
        readingContentEl.innerHTML = '<p>Reading passage not available.</p>';
        readingTitleEl.textContent = 'Reading';
        passageNavEl.classList.add('hidden');
    }
}

// History passage navigation
document.getElementById('history-prev-passage-btn').addEventListener('click', () => {
    if (currentHistoryPassageIndex > 0) {
        currentHistoryPassageIndex--;
        displayHistoryContent();
    }
});

document.getElementById('history-next-passage-btn').addEventListener('click', () => {
    if (currentHistoryEntry && currentHistoryPassageIndex < currentHistoryEntry.readingPassages.length - 1) {
        currentHistoryPassageIndex++;
        displayHistoryContent();
    }
});


function clearHistory() {
    if (confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
        localStorage.removeItem('toeflPracticeHistory');
        showHistory(); // Refresh the history view
    }
}

// Restart
restartBtn.addEventListener('click', () => {
    // Reset state
    examData = {
        readingPassages: [],
        questions: [],
        answers: {},
        answerTimestamps: {}, // Reset timestamps
        startTime: null,
        currentQuestionIndex: 0,
        timerMode: 'normal', // Reset timer mode
        countdownMinutes: 60, // Reset countdown minutes
        paused: false, // Reset pause state
        pauseStartTime: null,
        filenames: [] // Reset filenames
    };
    
    // Reset reading material title
    document.getElementById('reading-title').textContent = 'Reading';
    
    // Hide article navigation buttons
    document.getElementById('passage-nav').classList.add('hidden');

    // Reset file inputs
    file1Input.value = '';
    file2Input.value = '';
    file1Name.textContent = '';
    file2Name.textContent = '';
    startBtn.disabled = true;

    // Stop timer
    stopTimer();

    // Show upload interface
    resultSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
});

