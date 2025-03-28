# Projet Examen Cloud Function – Ayoub

---

##  Objectif du Projet

Ce projet consiste à implémenter une Cloud Function sur Google Cloud Platform (GCP) en utilisant **Node.js** et **TypeScript**. 

La fonction traite deux fichiers :
- Un fichier texte (`coordonnees.txt`) contenant des coordonnées géographiques.
- Un fichier GeoJSON (`plan-culture.geojson`) contenant des polygones associés à différentes informations agricoles.

La Cloud Function identifie les points situés à l’intérieur de ces polygones et génère un fichier CSV (`resultat.csv`) contenant des informations détaillées issues du polygone associé à chaque point (telles que `clecomposite`, `nochamp`, `culture`, `variete`, `nosemi`, `date_semi`).

---

## Structure du Projet

examen-cloud-function-ayoub/
├── src/
│   └── index.ts          # Code source (TypeScript)
├── dist/                 # Code JavaScript compilé
├── package.json          # Dépendances du projet
├── tsconfig.json         # Configuration TypeScript
├── README.md             # Documentation complète du projet
└── rapport.pdf           # Rapport détaillé (analyse, pseudocode, etc.)


---

##  Prérequis

- Compte **Google Cloud Platform** avec les services activés suivants :
  - **Cloud Functions**
  - **Cloud Storage**
- Compte **GitHub**
- **Node.js** (version 18 ou supérieure)
- **npm** (fourni avec Node.js)
- Ou utilisation directe de **Google Cloud Shell** (outils préinstallés)

---

## Installation et Déploiement

Voici comment installer, compiler et déployer rapidement la Cloud Function :

### ✅ **1. Cloner ce dépôt GitHub :**

git clone https://github.com/ayoubsoukrat/-examen-cloud--function-ayoub.git
cd examen-cloud--function-ayoub

### ✅ **2. Installer les dépendances:**

npm install

### ✅ **3. Compiler le projet TypeScript:**

npm run build
(Le résultat sera placé dans le dossier dist/.)

### ✅ **4. Déployer la Cloud Function sur Google Cloud:**

gcloud functions deploy processCoordinates \
  --runtime nodejs20 \
  --trigger-http \
  --entry-point processCoordinates \
  --allow-unauthenticated \
  --source=.

### ✅ **5. Tester la Cloud Function:**

Après exécution, vérifie la création du fichier resultat.csv dans le bucket Cloud Storage (exercice-ayoub).







