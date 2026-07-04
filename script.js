/**
 * CineFrame Portfolio — Scroll Animation Engine
 * =============================================
 * - Scroll-controlled canvas frame sequencer (300 frames)
 * - Text overlay fade in/out at scroll checkpoints
 * - IntersectionObserver reveals
 * - Animated stat counters
 * - Skill bar fill on scroll
 * - Smooth anchor scrolling
 * - Mobile menu toggle
 */

(function () {
  'use strict';

  // ==========================================
  // CONFIG
  // ==========================================
  const FRAME_PATH = './frames/ezgif-frame-';
  const FRAME_EXT = '.jpg';

  // ==========================================
  // DOM REFS
  // ==========================================
  const canvas = document.getElementById('heroCanvas');
  const ctx = canvas.getContext('2d');
  const heroSection = document.getElementById('hero');
  const progressBar = document.getElementById('scrollProgress');
  const nav = document.getElementById('nav');
  const scrollIndicator = document.getElementById('scrollIndicator');
  const overlays = document.querySelectorAll('.hero__overlay');
  const hamburger = document.getElementById('navHamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  const TOTAL_FRAMES = 150; // Load 150 frames (every 2nd frame) for performance
  const frames = [];
  let loadedCount = 0;
  let currentFrame = 0;

  /** Pad frame number to 3 digits: 1 → "001" */
  function padFrame(n) {
    return String(n).padStart(3, '0');
  }

  /** Preload frames with step spacing */
  function preloadFrames() {
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      const frameFileNumber = i * 2; // Step by 2 to cover all 300 frames
      img.src = FRAME_PATH + padFrame(frameFileNumber) + FRAME_EXT;
      img.onload = () => {
        loadedCount++;
        if (i === 1) {
          resizeCanvas();
          drawFrame(0);
        }
      };
      frames.push(img);
    }
  }

  /** Resize canvas to fill viewport */
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  /** Draw a specific frame index (0-based) to the canvas */
  function drawFrame(index) {
    const img = frames[index];
    if (!img || !img.complete) return;

    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = img.naturalWidth / img.naturalHeight;

    let drawW, drawH, drawX, drawY;

    // Cover fit (like background-size: cover)
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
  // SCROLL-CONTROLLED FRAME PLAYBACK (Hero Only with Inertia Smoothing)
  // ==========================================
  let targetProgress = 0;
  let currentProgress = 0;
  const lerpFactor = 0.08; // Control inertia smoothing (lower = smoother/slower, higher = faster)

  function getHeroScrollProgress() {
    const heroHeight = heroSection.offsetHeight - window.innerHeight;
    if (heroHeight <= 0) return 0;
    return Math.min(Math.max(window.scrollY / heroHeight, 0), 1);
  }

  function updateFrameOnScroll() {
    targetProgress = getHeroScrollProgress();
    
    // Hide scroll indicator after scrolling a bit
    if (targetProgress > 0.05) {
      scrollIndicator.classList.add('hidden');
    } else {
      scrollIndicator.classList.remove('hidden');
    }
  }

  // Smooth animation render loop (ideal for mobile touch gestures)
  function renderLoop() {
    // Linear interpolation
    currentProgress += (targetProgress - currentProgress) * lerpFactor;
    
    // If progress is extremely close, snap to target
    if (Math.abs(targetProgress - currentProgress) < 0.0005) {
      currentProgress = targetProgress;
    }

    const frameIndex = Math.min(
      Math.floor(currentProgress * (TOTAL_FRAMES - 1)),
      TOTAL_FRAMES - 1
    );

    if (frameIndex !== currentFrame) {
      currentFrame = frameIndex;
      drawFrame(currentFrame);
    }

    // Update overlays sequentially during hero scroll
    updateOverlays(currentProgress);

    requestAnimationFrame(renderLoop);
  }

  // Start the render loop
  requestAnimationFrame(renderLoop);


  // ==========================================
  // TEXT OVERLAY VISIBILITY
  // ==========================================
  function updateOverlays(progress) {
    // If we scrolled past the hero section, hide all overlays
    const heroBottom = heroSection.getBoundingClientRect().bottom;
    if (heroBottom <= 0) {
      overlays.forEach(overlay => {
        overlay.style.opacity = 0;
        overlay.classList.remove('visible');
      });
      return;
    }

    overlays.forEach(overlay => {
      const start = parseFloat(overlay.dataset.start);
      const end = parseFloat(overlay.dataset.end);
      const fadeRange = 0.06;

      let opacity = 0;

      if (progress >= start && progress <= end) {
        if (start === 0) {
          // First overlay: start fully visible at 0, fade out at end
          if (progress > end - fadeRange) {
            opacity = (end - progress) / fadeRange;
          } else {
            opacity = 1;
          }
        } else {
          // Other overlays: fade in, hold, fade out
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

      if (opacity > 0.01) {
        overlay.classList.add('visible');
        overlay.style.opacity = opacity;
      } else {
        overlay.classList.remove('visible');
        overlay.style.opacity = 0;
      }
    });
  }


  // ==========================================
  // SCROLL PROGRESS BAR
  // ==========================================
  function updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = progress + '%';
  }


  // ==========================================
  // NAV STATE
  // ==========================================
  function updateNav() {
    if (window.scrollY > 80) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }


  // ==========================================
  // MOBILE MENU
  // ==========================================
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('open');
  });

  // Close on link click
  document.querySelectorAll('.mobile-menu__link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('open');
    });
  });


  // ==========================================
  // SMOOTH ANCHOR SCROLL
  // ==========================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  document.querySelectorAll(revealSelectors).forEach(el => {
    revealObserver.observe(el);
  });


  // ==========================================
  // SKILL BAR ANIMATION
  // ==========================================
  const skillBars = document.querySelectorAll('.skill-bar__fill');

  const skillObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const bar = entry.target;
          const targetWidth = bar.dataset.width;
          bar.classList.add('animated');
          bar.style.width = targetWidth + '%';
          skillObserver.unobserve(bar);
        }
      });
    },
    { threshold: 0.3 }
  );

  skillBars.forEach(bar => skillObserver.observe(bar));


  // ==========================================
  // ANIMATED STAT COUNTERS
  // ==========================================
  const statNumbers = document.querySelectorAll('.stat-card__number[data-target]');

  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const duration = 2000;
    const startTime = performance.now();

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out quart
      const eased = 1 - Math.pow(1 - progress, 4);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(tick);
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

  statNumbers.forEach(el => counterObserver.observe(el));


  // ==========================================
  // UNIFIED SCROLL HANDLER (RAF throttled)
  // ==========================================
  let ticking = false;

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateFrameOnScroll();
        updateProgress();
        updateNav();
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    resizeCanvas();
    drawFrame(currentFrame);
  });


  // ==========================================
  // CINEMATIC VIDEO PLAYER MODAL
  // ==========================================
  const videoModal = document.getElementById('videoModal');
  const videoIframe = document.getElementById('videoModalIframe');
  const modalClose = document.getElementById('videoModalClose');
  const modalBackdrop = document.getElementById('videoModalBackdrop');
  
  const embedUrl = 'https://drive.google.com/file/d/1JcCXZq0CrWi9sR35Fft3CYTyPFblX-4k/preview';

  function openVideoModal(url) {
    videoIframe.src = url;
    videoModal.classList.add('open');
    videoModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeVideoModal() {
    videoModal.classList.remove('open');
    videoModal.setAttribute('aria-hidden', 'true');
    videoIframe.src = '';
    document.body.style.overflow = '';
  }

  // Bind links to open Google Drive video in modal
  document.querySelectorAll('a[href*="drive.google.com"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openVideoModal(embedUrl);
    });
  });

  // Bind play interaction to all project work cards
  document.querySelectorAll('.work-card').forEach(card => {
    const videoId = card.dataset.videoId;
    if (!videoId) return;
    const cardEmbedUrl = `https://drive.google.com/file/d/${videoId}/preview`;

    // Clicking the play button inside the card opens the modal
    const playBtn = card.querySelector('.work-card__play');
    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openVideoModal(cardEmbedUrl);
      });
    }
    // Clicking the thumbnail opens the modal
    const thumb = card.querySelector('.work-card__thumbnail');
    if (thumb) {
      thumb.style.cursor = 'pointer';
      thumb.addEventListener('click', (e) => {
        openVideoModal(cardEmbedUrl);
      });
    }
  });

  modalClose.addEventListener('click', closeVideoModal);
  modalBackdrop.addEventListener('click', closeVideoModal);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && videoModal.classList.contains('open')) {
      closeVideoModal();
    }
  });


  // ==========================================
  // INIT
  // ==========================================
  resizeCanvas();
  preloadFrames();
  updateFrameOnScroll();
  updateProgress();
  updateNav();

})();
