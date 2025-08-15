// Base Product Option Card Component
class ProductOptionCard extends HTMLElement {
  constructor() {
    super();
    this.productId = '';
    this.productPrice = 0;
    this.step = 0;
    this.isSelected = false;
    this.parentComponent = this.closest('pack-selector-component');
  }

  connectedCallback() {
    this.productId = this.getAttribute('data-product-id') || '';
    this.productPrice = parseInt(this.getAttribute('data-product-price')) || 0;
    this.step = parseInt(this.getAttribute('data-step')) || 0;
    
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
  }

  handleCardClick(e) {
    // To be overridden by subclasses or handled by parent
    this.selectProduct();
  }

  handleButtonClick(e) {
    // To be overridden by subclasses or handled by parent
    this.selectProduct();
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
  }
}

// Step 2 Product Card Component (extends base)
class Step2ProductCard extends ProductOptionCard {
  constructor() {
    super();
    this.quantity = 0;
    this.maxQty = 9999;
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Initialize Step 2 specific elements
    this.input = this.querySelector('.js-qty-count');
    this.maxQty = this.input ? parseInt(this.input.getAttribute('max')) || 9999 : 9999;
    
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
      setTimeout(() => this.initializeStep2Elements(), 100);
      return;
    }

    // Add Step 2 specific event listeners
    this.minusBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.changeQuantity(-1);
    });

    this.plusBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.changeQuantity(1);
    });

    // Initialize UI
    this.updateUI();
  }

  handleCardClick(e) {
    if (e.target.closest('button')) return;
    
    if (this.quantity === 0) {
      this.showControls();
    } else {
      this.changeQuantity(1);
    }
  }

  handleButtonClick(e) {
    e.stopPropagation();
    this.showControls();
  }

  showControls() {
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
    const newQty = Math.max(0, this.quantity + delta);

    // Check limits when increasing
    if (delta > 0) {
      const canAdd = this.dispatchEvent(new CustomEvent('can-add-flavor', {
        detail: { productId: this.productId },
        bubbles: true,
        cancelable: true
      }));

      if (!canAdd || this.quantity >= this.maxQty) return;
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
    // Update input value
    if (this.input) this.input.value = this.quantity;

    // Update selected state
    this.setSelected(this.quantity > 0);

    // Toggle visibility
    this.selectButton?.classList.toggle('jc-hidden', this.quantity > 0);
    this.qtyControl?.classList.toggle('not-visible', this.quantity === 0);

    // Update button states
    this.updateButtonStates();
  }

  updateButtonStates() {
    if (!this.plusBtn || !this.minusBtn || !this.selectButton) {
      return;
    }

    // Get global state from parent
    let atGlobalMax = false;

    if (this.parentComponent && typeof this.parentComponent.getTotalFlavors === 'function') {
      atGlobalMax = this.parentComponent.getTotalFlavors() >= this.parentComponent.maxFlavors;
    }

    const atProductMax = this.quantity >= this.maxQty;

    // Update plus button
    this.plusBtn.disabled = atGlobalMax || atProductMax;
    this.plusBtn.classList.toggle('is-disabled', atGlobalMax || atProductMax);

    // Update minus button
    this.minusBtn.disabled = this.quantity <= 0;
    this.minusBtn.classList.toggle('is-disabled', this.quantity <= 0);

    // Update select button
    this.selectButton.disabled = atGlobalMax || atProductMax;
    this.selectButton.classList.toggle('jc-opacity-50', atGlobalMax || atProductMax);
  }

  reset() {
    this.quantity = 0;
    this.updateUI();
    this.selectButton?.classList.remove('jc-hidden');
    this.qtyControl?.classList.add('not-visible');
    this.selectButton?.classList.remove('jc-opacity-50');
    if (this.selectButton) this.selectButton.disabled = false;
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
      step3: [] // [{ productId, price }]
    };
    this.maxFlavors = 100;
    this.minFlavors = 4;
  }

  connectedCallback() {
    this.maxFlavors = parseInt(this.getAttribute('data-max-flavors')) || 6;
    this.minFlavors = parseInt(this.getAttribute('data-min-flavors')) || 4;

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
      const canAdd = this.getTotalFlavors() < this.maxFlavors;
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
  }

  initializeStepRadios() {
    const stepRadios = this.querySelectorAll('input[name="pack-step"]');
    stepRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.updateUI();
      });
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
    const isSelected = productCard.isSelected;

    // Toggle selection
    productCard.setSelected(!isSelected);

    // Update data
    if (isSelected) {
      this.selectedProducts.step3 = this.selectedProducts.step3.filter(item => item.productId !== productId);
    } else {
      this.selectedProducts.step3.push({
        productId: productId,
        price: productCard.productPrice
      });
    }

    this.updateUI();
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
      setTimeout(() => this.openProductPopup(clickedProduct), 100);
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
    } else if ( remainingFlavors > 0) {
      const minText = this.getAttribute('data-text-select-minimum-flavors') || 'Select minimum {count} flavors';
      buttonText = minText.replace('{count}', remainingFlavors);
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
      // Accessories
      ...this.selectedProducts.step3.map(item => ({
        id: item.productId,
        quantity: 1,
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
    this.selectedProducts = { step1: null, step2: {}, step3: [] };

    // Reset all product cards
    this.querySelectorAll('product-option-card, step2-product-card').forEach(card => {
      card.reset();
    });

    // Go back to step 1
    this.openStep(1);

    // Update UI with reset flag
    this.updateUI();
    this.updateSubmitButton(true);
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
    const lioElement = this.querySelector('.js-selected-lio');
    if (lioElement && hasStep1Selection) {
      const selectedOption = this.querySelector(`product-option-card[data-step="1"][data-product-id="${this.selectedProducts.step1.productId}"]`);
      if (selectedOption) {
        const title = selectedOption.getAttribute('data-product-title') || selectedOption.querySelector('p')?.textContent?.trim() || '';
        lioElement.textContent = title;
      }
    } else if (lioElement) {
      lioElement.textContent = '';
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
    
    // Step 3 prices (Accessories)
    this.selectedProducts.step3.forEach(item => {
      total += item.price;
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

let firstChange = true;
document.addEventListener('DOMContentLoaded', function() {
  const stepRadios = document.querySelectorAll('input[name="pack-step"]');

  stepRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      // Skip the very first change (initial slide)
      if (firstChange) {
        firstChange = false;
        return;
      }

      if (this.checked) {
        setTimeout(() => {
          const stepContent = this.parentElement.querySelector('.step-content');
          if (stepContent) {
            const yOffset = -200; // scroll 100px up
            const y = stepContent.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        }, 100);
      }
    });
  });
});