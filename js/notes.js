// Clé de stockage pour les notes
const NOTES_STORAGE_KEY = 'study_notes';

// Structure d'une note
class Note {
    constructor(title, content, color = '#ffffff', timestamp = Date.now()) {
        this.id = `note_${timestamp}`;
        this.title = title;
        this.content = content;
        this.color = color;
        this.created = timestamp;
        this.lastModified = timestamp;
    }
}

// Gestionnaire des notes
class NotesManager {
    constructor() {
        this.notes = [];
        this.container = document.getElementById('notes-container');
        this.addButton = document.getElementById('add-note');
        this.countBadge = null;
        this.maxNotes = 10; // limite du nombre de fiches
        this.maxChars = 1000; // limite de caractères par fiche
        this.toastContainer = null;
        this.loadNotes();
        this.setupEventListeners();
    }

    // Toasts non bloquants
    ensureToastContainer() {
        if (this.toastContainer) return;
        this.toastContainer = document.createElement('div');
        this.toastContainer.className = 'toast-container';
        document.body.appendChild(this.toastContainer);
    }

    showToast(message, opts = {}) {
        // opts: {duration, actionText, action}
        this.ensureToastContainer();
        const duration = typeof opts.duration === 'number' ? opts.duration : 4000;
        const toast = document.createElement('div');
        toast.className = 'toast';
        const text = document.createElement('div');
        text.textContent = message;
        toast.appendChild(text);
        if (opts.actionText && typeof opts.action === 'function') {
            const btn = document.createElement('button');
            btn.className = 'toast-action';
            btn.textContent = opts.actionText;
            btn.addEventListener('click', () => {
                try { opts.action(); } catch (e) { console.error(e); }
                // remove toast immediately
                toast.classList.add('fade-out');
                setTimeout(() => toast.remove(), 220);
            });
            toast.appendChild(btn);
        }
        this.toastContainer.appendChild(toast);
        // auto remove
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 220);
        }, duration);
    }

    // Charger les notes depuis le localStorage
    loadNotes() {
        const savedNotes = localStorage.getItem(NOTES_STORAGE_KEY);
        this.notes = savedNotes ? JSON.parse(savedNotes) : [];
        this.renderNotes();
    }

    // Sauvegarder les notes dans le localStorage
    saveNotes() {
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(this.notes));
    }

    // Créer une nouvelle note
    createNote() {
        if (this.notes.length >= this.maxNotes) {
            // prévention: ne pas créer plus de fiches -> toast non bloquant
            this.showToast(`Nombre maximal de fiches atteint (${this.maxNotes}).`, {duration: 4000});
            return null;
        }
        // palette plus classique / pastel pour éviter les couleurs trop flashy
        const colors = ['#ffffff', '#f7f7f8', '#fff8e1', '#f3f8ef', '#f0f7ff'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        const note = new Note('Nouvelle fiche', '', randomColor);
        this.notes.unshift(note);
        this.saveNotes();
        this.renderNotes();
        return note;
    }

    // Supprimer une note
    deleteNote(id) {
        const index = this.notes.findIndex(note => note.id === id);
        if (index === -1) return;
        // sauvegarde pour undo
        const removed = this.notes.splice(index, 1)[0];
        this.saveNotes();
        this.renderNotes();
        // proposer undo via toast
        this.showToast('Fiche supprimée.', {
            actionText: 'Annuler',
            duration: 6000,
            action: () => {
                // restaurer à la position précédente
                this.notes.splice(index, 0, removed);
                this.saveNotes();
                this.renderNotes();
                this.showToast('Suppression annulée.', {duration: 2000});
            }
        });
    }

    // Mettre à jour une note
    updateNote(id, title, content) {
        const note = this.notes.find(note => note.id === id);
        if (note) {
            note.title = title;
            note.content = content;
            note.lastModified = Date.now();
            this.saveNotes();
        }
    }

    // Créer l'élément HTML pour une note
    createNoteElement(note) {
        const noteElement = document.createElement('div');
        noteElement.className = 'note';
        noteElement.style.backgroundColor = note.color;
        // Ajuste la couleur du texte selon la luminosité du fond
        const textColor = this.isLightColor(note.color) ? '#111' : '#fff';
        noteElement.style.color = textColor;
        noteElement.innerHTML = `
            <div class="note-header">
                <input type="text" class="note-title" value="${note.title}" placeholder="Titre de la fiche">
                <button class="delete-note">×</button>
            </div>
            <textarea class="note-content" placeholder="Contenu de la fiche...">${note.content}</textarea>
            <div class="note-meta">
                <span class="char-counter">${note.content.length}/${this.maxChars}</span>
            </div>
            <div class="note-footer">
                <span class="note-date">Modifié le ${new Date(note.lastModified).toLocaleDateString()}</span>
            </div>
        `;

        // Gestionnaires d'événements
        const titleInput = noteElement.querySelector('.note-title');
        const contentArea = noteElement.querySelector('.note-content');
        const deleteButton = noteElement.querySelector('.delete-note');

        titleInput.addEventListener('change', () => {
            this.updateNote(note.id, titleInput.value, contentArea.value);
        });

        // Contrôle du contenu (limite caractères) et affichage compteur
        const counter = noteElement.querySelector('.char-counter');
        const updateCounter = () => {
            let value = contentArea.value || '';
            if (value.length > this.maxChars) {
                // tronquer si dépassement
                value = value.slice(0, this.maxChars);
                contentArea.value = value;
            }
            counter.textContent = `${value.length}/${this.maxChars}`;
        };

        contentArea.addEventListener('input', () => {
            updateCounter();
            this.updateNote(note.id, titleInput.value, contentArea.value);
        });

        // Trigger initial counter update
        updateCounter();

        deleteButton.addEventListener('click', () => {
            // suppression immédiate avec option annuler via toast
            this.deleteNote(note.id);
        });

        // Animation d'entrée
        noteElement.style.animation = 'noteAppear 0.3s ease-out forwards';

        return noteElement;
    }

    // Afficher toutes les notes
    renderNotes() {
        this.container.innerHTML = '';
        this.notes.forEach(note => {
            this.container.appendChild(this.createNoteElement(note));
        });
        this.updateAddButtonState();
    }

    // Configurer les écouteurs d'événements
    setupEventListeners() {
        // badge compteur près du bouton
        this.countBadge = document.createElement('span');
        this.countBadge.className = 'notes-count-badge';
        this.addButton.parentNode && this.addButton.parentNode.insertBefore(this.countBadge, this.addButton.nextSibling);
        this.updateAddButtonState();

        this.addButton.addEventListener('click', () => {
            const note = this.createNote();
            if (!note) return;
            // createNote already calls renderNotes(), donc ne pas recréer l'élément
            // placer le focus sur le premier titre créé
            const firstTitle = this.container.querySelector('.note .note-title');
            if (firstTitle) firstTitle.focus();
            this.updateAddButtonState();
        });
    }

    updateAddButtonState() {
        const count = this.notes.length;
        if (this.countBadge) this.countBadge.textContent = ` ${count}/${this.maxNotes}`;
        if (this.addButton) {
            this.addButton.disabled = count >= this.maxNotes;
            this.addButton.setAttribute('aria-disabled', String(count >= this.maxNotes));
        }
    }

    // Simple utilitaire pour détecter si une couleur hex est claire
    isLightColor(hex) {
        if (!hex) return true;
        // accepte formats #abc ou #aabbcc
        const h = hex.replace('#', '');
        const r = parseInt(h.length === 3 ? h[0]+h[0] : h.slice(0,2), 16);
        const g = parseInt(h.length === 3 ? h[1]+h[1] : h.slice(2,4), 16);
        const b = parseInt(h.length === 3 ? h[2]+h[2] : h.slice(4,6), 16);
        // luminance approximative
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return lum > 180; // seuil
    }
}

// Initialiser le gestionnaire de notes quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    new NotesManager();
});