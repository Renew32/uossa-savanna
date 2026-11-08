import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
// The 3D scene (and three.js) loads alongside the first render instead of before it:
// the text of the page can paint without waiting for the largest script.
const sceneModule = import("./scene.js");
import { START_Z, END_Z, TRAVEL, FORK_Z, JOIN_Z, SIDE_PATHS, SIDE_SCREENS, EXIT_SCREENS } from "./route.js";
import "./style.css";
// Public files, under the site's base path ("/" locally, "/uossa-savanna/" on GitHub Pages).
const asset = (path) => import.meta.env.BASE_URL + path;

gsap.registerPlugin(ScrollTrigger);
const chapters = ["L’esprit", "La téranga", "Le carrefour", "Nos racines", "Votre place", "Ensemble"];
const chapterIds = ["esprit", "teranga", "carrefour", "racines", "votre-place", "ensemble"];
// Side roads: the crossroads they leave from, the chapter where they rejoin the main road,
// and their name and arrow in the header menu.
const SIDES = {
  bureau: { fork: "carrefour", join: "racines", label: "Le bureau exécutif", arrow: "←" },
  inscription: { fork: "votre-place", join: "ensemble", label: "Inscription & recensement", arrow: "→" },
};
// The header menu « Les chemins »: every side road, in the order of the journey, then « Rejoindre ».
// A new side road only needs its entry in SIDES to appear in the menu.
const SIDE_ROADS = Object.keys(SIDES).sort((a, b) => chapterIds.indexOf(SIDES[a].fork) - chapterIds.indexOf(SIDES[b].fork));
function RoutesMenu({ openRoute }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null), toggle = useRef(null);
  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (!box.current.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === "Escape") { setOpen(false); toggle.current.focus(); } };
    document.addEventListener("pointerdown", away);
    document.addEventListener("focusin", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("focusin", away);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  const pick = (go) => (e) => { setOpen(false); go(e); };
  return (
    <div className={`routes-menu ${open ? "open" : ""}`} ref={box}>
      <button ref={toggle} className="header-link routes-toggle" aria-expanded={open} aria-controls="routes-panel" onClick={() => setOpen((o) => !o)}>
        Les chemins <span aria-hidden="true">▾</span>
      </button>
      <nav id="routes-panel" className="routes-panel" aria-label="Les chemins" hidden={!open}>
        {SIDE_ROADS.map((name) => (
          <a key={name} href={`#${name}`} onClick={pick((e) => openRoute(e, name))}><span aria-hidden="true">{SIDES[name].arrow}</span>{SIDES[name].label}</a>
        ))}
        <a href="#inscription" className="routes-join" onClick={pick((e) => openRoute(e, "inscription"))}>
          Rejoindre <span aria-hidden="true">{"↗\uFE0E"}</span>
        </a>
      </nav>
    </div>
  );
}
const sideFromHash = () => (location.hash === "#bureau" || location.hash === "#inscription" ? location.hash.slice(1) : null);
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
            {c === " " ? " " : c}
          </span>
        ))}
      </span>
    </span>
  );
}
const boardImages = [
  {src:asset('bureau-2026-2027.webp'),alt:'Photo de groupe de l’équipe UOSSA 2026–2027'},
  {src:asset('bureau/02.webp'),alt:'Planche de portraits : coprésidence, président sortant et marketing'},
  {src:asset('bureau/03.webp'),alt:'Planche de portraits : vie interne, finances, événementiel et bénévoles'},
  {src:asset('bureau/04.webp'),alt:'Planche de portraits : projets, mentorat et équipe événementielle'},
];
// Order along the bureau road: three boards beside the road, then the group photo as the finale.
const branchOrder = [1, 2, 3, 0];
const branchTotal = String(branchOrder.length).padStart(2, '0');
// Full-screen viewer for the bureau photos. On a phone: double-tap (or « Zoom + ») zooms 2.5× on
// the touched spot and the zoomed photo pans with the finger; a sideways swipe changes photo.
const ZOOM = 2.5;
function BoardLightbox({selected,setSelected}){
  const viewer=useRef(null), stage=useRef(null), gesture=useRef(null), lastTap=useRef({t:0,x:0,y:0});
  const [zoomed,setZoomed]=useState(false);
  useEffect(()=>{if(selected!==null){if(!viewer.current.open)viewer.current.showModal()}else if(viewer.current.open)viewer.current.close()},[selected]);
  useEffect(()=>{setZoomed(false);
    // Preload the neighbouring photos so a swipe shows the next one at once.
    if(selected!==null)for(const d of [1,-1])new Image().src=boardImages[(selected+d+boardImages.length)%boardImages.length].src;
  },[selected]);
  const step=(delta)=>setSelected(i=>(i+delta+boardImages.length)%boardImages.length);
  // Zoom in on a point of the screen (or the centre), keeping that point under the finger.
  const zoomAt=(clientX,clientY)=>{
    const box=stage.current,img=box?.querySelector('img');if(!img)return;
    if(zoomed){setZoomed(false);return}
    const r=box.getBoundingClientRect(),W=r.width,H=r.height,nw=img.naturalWidth||1080,nh=img.naturalHeight||607;
    const k=Math.min(W/nw,H/nh),cw=nw*k,ch=nh*k,left=r.left+(W-cw)/2,top=r.top+(H-ch)/2;
    const fx=Math.min(1,Math.max(0,((clientX??left+cw/2)-left)/cw)),fy=Math.min(1,Math.max(0,((clientY??top+ch/2)-top)/ch));
    setZoomed(true);
    requestAnimationFrame(()=>{const zw=cw*ZOOM,zh=ch*ZOOM;box.scrollLeft=fx*zw-W/2;box.scrollTop=fy*zh-H/2});
  };
  const down=(e)=>{gesture.current={x:e.clientX,y:e.clientY,t:e.timeStamp}};
  const up=(e)=>{
    const g=gesture.current;gesture.current=null;if(!g)return;
    const dx=e.clientX-g.x,dy=e.clientY-g.y;
    if(!zoomed&&Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.3){step(dx<0?1:-1);return}
    if(Math.hypot(dx,dy)>10)return;
    const last=lastTap.current;
    if(e.timeStamp-last.t<320&&Math.hypot(e.clientX-last.x,e.clientY-last.y)<30){lastTap.current={t:0,x:0,y:0};zoomAt(e.clientX,e.clientY)}
    else lastTap.current={t:e.timeStamp,x:e.clientX,y:e.clientY};
  };
  const zoomStyle=()=>{const box=stage.current,img=box?.querySelector('img');if(!box||!img)return undefined;
    const W=box.clientWidth,H=box.clientHeight,nw=img.naturalWidth||1080,nh=img.naturalHeight||607,k=Math.min(W/nw,H/nh);
    return {width:nw*k*ZOOM,height:nh*k*ZOOM}};
  return <dialog ref={viewer} className="board-lightbox" aria-label="Galerie du bureau exécutif" data-lenis-prevent onCancel={e=>{e.preventDefault();e.stopPropagation();setSelected(null)}} onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();step(1)}if(e.key==='ArrowLeft'){e.preventDefault();step(-1)}}}>
      <div className="lightbox-toolbar"><span aria-live="polite">{selected!==null ? `${branchOrder.indexOf(selected)+1} / ${branchOrder.length}` : ''}</span>
        <span className="lightbox-tools"><button onClick={()=>zoomAt()} aria-pressed={zoomed}>{zoomed?'Zoom −':'Zoom +'}</button><button onClick={()=>setSelected(null)} autoFocus>Fermer ×</button></span></div>
      <div ref={stage} className={`lightbox-stage ${zoomed?'zoomed':''}`} onPointerDown={down} onPointerUp={up} onPointerCancel={()=>{gesture.current=null}} onDoubleClick={e=>{if(e.nativeEvent.pointerType!=='touch'&&!matchMedia('(hover:none)').matches)zoomAt(e.clientX,e.clientY)}}>
        {selected!==null&&<img src={boardImages[selected].src} alt={boardImages[selected].alt} decoding="async" draggable="false" style={zoomed?zoomStyle():undefined}/>}
      </div>
      <p className="lightbox-hint" aria-hidden="true">Touchez deux fois pour zoomer · glissez pour changer de photo</p>
      <div className="lightbox-navigation"><button onClick={()=>step(-1)}>← Précédente</button><button onClick={()=>step(1)}>Suivante →</button></div>
      <p className="gallery-credit">Photographies : @posetapierre.visuel · Publication UOSSA 2026–2027</p>
    </dialog>;
}
// A transparent scroll layer over the live 3D scene: each full-height stop is one camera stop
// along the side road, and the last screens drive back onto the main road.
function SideLayer({ id, open, layerRef, onScroll, onBack, label, destination, children }) {
  return (
    <div ref={layerRef} className={`branch-layer ${open ? "open" : ""}`} data-side={id} inert={!open} aria-hidden={!open} role="region" aria-labelledby={`${id}-road-title`} data-lenis-prevent onScroll={onScroll}>
      <div className="branch-topbar">
        <button className="route-back" onClick={onBack}>← Retour au carrefour</button>
        <span>{label}</span>
      </div>
      {children}
      {Array.from({ length: EXIT_SCREENS }, (_, i) => (
        <section key={i} className="branch-stop branch-exit" aria-hidden="true">
          {i === 0 && <span className="exit-hint"><span className="circle-arrow">↓</span><span><small>CONTINUER LA ROUTE</small>{destination}</span></span>}
        </section>
      ))}
    </div>
  );
}
function App() {
  const canvas = useRef(null), navigate = useRef(null), smoothScroll = useRef(null), scrollApi = useRef(null);
  const stateRef = useRef(null), calmRef = useRef(false), sideOpen = useRef(null), exiting = useRef(false), firstRun = useRef(true), exitForward = useRef(null);
  const bureauLayer = useRef(null), inscriptionLayer = useRef(null);
  const layers = { bureau: bureauLayer, inscription: inscriptionLayer };
  const [photo, setPhoto] = useState(null);
  const [route, setRoute] = useState(sideFromHash);
  const [layer, setLayer] = useState(null);
  const routeRef = useRef(route); routeRef.current = route;
  const openRoute = (event, name) => {
    event?.preventDefault();
    if (routeRef.current === name) return;
    history.pushState({secondaryRoute:true}, '', '#' + name);
    setRoute(name);
  };
  const closeRoute = () => {
    const current = routeRef.current;
    if (!current) return;
    history.replaceState(null, '', '#' + SIDES[current].fork);
    setRoute(null);
  };
  useEffect(() => {
    const sync = () => setRoute(sideFromHash());
    window.addEventListener('popstate',sync); window.addEventListener('hashchange',sync);
    return () => {window.removeEventListener('popstate',sync);window.removeEventListener('hashchange',sync)};
  }, []);
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
  // The button answers at once; the scene is rebuilt for the new mode only after that frame
  // has been painted, so the click never waits for the rebuild.
  const [calmShown, setCalmShown] = useState(calm);
  useEffect(() => setCalmShown(calm), [calm]);
  const toggleCalm = () => {
    const next = !calmShown;
    setCalmShown(next);
    requestAnimationFrame(() => setTimeout(() => setCalm(next), 0));
  };
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
      side: { route: null, blend: 0, u: 0, target: 0, snap: false, arrived: false } };
    stateRef.current = state; calmRef.current = calm;
    let scene = null;
    sceneModule.then(({ createSavanna }) => {
      if (disposed) return;
      scene = createSavanna(canvas.current, state, {
        mobile,
        calm,
        onReady: () => {
          if (!disposed) setReady(true);
        },
      });
    });
    if (!calm && !mobile) {
      lenis = new Lenis({ duration: 1.15, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      smoothScroll.current = lenis;
      if(routeRef.current)lenis.stop();
    }
    const sections = [...document.querySelectorAll(".chapter")];
    // Camera position along the main road for each scroll position. It holds still at both
    // crossroads while their arrows are on screen, and passes each side road's merge point
    // just before the chapter that follows it.
    const topOf = (id) => document.getElementById(id).offsetTop;
    const holdRange = (side) => { const t = topOf(SIDES[side].fork); return [t - innerHeight * 0.1, t + innerHeight * 0.45]; };
    const forkTop = (side) => topOf(SIDES[side].fork) + innerHeight * 0.15;
    let anchors = null;
    const getAnchors = () => {
      if (anchors) return anchors;
      const end = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const [a1, b1] = holdRange("bureau"), [a2, b2] = holdRange("inscription");
      // The camera waits a few metres before each fork so the split is in view ahead.
      const list = [[a1, FORK_Z.bureau + 6], [b1, FORK_Z.bureau + 6], [topOf("racines") + innerHeight * 0.1, JOIN_Z.bureau - 6],
        [a2, FORK_Z.inscription + 6], [b2, FORK_Z.inscription + 6], [end, END_Z]];
      anchors = [[0, START_Z]];
      for (const a of list) if (a[0] > anchors[anchors.length - 1][0] + 1) anchors.push(a);
      return anchors;
    };
    const zForY = (y) => {
      const A = getAnchors();
      for (let i = 1; i < A.length; i++) if (y <= A[i][0]) { const [y0, z0] = A[i - 1], [y1, z1] = A[i]; return z0 + (z1 - z0) * Math.max(0, y - y0) / (y1 - y0); }
      return A[A.length - 1][1];
    };
    const yForZ = (z) => {
      const A = getAnchors();
      for (let i = 1; i < A.length; i++) { const [y0, z0] = A[i - 1], [y1, z1] = A[i]; if (z0 !== z1 && z <= z0 && z >= z1) return y0 + (y1 - y0) * (z0 - z) / (z0 - z1); }
      return z > A[0][1] ? 0 : A[A.length - 1][0];
    };
    const resetAnchors = () => { anchors = null; };
    ScrollTrigger.addEventListener("refreshInit", resetAnchors);
    const jumpScroll = (y) => {
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo({ top: y, behavior: "instant" });
      ScrollTrigger.update();
    };
    // Drives the camera along the main road to a scroll position (to reach a crossroads).
    // Gentle start and stop, so the camera never lurches when the drive begins.
    let drive = null;
    const easeInOut = (t) => (1 - Math.cos(Math.PI * t)) / 2;
    const driveScroll = (y, done) => {
      drive?.kill(); drive = null;
      const duration = Math.min(4.2, 1.1 + Math.abs(scrollY - y) / 1800);
      if (lenis) lenis.scrollTo(y, { duration, easing: easeInOut, force: true, lock: true, onComplete: done });
      else { const o = { y: scrollY }; drive = gsap.to(o, { y, duration, ease: "sine.inOut", onUpdate: () => window.scrollTo(0, o.y), onComplete: done }); }
    };
    scrollApi.current = { topOf, holdRange, forkTop, yForZ, jumpScroll, driveScroll };
    let last = -1;
    const context = gsap.context(() => {
      ScrollTrigger.create({
        trigger: "#journey",
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          state.progress = Math.min(1, Math.max(0, (START_Z - zForY(self.scroll())) / TRAVEL));
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
      if (lenis) lenis.scrollTo(top, { duration: Math.min(3.2, 1.2 + Math.abs(scrollY - top) / 2200), easing: easeInOut, onComplete: done });
      else {
        window.scrollTo({ top, behavior: "instant" });
        done();
      }
    };
    const tick = (time) => {
      lenis?.raf(time * 1000);
      if (!document.hidden) scene?.render(time);
      // At the end of a side road the camera has merged into the main road: hand over to it.
      const side = state.side;
      if (side.arrived && side.route && routeRef.current === side.route && !exiting.current) exitForward.current?.(side.route);
    };
    gsap.ticker.add(tick);
    const refresh = () => ScrollTrigger.refresh();
    document.fonts.ready.then(refresh);
    return () => {
      disposed = true;
      gsap.ticker.remove(tick);
      ScrollTrigger.removeEventListener("refreshInit", resetAnchors);
      drive?.kill();
      context.revert();
      lenis?.destroy();
      smoothScroll.current = null;
      scrollApi.current = null;
      scene?.dispose();
      window.removeEventListener("pointermove", move);
    };
  }, [calm, isMobile]);
  // ── Side roads: drive to the crossroads, turn off, and come back (or carry on to the main road). ──
  useEffect(() => {
    const st = stateRef.current, api = scrollApi.current, html = document.documentElement;
    const first = firstRun.current; firstRun.current = false;
    if (!st || !api) return;
    const calmNow = calmRef.current, lenis = smoothScroll.current;
    if (route) {
      const previous = sideOpen.current, reenter = previous === route, layerEl = layers[route].current;
      sideOpen.current = route;
      html.classList.add('branch-mode');
      lenis?.stop();
      const go = (immediate) => {
        if (routeRef.current !== route) return;
        gsap.killTweensOf(st.side);
        if (!reenter) layerEl.scrollTop = 0;
        const target = layerEl.scrollTop / Math.max(1, layerEl.scrollHeight - layerEl.clientHeight) * (SIDE_SCREENS[route] - 1);
        Object.assign(st.side, { route, target, snap: true, arrived: false });
        if (immediate || calmNow) st.side.blend = 1;
        else { st.side.blend = 0; gsap.to(st.side, { blend: 1, duration: 1.6, ease: "power2.inOut" }); }
        setLayer(route);
      };
      const toFork = () => {
        const [a, b] = api.holdRange(route), atFork = scrollY >= a - 2 && scrollY <= b + 2;
        if (first || reenter || calmNow) {
          if (!atFork) api.jumpScroll(api.forkTop(route));
          requestAnimationFrame(() => go(true));
        } else if (atFork) go(false);
        else api.driveScroll(api.forkTop(route), () => go(false));
      };
      if (previous && !reenter && st.side.route === previous && st.side.blend > 0 && !calmNow) {
        // Straight from the other side road: finish it onto the main road, then drive on.
        setLayer(null);
        gsap.killTweensOf(st.side);
        const end = SIDE_SCREENS[previous] - 1;
        gsap.to(st.side, { u: end, target: end, duration: Math.min(2.4, 0.8 + (end - st.side.u) * 0.3), ease: "power1.inOut", onComplete: () => {
          if (routeRef.current !== route) return;
          api.jumpScroll(api.yForZ(JOIN_Z[previous]));
          Object.assign(st.side, { blend: 0, route: null, u: 0, target: 0, arrived: false });
          toFork();
        } });
      } else toFork();
    } else if (sideOpen.current) {
      const from = sideOpen.current;
      sideOpen.current = null;
      html.classList.remove('branch-mode');
      setLayer(null);
      gsap.killTweensOf(st.side);
      const reset = () => Object.assign(st.side, { blend: 0, route: null, u: 0, target: 0, arrived: false });
      if (exiting.current) {
        // Forward exit: the main camera already stands where the side road merged.
        exiting.current = false;
        lenis?.start();
        if (calmNow || st.side.blend === 0) reset();
        else gsap.to(st.side, { blend: 0, duration: 0.5, ease: "power1.out", onComplete: reset });
        return;
      }
      // Back to the crossroads: reverse along the side road, then turn back onto the main road.
      const [a, b] = api.holdRange(from);
      if (scrollY < a || scrollY > b) api.jumpScroll(api.forkTop(from));
      lenis?.start();
      if (calmNow || st.side.blend === 0 || st.side.route !== from) reset();
      else gsap.timeline({ onComplete: reset })
        .to(st.side, { target: 0, u: 0, duration: Math.min(2.6, 0.6 + st.side.u * 0.3), ease: "power2.inOut" })
        .to(st.side, { blend: 0, duration: 1.1, ease: "power2.inOut" });
      document.querySelector(`.fork-arrow[data-side="${from}"]`)?.focus({ preventScroll: true });
    }
  }, [route, calm, isMobile]);
  useEffect(() => {
    if (layer) layers[layer].current?.querySelector('.route-back')?.focus({ preventScroll: true });
  }, [layer]);
  useEffect(() => {
    if (!route) return;
    const key = (e) => { if (e.key === 'Escape' && !document.querySelector('.board-lightbox[open]')) closeRoute(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [route]);
  exitForward.current = (side) => {
    const api = scrollApi.current;
    if (!api || exiting.current || routeRef.current !== side) return;
    exiting.current = true;
    const flat = calmRef.current || document.documentElement.classList.contains('no-webgl');
    api.jumpScroll(flat ? api.topOf(SIDES[side].join) : api.yForZ(JOIN_Z[side]));
    history.replaceState(null, '', '#' + SIDES[side].join);
    setRoute(null);
  };
  // "Continuer la route": drive the rest of the side road (the camera merges, then hands over).
  const continueRoad = (side) => {
    const el = layers[side].current;
    if (calmRef.current || document.documentElement.classList.contains('no-webgl')) exitForward.current(side);
    else el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };
  const onLayerScroll = (side) => (e) => {
    const st = stateRef.current, el = e.currentTarget;
    if (st && st.side.route === side && !exiting.current)
      st.side.target = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight) * (SIDE_SCREENS[side] - 1);
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
          <a href="#racines" onClick={(e) => jump(e, 3)}>
            Nos racines
          </a>
          <a href="#bureau" onClick={(e) => openRoute(e, "bureau")}>Le bureau</a>
        </nav>
        <RoutesMenu openRoute={openRoute} />
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
            src={asset("uossa-logo-2026.jpg")}
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
              <button className="fork-arrow left" data-side="bureau" onClick={(e) => openRoute(e, "bureau")}>
                <span className="fork-circle" aria-hidden="true">←</span>
                <span><small>À GAUCHE</small>Le bureau exécutif<em>Rencontrer l’équipe <span className="nowrap">2026–2027</span></em></span>
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
          className="chapter crossroads"
          id="votre-place"
          aria-labelledby="place-title"
        >
          <div className="chapter-content">
            <div className="eyebrow reveal">04 / PRENEZ PART AU VOYAGE</div>
            <h2 id="place-title">
              <Kinetic text="VOTRE PLACE" />
              <Kinetic text="est ici." italic />
            </h2>
            <p className="body-copy reveal">
              Inscription et recensement des membres 2026–2027. Rejoignez l’UOSSA, partagez vos envies et faites-nous connaître vos idées pour l’année.
            </p>
            <div className="fork-arrows" role="group" aria-label="Choisir un chemin">
              <button className="fork-arrow left straight" onClick={(e) => jump(e, 5)}>
                <span className="fork-circle" aria-hidden="true">↑</span>
                <span><small>TOUT DROIT</small>Continuer la route<em>Ensemble</em></span>
              </button>
              <button className="fork-arrow right" data-side="inscription" onClick={(e) => openRoute(e, "inscription")}>
                <span><small>À DROITE</small>Inscription & recensement<em>M’inscrire / me recenser</em></span>
                <span className="fork-circle" aria-hidden="true">→</span>
              </button>
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
              <Star /> 05 / L’HISTOIRE CONTINUE
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
                src={asset("uossa-logo-2026.jpg")}
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
      <SideLayer id="bureau" open={layer === 'bureau'} layerRef={bureauLayer} onScroll={onLayerScroll('bureau')} onBack={closeRoute}
        label="UOSSA · AESUO / LE BUREAU EXÉCUTIF 2026–2027" destination="Nos racines">
        <section className="branch-stop branch-intro">
          <div className="branch-card intro">
            <div className="eyebrow">À GAUCHE / LE CHEMIN DU BUREAU</div>
            <h2 id="bureau-road-title"><span className="line">LE BUREAU</span><span className="line serif">À vos côtés.</span></h2>
            <p className="body-copy">L’équipe qui fait vivre notre communauté et porte vos idées sur le campus.</p>
            <span className="branch-hint"><span className="circle-arrow" aria-hidden="true">↓</span>SCROLLEZ POUR LONGER LE CHEMIN</span>
          </div>
        </section>
        {branchOrder.slice(0, -1).map((index, k) => (
          <section key={index} className={`branch-stop ${SIDE_PATHS.bureau.boards[k].side > 0 ? 'card-right' : 'card-left'}`}>
            <figure className="branch-card">
              <img className="branch-photo" src={boardImages[index].src} alt="" width="1080" height="607" loading="lazy" />
              <figcaption>
                <span className="branch-count">{String(k + 1).padStart(2, '0')} / {branchTotal}</span>
                {boardImages[index].alt}
              </figcaption>
              <button onClick={() => setPhoto(index)}>Agrandir la photo <span aria-hidden="true">↗</span></button>
            </figure>
          </section>
        ))}
        <section className="branch-stop branch-finale">
          <div className="branch-card finale">
            <img className="branch-photo" src={boardImages[0].src} alt="" width="1080" height="607" loading="lazy" />
            <span className="branch-count">{branchTotal} / {branchTotal} · AU BOUT DU CHEMIN</span>
            <h3>Le bureau exécutif <span className="nowrap">2026–2027.</span></h3>
            <div className="branch-actions">
              <button onClick={() => setPhoto(0)}>Agrandir la photo ↗</button>
              <button onClick={() => continueRoad('bureau')}>Continuer la route →</button>
              <a href="#inscription" onClick={(e) => openRoute(e, "inscription")}>Prendre le chemin de l’inscription →</a>
              <button onClick={closeRoute}>← Revenir au carrefour</button>
            </div>
          </div>
        </section>
      </SideLayer>
      <SideLayer id="inscription" open={layer === 'inscription'} layerRef={inscriptionLayer} onScroll={onLayerScroll('inscription')} onBack={closeRoute}
        label="UOSSA · AESUO / DEVENIR MEMBRE" destination="Ensemble">
        <section className="branch-stop branch-intro">
          <div className="branch-card intro">
            <div className="eyebrow">À DROITE / PARCOURS MEMBRES</div>
            <h2 id="inscription-road-title"><span className="line">INSCRIPTION</span><span className="line serif">& recensement.</span></h2>
            <p className="body-copy">Le formulaire permet aussi de proposer votre aide comme bénévole.</p>
            <span className="branch-hint"><span className="circle-arrow" aria-hidden="true">↓</span>SCROLLEZ POUR LONGER LE CHEMIN</span>
          </div>
        </section>
        <section className="branch-stop branch-finale">
          <div className="branch-card finale long-title">
            <span className="branch-count">AU BOUT DU CHEMIN</span>
            <h3>Inscription et recensement des membres 2026–2027.</h3>
            <a className="path-action" href={MEMBERSHIP_FORM} target="_blank" rel="noopener noreferrer">M’inscrire / me recenser <span aria-hidden="true">↗</span><small>OUVRIR LE FORMULAIRE GOOGLE</small></a>
            <div className="branch-actions">
              <button onClick={() => continueRoad('inscription')}>Continuer la route →</button>
              <button onClick={closeRoute}>← Revenir au carrefour</button>
            </div>
          </div>
        </section>
      </SideLayer>
      <BoardLightbox selected={photo} setSelected={setPhoto} />
      <div className="bottom-ui">
        <span className="chapter-caption">
          0{chapter + 1} <i /> {chapters[chapter]}
        </span>
        <div className="bottom-actions">
        <button
          className="motion-button"
          aria-pressed={calmShown}
          onClick={toggleCalm}
        >
          <span className={`motion-icon ${calmShown ? "paused" : ""}`}>
            <i />
            <i />
            <i />
          </span>
          {calmShown ? "Animation réduite" : "Animation complète"}
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
