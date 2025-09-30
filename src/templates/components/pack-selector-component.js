// Import constants and classes from product cards (loaded via window globals)
// This assumes product-cards.js is loaded before this file
const PACK_TYPES = window.PACK_TYPES;
const PACK_LIMITS = window.PACK_LIMITS;
const DEFAULTS = window.DEFAULTS;
const SELECTORS = window.SELECTORS;

// Main Pack Selector Component
class PackSelectorComponent extends HTMLElement {
  constructor() {
    super();
    this.selectedProducts = {
      step1: null,
      step2: {}, // { [productId]: { quantity, price, subscriptionProductId, subscriptionPrice } }
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
    this.selectedPackPlan = this.querySelector('.js-selected-pack-plan');

    this.init();
  }

  initializeDiscountRates() {
    // Initialize dynamic discount rates from data attributes
    this.discountRates = {
      [PACK_TYPES.THREE_BAGS]: parseInt(this.getAttribute('data-discount-3-bags')) || 0,
      [PACK_TYPES.SIX_BAGS]: parseInt(this.getAttribute('data-discount-6-bags')) || 10,
      [PACK_TYPES.COMPLETE]: parseInt(this.getAttribute('data-discount-complete')) || 15
    };
  }

  init() {
    this.initializeDiscountRates();
    this.initializeEventListeners();
    this.initializeStepRadios();
    this.initializePackSelectors();
    this.initializePurchaseTypeListeners();
    this.updateUI();
    // Initialize pack plan display
    setTimeout(() => this.updateSelectedPackPlan(), 0);
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
      const { productId, quantity, price, subscriptionProductId, subscriptionPrice } = e.detail;

      // Update internal state
      if (quantity === 0) {
        delete this.selectedProducts.step2[productId];
      } else {
        this.selectedProducts.step2[productId] = {
          quantity: quantity,
          price: price || 0,
          subscriptionProductId: subscriptionProductId,
          subscriptionPrice: subscriptionPrice || price || 0
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

  initializePurchaseTypeListeners() {
    // Listen for purchase type changes (subscribe vs one-time)
    const purchaseTypeRadios = document.querySelectorAll('input[name="purchase_type"]');
    purchaseTypeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.updateSelectedPackPlan();
      });
    });
  }

  handlePackChange(selector) {
    const maxFlavors = parseInt(selector.getAttribute('data-max-flavors')) || 6;
    const isComplete = selector.getAttribute('data-complete-pack') === 'true';

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
    this.updateSelectedPackPlan();
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
        const subscriptionProductId = card.getAttribute('data-subscription-product-id');
        const subscriptionProductPrice = parseInt(card.getAttribute('data-subscription-product-price')) || productPrice;

        // Set quantity 1 for each product
        card.setQuantity(1);

        // Update internal state with subscription data
        this.selectedProducts.step2[productId] = {
          quantity: 1,
          price: productPrice,
          subscriptionProductId: subscriptionProductId,
          subscriptionPrice: subscriptionProductPrice
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
    
    // Check if subscription is selected
    const isSubscriptionSelected = document.querySelector('#tab-subscribe:checked');
    
    let flavorProperties = {};
    if (this.isCompletePack) {
      flavorProperties._bundle_complete = true;
    } else if (this.currentPackType === PACK_TYPES.SIX_BAGS) {
      flavorProperties._bundle_6_bags = true;
    }
    
    const items = [
      // Parent item (LIO)
      { id: parentId, quantity: 1 },
      // Flavors - use correct ID based on subscription
      ...Object.entries(this.selectedProducts.step2).map(([id, item]) => ({
        id: id,
        selling_plan: isSubscriptionSelected && item.subscriptionProductId ? item.subscriptionProductId : null,
        quantity: item.quantity,
        properties: flavorProperties
      })),
      // Accessories with quantities
      ...Object.entries(this.selectedProducts.step3).map(([id, item]) => ({
        id,
        quantity: item.quantity
      }))
    ];
    // Build cart items for parent and children relationships
    // const bundleId = this.generateBundleId();
    // const items = [
    //   // Parent item (LIO)
    //   { id: parentId, quantity: 1, properties: { _bundle_id: bundleId } },
    //   // Flavors
    //   ...Object.entries(this.selectedProducts.step2).map(([id, item]) => ({
    //     id,
    //     quantity: item.quantity,
    //     parent_id: parentId, // Commented out - no parent/child relationship
    //     properties: { _bundle_id: bundleId }
    //   })),
    //   // Accessories with quantities
    //   ...Object.entries(this.selectedProducts.step3).map(([id, item]) => ({
    //     id,
    //     quantity: item.quantity,
    //     parent_id: parentId, // Commented out - no parent/child relationship
    //     properties: { _bundle_id: bundleId }
    //   }))
    // ];

    try {
      this.setSubmitButtonLoading(true);

      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      if (response.ok) {
        this.resetSelections();
        // Redirect to checkout instead of opening cart drawer
        window.location.href = '/checkout';
      }
    } catch (error) {
      console.error('Cart add error:', error);
    } finally {
      this.setSubmitButtonLoading(false);
    }
  }

  // Commented out - now redirecting to checkout instead of showing cart drawer
  // async cartDrawerToggle() {
  //   if (this.cartDrawer?._onCartRefresh) {
  //     await this.cartDrawer._onCartRefresh();
  //     await this.cartDrawer.show?.();
  //   } else {
  //     document.documentElement.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
  //     document.documentElement.dispatchEvent(new CustomEvent('instant:add-to-cart'));
  //   }
  // }

  // generateBundleId() {
  //   const ts = Date.now().toString(36);
  //   const rnd = Math.random().toString(36).slice(2, 8);
  //   return `b-${ts}-${rnd}`;
  // }

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
      let formattedPrice = this.formatPrice(totalPrice);
      totalPriceElement.textContent = formattedPrice;
    }

    // Calculate and update subscription total price
    const totalPriceSubscriptionElement = this.querySelector('.js-selected-total-price-subscription');
    if (totalPriceSubscriptionElement) {
      const subscriptionTotalPrice = this.calculateSubscriptionTotalPrice();
      let formattedSubscriptionPrice = this.formatPrice(subscriptionTotalPrice);
      totalPriceSubscriptionElement.textContent = formattedSubscriptionPrice;
    }
  }

  calculateTotalPrice() {
    let total = 0;

    // Step 1 price (Lio)
    if (this.selectedProducts.step1) {
      total += this.selectedProducts.step1.price;
    }

    // Step 2 prices (Flavors with quantities) - apply discount
    Object.values(this.selectedProducts.step2).forEach(item => {
      const discountedPrice = this.applyDiscount(item.price, item.quantity);
      total += discountedPrice;
    });

    // Step 3 prices (Accessories with quantities)
    Object.values(this.selectedProducts.step3).forEach(item => {
      total += item.price * item.quantity;
    });

    return total;
  }

  calculateSubscriptionTotalPrice() {
    let total = 0;

    // Step 1 price (Lio - same for both)
    if (this.selectedProducts.step1) {
      total += this.selectedProducts.step1.price;
    }

    // Step 2 subscription prices (Flavors with quantities) - apply discount
    Object.values(this.selectedProducts.step2).forEach(item => {
      const subscriptionPrice = item.subscriptionPrice || item.price || 0;
      const discountedPrice = this.applyDiscount(subscriptionPrice, item.quantity);
      total += discountedPrice;
    });

    // Step 3 prices (Accessories - same for both)
    Object.values(this.selectedProducts.step3).forEach(item => {
      total += item.price * item.quantity;
    });

    return total;
  }

  applyDiscount(price, quantity) {
    const currentDiscount = this.discountRates[this.currentPackType] || 0;

    if (currentDiscount === 0) {
      return price * quantity;
    }

    // Calculate total price first, then apply discount to the total
    const totalPrice = price * quantity;
    const discountRate = currentDiscount / 100;
    const discountAmount = Math.floor(totalPrice * discountRate);
    const discountedTotal = totalPrice - discountAmount;

    return discountedTotal;
  }

  formatPrice(price) {
    let formattedPrice;
    
    if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
      formattedPrice = Shopify.formatMoney(price);
    } else {
      const formatted = (price / 100).toFixed(2);
      formattedPrice = `${window.jollyVariables.cart_symbol}${formatted}`;
    }
    
    // Remove .00 for whole numbers
    formattedPrice = formattedPrice.replace(/\.00$/, '');
    return formattedPrice;
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

  updateSelectedPackPlan() {
    if (!this.selectedPackPlan) return;

    // Get current pack name
    const selectedPackSelector = this.querySelector('.js-pack-selector input[name="pack"]:checked');
    if (!selectedPackSelector) return;

    const packTitle = selectedPackSelector.closest('.js-pack-selector').querySelector('.js-pack-selector-title');
    const packName = packTitle ? packTitle.textContent.trim() : '';

    // Get current purchase type
    const selectedPurchaseType = document.querySelector('input[name="purchase_type"]:checked');
    let planType = '';
    
    if (selectedPurchaseType) {
      const label = document.querySelector(`label[for="${selectedPurchaseType.id}"]`);
      if (label) {
        // Extract main text without subtitle
        const mainText = label.childNodes[0]?.textContent?.trim() || label.textContent.trim();
        planType = mainText;
      }
    }

    // Combine pack name and plan type
    let displayText = '';
    if (packName && planType) {
      displayText = `${packName}, ${planType}`;
    } else if (packName) {
      displayText = packName;
    } else if (planType) {
      displayText = planType;
    }

    this.selectedPackPlan.textContent = displayText;
  }
}

// Register custom element
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
            window.scrollTo({ top: y, behavior: 'instant' });
          }
        }, DEFAULTS.RETRY_DELAY);
      }
    });
  });
});
