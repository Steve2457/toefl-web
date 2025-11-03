// src/timer.js
import { examData, timerInterval, setTimerInterval } from './state.js';
import { timerDisplayEl } from './dom.js';

/**
 * Get the string representation of the current timer time
 * @returns {string} Time string in HH:MM:SS format
 */
export function getCurrentTimerString() {
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

/**
 * Update timer display
 */
function updateTimer() {
    if (!examData.startTime || examData.paused) return;

    const timeString = getCurrentTimerString();
    timerDisplayEl.textContent = timeString;

    if (examData.timerMode === 'countdown') {
        const totalMilliseconds = examData.countdownMinutes * 60 * 1000;
        const elapsed = Date.now() - examData.startTime;
        const remaining = totalMilliseconds - elapsed;

        if (remaining < 0) {
            timerDisplayEl.style.color = '#dc3545'; // Timeout
        } else if (remaining < 60000) {
            timerDisplayEl.style.color = '#ff6b6b'; // Less than 1 minute
        } else if (remaining < 300000) {
            timerDisplayEl.style.color = '#ffc107'; // Less than 5 minutes
        } else {
            timerDisplayEl.style.color = '#333'; // Normal
        }
    } else {
        timerDisplayEl.style.color = '#333';
    }
}

/**
 * Start timer
 */
export function startTimer() {
    examData.startTime = Date.now();
    examData.paused = false;
    const interval = setInterval(updateTimer, 1000);
    setTimerInterval(interval);
    updateTimer();
}

/**
 * Stop timer
 */
export function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
    }
}

/**
 * Toggle pause/resume state
 */
export function togglePause() {
    const pauseBtn = document.getElementById('pause-btn');
    
    if (examData.paused) {
        // Resume
        examData.paused = false;
        pauseBtn.innerHTML = '&#10074;&#10074;'; // Pause icon
        pauseBtn.title = 'Pause';
        pauseBtn.classList.remove('paused');
        if (examData.pauseStartTime) {
            const pausedDuration = Date.now() - examData.pauseStartTime;
            examData.startTime += pausedDuration;
        }
    } else {
        // Pause
        examData.paused = true;
        examData.pauseStartTime = Date.now();
        pauseBtn.innerHTML = '&#9654;'; // Resume icon
        pauseBtn.title = 'Resume';
        pauseBtn.classList.add('paused');
    }
}
