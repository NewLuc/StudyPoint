const DATA_KEY = 'webschool_data';

// Default appData
let appData = {
    points: 0,
    notes: [],
    dailyTime: 0, // in minutes
    sessionsCompleted: 0,
    pointsEarned: 0,
    lastResetDate: new Date().toDateString()
};

// Load data from localStorage
function loadData() {
    const data = localStorage.getItem(DATA_KEY);
    if (data) {
        appData = { ...appData, ...JSON.parse(data) };
    }
    checkDailyReset();
}

// Save data to localStorage
function saveData() {
    localStorage.setItem(DATA_KEY, JSON.stringify(appData));
}

// Check and reset daily stats
function checkDailyReset() {
    const today = new Date().toDateString();
    if (appData.lastResetDate !== today) {
        appData.dailyTime = 0;
        appData.sessionsCompleted = 0;
        appData.pointsEarned = 0;
        appData.lastResetDate = today;
        saveData();
    }
}

// Update points display
function updatePointsDisplay() {
    document.getElementById('points-counter').textContent = `Points: ${appData.points}`;
}

// Update stats display
function updateStatsDisplay() {
    document.getElementById('daily-time').textContent = appData.dailyTime;
    document.getElementById('sessions-completed').textContent = appData.sessionsCompleted;
    document.getElementById('points-earned').textContent = appData.pointsEarned;
}

// Navigation
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-page="${pageId}"]`).classList.add('active');
}

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const page = btn.getAttribute('data-page');
        showPage(page);
    });
});

// Revisions
function renderNotes() {
    const container = document.getElementById('notes-container');
    container.innerHTML = '';
    appData.notes.forEach((note, index) => {
        const noteEl = document.createElement('div');
        noteEl.className = 'note';
        noteEl.innerHTML = `
            <input type="text" value="${note.title}" onchange="updateNote(${index}, 'title', this.value)">
            <textarea onchange="updateNote(${index}, 'content', this.value)">${note.content}</textarea>
            <button onclick="deleteNote(${index})">X</button>
        `;
        container.appendChild(noteEl);
    });
}

function addNote() {
    appData.notes.push({ title: 'Nouvelle fiche', content: '' });
    renderNotes();
    saveData();
}

function updateNote(index, field, value) {
    appData.notes[index][field] = value;
    saveData();
}

function deleteNote(index) {
    appData.notes.splice(index, 1);
    renderNotes();
    saveData();
}

document.getElementById('add-note').addEventListener('click', addNote);

// Timer
let timerInterval = null;
let timerTime = 0; // in seconds
let timerRunning = false;
let timerPaused = false;

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    document.getElementById('timer-display').textContent = formatTime(timerTime);
}

document.getElementById('preset-btns').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        const time = parseInt(e.target.getAttribute('data-time'));
        timerTime = time * 60;
        updateTimerDisplay();
    }
});

document.getElementById('start-timer').addEventListener('click', () => {
    if (!timerRunning && timerTime > 0) {
        timerRunning = true;
        timerInterval = setInterval(() => {
            timerTime--;
            updateTimerDisplay();
            if (timerTime <= 0) {
                clearInterval(timerInterval);
                timerRunning = false;
                completeTimerSession();
            }
        }, 1000);
    }
});

document.getElementById('pause-timer').addEventListener('click', () => {
    if (timerRunning) {
        clearInterval(timerInterval);
        timerRunning = false;
        timerPaused = true;
    }
});

document.getElementById('stop-timer').addEventListener('click', () => {
    clearInterval(timerInterval);
    timerRunning = false;
    timerPaused = false;
    timerTime = 0;
    updateTimerDisplay();
});

function completeTimerSession() {
    const duration = parseInt(document.querySelector('#preset-btns button[data-time]:focus')?.getAttribute('data-time') || 0);
    appData.dailyTime += duration;
    appData.sessionsCompleted++;
    const points = calculatePoints(duration);
    appData.points += points;
    appData.pointsEarned += points;
    updatePointsDisplay();
    updateStatsDisplay();
    saveData();
    alert(`Session terminée ! +${points} points`);
}

function calculatePoints(duration) {
    let points = duration;
    if (duration >= 25) points += 5; // bonus for pomodoro
    return points;
}

// Chrono
let chronoInterval = null;
let chronoTime = 0;
let chronoRunning = false;

function updateChronoDisplay() {
    document.getElementById('chrono-display').textContent = formatTime(chronoTime);
}

document.getElementById('start-chrono').addEventListener('click', () => {
    if (!chronoRunning) {
        chronoRunning = true;
        chronoInterval = setInterval(() => {
            chronoTime++;
            updateChronoDisplay();
        }, 1000);
    }
});

document.getElementById('pause-chrono').addEventListener('click', () => {
    if (chronoRunning) {
        clearInterval(chronoInterval);
        chronoRunning = false;
    }
});

document.getElementById('stop-chrono').addEventListener('click', () => {
    clearInterval(chronoInterval);
    chronoRunning = false;
    const minutes = Math.floor(chronoTime / 60);
    appData.dailyTime += minutes;
    const points = minutes; // 1 min = 1 point
    appData.points += points;
    appData.pointsEarned += points;
    appData.sessionsCompleted++; // maybe count as session?
    updatePointsDisplay();
    updateStatsDisplay();
    saveData();
    chronoTime = 0;
    updateChronoDisplay();
});

document.getElementById('reset-chrono').addEventListener('click', () => {
    clearInterval(chronoInterval);
    chronoRunning = false;
    chronoTime = 0;
    updateChronoDisplay();
});

// Theme Management
function loadTheme() {
    const savedTheme = localStorage.getItem('studypoint_theme') || 'light';
    const savedColor = localStorage.getItem('studypoint_color') || 'green';

    document.body.className = `theme-${savedTheme} color-${savedColor}`;
    document.getElementById('theme-select').value = savedTheme;
    document.getElementById('color-select').value = savedColor;
}

function saveTheme(theme, color) {
    localStorage.setItem('studypoint_theme', theme);
    localStorage.setItem('studypoint_color', color);
}

document.getElementById('theme-select').addEventListener('change', (e) => {
    const theme = e.target.value;
    const currentColor = document.getElementById('color-select').value;
    document.body.className = `theme-${theme} color-${currentColor}`;
    saveTheme(theme, currentColor);
});

document.getElementById('color-select').addEventListener('change', (e) => {
    const color = e.target.value;
    const currentTheme = document.getElementById('theme-select').value;
    document.body.className = `theme-${currentTheme} color-${color}`;
    saveTheme(currentTheme, color);
});

// Initialize
loadData();
loadTheme();
updatePointsDisplay();
updateStatsDisplay();
renderNotes();
showPage('planning'); // default page