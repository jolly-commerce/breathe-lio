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
    this.flavorCounter = this.querySelector('[data-role="flavor-counter"]');
    this.flavorMax = this.querySelector('[data-role="flavor-max"]');
  }

  connectedCallback() {
    this.maxFlavors = parseInt(this.getAttribute('data-max-flavors')) || 6;
    this.minFlavors = parseInt(this.getAttribute('data-min-flavors')) || 4;
    this.initializeProductSelection();
    this.initializeFlavorControls();
    this.initializePopupTriggers();
    this.updateFlavorCounter();
    this.updateSubmitButton();
  }

  initializeProductSelection() {
    // Handle product selection for all steps
    this.packOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        // Prevent button click from triggering option click
        if (e.target.closest('button')) {
          e.stopPropagation();
          return;
        }

        const step = parseInt(option.dataset.step);
        const productId = option.dataset.productId;

        if (step === 1) {
          this.selectStep1Product(option, productId);
        }
        else if (step === 2) {
          // Click on card shows controls if not shown, or increments by 1 if already shown
          const qty = this.selectedProducts.step2[productId] || 0;
          if (qty === 0) {
            this.showStep2Controls(option, productId);
          } else {
            this.changeFlavorQuantity(productId, 1);
          }
        }
        else if (step === 3) {
          this.selectStep3Product(option, productId);
        }
      });

      // Handle button clicks
      const selectButton = option.querySelector('[data-action]');
      if (selectButton) {
        selectButton.addEventListener('click', (e) => {
          e.stopPropagation();
          const step = parseInt(option.dataset.step);
          const productId = option.dataset.productId;

          if (step === 1) {
            this.selectStep1Product(option, productId);
          } else if (step === 3) {
            this.selectStep3Product(option, productId);
          }
        });
      }

      // Handle step 2 SELECT button clicks
      const step2SelectButton = option.querySelector('[data-action="select-step2"]');
      if (step2SelectButton) {
        step2SelectButton.addEventListener('click', (e) => {
          e.stopPropagation();
          const productId = option.dataset.productId;
          this.showStep2Controls(option, productId);
        });
      }
    });
  }

  initializeFlavorControls() {
    const quantityControls = this.querySelectorAll('[data-step="2"] .js-qty-control');
    quantityControls?.forEach(control => {
      const productId = control.dataset.productId;
      const minusButton = control.querySelector('.js-btn-minus');
      const plusButton = control.querySelector('.js-btn-plus');
      minusButton?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.changeFlavorQuantity(productId, -1);
      });
      plusButton?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.changeFlavorQuantity(productId, 1);
      });
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

    // Select new option and update data with productId
    option.classList.add('selected');
    this.selectedProducts.step1 = productId;

    // Auto-open step 2
    this.openStep(2);
    this.updateSubmitButton();
  }

  showStep2Controls(option, productId) {
    // Show quantity controls and hide SELECT button
    const selectButton = option.querySelector('.js-select-button-step2');
    const controls = option.querySelector('.js-qty-control');

    if (selectButton) selectButton.classList.add('jc-hidden');
    if (controls) controls.classList.remove('jc-hidden');

    // Initialize with quantity 1
    this.changeFlavorQuantity(productId, 1);
  }

  changeFlavorQuantity(productId, delta) {
    const currentQty = this.selectedProducts.step2[productId] || 0;
    const newQty = Math.max(0, currentQty + delta);

    // Check max limit when increasing
    if (delta > 0 && this.getTotalFlavors() >= this.maxFlavors) return;

    // Update or remove from selection
    if (newQty === 0) {
      delete this.selectedProducts.step2[productId];
    } else {
      this.selectedProducts.step2[productId] = newQty;
    }

    this.updateQtyUI(productId);
    this.updateFlavorCounter();
    this.updateSubmitButton();
  }

  selectStep3Product(option, productId) {
    const isSelected = option.classList.contains('selected');

    // Toggle selection
    option.classList.toggle('selected');
    // Update data
    if (isSelected) {
      this.selectedProducts.step3 = this.selectedProducts.step3.filter(id => id !== productId);
    }
    else {
      this.selectedProducts.step3.push(productId);
    }

    this.updateSubmitButton();
  }

  openStep(stepNumber) {
    const radioInput = this.querySelector(`#step-${stepNumber}-toggle`);
    if (radioInput) {
      radioInput.checked = true;
      // Smooth scroll
      this.querySelector(`[data-step="${stepNumber}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  updateSubmitButton(reset = false) {
    if (!this.submitButton) return;

    // When reset is true, force initial state: disabled with "Select your Lio" text
    const canSubmit = reset ? false : (this.selectedProducts.step1 && this.getTotalFlavors() >= this.minFlavors);

    this.submitButton.disabled = !canSubmit;
    this.submitButton.textContent = canSubmit
      ? (this.getAttribute('data-text-button-add-to-cart') || 'ADD TO CART')
      : (this.getAttribute('data-text-summary-select-your-lio') || 'SELECT YOUR LIO');

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

    // Clear all selections
    this.packOptions.forEach(opt => {
      opt.classList.remove('selected');
    });

    // Reset step 2 specific elements
    this.querySelectorAll('[data-step="2"]').forEach(step => {
      step.querySelectorAll('.js-qty-count').forEach(el => el.textContent = '0');
      step.querySelectorAll('.js-qty-control').forEach(el => el.classList.add('jc-hidden'));
      step.querySelectorAll('.js-select-button-step2').forEach(el => el.classList.remove('jc-hidden'));
      step.querySelectorAll('.js-btn-plus').forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('is-disabled');
      });
      step.querySelectorAll('.js-btn-minus').forEach(btn => {
        btn.disabled = true;
        btn.classList.add('is-disabled');
      });
    });

    this.updateFlavorCounter();
    this.openStep(1);
    this.updateSubmitButton(true);
  }

  getTotalFlavors() {
    return Object.values(this.selectedProducts.step2).reduce((sum, qty) => sum + qty, 0);
  }

  updateFlavorCounter() {
    if (this.flavorCounter) this.flavorCounter.textContent = String(this.getTotalFlavors());
    if (this.flavorMax) this.flavorMax.textContent = String(this.maxFlavors);
  }

  updateQtyUI(productId) {
    const option = this.querySelector(`.js-product-option-card[data-step="2"][data-product-id="${productId}"]`);
    const qty = this.selectedProducts.step2[productId] || 0;

    if (option) {
      const countEl = option.querySelector('.js-qty-count');
      const selectButton = option.querySelector('.js-select-button-step2');
      const controls = option.querySelector('.js-qty-control');

      if (countEl) countEl.textContent = qty;
      option.classList.toggle('selected', qty > 0);

      // Toggle visibility
      selectButton?.classList.toggle('jc-hidden', qty > 0);
      controls?.classList.toggle('jc-hidden', qty === 0);
    }

    // Update all plus/minus buttons state
    const atMaximum = this.getTotalFlavors() >= this.maxFlavors;

    this.querySelectorAll('[data-step="2"] .js-btn-plus').forEach(btn => {
      btn.disabled = atMaximum;
      btn.classList.toggle('is-disabled', atMaximum);
    });

    this.querySelectorAll('[data-step="2"] .js-btn-minus').forEach(btn => {
      const controlId = btn.closest('.js-qty-control')?.dataset.productId;
      const quantity = this.selectedProducts.step2[controlId] || 0;
      btn.disabled = quantity <= 0;
      btn.classList.toggle('is-disabled', quantity <= 0);
    });
  }

  setSubmitButtonLoading(isLoading) {
    const submitButton = this.querySelector('#pack-selector-submit');
    if (!submitButton) return;

    if (isLoading) {
      submitButton.disabled = true;
      submitButton.textContent = this.getAttribute('data-text-button-adding-to-cart') || 'ADDING TO CART...';
      submitButton.classList.add('jc-opacity-75');
    } else {
      // Re-evaluate state after any changes (like reset)
      const canSubmit = this.selectedProducts.step1 && this.getTotalFlavors() >= this.minFlavors;
      submitButton.disabled = !canSubmit;
      submitButton.textContent = canSubmit
        ? (this.getAttribute('data-text-button-add-to-cart') || 'ADD TO CART')
        : (this.getAttribute('data-text-summary-select-your-lio') || 'SELECT YOUR LIO');
      submitButton.classList.remove('jc-opacity-75');
    }
  }
}

// Register the custom element
customElements.define('pack-selector-component', PackSelectorComponent);