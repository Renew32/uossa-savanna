// ── Site content shared by the page (main.jsx) and the 3D scene (scene.js) ──
// Chapters of the main road, side roads, photos and links. The shape of the roads themselves
// (bends, crossroads, where the boards stand) lives in route.js.
// How to add a chapter or a side road: docs/GUIDE-CHEMINS.md.

// Public files, under the site's base path ("/" locally, "/uossa-savanna/" on GitHub Pages).
export const asset = (path) => import.meta.env.BASE_URL + path;

export const INSTAGRAM = "https://www.instagram.com/uossa.aesuo/";
export const MEMBERSHIP_FORM = "https://docs.google.com/forms/d/e/1FAIpQLSdVQuKM8SwVUPYUUSURm9zUutTQMpb09Y5CgUI9p-yBa1WDDg/viewform?pli=1";
export const LOGO = asset("uossa-logo-2026.jpg");

// Chapters of the main road, in the order of the journey. `id` is the #anchor of the matching
// <section> in main.jsx; `label` is shown in the bottom bar and the chapter rail.
export const CHAPTERS = [
  { id: "esprit", label: "L’esprit" },
  { id: "teranga", label: "La téranga" },
  { id: "carrefour", label: "Le carrefour" },
  { id: "racines", label: "Nos racines" },
  { id: "votre-place", label: "Votre place" },
  { id: "ensemble", label: "Ensemble" },
];
export const chapterIds = CHAPTERS.map((c) => c.id);
export const chapterIndex = (id) => chapterIds.indexOf(id);

// Bureau photos (1080 × 607 px), in the order of the photo viewer: the group photo, then the
// three boards along the bureau road.
export const BUREAU_PHOTOS = [
  { src: asset("bureau-2026-2027.webp"), alt: "Photo de groupe de l’équipe UOSSA 2026–2027" },
  { src: asset("bureau/02.webp"), alt: "Planche de portraits : coprésidence, président sortant et marketing" },
  { src: asset("bureau/03.webp"), alt: "Planche de portraits : vie interne, finances, événementiel et bénévoles" },
  { src: asset("bureau/04.webp"), alt: "Planche de portraits : projets, mentorat et équipe événementielle" },
];

// Side roads. The key is the road's name: its #anchor, its entry in SIDE_PATHS (route.js) and its
// <SideLayer id> in main.jsx.
//   fork      chapter whose crossroads the road leaves from
//   join      chapter where it merges back into the main road
//   label     name in the « Les chemins » menu; arrow: its arrow there
//   tagline   small line above the name in the « autres chemins » cards
//   signpost  the two arrows painted on the signpost at the crossroads (left, right)
//   boards    photos on the boards along the road, in order (one per board in route.js)
//   finale    the board at the end of the road: a photo, or a painted sign (title, subtitle, year)
export const SIDES = {
  bureau: {
    fork: "carrefour", join: "racines",
    label: "Le bureau exécutif", arrow: "←", tagline: "RENCONTRER",
    signpost: { left: "LE BUREAU", right: "LA ROUTE" },
    boards: BUREAU_PHOTOS.slice(1),
    finale: { photo: BUREAU_PHOTOS[0].src },
  },
  inscription: {
    fork: "votre-place", join: "ensemble",
    label: "Inscription & recensement", arrow: "→", tagline: "REJOINDRE",
    signpost: { left: "LA ROUTE", right: "INSCRIPTION" },
    boards: [],
    finale: { sign: { title: "INSCRIPTION", subtitle: "& RECENSEMENT", year: "2026–2027" } },
  },
};
// Side roads in the order of the journey (the menu, the « autres chemins » cards).
export const SIDE_ROADS = Object.keys(SIDES).sort((a, b) => chapterIndex(SIDES[a].fork) - chapterIndex(SIDES[b].fork));
