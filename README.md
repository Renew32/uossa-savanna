# UOSSA · AESUO — L’esprit Téranga

Une page immersive en français : le défilement suit une route sinueuse dans une savane avec un panorama photographique au coucher du soleil, avec le lion UOSSA modélisé en relief dans Blender.

## Lancer

Node.js 22.12+ requis.

```sh
npm ci
npm run dev
```

Ouvrir http://127.0.0.1:5173. Si ce port est déjà utilisé : `npm run dev -- --port 5174`.

```sh
npm run build
npm run preview
```

L’aperçu de production utilise normalement http://127.0.0.1:4173. Le dossier `build/` contient le site statique, sans backend ni clé API. Le ZIP contient les sources et le verrouillage des dépendances, sans les dépendances installées.

## Contrôles

Défiler pour avancer sur la route ; utiliser les liens pour changer de chapitre. Le curseur influence légèrement la caméra et le vent. Le bouton « Animation réduite » fige la caméra et les effets. La préférence système de réduction des mouvements est également respectée. Navigation clavier et lien d’évitement inclus. Instagram reste disponible en bas à droite.

Deux carrefours jalonnent la route. Au premier (« Le carrefour »), la flèche gauche prend la route du bureau exécutif : trois planches de portraits au bord du chemin (à gauche, à droite, à gauche), puis la photo de groupe au bout, au milieu de la route. Au second (« Votre place »), la flèche droite prend la route de l’inscription et du recensement, qui se termine devant le panneau du formulaire. Chaque route annexe se défile comme le parcours principal ; au bout, elle revient rejoindre la route principale (avant « Nos racines » pour le bureau, avant « Ensemble » pour l’inscription). « Retour au carrefour » ou Échap ramène la caméra au carrefour. Le menu « Les chemins », en haut à droite, liste chaque carrefour et les routes annexes qui en partent, puis « Rejoindre » ; il se construit à partir de `SIDES` dans `src/main.jsx` : une nouvelle route annexe y apparaît dès qu’elle y est déclarée. Les liens #bureau et #inscription y conduisent aussi directement.

## Choix des outils

- **React + Vite** : contenu accessible en HTML, développement rapide et livraison statique portable.
- **Three.js** : contrôle direct de la route, de la caméra et de la végétation instanciée avec peu d’appels de dessin.
- **GSAP / ScrollTrigger** : composition et décomposition réversibles des lettres, synchronisées avec le parcours.
- **Lenis** : inertie de défilement sur ordinateur, intégrée à la même horloge que GSAP ; défilement natif sur téléphone.
- **Blender 5.2** : logo en courbes Bézier, relief et biseaux lisses, export glTF pour le navigateur.
- **Shaders GLSL** : vent, brume, découpe de la végétation et réaction au curseur, sans post-traitement coûteux.

## Fichiers clés

- `src/route.js` : tracé commun aux routes (principale et annexes), à la caméra et au dégagement du terrain.
- `src/scene.js` : environnement et rendu 3D.
- `src/main.jsx` : contenu, navigation et animations.
- `notes/uossa-logo-relief.blend` : logo éditable ; la scène active contient les dernières courbes lissées.
- `notes/build_logo_blender.py` et `notes/logo-contours.json` : reconstruction reproductible du modèle.
- `public/models/uossa-logo-relief.glb` : modèle web final, trois matériaux.
- `notes/PROJECT-NOTES.md` : sources, stratégies de performance et limites des tests.

Le logo utilise le JPEG 360 × 434 fourni ensuite par l’utilisateur. Le fichier de fond initial demandé sous `/mnt/data/` n’était pas disponible ; l’environnement a été créé séparément. Aucun contact, événement ni chiffre d’adhésion n’a été inventé. Aucun site public n’a été publié.
