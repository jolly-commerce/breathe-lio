class PackSelectorComponent extends HTMLElement {
  constructor() {
    super();
    this.selectedProducts = {
      step1: null,
      step2: {}, // { [productId]: quantity }
      step3: []
    };
    this.maxFlavors = 6; // Maximum total number of flavors that can be selected
  }

  connectedCallback() {
    const attrMax = parseInt(this.getAttribute('data-max-flavors'));
    if (!Number.isNaN(attrMax) && attrMax > 0) this.maxFlavors = attrMax;
    this.initializeProductSelection();
    this.initializeFlavorControls();
    this.updateFlavorCounter();
    this.updateSubmitButton();
  }

  initializeProductSelection() {
    // Handle product selection for all steps
    const packOptions = this.querySelectorAll('.pack-option');
    
    packOptions.forEach(option => {
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
        } else if (step === 2) {
          // Click on card shows controls if not shown, or increments by 1 if already shown
          const qty = this.selectedProducts.step2[productId] || 0;
          if (qty === 0) {
            this.showStep2Controls(option, productId);
          } else {
            this.changeFlavorQuantity(productId, 1);
          }
        } else if (step === 3) {
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
    const controls = this.querySelectorAll('[data-step="2"] .qty-control');
    controls.forEach(control => {
      const productId = control.dataset.productId;
      const minus = control.querySelector('.btn-minus');
      const plus = control.querySelector('.btn-plus');
      minus?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.changeFlavorQuantity(productId, -1);
      });
      plus?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.changeFlavorQuantity(productId, 1);
      });
    });
  }

  selectStep1Product(option, productId) {
    // Clear previous selection
    const step1Options = this.querySelectorAll('[data-step="1"] .pack-option');
    step1Options.forEach(opt => {
      opt.classList.remove('selected');
      const btn = opt.querySelector('.select-button');
      if (btn) {
        btn.classList.remove('jc-bg-green-600', 'jc-text-white', 'jc-border-green-600');
      }
    });
    
    // Select new option
    option.classList.add('selected');
    this.selectedProducts.step1 = productId;
    
    // Update button background only (not text)
    const button = option.querySelector('.select-button');
    if (button) {
      button.classList.add('jc-bg-green-600', 'jc-text-white', 'jc-border-green-600');
    }
    
    // Auto-open step 2
    this.openStep(2);
    
    this.updateSubmitButton();
  }

  showStep2Controls(option, productId) {
    // Show quantity controls and hide SELECT button
    const selectButton = option.querySelector('.step2-select-button');
    const controls = option.querySelector('.qty-control');
    
    if (selectButton) selectButton.classList.add('jc-hidden');
    if (controls) controls.classList.remove('jc-hidden');
    
    // Initialize with quantity 1
    this.changeFlavorQuantity(productId, 1);
  }

  changeFlavorQuantity(productId, delta) {
    const currentQty = this.selectedProducts.step2[productId] || 0;
    const total = this.getTotalFlavors();
    let newQty = currentQty + delta;
    if (newQty < 0) newQty = 0;
    if (delta > 0 && total >= this.maxFlavors) return; // already at max total
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
    
    if (isSelected) {
      // Deselect
      option.classList.remove('selected');
      this.selectedProducts.step3 = this.selectedProducts.step3.filter(id => id !== productId);
      
      // Update button background only (not text)
      const button = option.querySelector('.select-button');
      if (button) {
        button.classList.remove('jc-bg-green-600', 'jc-text-white', 'jc-border-green-600');
      }
    } else {
      // Select
      option.classList.add('selected');
      this.selectedProducts.step3.push(productId);
      
      // Update button background only (not text)
      const button = option.querySelector('.select-button');
      if (button) {
        button.classList.add('jc-bg-green-600', 'jc-text-white', 'jc-border-green-600');
      }
    }
    
    this.updateSubmitButton();
  }

  openStep(stepNumber) {
    const radioInput = this.querySelector(`#step-${stepNumber}-toggle`);
    const stepElement = this.querySelector(`[data-step="${stepNumber}"]`);
    
    if (radioInput) {
      radioInput.checked = true;
      
      // Smooth scroll to the step
      if (stepElement) {
        stepElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  updateSubmitButton() {
    const submitButton = this.querySelector('#pack-selector-submit');
    if (!submitButton) return;
    
    const hasStep1 = this.selectedProducts.step1 !== null;
    const hasStep2 = this.getTotalFlavors() > 0;
    
    if (hasStep1 && hasStep2) {
      submitButton.disabled = false;
      submitButton.textContent = 'ADD TO CART';
      submitButton.classList.remove('jc-bg-green-100', 'jc-text-green-800');
      submitButton.classList.add('jc-bg-green-600', 'jc-text-white');
    } else {
      submitButton.disabled = true;
      submitButton.textContent = 'SELECT YOUR LIO';
      submitButton.classList.add('jc-bg-green-100', 'jc-text-green-800');
      submitButton.classList.remove('jc-bg-green-600', 'jc-text-white');
    }
    
    // Handle submit
    submitButton.onclick = () => this.handleSubmit();
  }

  async handleSubmit() {
    if (this.selectedProducts.step1 && this.getTotalFlavors() > 0) {
      const parentId = this.selectedProducts.step1; // LIO variant ID
      const bundleId = this.generateBundleId();
      
      // Build cart items array
      const items = [];
      
      // Add parent item (LIO)
      items.push({
        id: parentId,
        quantity: 1,
        properties: { _bundle_id: bundleId }
      });
      
      // Add flavor items (children)
      Object.entries(this.selectedProducts.step2).forEach(([variantId, quantity]) => {
        items.push({
          id: variantId,
          quantity: quantity,
          parent_id: parentId,
          properties: { _bundle_id: bundleId }
        });
      });
      
      // Add accessory items (children)
      this.selectedProducts.step3.forEach(variantId => {
        items.push({
          id: variantId,
          quantity: 1,
          parent_id: parentId,
          properties: { _bundle_id: bundleId }
        });
      });
      
      console.log('Adding to cart:', { items });
      
      try {
        // Show loading state
        this.setSubmitButtonLoading(true);
        
        const response = await fetch('/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ items })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('Successfully added to cart:', result);
          
          // Trigger success event
          this.dispatchEvent(new CustomEvent('pack-added-to-cart', {
            detail: { items, result },
            bubbles: true
          }));
          
          // Optional: Show success message or redirect
          this.showSuccessMessage();
          const cartDrawer = document.querySelector('#cart-drawer');

          if (cartDrawer && typeof cartDrawer._onCartRefresh === 'function') {
            await cartDrawer._onCartRefresh();
            await cartDrawer.show?.();
          } else {
            // fallback to global handler
            document.documentElement.dispatchEvent(new CustomEvent('cart:refresh', {
              bubbles: true
            }));
            document.documentElement.dispatchEvent(new CustomEvent('instant:add-to-cart'));
          }
          
          // Reset all selections and UI after success
          this.resetSelections();
          
        } else {
          const error = await response.json();
          console.error('Failed to add to cart:', error);
          this.showErrorMessage(error.message || 'Failed to add to cart');
        }
        
      } catch (error) {
        console.error('Cart add error:', error);
        this.showErrorMessage('Network error. Please try again.');
      } finally {
        this.setSubmitButtonLoading(false);
      }
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

    // Step 1: clear selection and button styles
    this.querySelectorAll('[data-step="1"] .pack-option').forEach((opt) => {
      opt.classList.remove('selected');
      const btn = opt.querySelector('.select-button');
      if (btn) {
        btn.classList.remove('jc-bg-green-600', 'jc-text-white', 'jc-border-green-600');
      }
    });

    // Step 2: reset quantities, hide controls, show SELECT buttons
    this.querySelectorAll('[data-step="2"] .pack-option').forEach((opt) => {
      opt.classList.remove('selected');
      const countEl = opt.querySelector('.qty-count');
      if (countEl) countEl.textContent = '0';
      const controls = opt.querySelector('.qty-control');
      if (controls) controls.classList.add('jc-hidden');
      const selectBtn = opt.querySelector('.step2-select-button');
      if (selectBtn) selectBtn.classList.remove('jc-hidden');
    });
    // Reset step 2 buttons states
    const plusButtons = this.querySelectorAll('[data-step="2"] .btn-plus');
    plusButtons.forEach((btn) => { btn.removeAttribute('disabled'); btn.classList.remove('is-disabled'); });
    const minusButtons = this.querySelectorAll('[data-step="2"] .btn-minus');
    minusButtons.forEach((btn) => { btn.setAttribute('disabled', 'true'); btn.classList.add('is-disabled'); });

    // Update flavor counter
    this.updateFlavorCounter();

    // Step 3: clear selection and button styles
    this.querySelectorAll('[data-step="3"] .pack-option').forEach((opt) => {
      opt.classList.remove('selected');
      const btn = opt.querySelector('.select-button');
      if (btn) {
        btn.classList.remove('jc-bg-green-600', 'jc-text-white', 'jc-border-green-600');
      }
    });

    // Open step 1 and update submit button state
    this.openStep(1);
    this.updateSubmitButton();
  }
  getTotalFlavors() {
    return Object.values(this.selectedProducts.step2).reduce((sum, qty) => sum + qty, 0);
  }

  updateFlavorCounter() {
    const counter = this.querySelector('[data-role="flavor-counter"]');
    const maxEl = this.querySelector('[data-role="flavor-max"]');
    if (counter) counter.textContent = String(this.getTotalFlavors());
    if (maxEl) maxEl.textContent = String(this.maxFlavors);
  }

  updateQtyUI(productId) {
    // Update the specific card's qty and selected state, show/hide controls vs SELECT button
    const option = this.querySelector(`.pack-option[data-step="2"][data-product-id="${productId}"]`);
    const qty = this.selectedProducts.step2[productId] || 0;
    
    if (option) {
      const countEl = option.querySelector('.qty-count');
      const selectButton = option.querySelector('.step2-select-button');
      const controls = option.querySelector('.qty-control');
      
      if (countEl) countEl.textContent = String(qty);
      option.classList.toggle('selected', qty > 0);
      
      // Show controls if qty > 0, otherwise show SELECT button
      if (qty > 0) {
        if (selectButton) selectButton.classList.add('jc-hidden');
        if (controls) controls.classList.remove('jc-hidden');
      } else {
        if (selectButton) selectButton.classList.remove('jc-hidden');
        if (controls) controls.classList.add('jc-hidden');
      }
    }
    
    const total = this.getTotalFlavors();
    const disablePlus = total >= this.maxFlavors;
    const plusButtons = this.querySelectorAll('[data-step="2"] .btn-plus');
    plusButtons.forEach(btn => {
      if (disablePlus) {
        btn.setAttribute('disabled', 'true');
        btn.classList.add('is-disabled');
      } else {
        btn.removeAttribute('disabled');
        btn.classList.remove('is-disabled');
      }
    });
    
    // Disable minus when zero
    const minusButtons = this.querySelectorAll('[data-step="2"] .btn-minus');
    minusButtons.forEach(btn => {
      const pid = btn.closest('.qty-control')?.dataset.productId;
      const q = pid ? (this.selectedProducts.step2[pid] || 0) : 0;
      if (q <= 0) {
        btn.setAttribute('disabled', 'true');
        btn.classList.add('is-disabled');
      } else {
        btn.removeAttribute('disabled');
        btn.classList.remove('is-disabled');
      }
    });
  }

  setSubmitButtonLoading(isLoading) {
    const submitButton = this.querySelector('#pack-selector-submit');
    if (!submitButton) return;
    
    if (isLoading) {
      submitButton.disabled = true;
      submitButton.textContent = 'ADDING TO CART...';
      submitButton.classList.add('jc-opacity-75');
    } else {
      submitButton.disabled = false;
      submitButton.textContent = 'ADD TO CART';
      submitButton.classList.remove('jc-opacity-75');
    }
  }

  showSuccessMessage() {
    // Create or update success message
    let successEl = this.querySelector('.pack-success-message');
    if (!successEl) {
      successEl = document.createElement('div');
      successEl.className = 'pack-success-message jc-mt-4 jc-p-3 jc-bg-green-100 jc-text-green-800 jc-rounded-lg jc-text-center jc-text-sm jc-font-semibold';
      this.querySelector('#pack-selector-submit').insertAdjacentElement('afterend', successEl);
    }
    
    successEl.textContent = '✓ Successfully added to cart!';
    successEl.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
      if (successEl) successEl.style.display = 'none';
    }, 3000);
  }

  showErrorMessage(message) {
    // Create or update error message
    let errorEl = this.querySelector('.pack-error-message');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'pack-error-message jc-mt-4 jc-p-3 jc-bg-red-100 jc-text-red-800 jc-rounded-lg jc-text-center jc-text-sm jc-font-semibold';
      this.querySelector('#pack-selector-submit').insertAdjacentElement('afterend', errorEl);
    }
    
    errorEl.textContent = `⚠ ${message}`;
    errorEl.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
      if (errorEl) errorEl.style.display = 'none';
    }, 5000);
  }
}

// Register the custom element
customElements.define('pack-selector-component', PackSelectorComponent);
