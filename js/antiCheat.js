class AntiCheatSystem {
    constructor() {
        this.enabled = localStorage.getItem('anti_cheat_enabled') === 'true';
        this.lastKnownState = null;
        this.checkInterval = null;
        this.checksumKey = 'studypoint_checksum';
        this.lastUpdateKey = 'studypoint_last_update';
        this.violationsKey = 'studypoint_violations';
        this.maxViolations = 3;
        
        // Initialisation
        this.violations = parseInt(localStorage.getItem(this.violationsKey)) || 0;
        this.setupEventListeners();
    }

    // Génère un checksum des données
    generateChecksum(data) {
        let str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }

    // Vérifie si les données ont été modifiées de manière suspecte
    isValidModification(newData, oldData) {
        // Vérification du temps écoulé
        const lastUpdate = parseInt(localStorage.getItem(this.lastUpdateKey)) || Date.now();
        const timeDiff = Date.now() - lastUpdate;
        
        // Points gagnés depuis la dernière mise à jour
        const pointsDiff = newData.points - (oldData?.points || 0);
        const maxPointsPerMinute = 2; // Maximum 2 points par minute
        const maxPointsAllowed = Math.ceil((timeDiff / 60000) * maxPointsPerMinute);

        if (pointsDiff > maxPointsAllowed) {
            return false;
        }

        // Vérification des niveaux
        if (newData.level > oldData.level + 1) {
            return false;
        }

        return true;
    }

    // Sauvegarde sécurisée des données
    secureDataSave(data) {
        if (!this.enabled) return true;

        // Vérification des modifications
        if (this.lastKnownState && !this.isValidModification(data, this.lastKnownState)) {
            this.handleViolation();
            return false;
        }

        // Mise à jour des données de sécurité
        const checksum = this.generateChecksum(data);
        localStorage.setItem(this.checksumKey, checksum);
        localStorage.setItem(this.lastUpdateKey, Date.now().toString());
        this.lastKnownState = {...data};

        return true;
    }

    // Vérifie l'intégrité des données
    verifyDataIntegrity(data) {
        if (!this.enabled) return true;

        const storedChecksum = localStorage.getItem(this.checksumKey);
        if (!storedChecksum) return true;

        const currentChecksum = this.generateChecksum(data);
        return storedChecksum === currentChecksum;
    }

    // Gestion des violations
    handleViolation() {
        this.violations++;
        localStorage.setItem(this.violationsKey, this.violations.toString());

        if (this.violations >= this.maxViolations) {
            this.resetProgress();
            alert("🚫 Violation de sécurité détectée ! Vos données ont été réinitialisées.");
        } else {
            alert(`⚠️ Modification suspecte détectée ! Avertissement ${this.violations}/${this.maxViolations}`);
        }
    }

    // Réinitialisation du progrès en cas de violation
    resetProgress() {
        localStorage.clear();
        this.violations = 0;
        localStorage.setItem(this.violationsKey, '0');
        location.reload();
    }

    // Active ou désactive le système anti-triche
    toggle(enabled) {
        this.enabled = enabled;
        localStorage.setItem('anti_cheat_enabled', enabled);
        
        if (enabled) {
            this.startMonitoring();
        } else {
            this.stopMonitoring();
        }
        
        return enabled;
    }

    // Démarre la surveillance
    startMonitoring() {
        // Vérifie les modifications toutes les 30 secondes
        this.checkInterval = setInterval(() => {
            const data = JSON.parse(localStorage.getItem('webschool_data'));
            if (data && !this.verifyDataIntegrity(data)) {
                this.handleViolation();
            }
        }, 30000);

        // Surveille les tentatives de modification du localStorage
        this.setupStorageEventListener();
    }

    // Arrête la surveillance
    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    // Configuration des écouteurs d'événements
    setupEventListeners() {
        // Surveille les modifications du localStorage
        window.addEventListener('storage', (e) => {
            if (this.enabled && e.key === 'webschool_data') {
                try {
                    const newData = JSON.parse(e.newValue);
                    if (!this.verifyDataIntegrity(newData)) {
                        this.handleViolation();
                    }
                } catch (err) {
                    this.handleViolation();
                }
            }
        });

        // Surveille les tentatives de débogage
        Object.defineProperty(window, 'debugger', {
            get: () => {
                if (this.enabled) {
                    this.handleViolation();
                }
            }
        });
    }

    // Vérifie si les données sont cohérentes
    validateData(data) {
        if (!this.enabled) return true;

        // Vérifications de base
        if (!data || typeof data !== 'object') return false;
        if (data.points < 0 || data.level < 1) return false;
        if (data.dailyTime < 0 || data.sessionsCompleted < 0) return false;

        // Vérification de la cohérence points/niveau
        const expectedLevel = calculateLevel(data.points);
        if (data.level !== expectedLevel) return false;

        return true;
    }
}

// Exportation de l'instance
const antiCheat = new AntiCheatSystem();