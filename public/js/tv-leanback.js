/**
 * TuneFlow - Android TV D-Pad Leanback Spatial Navigation Engine & Ambient Mode (Phase 7)
 * Implements SPEC-0007 & ADR-0012:
 * - 10-foot remote D-Pad control (ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Enter, Escape)
 * - 2D Spatial focus matrix management
 * - High-contrast visual focus ring (.focused-tv: 4px solid #f39c12, 1.08x scale)
 * - Ambient Leanback Player with large typography and artwork for 3-meter sofa viewing
 */

(function () {
  'use strict';

  class TVLeanbackEngine {
    constructor() {
      this.isTVMode = false;
      this.isAmbientOpen = false;
      this.currentFocusElement = null;
      this.focusHistory = [];
      this.spatialZones = [
        'header',      // Header buttons, TV toggle
        'search',      // Search input, clear button, submit button
        'categories',  // Category pills
        'results',     // Song cards & playlist items
        'player'       // Sticky bottom player controls
      ];
      this.currentZoneIndex = 1; // Default starts at search bar
    }

    init() {
      // 1. Detect TV mode from URL or localStorage
      if (typeof window !== 'undefined' && window.location) {
        const urlObj = new URL(window.location.href);
        const urlTV = urlObj.searchParams.get('mode') === 'tv';
        const storedTV = typeof localStorage !== 'undefined' && localStorage.getItem('tuneflow_tv_mode') === 'true';

        if (urlTV || storedTV) {
          this.enableTVMode(false);
        }
      }

      // 2. Setup key listeners for D-Pad
      this.bindKeyEvents();

      // 3. Setup TV toggle button
      this.bindUIControls();
    }

    enableTVMode(persist = true) {
      this.isTVMode = true;
      document.body.classList.add('tv-mode');
      if (persist) {
        localStorage.setItem('tuneflow_tv_mode', 'true');
      }

      const toggleBtn = document.getElementById('btn-toggle-tv');
      if (toggleBtn) {
        toggleBtn.classList.add('active');
        toggleBtn.setAttribute('aria-pressed', 'true');
      }

      // Initial focus on search input or first interactive element
      setTimeout(() => {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
          this.setFocus(searchInput);
        }
      }, 300);
    }

    disableTVMode() {
      this.isTVMode = false;
      document.body.classList.remove('tv-mode');
      localStorage.setItem('tuneflow_tv_mode', 'false');

      if (this.currentFocusElement) {
        this.currentFocusElement.classList.remove('focused-tv');
        this.currentFocusElement = null;
      }

      const toggleBtn = document.getElementById('btn-toggle-tv');
      if (toggleBtn) {
        toggleBtn.classList.remove('active');
        toggleBtn.setAttribute('aria-pressed', 'false');
      }

      if (this.isAmbientOpen) {
        this.closeAmbientPlayer();
      }
    }

    toggleTVMode() {
      if (this.isTVMode) {
        this.disableTVMode();
      } else {
        this.enableTVMode(true);
      }
    }

    bindUIControls() {
      const toggleBtn = document.getElementById('btn-toggle-tv');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => this.toggleTVMode());
      }

      const ambientCloseBtn = document.getElementById('btn-close-ambient');
      if (ambientCloseBtn) {
        ambientCloseBtn.addEventListener('click', () => this.closeAmbientPlayer());
      }

      const ambientToggleBtn = document.getElementById('btn-ambient-toggle');
      if (ambientToggleBtn) {
        ambientToggleBtn.addEventListener('click', () => this.toggleAmbientPlayer());
      }
    }

    bindKeyEvents() {
      window.addEventListener('keydown', (e) => {
        // If in an input and typing text, allow typing unless ArrowUp/ArrowDown or Escape
        const isInput = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');

        switch (e.key) {
          case 'ArrowUp':
            if (this.isTVMode || e.altKey) {
              e.preventDefault();
              this.navigateSpatial('up');
            }
            break;
          case 'ArrowDown':
            if (this.isTVMode || e.altKey) {
              e.preventDefault();
              this.navigateSpatial('down');
            }
            break;
          case 'ArrowLeft':
            if (this.isTVMode && (!isInput || e.target.selectionStart === 0)) {
              e.preventDefault();
              this.navigateSpatial('left');
            }
            break;
          case 'ArrowRight':
            if (this.isTVMode && (!isInput || e.target.selectionStart === e.target.value.length)) {
              e.preventDefault();
              this.navigateSpatial('right');
            }
            break;
          case 'Enter':
            if (this.isTVMode && this.currentFocusElement && this.currentFocusElement !== e.target) {
              e.preventDefault();
              this.currentFocusElement.click();
            }
            break;
          case 'Escape':
          case 'Backspace':
            if (this.isAmbientOpen) {
              e.preventDefault();
              this.closeAmbientPlayer();
            } else if (this.isTVMode && isInput) {
              e.target.blur();
              this.navigateSpatial('down');
            }
            break;
          case 'MediaPlayPause':
            e.preventDefault();
            this.toggleAudioPlayback();
            break;
          default:
            break;
        }
      });
    }

    getZoneElements(zone) {
      switch (zone) {
        case 'header':
          return Array.from(document.querySelectorAll('.header-actions button, .header-actions a, #btn-toggle-tv')).filter(this.isVisible);
        case 'search':
          return Array.from(document.querySelectorAll('#search-input, #btn-search, #btn-clear-search, .persona-tab')).filter(this.isVisible);
        case 'categories':
          return Array.from(document.querySelectorAll('#category-pills .category-pill')).filter(this.isVisible);
        case 'results':
          return Array.from(document.querySelectorAll('.song-card, .playlist-card, .btn-play-preview, .btn-download')).filter(this.isVisible);
        case 'player':
          return Array.from(document.querySelectorAll('#bottom-player button, #bottom-player input, #btn-ambient-toggle')).filter(this.isVisible);
        default:
          return [];
      }
    }

    isVisible(el) {
      return el && !el.disabled && el.offsetParent !== null && window.getComputedStyle(el).display !== 'none';
    }

    setFocus(el) {
      if (!el) return;

      if (this.currentFocusElement) {
        this.currentFocusElement.classList.remove('focused-tv');
      }

      this.currentFocusElement = el;
      el.classList.add('focused-tv');
      el.focus();

      // Smooth scroll into viewport for 10-foot television view
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } catch (_e) {
        // Fallback for older renderers
      }
    }

    navigateSpatial(direction) {
      const currentZone = this.spatialZones[this.currentZoneIndex];
      let elements = this.getZoneElements(currentZone);

      if (direction === 'up') {
        if (this.currentZoneIndex > 0) {
          this.currentZoneIndex--;
          const newElements = this.getZoneElements(this.spatialZones[this.currentZoneIndex]);
          if (newElements.length > 0) {
            this.setFocus(newElements[0]);
            return;
          }
        }
      } else if (direction === 'down') {
        if (this.currentZoneIndex < this.spatialZones.length - 1) {
          this.currentZoneIndex++;
          const newElements = this.getZoneElements(this.spatialZones[this.currentZoneIndex]);
          if (newElements.length > 0) {
            this.setFocus(newElements[0]);
            return;
          }
        }
      } else if (direction === 'left' || direction === 'right') {
        if (!elements.length) return;
        const currentIndex = elements.indexOf(this.currentFocusElement);
        let nextIndex = 0;

        if (direction === 'right') {
          nextIndex = currentIndex >= 0 ? Math.min(elements.length - 1, currentIndex + 1) : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : 0;
        }

        this.setFocus(elements[nextIndex]);
      }
    }

    openAmbientPlayer() {
      const ambient = document.getElementById('tv-ambient-player');
      if (!ambient) return;

      this.isAmbientOpen = true;
      ambient.classList.remove('hidden');
      ambient.setAttribute('aria-hidden', 'false');

      // Sync currently playing song metadata
      const playerTitle = document.getElementById('player-title');
      const playerArtist = document.getElementById('player-artist');
      const playerThumb = document.getElementById('player-thumb');

      const ambientTitle = document.getElementById('ambient-title');
      const ambientArtist = document.getElementById('ambient-artist');
      const ambientCover = document.getElementById('ambient-cover');

      if (playerTitle && ambientTitle) ambientTitle.textContent = playerTitle.textContent;
      if (playerArtist && ambientArtist) ambientArtist.textContent = playerArtist.textContent;
      if (playerThumb && ambientCover && playerThumb.src) ambientCover.src = playerThumb.src;

      // Focus close or play button inside ambient
      const playBtn = document.getElementById('ambient-btn-play');
      if (playBtn) {
        this.setFocus(playBtn);
      }
    }

    closeAmbientPlayer() {
      const ambient = document.getElementById('tv-ambient-player');
      if (!ambient) return;

      this.isAmbientOpen = false;
      ambient.classList.add('hidden');
      ambient.setAttribute('aria-hidden', 'true');

      // Restore focus to bottom player
      const bottomPlay = document.getElementById('btn-play-pause');
      if (bottomPlay) {
        this.setFocus(bottomPlay);
      }
    }

    toggleAmbientPlayer() {
      if (this.isAmbientOpen) {
        this.closeAmbientPlayer();
      } else {
        this.openAmbientPlayer();
      }
    }

    toggleAudioPlayback() {
      const playBtn = document.getElementById('btn-play-pause');
      if (playBtn) {
        playBtn.click();
      }
    }
  }

  // Export or attach to window
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TVLeanbackEngine };
  } else if (typeof window !== 'undefined') {
    window.tvLeanback = new TVLeanbackEngine();
    document.addEventListener('DOMContentLoaded', () => {
      window.tvLeanback.init();
    });
  }
})();
