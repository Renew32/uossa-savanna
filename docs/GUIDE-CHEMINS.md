# Guide : faire évoluer la route

Ce guide explique comment modifier un texte ou une photo, ajouter un chapitre (faire continuer la route) et ajouter une route annexe (un nouveau chemin depuis un carrefour). Les étapes ont été testées en ajoutant pour de vrai une troisième route et deux chapitres, puis en les retirant.

## 1. Où se trouve quoi

| Fichier | Ce qu’il contient |
| --- | --- |
| `src/content.js` | **Le contenu** : liste des chapitres, routes annexes (nom, carrefour de départ, chapitre d’arrivée, photos, panneaux), liens Instagram et formulaire. C’est le fichier à modifier en premier. |
| `src/route.js` | **Le tracé** : forme de la route principale, forme de chaque route annexe (virage, longueur, emplacement des panneaux), longueur totale de la route. |
| `src/main.jsx` | **La page** : le texte de chaque chapitre (`<section>`), les boutons des carrefours, le contenu défilant de chaque route annexe (`<SideLayer>`). |
| `src/scene.js` | **La 3D** : décor, panneaux, logo, caméra. Il lit `content.js` et `route.js` : en principe, il n’y a rien à y toucher pour ajouter du contenu. |
| `src/style.css` | **L’apparence**, découpée en sections commentées (`/* ── Ensemble … ── */`, `/* ── Le carrefour … ── */`, etc.). |
| `public/` | Photos, polices, textures, modèle 3D du logo. |

Le menu « Les chemins », les cartes « autres chemins à explorer », le rail des chapitres à droite, la barre du bas, les panneaux indicateurs 3D aux carrefours et les arrêts de la caméra se construisent **automatiquement** à partir de `content.js` et `route.js`.

## 2. Travailler et vérifier

```bash
npm run dev
```

Ouvrir http://127.0.0.1:5173. La page se recharge à chaque enregistrement. Avant de publier, vérifier aussi :

- sur téléphone (ou dans le mode téléphone du navigateur) ;
- avec le bouton « Animation réduite » : les photos s’affichent alors dans les cartes, sans 3D ;
- la console du navigateur : un message y apparaît si une route annexe n’a pas de tracé.

Publication : voir « Publier sur GitHub Pages » dans `README.md`.

## 3. Changer un texte, un lien ou une photo

- **Texte d’un chapitre** : dans `src/main.jsx`, chercher la phrase et la modifier. Les grands titres animés s’écrivent `<Kinetic text="PLUS QU’UNE ASSO." />` (une ligne par `Kinetic`, `italic` pour la ligne dorée en italique).
- **Lien Instagram ou formulaire** : `INSTAGRAM` et `MEMBERSHIP_FORM` dans `src/content.js`.
- **Photo** : remplacer le fichier dans `public/` en gardant le même nom, ou changer le chemin dans `src/content.js` (`BUREAU_PHOTOS`). Format conseillé : **WebP, 1080 × 607 px** (c’est le format des panneaux).
- **Flèche ↗** : dans `main.jsx`, chaque ↗ est suivi d’un caractère invisible (U+FE0E) qui empêche l’iPhone d’afficher un emoji bleu. Pour ajouter une flèche, copier-coller une flèche existante plutôt que la taper.

## 4. Ajouter un chapitre (faire continuer la route)

Exemple : ajouter un chapitre « Agenda » après « Ensemble ».

**a. Le déclarer** dans `src/content.js`, à sa place dans le voyage :

```js
export const CHAPTERS = [
  …
  { id: "ensemble", label: "Ensemble" },
  { id: "agenda", label: "Agenda" },
];
```

`id` est l’ancre de la section (`#agenda`) ; `label` s’affiche dans la barre du bas.

**b. Écrire la section** dans `src/main.jsx`, dans `<main id="journey">`, à la même place. Le plus simple est de copier un chapitre existant :

```jsx
<section tabIndex={-1} className="chapter teranga" id="agenda" aria-labelledby="agenda-title">
  <div className="chapter-content">
    <div className="eyebrow reveal">06 / AGENDA</div>
    <h2 id="agenda-title">
      <Kinetic text="NOS PROCHAINS" />
      <Kinetic text="rendez-vous." italic />
    </h2>
    <p className="body-copy reveal">Le texte du chapitre.</p>
  </div>
</section>
```

- La classe de la section donne la mise en page : `teranga` (texte à gauche), `roots` (texte décalé), `crossroads` (un carrefour, voir la partie 5) ou `together` (dernier chapitre, texte centré avec le pied de page).
- Le numéro du sur-titre (« 06 / … ») s’écrit à la main : penser à renuméroter les suivants.
- **Si le nouveau chapitre devient le dernier**, y déplacer le pied de page (`<footer>…</footer>`, à la fin de « Ensemble ») et lui donner la classe `together`, qui garde le pied de page au-dessus de la barre du bas.
- Pour un lien vers ce chapitre : `onClick={(e) => jump(e, "agenda")}` avec `href="#agenda"`.

**c. Allonger la route**, si le chapitre est ajouté à la fin : dans `src/route.js`, augmenter `ROAD_AFTER_LAST_JOIN`. Il vaut 8 aujourd’hui, et la route principale fait environ 40 m par chapitre : compter **+40 par chapitre ajouté** (48 pour un chapitre de plus, 88 pour deux). Le sol, les arbres, l’herbe et la caméra suivent automatiquement.

Un chapitre ajouté **au milieu** (entre deux chapitres existants) n’a pas besoin de route en plus : la caméra répartit le trajet existant.

## 5. Ajouter une route annexe

Exemple testé : une route « Nos événements » qui part à gauche d’un nouveau carrefour « Agenda » et rejoint la route principale au chapitre suivant.

### Les règles à respecter

1. **Un seul nom partout.** Le nom de la route (ici `evenements`, sans accent ni espace) doit être identique dans `content.js` (`SIDES`), `route.js` (`SIDE_PATHS`), `main.jsx` (`<SideLayer id="evenements">`, `data-side="evenements"` sur le bouton du carrefour, `id="evenements-road-title"` sur son titre) et dans l’adresse (`#evenements`).
2. **Une route par carrefour.** Le chapitre de départ (`fork`) ne sert qu’à une seule route annexe.
3. **Les routes se suivent sans se croiser.** Une route annexe doit partir *après* que la précédente a rejoint la route principale : son chapitre de départ vient après le chapitre d’arrivée (`join`) de la précédente, et son `forkZ` est plus loin sur la route.
4. **Un panneau = une photo.** Le nombre de panneaux dans `route.js` est égal au nombre de photos dans `content.js`, et au nombre d’arrêts dans la page.

### Étape 1 — Le contenu (`src/content.js`)

Ajouter le chapitre de départ et, si besoin, le chapitre d’arrivée dans `CHAPTERS` (partie 4), puis la route dans `SIDES` :

```js
evenements: {
  fork: "agenda", join: "a-bientot",          // carrefour de départ, chapitre où elle revient
  label: "Nos événements", arrow: "←",        // nom et flèche dans le menu « Les chemins »
  tagline: "PARTICIPER",                      // petite ligne au-dessus du nom dans les cartes
  signpost: { left: "ÉVÉNEMENTS", right: "LA ROUTE" }, // panneau indicateur 3D au carrefour
  boards: [                                   // une photo par panneau, dans l’ordre
    { src: asset("evenements/01.webp"), alt: "Soirée d’accueil 2026" },
  ],
  finale: { photo: asset("evenements/fin.webp") },  // panneau du bout : une photo…
  // finale: { sign: { title: "ÉVÉNEMENTS", subtitle: "& ACTIVITÉS", year: "2026–2027" } },  // …ou un panneau peint avec le logo
},
```

Mettre les photos dans `public/evenements/` (1080 × 607 px, WebP).

### Étape 2 — Le tracé (`src/route.js`)

Ajouter une ligne dans `SIDE_PATHS` :

```js
evenements: sidePath({ forkZ: -240, side: 1, turn: 15, leg: 22, hairpin: 8, merge: 15, gap: 12,
  boards: [[11, 1]] }),
```

| Réglage | Rôle | Valeurs actuelles |
| --- | --- | --- |
| `forkZ` | Où la route quitte la route principale. La route principale part de 35 et avance vers les nombres négatifs. | bureau −52,4 · inscription −150 |
| `side` | `1` = part à gauche, `-1` = part à droite. | bureau 1 · inscription −1 |
| `turn` | Rayon du virage de sortie. | 15 |
| `leg` | Longueur de la ligne droite qui porte les panneaux. Elle doit contenir tous les panneaux. | bureau 46 · inscription 14 |
| `hairpin` | Rayon du demi-tour au bout. | 8 à 10 |
| `merge` | Rayon du virage de retour sur la route principale. | 15 |
| `gap` | Distance entre la fin de la ligne droite et le panneau final. | 12 à 13 |
| `boards` | Un `[distance, côté]` par panneau : distance depuis le début de la ligne droite, `1` = panneau à gauche, `-1` = à droite. Garder environ 14 m entre deux panneaux. | bureau `[[9, 1], [23, -1], [37, 1]]` |

Repères utiles pour choisir `forkZ` :

- le bureau revient sur la route principale vers −103 ;
- l’inscription y revient vers −194 ;
- la route principale s’arrête aujourd’hui à −202 (8 m après la dernière arrivée).

Une nouvelle route doit partir **au moins 15 m après** l’arrivée de la précédente, par exemple `forkZ: -240` après l’inscription. Elle revient sur la route principale environ 45 m plus loin. Si elle est la dernière, régler ensuite `ROAD_AFTER_LAST_JOIN` (partie 4c) pour que la route continue après elle.

Le décor couvre environ 250 m à gauche et 210 m à droite de la route : garder des routes annexes de taille comparable aux actuelles.

### Étape 3 — Les boutons du carrefour (`src/main.jsx`)

Dans la section du chapitre de départ (classe `crossroads`), après le texte, mettre deux boutons : la route annexe d’un côté, la suite de la route principale de l’autre. Copier ceux du « Carrefour » :

```jsx
<div className="fork-arrows" role="group" aria-label="Choisir un chemin">
  <button className="fork-arrow left" data-side="evenements" onClick={(e) => openRoute(e, "evenements")}>
    <span className="fork-circle" aria-hidden="true">←</span>
    <span><small>À GAUCHE</small>Nos événements<em>Participer</em></span>
  </button>
  <button className="fork-arrow right" onClick={(e) => jump(e, "a-bientot")}>
    <span><small>À DROITE</small>Continuer la route<em>À bientôt</em></span>
    <span className="fork-circle" aria-hidden="true">→</span>
  </button>
</div>
```

Pour une route qui part à droite, inverser : `fork-arrow right` avec `data-side`, la flèche → et le texte « À DROITE ».

### Étape 4 — Le parcours de la route annexe (`src/main.jsx`)

Après `</main>`, à côté des deux `<SideLayer>` existants, ajouter celui de la nouvelle route. Chaque `<section className="branch-stop …">` est un écran de défilement, et la caméra s’arrête devant un panneau à chaque écran. Il faut **dans l’ordre** :

1. une introduction ;
2. une section par panneau (`card-left` si le panneau est à gauche, `card-right` s’il est à droite) ;
3. le panneau final.

Les écrans du retour sur la route principale sont ajoutés automatiquement.

```jsx
<SideLayer id="evenements" open={layer === 'evenements'} layerRef={layers.evenements}
  onScroll={onLayerScroll('evenements')} onBack={closeRoute}
  label="UOSSA · AESUO / NOS ÉVÉNEMENTS" destination="À bientôt">
  <section className="branch-stop branch-intro">
    <div className="branch-card intro">
      <div className="eyebrow">À GAUCHE / LES ÉVÉNEMENTS</div>
      <h2 id="evenements-road-title"><span className="line">ÉVÉNEMENTS</span><span className="line serif">Venez nombreux.</span></h2>
      <p className="body-copy">Une phrase d’introduction.</p>
      <span className="branch-hint"><span className="circle-arrow" aria-hidden="true">↓</span>SCROLLEZ POUR LONGER LE CHEMIN</span>
    </div>
  </section>
  <section className="branch-stop card-left">
    <figure className="branch-card">
      <img className="branch-photo" src={SIDES.evenements.boards[0].src} alt="" width="1080" height="607" loading="lazy" />
      <figcaption>{SIDES.evenements.boards[0].alt}</figcaption>
    </figure>
  </section>
  <section className="branch-stop branch-finale">
    <div className="branch-card finale">
      <span className="branch-count">AU BOUT DU CHEMIN</span>
      <h3>Nos événements 2026–2027.</h3>
      <div className="branch-actions">
        <button onClick={() => continueRoad('evenements')}>Continuer la route →</button>
        <button onClick={closeRoute}>← Revenir au carrefour</button>
      </div>
    </div>
  </section>
</SideLayer>
```

- `destination` : le nom du chapitre où la route revient, affiché pendant le retour.
- `<img className="branch-photo">` n’apparaît qu’en « Animation réduite » ou sans 3D, quand les panneaux ne sont pas visibles.
- Le bouton « Agrandir la photo » du bureau ouvre la visionneuse `BoardLightbox`, qui ne montre aujourd’hui que les photos du bureau (`BUREAU_PHOTOS`).

### Étape 5 — Ce qui ne se met pas à jour tout seul

- « **DEUX** AUTRES CHEMINS À EXPLORER » (composant `OtherRoads` dans `main.jsx`) et « **DEUX** CHEMINS. » au carrefour : à réécrire à la main s’il y a trois routes.
- Les liens du haut de page (« Notre esprit », « Nos racines », « Le bureau ») : à ajouter à la main si besoin, dans `<nav className="top-nav">`.

Tout le reste se met à jour automatiquement : le menu « Les chemins », les cartes « autres chemins » (numérotées dans l’ordre du voyage), le panneau indicateur 3D, les panneaux photo, le panneau final, le rail des chapitres et le trajet de la caméra.

## 6. Modifier une route existante

- **Déplacer un panneau** : changer sa distance dans `boards` (`route.js`), en gardant la ligne droite (`leg`) assez longue.
- **Ajouter un panneau au bureau** : ajouter la photo à la fin de `BUREAU_PHOTOS` (`content.js`), avec sa légende dans `alt` ; les panneaux du bureau en sont tirés. Puis ajouter un `[distance, côté]` dans `SIDE_PATHS.bureau.boards` (`route.js`), allonger `leg` d’environ 14, et ajouter le numéro de la photo dans `branchOrder` (`main.jsx`), avant le `0` final (par exemple `[1, 2, 3, 4, 0]`). Les cartes du bureau sont générées à partir de cette liste.
- **Changer le carrefour de départ** : changer `fork` dans `content.js` *et* `forkZ` dans `route.js`, puis déplacer les boutons du carrefour dans la bonne section.

## 7. En cas de problème

- **Une route annexe ne s’ouvre pas, ou la console affiche « ajouter son tracé dans SIDE_PATHS »** : le nom n’est pas identique partout (règle 1).
- **La caméra saute ou recule** : la nouvelle route part trop tôt (règle 3). Éloigner son `forkZ` de l’arrivée de la précédente.
- **La caméra ne s’arrête pas devant chaque panneau** : le nombre de sections `branch-stop` ne correspond pas au nombre de panneaux (règle 4).
- **Le bout de la route est vide ou coupé** : augmenter `ROAD_AFTER_LAST_JOIN`.
- **Un élément en recouvre un autre** : les règles de chaque partie sont regroupées dans `src/style.css` sous un titre `/* ── … ── */`. Pour « Ensemble », la colonne s’agrandit d’elle-même si le texte est plus long : il suffit d’ajouter le contenu avant le `<footer>`.
