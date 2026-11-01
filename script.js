// R B A turns into the spiral while scrolling and the bar moves to the top,
// the endless carousel drifts and can be dragged, project images are shown
// one at a time, and a black dot cursor falls, bounces and
// bursts into the next project. Press G to see the 12-column grid.

(function () {
  const root = document.documentElement;
  const body = document.body;
  const mono = document.querySelector(".monogram");
  const mark = document.querySelector(".mark");
  const fadeTop = document.querySelector(".fade-top");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);

  function smallSize() {
    return clamp(innerWidth * 0.036, 30, 52);
  }

  function markSize() {
    return Math.round(clamp(innerWidth * 0.04, 38, 56));
  }

  // Size of the spiral and of the blurred band behind it
  function barHeight() {
    return document.querySelector(".bar")?.offsetHeight || 80;
  }

  // Top of the spiral: centred on the bar once the bar sits at the top
  function markTop() {
    return (barHeight() - markSize()) / 2;
  }

  function setTopBand() {
    const m = markSize();
    root.style.setProperty("--mark", m + "px");
    root.style.setProperty("--top-h", barHeight() + 40 + "px");
  }

  // Page width without the scrollbar, so grid columns can be measured in CSS
  function setPage() {
    root.style.setProperty("--page", root.clientWidth + "px");
  }

  setTopBand();
  setPage();
  addEventListener("resize", setTopBand);
  addEventListener("resize", setPage);

  /* Grid overlay */

  const overlay = document.createElement("div");
  overlay.className = "grid-overlay grid";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = "<div></div>".repeat(12);
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

  /* R B A -> spiral */

  if (mono && mark && !body.classList.contains("is-small")) {
    let big = null;
    let locked = false;
    const intro = document.querySelector(".intro");

    // A reload always starts from the landing
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    function measure() {
      mono.style.cssText = "";
      const cs = getComputedStyle(mono);
      const r = mono.getBoundingClientRect();
      big = {
        size: parseFloat(cs.fontSize),
        top: parseFloat(cs.top),
        width: r.width,
      };
      // Room kept on the first screen for the big letters
      root.style.setProperty("--mono-h", Math.ceil(big.top + r.height) + "px");
      update();
    }

    let lastT = -1;

    function update(force) {
      if (locked) return;
      // Finished when the bar reaches the top of the screen
      const t = clamp(scrollY / Math.max(1, innerHeight - barHeight()), 0, 1);
      // Nothing to redraw once the spiral has settled
      if (t === lastT && !force) return;
      lastT = t;
      // First the letters shrink into the corner, then they wind up into the spiral
      const a = smooth(clamp(t / 0.7, 0, 1));
      const b = smooth(clamp((t - 0.7) / 0.3, 0, 1));
      const s = smallSize();
      const m = markSize();
      const lerp = (x, y, p) => x + (y - x) * p;

      mono.style.fontSize = lerp(big.size, s, a) + "px";
      // The spiral lands in its slot at the left of the bar and travels with it
      const slot = document.querySelector(".bar").getBoundingClientRect().top + (barHeight() - m) / 2;
      mark.style.top = slot + "px";
      mono.style.top = lerp(big.top, slot + (m - s * 0.78) / 2, a) + "px";
      mono.style.width = lerp(lerp(big.width, s * 2.3, a), m, b) + "px";
      mono.style.opacity = 1 - b;
      mono.style.transform = `rotate(${b * 120}deg) scale(${1 - b * 0.6})`;
      mono.style.transformOrigin = `${m / 2}px ${(s * 0.78) / 2}px`;
      mono.style.pointerEvents = b > 0.5 ? "none" : "";

      mark.style.opacity = b;
      mark.style.transform = `rotate(${(1 - b) * -300}deg) scale(${0.3 + b * 0.7})`;
      mark.style.pointerEvents = b > 0.5 ? "auto" : "none";

      // The buttons slide right as the spiral takes its place in the bar
      root.style.setProperty("--slot", b);

      if (t >= 1) lock();

      if (fadeTop) {
        fadeTop.style.setProperty("--top-o", a);
        // A hidden band does not need to blur anything
        fadeTop.classList.toggle("off", a === 0);
      }
    }

    // Once past, the landing is gone: the page continues from the bar.
    // Only the spiral (or a reload) brings it back.
    function lock() {
      if (locked) return;
      locked = true;
      const h = intro.offsetHeight;
      body.classList.add("locked");
      mark.style.top = "";
      scrollBy({ top: -h, behavior: "instant" });
    }

    function unlock() {
      locked = false;
      body.classList.remove("locked");
      scrollTo({ top: 0, behavior: "instant" });
      update(true);
    }

    mark.addEventListener("click", (e) => {
      e.preventDefault();
      if (locked) unlock();
      else scrollTo({ top: 0, behavior: "instant" });
    });

    // Links to the sections below: leave the landing first, then glide there
    document.querySelectorAll('.bar a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const target = document.querySelector(a.getAttribute("href"));
        if (!target) return;
        e.preventDefault();
        if (!locked) { update(true); lockNow(); }
        target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
      });
    });

    // Jump straight to the final state, without the in-between animation
    function lockNow() {
      root.style.setProperty("--slot", 1);
      mono.style.opacity = 0;
      mono.style.pointerEvents = "none";
      mark.style.opacity = 1;
      mark.style.transform = "none";
      mark.style.pointerEvents = "auto";
      if (fadeTop) { fadeTop.style.setProperty("--top-o", 1); fadeTop.classList.remove("off"); }
      locked = true;
      body.classList.add("locked");
      mark.style.top = "";
    }

    measure();
    onScroll(update);
    addEventListener("resize", () => { if (!locked) { measure(); update(true); } });

    // Arriving with an anchor (e.g. from another page to #contacts)
    if (location.hash && document.querySelector(location.hash)) {
      lockNow();
      requestAnimationFrame(() => document.querySelector(location.hash).scrollIntoView({ behavior: "instant" }));
    } else {
      scrollTo({ top: 0, behavior: "instant" });
    }
  }

  /* Carousel: endless, drifts on its own, can be dragged */

  const track = document.querySelector(".carousel");
  let dragged = false;

  if (track) {
    // Endless: one copy of the cards on each side, the view always stays on the middle set
    const originals = [...track.children];
    const clone = () => originals.map((c) => {
      const k = c.cloneNode(true);
      k.setAttribute("aria-hidden", "true");
      k.setAttribute("tabindex", "-1");
      k.querySelectorAll("img").forEach((i) => { i.loading = "eager"; });
      return k;
    });
    track.prepend(...clone());
    track.append(...clone());

    let lap = 0, pos = 0, hover = false, down = false, visible = true, resumeAt = 0;
    let startX = 0, startPos = 0;

    function measure() {
      lap = originals[0].offsetLeft - track.children[0].offsetLeft;
      pos = lap + (track.scrollLeft % lap || 0);
      apply();
    }

    function wrap() {
      if (pos < lap * 0.5) pos += lap;
      else if (pos > lap * 1.5) pos -= lap;
    }

    function apply() {
      wrap();
      track.scrollLeft = pos;
    }

    function pause(ms) { resumeAt = performance.now() + ms; }

    // Slow drift; slower still while the mouse is over it, paused while dragged
    let last = performance.now(), speed = 34;
    function drift(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      speed += ((hover ? 10 : 34) - speed) * Math.min(1, dt * 3);
      if (!reduced && visible && !down && !busy && now > resumeAt && lap) {
        pos += speed * dt;
        apply();
      }
      requestAnimationFrame(drift);
    }

    // Native scrolling (touch, trackpad) moves the carousel too
    track.addEventListener("scroll", () => {
      if (Math.abs(track.scrollLeft - pos) > 2) {
        pos = track.scrollLeft;
        pause(1500);
        if (pos < lap * 0.5 || pos > lap * 1.5) apply();
      }
    }, { passive: true });

    track.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hover = true; });
    track.addEventListener("pointerleave", () => { hover = false; });

    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      down = true;
      dragged = false;
      startX = e.clientX;
      startPos = pos;
    });

    addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 5 && !dragged) {
        dragged = true;
        track.classList.add("dragging");
      }
      if (dragged) {
        const want = startPos - dx;
        pos = want;
        apply();
        startPos += pos - want;
      }
    });

    addEventListener("pointerup", () => {
      down = false;
      track.classList.remove("dragging");
    });

    track.addEventListener("dragstart", (e) => e.preventDefault());

    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(track);
    addEventListener("resize", measure);
    addEventListener("load", measure);
    measure();
    requestAnimationFrame(drift);
  }

  /* Project images: one at a time, arrows on the sides, counter below */

  const stage = document.querySelector(".viewer-stage");
  if (stage) {
    const figs = [...stage.querySelectorAll("figure")];
    const count = document.querySelector(".viewer-ui .count");
    const note = document.querySelector(".viewer-ui .note");
    const pad = (n) => String(n).padStart(2, "0");
    let cur = 0;

    // Images load only when they are about to be seen
    function load(i) {
      const img = figs[(i + figs.length) % figs.length].querySelector("img");
      if (img.dataset.src) {
        img.src = img.dataset.src;
        delete img.dataset.src;
      }
    }

    function show(i) {
      figs[cur].classList.remove("on");
      cur = (i + figs.length) % figs.length;
      load(cur);
      figs[cur].classList.add("on");
      load(cur + 1);
      load(cur - 1);
      count.textContent = pad(cur + 1) + " / " + pad(figs.length);
      if (note) note.textContent = figs[cur].dataset.group || "";
    }

    document.querySelector(".viewer .back")?.addEventListener("click", () => show(cur - 1));
    document.querySelector(".viewer .fwd")?.addEventListener("click", () => show(cur + 1));

    // Swipe on touch screens
    let sx = null;
    stage.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") sx = e.clientX; });
    stage.addEventListener("pointerup", (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx;
      sx = null;
      if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1));
    });

    // Lightbox: the current image full screen
    const box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    // Arrows drawn like the ones in the bar, the cross with thin lines
    const svg = (d, cls) => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
    box.innerHTML = '<img alt="">' +
      `<button class="close" type="button" aria-label="Close">${svg("M4 4 L20 20 M20 4 L4 20", "cross")}</button>` +
      `<button class="prev" type="button" aria-label="Previous">${svg("M22 12 H3 M11.5 3.5 L3 12 L11.5 20.5", "arrow h")}</button>` +
      `<button class="next-img" type="button" aria-label="Next">${svg("M2 12 H21 M12.5 3.5 L21 12 L12.5 20.5", "arrow h")}</button>`;
    body.appendChild(box);
    const big = box.querySelector("img");

    function sync() {
      const img = figs[cur].querySelector("img");
      big.src = img.src;
      big.alt = img.alt;
    }

    function open() { sync(); box.classList.add("on"); }
    function close() { box.classList.remove("on"); }

    figs.forEach((f) => f.addEventListener("click", open));
    box.querySelector(".close").addEventListener("click", close);
    box.querySelector(".prev").addEventListener("click", (e) => { e.stopPropagation(); show(cur - 1); sync(); });
    box.querySelector(".next-img").addEventListener("click", (e) => { e.stopPropagation(); show(cur + 1); sync(); });
    box.addEventListener("click", (e) => { if (e.target === box) close(); });

    addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") { show(cur + 1); if (box.classList.contains("on")) sync(); }
      if (e.key === "ArrowLeft") { show(cur - 1); if (box.classList.contains("on")) sync(); }
    });

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
      dot.classList.toggle("big", !!e.target.closest("a, button"));
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
