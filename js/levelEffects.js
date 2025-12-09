// Calculate study time in years
function calculateStudyYears(dailyTime) {
    return dailyTime / (365 * 24 * 60); // minutes to years
}

// Get level color class
function getLevelColorClass(level, dailyTime) {
    if (calculateStudyYears(dailyTime) >= 1) {
        return 'level-master';
    }
    return `level-${Math.min(9, level)}`;
}

// Animate level progression
function animateLevelProgression(oldLevel, newLevel, dailyTime) {
    const levelDisplay = document.getElementById('level-display');
    const duration = 1000; // 1 seconde pour l'animation
    const steps = 20; // nombre d'étapes d'animation
    let step = 0;

    // Retire les anciennes classes
    levelDisplay.className = '';
    levelDisplay.classList.add('level-up');

    const interval = setInterval(() => {
        step++;
        const currentLevel = Math.floor(oldLevel + (newLevel - oldLevel) * (step / steps));
        levelDisplay.classList.remove(...Array.from({length: 9}, (_, i) => `level-${i + 1}`));
        levelDisplay.classList.add(getLevelColorClass(currentLevel, dailyTime));

        if (step >= steps) {
            clearInterval(interval);
            levelDisplay.classList.remove('level-up');
        }
    }, duration / steps);
}