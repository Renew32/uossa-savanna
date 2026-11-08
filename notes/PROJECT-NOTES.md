# Notes du projet — 29 septembre 2026

## Direction et mise en œuvre

Quatre chapitres dans une savane à l’heure dorée, avec identité sénégalaise, lion, téranga et liens entre Dakar et Ottawa. La caméra avance sur 208 unités le long du même tracé sinusoïdal que la route. Elle regarde 16 unités devant elle pour aborder les virages. Le terrain possède un relief doux et la route des ornières et des bordures irrégulières.

Le décor est hybride : route et terrain en maillage 3D, végétation photographique générée sur plans découpés instanciés, herbes géométriques, pierres et particules. Les arbres ont une position dans le monde et une parallaxe réelle ; ce ne sont pas des arbres botaniques entièrement modélisés. Leur orientation suit la caméra. Un seuil alpha évite les halos et le tri des transparences. L’atmosphère distante provient désormais d’un panorama photographique réel : Safari Sunset de Poly Haven.

## Logo Blender

Le JPEG utilisateur 360 × 434 est conservé dans `public/uossa-logo-2026.jpg`. Ses trois régions colorées ont été tracées, avec nettoyage du bruit de pixels avant conversion en courbes Bézier. Les tangentes automatiques lissent les arcs ; les pointes intentionnelles restent anguleuses. Biseaux fins, normales lissées sur les côtés, faces frontales planes. Les courbes éditables sont enregistrées dans le fichier Blender avant conversion pour l’export.

Le GLB final contient uniquement les trois maillages de la scène active et pèse environ 1,39 Mo. Le support et le logo tournent ensemble pour éviter toute intersection. La scène active du `.blend` est la dernière version ; les scènes des essais précédents restent disponibles.

## Choix des bibliothèques et sources

- React 19.3 + [Vite 7.3](https://vite.dev/guide/) : une couche de contenu accessible et une compilation statique simple.
- [Three.js r180](https://threejs.org/docs/pages/InstancedMesh.html) : contrôle du budget de dessin, géométrie instanciée et shaders sans couche de rendu supplémentaire.
- [GSAP 3.15 / ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) : une progression partagée et des animations réversibles ; une seule timeline possède chaque groupe de lettres.
- [Lenis 1.3](https://github.com/darkroomengineering/lenis) : défilement fluide sur ordinateur, synchronisé à l’horloge GSAP, sans remplacer le défilement mobile.
- Blender 5.2 : courbes éditables et export glTF natif pour un logo fidèle et lisse.
- GLSL personnalisé : vent, brume et particules sans passes de post-traitement. Aucun bloom, profondeur de champ, moteur physique ni ombres dynamiques.

Versions exactes verrouillées dans `package-lock.json`. Three r180 est conservé pour sa compatibilité WebGL ; ce choix ne prétend pas être la dernière version publiée.

## Sources des éléments visuels

- Logo : image fournie par l’utilisateur, conservée sans modification ; modèle dérivé de ses contours.
- Panorama : généré avec ImageGen, original `savanna-source.png`, version runtime `public/savanna.webp`.
- Acacia et touffe d’herbe : deux images générées avec ImageGen, sujets isolés au rendu photographique, lumière chaude de fin de journée, converties en WebP avec transparence. Ce ne sont pas des photographies documentaires d’un lieu précis.
- Terre : [Dry Mud Field 001 — Poly Haven](https://polyhaven.com/a/dry_mud_field_001), textures diffuse et normale OpenGL en 1K, [licence CC0](https://polyhaven.com/license).
- Barlow Condensed, Cormorant Garamond, Manrope : fichiers locaux, licences dans `font-licenses/`.
- L’ancien petit logo reste archivé mais n’est pas utilisé dans le site. Le panorama initial demandé sous `/mnt/data/` n’a pas été récupéré.

## Performance et dégradation

Une seule horloge GSAP anime Lenis et Three.js, sans mise à jour React à chaque image. Rendu suspendu dans les onglets cachés. Végétation en quelques appels de dessin, textures locales, aucune requête externe nécessaire en fonctionnement.

DPR plafonné à 1,55 sur ordinateur et 1,15 sur téléphone. Si plus de 28 % des intervalles dépassent 22 ms pendant quatre secondes, le DPR diminue par pas de 0,2 jusqu’à 0,8. Mobile : 55 arbres contre 100, 4 200 touffes contre 12 000, 2 500 brins contre 7 000, 100 particules contre 320. Les petits écrans privilégient le flux de lecture aux compositions fixes.

Le mode réduit fige caméra, vent et particules, désactive les transformations de texte et ne redessine qu’en cas de changement. Une image CSS prend le relais en cas d’échec ou de perte WebGL ; le contenu reste HTML.

## Validation

Compilation de production réussie. Parcours testé dans le navigateur local : navigation vers les racines et retour à l’accueil, toutes les lettres restaurées à opacité 1, logo entier, route et virages visibles. Contrôles à 390 × 844 et 320 × 568 : aucun débordement horizontal. Mode réduit vérifié : caméra fixe, seulement quelques rendus au chargement et lors des changements. Console sans erreur lors du contrôle du décor.

Sur cette machine, les échantillons de 600 intervalles de l’horloge d’animation ont indiqué environ 8 ms de médiane et 9 ms au 95e percentile, sur ordinateur et en simulation mobile. Ce sont des mesures de cadence, pas des temps GPU ni une garantie de 60 fps sur tous les appareils. Aucun test sur téléphone physique ni trace GPU détaillée n’a été réalisé.

Diagnostic local : `document.querySelector('canvas').dataset.performance` fournit les intervalles, appels de dessin, triangles, DPR, mode et position de caméra. Aucune télémétrie n’est envoyée.

Corrections effectuées pendant les essais : suppression des arbres polygonaux, texture de terre réelle, correction de la conversion colorimétrique de la route, nettoyage des contours du logo, export limité à la scène active, rotation commune au support et au logo, timeline unique par titre pour rétablir le retour arrière.

Le build conserve les fichiers déjà présents et identiques pour éviter une restriction locale de réécriture des images jointes. Pour une publication, compiler depuis une extraction neuve du ZIP afin d’obtenir un dossier `build/` sans fichiers historiques.

## Révision du réalisme — 29 septembre

Le ciel généré orangé est remplacé par [Safari Sunset](https://polyhaven.com/a/safari_sunset), photographie panoramique de Dimitrios Savva, traitement de Jarod Guest, licence CC0. Version WebP 4096 × 2048, 1,87 Mo. Projection sphérique correcte ; pas de déformation animée du ciel. Le panorama reste fixe à l’infini et la route conserve son parcours en 3D.

Herbes plus courtes et plus denses près de la route, tailles et largeurs variées, couleur et assombrissement à la base, ombres de contact sous les arbres, brume réduite et plus neutre. Les touffes éloignées sont exclues du rendu au-delà de 125 unités pour réduire le coût. Les acacias et herbes proches restent des éléments générés sur plans découpés : le résultat est un décor hybride, pas une reconstruction photogrammétrique complète. Le panorama montre une savane africaine et n’est pas présenté comme une photographie du Sénégal.

Validation du 29 septembre : compilation réussie, parcours aller-retour dans le navigateur et écran 390 × 844 sans débordement ni erreur console. Cette session mesure environ 33 ms médiane / 34–35 ms p95, soit environ 30 images/s, même après réduction de densité et baisse automatique du DPR. La cause exacte n’a pas été isolée ; les mesures précédentes de 8–9 ms sont historiques et ne valident pas 60 fps pour cette révision.

## Bureau et inscription

Le parcours compte désormais six étapes : esprit, téranga, racines, bureau, inscription, ensemble. La photo de groupe 2026–2027 provient de la publication fournie https://www.instagram.com/p/DdUvimikW-1/ ; crédit photographique indiqué : @posetapierre.visuel. La présentation complète des membres reste accessible dans le carrousel officiel. Aucun nom ni rôle individuel n’a été inventé.

L’étape inscription ouvre le formulaire officiel fourni, intitulé « UOSSA - Inscription et recensement des membres 2026-2027 ». Le lien Instagram permanent en bas à droite mène au profil vérifié dans la publication : https://www.instagram.com/uossa.aesuo/. Ces liens ouvrent un nouvel onglet avec protection noopener/noreferrer. Aucune réponse au formulaire n’a été envoyée.

Validation : compilation réussie, transitions Bureau → Inscription et navigation mobile vérifiées, destinations des trois liens contrôlées, aucun débordement à 390 px ni erreur console.

## Organisation finale : parcours secondaires

Le voyage principal revient à quatre chapitres. Bureau et Inscription sont des destinations distinctes (#bureau, #inscription), présentées dans un écran plein format accessible avec retour explicite. Elles ne prolongent plus le défilement principal. Des panneaux de choix sont proposés à l’accueil et à la fin du voyage ; le menu donne un accès direct. Ce compromis conserve l’immersion de la landing page tout en permettant l’accès rapide aux informations pratiques.

Implémentation : dialogue modal natif (focus contenu, arrière-plan inerte, fermeture Échap), arrêt Lenis et pause du rendu 3D pendant la consultation, historique navigateur et liens directs, restauration de la position de lecture. Liens externes officiels inchangés.

Validation : compilation réussie ; entrée Bureau, passage Inscription, retour au même scrollY (2546 px avant et après), quatre sections dans le trajet principal ; affichage mobile à 390 px sans débordement, fermeture Échap, panneaux d’accueil contrôlés visuellement.

## Galerie du bureau — 29 septembre 2026
- Les huit images du carrousel officiel https://www.instagram.com/p/DdUvimikW-1/?img_index=1 contiennent des visages et sont maintenant présentées sur le parcours Bureau : couverture de groupe, puis les sept images suivantes dans leur ordre original.
- Photographies créditées à @posetapierre.visuel. Fichiers locaux WebP, proportions conservées sans recadrage, chargement différé des images de galerie.
- Agrandissement par dialogue accessible, boutons précédent/suivant et navigation au clavier. Échap ferme uniquement l’agrandissement et conserve le parcours Bureau.
- Validation : compilation de production réussie ; les sept nouvelles images chargent ; navigation 2 → 3 et fermeture vérifiées ; affichage ordinateur 1440 × 900 et mobile 390 × 844 contrôlés ; aucun débordement horizontal sur mobile et aucune erreur/alerte console dans la session de vérification.

## Carrefours et routes annexes — 8 novembre 2026

- Le parcours principal compte six chapitres : esprit, téranga, carrefour, racines, votre place, ensemble. La caméra s’arrête quelques mètres avant chaque fourche tant que la section du carrefour est à l’écran ; les flèches HTML proposent le choix.
- Routes annexes (`SIDE_PATHS` dans `src/route.js`) : chaque route quitte la principale en tangente, tourne vers la savane, longe ses panneaux, finit en épingle devant le panneau final, puis revient se fondre dans la route principale plus loin (bureau : avant « Nos racines » ; inscription : avant « Ensemble »). Le raccord est exact (écart inférieur à 1 cm) et la caméra passe de la route annexe à la principale sans saut.
- Raccords : une route annexe n’écrit pas dans le tampon de profondeur et s’efface à l’intérieur de la route principale ; la principale reste entière et l’annexe sort de son accotement, sans ornières doublées.
- Bureau : trois planches de portraits en alternance (gauche, droite, gauche), puis la photo de groupe au bout du chemin, au milieu de la route. Inscription : un panneau peint (logo et « Inscription & recensement 2026–2027 »), le lien vers le formulaire officiel restant dans la fiche HTML.
- Une couche HTML transparente défile par-dessus la scène : chaque écran correspond à un arrêt de caméra, les trois derniers à la route de retour. Au bout, la page reprend la route principale à l’endroit du raccord. Le cadrage vise chaque panneau à côté de sa fiche sur ordinateur et au-dessus de celle-ci sur téléphone ; arbres et grandes herbes sont écartés des lignes de vue.
- Performances : cadres, liserés et pieds des panneaux fusionnés en trois appels de dessin ; photos et pancartes ignorées au-delà de 140 unités ; textures envoyées au GPU dès leur chargement. Rendu chronométré (60 images synchronisées, même vue, même machine) : ordinateur 4,1 à 4,6 ms contre 3,8 à 4,5 ms à l’origine ; émulation téléphone 1,1 à 1,2 ms contre 1,0 à 1,1 ms. Mesures sur le GPU d’un ordinateur, pas sur un vrai téléphone.
- Mode réduit et absence de WebGL : les photos s’affichent dans les fiches, les écrans de retour sont masqués et « Continuer la route » mène directement au chapitre suivant.
- Validation : compilation réussie ; sur 1440 × 900 et 390 × 844, carrefours, entrée et retour, chaque panneau, panneaux finaux, sortie vers la route principale, passage d’une route annexe à l’autre, liens #bureau et #inscription, menu et mode réduit contrôlés ; déplacement maximal de la caméra mesuré image par image. Le navigateur de test limitait parfois l’animation à quelques images par seconde : une partie des cadrages téléphone a été vérifiée par projection des coins des panneaux plutôt que par capture.

### Ajustements — 8 novembre 2026 (suite)

- Bureau : seules les images 1, 2, 3 et 8 du parcours sont gardées (planches `02`, `03`, `04`, puis la photo de groupe) ; les fichiers `05` à `08` restent dans `public/bureau/` mais ne sont plus affichés. La ligne droite du chemin passe de 60 à 46 unités ; le raccord avec la route principale ne bouge pas.
- Carrefours sur téléphone : les deux choix tiennent sur une seule ligne, en petits boutons (gauche et droite), placés sous le texte. Ils descendent en bas de l’écran quand il y a la place et ne passent jamais sur le texte. Sur les écrans courts (barres du navigateur affichées), le texte du carrefour démarre un peu plus haut.
- Accueil sur téléphone : le bloc « Deux autres chemins à explorer » tombait hors de l’écran, à droite (déjà le cas sur `main`), et Chrome mobile élargissait la page à 526 px (bouton « Rejoindre » et barre du bas hors écran). Il est maintenant masqué sur téléphone ; les mêmes liens restent dans « Ensemble » et aux carrefours. Largeur de page vérifiée égale à l’écran à 360, 390 et 430 px.
- Fiche finale du bureau : la ligne « Photographies : @posetapierre.visuel » et le bouton « Découvrir les membres sur Instagram » sont retirés, à la demande de l’utilisateur. Le crédit reste dans la galerie « Agrandir la photo » ; le lien Instagram du coin inférieur droit ne change pas.
- Routes annexes sans lien Instagram : retiré de la fiche finale de l’inscription (le lien du coin inférieur droit reste).
- Menu « Les chemins » : il remplace le bouton « Rejoindre » dans l’en-tête, qui devient la dernière entrée du menu. Il liste les routes annexes dans l’ordre du parcours (ni les carrefours ni la route principale n’y figurent). La liste est construite à partir de `SIDES` dans `src/main.jsx`. Il se ferme avec Échap, un clic à côté ou en quittant le menu au clavier. Les sept entrées ont été vérifiées sur ordinateur et téléphone, sans erreur console.
- Validation : captures Chrome en mode téléphone (390 × 844 et 390 × 664) et ordinateur (1440 × 900) des deux carrefours et des quatre arrêts du bureau ; positions mesurées à 360 × 640, 375 × 553 et 430 × 750 (aucun chevauchement, aucun débordement dans les boutons) ; aucune erreur console.

## Signaux web essentiels — 8 novembre 2026

Objectifs : LCP ≤ 2,5 s, INP < 200 ms, CLS < 0,1. Mesures sur la version de production (`npm run build` puis `npm run preview`), Chrome sans interface piloté par le protocole DevTools. Profil téléphone proche de Lighthouse : 412 × 823, processeur ralenti ×4, 4G lente (150 ms, 1,6 Mbit/s). Interactions réelles : menu, défilement, chapitre, carrefour, photo, Échap, retour, bouton d’animation.

| | Avant | Après |
|---|---|---|
| Téléphone — LCP | 2,49 s | 1,58 à 1,82 s |
| Téléphone — INP | 1 208 ms (bouton d’animation) | 96 à 152 ms |
| Téléphone — CLS | 0,012 | 0,012 |
| Ordinateur — LCP / INP / CLS | — | 0,52 à 0,64 s / 48 à 64 ms / 0,013 |

- LCP : le texte du titre attendait three.js (135 Ko compressés) avant de s’afficher. La scène 3D (`scene.js` et three.js) est maintenant chargée en parallèle du premier rendu (`import()` dynamique) ; le texte s’affiche sans l’attendre.
- INP : le bouton « Animation complète / réduite » reconstruisait toute la scène avant le rafraîchissement de l’écran. Le bouton change d’état tout de suite, et la reconstruction a lieu après l’image suivante.
- CLS : petits décalages des lettres lors du chargement des polices ; total bien sous 0,1.
- Limites : le rendu 3D tourne en logiciel (SwiftShader) dans ces mesures, plus lent qu’un vrai téléphone ; ce ne sont pas des données de terrain (PageSpeed Insights ou CrUX exigent un site public). Piste non faite : réduire les polices TTF (Cormorant italique 287 Ko) à l’alphabet latin.
