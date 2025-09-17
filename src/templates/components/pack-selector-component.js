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
    this.maxQty = this.input ? parseInt(this.input.getAttribute('max')) || DEFAULTS.MAX_QTY : DEFAULTS.MAX_QTY;

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
    this.step = parseInt(this.getAttribute('data-step')) || 0;
    this.hasQuantityControls = true; // Step 2 always has quantity controls

    // Initialize Step 2 specific elements first
    this.input = this.querySelector('.js-qty-count');
    this.maxQty = this.input ? parseInt(this.input.getAttribute('max')) || DEFAULTS.MAX_QTY : DEFAULTS.MAX_QTY;

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
              detail: { productId: this.productId, quantity: this.quantity },
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
      detail: { productId: this.productId, quantity: this.quantity },
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

// Main Pack Selector Component
class PackSelectorComponent extends HTMLElement {
  constructor() {
    super();
    this.selectedProducts = {
      step1: null,
      step2: {}, // { [productId]: { quantity, price } }
      step3: {} // { [productId]: { quantity, price } }
    };
    this.maxFlavors = DEFAULTS.MAX_FLAVORS;
    this.minFlavors = DEFAULTS.MIN_FLAVORS;
    this.isCompletePack = false;
    this.currentPackType = PACK_TYPES.THREE_BAGS;
  }

  connectedCallback() {
    this.maxFlavors = parseInt(this.getAttribute('data-max-flavors')) || DEFAULTS.MAX_FLAVORS;
    this.minFlavors = parseInt(this.getAttribute('data-min-flavors')) || DEFAULTS.MIN_FLAVORS;

    // Re-initialize DOM elements after connection
    this.submitButton = this.querySelector('#pack-selector-submit');
    this.flavorCounter = this.querySelector('.js-flavor-counter');
    this.flavorMax = this.querySelector('[data-role="flavor-max"]');
    this.cartDrawer = document.querySelector('#cart-drawer');

    this.init();
  }

  init() {
    this.initializeEventListeners();
    this.initializeStepRadios();
    this.initializePackSelectors();
    this.updateUI();
  }

  initializeEventListeners() {
    // Listen for product selection events from cards
    this.addEventListener('product-selected', (e) => {
      const { productId, step, productCard } = e.detail;

      if (step === 1) {
        this.selectStep1Product(productCard, productId);
      } else if (step === 3) {
        this.selectStep3Product(productCard, productId);
      }
    });

    // Listen for popup trigger events
    this.addEventListener('open-popup', (e) => {
      const { productCard } = e.detail;
      if (productCard.step === 2) {
        this.openProductPopup(productCard);
      }
    });

    // Listen for Step 2 specific events
    this.addEventListener('can-add-flavor', (e) => {
      const currentTotal = this.getTotalFlavors();

      // In "3 bags" mode, always allow adding when the limit is reached
      // because it will automatically switch to "6 bags"
      if (this.currentPackType === PACK_TYPES.THREE_BAGS) {
        return;
      }

      const canAdd = currentTotal < this.maxFlavors;
      if (!canAdd) {
        e.preventDefault();
      }
    });

    this.addEventListener('quantity-changed', (e) => {
      const { productId, quantity } = e.detail;

      // Update internal state
      if (quantity === 0) {
        delete this.selectedProducts.step2[productId];
      } else {
        // Find the product card to get price
        const productCard = this.querySelector(`step2-product-card[data-product-id="${productId}"]`);
        this.selectedProducts.step2[productId] = {
          quantity: quantity,
          price: productCard ? productCard.productPrice : 0
        };
      }

      // Update UI
      this.updateUI();
    });

    // Listen for Step 3 quantity changes
    this.addEventListener('step3-quantity-changed', (e) => {
      const { productId, quantity, price } = e.detail;

      // Update internal state
      if (quantity === 0) {
        delete this.selectedProducts.step3[productId];
      } else {
        this.selectedProducts.step3[productId] = {
          quantity: quantity,
          price: price
        };
      }

      // Update UI
      this.updateUI();
    });
  }

  initializeStepRadios() {
    const stepRadios = this.querySelectorAll('input[name="pack-step"]');
    stepRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.updateUI();
      });
    });
  }

  initializePackSelectors() {
    const packSelectors = this.querySelectorAll('.js-pack-selector');
    packSelectors.forEach(selector => {
      const input = selector.querySelector('input[type="radio"][name="pack"]');
      if (input) {
        input.addEventListener('change', (e) => {
          if (e.target.checked) {
            this.handlePackChange(selector);
          }
        });

        // Initialize with selected pack by default
        if (input.checked) {
          this.handlePackChange(selector);
        }
      }
    });
  }

  handlePackChange(selector) {
    const maxFlavors = parseInt(selector.getAttribute('data-max-flavors')) || 6;
    const isComplete = selector.getAttribute('data-complete-pack') === 'true';

    console.log('Pack changed to:', { maxFlavors, isComplete });

    // Define pack type
    if (maxFlavors === PACK_LIMITS.THREE_BAGS_MAX) {
      this.currentPackType = PACK_TYPES.THREE_BAGS;
    } else if (!isComplete) {
      this.currentPackType = PACK_TYPES.SIX_BAGS;
    } else {
      this.currentPackType = PACK_TYPES.COMPLETE;
    }

    // Reset previous selections on step 2 only if this is not an automatic switching with preserving selections
    if (!selector.dataset.preserveSelections) {
      this.resetStep2Selections();
    }

    this.maxFlavors = maxFlavors;
    this.minFlavors = this.currentPackType === PACK_TYPES.THREE_BAGS ? PACK_LIMITS.THREE_BAGS_MIN : PACK_LIMITS.SIX_BAGS_MIN;
    this.isCompletePack = isComplete;

    this.setAttribute('data-max-flavors', String(this.maxFlavors));
    this.setAttribute('data-min-flavors', String(this.minFlavors));

    // For Complete Pack automatically select all products
    if (this.isCompletePack) {
      this.selectAllStep2Products();
    }

    // Clear flag for preserving selections
    delete selector.dataset.preserveSelections;
    this.updateUI();
  }

  resetStep2Selections() {
    this.selectedProducts.step2 = {};
    const step2Cards = this.querySelectorAll('step2-product-card');
    step2Cards.forEach(card => {
      card.reset();
      card.classList.remove('jc-complete-pack');
      
      // Remove Complete Pack specific restrictions
      const qtyControl = card.querySelector('.js-qty-control');
      const minusBtn = card.querySelector('.js-btn-minus');
      const plusBtn = card.querySelector('.js-btn-plus');
      
      if (qtyControl) {
        qtyControl.classList.remove('jc-pointer-events-none');
      }
      if (minusBtn) {
        minusBtn.disabled = false;
        minusBtn.classList.remove('is-disabled');
      }
      if (plusBtn) {
        plusBtn.disabled = false;
        plusBtn.classList.remove('is-disabled');
      }
    });
    
    // Update all button states after reset
    this.updateAllStep2Cards();
  }


  selectAllStep2Products() {
    const step2Cards = this.querySelectorAll('step2-product-card');
    const totalCards = step2Cards.length;

    // Limit selection to 6 cards
    const cardsToSelect = Math.min(totalCards, PACK_LIMITS.SIX_BAGS_MAX);

    step2Cards.forEach((card, index) => {
      if (index < cardsToSelect) {
        // Add class for complete pack
        card.classList.add('jc-complete-pack');

        const productId = card.getAttribute('data-product-id');
        const productPrice = parseInt(card.getAttribute('data-product-price')) || 0;

        // Set quantity 1 for each product
        card.setQuantity(1);

        // Update internal state
        this.selectedProducts.step2[productId] = {
          quantity: 1,
          price: productPrice
        };

        // Block controls for complete pack
        const qtyControl = card.querySelector('.js-qty-control');
        const minusBtn = card.querySelector('.js-btn-minus');
        const plusBtn = card.querySelector('.js-btn-plus');

        if (qtyControl) {
          qtyControl.classList.add('jc-pointer-events-none');
        }
        if (minusBtn) {
          minusBtn.disabled = true;
          minusBtn.classList.add('is-disabled');
        }
        if (plusBtn) {
          plusBtn.disabled = true;
          plusBtn.classList.add('is-disabled');
        }
      }
    });
  }

  selectStep1Product(productCard, productId) {
    // Clear previous selection
    this.querySelectorAll('product-option-card[data-step="1"]').forEach(card => {
      card.setSelected(false);
    });

    // Select new option
    productCard.setSelected(true);
    this.selectedProducts.step1 = {
      productId: productId,
      price: productCard.productPrice
    };

    // Auto-open step 2 and update UI
    this.openStep(2);
    this.updateUI();
  }

  selectStep3Product(productCard, productId) {
    // This method is now handled by Step3ProductCard quantity changes
    // Keep for backward compatibility but step3 now uses quantity-based selection
    console.warn('selectStep3Product called - Step 3 now uses quantity-based selection');
  }

  openProductPopup(clickedProduct) {
    const popup = document.querySelector('pack-selector-popup');
    if (!popup) {
      console.warn('Pack selector popup not found');
      return;
    }

    // Wait for custom element to be defined
    if (!customElements.get('pack-selector-popup') || typeof popup.open !== 'function') {
      console.warn('Pack selector popup component not ready yet, retrying...');
      setTimeout(() => this.openProductPopup(clickedProduct), DEFAULTS.RETRY_DELAY);
      return;
    }

    // Get all step 2 products
    const step2Products = Array.from(this.querySelectorAll('step2-product-card'));
    const productIndex = step2Products.indexOf(clickedProduct);

    // Open popup with correct product index
    popup.open(Math.max(0, productIndex));
  }

  updateUI() {
    this.updateStepAccess();
    this.updateFlavorCounter();
    this.updateSubmitButton();
    this.updateSummaryInfo();
    this.updateAllStep2Cards();
    this.updateAllStep3Cards();
  }

  updateStepAccess() {
    const hasStep1Selection = !!this.selectedProducts.step1;

    const step2 = this.querySelector('[data-step-number="2"]');
    const step3 = this.querySelector('[data-step-number="3"]');

    if (hasStep1Selection) {
      step2?.classList.remove('step-disabled');
      step3?.classList.remove('step-disabled');
    } else {
      step2?.classList.add('step-disabled');
      step3?.classList.add('step-disabled');

      // Close steps 2 and 3 if they are open
      const currentStep = this.getCurrentActiveStep();
      if (currentStep > 1) {
        this.openStep(1);
      }
    }
  }

  updateAllStep2Cards() {
    const step2Cards = this.querySelectorAll('step2-product-card');
    step2Cards.forEach(card => {
      if (card.updateButtonStates) {
        card.updateButtonStates();
      }
    });
  }

  updateAllStep3Cards() {
    const step3Cards = this.querySelectorAll('product-option-card[data-step="3"]');
    step3Cards.forEach(card => {
      if (card.updateQuantityButtonStates) {
        card.updateQuantityButtonStates();
      }
    });
  }

  openStep(stepNumber) {
    const radioInput = this.querySelector(`#step-${stepNumber}-toggle`);
    if (radioInput) {
      radioInput.checked = true;
    }
  }

  getCurrentActiveStep() {
    const checkedStep = this.querySelector('input[name="pack-step"]:checked');
    if (checkedStep) {
      const stepId = checkedStep.id;
      if (stepId.includes('step-1')) return 1;
      if (stepId.includes('step-2')) return 2;
      if (stepId.includes('step-3')) return 3;
    }
    return 1;
  }

  updateSubmitButton(reset = false) {
    if (!this.submitButton) return;

    const currentStep = this.getCurrentActiveStep();
    const totalFlavors = this.getTotalFlavors();
    const remainingFlavors = Math.max(0, this.minFlavors - totalFlavors);

    const canSubmit = reset ? false : (this.selectedProducts.step1 && totalFlavors >= this.minFlavors);

    this.submitButton.disabled = !canSubmit;

    // Dynamic button text based on current step and state
    let buttonText;

    if (canSubmit) {
      buttonText = this.getAttribute('data-text-button-add-to-cart') || 'ADD TO CART';
    } else if (currentStep === 1 || !this.selectedProducts.step1) {
      buttonText = this.getAttribute('data-text-summary-select-your-lio') || 'SELECT YOUR LIO';
    } else if (remainingFlavors > 0) {
      const minText = this.getAttribute('data-text-select-minimum-flavors') || 'Select minimum {count} flavors';

      if (this.minFlavors === PACK_LIMITS.SIX_BAGS_MIN) {
        buttonText = minText.replace('{count}', String(PACK_LIMITS.SIX_BAGS_MIN));
      } else if (this.minFlavors === PACK_LIMITS.THREE_BAGS_MIN) {
        buttonText = minText.replace('{count}', String(PACK_LIMITS.THREE_BAGS_MIN));
      } else {
        buttonText = minText.replace('{count}', remainingFlavors);
      }

      if (remainingFlavors !== this.minFlavors) {
        buttonText = minText.replace('{count}', remainingFlavors);
      }
    }

    this.submitButton.textContent = buttonText;
    this.submitButton.onclick = () => this.handleSubmit();
  }

  async handleSubmit() {
    if (!this.selectedProducts.step1 || this.getTotalFlavors() < this.minFlavors) return;

    const parentId = this.selectedProducts.step1.productId;
    const bundleId = this.generateBundleId();

    // Build cart items
    const items = [
      // Parent item (LIO)
      { id: parentId, quantity: 1, properties: { _bundle_id: bundleId } },
      // Flavors
      ...Object.entries(this.selectedProducts.step2).map(([id, item]) => ({
        id,
        quantity: item.quantity,
        parent_id: parentId,
        properties: { _bundle_id: bundleId }
      })),
      // Accessories with quantities
      ...Object.entries(this.selectedProducts.step3).map(([id, item]) => ({
        id,
        quantity: item.quantity,
        parent_id: parentId,
        properties: { _bundle_id: bundleId }
      }))
    ];

    try {
      this.setSubmitButtonLoading(true);

      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      if (response.ok) {
        await this.cartDrawerToggle();
        this.resetSelections();
      }
    } catch (error) {
      console.error('Cart add error:', error);
    } finally {
      this.setSubmitButtonLoading(false);
    }
  }

  async cartDrawerToggle() {
    if (this.cartDrawer?._onCartRefresh) {
      await this.cartDrawer._onCartRefresh();
      await this.cartDrawer.show?.();
    } else {
      document.documentElement.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
      document.documentElement.dispatchEvent(new CustomEvent('instant:add-to-cart'));
    }
  }

  generateBundleId() {
    const ts = Date.now().toString(36);
    const rnd = Math.random().toString(36).slice(2, 8);
    return `b-${ts}-${rnd}`;
  }

  resetSelections() {
    // Reset data
    this.selectedProducts = { step1: null, step2: {}, step3: {} };

    // Reset all product cards
    this.querySelectorAll('product-option-card, step2-product-card').forEach(card => {
      card.reset();
    });

    // Reset to 3 bags pack
    this.resetTo3BagsPack();

    // Go back to step 1
    this.openStep(1);

    // Update UI with reset flag
    this.updateUI();
    this.updateSubmitButton(true);
  }

  /**
   * Resets the pack selector to default 3 bags pack
   */
  resetTo3BagsPack() {
    const threeBagsSelector = this.querySelector(SELECTORS.THREE_BAGS_PACK);
    if (threeBagsSelector) {
      const input = threeBagsSelector.querySelector(SELECTORS.PACK_RADIO);
      if (input) {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  getTotalFlavors() {
    return Object.values(this.selectedProducts.step2).reduce((sum, item) => sum + item.quantity, 0);
  }

  updateFlavorCounter() {
    const totalFlavors = this.getTotalFlavors();
    if (this.flavorCounter) {
      this.flavorCounter.textContent = String(totalFlavors);
    } else {
      this.flavorCounter = this.querySelector('.js-flavor-counter');
      if (this.flavorCounter) {
        this.flavorCounter.textContent = String(totalFlavors);
      }
    }
    if (this.flavorMax) this.flavorMax.textContent = String(this.maxFlavors);
  }

  updateSummaryInfo() {
    const hasStep1Selection = !!this.selectedProducts.step1;

    this.classList.toggle('has-step1-selection', hasStep1Selection);

    // Update selected Lio title
    const lioElement = this.querySelectorAll('.js-selected-lio');
    if (lioElement && hasStep1Selection) {
      const selectedOption = this.querySelector(`product-option-card[data-step="1"][data-product-id="${this.selectedProducts.step1.productId}"]`);
      if (selectedOption) {
        const title = selectedOption.getAttribute('data-product-title') || selectedOption.querySelector('p')?.textContent?.trim() || '';
        lioElement.forEach(element => {
          element.textContent = title;
        });
      }
    } else if (lioElement) {
      lioElement.forEach(element => {
        element.textContent = '';
      });
    }

    // Calculate and update total price
    const totalPriceElement = this.querySelector('.js-selected-total-price');
    if (totalPriceElement) {
      const totalPrice = this.calculateTotalPrice();
      if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
        totalPriceElement.textContent = Shopify.formatMoney(totalPrice);
      } else {
        const formatted = (totalPrice / 100).toFixed(2);
        totalPriceElement.textContent = `${window.jollyVariables.cart_symbol}${formatted}`;
      }
    }
  }

  calculateTotalPrice() {
    let total = 0;

    // Step 1 price (Lio)
    if (this.selectedProducts.step1) {
      total += this.selectedProducts.step1.price;
    }

    // Step 2 prices (Flavors with quantities)
    Object.values(this.selectedProducts.step2).forEach(item => {
      total += item.price * item.quantity;
    });

    // Step 3 prices (Accessories with quantities)
    Object.values(this.selectedProducts.step3).forEach(item => {
      total += item.price * item.quantity;
    });

    return total;
  }

  setSubmitButtonLoading(isLoading) {
    if (!this.submitButton) return;

    if (isLoading) {
      this.submitButton.disabled = true;
      this.submitButton.textContent = this.getAttribute('data-text-button-adding-to-cart') || 'ADDING TO CART...';
      this.submitButton.classList.add('jc-opacity-75');
    } else {
      this.submitButton.classList.remove('jc-opacity-75');
      this.updateUI();
    }
  }
}


// Register custom elements
customElements.define('product-option-card', ProductOptionCard);
customElements.define('step2-product-card', Step2ProductCard);
customElements.define('pack-selector-component', PackSelectorComponent);

document.addEventListener('DOMContentLoaded', function () {
  const stepRadios = document.querySelectorAll('input[name="pack-step"]');

  stepRadios.forEach(radio => {
    radio.addEventListener('change', function () {
      if (this.checked) {
        setTimeout(() => {
          const stepContent = this.parentElement.querySelector('.step-content');
          if (stepContent) {
            const yOffset = -200; // scroll 200px up
            const y = stepContent.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        }, DEFAULTS.RETRY_DELAY);
      }
    });
  });
});