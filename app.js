/**
 * app.js — Birthday Experience Controller
 *
 * BUG FIXES from uploaded version:
 *  1. triggerStagger: remove + re-add .visible was happening in the same
 *     RAF frame — transitions never fired. Fixed with two separate frames.
 *  2. startMusic: musicToggle button text defaulted to ⏸ even when
 *     audio element doesn't exist / autoplay is blocked.
 *  3. initSwipeNav: referenced bare `lightbox` variable (undefined at
 *     module scope). Fixed to query the DOM safely each time.
 *  4. Gallery polaroid rotate CSS variables removed from HTML — cleaner
 *     and avoids inline style/CSS variable interaction bugs on Safari.
 */

// ─────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────
const CONFIG = {
  name:       'Endurance',
  birthYear:  2002,
  birthMonth: 7,   // 1-indexed
  birthDay:   15,
};

const VIEW_ORDER = ['countdown', 'reveal', 'memories', 'gallery', 'letter'];


// ─────────────────────────────────────────
// VIEW REGISTRY
// ─────────────────────────────────────────
const views = {};

function registerView(name, hooks = {}) {
  const el = document.getElementById(`view-${name}`);
  if (!el) { console.warn(`View not found: view-${name}`); return; }
  views[name] = { el, ...hooks };
}


// ─────────────────────────────────────────
// APP — public API
// ─────────────────────────────────────────
const App = {

  current: 'countdown',
  _transitioning: false,

  go(next) {
    if (next === this.current || this._transitioning) return;
    if (!views[next]) return;

    this._transitioning = true;

    const overlay = document.getElementById('overlay');
    const from = views[this.current];
    const to   = views[next];

    overlay.classList.add('flash');
    if (from.onExit) from.onExit();
    from.el.classList.remove('active');
    from.el.classList.add('exit');

    setTimeout(() => {
      from.el.classList.remove('exit');
      overlay.classList.remove('flash');

      to.el.scrollTop = 0;
      to.el.classList.add('active');
      if (to.onEnter) to.onEnter();

      this.current = next;
      this._transitioning = false;
      updateProgressNav(next);
    }, 380);
  },

  goNext() {
    const idx = VIEW_ORDER.indexOf(this.current);
    if (idx < VIEW_ORDER.length - 1) this.go(VIEW_ORDER[idx + 1]);
  },

  goPrev() {
    const idx = VIEW_ORDER.indexOf(this.current);
    if (idx > 0) this.go(VIEW_ORDER[idx - 1]);
  },

  celebrate() {
    launchConfetti('burst');
  },

  toggleMusic() {
    const music = document.getElementById('bgMusic');
    const btn   = document.getElementById('musicToggle');
    if (!music) return;

    if (music.paused) {
      music.play().catch(() => {});
      if (btn) btn.textContent = '⏸ Pause Music';
    } else {
      music.pause();
      if (btn) btn.textContent = '▶ Play Music';
    }
  },
};


// ─────────────────────────────────────────
// PROGRESS NAV
// ─────────────────────────────────────────
function updateProgressNav(current) {
  document.querySelectorAll('#progress-nav button').forEach(btn => {
    btn.classList.toggle('active-nav', btn.dataset.view === current);
  });
}

function initProgressNav() {
  document.querySelectorAll('#progress-nav button').forEach(btn => {
    btn.addEventListener('click', () => App.go(btn.dataset.view));
  });
  updateProgressNav('countdown');
}


// ─────────────────────────────────────────
// CONFETTI
// ─────────────────────────────────────────
function launchConfetti(style = 'burst') {
  if (typeof confetti === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  if (style === 'burst') {
    confetti({ particleCount: 220, spread: 120, origin: { y: 0.55 } });
    setTimeout(() => confetti({ particleCount: 80, spread: 80, origin: { y: 0.4, x: 0.2 } }), 250);
    setTimeout(() => confetti({ particleCount: 80, spread: 80, origin: { y: 0.4, x: 0.8 } }), 400);
  }

  if (style === 'rain') {
    let count = 0;
    const rain = setInterval(() => {
      confetti({ particleCount: 12, spread: 60, origin: { y: 0, x: Math.random() } });
      if (++count >= 8) clearInterval(rain);
    }, 300);
  }
}


// ─────────────────────────────────────────
// MUSIC
// BUG FIX: button text now stays "▶ Play Music"
// when the audio element is missing or autoplay
// is blocked, instead of showing ⏸ incorrectly.
// ─────────────────────────────────────────
function startMusic() {
  const music = document.getElementById('bgMusic');
  const btn   = document.getElementById('musicToggle');
  if (!music) return;

  music.volume = 0;
  music.play().then(() => {
    // Autoplay succeeded — fade in and update button
    if (btn) btn.textContent = '⏸ Pause Music';
    let vol = 0;
    const fadeIn = setInterval(() => {
      vol = Math.min(vol + 0.05, 0.6);
      music.volume = vol;
      if (vol >= 0.6) clearInterval(fadeIn);
    }, 100);
  }).catch(() => {
    // Autoplay blocked by browser — leave button as "▶ Play Music"
    // so user can tap to start manually
    if (btn) btn.textContent = '▶ Play Music';
  });
}


// ─────────────────────────────────────────
// PARTICLES
// ─────────────────────────────────────────
function initParticles() {
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  const SYMBOLS = ['✦', '✧', '❤', '✿', '·', '★'];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const items = Array.from({ length: 30 }, () => ({
    x:      Math.random() * window.innerWidth,
    y:      Math.random() * window.innerHeight,
    s:      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    size:   Math.random() * 14 + 8,
    speed:  Math.random() * 0.4 + 0.15,
    drift:  (Math.random() - 0.5) * 0.3,
    alpha:  Math.random() * 0.3 + 0.1,
    wobble: Math.random() * Math.PI * 2,
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const W = canvas.width, H = canvas.height;
    items.forEach(p => {
      p.y -= p.speed;
      p.x += p.drift + Math.sin(p.wobble += 0.012) * 0.35;
      if (p.y < -30)   { p.y = H + 20; p.x = Math.random() * W; }
      if (p.x < -20)     p.x = W + 10;
      if (p.x > W + 20)  p.x = -10;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle   = '#ffffff';
      ctx.font        = `${p.size}px serif`;
      ctx.fillText(p.s, p.x, p.y);
      ctx.restore();
    });
    requestAnimationFrame(draw);
  }
  draw();
}


// ─────────────────────────────────────────
// LIGHTBOX
// ─────────────────────────────────────────
let lightboxIndex = 0;

function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  const img      = document.getElementById('lightbox-img');
  const caption  = document.getElementById('lightbox-caption');
  const counter  = document.getElementById('lightbox-counter');
  const closeBtn = document.getElementById('lightbox-close');
  const prevBtn  = document.getElementById('lightbox-prev');
  const nextBtn  = document.getElementById('lightbox-next');
  if (!lightbox) return;

  function getPolaroids() {
    return Array.from(document.querySelectorAll('#gallery-grid .polaroid'));
  }

  function show(index) {
    const polaroids = getPolaroids();
    const polaroid  = polaroids[index];
    if (!polaroid) return;
    const src = polaroid.querySelector('img')?.src || '';
    const alt = polaroid.querySelector('img')?.alt || '';
    const cap = polaroid.querySelector('.polaroid-caption')?.textContent || '';

    // Fade out, swap, fade in
    img.style.opacity   = '0';
    img.style.transform = 'scale(0.92)';
    setTimeout(() => {
      img.src             = src;
      img.alt             = alt;
      caption.textContent = cap;
      counter.textContent = `${index + 1} / ${polaroids.length}`;
      img.style.opacity   = '1';
      img.style.transform = 'scale(1)';
    }, 150);
    img.style.transition = 'opacity 0.18s ease, transform 0.32s cubic-bezier(0.34,1.56,0.64,1)';
  }

  function open(index) {
    lightboxIndex = index;
    show(index);
    lightbox.classList.add('open');
    closeBtn.focus();
  }

  function close() {
    lightbox.classList.remove('open');
  }

  function prev() {
    const n = getPolaroids().length;
    lightboxIndex = (lightboxIndex - 1 + n) % n;
    show(lightboxIndex);
  }

  function next() {
    const n = getPolaroids().length;
    lightboxIndex = (lightboxIndex + 1) % n;
    show(lightboxIndex);
  }

  // Open on polaroid click
  document.getElementById('view-gallery').addEventListener('click', e => {
    const p = e.target.closest('.polaroid');
    if (!p) return;
    open(parseInt(p.dataset.index ?? '0', 10));
  });

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) close(); });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')     close();
    if (e.key === 'ArrowLeft')  prev();
    if (e.key === 'ArrowRight') next();
  });

  // Swipe inside lightbox
  let lbTouchX = 0;
  lightbox.addEventListener('touchstart', e => { lbTouchX = e.changedTouches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - lbTouchX;
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
  }, { passive: true });
}


// ─────────────────────────────────────────
// STAGGER ANIMATION
// BUG FIX: original code removed .visible and
// re-added it in the same RAF callback, so the
// CSS transition had no "before" state to
// animate from — cards just snapped into place.
// Fix: remove in one frame, add in the next.
// ─────────────────────────────────────────
function triggerStagger(viewEl) {
  const items = viewEl.querySelectorAll('.memory-card, .polaroid');
  // First frame: ensure invisible (reset)
  items.forEach(el => el.classList.remove('visible'));
  // Second frame: add visible so transition has a starting state
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      items.forEach(el => el.classList.add('visible'));
    });
  });
}


// ─────────────────────────────────────────
// COUNTDOWN
// ─────────────────────────────────────────
function initCountdown() {
  const elDays    = document.getElementById('days');
  const elHours   = document.getElementById('hours');
  const elMinutes = document.getElementById('minutes');
  const elSeconds = document.getElementById('seconds');
  const enterWrap = document.getElementById('enter-wrap');

  // ── Set FORCE_BIRTHDAY = false for real countdown ──
  const FORCE_BIRTHDAY = true;

  function isBirthdayToday() {
    if (FORCE_BIRTHDAY) return true;
    const now = new Date();
    return now.getMonth() === CONFIG.birthMonth - 1 &&
           now.getDate()  === CONFIG.birthDay;
  }

  function getTarget() {
    const now      = new Date();
    const curr     = now.getFullYear();
    const thisYear = new Date(curr, CONFIG.birthMonth - 1, CONFIG.birthDay);
    if (now < thisYear) return thisYear;
    return new Date(curr + 1, CONFIG.birthMonth - 1, CONFIG.birthDay);
  }

  function showBirthdayState() {
    elDays.textContent = elHours.textContent =
    elMinutes.textContent = elSeconds.textContent = '00';
    enterWrap.classList.remove('hidden');
    clearInterval(timer);
  }

  function tick() {
    if (isBirthdayToday()) { showBirthdayState(); return; }

    const diff = getTarget() - new Date();
    const pad  = n => String(n).padStart(2, '0');

    elDays.textContent    = Math.floor(diff / 86400000);
    elHours.textContent   = pad(Math.floor((diff % 86400000) / 3600000));
    elMinutes.textContent = pad(Math.floor((diff % 3600000)  / 60000));
    elSeconds.textContent = pad(Math.floor((diff % 60000)    / 1000));
  }

  const timer = setInterval(tick, 1000);
  tick();
}


// ─────────────────────────────────────────
// SWIPE BETWEEN VIEWS
// BUG FIX: original referenced `lightbox`
// as a bare variable (undefined). Now queries
// the DOM safely inside the handler.
// ─────────────────────────────────────────
function initSwipeNav() {
  const SCROLLABLE = ['memories', 'gallery'];
  let startX = 0, startY = 0;

  document.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', e => {
    // BUG FIX: query fresh each time instead of captured variable
    if (document.getElementById('lightbox')?.classList.contains('open')) return;
    if (SCROLLABLE.includes(App.current)) return;

    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 55) {
      dx < 0 ? App.goNext() : App.goPrev();
    }
  }, { passive: true });
}


// ─────────────────────────────────────────
// VISUAL VIEWPORT — iPhone Safari address bar
// ─────────────────────────────────────────
function initVisualViewport() {
  if (!window.visualViewport) return;
  const update = () => {
    const vh = window.visualViewport.height * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };
  window.visualViewport.addEventListener('resize', update, { passive: true });
  window.visualViewport.addEventListener('scroll', update, { passive: true });
  update();
}


// ─────────────────────────────────────────
// KEYBOARD NAVIGATION
// ─────────────────────────────────────────
function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (document.getElementById('lightbox')?.classList.contains('open')) return;
    if (e.key === 'ArrowRight') App.goNext();
    if (e.key === 'ArrowLeft')  App.goPrev();
  });
}


// ─────────────────────────────────────────
// REGISTER VIEWS
// ─────────────────────────────────────────
registerView('countdown');

registerView('reveal', {
  onEnter() {
    launchConfetti('burst');
    startMusic();
  },
});

registerView('memories', {
  onEnter() { triggerStagger(views.memories.el); },
});

registerView('gallery', {
  onEnter() { triggerStagger(views.gallery.el); },
});

registerView('letter', {
  onEnter() { setTimeout(() => launchConfetti('rain'), 800); },
});


// ─────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initLightbox();
  initCountdown();
  initProgressNav();
  initSwipeNav();
  initKeyboard();
  initVisualViewport();

  views['countdown']?.el.classList.add('active');
});
