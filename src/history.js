// src/history.js
import * as dom from './dom.js';
import { currentHistoryEntry, setCurrentHistoryEntry, setCurrentHistoryPassageIndex } from './state.js';
import { displayHistoryContent } from './ui.js';

function getHistory() {
    const history = localStorage.getItem('toeflPracticeHistory');
    return history ? JSON.parse(history) : [];
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
    const entry = history.find(item => item.id === id);
    setCurrentHistoryEntry(entry);

    if (currentHistoryEntry) {
        dom.historySection.classList.add('hidden');
        dom.historyDetailSection.classList.remove('hidden');
        setCurrentHistoryPassageIndex(0);
        displayHistoryContent();
    }
}

export function saveHistory(resultData) {
    const history = getHistory();
    const historyEntry = {
        id: Date.now(),
        ...resultData
    };
    history.unshift(historyEntry);
    localStorage.setItem('toeflPracticeHistory', JSON.stringify(history));
}

export function showHistory() {
    dom.uploadSection.classList.add('hidden');
    dom.resultSection.classList.add('hidden');
    dom.examSection.classList.add('hidden');
    dom.historySection.classList.remove('hidden');

    const history = getHistory();
    dom.historyListEl.innerHTML = '';

    if (history.length === 0) {
        dom.historyListEl.innerHTML = '<p>No history found.</p>';
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
                titleInput.value = titleText.textContent;
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

        dom.historyListEl.appendChild(historyItem);
    });
}

export function clearHistory() {
    if (confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
        localStorage.removeItem('toeflPracticeHistory');
        showHistory();
    }
}
