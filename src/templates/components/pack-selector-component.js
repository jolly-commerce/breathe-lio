class PackSelectorComponent extends HTMLElement {
  constructor() {
    super();
    this.selectedProducts = {
      step1: null,
      step2: {}, // { [productId]: quantity }
      step3: []
    };
    this.maxFlavors = 6; // Maximum total number of flavors that can be selected
    this.minFlavors = 4; // Minimum number of flavors that must be selected
    this.submitButton = this.querySelector('#pack-selector-submit');
    this.cartDrawer = document.querySelector('#cart-drawer');
    this.packOptions = this.querySelectorAll('.js-product-option-card');
    this.flavorCounter = this.querySelector('.js-flavor-counter');
    this.flavorMax = this.querySelector('[data-role="flavor-max"]');
  }

  connectedCallback() {
    this.maxFlavors = parseInt(this.getAttribute('data-max-flavors')) || 6;
    this.minFlavors = parseInt(this.getAttribute('data-min-flavors')) || 4;

    // Re-initialize DOM elements after connection
    this.submitButton = this.querySelector('#pack-selector-submit');
    this.flavorCounter = this.querySelector('.js-flavor-counter');
    this.flavorMax = this.querySelector('[data-role="flavor-max"]');
    this.packOptions = this.querySelectorAll('.js-product-option-card');

    this.init();
  }

  init() {
    this.initializeProductSelection();
    this.initializeStep2Cards();
    this.initializePopupTriggers();
    this.initializeStepRadios();
    this.updateUI();
  }   updateUI() {
    this.updateStepAccess();
    this.updateFlavorCounter();
    this.updateSubmitButton();
    this.updateSummaryInfo();
    this.updateAllStep2Cards();
  }

  updateStepAccess() {
    // Enable/disable steps based on step 1 selection
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

  initializeProductSelection() {
    // Handle product selection for steps 1 and 3
    this.packOptions.forEach(option => {
      const step = parseInt(option.dataset.step);

      // Skip step 2 cards (handled by Step2CardComponent)
      if (step === 2) return;

      option.addEventListener('click', (e) => {
        // Prevent button click from triggering option click
        if (e.target.closest('button')) {
          e.stopPropagation();
          return;
        }

        const productId = option.dataset.productId;

        if (step === 1) {
          this.selectStep1Product(option, productId);
        } else if (step === 3) {
          this.selectStep3Product(option, productId);
        }
      });

      // Handle button clicks
      const selectButton = option.querySelector('[data-action]');
      if (selectButton) {
        selectButton.addEventListener('click', (e) => {
          e.stopPropagation();
          const productId = option.dataset.productId;

          if (step === 1) {
            this.selectStep1Product(option, productId);
          } else if (step === 3) {
            this.selectStep3Product(option, productId);
          }
        });
      }
    });
  }

  initializeStep2Cards() {
    // Listen for events from Step2CardComponent
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
        this.selectedProducts.step2[productId] = quantity;
      }

      // Update UI
      this.updateUI();
    });
  }

  initializeStepRadios() {
    // Listen for step radio button changes
    const stepRadios = this.querySelectorAll('input[name="pack-step"]');
    stepRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.updateUI();
      });
    });
  }

  updateAllStep2Cards() {
    // If the Step2 component isn't defined yet, wait and retry
    if (!customElements.get('step2-card-component')) {
      customElements.whenDefined('step2-card-component').then(() => this.updateAllStep2Cards());
      return;
    }
    const step2Cards = this.querySelectorAll('step2-card-component');
    step2Cards.forEach(card => {
      card.updateButtonStates();
    });
  }
  // New to check
  initializePopupTriggers() {
    // Handle popup trigger clicks
    const popupTriggers = this.querySelectorAll('.js-trigger-popup');
    popupTriggers.forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Find the closest product option to get product info
        const productOption = trigger.closest('.js-product-option-card');
        if (productOption) {
          const productId = productOption.dataset.productId;
          const step = productOption.dataset.step;

          // Only handle step 2 products for popup
          if (step === '2') {
            // Ensure DOM is fully loaded before trying to open popup
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', () => {
                this.openProductPopup(productOption);
              });
            } else {
              this.openProductPopup(productOption);
            }
          }
        }
      });
    });
  }

  openProductPopup(clickedProduct) {
    const popup = document.querySelector('pack-selector-popup');
    if (!popup) {
      console.warn('Pack selector popup not found');
      return;
    }

    // Wait for custom element to be defined and connected
    if (!customElements.get('pack-selector-popup') || typeof popup.open !== 'function') {
      console.warn('Pack selector popup component not ready yet, retrying...');
      // Retry after a short delay
      setTimeout(() => this.openProductPopup(clickedProduct), 100);
      return;
    }

    // Get all step 2 products
    const step2Products = Array.from(this.querySelectorAll('[data-step="2"].js-product-option-card'));
    const productIndex = step2Products.indexOf(clickedProduct);

    // Open popup with correct product index
    popup.open(Math.max(0, productIndex));
  }
  // New to check
  selectStep1Product(option, productId) {
    // Clear previous selection
    this.querySelectorAll('[data-step="1"] .js-product-option-card').forEach(opt => {
      opt.classList.remove('selected');
    });

    // Select new option
    option.classList.add('selected');
    this.selectedProducts.step1 = productId;

    // Auto-open step 2 and update UI
    this.openStep(2);
    this.updateUI();
  }

  selectStep3Product(option, productId) {
    const isSelected = option.classList.contains('selected');

    // Toggle selection
    option.classList.toggle('selected');

    // Update data
    if (isSelected) {
      this.selectedProducts.step3 = this.selectedProducts.step3.filter(id => id !== productId);
    } else {
      this.selectedProducts.step3.push(productId);
    }

    this.updateUI();
  } openStep(stepNumber) {
    const radioInput = this.querySelector(`#step-${stepNumber}-toggle`);
    if (radioInput) {
      radioInput.checked = true;
      // Smooth scroll
      this.querySelector(`[data-step="${stepNumber}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  getCurrentActiveStep() {
    // Find which step radio button is currently checked
    const checkedStep = this.querySelector('input[name="pack-step"]:checked');
    if (checkedStep) {
      const stepId = checkedStep.id;
      if (stepId.includes('step-1')) return 1;
      if (stepId.includes('step-2')) return 2;
      if (stepId.includes('step-3')) return 3;
    }
    return 1; // Default to step 1
  }

  updateSubmitButton(reset = false) {
    if (!this.submitButton) return;

    const currentStep = this.getCurrentActiveStep();
    const totalFlavors = this.getTotalFlavors();
    const remainingFlavors = Math.max(0, this.minFlavors - totalFlavors);

    // When reset is true, force initial state
    const canSubmit = reset ? false : (this.selectedProducts.step1 && totalFlavors >= this.minFlavors);

    this.submitButton.disabled = !canSubmit;

    // Dynamic button text based on current step and state
    let buttonText;

    if (canSubmit) {
      buttonText = this.getAttribute('data-text-button-add-to-cart') || 'ADD TO CART';
    } else if (currentStep === 1 || !this.selectedProducts.step1) {
      buttonText = this.getAttribute('data-text-summary-select-your-lio') || 'SELECT YOUR LIO';
    } else if (currentStep === 2 && remainingFlavors > 0) {
      const minText = this.getAttribute('data-text-select-minimum-flavors') || 'Select minimum {count} flavors';
      buttonText = minText.replace('{count}', remainingFlavors);
    } else {
      buttonText = this.getAttribute('data-text-summary-select-your-lio') || 'SELECT YOUR LIO';
    }

    this.submitButton.textContent = buttonText;
    this.submitButton.onclick = () => this.handleSubmit();
  }

  async handleSubmit() {
    if (!this.selectedProducts.step1 || this.getTotalFlavors() < this.minFlavors) return;

    const parentId = this.selectedProducts.step1;
    const bundleId = this.generateBundleId();

    // Build cart items
    const items = [
      // Parent item (LIO)
      { id: parentId, quantity: 1, properties: { _bundle_id: bundleId } },
      // Flavors
      ...Object.entries(this.selectedProducts.step2).map(([id, qty]) => ({
        id,
        quantity: qty,
        parent_id: parentId,
        properties: { _bundle_id: bundleId }
      })),
      // Accessories
      ...this.selectedProducts.step3.map(id => ({
        id,
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
        // // Trigger events and update cart
        // this.dispatchEvent(new CustomEvent('pack-added-to-cart', { detail: { items }, bubbles: true }));

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

    // Clear all selections for steps 1 and 3
    this.packOptions.forEach(opt => {
      const step = parseInt(opt.dataset.step);
      if (step !== 2) {
        opt.classList.remove('selected');
      }
    });

    // Reset step 2 cards
    const step2Cards = this.querySelectorAll('step2-card-component');
    step2Cards.forEach(card => {
      card.reset();
    });

    // Go back to step 1
    this.openStep(1);

    // Update UI with reset flag
    this.updateUI();
    this.updateSubmitButton(true);
  }

  getTotalFlavors() {
    return Object.values(this.selectedProducts.step2).reduce((sum, qty) => sum + qty, 0);
  }

  updateFlavorCounter() {
    const totalFlavors = this.getTotalFlavors();
    if (this.flavorCounter) {
      this.flavorCounter.textContent = String(totalFlavors);
    } else {
      // Try to find the element again if not found initially
      this.flavorCounter = this.querySelector('.js-flavor-counter');
      if (this.flavorCounter) {
        this.flavorCounter.textContent = String(totalFlavors);
      }
    }
    if (this.flavorMax) this.flavorMax.textContent = String(this.maxFlavors);
  }

  updateSummaryInfo() {
    const hasStep1Selection = !!this.selectedProducts.step1;
    
    // Toggle visibility class
    this.classList.toggle('has-step1-selection', hasStep1Selection);
    
    // Update selected Lio title
    const lioElement = this.querySelector('.js-selected-lio');
    if (lioElement && hasStep1Selection) {
      const selectedOption = this.querySelector(`[data-step="1"][data-product-id="${this.selectedProducts.step1}"]`);
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
      // Format price using Shopify's money filter (if available) or fallback to basic formatting
      if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
        totalPriceElement.textContent = Shopify.formatMoney(totalPrice);
      } else {
        // Basic price formatting as fallback
        const formatted = (totalPrice / 100).toFixed(2);
        totalPriceElement.textContent = `${window.jollyVariables.cart_symbol}${formatted}`;
      }
    }
  }

  calculateTotalPrice() {
    let total = 0;
    
    // Step 1 price (Lio)
    if (this.selectedProducts.step1) {
      const step1Option = this.querySelector(`[data-step="1"][data-product-id="${this.selectedProducts.step1}"]`);
      if (step1Option) {
        const price = parseInt(step1Option.getAttribute('data-product-price')) || 0;
        total += price;
      }
    }
    
    // Step 2 prices (Flavors with quantities)
    Object.entries(this.selectedProducts.step2).forEach(([productId, quantity]) => {
      const step2Option = this.querySelector(`[data-step="2"][data-product-id="${productId}"]`);
      if (step2Option) {
        const price = parseInt(step2Option.getAttribute('data-product-price')) || 0;
        total += price * quantity;
      }
    });
    
    // Step 3 prices (Accessories)
    this.selectedProducts.step3.forEach(productId => {
      const step3Option = this.querySelector(`[data-step="3"][data-product-id="${productId}"]`);
      if (step3Option) {
        const price = parseInt(step3Option.getAttribute('data-product-price')) || 0;
        total += price;
      }
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

customElements.define('pack-selector-component', PackSelectorComponent);
// Step 2 Card Component

class Step2CardComponent extends HTMLElement {
  constructor() {
    super();
    this.quantity = 0;
    this.maxQty = 9999;
    this.productId = '';
  }

  connectedCallback() {
    this.productId = this.getAttribute('data-product-id') || '';
    const input = this.querySelector('.js-qty-count');
    this.maxQty = input ? parseInt(input.getAttribute('max')) || 9999 : 9999;

    // Delay initialization to ensure parent component is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeElements());
    } else {
      // Use timeout to ensure parent component is fully initialized
      setTimeout(() => this.initializeElements(), 0);
    }
  }

  initializeElements() {
    // Get elements
    this.selectButton = this.querySelector('.js-select-button-step2');
    this.qtyControl = this.querySelector('.js-qty-control');
    this.input = this.querySelector('.js-qty-count');
    this.minusBtn = this.querySelector('.js-btn-minus');
    this.plusBtn = this.querySelector('.js-btn-plus');

    // Ensure all required elements are found
    if (!this.selectButton || !this.qtyControl || !this.input || !this.minusBtn || !this.plusBtn) {
      console.warn('Step2CardComponent: Some required elements not found, retrying...');
      setTimeout(() => this.initializeElements(), 100);
      return;
    }

    // Add event listeners
    this.selectButton?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showControls();
    });

    this.minusBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.changeQuantity(-1);
    });

    this.plusBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.changeQuantity(1);
    });

    // Card click handler
    this.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;

      if (this.quantity === 0) {
        this.showControls();
      } else {
        this.changeQuantity(1);
      }
    });

    // Initialize UI safely
    this.updateUI();
  } showControls() {
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
    this.classList.toggle('selected', this.quantity > 0);

    // Toggle visibility
    this.selectButton?.classList.toggle('jc-hidden', this.quantity > 0);
    this.qtyControl?.classList.toggle('not-visible', this.quantity === 0);

    // Update button states
    this.updateButtonStates();
  }

  updateButtonStates() {
    // Skip if not fully initialized
    if (!this.plusBtn || !this.minusBtn || !this.selectButton) {
      return;
    }

    // Get global state from parent
    const parentComponent = this.closest('pack-selector-component');
    let atGlobalMax = false;

    if (parentComponent && typeof parentComponent.getTotalFlavors === 'function' && typeof parentComponent.maxFlavors !== 'undefined') {
      atGlobalMax = parentComponent.getTotalFlavors() >= parentComponent.maxFlavors;
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

// Register the custom elements
customElements.define('step2-card-component', Step2CardComponent);