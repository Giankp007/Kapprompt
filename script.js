/* ==========================================================================
   KapPrompt — script.js
   ========================================================================== */
'use strict';

document.documentElement.classList.add('js');

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/* --------------------------------------------------------------------------
   1. CONTAINER SCROLL — vanilla port of the Aceternity / framer-motion
      component: rotateX 20° → 0°, scale [1.05 → 1] (desktop) /
      [0.72 → 0.92] (mobile), header translateY 0 → -100px.
   -------------------------------------------------------------------------- */
(function containerScroll() {
  const device = document.getElementById('device');
  const head = document.getElementById('heroHead');
  if (!device || !head) return;

  if (prefersReduced) return; // CSS sets transform: none

  let isMobile = window.innerWidth <= 768;
  let ticking = false;

  function update() {
    ticking = false;
    const runway = window.innerHeight * 0.85;     // scroll distance to flatten
    const t = clamp(window.scrollY / runway, 0, 1);

    const rotate = 20 * (1 - t);
    const scale = isMobile
      ? 0.72 + (0.92 - 0.72) * t
      : 1.05 - (1.05 - 1.0) * t;

    device.style.transform =
      'rotateX(' + rotate.toFixed(2) + 'deg) scale(' + scale.toFixed(3) + ')';
    head.style.transform = 'translateY(' + (-100 * t).toFixed(1) + 'px)';
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    isMobile = window.innerWidth <= 768;
    onScroll();
  });
  update();
})();

/* --------------------------------------------------------------------------
   2. NAV — scrolled state + mobile menu
   -------------------------------------------------------------------------- */
(function nav() {
  const bar = document.querySelector('.nav');
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');

  const onScroll = () => bar.classList.toggle('scrolled', window.scrollY > 12);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Menü schliessen' : 'Menü öffnen');
    });
    links.addEventListener('click', (e) => {
      if (e.target.closest('a')) {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('click', (e) => {
      if (!links.contains(e.target) && !toggle.contains(e.target)) {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
})();

/* --------------------------------------------------------------------------
   3. REVEAL ON SCROLL
   -------------------------------------------------------------------------- */
(function reveals() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || prefersReduced) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
  );
  els.forEach((el) => io.observe(el));
})();

/* --------------------------------------------------------------------------
   4. COUNT-UP STATS
   -------------------------------------------------------------------------- */
(function counters() {
  const counts = document.querySelectorAll('.count');
  if (!counts.length) return;

  const easeOutQuart = (x) => 1 - Math.pow(1 - x, 4);

  function run(el) {
    const target = parseInt(el.dataset.count, 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    if (prefersReduced || isNaN(target)) {
      el.textContent = prefix + (el.dataset.count || '') + suffix;
      return;
    }
    const dur = 1300;
    const start = performance.now();
    function frame(now) {
      const p = clamp((now - start) / dur, 0, 1);
      el.textContent = prefix + Math.round(target * easeOutQuart(p)) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (!('IntersectionObserver' in window)) {
    counts.forEach(run);
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          run(entry.target);
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );
  counts.forEach((el) => io.observe(el));
})();

/* --------------------------------------------------------------------------
   5. TYPING LINE in the hero mock
   -------------------------------------------------------------------------- */
(function typing() {
  const el = document.getElementById('typeLine');
  if (!el) return;
  const text =
    'Künstliche Intelligenz verändert, wie Schweizer KMU arbeiten — wer jetzt einsteigt, spart Zeit und Geld.';
  if (prefersReduced) {
    el.textContent = text;
    return;
  }
  let i = 0;
  (function tick() {
    if (i <= text.length) {
      el.textContent = text.slice(0, i++);
      setTimeout(tick, 26 + Math.random() * 40);
    }
  })();
})();

/* --------------------------------------------------------------------------
   6. FAQ — smooth open/close height animation (native <details> fallback)
   -------------------------------------------------------------------------- */
(function faq() {
  if (prefersReduced) return;
  document.querySelectorAll('.faq details').forEach((details) => {
    const summary = details.querySelector('summary');
    const panel = details.querySelector('.faq__a');
    if (!summary || !panel || !panel.animate) return;

    summary.addEventListener('click', (e) => {
      e.preventDefault();
      if (details.open) {
        const h = panel.offsetHeight;
        const anim = panel.animate(
          [{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
          { duration: 240, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
        );
        anim.onfinish = () => { details.open = false; };
      } else {
        details.open = true;
        const h = panel.offsetHeight;
        panel.animate(
          [{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }],
          { duration: 280, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
        );
      }
    });
  });
})();

/* --------------------------------------------------------------------------
   7. PRICING → CONTACT — preselect the chosen package
   -------------------------------------------------------------------------- */
(function planLinks() {
  const select = document.getElementById('interestSelect');
  if (!select) return;
  document.querySelectorAll('[data-plan]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const wanted = btn.dataset.plan;
      [...select.options].forEach((o) => {
        if (o.text === wanted) select.value = o.text;
      });
    });
  });
})();

/* --------------------------------------------------------------------------
   8. CONTACT FORM — Formspree (set your endpoint below) + mailto fallback
   -------------------------------------------------------------------------- */
(function contactForm() {
  /* >>> HIER deine Formspree-URL eintragen, z. B.
     const FORM_ENDPOINT = 'https://formspree.io/f/abcdwxyz';            <<< */
  const FORM_ENDPOINT = '';

  const form = document.getElementById('contactForm');
  const btn = document.getElementById('submitBtn');
  const success = document.getElementById('formSuccess');
  if (!form || !btn) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!form.reportValidity()) return;

    const data = new FormData(form);

    if (!FORM_ENDPOINT) {
      // Fallback: open the user's mail program with a prefilled message
      const subject = encodeURIComponent('Anfrage über kapprompt.ch — ' + (data.get('interesse') || ''));
      const body = encodeURIComponent(
        'Name: ' + (data.get('name') || '') + '\n' +
        'E-Mail: ' + (data.get('email') || '') + '\n' +
        'Firma: ' + (data.get('firma') || '-') + '\n' +
        'Interesse an: ' + (data.get('interesse') || '') + '\n\n' +
        (data.get('nachricht') || '')
      );
      window.location.href = 'mailto:gian@kapprompt.ch?subject=' + subject + '&body=' + body;
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Wird gesendet...';

    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) throw new Error('send failed');
      success.hidden = false;
      form.querySelectorAll('input, select, textarea').forEach((f) => (f.disabled = true));
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Nachricht senden';
      alert('Senden hat leider nicht geklappt. Schreib uns direkt an gian@kapprompt.ch');
    }
  });
})();
