const DATA_KEY = 'webschool_data';
const CALENDAR_KEY = 'studypoint_calendar';
const MAX_EVENTS_DISPLAYED = 8;

// Fonctions pour les effets de niveau
function calculateStudyYears(minutes) {
    return minutes / (365 * 24 * 60); // minutes en années
}

function getLevelColorClass(level, dailyTime) {
    if (calculateStudyYears(dailyTime) >= 1) {
        return 'level-master';
    }
    return `level-${Math.min(9, level)}`;
}

function animateLevelProgression(oldLevel, newLevel, dailyTime) {
    const levelDisplay = document.getElementById('level-display');
    levelDisplay.classList.add('level-up');
    levelDisplay.classList.remove(...Array.from({length: 9}, (_, i) => `level-${i + 1}`));
    levelDisplay.classList.add(getLevelColorClass(newLevel, dailyTime));
    
    setTimeout(() => {
        levelDisplay.classList.remove('level-up');
    }, 1000);
}

// Default appData
let appData = {
    points: 0,
    level: 1,
    notes: [],
    dailyTime: 0, // in minutes
    sessionsCompleted: 0,
    pointsEarned: 0,
    lastResetDate: new Date().toDateString(),
    lastActivityTime: Date.now()
};

// Calculate points needed for level
function calculatePointsForLevel(level) {
    if (level <= 1) return 0;
    
    let basePoints = 5; // Points pour le niveau 2
    let increment = 10; // Incrément initial
    let totalPoints = 0;
    
    for (let i = 2; i <= level; i++) {
        if (i > 2) {
            // Augmente l'incrément tous les 5 niveaux
            if ((i - 2) % 5 === 0) {
                increment += 5;
            }
            totalPoints += increment;
        } else {
            totalPoints = basePoints;
        }
    }
    
    return totalPoints;
}

// Calculate level based on points
function calculateLevel(points) {
    let level = 1;
    while (calculatePointsForLevel(level + 1) <= points) {
        level++;
    }
    return level;
}

// Calculate points needed for next level
function getPointsForNextLevel(level) {
    return calculatePointsForLevel(level);
}

// Calculate points remaining for next level
function getPointsRemainingForNextLevel() {
    const nextLevel = appData.level + 1;
    const pointsNeeded = getPointsForNextLevel(nextLevel);
    return pointsNeeded - appData.points;
}

// Inactivity check
let inactivityWarnings = 0;
let inactivityTimeout;

function resetInactivityTimer() {
    appData.lastActivityTime = Date.now();
    clearTimeout(inactivityTimeout);
    inactivityTimeout = setTimeout(checkInactivity, 60 * 60 * 1000); // 1 heure
}

function checkInactivity() {
    const inactiveTime = (Date.now() - appData.lastActivityTime) / 1000 / 60; // en minutes
    if (inactiveTime >= 60) { // 1 heure
        inactivityWarnings++;
        let message = "Vous êtes inactif ! Revenez sur la page pour continuer votre session.";
        if (inactivityWarnings === 1) {
            setTimeout(() => checkInactivity(), 5 * 60 * 1000); // 5 minutes
        } else if (inactivityWarnings === 2) {
            setTimeout(() => checkInactivity(), 10 * 60 * 1000); // 10 minutes
        } else {
            message = "Session annulée pour inactivité.";
            stopAllTimers();
        }
        alert(message);
    }
}

function stopAllTimers() {
    if (timerRunning) {
        clearInterval(timerInterval);
        timerRunning = false;
        timerTime = 0;
        updateTimerDisplay();
    }
    if (chronoRunning) {
        clearInterval(chronoInterval);
        chronoRunning = false;
        chronoTime = 0;
        updateChronoDisplay();
    }
    inactivityWarnings = 0;
}

// Add activity listeners
document.addEventListener('mousemove', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);
document.addEventListener('click', resetInactivityTimer);

// Calendar data
let calendarData = {
    url: '',
    type: 'ical', // 'ical' ou 'google'
    events: []
};

let calendarLastUpdated = null;

// Utilitaire pour obtenir la clé localStorage selon le type de calendrier
function getCalendarStorageKey(type) {
    return type === 'google' ? 'calendar_google_url' : 'calendar_ical_url';
}

// Charger l'URL du calendrier selon le type
function getCalendarUrl(type) {
    return localStorage.getItem(getCalendarStorageKey(type)) || '';
}

// Sauvegarder l'URL du calendrier selon le type
function setCalendarUrl(type, url) {
    localStorage.setItem(getCalendarStorageKey(type), url);
}

// Afficher le calendrier selon le type
function loadCalendarUrlAndDisplay() {
    const type = document.getElementById('calendar-type').value;
    const url = getCalendarUrl(type);
    const statusElement = document.getElementById('calendar-status');
    const eventsContainer = document.getElementById('calendar-events');
    const googleFrame = document.getElementById('google-calendar-frame');

    if (!url) {
        statusElement.textContent = "Configuration du calendrier requise.";
        eventsContainer.innerHTML = '<p class="calendar-placeholder">Ajoutez un lien iCal ou Google Agenda pour afficher vos événements ici.</p>';
        googleFrame.style.display = 'none';
        eventsContainer.style.display = 'block';
        return;
    }

    if (type === 'google') {
        // Afficher l'iframe Google Agenda
        statusElement.textContent = "Google Agenda affiché.";
        googleFrame.innerHTML = `<iframe src="${url}" style="width:100%;height:500px;border:none;" allowfullscreen></iframe>`;
        googleFrame.style.display = 'block';
        eventsContainer.style.display = 'none';
    } else {
        // Afficher les événements iCal
        statusElement.textContent = "iCal chargé.";
        googleFrame.style.display = 'none';
        eventsContainer.style.display = 'block';
        // Charger et afficher les événements iCal
        fetch(url)
            .then(resp => resp.ok ? resp.text() : Promise.reject())
            .then(icalData => {
                const events = parseICalData(icalData);
                calendarData.events = events;
                renderCalendarEvents();
            })
            .catch(() => {
                eventsContainer.innerHTML = '<p class="calendar-placeholder">Erreur de chargement du calendrier iCal.</p>';
            });
    }
}

// Charger les données du calendrier depuis le localStorage
function loadCalendarData() {
    const data = localStorage.getItem(CALENDAR_KEY);
    if (data) {
        calendarData = JSON.parse(data);
        if (calendarData.type === 'google' && calendarData.url) {
            showGoogleCalendar(calendarData.url);
        } else if (calendarData.url) {
            updateCalendarEvents();
        }
    }
    document.getElementById('calendar-type').value = calendarData.type || 'ical';
}

// Sauvegarder les données du calendrier
function saveCalendarData() {
    localStorage.setItem(CALENDAR_KEY, JSON.stringify(calendarData));
}

function showGoogleCalendar(url) {
    document.getElementById('calendar-events').style.display = 'none';
    const frame = document.getElementById('google-calendar-frame');
    frame.style.display = 'block';
    frame.innerHTML = `<iframe src="${url}" style="width:100%;height:500px;border:none;" allowfullscreen></iframe>`;
    document.getElementById('calendar-status').textContent = 'Google Agenda affiché.';
}

function hideGoogleCalendar() {
    document.getElementById('google-calendar-frame').style.display = 'none';
    document.getElementById('calendar-events').style.display = 'block';
}

// Mettre à jour le calendrier
async function updateCalendarEvents() {
    if (calendarData.type === 'google') {
        showGoogleCalendar(calendarData.url);
        return;
    }
    hideGoogleCalendar();
    const statusElement = document.getElementById('calendar-status');
    statusElement.textContent = 'Mise à jour du calendrier...';
    try {
        const response = await fetch(calendarData.url);
        if (!response.ok) throw new Error('Erreur de chargement du calendrier');
        const icalData = await response.text();
        const events = parseICalData(icalData);
        calendarData.events = events;
        calendarLastUpdated = new Date();
        saveCalendarData();
        renderCalendarEvents();
        statusElement.textContent = 'Calendrier mis à jour';
    } catch (error) {
        statusElement.textContent = 'Erreur: Impossible de charger le calendrier';
        console.error('Erreur calendrier:', error);
    }
}

// Parser les données iCal
function parseICalData(icalData) {
    const events = [];
    const lines = icalData.split('\n');
    let currentEvent = null;

    for (let line of lines) {
        line = line.trim();
        
        if (line === 'BEGIN:VEVENT') {
            currentEvent = {};
        } else if (line === 'END:VEVENT' && currentEvent) {
            events.push(currentEvent);
            currentEvent = null;
        } else if (currentEvent) {
            if (line.startsWith('SUMMARY:')) {
                currentEvent.title = line.substring(8);
            } else if (line.startsWith('DTSTART:')) {
                currentEvent.start = parseICalDate(line.substring(8));
            } else if (line.startsWith('DTEND:')) {
                currentEvent.end = parseICalDate(line.substring(6));
            } else if (line.startsWith('DESCRIPTION:')) {
                currentEvent.description = line.substring(12);
                } else if (line.startsWith('LOCATION:')) {
                    currentEvent.location = line.substring(9);
            }
        }
    }

    return events.sort((a, b) => a.start - b.start);
}

// Parser une date iCal
function parseICalDate(dateStr) {
    // Format: YYYYMMDDTHHMMSSZ
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(9, 11);
    const minute = dateStr.substring(11, 13);
    const second = dateStr.substring(13, 15);
    
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
}

// Afficher les événements du calendrier
function renderCalendarEvents() {
    const container = document.getElementById('calendar-events');
    container.innerHTML = '';

    const now = new Date();
    const futureEvents = calendarData.events
        .filter(event => event.start > now)
        .slice(0, MAX_EVENTS_DISPLAYED);

    if (futureEvents.length === 0) {
        container.innerHTML = '<p class="calendar-placeholder">Aucun événement à venir</p>';
        return;
    }

    futureEvents.forEach(event => {
        const eventEl = document.createElement('div');
        eventEl.className = 'calendar-event';
        
        const startDate = event.start.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
        const startTime = event.start.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        const endTime = event.end.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Calcul de la durée
        const duration = Math.round((event.end - event.start) / 1000 / 60); // en minutes
        const durationText = duration >= 60 ? 
            `${Math.floor(duration/60)}h${duration%60 ? duration%60+'min' : ''}` : 
            `${duration}min`;
        
        // Formatage de la description pour extraire le prof et le groupe
        let teacher = '', group = '';
        if (event.description) {
            const parts = event.description.split(' - ');
            if (parts.length >= 2) {
                teacher = parts[0];
                group = parts[1];
            }
        }
        
        eventEl.innerHTML = `
            <div class="event-title">
                ${event.title}
                ${event.location ? `<span class="event-location">📍 ${event.location}</span>` : ''}
            </div>
            <div class="event-datetime">
                <div class="event-date">📅 ${startDate}</div>
                <div class="event-time">⏰ ${startTime} - ${endTime} (${durationText})</div>
            </div>
            ${teacher || group ? `
                <div class="event-details">
                    ${teacher ? `<div class="event-teacher">👤 ${teacher}</div>` : ''}
                    ${group ? `<div class="event-group">👥 ${group}</div>` : ''}
                </div>
            ` : ''}
        `;
        
        // Ajouter une couleur en fonction du type de cours
        const eventType = event.title.toLowerCase();
        if (eventType.includes('espagnol')) {
            eventEl.classList.add('event-language');
        } else if (eventType.includes('math')) {
            eventEl.classList.add('event-math');
        } // etc...
        
        container.appendChild(eventEl);
    });
}

// Load data from localStorage with anti-cheat verification
function loadData() {
    const data = localStorage.getItem(DATA_KEY);
    if (data) {
        try {
            const parsedData = JSON.parse(data);
            if (!antiCheat.enabled || (antiCheat.verifyDataIntegrity(parsedData) && antiCheat.validateData(parsedData))) {
                appData = { ...appData, ...parsedData };
            } else {
                // En cas de données corrompues ou manipulées
                antiCheat.handleViolation();
                return;
            }
        } catch (error) {
            console.error("Erreur lors du chargement des données:", error);
            antiCheat.handleViolation();
            return;
        }
    }
    checkDailyReset();
}

// Save data to localStorage with anti-cheat protection
function saveData() {
    if (!antiCheat.enabled || antiCheat.secureDataSave(appData)) {
        localStorage.setItem(DATA_KEY, JSON.stringify(appData));
    }
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
    const newLevel = calculateLevel(appData.points);
    const levelDisplay = document.getElementById('level-display');
    
    if (newLevel !== appData.level) {
        const oldLevel = appData.level;
        appData.level = newLevel;
        animateLevelProgression(oldLevel, newLevel, appData.dailyTime);
        alert(`Félicitations ! Vous avez atteint le niveau ${newLevel} !`);
    }
    
    levelDisplay.textContent = `Niveau: ${appData.level}`;
    levelDisplay.className = '';
    levelDisplay.classList.add(getLevelColorClass(appData.level, appData.dailyTime));
    
    // Update progress bar
    const currentLevelPoints = getPointsForNextLevel(appData.level);
    const nextLevelPoints = getPointsForNextLevel(appData.level + 1);
    const pointsInCurrentLevel = appData.points - currentLevelPoints;
    const pointsNeededForNextLevel = nextLevelPoints - currentLevelPoints;
    const progress = (pointsInCurrentLevel / pointsNeededForNextLevel) * 100;
    
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.querySelector('.progress-text');
    progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    const pointsRemaining = getPointsRemainingForNextLevel();
    progressText.textContent = `${pointsInCurrentLevel}/${pointsNeededForNextLevel} (+${pointsNeededForNextLevel} pts pour niv. ${appData.level + 1})`;
}

// Update stats display
function updateStatsDisplay() {
    document.getElementById('daily-time').textContent = appData.dailyTime || 0;
    document.getElementById('sessions-completed').textContent = appData.sessionsCompleted || 0;
    document.getElementById('points-earned').textContent = appData.pointsEarned || 0;
}

// Compteur de clics sur le titre
let titleClickCount = 0;

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

// Gestionnaire de clics sur le titre
document.getElementById('app-title').addEventListener('click', () => {
    titleClickCount++;
    if (titleClickCount === 10) {
        appData.points++;
        updatePointsDisplay();
        saveData();
        titleClickCount = 0;
        alert('Félicitations ! Vous avez gagné 1 point en cliquant sur le titre !');
    }
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
    const display = document.getElementById('timer-display');
    const timeString = formatTime(timerTime);
    display.innerHTML = `<span class="time-unit">${timeString}</span>`;
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
    if (duration > 0) {
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
}

function calculatePoints(duration) {
    let points = duration;
    
    // Bonus basé sur la durée de la session
    if (duration >= 60) {
        points *= 1.5; // Bonus de 50% pour les sessions d'une heure ou plus
    } else if (duration >= 25) {
        points *= 1.2; // Bonus de 20% pour les sessions de 25+ minutes (pomodoro)
    }
    
    // Bonus basé sur le total de points accumulés
    if (appData.points >= 500) {
        points *= 2; // Double points après 500 points totaux
    } else if (appData.points >= 100) {
        points *= 1.5; // 50% de bonus après 100 points totaux
    }
    
    return Math.floor(points);
}

// Chrono
let chronoInterval = null;
let chronoTime = 0;
let chronoRunning = false;

function addChronoAnimation() {
    const chronoDisplay = document.getElementById('chrono-display');
    if (chronoDisplay) {
        chronoDisplay.style.transition = 'transform 0.5s';
        chronoDisplay.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            chronoDisplay.style.transform = 'rotate(0deg)';
        }, 500);
    }
}

function updateChronoDisplay() {
    const display = document.getElementById('chrono-display');
    const timeString = formatTime(chronoTime);
    display.innerHTML = `<span class="time-unit">${timeString}</span>`;
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
    if (minutes > 0) {
        appData.dailyTime += minutes;
        const points = minutes; // 1 min = 1 point
        appData.points += points;
        appData.pointsEarned += points;
        appData.sessionsCompleted++;
        updatePointsDisplay();
        updateStatsDisplay();
        saveData();
        alert(`Session terminée ! +${points} points`);
    }
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

// Gérer le bouton de mise à jour du calendrier
document.getElementById('update-calendar-url').addEventListener('click', () => {
    const type = document.getElementById('calendar-type').value;
    const currentUrl = getCalendarUrl(type);
    const promptText = type === 'google'
        ? "Entrez l'URL de votre Google Agenda (iframe):"
        : "Entrez l'URL de votre calendrier iCal:";
    const newUrl = prompt(promptText, currentUrl);
    if (newUrl !== null) {
        setCalendarUrl(type, newUrl);
        loadCalendarUrlAndDisplay();
    }
});

document.getElementById('calendar-type').addEventListener('change', () => {
    loadCalendarUrlAndDisplay();
});

// Initialisation au chargement
loadCalendarUrlAndDisplay();

// Options functionality
document.getElementById('refresh-data').addEventListener('click', () => {
    if (confirm('Êtes-vous sûr de vouloir rafraîchir les données ? Cela rechargera la page.')) {
        localStorage.removeItem(DATA_KEY);
        location.reload();
    }
});

document.getElementById('anti-cheat-toggle').addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    localStorage.setItem('anti_cheat_enabled', isEnabled);
    updateAntiCheatStatus();
});

document.getElementById('open-google-calendar').addEventListener('click', () => {
    const url = getCalendarUrl('google');
    if (url) {
        window.open(url, '_blank');
    } else {
        alert('Aucune URL Google Agenda configurée.');
    }
});

function updateAntiCheatStatus() {
    const status = document.getElementById('anti-cheat-status');
    const isEnabled = localStorage.getItem('anti_cheat_enabled') === 'true';
    document.getElementById('anti-cheat-toggle').checked = isEnabled;
    status.textContent = isEnabled ? 'Anti-triche activé' : 'Anti-triche désactivé';
}

// Initialize
loadData();
loadTheme();
loadCalendarData();
updatePointsDisplay();
updateStatsDisplay();
renderNotes();
updateAntiCheatStatus();
showPage('planning'); // default page