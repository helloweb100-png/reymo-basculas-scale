/* =====================================================================
   REYMO BÁSCULAS SCALE · script.js
   Sin librerías externas: todo el movimiento es JavaScript + CSS propios,
   así la página se ve completa aunque una CDN falle.
   ===================================================================== */
(function () {
  "use strict";

  /* -------------------------------------------------------------------
     CONFIGURACIÓN  ·  único lugar donde vive el número de WhatsApp
     Escribe aquí los 10 dígitos (lada + número), sin +52 ni espacios.
     Ejemplo de formato: "2220000000" (cámbialo por el número real).
     Mientras esté vacío, el botón flotante y el envío del formulario se
     ocultan y la página muestra "Pasa al taller" con la dirección.
     ------------------------------------------------------------------- */
  const WHATSAPP_NUMERO = "";
  const NEGOCIO = "Reymo Básculas Scale";

  /* ============ Utilidades ============ */
  const d = document;
  const root = d.documentElement;
  const qs = (s, c) => (c || d).querySelector(s);
  const qsa = (s, c) => Array.from((c || d).querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b === undefined ? 1 : b, Math.max(a === undefined ? 0 : a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 4);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function seguro(fn) {
    try {
      fn();
    } catch (e) {
      if (window.console) console.warn("[reymo] " + (fn.name || "modulo"), e);
    }
  }

  function debounce(fn, ms) {
    let t = 0;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  function observar(el, cb, opciones) {
    if (!("IntersectionObserver" in window)) {
      cb(true);
      return;
    }
    new IntersectionObserver(function (entradas) {
      cb(entradas[entradas.length - 1].isIntersecting);
    }, opciones || { threshold: 0.05 }).observe(el);
  }

  function tween(desde, hasta, dur, paso, fin) {
    const t0 = performance.now();
    let activo = true;
    function f(ahora) {
      if (!activo) return;
      const t = clamp((ahora - t0) / dur);
      paso(lerp(desde, hasta, easeOut(t)));
      if (t < 1) requestAnimationFrame(f);
      else if (fin) fin();
    }
    requestAnimationFrame(f);
    return function () {
      activo = false;
    };
  }

  function numeroWA() {
    const n = String(WHATSAPP_NUMERO).replace(/\D/g, "");
    if (n.length === 10) return "52" + n;
    if (n.length >= 11 && n.length <= 13) return n;
    return "";
  }

  const colaListo = [];
  function alListo(fn) {
    if (root.classList.contains("listo")) seguro(fn);
    else colaListo.push(fn);
  }

  /* ============ Cargador ============ */
  function iniciarCargador() {
    const c = qs("#cargador");
    if (!c) {
      root.classList.add("listo");
      return;
    }
    const num = qs("#cargador-num");
    const txt = qs("#cargador-texto");
    const DUR = reduce ? 400 : 1300;
    const mensajes = [
      [0, "Tarando el sistema…"],
      [34, "Leyendo celdas de carga…"],
      [68, "Calibrando el indicador…"],
      [96, "Listo para pesar"],
    ];
    const t0 = performance.now();
    let terminado = false;

    function fin() {
      if (terminado) return;
      terminado = true;
      c.classList.add("is-fuera");
      root.classList.add("listo");
      colaListo.splice(0).forEach(seguro);
      setTimeout(function () {
        if (c.parentNode) c.parentNode.removeChild(c);
      }, 800);
    }

    function paso(ahora) {
      const p = clamp((ahora - t0) / DUR);
      const v = Math.round(easeOut(p) * 100);
      if (num) num.textContent = String(v).padStart(3, "0");
      if (txt) {
        for (let i = mensajes.length - 1; i >= 0; i--) {
          if (v >= mensajes[i][0]) {
            if (txt.textContent !== mensajes[i][1]) txt.textContent = mensajes[i][1];
            break;
          }
        }
      }
      if (p < 1) {
        requestAnimationFrame(paso);
      } else if (d.readyState === "complete") {
        setTimeout(fin, 120);
      } else {
        window.addEventListener("load", function () {
          setTimeout(fin, 120);
        });
      }
    }
    requestAnimationFrame(paso);
    // Tope de seguridad: el cargador nunca dura más de ~1.9 s
    setTimeout(fin, 1900);
  }

  /* ============ LED de 7 segmentos ============ */
  const SEG = { "0": "abcdef", "1": "bc", "2": "abdeg", "3": "abcdg", "4": "bcfg", "5": "acdfg", "6": "acdefg", "7": "abc", "8": "abcdefg", "9": "abcdfg", "-": "g", " ": "" };
  const POLI = {
    a: "9,2.5 11.5,0 28.5,0 31,2.5 28.5,5 11.5,5",
    b: "33,7 35.5,4.5 38,7 38,29 35.5,32 33,29",
    c: "33,39 35.5,36 38,39 38,61 35.5,63.5 33,61",
    d: "9,65.5 11.5,63 28.5,63 31,65.5 28.5,68 11.5,68",
    e: "2,39 4.5,36 7,39 7,61 4.5,63.5 2,61",
    f: "2,7 4.5,4.5 7,7 7,29 4.5,32 2,29",
    g: "9,34 11.5,31.5 28.5,31.5 31,34 28.5,36.5 11.5,36.5",
  };
  const NS = "http://www.w3.org/2000/svg";

  function crearLED(el, celdas) {
    if (!el) return;
    el.textContent = "";
    const digitos = [];
    for (let i = 0; i < celdas; i++) {
      const svg = d.createElementNS(NS, "svg");
      svg.setAttribute("viewBox", "0 0 46 68");
      svg.setAttribute("class", "led__d");
      svg.setAttribute("aria-hidden", "true");
      const segs = {};
      Object.keys(POLI).forEach(function (k) {
        const p = d.createElementNS(NS, "polygon");
        p.setAttribute("points", POLI[k]);
        p.setAttribute("class", "s");
        svg.appendChild(p);
        segs[k] = p;
      });
      const dp = d.createElementNS(NS, "circle");
      dp.setAttribute("cx", "43");
      dp.setAttribute("cy", "65.5");
      dp.setAttribute("r", "2.6");
      dp.setAttribute("class", "dp");
      svg.appendChild(dp);
      el.appendChild(svg);
      digitos.push({ segs: segs, dp: dp, ch: null, punto: false });
    }
    el.classList.add("is-build");
    el._led = digitos;
  }

  function escribirLED(el, texto) {
    if (!el || !el._led) return;
    const digitos = el._led;
    let celdas = [];
    String(texto)
      .split("")
      .forEach(function (c) {
        if (c === ".") {
          if (celdas.length) celdas[celdas.length - 1].punto = true;
        } else {
          celdas.push({ ch: c, punto: false });
        }
      });
    if (celdas.length > digitos.length) celdas = celdas.slice(-digitos.length);
    const relleno = digitos.length - celdas.length;
    digitos.forEach(function (dg, i) {
      const celda = i < relleno ? { ch: " ", punto: false } : celdas[i - relleno];
      if (dg.ch !== celda.ch) {
        const on = SEG[celda.ch] || "";
        for (const k in dg.segs) dg.segs[k].classList.toggle("on", on.indexOf(k) !== -1);
        dg.ch = celda.ch;
      }
      if (dg.punto !== celda.punto) {
        dg.dp.classList.toggle("on", celda.punto);
        dg.punto = celda.punto;
      }
    });
  }

  /* ============ Hero: indicador de peso en vivo ============ */
  const MODOS = [
    { nombre: "Báscula de plataforma", v: 1250.5, dec: 1, cap: 2000, celdas: [62, 48, 55, 70] },
    { nombre: "Báscula de tolva", v: 8420, dec: 0, cap: 10000, celdas: [74, 80, 66, 72] },
    { nombre: "Báscula camionera", v: 24860, dec: 0, cap: 30000, celdas: [58, 66, 61, 69] },
    { nombre: "Báscula ganadera", v: 640.5, dec: 1, cap: 1000, celdas: [34, 52, 28, 46] },
  ];

  function iniciarHeroLED() {
    const led = qs("#led-hero");
    const panel = qs("#panel");
    if (!led || !panel) return;
    const modo = qs("#panel-modo");
    const estado = qs("#panel-estado");
    const etiquetaEstado = estado ? qs("b", estado) : null;
    const celdas = qsa(".pc i", panel);
    crearLED(led, 6);
    escribirLED(led, "0.0");
    let idx = 0;
    let valor = 0;
    let visible = true;
    let cancelar = null;

    function aplicar(m) {
      if (modo) modo.textContent = m.nombre;
      panel.style.setProperty("--arco", String(100 - (m.v / m.cap) * 100));
      panel.style.setProperty("--barra", ((m.v / m.cap) * 100).toFixed(0) + "%");
      celdas.forEach(function (c, j) {
        c.style.setProperty("--h", m.celdas[j] + "%");
      });
      led.setAttribute("aria-label", "Lectura de demostración: " + m.v.toFixed(m.dec) + " kilogramos");
    }

    function ir(i, inmediato) {
      const m = MODOS[i];
      aplicar(m);
      if (cancelar) cancelar();
      if (inmediato || reduce) {
        escribirLED(led, m.v.toFixed(m.dec));
        valor = m.v;
        return;
      }
      if (estado) estado.classList.add("is-midiendo");
      if (etiquetaEstado) etiquetaEstado.textContent = "Midiendo…";
      cancelar = tween(
        valor,
        m.v,
        1700,
        function (v) {
          escribirLED(led, v.toFixed(m.dec));
        },
        function () {
          valor = m.v;
          if (estado) estado.classList.remove("is-midiendo");
          if (etiquetaEstado) etiquetaEstado.textContent = "Estable";
        }
      );
    }

    observar(panel, function (v) {
      visible = v;
    });

    alListo(function () {
      ir(0, false);
      if (reduce) return;
      setInterval(function () {
        if (!visible || d.hidden) return;
        idx = (idx + 1) % MODOS.length;
        ir(idx, false);
      }, 4600);
    });
  }

  function iniciarLEDsAuto() {
    qsa("[data-led-auto]").forEach(function (el) {
      const vals = el.getAttribute("data-led-auto").split(",").map(function (s) {
        return s.trim();
      });
      crearLED(el, 6);
      escribirLED(el, vals[0]);
      if (reduce) return;
      let visible = false;
      let i = 0;
      let actual = parseFloat(vals[0]);
      observar(el, function (v) {
        visible = v;
      });
      setInterval(function () {
        if (!visible || d.hidden) return;
        i = (i + 1) % vals.length;
        const hasta = parseFloat(vals[i]);
        const dec = (vals[i].split(".")[1] || "").length;
        tween(
          actual,
          hasta,
          900,
          function (v) {
            escribirLED(el, v.toFixed(dec));
          },
          function () {
            actual = hasta;
          }
        );
      }, 2600);
    });
  }

  /* ============ Hero: circuito animado (canvas) ============ */
  function iniciarCircuito() {
    const cv = qs("#circuito");
    if (!cv || !cv.getContext) return;
    const ctx = cv.getContext("2d");
    const base = d.createElement("canvas");
    const bctx = base.getContext("2d");
    const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    let w = 0;
    let h = 0;
    let dpr = 1;
    let trazos = [];
    let visible = true;
    let raf = 0;
    let ultimo = 0;
    let semilla = 12345;
    const rnd = function () {
      semilla = (semilla * 1664525 + 1013904223) % 4294967296;
      return semilla / 4294967296;
    };

    function puntoEn(t, dist) {
      const a = t.acum;
      let j = 1;
      while (j < a.length - 1 && a[j] < dist) j++;
      const seg = a[j] - a[j - 1] || 1;
      const u = clamp((dist - a[j - 1]) / seg);
      return { x: lerp(t.pts[j - 1].x, t.pts[j].x, u), y: lerp(t.pts[j - 1].y, t.pts[j].y, u) };
    }

    function nodo(c, p) {
      c.beginPath();
      c.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }

    function construir() {
      semilla = 12345;
      trazos = [];
      const g = w < 700 ? 24 : 30;
      const n = Math.round(clamp((w * h) / (w < 700 ? 20000 : 24000), 14, 46));
      for (let i = 0; i < n; i++) {
        let x = Math.round((rnd() * w) / g) * g;
        let y = Math.round((rnd() * h) / g) * g;
        let dir = Math.floor(rnd() * 8);
        const pts = [{ x: x, y: y }];
        const segs = 3 + Math.floor(rnd() * 4);
        for (let s = 0; s < segs; s++) {
          const len = (2 + Math.floor(rnd() * 6)) * g;
          const dx = DIRS[dir][0];
          const dy = DIRS[dir][1];
          const k = dx && dy ? 0.7071 : 1;
          x += dx * len * k;
          y += dy * len * k;
          pts.push({ x: x, y: y });
          dir = (dir + (rnd() < 0.5 ? 1 : 7)) % 8;
          if (x < -g || x > w + g || y < -g || y > h + g) break;
        }
        let total = 0;
        const acum = [0];
        for (let j = 1; j < pts.length; j++) {
          total += Math.hypot(pts[j].x - pts[j - 1].x, pts[j].y - pts[j - 1].y);
          acum.push(total);
        }
        const trazo = { pts: pts, acum: acum, total: total, pulsos: [] };
        const np = 1 + (rnd() < 0.5 ? 1 : 0);
        for (let p = 0; p < np; p++) trazo.pulsos.push({ d: rnd() * total, v: 50 + rnd() * 90, l: 40 + rnd() * 60 });
        trazos.push(trazo);
      }
      base.width = cv.width;
      base.height = cv.height;
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.clearRect(0, 0, w, h);
      bctx.lineJoin = "round";
      bctx.lineCap = "round";
      trazos.forEach(function (t) {
        bctx.strokeStyle = "rgba(41,200,245,0.2)";
        bctx.lineWidth = 1.2;
        bctx.beginPath();
        t.pts.forEach(function (p, i) {
          if (i) bctx.lineTo(p.x, p.y);
          else bctx.moveTo(p.x, p.y);
        });
        bctx.stroke();
        bctx.fillStyle = "rgba(5,12,38,0.95)";
        bctx.strokeStyle = "rgba(123,230,255,0.5)";
        bctx.lineWidth = 1.4;
        nodo(bctx, t.pts[0]);
        nodo(bctx, t.pts[t.pts.length - 1]);
      });
    }

    function dibujar(dt) {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(base, 0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      trazos.forEach(function (t) {
        t.pulsos.forEach(function (p) {
          p.d += p.v * dt;
          if (p.d > t.total + p.l) p.d = -rnd() * 80;
          const pasos = 7;
          for (let k = 0; k < pasos; k++) {
            const dist = p.d - (k / pasos) * p.l;
            if (dist < 0 || dist > t.total) continue;
            const q = puntoEn(t, dist);
            const a = 1 - k / pasos;
            ctx.fillStyle = "rgba(123,230,255," + (0.6 * a * a).toFixed(3) + ")";
            ctx.beginPath();
            ctx.arc(q.x, q.y, 1.1 + 1.5 * a, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      });
      ctx.globalCompositeOperation = "source-over";
    }

    function bucle(ahora) {
      raf = 0;
      if (!visible || d.hidden) return;
      const dt = Math.min(0.05, (ahora - ultimo) / 1000);
      ultimo = ahora;
      dibujar(dt);
      raf = requestAnimationFrame(bucle);
    }

    function arrancar() {
      if (raf || !visible || reduce || d.hidden) return;
      ultimo = performance.now();
      raf = requestAnimationFrame(bucle);
    }

    function dims() {
      const r = cv.getBoundingClientRect();
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, w < 700 ? 1.5 : 2);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      construir();
      dibujar(0);
    }

    dims();
    let anchoPrev = w;
    let altoPrev = h;
    if ("ResizeObserver" in window) {
      new ResizeObserver(
        debounce(function () {
          const r = cv.getBoundingClientRect();
          if (Math.abs(r.width - anchoPrev) > 2 || Math.abs(r.height - altoPrev) > 140) {
            anchoPrev = r.width;
            altoPrev = r.height;
            dims();
          }
        }, 200)
      ).observe(cv);
    }
    observar(cv, function (v) {
      visible = v;
      if (v) arrancar();
    });
    d.addEventListener("visibilitychange", arrancar);
    arrancar();
  }

  /* ============ Hero: inclinación 3D y luz que sigue al puntero ============ */
  function iniciarTilt() {
    const hero = qs(".hero");
    const panel = qs("#panel");
    if (!hero || !panel || reduce) return;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let raf = 0;

    function paso() {
      cx = lerp(cx, tx, 0.12);
      cy = lerp(cy, ty, 0.12);
      panel.style.setProperty("--rx", cx.toFixed(2) + "deg");
      panel.style.setProperty("--ry", cy.toFixed(2) + "deg");
      if (Math.abs(cx - tx) > 0.02 || Math.abs(cy - ty) > 0.02) raf = requestAnimationFrame(paso);
      else raf = 0;
    }

    hero.addEventListener(
      "pointermove",
      function (e) {
        if (e.pointerType && e.pointerType !== "mouse") return;
        const r = hero.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width;
        const ny = (e.clientY - r.top) / r.height;
        hero.style.setProperty("--px", (nx * 100).toFixed(1) + "%");
        hero.style.setProperty("--py", (ny * 100).toFixed(1) + "%");
        tx = -(ny - 0.5) * 12;
        ty = (nx - 0.5) * 16;
        if (!raf) raf = requestAnimationFrame(paso);
      },
      { passive: true }
    );
    hero.addEventListener("pointerleave", function () {
      tx = 0;
      ty = 0;
      if (!raf) raf = requestAnimationFrame(paso);
    });
  }

  /* ============ Revelado al hacer scroll + títulos por palabra ============ */
  function partirTexto(el) {
    let i = 0;
    function recorrer(nodo) {
      Array.from(nodo.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          const frag = d.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (parte) {
            if (!parte) return;
            if (/^\s+$/.test(parte)) {
              frag.appendChild(d.createTextNode(" "));
              return;
            }
            const w = d.createElement("span");
            w.className = "w";
            const wi = d.createElement("span");
            wi.className = "wi";
            wi.style.setProperty("--i", String(Math.min(i++, 14)));
            wi.textContent = parte;
            w.appendChild(wi);
            frag.appendChild(w);
          });
          nodo.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          recorrer(n);
        }
      });
    }
    recorrer(el);
  }

  function iniciarReveal() {
    qsa("[data-split]").forEach(partirTexto);
    const els = qsa("[data-reveal], [data-split]");
    function barrido() {
      const limite = window.innerHeight * 0.96;
      els.forEach(function (el) {
        if (!el.classList.contains("is-in") && el.getBoundingClientRect().top < limite) el.classList.add("is-in");
      });
    }
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) {
        el.classList.add("is-in");
      });
      return;
    }
    const io = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 }
    );
    els.forEach(function (el) {
      io.observe(el);
    });
    // Red de seguridad: tras detenerse el scroll, revela lo que ya quedó a la vista
    window.addEventListener("scroll", debounce(barrido, 220), { passive: true });
    window.addEventListener("load", barrido);
  }

  /* ============ Menú móvil ============ */
  function iniciarMenu() {
    const burger = qs("#burger");
    const menu = qs("#menu-movil");
    if (!burger || !menu) return;
    function poner(abrir) {
      burger.setAttribute("aria-expanded", abrir ? "true" : "false");
      burger.setAttribute("aria-label", abrir ? "Cerrar menú" : "Abrir menú");
      if (abrir) {
        menu.hidden = false;
        requestAnimationFrame(function () {
          menu.classList.add("is-open");
        });
        root.style.overflow = "hidden";
      } else {
        menu.classList.remove("is-open");
        root.style.overflow = "";
        setTimeout(function () {
          if (burger.getAttribute("aria-expanded") === "false") menu.hidden = true;
        }, 420);
      }
    }
    burger.addEventListener("click", function () {
      poner(burger.getAttribute("aria-expanded") !== "true");
    });
    qsa("a", menu).forEach(function (a) {
      a.addEventListener("click", function () {
        poner(false);
      });
    });
    d.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") poner(false);
    });
    window.matchMedia("(min-width: 1100px)").addEventListener("change", function (e) {
      if (e.matches) poner(false);
    });
  }

  function iniciarNavActiva() {
    if (!("IntersectionObserver" in window)) return;
    const enlaces = qsa(".nav__lista a");
    const mapa = {};
    enlaces.forEach(function (a) {
      mapa[a.getAttribute("href")] = a;
    });
    const io = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (en) {
          if (!en.isIntersecting) return;
          enlaces.forEach(function (a) {
            a.classList.remove("is-actual");
          });
          const a = mapa["#" + en.target.id];
          if (a) a.classList.add("is-actual");
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    ["basculas", "anatomia", "tecnologia", "campo", "proceso", "preguntas"].forEach(function (id) {
      const s = d.getElementById(id);
      if (s) io.observe(s);
    });
  }

  /* ============ Punteros: brillo en botones y tarjetas ============ */
  function iniciarPunteros() {
    d.addEventListener(
      "pointermove",
      function (e) {
        const t = e.target.closest && e.target.closest(".btn, .celda");
        if (!t) return;
        const r = t.getBoundingClientRect();
        t.style.setProperty("--mx", e.clientX - r.left + "px");
        t.style.setProperty("--my", e.clientY - r.top + "px");
      },
      { passive: true }
    );
  }

  /* ============ Secciones fijadas por scroll ============ */
  const mqPin = window.matchMedia("(min-width: 960px) and (min-height: 700px)");
  const tipos = { sec: null, vista: null, pista: null, barra: null, pin: false, recorrido: 0, paso: 0 };
  const anat = { sec: null, pasos: [], led: null, etqCeldas: null, etqPlaca: null, activo: false, ultimoValor: "", ultimoPaso: -1 };
  const exp = { sec: null, pin: false };
  const proc = { lista: null, pasos: [] };
  let heroEl = null;
  let progresoEl = null;
  let cabEl = null;

  function configurarTipos() {
    const t = tipos;
    if (!t.sec) return;
    const vh = window.innerHeight;
    t.pin = mqPin.matches && !reduce;
    t.sec.classList.toggle("tipos--pin", t.pin);
    if (t.pin) {
      t.pista.style.removeProperty("--tx");
      const cs = window.getComputedStyle(t.vista);
      const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      t.recorrido = Math.max(0, t.pista.scrollWidth + pad - t.vista.clientWidth);
      t.sec.style.setProperty("--alto", Math.round(t.recorrido + vh) + "px");
      const tarjeta = qs(".tipo", t.pista);
      t.paso = tarjeta ? tarjeta.getBoundingClientRect().width + 24 : 380;
    } else {
      t.sec.style.removeProperty("--alto");
      t.pista.style.removeProperty("--tx");
      t.recorrido = 0;
    }
  }

  function configurarAnat() {
    const a = anat;
    if (!a.sec) return;
    a.activo = !reduce && window.innerHeight >= 560;
    a.sec.classList.toggle("anat--pin", a.activo);
    if (!a.activo) {
      a.sec.style.setProperty("--e", "0.7");
      a.sec.style.setProperty("--d", "1");
      a.sec.style.setProperty("--s", "1");
      a.sec.style.setProperty("--lec", "1");
      a.pasos.forEach(function (p) {
        p.classList.add("is-activo");
      });
      escribirLED(a.led, "1250.5");
      if (a.etqCeldas) a.etqCeldas.classList.add("show");
      if (a.etqPlaca) a.etqPlaca.classList.add("show");
    }
  }

  function configurarExp() {
    if (!exp.sec) return;
    exp.pin = !reduce && window.innerHeight >= 520;
    exp.sec.classList.toggle("exp--pin", exp.pin);
    if (!exp.pin) exp.sec.style.removeProperty("--x");
  }

  function configurar() {
    configurarTipos();
    configurarAnat();
    configurarExp();
  }

  function tiposFrame(vh) {
    const t = tipos;
    if (!t.pin) return;
    const r = t.sec.getBoundingClientRect();
    const total = Math.max(1, t.sec.offsetHeight - vh);
    const p = clamp(-r.top / total);
    t.pista.style.setProperty("--tx", (-p * t.recorrido).toFixed(1) + "px");
    t.barra.style.setProperty("--tp", (0.12 + p * 0.88).toFixed(3));
  }

  function anatFrame(vh) {
    const a = anat;
    if (!a.activo) return;
    const r = a.sec.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) return;
    const total = Math.max(1, a.sec.offsetHeight - vh);
    const p = clamp(-r.top / total);
    const caida = easeInOut(clamp(p / 0.26));
    const abre = easeInOut(clamp((p - 0.28) / 0.24)) - 0.62 * easeInOut(clamp((p - 0.82) / 0.18));
    const senal = clamp((p - 0.55) / 0.22);
    const lectura = easeOut(clamp((p - 0.72) / 0.2));
    const paso = p < 0.28 ? 0 : p < 0.55 ? 1 : p < 0.8 ? 2 : 3;
    a.sec.style.setProperty("--d", caida.toFixed(3));
    a.sec.style.setProperty("--e", abre.toFixed(3));
    a.sec.style.setProperty("--s", senal.toFixed(3));
    a.sec.style.setProperty("--lec", lectura.toFixed(3));
    const valor = (lectura * 1250.5).toFixed(1);
    if (valor !== a.ultimoValor) {
      a.ultimoValor = valor;
      escribirLED(a.led, valor);
    }
    if (paso !== a.ultimoPaso) {
      a.ultimoPaso = paso;
      a.pasos.forEach(function (li, i) {
        li.classList.toggle("is-activo", i === paso);
      });
      if (a.etqCeldas) a.etqCeldas.classList.toggle("show", paso >= 1);
      if (a.etqPlaca) a.etqPlaca.classList.toggle("show", paso <= 1);
    }
  }

  function expFrame(vh) {
    if (!exp.pin) return;
    const r = exp.sec.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) return;
    const total = Math.max(1, exp.sec.offsetHeight - vh);
    const p = clamp(-r.top / total);
    const x = easeInOut(clamp(p / 0.62));
    exp.sec.style.setProperty("--x", x.toFixed(3));
  }

  function procFrame(vh) {
    if (!proc.lista) return;
    const r = proc.lista.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) return;
    const ancla = vh * 0.6;
    const pf = clamp((ancla - r.top) / Math.max(1, r.height - 70));
    proc.lista.style.setProperty("--pf", pf.toFixed(3));
    proc.pasos.forEach(function (li) {
      li.classList.toggle("is-on", li.getBoundingClientRect().top < ancla);
    });
  }

  let pendiente = false;
  function frame() {
    pendiente = false;
    const y = window.scrollY || root.scrollTop;
    const vh = window.innerHeight;
    if (progresoEl) {
      const max = Math.max(1, root.scrollHeight - vh);
      progresoEl.style.setProperty("--sp", clamp(y / max).toFixed(4));
    }
    if (cabEl) cabEl.classList.toggle("is-scrolled", y > 24);
    if (heroEl) {
      const hh = heroEl.offsetHeight;
      if (y < hh * 1.1) heroEl.style.setProperty("--hp", clamp(y / (hh * 0.85)).toFixed(3));
    }
    tiposFrame(vh);
    anatFrame(vh);
    expFrame(vh);
    procFrame(vh);
  }

  function pedirFrame() {
    if (!pendiente) {
      pendiente = true;
      requestAnimationFrame(frame);
    }
  }

  function iniciarTipos() {
    tipos.sec = qs("#basculas");
    if (!tipos.sec) return;
    tipos.vista = qs("#tipos-vista");
    tipos.pista = qs("#tipos-pista");
    tipos.barra = qs("#tipos-barra");
    const prev = qs("#tipos-prev");
    const next = qs("#tipos-next");

    function mover(dir) {
      if (tipos.pin) {
        const total = Math.max(1, tipos.sec.offsetHeight - window.innerHeight);
        const salto = tipos.recorrido ? (tipos.paso * total) / tipos.recorrido : window.innerHeight * 0.6;
        window.scrollBy({ top: dir * salto, behavior: reduce ? "auto" : "smooth" });
      } else {
        const tarjeta = qs(".tipo", tipos.pista);
        const ancho = tarjeta ? tarjeta.getBoundingClientRect().width + 16 : 300;
        tipos.vista.scrollBy({ left: dir * ancho, behavior: reduce ? "auto" : "smooth" });
      }
    }
    if (prev) prev.addEventListener("click", function () {
      mover(-1);
    });
    if (next) next.addEventListener("click", function () {
      mover(1);
    });
    tipos.vista.addEventListener(
      "scroll",
      function () {
        if (tipos.pin) return;
        const max = tipos.vista.scrollWidth - tipos.vista.clientWidth;
        const p = max > 0 ? tipos.vista.scrollLeft / max : 0;
        tipos.barra.style.setProperty("--tp", (0.2 + p * 0.8).toFixed(3));
      },
      { passive: true }
    );
  }

  function iniciarAnat() {
    anat.sec = qs("#anatomia");
    if (!anat.sec) return;
    anat.pasos = qsa(".paso", anat.sec);
    anat.led = qs("#led-anat");
    anat.etqCeldas = qs(".anat__etq--celdas", anat.sec);
    anat.etqPlaca = qs(".anat__etq--placa", anat.sec);
    crearLED(anat.led, 6);
    escribirLED(anat.led, "0.0");
  }

  /* ============ Simulador de pesaje ============ */
  function iniciarSim() {
    const rango = qs("#sim-rango");
    const salida = qs("#sim-salida");
    const led = qs("#led-sim");
    const celdas = qsa(".sc");
    if (!rango || !led) return;
    crearLED(led, 6);
    const reparto = [0.27, 0.23, 0.26, 0.24];

    function actualizar() {
      const v = Number(rango.value);
      const t = v / 2000;
      if (salida) salida.textContent = v + " kg";
      rango.style.setProperty("--pct", (t * 100).toFixed(1) + "%");
      const sesgo = [Math.sin(t * 6) * 0.03, -Math.sin(t * 6) * 0.02, Math.cos(t * 5) * 0.02, -Math.cos(t * 5) * 0.03];
      const partes = reparto.map(function (r, i) {
        return Math.max(0, r + sesgo[i]);
      });
      const suma = partes.reduce(function (a, b) {
        return a + b;
      }, 0);
      partes.forEach(function (pt, i) {
        const kg = (v * pt) / suma;
        if (!celdas[i]) return;
        celdas[i].style.setProperty("--h", Math.min(100, (kg / 800) * 100).toFixed(1) + "%");
        const sp = qs("span", celdas[i]);
        if (sp) sp.textContent = kg.toFixed(1);
      });
      escribirLED(led, v.toFixed(1));
      led.setAttribute("aria-label", "Lectura del simulador: " + v.toFixed(1) + " kilogramos");
    }
    rango.addEventListener("input", actualizar);
    actualizar();

    // Invitación: la primera vez que se ve, el simulador se "prueba solo" una vez
    if (!reduce) {
      let hecho = false;
      let cancelar = null;
      ["pointerdown", "keydown", "touchstart"].forEach(function (ev) {
        rango.addEventListener(
          ev,
          function () {
            if (cancelar) cancelar();
          },
          { passive: true }
        );
      });
      observar(
        rango,
        function (v) {
          if (!v || hecho) return;
          hecho = true;
          cancelar = tween(0, 640, 1800, function (val) {
            rango.value = String(Math.round(val / 5) * 5);
            actualizar();
          });
        },
        { threshold: 0.6 }
      );
    }
  }

  /* ============ Hotspots sobre la foto real ============ */
  const HOTS = [
    { t: "Celda de carga", d: "El sensor que convierte el peso en una señal eléctrica. Va bajo la plataforma, en las esquinas." },
    { t: "Otra celda de carga", d: "Cada celda siente una parte del peso; el indicador las suma para darte el total." },
    { t: "Ruedas giratorias", d: "Permiten mover la báscula de plataforma hasta donde la necesitas." },
  ];

  function iniciarHotspots() {
    const fig = qs("#foto-hot");
    const info = qs("#hot-info");
    if (!fig || !info) return;
    const botones = qsa(".hot", fig);
    let manual = false;
    let visible = false;
    let actual = -1;

    function mostrar(i) {
      actual = i;
      botones.forEach(function (b, j) {
        b.classList.toggle("is-on", j === i);
      });
      const h = HOTS[i];
      info.textContent = "";
      const t = d.createElement("b");
      t.textContent = h.t;
      const s = d.createElement("span");
      s.textContent = h.d;
      info.appendChild(t);
      info.appendChild(s);
    }
    botones.forEach(function (b, i) {
      b.addEventListener("click", function () {
        manual = true;
        mostrar(i);
      });
    });
    observar(fig, function (v) {
      visible = v;
    });
    if (!reduce) {
      setInterval(function () {
        if (manual || !visible || d.hidden) return;
        mostrar((actual + 1) % botones.length);
      }, 3800);
    }
  }

  /* ============ Visor de fotos ============ */
  function iniciarVisor() {
    const dlg = qs("#visor");
    const items = qsa("[data-visor]");
    if (!dlg || !items.length) return;
    const img = qs("#visor-img");
    const pie = qs("#visor-pie");
    let idx = 0;

    function pintar(i) {
      idx = (i + items.length) % items.length;
      const it = items[idx];
      const mini = qs("img", it);
      img.src = it.getAttribute("data-visor");
      img.alt = mini ? mini.alt : "";
      img.style.clipPath = it.getAttribute("data-clip") ? "inset(" + it.getAttribute("data-clip") + ")" : "";
      pie.textContent = it.getAttribute("data-pie") || "";
    }
    function abrir(i) {
      pintar(i);
      if (typeof dlg.showModal === "function") {
        if (!dlg.open) dlg.showModal();
      } else {
        dlg.setAttribute("open", "");
      }
    }
    function cerrar() {
      if (typeof dlg.close === "function") dlg.close();
      else dlg.removeAttribute("open");
    }
    items.forEach(function (it, i) {
      it.addEventListener("click", function () {
        abrir(i);
      });
    });
    qs("#visor-cerrar").addEventListener("click", cerrar);
    qs("#visor-prev").addEventListener("click", function () {
      pintar(idx - 1);
    });
    qs("#visor-next").addEventListener("click", function () {
      pintar(idx + 1);
    });
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg) cerrar();
    });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") pintar(idx - 1);
      if (e.key === "ArrowRight") pintar(idx + 1);
    });
  }

  /* ============ Configurador ============ */
  const REC = {
    "Plataforma": { h: "Lo tuyo es una báscula de plataforma.", b: "Plataforma", x: "Es la opción para pesar tarimas, bultos y mercancía del día a día: plataforma de acero, celdas de carga e indicador de peso a la vista." },
    "Tolva": { h: "Lo tuyo es una báscula de tolva.", b: "Tolva", x: "Pensada para material a granel: sensores de carga en cada apoyo para saber con exactitud lo que entra y lo que sale." },
    "Camionera": { h: "Lo tuyo es una báscula camionera.", b: "Camionera", x: "Para pesar camiones y remolques completos de un solo paso, con un deck robusto y preparado para el tráfico pesado." },
    "Ganadera": { h: "Lo tuyo es una báscula ganadera.", b: "Ganadera", x: "Para pesar ganado con control: mangas o jaulas con celdas de carga y el indicador al alcance del operador." },
    "Otra / no estoy seguro": { h: "Lo vemos juntos, paso a paso.", b: "Por definir contigo", x: "No pasa nada: cuéntanos qué necesitas pesar y revisamos contigo qué báscula, qué indicador y qué sensores convienen." },
  };
  const SERV = {
    "Comprar una báscula": "Te asesoramos para elegir la adecuada y la dejamos instalada y lista para trabajar.",
    "Instalar indicador de peso o sensores de carga": "Instalamos el indicador de peso y los sensores (celdas) de carga que tu equipo necesita.",
    "Mantenimiento de mi báscula": "Revisamos tu báscula y le damos mantenimiento para que vuelva a leer con confianza.",
    "No lo sé, necesito asesoría": "Platicamos y te orientamos paso a paso.",
  };

  function ponerSelect(sel, valor) {
    const el = qs(sel);
    if (!el) return;
    for (let i = 0; i < el.options.length; i++) {
      if (el.options[i].text === valor) {
        el.selectedIndex = i;
        return;
      }
    }
  }

  function iniciarConfigurador() {
    const caja = qs("#cfg");
    if (!caja) return;
    const p1 = qs('[data-paso="1"]', caja);
    const p2 = qs('[data-paso="2"]', caja);
    const p3 = qs('[data-paso="3"]', caja);
    const barras = qsa(".cfg__progreso li", caja);
    const elecc = { tipo: "", queTipo: "", serv: "" };

    function mostrar(n) {
      p1.hidden = n !== 1;
      p2.hidden = n !== 2;
      p3.hidden = n !== 3;
      barras.forEach(function (b, i) {
        b.classList.toggle("on", i < n);
      });
    }
    mostrar(1);

    qsa(".opcion", p1).forEach(function (b) {
      b.addEventListener("click", function () {
        elecc.tipo = b.getAttribute("data-valor");
        elecc.queTipo = qs("b", b).textContent;
        mostrar(2);
      });
    });
    qsa(".opcion", p2).forEach(function (b) {
      b.addEventListener("click", function () {
        elecc.serv = b.getAttribute("data-valor");
        const rec = REC[elecc.tipo] || REC["Otra / no estoy seguro"];
        qs("#cfg-res-titulo").textContent = rec.h;
        qs("#cfg-res-texto").textContent = rec.x + " " + (SERV[elecc.serv] || "");
        const ul = qs("#cfg-res-resumen");
        ul.textContent = "";
        [["Pesas", elecc.queTipo], ["Báscula", rec.b], ["Servicio", elecc.serv]].forEach(function (par) {
          const li = d.createElement("li");
          const b = d.createElement("b");
          b.textContent = par[0];
          const s = d.createElement("span");
          s.textContent = par[1];
          li.appendChild(b);
          li.appendChild(s);
          ul.appendChild(li);
        });
        mostrar(3);
      });
    });
    qsa("[data-atras]", caja).forEach(function (b) {
      b.addEventListener("click", function () {
        mostrar(1);
      });
    });
    qsa("[data-reiniciar]", caja).forEach(function (b) {
      b.addEventListener("click", function () {
        mostrar(1);
      });
    });
    const cta = qs("#cfg-cta");
    if (cta) {
      cta.addEventListener("click", function () {
        ponerSelect("#f-tipo", elecc.tipo);
        ponerSelect("#f-servicio", elecc.serv);
      });
    }
  }

  function iniciarCtasTipo() {
    qsa("[data-tipo]").forEach(function (a) {
      a.addEventListener("click", function () {
        ponerSelect("#f-tipo", a.getAttribute("data-tipo"));
      });
    });
  }

  /* ============ Preguntas frecuentes ============ */
  function iniciarFAQ() {
    const items = qsa(".faq__item");
    items.forEach(function (item) {
      const btn = qs(".faq__btn", item);
      btn.addEventListener("click", function () {
        const abrir = btn.getAttribute("aria-expanded") !== "true";
        items.forEach(function (o) {
          o.classList.remove("is-open");
          qs(".faq__btn", o).setAttribute("aria-expanded", "false");
        });
        if (abrir) {
          item.classList.add("is-open");
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  /* ============ Contacto y WhatsApp ============ */
  function iniciarContacto() {
    const form = qs("#form-contacto");
    const visita = qs("#visita");
    const fab = qs("#wa-fab");
    const num = numeroWA();

    if (!num) {
      // Sin número real: se ocultan el botón flotante y el envío; queda la visita al taller
      if (form) form.hidden = true;
      if (visita) visita.hidden = false;
      if (fab) fab.hidden = true;
      return;
    }

    if (fab) {
      fab.hidden = false;
      fab.href = "https://wa.me/" + num + "?text=" + encodeURIComponent("Hola, vi la página de " + NEGOCIO + " y quiero una cotización.");
      fab.target = "_blank";
      fab.rel = "noopener noreferrer";
    }
    if (!form) return;
    const nombre = qs("#f-nombre");
    const error = qs("#form-error");
    nombre.addEventListener("input", function () {
      nombre.classList.remove("is-error");
      if (error) error.hidden = true;
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const quien = nombre.value.trim();
      if (!quien) {
        nombre.classList.add("is-error");
        if (error) error.hidden = false;
        nombre.focus();
        return;
      }
      const servicio = qs("#f-servicio").value;
      const tipo = qs("#f-tipo").value;
      const extra = qs("#f-mensaje").value.trim();
      const lineas = [
        "Hola, soy " + quien + ".",
        "Quiero cotizar: " + servicio + ".",
        "Tipo de báscula: " + tipo + ".",
        extra ? "Detalles: " + extra : "",
        "(Enviado desde la página de " + NEGOCIO + ")",
      ].filter(Boolean);
      window.open("https://wa.me/" + num + "?text=" + encodeURIComponent(lineas.join("\n")), "_blank", "noopener");
    });
  }

  /* ============ Arranque ============ */
  function init() {
    root.classList.add("js-ok");
    seguro(iniciarCargador);
    heroEl = qs(".hero");
    progresoEl = qs("#progreso");
    cabEl = qs("#cabecera");
    exp.sec = qs("#campo");
    proc.lista = qs("#proc-lista");
    proc.pasos = qsa(".proc__paso");

    seguro(iniciarReveal);
    seguro(iniciarMenu);
    seguro(iniciarNavActiva);
    seguro(iniciarPunteros);
    seguro(iniciarCircuito);
    seguro(iniciarHeroLED);
    seguro(iniciarLEDsAuto);
    seguro(iniciarTilt);
    seguro(iniciarTipos);
    seguro(iniciarAnat);
    seguro(iniciarSim);
    seguro(iniciarHotspots);
    seguro(iniciarVisor);
    seguro(iniciarConfigurador);
    seguro(iniciarCtasTipo);
    seguro(iniciarFAQ);
    seguro(iniciarContacto);
    seguro(configurar);

    window.addEventListener("scroll", pedirFrame, { passive: true });
    window.addEventListener(
      "resize",
      debounce(function () {
        seguro(configurar);
        pedirFrame();
      }, 160)
    );
    window.addEventListener("load", function () {
      seguro(configurar);
      pedirFrame();
    });
    mqPin.addEventListener("change", function () {
      seguro(configurar);
      pedirFrame();
    });
    pedirFrame();
  }

  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", init);
  else init();
})();
