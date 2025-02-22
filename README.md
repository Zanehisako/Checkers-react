Voici un exemple de README en français pour votre serveur TypeScript. Vous pouvez copier ce contenu dans votre fichier `README.md` :

---

# Serveur de Dames en Temps Réel

Ce projet est un serveur et interface de dames en temps réel développé avec TypeScript, React,Express et Socket.IO. Il permet de créer des salles de jeu, de rejoindre une partie en tant que joueur ou spectateur, et de jouer avec des règles de déplacement validées (pour les pions et les rois). Un mode puzzle est également disponible pour relever des défis spécifiques.

## Fonctionnalités

- **Jeu en Temps Réel :** Communication instantanée grâce à Socket.IO.
- **Gestion des Salles :** Création de salles de jeu, rejoindre en tant que joueur ou spectateur.
- **Logique de Jeu :** Implémente les règles des mouvements, y compris les prises obligatoires, les déplacements des rois et la promotion.
- **Mode Puzzle(work on progress) :** Résolvez des puzzles de dames avec des défis uniques.

## Prérequis

- [Node.js](https://nodejs.org/) (v14+ recommandé)
- npm (ou yarn) pour la gestion des paquets

## Installation

1. **Cloner le Répertoire**

   ```bash
   git clone https://github.com/votreutilisateur/votre-repo.git
   cd votre-repo
   ```

2. **Installer les Dépendances**

   ```bash
   npm install
   ```

3. **Compiler le Projet (Optionnel)**

   Si vous souhaitez compiler le TypeScript en JavaScript :

   ```bash
   npm run build
   ```

   Vous pouvez également exécuter directement le serveur en utilisant [ts-node](https://github.com/TypeStrong/ts-node) :

   ```bash
   npx ts-node src/server.ts
   ```

4. **Démarrer le Serveur**

   Le serveur écoute par défaut sur le port `3001`.

   ```bash
   npm start
   ```

   Vous verrez un message indiquant que le serveur écoute sur le port 3001.

## Utilisation

### Connexion au Serveur

Le serveur utilise Socket.IO pour la communication en temps réel. Pour vous connecter depuis un client, utilisez la bibliothèque Socket.IO côté client. Par exemple :

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

// Vérification de la connexion
socket.on("connect", () => {
  console.log("Connecté au serveur de dames !");
});

// Écouter les mises à jour des salles
socket.on("rooms", (emptyRooms, fullRooms) => {
  console.log("Salles disponibles :", emptyRooms, fullRooms);
});
```

### Événements Socket.IO

Le serveur écoute et émet plusieurs événements personnalisés :

- **rooms :**  
  Émis à la connexion avec la liste des salles disponibles.

- **create room :**  
  Crée une nouvelle salle de jeu.  
  **Utilisation :** `socket.emit("create room", "nom-de-la-salle");`

- **join room as player :**  
  Rejoint une salle existante en tant que joueur.  
  **Utilisation :** `socket.emit("join room as player", "nom-de-la-salle");`

- **join room as spectator :**  
  Rejoint une salle existante en tant que spectateur.  
  **Utilisation :** `socket.emit("join room as spectator", "nom-de-la-salle");`

- **get board :**  
  Demande l'état actuel du plateau de jeu.  
  **Utilisation :** `socket.emit("get board");`

- **move piece :**  
  Envoie un déplacement (pour le jeu normal).  
  **Utilisation :**  
  ```javascript
  const position = { index: "12", x: 1, y: 2, king: false };
  socket.emit("move piece", position, typeDuJoueur, temps);
  ```

- **Eat Multiple :**  
  Émis lors de la réalisation de prises multiples en un tour.  
  **Utilisation :**  
  ```javascript
  const positions = [{ index: "34", x: 3, y: 4, king: false }, ...];
  socket.emit("Eat Multiple", positions, typeDuJoueur, temps);
  ```

- **Événements du Mode Puzzle :**  
  Pour les puzzles, utilisez des événements tels que `play puzzle` et `move piece puzzle`.

### Exemple : Créer et Rejoindre une Salle

```javascript
// Créer une nouvelle salle
socket.emit("create room", "ma-salle-de-dames");

// Rejoindre la salle en tant que joueur
socket.emit("join room as player", "ma-salle-de-dames");

// Écouter les messages de confirmation
socket.on("msg", (message) => {
  console.log("Message du serveur :", message);
});
```

## Structure du Code

- **server.ts :**  
  Le fichier principal qui configure l'application Express, le serveur HTTP et Socket.IO. Il comprend :
  - **Initialisation du Jeu :**  
    - `initboard()`: Initialise le plateau avec les positions de départ des pions noirs et blancs.
  - **Logique du Jeu :**  
    - `calculateMove()` et `calculateKingMove()`: Valident les déplacements pour les pions et les rois.
    - `updateGamePawn()` et `updateGameKing()`: Met à jour l'état du jeu après un déplacement.
    - `hasMandatoryCapture()`: Vérifie l'existence de prises obligatoires.
  - **Gestion des Événements Socket.IO :**  
    Traite la création de salles, les rejoignements, les déplacements, et la déconnexion.

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir des issues ou à soumettre des pull requests pour améliorer le projet ou corriger des bugs.

Voici un README en français pour l'interface web de votre jeu de dames. Vous pouvez l'utiliser comme base et l'adapter si nécessaire.  

---

# Interface Web du Jeu de Dames

Ce projet est l'interface web du jeu de dames en temps réel, développée avec React, TypeScript et Tailwind CSS. Elle se connecte au serveur via WebSocket (Socket.IO) pour permettre des parties interactives entre joueurs et spectateurs.  

## Prérequis  

- [Node.js](https://nodejs.org/) (v14+ recommandé)  
- npm (ou yarn) pour la gestion des dépendances  

## Installation  

1. **Cloner le dépôt**  

   ```bash
   git clone https://github.com/votreutilisateur/votre-repo-web.git
   cd votre-repo-web
   ```

2. **Installer les dépendances**  

   ```bash
   npm install
   ```

3. **Démarrer l’application**  

   ```bash
   npm run dev
   ```

   Par défaut, l’interface est accessible sur `http://localhost:5173` (si vous utilisez Vite) ou `http://localhost:3000` (si vous utilisez Create React App).  


Vous pouvez également héberger l’application sur une plateforme comme Vercel, Netlify ou un serveur Nginx.  

