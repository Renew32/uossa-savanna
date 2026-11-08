import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { createSavanna } from "./scene.js";
import { FORK_PROGRESS, BRANCH_SPACING } from "./route.js";
import "./style.css";

gsap.registerPlugin(ScrollTrigger);
const chapters = ["L’esprit", "La téranga", "Le carrefour", "Nos racines", "Ensemble"];
const chapterIds = ["esprit", "teranga", "carrefour", "racines", "ensemble"];
const FORK_INDEX = 2;
const TEAM_POST = "https://www.instagram.com/p/DdUvimikW-1/?img_index=1";
const INSTAGRAM = "https://www.instagram.com/uossa.aesuo/";
const MEMBERSHIP_FORM = "https://docs.google.com/forms/d/e/1FAIpQLSdVQuKM8SwVUPYUUSURm9zUutTQMpb09Y5CgUI9p-yBa1WDDg/viewform?pli=1";
const Star = () => (
  <svg viewBox="0 0 40 40" aria-hidden="true">
    <path
      d="m20 3 4 12.5h13L26.5 23l4 12.5L20 28l-10.5 7.5 4-12.5L3 15.5h13Z"
      fill="currentColor"
    />
  </svg>
);
function Kinetic({ text, italic = false }) {
  return (
    <span className={`line ${italic ? "serif" : ""}`} aria-label={text}>
      <span aria-hidden="true">
        {[...text].map((c, i) => (
          <span className="letter" key={i}>
            {c === " " ? "\u00a0" : c}
          </span>
        ))}
      </span>
    </span>
  );
}
const boardImages = [
  {src:'/bureau-2026-2027.webp',alt:'Photo de groupe de l’équipe UOSSA 2026–2027'},
  {src:'/bureau/02.webp',alt:'Planche de portraits : coprésidence, président sortant et marketing'},
  {src:'/bureau/03.webp',alt:'Planche de portraits : vie interne, finances, événementiel et bénévoles'},
  {src:'/bureau/04.webp',alt:'Planche de portraits : projets, mentorat et équipe événementielle'},
  {src:'/bureau/05.webp',alt:'Photographies de membres du bureau pendant la séance photo'},
  {src:'/bureau/06.webp',alt:'Photographies de groupe entre deux prises'},
  {src:'/bureau/07.webp',alt:'Portraits et photographies de groupe de l’équipe'},
  {src:'/bureau/08.webp',alt:'Photographie du bureau exécutif réunissant six membres'},
];
// Order along the left-hand track: seven boards beside the road, then the group photo as the finale.
const branchOrder = [1, 2, 3, 4, 5, 6, 7, 0];
function BoardLightbox({selected,setSelected}){
  const viewer=useRef(null);
  useEffect(()=>{if(selected!==null){if(!viewer.current.open)viewer.current.showModal()}else if(viewer.current.open)viewer.current.close()},[selected]);
  const step=(delta)=>setSelected(i=>(i+delta+boardImages.length)%boardImages.length);
  return <dialog ref={viewer} className="board-lightbox" aria-label="Galerie du bureau exécutif" data-lenis-prevent onCancel={e=>{e.preventDefault();e.stopPropagation();setSelected(null)}} onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();step(1)}if(e.key==='ArrowLeft'){e.preventDefault();step(-1)}}}>
      <div className="lightbox-toolbar"><span>{selected!==null ? `${branchOrder.indexOf(selected)+1} / 8` : ''}</span><button onClick={()=>setSelected(null)} autoFocus>Fermer ×</button></div>
      {selected!==null&&<img src={boardImages[selected].src} alt={boardImages[selected].alt}/>}
      <div className="lightbox-navigation"><button onClick={()=>step(-1)}>← Précédente</button><button onClick={()=>step(1)}>Suivante →</button></div>
      <p className="gallery-credit">Photographies : @posetapierre.visuel · Publication UOSSA 2026–2027</p>
    </dialog>;
}
function App() {
  const canvas = useRef(null),
    api = useRef(null),
    navigate = useRef(null);
  const routeDialog = useRef(null), smoothScroll = useRef(null), returnHash = useRef('#esprit');
  const stateRef = useRef(null), branchLayer = useRef(null), branchOpen = useRef(false), calmRef = useRef(false);
  const [photo, setPhoto] = useState(null);
  const [route, setRoute] = useState(() => ['#bureau','#inscription'].includes(location.hash) ? location.hash.slice(1) : null);
  const routeRef = useRef(route); routeRef.current = route;
  const openRoute = (event, name) => {
    event.preventDefault();
    if (name === 'bureau') returnHash.current = '#carrefour';
    else if (!route) returnHash.current = location.hash || '#esprit';
    history.pushState({secondaryRoute:true}, '', '#' + name);
    setRoute(name);
  };
  const closeRoute = () => {
    history.replaceState(null, '', returnHash.current);
    setRoute(null);
  };
  useEffect(() => {
    const sync = () => setRoute(['#bureau','#inscription'].includes(location.hash) ? location.hash.slice(1) : null);
    window.addEventListener('popstate',sync); window.addEventListener('hashchange',sync);
    return () => {window.removeEventListener('popstate',sync);window.removeEventListener('hashchange',sync)};
  }, []);
  useEffect(() => {
    const dialog = routeDialog.current;
    if(route === 'inscription'){
      if(!dialog.open) dialog.showModal();
      smoothScroll.current?.stop();
      document.documentElement.classList.add('secondary-route');
      dialog.scrollTop=0;
      dialog.querySelector('button')?.focus({preventScroll:true});
    } else {
      if(dialog.open) dialog.close();
      document.documentElement.classList.remove('secondary-route');
      if(route !== 'bureau') smoothScroll.current?.start();
    }
  },[route]);
  const [isMobile, setIsMobile] = useState(
    () => matchMedia("(max-width: 760px)").matches,
  );
  useEffect(() => {
    const mq = matchMedia("(max-width: 760px)");
    const update = () => setIsMobile(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const [chapter, setChapter] = useState(0),
    [calm, setCalm] = useState(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [ready, setReady] = useState(false);
  useEffect(() => { document.documentElement.dataset.chapter = String(chapter); }, [chapter]);
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setCalm(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("calm", calm);
    let disposed = false;
    let lenis;
    const mobile = isMobile;
    const state = { progress: 0, pointer: { x: 0, y: 0 }, reduced: calm,
      branch: { blend: 0, s: 0, target: 0, snap: false } };
    stateRef.current = state; calmRef.current = calm;
    const scene = createSavanna(canvas.current, state, {
      mobile,
      calm,
      onReady: () => {
        if (!disposed) setReady(true);
      },
    });
    api.current = scene;
    if (!calm && !mobile) {
      lenis = new Lenis({ duration: 1.15, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      smoothScroll.current = lenis;
      if(routeRef.current)lenis.stop();
    }
    const sections = [...document.querySelectorAll(".chapter")];
    // The camera holds at the crossroads while its section is on screen.
    const fork = document.getElementById("carrefour");
    const hold = () => [fork.offsetTop - innerHeight * 0.1, fork.offsetTop + innerHeight * 0.45];
    let last = -1;
    const context = gsap.context(() => {
      ScrollTrigger.create({
        trigger: "#journey",
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          const y = self.scroll(), [a, b] = hold();
          const p = y <= a ? FORK_PROGRESS * (y - self.start) / Math.max(1, a - self.start)
            : y <= b ? FORK_PROGRESS
            : FORK_PROGRESS + (1 - FORK_PROGRESS) * (y - b) / Math.max(1, self.end - b);
          state.progress = Math.min(1, Math.max(0, p));
          document.querySelector(".progress-fill").style.transform =
            `scaleY(${self.progress})`;
          const index = sections.reduce(
            (current, section, i) =>
              window.scrollY + innerHeight * 0.35 >= section.offsetTop
                ? i
                : current,
            0,
          );
          if (index !== last) {
            last = index;
            setChapter(index);
          }
        },
      });
      if (!calm)
        sections.forEach((section, i) => {
          const letters = section.querySelectorAll(".letter");
          // One timeline owns each letter: returning from a deep link restores every glyph.
          const words = gsap.timeline({scrollTrigger: {
            trigger: section, start: i === 0 ? "top top" : "top 85%",
            end: "bottom 28%", scrub: .35,
          }});
          if (i === 0) words.set(letters, {yPercent:0, rotation:0, opacity:1}, 0);
          else words.fromTo(letters, {yPercent:110, rotation:8, opacity:0},
            {yPercent:0, rotation:0, opacity:1, duration:.28, stagger:{amount:.06}, ease:"power2.out"},0);
          if (i < sections.length - 1) words.to(letters, {yPercent:-65, rotation:-7, opacity:0,
            duration:.28, stagger:{amount:.06}, ease:"none"}, i === 0 ? .7 : .66);
          else words.to({}, {duration:.66});
          if (i < sections.length - 1)
            gsap.to(section.querySelector(".chapter-content"), {
              y: -90,
              opacity: 0,
              rotateX: 8,
              scale: 0.96,
              ease: "none",
              scrollTrigger: {
                trigger: section,
                start: "bottom 85%",
                end: "bottom 25%",
                scrub: true,
              },
            });
          gsap.fromTo(
            section.querySelectorAll(".reveal"),
            { y: 35, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              stagger: 0.1,
              scrollTrigger: {
                trigger: section,
                start: i === 0 ? "top 110%" : "top 55%",
                end: "top 20%",
                scrub: i === 0 ? false : 0.5,
              },
              duration: 0.8,
            },
          );
        });
    });
    const move = (e) => {
      if (!calm) {
        state.pointer.x = (e.clientX / innerWidth) * 2 - 1;
        state.pointer.y = 1 - (e.clientY / innerHeight) * 2;
      }
    };
    window.addEventListener("pointermove", move, { passive: true });
    navigate.current = (index) => {
      const top = sections[index].offsetTop;
      document.documentElement.dataset.navigation = "moving";
      const done = () => {
        document.documentElement.dataset.navigation = "idle";
      };
      if (lenis) lenis.scrollTo(top, { duration: 1.6, onComplete: done });
      else {
        window.scrollTo({ top, behavior: "instant" });
        done();
      }
    };
    const tick = (time) => {
      lenis?.raf(time * 1000);
      if (!document.hidden && routeRef.current !== 'inscription') scene?.render(time);
    };
    gsap.ticker.add(tick);
    const refresh = () => ScrollTrigger.refresh();
    document.fonts.ready.then(refresh);
    return () => {
      disposed = true;
      gsap.ticker.remove(tick);
      context.revert();
      lenis?.destroy();
      smoothScroll.current = null;
      scene?.dispose();
      window.removeEventListener("pointermove", move);
    };
  }, [calm, isMobile]);
  // ── The left-hand track: the camera turns off at the crossroads and scroll drives it. ──
  useEffect(() => {
    const st = stateRef.current, layer = branchLayer.current, html = document.documentElement;
    if (!st || !layer) return;
    const calmNow = calmRef.current;
    const forkTop = () => document.getElementById("carrefour").offsetTop + innerHeight * 0.15;
    if (route === 'bureau') {
      const reenter = branchOpen.current;
      branchOpen.current = true;
      const go = () => {
        if (routeRef.current !== 'bureau') return;
        html.classList.add('branch-mode');
        smoothScroll.current?.stop();
        gsap.killTweensOf(st.branch);
        if (!reenter) layer.scrollTop = 0;
        st.branch.target = layer.scrollTop / Math.max(1, layer.clientHeight) * BRANCH_SPACING;
        st.branch.snap = true;
        if (calmNow || reenter) st.branch.blend = 1;
        else gsap.to(st.branch, { blend: 1, duration: 1.6, ease: "power2.inOut" });
        layer.querySelector('.route-back')?.focus({ preventScroll: true });
      };
      const top = forkTop(), lenis = smoothScroll.current;
      if (reenter || calmNow || Math.abs(scrollY - top) < 6 || !lenis) {
        if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
        else window.scrollTo({ top, behavior: "instant" });
        ScrollTrigger.update();
        requestAnimationFrame(go);
      } else {
        // Drive to the crossroads first, then turn left.
        lenis.scrollTo(top, { duration: 1.5, force: true, onComplete: go });
      }
    } else if (branchOpen.current) {
      branchOpen.current = false;
      html.classList.remove('branch-mode');
      smoothScroll.current?.start();
      gsap.killTweensOf(st.branch);
      const finish = () => { st.branch.blend = 0; st.branch.s = st.branch.target = 0; };
      if (calmNow || st.branch.blend === 0) finish();
      else gsap.timeline({ onComplete: finish })
        .to(st.branch, { target: 0, s: 0, duration: Math.min(2.4, 0.5 + st.branch.s / 55), ease: "power2.inOut" })
        .to(st.branch, { blend: 0, duration: 1.1, ease: "power2.inOut" });
      document.querySelector('.fork-arrow.left')?.focus({ preventScroll: true });
    }
  }, [route, calm, isMobile]);
  useEffect(() => {
    if (route !== 'bureau') return;
    const key = (e) => { if (e.key === 'Escape' && !document.querySelector('.board-lightbox[open]')) closeRoute(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [route]);
  const onBranchScroll = (e) => {
    const st = stateRef.current, el = e.currentTarget;
    if (st) st.branch.target = el.scrollTop / Math.max(1, el.clientHeight) * BRANCH_SPACING;
  };
  const jump = (event, index) => {
    event.preventDefault();
    navigate.current?.(index);
    if (event.detail === 0)
      document
        .getElementById(chapterIds[index])
        .focus({ preventScroll: true });
    history.replaceState(
      null,
      "",
      `#${chapterIds[index]}`,
    );
  };
  return (
    <>
      <a className="skip" href="#esprit">
        Aller au contenu
      </a>
      <div className="landscape" aria-hidden="true" />
      <canvas
        ref={canvas}
        className={`world ${ready ? "ready" : ""}`}
        aria-hidden="true"
      />
      <div className="shade" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <header className="header">
        <a
          href="#esprit"
          className="brand"
          onClick={(e) => jump(e, 0)}
          aria-label="UOSSA AESUO, accueil"
        >
          <Star />
          <span>
            UOSSA<span className="brand-dot">.</span>AESUO
            <small>UNIVERSITÉ D’OTTAWA</small>
          </span>
        </a>
        <nav className="top-nav" aria-label="Navigation principale">
          <a href="#teranga" onClick={(e) => jump(e, 1)}>
            Notre esprit
          </a>
          <a href="#racines" onClick={(e) => jump(e, 2)}>
            Nos racines
          </a>
          <a href="#bureau" onClick={(e) => openRoute(e, "bureau")}>Le bureau</a>
        </nav>
        <a href="#inscription" className="header-link" onClick={(e) => openRoute(e, "inscription")}>
          Rejoindre <span>↗</span>
        </a>
      </header>
      <aside className="chapter-nav" aria-label="Chapitres">
        <span className="rail-label">LE VOYAGE</span>
        <div className="progress-track">
          <i className="progress-fill" />
        </div>
        {chapters.map((label, i) => (
          <a
            key={label}
            href={`#${chapterIds[i]}`}
            onClick={(e) => jump(e, i)}
            className={chapter === i ? "active" : ""}
            aria-label={`${i + 1}. ${label}`}
            aria-current={chapter === i ? "step" : undefined}
          >
            <span>0{i + 1}</span>
            <i />
          </a>
        ))}
      </aside>
      <main id="journey">
        <section
          tabIndex={-1}
          className="chapter hero"
          id="esprit"
          aria-labelledby="hero-title"
        >
          <div className="chapter-content">
            <div className="eyebrow reveal">
              <span className="flag">
                <i />
                <i />
                <i />
              </span>{" "}
              DU SÉNÉGAL À OTTAWA
            </div>
            <h1 id="hero-title">
              <Kinetic text="L’ESPRIT" />
              <Kinetic text="Téranga." italic />
            </h1>
            <p className="intro reveal">
              Un héritage qui nous unit.
              <br />
              Une communauté qui vous accueille.
            </p>
            <a
              className="journey-link reveal"
              href="#teranga"
              onClick={(e) => jump(e, 1)}
            >
              <span className="circle-arrow">↓</span>
              <span>
                Prendre la route
                <small>SCROLLEZ POUR AVANCER</small>
              </span>
            </a>
          </div>
          <img
            className="hero-emblem-fallback"
            src="/uossa-logo-2026.jpg"
            alt="Emblème UOSSA Sénégal"
          />
          <div className="hero-paths"><nav className="route-fork" aria-label="Choisir un parcours">
              <span className="fork-label">DEUX AUTRES CHEMINS À EXPLORER</span>
              <a href="#bureau" onClick={(e) => openRoute(e,"bureau")}><span>01 / RENCONTRER</span>Le bureau exécutif <b aria-hidden="true">↗</b></a>
              <a href="#inscription" onClick={(e) => openRoute(e,"inscription")}><span>02 / REJOINDRE</span>Inscription & recensement <b aria-hidden="true">↗</b></a>
            </nav></div>
          <div className="hero-side reveal">
            <span>LES LIONS DE LA TÉRANGA</span>
            <p>
              La fierté en héritage.
              <br />
              L’avenir ensemble.
            </p>
          </div>
          <div className="hero-bottom">
            <span>
              ASSOCIATION DES ÉTUDIANTS SÉNÉGALAIS
              <br />
              DE L’UNIVERSITÉ D’OTTAWA
            </span>
            <span>
              14°41′ N &nbsp; 17°26′ O<br />
              45°25′ N &nbsp; 75°41′ O
            </span>
          </div>
        </section>
        <section
          tabIndex={-1}
          className="chapter teranga"
          id="teranga"
          aria-labelledby="teranga-title"
        >
          <div className="chapter-content">
            <div className="eyebrow reveal">01 / CE QUI NOUS ANIME</div>
            <h2 id="teranga-title">
              <Kinetic text="ICI, VOUS" />
              <Kinetic text="êtes chez vous." italic />
            </h2>
            <p className="body-copy reveal">
              Au Sénégal, la téranga est une façon d’être : ouvrir sa porte,
              faire une place, partager ce que l’on a.
            </p>
            <p className="body-copy reveal">
              À Ottawa, nous faisons vivre cet esprit. Un accueil, une
              rencontre, un lien qui reste.
            </p>
            <div className="values reveal">
              <span>ACCUEILLIR</span>
              <b>✦</b>
              <span>PARTAGER</span>
              <b>✦</b>
              <span>RASSEMBLER</span>
            </div>
          </div>
          <div className="floating-word" aria-hidden="true">
            JÀMM
          </div>
        </section>
        <section
          tabIndex={-1}
          className="chapter crossroads"
          id="carrefour"
          aria-labelledby="crossroads-title"
        >
          <div className="chapter-content">
            <div className="eyebrow reveal">02 / LE CARREFOUR</div>
            <h2 id="crossroads-title">
              <Kinetic text="DEUX CHEMINS." />
              <Kinetic text="À vous de choisir." italic />
            </h2>
            <p className="body-copy reveal">
              À gauche, l’équipe qui fait vivre l’association.
              <br />
              À droite, la route continue vers nos racines.
            </p>
            <div className="fork-arrows" role="group" aria-label="Choisir un chemin">
              <button className="fork-arrow left" onClick={(e) => openRoute(e, "bureau")}>
                <span className="fork-circle" aria-hidden="true">←</span>
                <span><small>À GAUCHE</small>Le bureau exécutif<em>Rencontrer l’équipe 2026–2027</em></span>
              </button>
              <button className="fork-arrow right" onClick={(e) => jump(e, 3)}>
                <span><small>À DROITE</small>Continuer la route<em>Nos racines</em></span>
                <span className="fork-circle" aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </section>
        <section
          tabIndex={-1}
          className="chapter roots"
          id="racines"
          aria-labelledby="roots-title"
        >
          <div className="chapter-content">
            <div className="eyebrow reveal">03 / CE QUI NOUS RELIE</div>
            <h2 id="roots-title">
              <Kinetic text="DEUX HORIZONS." />
              <Kinetic text="Une même fierté." italic />
            </h2>
            <p className="body-copy reveal">
              Nos racines sont sénégalaises.
              <br />
              Notre quotidien s’écrit à Ottawa.
            </p>
            <p className="body-copy reveal">
              UOSSA · AESUO rassemble une communauté étudiante autour de sa
              culture, de la solidarité et de l’envie d’avancer ensemble.
            </p>
            <div className="cities reveal">
              <div>
                <span>DAKAR</span>
                <small>LES RACINES</small>
              </div>
              <div className="city-line">
                <Star />
              </div>
              <div>
                <span>OTTAWA</span>
                <small>L’HORIZON</small>
              </div>
            </div>
          </div>
        </section>
        <section
          tabIndex={-1}
          className="chapter together"
          id="ensemble"
          aria-labelledby="together-title"
        >
          <div className="chapter-content">
            <div className="eyebrow reveal">
              <Star /> 04 / L’HISTOIRE CONTINUE
            </div>
            <h2 id="together-title">
              <Kinetic text="PLUS QU’UNE ASSO." />
              <Kinetic text="Une famille." italic />
            </h2>
            <p className="body-copy reveal">
              D’ici ou d’ailleurs, le Sénégal nous rassemble.
              <br />
              Bienvenue chez les Lions de la Téranga.
            </p>
            <nav className="route-fork" aria-label="Choisir un parcours">
              <span className="fork-label">DEUX AUTRES CHEMINS À EXPLORER</span>
              <a href="#bureau" onClick={(e) => openRoute(e,"bureau")}><span>01 / RENCONTRER</span>Le bureau exécutif <b aria-hidden="true">↗</b></a>
              <a href="#inscription" onClick={(e) => openRoute(e,"inscription")}><span>02 / REJOINDRE</span>Inscription & recensement <b aria-hidden="true">↗</b></a>
            </nav>
            <div className="identity reveal">
              <img
                src="/uossa-logo-2026.jpg"
                alt="Logo original UOSSA Sénégal : lion doré, étoile verte et couleurs sénégalaises"
                width="72"
                height="72"
              />
              <div>
                <strong>UOSSA · AESUO</strong>
                <span>
                  University of Ottawa
                  <br />
                  Senegalese Student Association
                </span>
              </div>
            </div>
            <a
              href="#esprit"
              className="return-link reveal"
              onClick={(e) => jump(e, 0)}
            >
              Revivre le voyage <span>↗</span>
            </a>
          </div>
          <footer>
            <span>LE SÉNÉGAL AU CŒUR. OTTAWA À L’HORIZON.</span>
            <span className="footer-flag">
              <i />
              <i />
              <i />
            </span>
            <span>UOSSA · AESUO</span>
          </footer>
        </section>
      </main>
      <dialog ref={routeDialog} className="route-dialog" aria-labelledby="inscription-title" onCancel={(e)=>{e.preventDefault();closeRoute()}} data-lenis-prevent>
        <div className="route-topbar"><button className="route-back" onClick={closeRoute}>← Retour à la savane</button><span>UOSSA · AESUO / DEVENIR MEMBRE</span></div>
        {route === 'inscription' && (        <section tabIndex={-1} className="branch-page inscription" id="inscription-page" aria-labelledby="inscription-title">
          <div className="chapter-content">
            <div className="eyebrow reveal">PARCOURS MEMBRES / PRENEZ PART AU VOYAGE</div>
            <h2 id="inscription-title"><Kinetic text="VOTRE PLACE" /><Kinetic text="est ici." italic /></h2>
            <p className="body-copy reveal">Inscription et recensement des membres 2026–2027. Rejoignez l’UOSSA, partagez vos envies et faites-nous connaître vos idées pour l’année.</p>
            <a className="path-action reveal" href={MEMBERSHIP_FORM} target="_blank" rel="noopener noreferrer">M’inscrire / me recenser <span aria-hidden="true">↗</span><small>OUVRIR LE FORMULAIRE GOOGLE</small></a>
            <p className="form-note reveal">Le formulaire permet aussi de proposer votre aide comme bénévole.</p>
            <a className="next-path reveal" href="#ensemble" onClick={(e) => {e.preventDefault();closeRoute()}}>Revenir au voyage dans la savane ←</a>
          </div>
        </section>
)}
        <a className="route-instagram" href={INSTAGRAM} target="_blank" rel="noopener noreferrer">Instagram @uossa.aesuo ↗</a>
      </dialog>
      <div
        ref={branchLayer}
        className={`branch-layer ${route === 'bureau' ? 'open' : ''}`}
        inert={route !== 'bureau'}
        aria-hidden={route !== 'bureau'}
        aria-labelledby="branch-title"
        role="region"
        data-lenis-prevent
        onScroll={onBranchScroll}
      >
        <div className="branch-topbar">
          <button className="route-back" onClick={closeRoute}>← Retour au carrefour</button>
          <span>UOSSA · AESUO / LE BUREAU EXÉCUTIF 2026–2027</span>
        </div>
        <section className="branch-stop branch-intro">
          <div className="branch-card intro">
            <div className="eyebrow">À GAUCHE / LE CHEMIN DU BUREAU</div>
            <h2 id="branch-title"><span className="line">LE BUREAU</span><span className="line serif">À vos côtés.</span></h2>
            <p className="body-copy">L’équipe qui fait vivre notre communauté et porte vos idées sur le campus.</p>
            <span className="branch-hint"><span className="circle-arrow" aria-hidden="true">↓</span>SCROLLEZ POUR LONGER LE CHEMIN</span>
          </div>
        </section>
        {branchOrder.slice(0, 7).map((index, k) => (
          <section key={index} className={`branch-stop ${k % 2 ? 'card-left' : 'card-right'}`}>
            <figure className="branch-card">
              <img className="branch-photo" src={boardImages[index].src} alt="" width="1080" height="607" loading="lazy" />
              <figcaption>
                <span className="branch-count">{String(k + 1).padStart(2, '0')} / 08</span>
                {boardImages[index].alt}
              </figcaption>
              <button onClick={() => setPhoto(index)}>Agrandir la photo <span aria-hidden="true">↗</span></button>
            </figure>
          </section>
        ))}
        <section className="branch-stop branch-finale">
          <div className="branch-card finale">
            <img className="branch-photo" src={boardImages[0].src} alt="" width="1080" height="607" loading="lazy" />
            <span className="branch-count">08 / 08 · AU BOUT DU CHEMIN</span>
            <h3>Le bureau exécutif 2026–2027.</h3>
            <p>Photographies : @posetapierre.visuel</p>
            <div className="branch-actions">
              <button onClick={() => setPhoto(0)}>Agrandir la photo ↗</button>
              <a href={TEAM_POST} target="_blank" rel="noopener noreferrer">Découvrir les membres sur Instagram ↗</a>
              <a href="#inscription" onClick={(e) => openRoute(e, "inscription")}>Prendre le chemin de l’inscription →</a>
              <button onClick={closeRoute}>← Revenir au carrefour</button>
            </div>
          </div>
        </section>
      </div>
      <BoardLightbox selected={photo} setSelected={setPhoto} />
      <div className="bottom-ui">
        <span className="chapter-caption">
          0{chapter + 1} <i /> {chapters[chapter]}
        </span>
        <div className="bottom-actions">
        <button
          className="motion-button"
          aria-pressed={calm}
          onClick={() => setCalm((v) => !v)}
        >
          <span className={`motion-icon ${calm ? "paused" : ""}`}>
            <i />
            <i />
            <i />
          </span>
          {calm ? "Animation réduite" : "Animation complète"}
        </button>
        <a className="instagram-link" href={INSTAGRAM} target="_blank" rel="noopener noreferrer" aria-label="Notre Instagram : @uossa.aesuo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/></svg><span>Instagram</span><span aria-hidden="true">↗</span>
        </a>
        </div>
      </div>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
