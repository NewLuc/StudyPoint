Structure générale
Nom du projet : StudyPoint
But : Application d’aide à l’organisation et à la motivation pour les études, avec gestion de points, planning, fiches de révision et outils de timer/chronomètre.
Fonctionnalités principales
1. Affichage des points
Emplacement : En haut, dans le header.
À quoi ça sert : Motiver l’utilisateur en affichant les points gagnés lors des sessions d’étude.
Nom variable : points-counter (dans le DOM), stocké dans appData.points.
2. Navigation latérale (Sidebar)
Boutons :
Planning : Accès à un planning (iframe, lien externe ou interne).
Révisions : Accès aux fiches de révision.
Timer : Accès aux outils de gestion du temps (timer et chronomètre).
À quoi ça sert : Permet de naviguer entre les différentes pages de l’application.
3. Page Planning
Contenu : Un iframe pour afficher un planning externe.
À quoi ça sert : Permettre à l’utilisateur de consulter ou intégrer son planning d’étude.
4. Page Révisions
Gestion des fiches :
Ajout : Bouton "+" pour créer une nouvelle fiche.
Édition : Titre et contenu modifiables.
Suppression : Bouton "X" pour supprimer une fiche.
Stockage : Les fiches sont sauvegardées dans le localStorage sous la clé webschool_data.
À quoi ça sert : Centraliser les notes et fiches de révision de l’utilisateur.
5. Page Timer / Chronomètre
Timer Décompte
Boutons prédéfinis : 5, 15, 25, 30, 60 minutes.
Affichage : Temps restant, boutons Start/Pause/Stop.
Points : Calcul automatique des points selon la durée étudiée (bonus pour longues sessions).
Stats : Temps total, sessions complétées, points gagnés.
Chronomètre Libre
Fonctionnement : Chrono qui compte le temps libre d’étude.
Points : 1 minute = 1 point, affichage des points de la session.
Stats : Identiques au timer.
6. Gestion des données
Stockage : Toutes les données (fiches, points, temps, sessions) sont sauvegardées dans le navigateur via localStorage.
Reset quotidien : Les stats journalières sont réinitialisées chaque jour.
À quoi servent les noms et variables ?
appData : Objet principal contenant toutes les données de l’utilisateur (fiches, points, temps, sessions, date).
DATA_KEY : Clé de stockage dans le localStorage.
points-counter : Affichage des points dans le header.
dailyTime, sessionsCompleted, pointsEarned : Statistiques affichées en bas de la page timer.
notesContainer : Conteneur des fiches de révision.
timerDisplay, chronoDisplay : Affichage du temps restant ou écoulé.
presetBtns : Boutons pour sélectionner la durée du timer.
Pour une refonte en React JS
Pages/Composants à prévoir :
Header (affichage des points)
Sidebar (navigation)
Planning (iframe ou composant calendrier)
Révisions (CRUD fiches)
Timer (gestion du décompte)
Chronomètre (gestion du chrono)
Stats (affichage des statistiques)
Gestion d’état : Utiliser useState et useEffect pour remplacer le localStorage et la logique de mise à jour.
Routing : Utiliser react-router pour la navigation entre les pages.
Stockage : Utiliser localStorage ou une solution type Redux/Persist pour la sauvegarde des données.
Si tu veux une analyse plus détaillée de chaque fonction JS ou des styles, je peux te les expliquer aussi !