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

## Publier sur GitHub Pages

Le site est publié sur https://renew32.github.io/uossa-savanna/ (branche `gh-pages` du dépôt `Renew32/uossa-savanna`). Les fichiers publics passent par `import.meta.env.BASE_URL`, donc le même code marche à la racine en local et sous `/uossa-savanna/` en ligne. Pour republier :

```sh
npx vite build --base=/uossa-savanna/ --outDir /tmp/uossa-pages --emptyOutDir
rsync -a --exclude uossa-original.jpg public/ /tmp/uossa-pages/ && touch /tmp/uossa-pages/.nojekyll
cd /tmp/uossa-pages && git init -q -b gh-pages && git add -A && git commit -qm "Publication" \
  && git push -f https://github.com/Renew32/uossa-savanna.git gh-pages
```

## Contrôles

Défiler pour avancer sur la route ; utiliser les liens pour changer de chapitre. Le curseur influence légèrement la caméra et le vent. Le bouton « Animation réduite » fige la caméra et les effets. La préférence système de réduction des mouvements est également respectée. Navigation clavier et lien d’évitement inclus. Instagram reste disponible en bas à droite.

Deux carrefours jalonnent la route. Au premier (« Le carrefour »), la flèche gauche prend la route du bureau exécutif : trois planches de portraits au bord du chemin (à gauche, à droite, à gauche), puis la photo de groupe au bout, au milieu de la route. Au second (« Votre place »), la flèche droite prend la route de l’inscription et du recensement, qui se termine devant le panneau du formulaire. Chaque route annexe se défile comme le parcours principal ; au bout, elle revient rejoindre la route principale (avant « Nos racines » pour le bureau, avant « Ensemble » pour l’inscription). « Retour au carrefour » ou Échap ramène la caméra au carrefour. Le menu « Les chemins », en haut à droite, liste les routes annexes (« Le bureau exécutif », « Inscription & recensement »), puis « Rejoindre » ; il se construit à partir de `SIDES` dans `src/main.jsx` : une nouvelle route annexe y apparaît dès qu’elle y est déclarée. Les liens #bureau et #inscription y conduisent aussi directement.

## Téléphone

- À l’arrêt (devant un panneau, au carrefour, à l’accueil), la scène est rendue à la pleine densité de l’écran (jusqu’à 2) pour des photos nettes, puis revient à une densité plus légère dès que la caméra bouge ou qu’on touche l’écran.
- Photo agrandie : plein écran, double-toucher pour zoomer à 2,5× et se déplacer dans la photo, balayage pour changer de photo.
- Sur l’accueil, le logo 3D se place à droite du titre et l’accompagne pendant l’accueil, puis on passe dessous en entrant dans le chapitre suivant.
- Mise en page dédiée au téléphone tenu à l’horizontale ; zones tactiles d’au moins 44 px ; marges pour l’encoche et la barre d’accueil.
- Aperçu au partage (image `public/og-image.jpg`, adresse absolue dans `index.html`) et icône d’écran d’accueil.

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
