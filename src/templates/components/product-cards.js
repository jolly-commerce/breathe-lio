// Constants
const PACK_TYPES = {
  THREE_BAGS: 1,
  SIX_BAGS: 2,
  COMPLETE: 3
};

const PACK_LIMITS = {
  THREE_BAGS_MAX: 3,
  SIX_BAGS_MAX: 6,
  THREE_BAGS_MIN: 3,
  SIX_BAGS_MIN: 6
};

const DEFAULTS = {
  MAX_QTY: 9999,
  MAX_FLAVORS: 6,
  MIN_FLAVORS: 4,
  RETRY_DELAY: 100,
  TRANSITION_DELAY: 50
};

const SELECTORS = {
  THREE_BAGS_PACK: '.js-pack-selector[data-max-flavors="3"]',
  SIX_BAGS_PACK: '.js-pack-selector[data-max-flavors="6"]:not([data-complete-pack="true"])',
  STEP2_CARDS: 'step2-product-card',
  PACK_RADIO: 'input[type="radio"]',
  QTY_CONTROL: '.js-qty-control',
  MINUS_BTN: '.js-btn-minus',
  PLUS_BTN: '.js-btn-plus'
};

// Base Product Option Card Component
class ProductOptionCard extends HTMLElement {
  constructor() {
    super();
    this.productId = '';
    this.productPrice = 0;
    this.step = 0;
    this.isSelected = false;
    this.parentComponent = this.closest('pack-selector-component');
    this.hasQuantityControls = false;
    this.quantity = 0;
    this.maxQty = DEFAULTS.MAX_QTY;
  }

  connectedCallback() {
    this.productId = this.getAttribute('data-product-id') || '';
    this.productPrice = parseInt(this.getAttribute('data-product-price')) || 0;
    this.step = parseInt(this.getAttribute('data-step')) || 0;
    this.hasQuantityControls = this.getAttribute('data-has-quantity') === 'true';

    this.initializeCard();
  }

  initializeCard() {
    // Setup click handlers
    this.addEventListener('click', (e) => {
      // Prevent button clicks from triggering card click
      if (e.target.closest('button')) {
        e.stopPropagation();
        return;
      }
      this.handleCardClick(e);
    });

    // Setup button click handler
    const selectButton = this.querySelector('button[data-action]');
    if (selectButton) {
      selectButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleButtonClick(e);
      });
    }

    // Setup popup trigger if exists
    const popupTrigger = this.querySelector('.js-trigger-popup');
    if (popupTrigger) {
      popupTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handlePopupTrigger(e);
      });
    }

    // Initialize quantity controls if present
    if (this.hasQuantityControls) {
      this.initializeQuantityControls();
    }
  }

  initializeQuantityControls() {
    this.input = this.querySelector('.js-qty-count');
    this.selectButton = this.querySelector('.js-select-button');
    this.qtyControl = this.querySelector('.js-qty-control');
    this.minusBtn = this.querySelector('.js-btn-minus');
    this.plusBtn = this.querySelector('.js-btn-plus');
    this.maxQty = parseInt(this.getAttribute('data-max-qty')) || DEFAULTS.MAX_QTY;

    // Add quantity control event listeners
    this.minusBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.changeQuantity(-1);
    });

    this.plusBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.changeQuantity(1);
    });

    // Initialize UI
    this.updateQuantityUI();
  }

  handleCardClick(e) {
    if (this.hasQuantityControls) {
      if (this.quantity === 0) {
        this.showQuantityControls();
      }
    } else {
      // Default behavior for non-quantity cards
      this.selectProduct();
    }
  }

  handleButtonClick(e) {
    if (this.hasQuantityControls) {
      this.showQuantityControls();
    } else {
      // Default behavior for non-quantity cards
      this.selectProduct();
    }
  }

  showQuantityControls() {
    if (!this.hasQuantityControls) return;

    this.selectButton?.classList.add('jc-hidden');
    this.qtyControl?.classList.remove('not-visible');
    this.changeQuantity(1);
  }

  changeQuantity(delta) {
    if (!this.hasQuantityControls) return;

    const newQty = Math.max(0, this.quantity + delta);

    // Check inventory limits when increasing
    if (delta > 0 && this.quantity >= this.maxQty) return;

    this.quantity = newQty;
    this.updateQuantityUI();

    // Notify parent of change based on step
    const eventName = this.step === 3 ? 'step3-quantity-changed' : 'quantity-changed';
    this.dispatchEvent(new CustomEvent(eventName, {
      detail: {
        productId: this.productId,
        quantity: this.quantity,
        price: this.productPrice
      },
      bubbles: true
    }));
  }

  updateQuantityUI() {
    if (!this.hasQuantityControls) return;

    // Update input value
    if (this.input) this.input.value = this.quantity;

    // Update selected state
    this.setSelected(this.quantity > 0);

    // Toggle visibility
    this.selectButton?.classList.toggle('jc-hidden', this.quantity > 0);
    this.qtyControl?.classList.toggle('not-visible', this.quantity === 0);

    // Update button states
    this.updateQuantityButtonStates();
  }

  updateQuantityButtonStates() {
    if (!this.hasQuantityControls || !this.plusBtn || !this.minusBtn || !this.selectButton) {
      return;
    }

    const atProductMax = this.quantity >= this.maxQty;

    // Update plus button (only inventory limits for step 3)
    this.plusBtn.disabled = atProductMax;
    this.plusBtn.classList.toggle('is-disabled', atProductMax);

    // Update minus button
    this.minusBtn.disabled = this.quantity <= 0;
    this.minusBtn.classList.toggle('is-disabled', this.quantity <= 0);

    // Update select button
    this.selectButton.disabled = atProductMax;
    this.selectButton.classList.toggle('jc-opacity-50', atProductMax);
  }

  handlePopupTrigger(e) {
    // Dispatch event for parent to handle popup
    this.dispatchEvent(new CustomEvent('open-popup', {
      detail: { productCard: this },
      bubbles: true
    }));
  }

  selectProduct() {
    // Dispatch selection event
    this.dispatchEvent(new CustomEvent('product-selected', {
      detail: {
        productId: this.productId,
        step: this.step,
        productCard: this
      },
      bubbles: true
    }));
  }

  setSelected(selected) {
    this.isSelected = selected;
    this.classList.toggle('selected', selected);
  }

  reset() {
    this.setSelected(false);
    if (this.hasQuantityControls) {
      this.quantity = 0;
      this.updateQuantityUI();
      this.selectButton?.classList.remove('jc-hidden');
      this.qtyControl?.classList.add('not-visible');
      this.selectButton?.classList.remove('jc-opacity-50');
      if (this.selectButton) this.selectButton.disabled = false;
    }
  }

  getQuantity() {
    return this.hasQuantityControls ? this.quantity : (this.isSelected ? 1 : 0);
  }

  setQuantity(qty) {
    if (this.hasQuantityControls) {
      this.quantity = qty;
      this.updateQuantityUI();
    }
  }
}

// Step 2 Product Card Component (extends base)
class Step2ProductCard extends ProductOptionCard {
  constructor() {
    super();
    // Step 2 always has quantity controls
    this.hasQuantityControls = true;
  }

  connectedCallback() {
    this.productId = this.getAttribute('data-product-id') || '';
    this.productPrice = parseInt(this.getAttribute('data-product-price')) || 0;
    this.subscriptionProductId = this.getAttribute('data-subscription-product-id') || null;
    this.subscriptionProductPrice = parseInt(this.getAttribute('data-subscription-product-price')) || this.productPrice;
    this.step = parseInt(this.getAttribute('data-step')) || 0;
    this.hasQuantityControls = true; // Step 2 always has quantity controls

    // Initialize Step 2 specific elements first
    this.input = this.querySelector('.js-qty-count');

    this.maxQty = parseInt(this.getAttribute('data-max-qty')) || DEFAULTS.MAX_QTY;

    // Call parent initialization
    this.initializeCard();

    // Use setTimeout to ensure parent component is ready
    setTimeout(() => this.initializeStep2Elements(), 0);
  }

  initializeStep2Elements() {
    // Get Step 2 specific elements
    this.selectButton = this.querySelector('.js-select-button-step2');
    this.qtyControl = this.querySelector('.js-qty-control');
    this.minusBtn = this.querySelector('.js-btn-minus');
    this.plusBtn = this.querySelector('.js-btn-plus');

    if (!this.selectButton || !this.qtyControl || !this.input || !this.minusBtn || !this.plusBtn) {
      console.warn('Step2ProductCard: Some required elements not found, retrying...');
      setTimeout(() => this.initializeStep2Elements(), DEFAULTS.RETRY_DELAY);
      return;
    }

    this.updateUI();
  }

  tryAutoSwitchTo6Bags(callback) {
    if (!this.parentComponent || this.parentComponent.currentPackType !== PACK_TYPES.THREE_BAGS) {
      return false;
    }

    const totalFlavors = this.parentComponent.getTotalFlavors();
    if (totalFlavors < PACK_LIMITS.THREE_BAGS_MAX) {
      return false;
    }

    const sixBagsSelector = this.parentComponent.querySelector(SELECTORS.SIX_BAGS_PACK);
    if (!sixBagsSelector) {
      return false;
    }

    const input = sixBagsSelector.querySelector(SELECTORS.PACK_RADIO);
    if (!input) {
      return false;
    }

    // Mark selector for preserving selections
    sixBagsSelector.dataset.preserveSelections = 'true';
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));

    // Execute callback after switching
    if (callback && typeof callback === 'function') {
      setTimeout(callback, DEFAULTS.TRANSITION_DELAY);
    }

    return true;
  }

  handleCardClick(e) {
    if (e.target.closest('button')) return;

    // Check if this is a complete pack
    if (this.parentComponent && this.parentComponent.isCompletePack) {
      return; // Don't allow click for complete pack
    }

    if (this.quantity === 0) {
      this.showControls();
    }
    // When quantity >= 1, only plus button should increase quantity
  }

  handleButtonClick(e) {
    e.stopPropagation();

    // Check if this is a complete pack
    if (this.parentComponent && this.parentComponent.isCompletePack) {
      return; // Don't allow button for complete pack
    }

    // For already selected products, check automatic switching
    if (this.quantity > 0) {
      const switched = this.tryAutoSwitchTo6Bags(() => {
        this.changeQuantity(1);
      });

      if (switched) return;
    }

    this.showControls();
  }

  showControls() {
    // Try automatic switching from 3 to 6 bags when selecting a new product
    const switched = this.tryAutoSwitchTo6Bags(() => {
      this.selectButton?.classList.add('jc-hidden');
      this.qtyControl?.classList.remove('not-visible');
      this.changeQuantity(1);
    });

    if (switched) return;

    // Check if parent allows more items
    const canAdd = this.dispatchEvent(new CustomEvent('can-add-flavor', {
      detail: { productId: this.productId },
      bubbles: true,
      cancelable: true
    }));

    if (!canAdd) return;

    this.selectButton?.classList.add('jc-hidden');
    this.qtyControl?.classList.remove('not-visible');
    this.changeQuantity(1);
  }

  changeQuantity(delta) {
    // Block changes for complete pack
    if (this.parentComponent && this.parentComponent.isCompletePack) {
      return;
    }

    const newQty = Math.max(0, this.quantity + delta);

    // Check limits when increasing
    if (delta > 0) {
      // Check if we need to auto-switch from 3 to 6 bags
      if (this.parentComponent && this.parentComponent.currentPackType === PACK_TYPES.THREE_BAGS) {
        const totalFlavors = this.parentComponent.getTotalFlavors();
        if (totalFlavors + delta > PACK_LIMITS.THREE_BAGS_MAX) {
          const switched = this.tryAutoSwitchTo6Bags(() => {
            this.quantity = newQty;
            this.updateUI();
            // Notify parent of change
            this.dispatchEvent(new CustomEvent('quantity-changed', {
              detail: { 
                productId: this.productId, 
                quantity: this.quantity,
                price: this.productPrice,
                subscriptionProductId: this.subscriptionProductId,
                subscriptionPrice: this.subscriptionProductPrice
              },
              bubbles: true
            }));
          });

          if (switched) return;
        }
      }

      const canAdd = this.dispatchEvent(new CustomEvent('can-add-flavor', {
        detail: { productId: this.productId },
        bubbles: true,
        cancelable: true
      }));

      if (!canAdd || this.quantity >= this.maxQty) {
        return;
      }
    }

    this.quantity = newQty;
    this.updateUI();

    // Notify parent of change
    this.dispatchEvent(new CustomEvent('quantity-changed', {
      detail: { 
        productId: this.productId, 
        quantity: this.quantity,
        price: this.productPrice,
        subscriptionProductId: this.subscriptionProductId,
        subscriptionPrice: this.subscriptionProductPrice
      },
      bubbles: true
    }));
  }

  updateUI() {
    // Use parent's updateQuantityUI method which handles all the UI updates
    if (this.hasQuantityControls) {
      this.updateQuantityUI();
    } else {
      // Update input value
      if (this.input) this.input.value = this.quantity;

      // Update selected state
      this.setSelected(this.quantity > 0);

      // Toggle visibility
      this.selectButton?.classList.toggle('jc-hidden', this.quantity > 0);
      this.qtyControl?.classList.toggle('not-visible', this.quantity === 0);
    }

    this.updateButtonStates();
  }

  updateButtonStates() {
    if (!this.plusBtn || !this.minusBtn || !this.selectButton) {
      return;
    }

    // Get global state from parent
    let atGlobalMax = false;

    if (this.parentComponent && typeof this.parentComponent.getTotalFlavors === 'function') {
      const totalFlavors = this.parentComponent.getTotalFlavors();

      // For "3 bags" mode, don't block buttons when 3 items are reached,
      // because it should automatically switch to "6 bags"
      if (this.parentComponent.currentPackType === PACK_TYPES.THREE_BAGS && totalFlavors >= PACK_LIMITS.THREE_BAGS_MAX) {
        atGlobalMax = false; // Allow adding for automatic switching
      } else {
        atGlobalMax = totalFlavors >= this.parentComponent.maxFlavors;
      }
    }

    const atProductMax = this.quantity >= this.maxQty;

    // Update plus button
    this.plusBtn.disabled = atGlobalMax || atProductMax;
    this.plusBtn.classList.toggle('is-disabled', atGlobalMax || atProductMax);

    // Update minus button
    const shouldDisableMinus = this.quantity <= 0;
    this.minusBtn.disabled = shouldDisableMinus;
    this.minusBtn.classList.toggle('is-disabled', shouldDisableMinus);

    // Update select button - don't block in 3 bags mode when the limit is reached
    const shouldDisableSelect = (atGlobalMax || atProductMax) && !(this.parentComponent && this.parentComponent.currentPackType === PACK_TYPES.THREE_BAGS && this.quantity === 0);
    this.selectButton.disabled = shouldDisableSelect;
    this.selectButton.classList.toggle('jc-opacity-50', shouldDisableSelect);
  }

  reset() {
    this.quantity = 0;
    this.updateUI();
    this.selectButton?.classList.remove('jc-hidden');
    this.qtyControl?.classList.add('not-visible');
    this.selectButton?.classList.remove('jc-opacity-50');
    if (this.selectButton) this.selectButton.disabled = false;
    
    // Reset plus/minus button states (important for Complete Pack recovery)
    if (this.minusBtn) {
      this.minusBtn.disabled = true; // Minus should be disabled when quantity is 0
      this.minusBtn.classList.add('is-disabled');
    }
    if (this.plusBtn) {
      this.plusBtn.disabled = false; // Plus should be enabled
      this.plusBtn.classList.remove('is-disabled');
    }
    
    // Remove Complete Pack restrictions
    if (this.qtyControl) {
      this.qtyControl.classList.remove('jc-pointer-events-none');
    }
  }

  getQuantity() {
    return this.quantity;
  }

  setQuantity(qty) {
    this.quantity = qty;
    this.updateUI();
  }
}

// Register custom elements
customElements.define('product-option-card', ProductOptionCard);
customElements.define('step2-product-card', Step2ProductCard);

// Export classes for potential use in other modules
window.ProductOptionCard = ProductOptionCard;
window.Step2ProductCard = Step2ProductCard;
window.PACK_TYPES = PACK_TYPES;
window.PACK_LIMITS = PACK_LIMITS;
window.DEFAULTS = DEFAULTS;
window.SELECTORS = SELECTORS;
