// The bar scrolls up and sticks to the top while R B A winds into the spiral,
// which takes a fourth place in the bar and leads home. Every page ends with
// the contacts. The endless carousel
// drifts and can be dragged, project images are shown one at a time, and a
// black dot cursor falls, bounces and
// bursts into the next project. Press G to see the 12-column grid.

(function () {
  const root = document.documentElement;
  const body = document.body;
  const mono = document.querySelector(".monogram");
  const fadeTop = document.querySelector(".fade-top");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);

  // Phones and tablets: a finger, no pointer to follow
  const touch = matchMedia("(hover: none), (pointer: coarse)").matches;

  // Phones have their own plain layout (style.css): no landing to wind up,
  // no drifting carousel. Turning a phone sideways past that width starts
  // the page again in the other layout
  const narrow = matchMedia("(max-width: 640px)");
  const phone = narrow.matches;
  narrow.addEventListener?.("change", () => location.reload());

  // On phones the browser bars come and go while scrolling and fire
  // "resize"; only a real change of width measures the layout again
  let lastWidth = innerWidth;
  const widthJobs = [];
  function onWidth(fn) { widthJobs.push(fn); }
  addEventListener("resize", () => {
    if (innerWidth === lastWidth) return;
    lastWidth = innerWidth;
    widthJobs.forEach((fn) => fn());
  });

  function barHeight() {
    return document.querySelector(".bar")?.offsetHeight || 80;
  }

  // Scroll distance at which the bar reaches the top: the height of the landing
  function landed() {
    return Math.max(1, document.querySelector(".intro")?.offsetHeight || innerHeight - barHeight());
  }

  // Height of the blurred band behind the bar at the top
  function setTopBand() {
    root.style.setProperty("--top-h", barHeight() + 40 + "px");
  }

  // Page width without the scrollbar, so grid columns can be measured in CSS
  function setPage() {
    root.style.setProperty("--page", root.clientWidth + "px");
  }

  setTopBand();
  setPage();
  onWidth(setTopBand);
  onWidth(setPage);

  /* Grid overlay */

  const overlay = document.createElement("div");
  overlay.className = "grid-overlay grid";
  overlay.setAttribute("aria-hidden", "true");
  // Content columns, plus the two margin columns where there are any
  function drawGrid() {
    const n = parseInt(getComputedStyle(root).getPropertyValue("--cols"), 10) || 12;
    const margins = innerWidth > 640;
    overlay.classList.toggle("with-margins", margins);
    overlay.innerHTML = (margins ? '<div class="m"></div>' : "") + "<div></div>".repeat(n) + (margins ? '<div class="m"></div>' : "");
  }
  drawGrid();
  onWidth(drawGrid);
  body.appendChild(overlay);
  addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey && !e.target.closest("input, textarea")) {
      overlay.classList.toggle("on");
    }
  });

  /* One scroll listener, at most one redraw per frame */

  const scrollJobs = [];
  let ticking = false;
  function onScroll(fn) { scrollJobs.push(fn); }
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      scrollJobs.forEach((fn) => fn());
    });
  }, { passive: true });

  /* Cookie notice: the site sets no cookies; closing the notice is
     remembered in this browser only */

  let seen = false;
  try { seen = localStorage.getItem("rba-notice") === "1"; } catch (e) {}
  if (!seen) {
    const note = document.createElement("div");
    note.className = "cookie";
    note.setAttribute("role", "region");
    note.setAttribute("aria-label", "Cookies");
    note.innerHTML = root.lang === "it"
      ? '<p>Questo sito non usa cookie né tracciamento. <a href="privacy.html">Privacy e cookie</a></p><button type="button">OK</button>'
      : '<p>This website uses no cookies and no tracking. <a href="privacy.html">Privacy &amp; cookies</a></p><button type="button">OK</button>';
    body.appendChild(note);
    note.querySelector("button").addEventListener("click", () => {
      try { localStorage.setItem("rba-notice", "1"); } catch (e) {}
      note.remove();
    });
  }

  /* Copy the e-mail address */

  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = "Copied";
      } catch (e) {
        btn.textContent = btn.dataset.copy;
      }
      setTimeout(() => { btn.textContent = "Copy"; }, 1800);
    });
  });

  /* The spiral slot in the bar, and R B A winding into it */

  const bar = document.querySelector(".bar");
  const slot = document.querySelector(".bar .home-link");

  // Spiral size: as large as the small R B A beside it, as in the phones'
  // header, and never wider than most of a column
  function sizeSlot() {
    if (!bar || !slot) return;
    const fs = parseFloat(getComputedStyle(bar.querySelector(".logo") || bar).fontSize);
    const m = Math.round(fs);
    // The bar is one column tall, so its height is the column width
    const c = bar.offsetHeight || 80;
    root.style.setProperty("--mark", Math.min(m, Math.round(c * 0.8)) + "px");
  }
  sizeSlot();
  onWidth(sizeSlot);
  document.fonts?.ready.then(sizeSlot);

  if (mono && !body.classList.contains("is-small") && !phone) {
    const letters = [...mono.querySelectorAll("span")];
    // The small R B A at the left of the bar, where the big one lands, and
    // the buttons, spread on the landing, together at the right once landed
    const logo = bar.querySelector(".logo");
    const small = [...logo.querySelectorAll("span")];
    const buttons = [...bar.querySelectorAll(".menu a")];
    const lang = bar.querySelector(".lang");

    // Everything is measured once; while scrolling the letters and the
    // buttons only move and shrink with transforms, nothing is laid out again
    let lay = null;

    function measure() {
      letters.forEach((l) => { l.style.transform = ""; });
      buttons.forEach((b) => { b.style.transform = ""; });
      const at = (el) => el.getBoundingClientRect().left;
      // The landing: buttons spread across the bar, at their full size
      bar.classList.remove("live");
      const spread = buttons.map(at);
      const big = parseFloat(getComputedStyle(buttons[0]).fontSize);
      // The header: buttons in the right half, perhaps a little smaller
      bar.classList.add("live");
      sizeSlot();
      const br = bar.getBoundingClientRect();
      const end = buttons.map(at);
      const fs = parseFloat(getComputedStyle(buttons[0]).fontSize);
      lay = {
        // Big letters: where they sit on the screen (R B A is fixed)
        boxes: letters.map((l) => { const b = l.getBoundingClientRect(); return { x: b.left, y: b.top }; }),
        // Small letters: where they sit in the bar, which travels
        marks: small.map((l) => { const b = l.getBoundingClientRect(); return { x: b.left - br.left, y: b.top - br.top }; }),
        k: parseFloat(getComputedStyle(logo).fontSize) / parseFloat(getComputedStyle(mono).fontSize),
        shift: spread.map((x, i) => x - end[i]),
        grow: big / fs,
      };
      update(true);
    }

    let lastT = -1;

    function update(force) {
      // Finished when the bar reaches the top of the screen
      const t = clamp(scrollY / landed(), 0, 1);
      if (t === lastT && !force) return;
      lastT = t;
      // Overlapping phases, each moving one way only:
      //  1. the letters shrink to the bar's size and close up to the left,
      //     while the buttons slide together to the right (sh)
      //  2. R B A travels down onto the small one in the bar (mv)
      //  3. the spiral beside it fades in (b)
      const sh = smooth(clamp(t / 0.45, 0, 1));
      const mv = smooth(clamp((t - 0.1) / 0.8, 0, 1));
      const b = smooth(clamp((t - 0.7) / 0.3, 0, 1));
      const lerp = (x, y, p) => x + (y - x) * p;
      const br = bar.getBoundingClientRect();
      const k = lerp(1, lay.k, sh);
      lay.boxes.forEach((box, i) => {
        const mark = lay.marks[i];
        const dx = lerp(box.x, br.left + mark.x, sh) - box.x;
        const dy = lerp(box.y, br.top + mark.y, mv) - box.y;
        letters[i].style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${k})`;
      });
      const g = lerp(lay.grow, 1, sh);
      buttons.forEach((el, i) => {
        el.style.transform = `translate3d(${lay.shift[i] * (1 - sh)}px, 0, 0)` + (g !== 1 ? ` scale(${g})` : "");
      });
      // Landed: the small R B A takes over from the big one, in the same place
      const done = t >= 1;
      root.classList.toggle("landed", done);
      mono.style.visibility = done ? "hidden" : "";
      mono.style.pointerEvents = t > 0.5 ? "none" : "";

      root.style.setProperty("--sb", b);

      // Out of reach until it shows
      if (lang) lang.style.pointerEvents = b > 0.5 ? "" : "none";

      // The band behind the bar shows once the page moves; a hidden band
      // does not need to blur anything
      if (fadeTop) fadeTop.classList.toggle("off", sh === 0);
    }

    measure();
    onScroll(update);
    onWidth(measure);
    // On a first visit Jost arrives after the page. R B A stays hidden until
    // it is there, then is measured once more and shown, so the letters never
    // jump from the places of the fallback font. Three seconds at most
    const ready = () => { measure(); mono.classList.add("ready"); };
    if (document.fonts) {
      Promise.race([document.fonts.load("400 1em Jost", "RBA"), new Promise((r) => setTimeout(r, 3000))]).then(ready, ready);
    } else ready();

    [slot, logo].forEach((el) => el?.addEventListener("click", (e) => {
      e.preventDefault();
      scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    }));

    // Magnet: the landing never rests half way. The first touch of the wheel
    // or trackpad inside the transition carries the page all the way,
    // down to the bar at the top or back up to R B A, at once and in one move.
    // The rest of that same gesture is held back, so it cannot fight the move
    // or run on into the page.
    let gliding = false, quietAt = 0, lastWheel = 0, lastDelta = 0;
    // Starts at once and settles softly. A gentle curve: a steeper one would
    // spend its last frames moving less than a pixel, which shows as a stutter
    const ease = (x) => 1 - (1 - x) * (1 - x);

    function glide(to) {
      if (gliding) return;
      const from = scrollY;
      if (Math.abs(to - from) < 1) return;
      if (reduced) { scrollTo({ top: to, behavior: "instant" }); return; }
      gliding = true;
      const start = performance.now(), ms = 700;
      (function step(now) {
        const k = Math.min(1, (now - start) / ms);
        scrollTo({ top: Math.round(from + (to - from) * ease(k)), behavior: "instant" });
        // R B A follows in the same frame, never one behind the page
        update();
        if (k < 1) requestAnimationFrame(step);
        else { gliding = false; quietAt = performance.now(); }
      })(start);
    }

    // Where a gesture should carry the page, or null if it is not the magnet's
    function aim(dy) {
      const y = scrollY, end = landed();
      if (dy > 0 && y < end - 1) return end;
      if (dy < 0 && y > 0 && y <= end + 1) return 0;
      return null;
    }

    addEventListener("wheel", (e) => {
      const now = performance.now();
      // Events that keep coming from the same gesture (trackpad momentum)
      const sameGesture = now - lastWheel < 180;
      lastWheel = now;
      if (gliding) { e.preventDefault(); lastDelta = e.deltaY; return; }
      // The tail of the gesture that just finished the move (trackpad momentum,
      // ever weaker) dies out; a new push, stronger than the last event,
      // goes through straight away
      const fading = Math.abs(e.deltaY) <= Math.abs(lastDelta) + 1;
      lastDelta = e.deltaY;
      if (sameGesture && fading && quietAt && now - quietAt < 1500 && aim(e.deltaY) === null && scrollY >= landed() - 1) {
        e.preventDefault();
        return;
      }
      quietAt = 0;
      const to = aim(e.deltaY);
      if (to === null || Math.abs(e.deltaY) < 1) return;
      e.preventDefault();
      glide(to);
    }, { passive: false });

    if (touch) {
      // Phones and tablets: the browser itself snaps the page, with its own
      // momentum, to R B A or to the bar; a block that starts where the bar
      // reaches the top and runs to the end of the page gives it the second
      // stop and lets the rest of the page scroll freely
      const stop = document.createElement("div");
      stop.className = "snap-stop";
      stop.setAttribute("aria-hidden", "true");
      body.appendChild(stop);
      const place = () => { stop.style.top = landed() + "px"; };
      place();
      onWidth(place);
      root.classList.add("snap");
    } else {
      // Keys or the scrollbar leave the page half way: finish the move in the
      // direction it was going
      let rest = 0, lastY = scrollY, dir = 1;
      addEventListener("scroll", () => {
        if (gliding) return;
        if (scrollY !== lastY) dir = Math.sign(scrollY - lastY);
        lastY = scrollY;
        clearTimeout(rest);
        rest = setTimeout(() => {
          const y = scrollY, end = landed();
          if (!gliding && y > 0 && y < end - 1) glide(dir < 0 ? 0 : end);
        }, 120);
      }, { passive: true });
    }
  }

  /* Carousel: endless, drifts on its own, can be dragged.
     It moves with a transform, never by scrolling, so even the slowest
     drift glides by fractions of a pixel instead of stepping. */

  const track = document.querySelector(".carousel");
  let dragged = false;

  if (track && !phone) {
    // The cards go in a row that slides inside the carousel
    const row = document.createElement("div");
    row.className = "carousel-row";
    row.append(...track.children);
    track.append(row);

    // Endless: one copy of the cards on each side, the view always stays on the middle set
    const originals = [...row.children];
    const clone = () => originals.map((c) => {
      const k = c.cloneNode(true);
      k.setAttribute("aria-hidden", "true");
      k.setAttribute("tabindex", "-1");
      k.querySelectorAll("img").forEach((i) => { i.loading = "eager"; });
      return k;
    });
    row.prepend(...clone());
    row.append(...clone());

    let lap = 0, pos = 0, hover = false, down = false, visible = true, resumeAt = 0;
    let startX = 0, startY = 0, startPos = 0, vel = 0, lastX = 0, lastMove = 0, fling = 0;

    function measure() {
      const frac = lap ? (pos - lap) / lap : 0;
      lap = originals[0].offsetLeft - row.children[0].offsetLeft;
      pos = lap * (1 + frac);
      apply();
    }

    function apply() {
      if (pos < lap * 0.5) pos += lap;
      else if (pos > lap * 1.5) pos -= lap;
      row.style.transform = `translate3d(${-pos}px, 0, 0)`;
    }

    function pause(ms) { resumeAt = performance.now() + ms; }

    // Slow drift; slower still while the mouse is over it, paused while dragged.
    // After a flick the row coasts and slows down by itself.
    let last = performance.now(), speed = 34;
    function drift(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (visible && lap && !down && !busy) {
        if (Math.abs(fling) > 5) {
          pos += fling * dt;
          fling *= Math.exp(-dt * 4);
          apply();
        } else if (!reduced && now > resumeAt) {
          speed += ((hover ? 10 : 34) - speed) * Math.min(1, dt * 3);
          pos += speed * dt;
          apply();
        }
      }
      requestAnimationFrame(drift);
    }

    // A sideways swipe on a trackpad moves it too; up and down stays the page's
    track.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      fling = 0;
      pos += e.deltaX;
      apply();
      pause(1500);
    }, { passive: false });

    track.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hover = true; });
    track.addEventListener("pointerleave", () => { hover = false; });

    // Drag with the mouse or a finger; a vertical finger scrolls the page
    track.addEventListener("pointerdown", (e) => {
      if (e.button) return;
      down = true;
      dragged = false;
      fling = 0;
      vel = 0;
      startX = lastX = e.clientX;
      startY = e.clientY;
      startPos = pos;
      lastMove = performance.now();
    });

    addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!dragged) {
        if (Math.abs(e.clientY - startY) > Math.abs(dx) && e.pointerType !== "mouse") { down = false; return; }
        if (Math.abs(dx) > 5) {
          dragged = true;
          track.classList.add("dragging");
        }
      }
      if (dragged) {
        const now = performance.now();
        vel = 0.8 * vel + 0.2 * ((lastX - e.clientX) / Math.max(1, now - lastMove)) * 1000;
        lastX = e.clientX;
        lastMove = now;
        const want = startPos - dx;
        pos = want;
        apply();
        startPos += pos - want;
      }
    });

    function release() {
      if (!down) return;
      down = false;
      track.classList.remove("dragging");
      if (dragged && performance.now() - lastMove < 80) fling = vel;
      pause(1500);
    }
    addEventListener("pointerup", release);
    addEventListener("pointercancel", release);

    track.addEventListener("dragstart", (e) => e.preventDefault());

    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(track);
    onWidth(measure);
    addEventListener("load", measure);
    measure();
    requestAnimationFrame(drift);
  }

  /* Project images: a row that slides; the one in the middle is sharp,
     the others blurred. With a mouse, the outer thirds of the page turn
     the pointer into an arrow and a click goes that way; in the band in
     the middle the dot stays and a click opens the photo full screen.
     On touch screens, swipe, and tap the middle one to open it. */

  const stage = document.querySelector(".viewer-stage");
  if (stage) {
    const track = stage.querySelector(".viewer-track");
    const figs = [...track.querySelectorAll("figure")];
    const count = document.querySelector(".viewer-ui .count");
    const note = document.querySelector(".viewer-ui .note");
    const pad = (n) => String(n).padStart(2, "0");
    let cur = 0;

    // Images load only when they are about to be seen
    function load(i) {
      const f = figs[(i + figs.length) % figs.length];
      const img = f.querySelector("img");
      if (img.dataset.src) {
        img.src = img.dataset.src;
        delete img.dataset.src;
      }
    }

    // Slide the row so the current image takes the place of the first:
    // each one is exactly as wide as the row's frame
    function centre() {
      const x = figs[0].offsetLeft - figs[cur].offsetLeft;
      track.style.transform = `translateX(${x}px)`;
    }

    // Wide screens: the pictures hang from the top left corner of their
    // frame, and the counter follows the bottom of the one on show
    const ui = document.querySelector(".viewer-ui");
    const wide = matchMedia("(min-width: 1025px)");
    function pin() {
      if (!ui) return;
      if (!wide.matches) { ui.style.transform = ""; return; }
      const img = figs[cur].querySelector("img");
      const ratio = img.getAttribute("width") / img.getAttribute("height");
      const h = stage.clientHeight;
      const shown = Math.min(h, stage.clientWidth / ratio);
      ui.style.transform = `translateY(${Math.round(shown - h)}px)`;
    }

    function show(i) {
      figs[cur].classList.remove("on");
      cur = (i + figs.length) % figs.length;
      figs[cur].classList.add("on");
      // Fewer images in memory on phones and tablets
      const near = touch ? 1 : 2;
      for (let k = -near; k <= near; k++) load(cur + k);
      centre();
      pin();
      count.textContent = pad(cur + 1) + " / " + pad(figs.length);
      if (note) note.textContent = figs[cur].dataset.group || "";
    }

    stage.querySelector(".back")?.addEventListener("click", () => show(cur - 1));
    stage.querySelector(".fwd")?.addEventListener("click", () => show(cur + 1));

    // Swipe on touch screens
    let sx = null;
    stage.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") sx = e.clientX; });
    stage.addEventListener("pointerup", (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx;
      sx = null;
      if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1));
    });

    // Lightbox: the current image full screen, the page blurred behind it
    const box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    const it = root.lang === "it";
    // Arrows drawn like the ones in the bar, the cross with thin lines
    const svg = (d, cls) => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
    box.innerHTML = '<img alt="">' +
      `<button class="close" type="button" aria-label="${it ? "Chiudi" : "Close"}">${svg("M4 4 L20 20 M20 4 L4 20", "cross")}</button>` +
      `<button class="prev" type="button" aria-label="${it ? "Precedente" : "Previous"}">${svg("M22 12 H3 M11.5 3.5 L3 12 L11.5 20.5", "arrow h")}</button>` +
      `<button class="next-img" type="button" aria-label="${it ? "Successiva" : "Next"}">${svg("M2 12 H21 M12.5 3.5 L21 12 L12.5 20.5", "arrow h")}</button>` +
      '<span class="lb-count" aria-live="polite"></span>';
    body.appendChild(box);
    const big = box.querySelector("img");
    const lbCount = box.querySelector(".lb-count");

    function sync() {
      const img = figs[cur].querySelector("img");
      big.src = img.src || img.dataset.src;
      big.alt = img.alt;
      lbCount.textContent = pad(cur + 1) + " / " + pad(figs.length);
    }

    function open() { sync(); box.classList.add("on"); }
    function close() { box.classList.remove("on"); }

    if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
      // The arrow of the buttons, laid flat, follows the mouse over the images
      stage.classList.add("halves");
      const pointer = document.createElement("div");
      pointer.className = "viewer-pointer";
      pointer.setAttribute("aria-hidden", "true");
      pointer.innerHTML = svg("M2 12 H21 M12.5 3.5 L21 12 L12.5 20.5", "arrow h");
      body.appendChild(pointer);
      // -1 back, 1 forward, 0 the band in the middle: thirds of the pictures'
      // own width, the whole page or one half of it
      const side = (e) => {
        const r = stage.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        return x < 1 / 3 ? -1 : x > 2 / 3 ? 1 : 0;
      };
      stage.addEventListener("mousemove", (e) => {
        const s = side(e);
        if (s) pointer.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) scaleX(${s})`;
        root.classList.toggle("on-viewer", s !== 0);
        root.classList.toggle("on-photo", s === 0);
      });
      stage.addEventListener("mouseleave", () => root.classList.remove("on-viewer", "on-photo"));
      stage.addEventListener("click", (e) => { const s = side(e); if (s) show(cur + s); else { root.classList.remove("on-photo"); open(); } });
    } else {
      // A side image comes to the middle; the middle one opens
      figs.forEach((f, i) => f.addEventListener("click", () => { if (i === cur) open(); else show(i); }));
    }
    box.querySelector(".close").addEventListener("click", close);
    box.querySelector(".prev").addEventListener("click", (e) => { e.stopPropagation(); show(cur - 1); sync(); });
    box.querySelector(".next-img").addEventListener("click", (e) => { e.stopPropagation(); show(cur + 1); sync(); });
    // A finger swipes from one image to the next here too; the tap that
    // ends a swipe does not close the view
    let lx = null, swiped = false;
    box.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") lx = e.clientX; });
    box.addEventListener("pointerup", (e) => {
      if (lx === null) return;
      const dx = e.clientX - lx;
      lx = null;
      if (Math.abs(dx) > 40) { swiped = true; show(cur + (dx < 0 ? 1 : -1)); sync(); }
    });
    box.addEventListener("click", (e) => {
      if (swiped) { swiped = false; return; }
      if (e.target === box) close();
    });

    addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") { show(cur + 1); if (box.classList.contains("on")) sync(); }
      if (e.key === "ArrowLeft") { show(cur - 1); if (box.classList.contains("on")) sync(); }
    });

    onWidth(centre);
    // Height matters too here: the frame is as tall as the screen allows
    addEventListener("resize", pin);
    addEventListener("load", centre);
    show(0);
  }

  /* Black dot cursor */

  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const dot = document.createElement("div");
  dot.className = "dot";
  dot.setAttribute("aria-hidden", "true");
  body.appendChild(dot);
  let busy = false;

  function place(x, y) {
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  if (fine) {
    root.classList.add("dot-cursor");
    addEventListener("mousemove", (e) => {
      if (busy) return;
      place(e.clientX, e.clientY);
      dot.classList.add("on");
      dot.classList.toggle("big", !!e.target.closest("a, button") || root.classList.contains("on-photo"));
    });
    document.addEventListener("mouseleave", () => { if (!busy) dot.classList.remove("on"); });
  }

  /* Opening a project: the dot falls, bounces once and the page bursts out of it */

  function openProject(href, x, y) {
    busy = true;
    dot.classList.remove("big");
    dot.classList.add("on", "falling");

    // Load the next page, hidden inside the dot, while it falls
    const sheet = document.createElement("div");
    sheet.className = "sheet";
    sheet.style.clipPath = "circle(0px at 50% 50%)";
    const frame = document.createElement("iframe");
    frame.src = href;
    frame.setAttribute("tabindex", "-1");
    frame.setAttribute("aria-hidden", "true");
    sheet.appendChild(frame);
    body.appendChild(sheet);

    let loaded = false;
    frame.addEventListener("load", () => { loaded = true; });

    const r = 7;
    const floor = innerHeight - r;
    let py = y, vy = 0, bounces = 0, last = performance.now(), settled = false, waited = 0;

    function fall(now) {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      if (!settled) {
        vy += 7000 * dt;
        py += vy * dt;
        if (py >= floor) {
          py = floor;
          bounces += 1;
          // One bounce, then it bursts on the second landing
          if (bounces >= 2) settled = true;
          vy = -vy * 0.42;
        }
        place(x, py);
        requestAnimationFrame(fall);
        return;
      }
      // Give the page a moment to load before it bursts out
      waited += dt;
      if (!loaded && waited < 0.6) {
        requestAnimationFrame(fall);
        return;
      }
      burst();
    }

    // The opposite of being sucked in: the page blows out of the dot
    function burst() {
      const start = performance.now();
      const dur = 480;
      const reach = Math.hypot(Math.max(x, innerWidth - x), Math.max(py, innerHeight - py)) + 20;
      const ease = (t) => 1 - Math.pow(1 - t, 4);
      sheet.style.transformOrigin = `${x}px ${py}px`;
      function step(now) {
        const p = Math.min(1, (now - start) / dur);
        const e = ease(p);
        sheet.style.clipPath = `circle(${r + reach * e}px at ${x}px ${py}px)`;
        sheet.style.transform = `scale(${0.6 + 0.4 * e})`;
        dot.style.transform = `translate3d(${x}px, ${py}px, 0) scale(${1 + 4 * e})`;
        dot.style.opacity = 1 - e;
        if (p < 1) requestAnimationFrame(step);
        else location.href = href;
      }
      requestAnimationFrame(step);
    }

    requestAnimationFrame((t) => { last = t; requestAnimationFrame(fall); });
  }

  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (dragged) {
        e.preventDefault();
        dragged = false;
        return;
      }
      // With a mouse or a finger alike: the dot falls from where the card was
      // touched, bounces and the page bursts out of it
      if (reduced || busy || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      const x = e.clientX || innerWidth / 2;
      const y = e.clientY || innerHeight / 2;
      openProject(card.href, x, y);
    });
  });

  // Coming back with the browser's back button restores the page as it was
  addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    busy = false;
    dot.classList.remove("falling");
    dot.style.opacity = "";
    document.querySelectorAll(".sheet").forEach((s) => s.remove());
  });
})();
