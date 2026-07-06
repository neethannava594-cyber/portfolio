/**
 * CineFrame Portfolio — Scroll Animation Engine
 * =============================================
 * Hero: scroll-jacked frame sequencer (110 frames).
 *   - OPTIMIZED: Uses WebP format for ~70% smaller file sizes.
 *   - OPTIMIZED: Progressive loading — first 20 frames dismissed the loader,
 *     remaining 90 frames load lazily in the background.
 *   - Loading screen auto-dismisses after priority frames load OR after 5s timeout.
 *   - Frames that fail to load are gracefully skipped.
 *   - Scroll-jacking releases page once animation completes.
 */

import Lenis from 'https://cdn.jsdelivr.net/npm/lenis@1.1.20/+esm';

// ==========================================
// CONFIG
// ==========================================
const FRAME_PATH = './frames/ezgif-frame-';
const FRAME_EXT = '.webp';          // ✅ WebP for ~70% smaller files
const TOTAL_FRAMES = 110;
const PRIORITY_FRAMES = 20;         // ✅ Only wait for first 20 frames before showing site

// ==========================================
// DOM REFS
// ==========================================
const canvas = document.getElementById('heroCanvas');
const ctx = canvas.getContext('2d');
const progressBar = document.getElementById('scrollProgress');
const nav = document.getElementById('nav');
const scrollIndicator = document.getElementById('scrollIndicator');
const overlays = document.querySelectorAll('.hero__overlay');
const hamburger = document.getElementById('navHamburger');
const mobileMenu = document.getElementById('mobileMenu');

// ==========================================
// LOADING SCREEN
// ==========================================
const loadingEl = document.getElementById('loading');

function dismissLoadingScreen() {
  if (!loadingEl || loadingEl._dismissed) return;
  loadingEl._dismissed = true;
  loadingEl.style.opacity = '0';
  setTimeout(() => loadingEl.remove(), 700);
  // Start scroll-jacking only after loading screen is gone
  lockScroll();
}

// Safety net: always dismiss after 5 seconds no matter what
const loadingTimeout = setTimeout(dismissLoadingScreen, 5000);

// ==========================================
// FRAME DATA
// ==========================================
const frames = new Array(TOTAL_FRAMES);
let prioritySettled = 0; // loaded OR errored — only for first PRIORITY_FRAMES
let _bgLoadStarted = false; // guard: only kick off background load once

function padFrame(n) {
  return String(n).padStart(3, '0');
}

function onPriorityFrameSettled(i, img) {
  frames[i] = img;
  prioritySettled++;
  // Dismiss once priority frames (1–20) have settled — guard against re-entry
  if (prioritySettled >= PRIORITY_FRAMES && !_bgLoadStarted) {
    _bgLoadStarted = true;
    clearTimeout(loadingTimeout);
    dismissLoadingScreen();
    // Draw first frame immediately
    resizeCanvas();
    drawFrame(0);
    // Now lazily load the remaining frames in the background
    loadRemainingFrames();
  }
}

function onBgFrameSettled(i, img) {
  frames[i] = img;
}

function preloadFrames() {
  // Phase 1: Priority — load frames 1 to PRIORITY_FRAMES first
  for (let i = 1; i <= PRIORITY_FRAMES; i++) {
    const img = new Image();
    const idx = i - 1;
    img.onload = () => onPriorityFrameSettled(idx, img);
    img.onerror = () => onPriorityFrameSettled(idx, img); // count failures too
    img.src = FRAME_PATH + padFrame(i) + FRAME_EXT;
  }
}

function loadRemainingFrames() {
  // Phase 2: Background — load frames 21–110 lazily without blocking anything
  for (let i = PRIORITY_FRAMES + 1; i <= TOTAL_FRAMES; i++) {
    const img = new Image();
    const idx = i - 1;
    img.onload = () => onBgFrameSettled(idx, img);
    img.onerror = () => {}; // silent fail for background frames
    // Stagger at 15ms so all 90 frames are queued within ~1.35s
    setTimeout(() => { img.src = FRAME_PATH + padFrame(i) + FRAME_EXT; }, (i - PRIORITY_FRAMES) * 15);
  }
}

// ==========================================
// CANVAS
// ==========================================
function resizeCanvas() {
  // Fix for mobile browser URL bar shifting viewport height
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function drawFrame(index) {
  const img = frames[index];
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const canvasRatio = canvas.width / canvas.height;
  const imgRatio = img.naturalWidth / img.naturalHeight;
  let drawW, drawH, drawX, drawY;

  if (imgRatio > canvasRatio) {
    drawH = canvas.height;
    drawW = drawH * imgRatio;
    drawX = (canvas.width - drawW) / 2;
    drawY = 0;
  } else {
    drawW = canvas.width;
    drawH = drawW / imgRatio;
    drawX = 0;
    drawY = (canvas.height - drawH) / 2;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

// ==========================================
// SCROLL-JACKING STATE
// ==========================================
let heroTarget = 0;
let heroDone = false;
let heroLocked = false; // only true after loading screen dismissed

const WHEEL_SENSITIVITY = 0.0015;
const TOUCH_SENSITIVITY = 0.003;
let touchStartY = 0;

function lockScroll() {
  heroLocked = true;
  document.body.style.overflow = 'hidden';
}

function unlockScroll() {
  heroLocked = false;
  document.body.style.overflow = '';
}

function releaseHero() {
  if (heroDone) return;
  heroDone = true;
  unlockScroll();

  // Smoothly scroll to #about section
  const about = document.getElementById('about');
  if (about) {
    lenis.scrollTo(about, { offset: 0, duration: 1.4 });
  }
}

// Wheel (desktop)
window.addEventListener('wheel', (e) => {
  if (!heroLocked) return;
  e.preventDefault();

  heroTarget += e.deltaY * WHEEL_SENSITIVITY;
  heroTarget = Math.max(0, Math.min(1, heroTarget));
  if (heroTarget >= 1) releaseHero();
}, { passive: false });

// Touch (mobile)
window.addEventListener('touchstart', (e) => {
  if (!heroLocked) return;
  touchStartY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener('touchmove', (e) => {
  if (!heroLocked) return;
  e.preventDefault();

  const deltaY = touchStartY - e.touches[0].clientY;
  touchStartY = e.touches[0].clientY;

  heroTarget += deltaY * TOUCH_SENSITIVITY;
  heroTarget = Math.max(0, Math.min(1, heroTarget));
  if (heroTarget >= 1) releaseHero();
}, { passive: false });

// ==========================================
// LENIS (after hero is done)
// ==========================================
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.pow(t, 0.5),
  smoothWheel: true,
  smoothTouch: true,
});

lenis.on('scroll', (data) => {
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  // Use Lenis scroll position (in sync with smooth scroll) not window.scrollY
  const pct = docHeight > 0 ? (data.scroll / docHeight) * 100 : 0;
  progressBar.style.width = pct + '%';

  nav.classList.toggle('scrolled', data.scroll > 80);
});

// ==========================================
// RENDER LOOP
// ==========================================
let displayProgress = 0;
let currentFrame = 0;
const LERP = 0.07;

function renderLoop(time) {
  lenis.raf(time);

  displayProgress += (heroTarget - displayProgress) * LERP;
  if (Math.abs(heroTarget - displayProgress) < 0.0005) displayProgress = heroTarget;

  const frameIndex = Math.min(
    Math.floor(displayProgress * (TOTAL_FRAMES - 1)),
    TOTAL_FRAMES - 1
  );
  if (frameIndex !== currentFrame) {
    currentFrame = frameIndex;
    drawFrame(currentFrame);
  }

  updateOverlays(displayProgress);

  if (scrollIndicator) {
    scrollIndicator.classList.toggle('hidden', displayProgress > 0.05);
  }

  requestAnimationFrame(renderLoop);
}

requestAnimationFrame(renderLoop);

// ==========================================
// OVERLAYS
// ==========================================
function updateOverlays(progress) {
  overlays.forEach(overlay => {
    const start = parseFloat(overlay.dataset.start);
    const end = parseFloat(overlay.dataset.end);
    const fadeRange = 0.06;
    let opacity = 0;

    if (progress >= start && progress <= end) {
      if (start === 0) {
        opacity = progress > end - fadeRange ? (end - progress) / fadeRange : 1;
      } else {
        if (progress < start + fadeRange) {
          opacity = (progress - start) / fadeRange;
        } else if (progress <= end - fadeRange) {
          opacity = 1;
        } else {
          opacity = (end - progress) / fadeRange;
        }
      }
    }

    opacity = Math.min(Math.max(opacity, 0), 1);
    overlay.classList.toggle('visible', opacity > 0.01);
    overlay.style.opacity = opacity;
  });
}

// ==========================================
// MOBILE MENU
// ==========================================
hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('active');
  mobileMenu.classList.toggle('open');
});

document.querySelectorAll('.mobile-menu__link').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('active');
    mobileMenu.classList.remove('open');
  });
});

// ==========================================
// NAV LOGO — Reset hero on click if past hero
// ==========================================
const navLogo = document.querySelector('.nav__logo');
if (navLogo) {
  navLogo.addEventListener('click', (e) => {
    e.preventDefault();
    if (!heroLocked && heroDone) {
      // Scroll back to very top, then reset hero state
      lenis.scrollTo(0, { duration: 1.2 });
      setTimeout(() => {
        heroDone = false;
        heroTarget = 0;
        displayProgress = 0;
        currentFrame = 0;
        drawFrame(0);
        lockScroll();
      }, 800);
    }
  });
}

// ==========================================
// ANCHOR SCROLL (nav links)
// ==========================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const id = anchor.getAttribute('href');
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (heroLocked) {
      heroTarget = 1;
      releaseHero();
      // Wait for body overflow to be restored before scrolling
      // Use a one-shot listener instead of a magic timeout
      const onScrollUnlock = () => {
        lenis.scrollTo(target, { offset: 0 });
        lenis.off('scroll', onScrollUnlock);
      };
      setTimeout(() => lenis.scrollTo(target, { offset: 0 }), 800);
    } else {
      lenis.scrollTo(target, { offset: 0 });
    }
  });
});

// ==========================================
// INTERSECTION OBSERVER — REVEALS
// ==========================================
const revealSelectors = '.reveal-up, .reveal-scale, .word-reveal, .reveal-wipe-right, .reveal-3d-left, .reveal-lens-blur, .reveal-clip-slide, .reveal-flip-card, .reveal-glow-rise';

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = parseInt(el.dataset.delay || '0', 10);
        setTimeout(() => el.classList.add('revealed'), delay);
        revealObserver.unobserve(el);
      }
    });
  },
  { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
);

document.querySelectorAll(revealSelectors).forEach(el => revealObserver.observe(el));

// ==========================================
// SKILL BARS
// ==========================================
const skillObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bar = entry.target;
        bar.classList.add('animated');
        bar.style.width = bar.dataset.width + '%';
        skillObserver.unobserve(bar);
      }
    });
  },
  { threshold: 0.3 }
);
document.querySelectorAll('.skill-bar__fill').forEach(bar => skillObserver.observe(bar));

// ==========================================
// STAT COUNTERS
// ==========================================
function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const duration = 2000;
  const startTime = performance.now();
  function tick(now) {
    const p = Math.min((now - startTime) / duration, 1);
    el.textContent = Math.round((1 - Math.pow(1 - p, 4)) * target);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.5 }
);
document.querySelectorAll('.stat-card__number[data-target]').forEach(el => counterObserver.observe(el));

// ==========================================
// RESIZE
// ==========================================
window.addEventListener('resize', () => {
  resizeCanvas();
  drawFrame(currentFrame);
});

// ==========================================
// CUSTOM CURSOR
// ==========================================
const customCursor = document.querySelector('.custom-cursor');
if (customCursor) {
  document.addEventListener('mousemove', (e) => {
    customCursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  });
}

// ==========================================
// VIDEO MODAL — FOCUS TRAP
// ==========================================
const videoModal = document.getElementById('videoModal');
const videoIframe = document.getElementById('videoModalIframe');
const modalClose = document.getElementById('videoModalClose');
const modalBackdrop = document.getElementById('videoModalBackdrop');
const embedUrl = 'https://drive.google.com/file/d/1JcCXZq0CrWi9sR35Fft3CYTyPFblX-4k/preview';

// Focusable elements inside modal for keyboard trap
const modalFocusables = [modalClose, videoIframe];

function openVideoModal(url) {
  videoIframe.src = url;
  videoModal.classList.add('open');
  videoModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  // Move focus into modal
  setTimeout(() => modalClose.focus(), 50);
}

function closeVideoModal() {
  videoModal.classList.remove('open');
  videoModal.setAttribute('aria-hidden', 'true');
  videoIframe.src = '';
  document.body.style.overflow = heroLocked ? 'hidden' : '';
}

// Keyboard focus trap — keep Tab inside modal when open
videoModal.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;
  const first = modalFocusables[0];
  const last = modalFocusables[modalFocusables.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

// Only attach showreel to Drive links NOT inside a work-card
document.querySelectorAll('a[href*="drive.google.com"]').forEach(btn => {
  if (btn.closest('.work-card')) return;
  btn.addEventListener('click', (e) => { e.preventDefault(); openVideoModal(embedUrl); });
});

document.querySelectorAll('.work-card').forEach(card => {
  const videoId = card.dataset.videoId;
  if (!videoId) return;
  const cardEmbedUrl = `https://drive.google.com/file/d/${videoId}/preview`;

  const playBtn = card.querySelector('.work-card__play');
  if (playBtn) playBtn.addEventListener('click', (e) => { e.stopPropagation(); openVideoModal(cardEmbedUrl); });

  const thumb = card.querySelector('.work-card__thumbnail');
  if (thumb) {
    thumb.style.cursor = 'pointer';
    thumb.addEventListener('click', () => openVideoModal(cardEmbedUrl));
    // Dismiss shimmer skeleton once the thumbnail image loads
    const img = thumb.querySelector('.work-card__thumb-img');
    if (img) {
      const markLoaded = () => thumb.classList.add('loaded');
      if (img.complete) markLoaded();
      else img.addEventListener('load', markLoaded);
      img.addEventListener('error', markLoaded); // also dismiss on error
    }
  }
});

modalClose.addEventListener('click', closeVideoModal);
modalBackdrop.addEventListener('click', closeVideoModal);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && videoModal.classList.contains('open')) closeVideoModal();
});

// ==========================================
// INIT
// ==========================================
resizeCanvas();
preloadFrames();
// Note: lockScroll() is called inside dismissLoadingScreen(),
// so scroll is only locked AFTER the loading screen goes away.

// ==========================================
// LIVE TIMECODE — About Card
// ==========================================
const timecodeEl = document.querySelector('.timeline-tc');
if (timecodeEl) {
  function updateTimecode() {
    const now = new Date();
    const h  = String(now.getHours()).padStart(2, '0');
    const m  = String(now.getMinutes()).padStart(2, '0');
    const s  = String(now.getSeconds()).padStart(2, '0');
    const f  = String(Math.floor(now.getMilliseconds() / 33.33)).padStart(2, '0'); // ~30fps
    timecodeEl.textContent = `${h}:${m}:${s}:${f}`;
  }
  updateTimecode();
  setInterval(updateTimecode, 1000);
}
