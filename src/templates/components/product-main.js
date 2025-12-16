// Product gallery custom element
class ProductGallery extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const swiperElement = this.querySelector('#productMainSwiper');
    this.swiper = swiperElement?.swiper || null;
    this.layoutType = this.dataset.layout;

    const form = document.getElementById(this.getAttribute('data-form-id'));

    if (form) {
      form.addEventListener("variant:changed", this._onVariantChanged.bind(this));
    }

    // sticky gallery and content
    this.addStickyClass();
    window.addEventListener('resize', this.addStickyClass);
  }

  addStickyClass() {
    let currentAnnouncementBarHeight,
      currentHeaderHeight,
      indentFromTop = 0;

    const announcementBar = document.querySelector('.announcement-bar');
    const header = document.querySelector('header');

    if (announcementBar) {
      currentAnnouncementBarHeight = announcementBar.offsetHeight
      indentFromTop += currentAnnouncementBarHeight;
    }
    if (header) {
      currentHeaderHeight = header.offsetHeight;
      currentAnnouncementBarHeight += currentHeaderHeight;
    }

    const stickyElements = document.querySelectorAll('[data-sticky]');

    stickyElements.forEach(el => {
      el.style.top = indentFromTop + 'px';
    })
  }

  _onVariantChanged(event) {
    const variant = event.detail.variant;
    const variantMediaId = variant?.featured_media?.id;
    if (!variantMediaId) {
      return;
    }

    const swiperMediaId = this.querySelector(`[data-swiper-media-id^="${variantMediaId}"]`);
    if (!swiperMediaId || !this.swiper) {
      return;
    }
    const swiperMediaIndex = swiperMediaId.dataset.swiperMediaIndex;
    this.swiper.slideToLoop(swiperMediaIndex, 500);

    if (!this.layoutType.includes('grid')) {
      return;
    }

    const gridMedia = this.querySelectorAll('[data-grid-media-id]');
    const gridMediaActive = this.querySelector(`[data-grid-media-id^="${variantMediaId}"]`);
    if (!gridMediaActive) {
      return;
    }

    gridMedia.forEach((media) => {
      media.classList.remove('active');
    });
    gridMediaActive.classList.add('active');
  }
}
customElements.define('product-gallery', ProductGallery);

