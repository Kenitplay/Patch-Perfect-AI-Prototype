/* ============================================
   PATCH PERFECT AI — Native Mobile JS Engine
   ============================================ */

const NativeApp = (() => {

  // ---------- Viewport Height Fix ----------
  // Fixes the 100vh issue on mobile browsers (address bar)
  function initViewportFix() {
    function setVh() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--app-vh', `${vh}px`);
    }
    setVh();
    window.addEventListener('resize', setVh);
    window.addEventListener('orientationchange', () => {
      setTimeout(setVh, 100);
    });
  }

  // ---------- Haptic Feedback ----------
  function haptic(style = 'light') {
    if (!navigator.vibrate) return;
    try {
      switch(style) {
        case 'light': navigator.vibrate(10); break;
        case 'medium': navigator.vibrate(20); break;
        case 'heavy': navigator.vibrate(30); break;
        case 'success': navigator.vibrate([10, 30, 10]); break;
        case 'error': navigator.vibrate([30, 20, 30]); break;
      }
    } catch (e) {
      console.warn('[NativeApp] Haptic vibration failed or blocked:', e);
    }
  }

  // ---------- Page Transition ----------
  function initPageTransitions() {
    // Intercept navigation links for smooth transitions
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.endsWith('.html') && !href.startsWith('http')) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          haptic('light');
          const main = document.querySelector('main');
          if (main) {
            main.style.opacity = '0';
            main.style.transform = 'translateY(8px)';
            main.style.transition = 'all 0.2s ease';
          }
          setTimeout(() => {
            window.location.href = href;
          }, 200);
        });
      }
    });
  }

  // ---------- Bottom Sheet Controller ----------
  class BottomSheet {
    constructor(sheetEl, overlayEl) {
      this.sheet = sheetEl;
      this.overlay = overlayEl;
      this.isOpen = false;
      this.startY = 0;
      this.currentY = 0;

      if (this.overlay) {
        this.overlay.addEventListener('click', () => this.close());
      }

      if (this.sheet) {
        this._initDrag();
      }
    }

    _initDrag() {
      const handle = this.sheet.querySelector('.bottom-sheet-handle');
      if (!handle) return;

      handle.addEventListener('touchstart', (e) => {
        this.startY = e.touches[0].clientY;
        this.sheet.style.transition = 'none';
      }, { passive: true });

      handle.addEventListener('touchmove', (e) => {
        this.currentY = e.touches[0].clientY;
        const diff = this.currentY - this.startY;
        if (diff > 0) {
          this.sheet.style.transform = `translateY(${diff}px)`;
        }
      }, { passive: true });

      handle.addEventListener('touchend', () => {
        this.sheet.style.transition = '';
        const diff = this.currentY - this.startY;
        if (diff > 120) {
          this.close();
        } else {
          this.sheet.style.transform = 'translateY(0)';
        }
      });
    }

    open() {
      if (this.sheet) this.sheet.classList.add('active');
      if (this.overlay) this.overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      this.isOpen = true;
      haptic('medium');
    }

    close() {
      if (this.sheet) this.sheet.classList.remove('active');
      if (this.overlay) this.overlay.classList.remove('active');
      document.body.style.overflow = '';
      this.isOpen = false;
      haptic('light');
    }

    setContent(html) {
      const body = this.sheet?.querySelector('.bottom-sheet-body');
      if (body) body.innerHTML = html;
    }

    setHeader(html) {
      const header = this.sheet?.querySelector('.bottom-sheet-header');
      if (header) header.innerHTML = html;
    }
  }

  // ---------- Toast Notifications ----------
  function showToast(message, duration = 2500) {
    let toast = document.getElementById('native-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'native-toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    // Force reflow
    toast.offsetHeight;
    toast.classList.add('visible');
    haptic('light');

    setTimeout(() => {
      toast.classList.remove('visible');
    }, duration);
  }

  // ---------- Pull to Refresh ----------
  function initPullToRefresh(callback) {
    let startY = 0;
    let pullDist = 0;
    const threshold = 80;
    let indicator = document.querySelector('.pull-indicator');

    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'pull-indicator';
      indicator.innerHTML = '<div class="spinner"></div>';
      document.body.appendChild(indicator);
    }

    document.addEventListener('touchstart', (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
      }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (startY === 0) return;
      pullDist = e.touches[0].clientY - startY;
      if (pullDist > 0 && window.scrollY === 0) {
        if (pullDist > 20) {
          indicator.classList.add('visible');
        }
      }
    }, { passive: true });

    document.addEventListener('touchend', () => {
      if (pullDist > threshold) {
        haptic('medium');
        if (callback) callback();
        setTimeout(() => {
          indicator.classList.remove('visible');
        }, 1000);
      } else {
        indicator.classList.remove('visible');
      }
      startY = 0;
      pullDist = 0;
    });
  }

  // ---------- Skeleton Loader ----------
  function showSkeletons(containerId, count = 3) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const skel = document.createElement('div');
      skel.className = 'skeleton';
      skel.style.height = '100px';
      skel.style.marginBottom = '12px';
      skel.style.borderRadius = '16px';
      container.appendChild(skel);
    }
  }

  function clearSkeletons(containerId) {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';
  }

  // ---------- Service Worker Registration ----------
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => {
            console.log('[PWA] Service worker registered:', reg.scope);
          })
          .catch(err => {
            console.log('[PWA] Service worker registration failed:', err);
          });
      });
    }
  }

  // ---------- PWA Install Prompt ----------
  let deferredPrompt = null;

  function initInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      // Could show a custom install banner here
      console.log('[PWA] Install prompt ready');
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      showToast('✅ App installed successfully!');
    });
  }

  function promptInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(choice => {
        if (choice.outcome === 'accepted') {
          showToast('Installing app...');
        }
        deferredPrompt = null;
      });
    }
  }

  // ---------- Stagger Animation ----------
  function staggerIn(selector) {
    const container = document.querySelector(selector);
    if (container) {
      container.classList.remove('stagger-enter');
      // Force reflow
      container.offsetHeight;
      container.classList.add('stagger-enter');
    }
  }

  // ---------- Init ----------
  function init(options = {}) {
    initViewportFix();
    initPageTransitions();
    registerServiceWorker();
    initInstallPrompt();

    if (options.pullToRefresh) {
      initPullToRefresh(options.pullToRefresh);
    }

    console.log('[NativeApp] Initialized');
  }

  // ---------- Public API ----------
  return {
    init,
    haptic,
    showToast,
    showSkeletons,
    clearSkeletons,
    staggerIn,
    promptInstall,
    BottomSheet,
  };
})();
