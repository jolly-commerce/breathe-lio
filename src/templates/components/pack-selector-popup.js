class PackSelectorPopup extends HTMLElement {
  constructor() {
    super();
    this.currentProductIndex = 0;
  }

  connectedCallback() {
    // Ensure component is fully ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.initializeEventListeners();
      });
    } else {
      this.initializeEventListeners();
    }
  }

  initializeEventListeners() {
    // Close button
    this.querySelector('.js-popup-close')?.addEventListener('click', () => this.close());

    // Overlay click to close
    this.querySelector('.js-popup-overlay')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('js-popup-overlay')) {
        this.close();
      }
    });

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.classList.contains('active')) {
        this.close();
      }
    });

    // Add to bundle buttons
    this.addEventListener('click', (e) => {
      if (e.target.matches('.js-add-to-bundle')) {
        e.preventDefault();
        this.addToBundle();
      }
    });
  }

  open(productIndex = 0) {
    this.currentProductIndex = productIndex;
    
    // First prepare swiper and navigate to correct slide
    this.prepareSwiper(() => {
      // Then open popup with animation
      requestAnimationFrame(() => {
        this.classList.add('active');
      });
    });
  }

  close() {
    requestAnimationFrame(() => {
      this.classList.remove('active');
    });
  }

  prepareSwiper(callback) {
    const swiperContainer = this.querySelector('#productStep2Swiper');
    
    if (!swiperContainer) {
      console.warn('Swiper container not found');
      callback();
      return;
    }

    // Wait for swiper to be ready
    const waitForSwiper = () => {
      if (swiperContainer.swiper) {
        // console.log('Swiper ready, navigating to slide:', this.currentProductIndex);
        
        // Navigate to correct slide first
        if (this.currentProductIndex >= 0) {
          swiperContainer.swiper.slideTo(this.currentProductIndex, 0); // No animation for instant positioning
        }
        
        // Initialize event listeners
        this.initializeSwiperEvents(swiperContainer);
        
        // Wait for slide change to complete, then callback
        requestAnimationFrame(() => {
          requestAnimationFrame(callback);
        });
      } else {
        // Retry if swiper not ready
        requestAnimationFrame(waitForSwiper);
      }
    };
    
    waitForSwiper();
  }

  initializeSwiperEvents(swiperContainer) {
    // Remove existing listener first to avoid duplicates
    if (this.handleSlideChange) {
      swiperContainer.removeEventListener('slidechange', this.handleSlideChange);
    }
    
    this.handleSlideChange = (e) => {
      this.currentProductIndex = e.detail[0].realIndex;
      // console.log('Slide changed to:', this.currentProductIndex);
    };
    
    swiperContainer.addEventListener('slidechange', this.handleSlideChange);
  }

  // Legacy method - now handled by prepareSwiper
  initializeSwiper() {
    const swiperContainer = this.querySelector('#productStep2Swiper');
    if (swiperContainer?.swiper) {
      this.initializeSwiperEvents(swiperContainer);
    }
  }

  addToBundle() {
    const currentSlide = this.querySelector('swiper-slide.swiper-slide-active') || 
                        this.querySelector('swiper-slide');
    if (!currentSlide) return;

    const productId = currentSlide.dataset.productId;
    if (!productId) return;

    // Find the corresponding Step2ProductCard (updated after refactor)
    const step2Card = document.querySelector(`step2-product-card[data-product-id="${productId}"]`);
    if (step2Card) {
      // Use the card's own method to show controls and add quantity
      step2Card.showControls();
      
      // Close popup after adding
      this.close();
    }
  }
}

// Register the custom element
customElements.define('pack-selector-popup', PackSelectorPopup);
