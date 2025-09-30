import Swiper from "swiper";
import { shopifyAPI } from "../api";
import "./g-atc-form";


// Money formatter
function formatMoney(cents, format) {
  if (typeof cents === "string") {
    cents = cents.replace(".", "");
  }
  let value = "";
  const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
  const formatString = format || window.jollyVariables.currency_code_enabled ? window.jollyVariables.money_with_currency_format : window.jollyVariables.money_format;

  function defaultOption(opt, def) {
    return typeof opt == "undefined" ? def : opt;
  }

  function formatWithDelimiters(number, precision, thousands, decimal) {
    precision = defaultOption(precision, 2);
    thousands = defaultOption(thousands, ",");
    decimal = defaultOption(decimal, ".");

    if (isNaN(number) || number == null) {
      return 0;
    }

    number = (number / 100.0).toFixed(precision);

    const parts = number.split("."),
          dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, `$1${thousands}`),
          cents = parts[1] ? decimal + parts[1] : "";

    return dollars + cents;
  };

  switch (formatString.match(placeholderRegex)[1]) {
    case "amount":
      value = formatWithDelimiters(cents, 2);
      break;
    case "amount_no_decimals":
      value = formatWithDelimiters(cents, 0);
      break;
    case "amount_with_comma_separator":
      value = formatWithDelimiters(cents, 2, ".", ",");
      break;
    case "amount_no_decimals_with_comma_separator":
      value = formatWithDelimiters(cents, 0, ".", ",");
      break;
  }

  return formatString.replace(placeholderRegex, value);
}

// Fetch product information
class ProductLoader {
  static loadedProducts = {};

  static load(productHandle) {
    if (!productHandle) {
      return;
    }

    if (this.loadedProducts[productHandle]) {
      return this.loadedProducts[productHandle];
    }

    this.loadedProducts[productHandle] = new Promise(async (resolve) => {
      const response = await fetch(
        `${window.Shopify.routes.root}products/${productHandle}.js`
      );
      const responseAsJson = await response.json();
      resolve(responseAsJson);
    });

    return this.loadedProducts[productHandle];
  }
};

// Number input custom element
class InputNumber extends HTMLInputElement {
  connectedCallback() {
    this.addEventListener("input", this._onValueInput.bind(this));
    this.addEventListener("change", this._onValueChanged.bind(this));
    this.addEventListener("keydown", this._onKeyDown.bind(this));
  }

  get quantity() {
    return parseInt(this.value);
  }

  set quantity(quantity) {
    const isNumeric =
      (typeof quantity === "number" ||
        (typeof quantity === "string" && quantity.trim() !== "")) &&
      !isNaN(quantity);

    if (quantity === "") {
      return;
    }

    if (!isNumeric || quantity < 0) {
      quantity = parseInt(quantity) || 1;
    }

    this.value = Math.max(
      this.min || 1,
      Math.min(quantity, this.max || Number.MAX_VALUE)
    ).toString();
    this.setAttribute('value', this.value);
    this.size = Math.max(this.value.length + 1, 2);

    if (this.form) {
      this.form.dispatchEvent(new CustomEvent("quantity:changed", { bubbles: false, detail: { newQuantity: this.quantity } }));
    }
  }

  _onValueInput() {
    this.quantity = this.value;
  }

  _onValueChanged() {
    if (this.value === "") {
      this.quantity = 1;
    }
  }

  _onKeyDown(event) {
    event.stopPropagation();
    if (event.key === "ArrowUp") {
      this.quantity = this.quantity + 1;
    } else if (event.key === "ArrowDown") {
      this.quantity = this.quantity - 1;
    }
  }
}
customElements.define("input-number", InputNumber, { extends: "input" });

// Custom select custom element
class ComboBox extends HTMLElement {
  constructor() {
    super();
    this._setBoxBusy(true);

    this.insertAdjacentHTML('afterbegin', `
      <div class="combo-box-selected"></div>
      <div class="combo-box-items combo-box-hide"></div>
    `);

    this.selectedDiv = this.querySelector('.combo-box-selected');
    this.itemsDiv = this.querySelector('.combo-box-items');
  }

  connectedCallback() {
    const select = this.querySelector('select');
    this.selectedDiv.textContent = select.options[select.selectedIndex].textContent;

    Array.from(select.options).forEach((option, index) => {
      const div = document.createElement('div');
      div.textContent = option.textContent;
      div.setAttribute('data-index', index);

      div.addEventListener('click', () => {
        select.selectedIndex = index;
        select.value = option.value;
        this.selectedDiv.textContent = option.textContent;
        this.updateSelected(index);
        this.toggleDropdown();
        select.dispatchEvent(new Event("change"));
      });
      this.itemsDiv.appendChild(div);
    });

    this.updateSelected(select.selectedIndex); // Initial setting

    this.selectedDiv.addEventListener('click', () => {
      this.toggleDropdown();
    });

    document.addEventListener('click', e => {
      if (!this.contains(e.target)) {
        this.closeAllSelect();
      }
    });

    this._setBoxBusy(false);
  }

  // update selected option styles
  updateSelected(index) {
    const selectedDiv = this.itemsDiv.querySelector(`[data-index="${index}"]`);

    this.itemsDiv.querySelectorAll('.same-as-selected').forEach(el => {
      el.classList.remove('same-as-selected');
    });

    if (selectedDiv) {
      selectedDiv.classList.add('same-as-selected');
    }
  }

  toggleDropdown() {
    this.itemsDiv.classList.toggle('combo-box-hide');
    this.selectedDiv.classList.toggle('active');
  }

  _setBoxBusy(busy = false) {
    this.setAttribute("aria-busy", busy.toString());
  }

  closeAllSelect() {
    this.itemsDiv.classList.add('combo-box-hide');
    this.selectedDiv.classList.remove('active');
  }
}
customElements.define('combo-box', ComboBox);

class MasterProduct extends HTMLElement {
  constructor() {
    super();
  }

  async init() {
    this.form = document.getElementById(this.getAttribute("data-form-id"));
    this.masterSelector = this.form?.id;
    this.product = await ProductLoader.load(this.productHandle);
  }

  get selectedVariant() {
    return this.getVariantById(parseInt(this.masterSelector.value));
  }

  get productHandle() {
    return this.form?.handle?.value;
  }

  getVariantById(id) {
    return this.product["variants"].find((variant) => variant["id"] === id);
  }
}

// Price block custom element
class PriceBlock extends MasterProduct {
  constructor() {
    super();
  }

  async connectedCallback() {
    await super.init();
    this.subscriptionBlock = document.querySelector(`subscription-block[data-form-id="${this.dataset.formId}"]`);
    this.price = this.querySelector('[data-price]');
    this.compareAtPrice = this.querySelector('[data-compare-at-price]');
    this.discount = this.querySelector("[data-discount]");


    if (this.form) {
      this.form.addEventListener("variant:changed", this._onVariantChanged.bind(this));
      this.form.addEventListener("selling-plan:changed", this._updatePrice.bind(this));
      if (this.quantityUpdate) {
        this.form.addEventListener("quantity:changed", this._onQuantityChanged.bind(this));
      }
    }
  }

  _updatePrice() {
    let price, compareAtPrice;
    if (this.subscriptionBlock) {
      switch (this.subscriptionBlock.selectedOfferType) {
        case "one-time":
          price = parseInt(this.selectedVariant.price);
          compareAtPrice = parseInt(this.selectedVariant.compare_at_price);
          break;
        case "subscription":
          if (!this.subscriptionBlock.selectedSellingPlan) {
            return;
          }
          price = parseInt(this.subscriptionBlock.selectedSellingPlan.price);
          compareAtPrice = parseInt(this.subscriptionBlock.selectedSellingPlan.compare_at_price);
          break;
      }
    } else {
      price = parseInt(this.selectedVariant.price);
      compareAtPrice = parseInt(this.selectedVariant.compare_at_price);
    }

    this.price.innerText = formatMoney(price * (this.quantityUpdate ? Number.parseInt(this.form.quantity.value) : 1));

    if (compareAtPrice > price) {
      this.classList.add('jc-compare-at-price');
      this.compareAtPrice.innerText = formatMoney(compareAtPrice * (this.quantityUpdate ? Number.parseInt(this.form.quantity.value) : 1));

      if (this.discount) {
        this.discount.innerText = Math.floor(100 - (price / compareAtPrice) * 100);
      }
    } else {
      this.classList.remove('jc-compare-at-price');
    }
  }

  get quantityUpdate() {
    return this.dataset.quantityUpdate == "true";
  }

  _onVariantChanged(event) {
    this._updatePrice();
  }

  _onQuantityChanged(event) {
    this._updatePrice();
  }
}
customElements.define('price-block', PriceBlock);

// Product cart/add custom element 
class ProductForm extends HTMLFormElement {
  // Runs when the element is added to the DOM
  connectedCallback() {
    // Array of submit buttons
    this.submitButtons = Array.from(this.elements).filter(
      (button) => button.type === "submit"
    );

    // Bind the form submission event to the onSubmit method
    this.addEventListener("submit", this._onSubmit.bind(this));

    // Bind click events to buttons inside the form
    this.submitButtons.forEach((button) => {
      button.addEventListener("click", this._onButtonClick.bind(this));
    });

    this.addEventListener("variant:changed", this._onVariantChanged.bind(this));
  }

  // Handle form submission
  async _onSubmit(event) {
    event.preventDefault();

    // Check if button is buy-now type
    const quickBuyTriggered = this.clickedButton && this.clickedButton.getAttribute("data-buy-type") === "buy-now";

    // Disable submit buttons and indicate loading state
    this._setButtonBusy(this.submitButtons, true, true);

    // Check form validity and report any errors
    if (!this.checkValidity()) {
      this.reportValidity();
      return; // Stop if the form is invalid
    }

    // Extract data from the form
    const productForm = new FormData(this);
    productForm.delete("option1");
    productForm.delete("option2");
    productForm.delete("option3");

    const {
      id: variantID,
      quantity,
      selling_plan: sellingPlan,
    } = this._extractFormData(productForm, ["id", "quantity", "selling_plan"]);

    // Ensure there is a variant ID before proceeding
    if (!variantID) return;

    const cartResponse = await shopifyAPI.cart.addItem(variantID, quantity, sellingPlan);

    // Add item to cart
    if (cartResponse) {
      // Notify that variant was added
      this.dispatchEvent(
        new CustomEvent("variant:added", { detail: cartResponse, bubbles: true, composed: true, })
      );

      if (quickBuyTriggered) this._redirectToCheckout();
    } else {
      // Re-enable submit buttons and remove loading state
      this._setButtonBusy(this.submitButtons, false);
      return;
    }

    // TODO: Update and open the cart

    // Re-enable submit buttons and remove loading state
    this._setButtonBusy(this.submitButtons, false);
  }

  _onVariantChanged(event) {
    this._updateAddToCartButtons(event.detail.variant);
  }

  _updateAddToCartButtons(variant) {
    if (this.submitButtons.length < 1) {
      return;
    }

    this.submitButtons.forEach((button) => {
      let addToCartButtonText = "";
      let isDisabled = true;

      if (variant) {
        if (variant["available"]) {
          addToCartButtonText = button.getAttribute("data-button-text") || 'Add to cart';
          isDisabled = false;
        } else {
          addToCartButtonText = button.getAttribute("data-sold-out-text") || 'Sold out';
        }
      } else {
        addToCartButtonText = button.getAttribute("data-sold-out-text") || 'Sold out';
      }

      if (isDisabled) {
        button.setAttribute("disabled", "disabled");
      } else {
        button.removeAttribute("disabled");
      }
      button.querySelector(".js-button-text").innerText = addToCartButtonText;
    });
  }

  // Handle submit button click
  _onButtonClick(event) {
    this.clickedButton = event.currentTarget;
  }

  // Redirects to checkout page
  _redirectToCheckout() {
    window.location.href = "/checkout";
  }

  // Extracts specific fields from FormData and returns them as an object
  _extractFormData(formData, fields) {
    const data = {};
    for (const [key, value] of formData.entries()) {
      if (fields.includes(key)) {
        data[key] = value;
      }
    }
    return data;
  }

  // Button loading and disabled state
  _setButtonBusy(buttons, disabled, busy = false) {
    buttons.forEach((button) => {
      button.disabled = disabled;
      button.setAttribute("aria-busy", busy.toString());
    });
  }
}
customElements.define("product-form", ProductForm, { extends: "form" });

// Product variants custom element
class ProductVariants extends MasterProduct {
  constructor() {
    super();

    this._elementsToUpdate = [
      ".variant-swatch label"
    ];
  }

  async connectedCallback() {
    await super.init();
    
    this.optionSelectors = Array.from(this.querySelectorAll("[data-selector-type]"));

    if (!this.masterSelector) {
      console.warn(`The variant selector for product with handle ${this.productHandle} is not linked to any product form.`);
      return;
    }

    document.querySelectorAll('[name^="option"]').forEach((input) => {
      input.addEventListener("change", (event) => {
        this._onOptionChanged.bind(this);
        this._updateOptionLegend(event.target);
      });
      input.addEventListener("change", (event) => this._onOptionChanged(event));
    });

    this.form.addEventListener("selling-plan:changed", this._onSellingPlanChanged.bind(this));

    this.masterSelector.addEventListener("change", this._onMasterSelectorChanged.bind(this));
    this._updateDisableSelectors();
    this._selectVariant(this.selectedVariant["id"]);
  }

  _onSellingPlanChanged(event) {
    const variant = this._getVariantFromOptions();
    const variantId = variant ? variant.id : undefined;
    const sectionId = this.dataset.sectionId;
    this.sellingPlan = event.detail.newSellingPlan;
    const fetchData = this._areElementsPresent();
    if (fetchData) {
      this._fetchData(this.productHandle, variantId, sectionId, this.sellingPlan?.selling_plan_id);
    }
  }

  _onOptionChanged(event) {
    const variant = this._getVariantFromOptions();
    const variantId = variant ? variant.id : undefined;
    const sectionId = this.dataset.sectionId;
    const fetchData = this._areElementsPresent();

    this._updateOptionLegend(event.target);
    this._selectVariant(variantId);
    if (fetchData) {
      this._fetchData(super.productHandle, variantId, sectionId, this.sellingPlan?.selling_plan_id);
    }
  }

  _updateOptionLegend(target) {
    const boundElement = document.getElementById(target.getAttribute("data-bind-value"));
    if (!boundElement) return;

    if (target.tagName === "SELECT") {
      target = target.options[target.selectedIndex];
    }

    boundElement.innerHTML = target.value;
  }

  // selected variant id input changed callback
  _onMasterSelectorChanged() {
    var _a;
    const options = ((_a = this.selectedVariant) == null ? undefined : _a.options) || [];

    options.forEach((value, index) => {
      let input = this.querySelector(`input[name="option${index + 1}"][value="${CSS.escape(value)}"], select[name="option${index + 1}"]`);
      let triggerChangeEvent = false;

      if (input.tagName === "SELECT") {
        triggerChangeEvent = input.value !== value;
        input.value = value;
      } else if (input.tagName === "INPUT") {
        triggerChangeEvent = !input.checked && input.value === value;
        input.checked = input.value === value;
      }

      if (triggerChangeEvent) {
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  }

  get hideSoldOutVariants() {
    return this.hasAttribute("hide-sold-out-variants");
  }

  get updateUrl() {
    return this.hasAttribute("update-url");
  }

  _selectVariant(id) {
    var _a;
    if (!this._isVariantSelectable(super.getVariantById(id))) {
      id = this._getFirstMatchingAvailableOrSelectableVariant()["id"];
    }

    if (((_a = this.selectedVariant) == null ? undefined : _a.id) === id) {
      return;
    }

    this.masterSelector.value = id;
    this.masterSelector.dispatchEvent(new Event("change", { bubbles: true }));

    if (this.updateUrl && history.replaceState) {
      const newUrl = new URL(window.location.href);
      if (id) {
        newUrl.searchParams.set("variant", id);
      } else {
        newUrl.searchParams.delete("variant");
      }

      window.history.replaceState({ path: newUrl.toString() }, "", newUrl.toString());
    }

    this._updateDisableSelectors();
    this.masterSelector.form.dispatchEvent(
      new CustomEvent("variant:changed", {
        bubbles: true,
        detail: { variant: this.selectedVariant },
      })
    );
  }

  _getVariantFromOptions() {
    const options = this._getSelectedOptionValues();
    return this.product["variants"].find((variant) => {
      return variant["options"].every(
        (value, index) => value === options[index]
      );
    });
  }

  _isVariantSelectable(variant) {
    if (!variant) {
      return false;
    } else {
      return (
        variant["available"] ||
        (!this.hideSoldOutVariants && !variant["available"])
      );
    }
  }

  _getFirstMatchingAvailableOrSelectableVariant() {
    let options = this._getSelectedOptionValues(),
      matchedVariant = null,
      slicedCount = 0;
    do {
      options.pop();
      slicedCount += 1;
      matchedVariant = this.product["variants"].find((variant) => {
        if (this.hideSoldOutVariants) {
          return (
            variant["available"] &&
            variant["options"]
              .slice(0, variant["options"].length - slicedCount)
              .every((value, index) => value === options[index])
          );
        } else {
          return variant["options"]
            .slice(0, variant["options"].length - slicedCount)
            .every((value, index) => value === options[index]);
        }
      });
    } while (!matchedVariant && options.length > 0);
    return matchedVariant;
  }

  _getSelectedOptionValues() {
    const options = [];
    Array.from(this.querySelectorAll('input[name^="option"]:checked, select[name^="option"]')).forEach((option) => options.push(option.value));
    return options;
  }

  _updateDisableSelectors() {
    const selectedVariant = this.selectedVariant;
    if (!selectedVariant) {
      return;
    }

    const applyClassToSelector = (selector, valueIndex, available, hasAtLeastOneCombination) => {
      let selectorType = selector.getAttribute("data-selector-type")
      let cssSelector = "";

      switch (selectorType) {
        case "color":
          cssSelector = `.color-swatch:nth-child(${valueIndex + 1})`;
          break;
        case "variant_swatch":
          cssSelector = `.variant-swatch:nth-child(${valueIndex + 1})`;
          break;
        case "checkbox":
          cssSelector = `.checkbox-swatch:nth-child(${valueIndex + 1})`;
          break;
        case "select":
          cssSelector = `.select__option-item:nth-child(${valueIndex + 1})`;
          break;
      }

      selector.querySelector(cssSelector).toggleAttribute("hidden", !hasAtLeastOneCombination);

      if (this.hideSoldOutVariants) {
        selector.querySelector(cssSelector).toggleAttribute("hidden", !available);
      } else {
        selector.querySelector(cssSelector).classList.toggle("is-disabled", !available);
      }
    };

    if (this.optionSelectors && this.optionSelectors[0]) {
      this.product["options"][0]["values"].forEach((value, valueIndex) => {
        const hasAtLeastOneCombination = this.product["variants"].some((variant) => variant["option1"] === value && variant);
        const hasAvailableVariant = this.product["variants"].some((variant) => variant["option1"] === value && variant["available"]);

        applyClassToSelector(this.optionSelectors[0], valueIndex, hasAvailableVariant, hasAtLeastOneCombination);

        if (this.optionSelectors[1]) {
          this.product["options"][1]["values"].forEach(
            (value2, valueIndex2) => {
              const hasAtLeastOneCombination2 = this.product["variants"].some(
                (variant) => variant["option2"] === value2 && variant["option1"] === selectedVariant["option1"] && variant
              );
              const hasAvailableVariant2 = this.product["variants"].some(
                (variant) => variant["option2"] === value2 && variant["option1"] === selectedVariant["option1"] && variant["available"]
              );

              applyClassToSelector(this.optionSelectors[1], valueIndex2, hasAvailableVariant2, hasAtLeastOneCombination2);

              if (this.optionSelectors[2]) {
                this.product["options"][2]["values"].forEach(
                  (value3, valueIndex3) => {
                    const hasAtLeastOneCombination3 = this.product["variants"].some(
                      (variant) => variant["option3"] === value3 && variant["option1"] === selectedVariant["option1"] && variant["option2"] === selectedVariant["option2"] && variant
                    );
                    const hasAvailableVariant3 = this.product["variants"].some(
                      (variant) => variant["option3"] === value3 && variant["option1"] === selectedVariant["option1"] && variant["option2"] === selectedVariant["option2"] && variant["available"]
                    );

                    applyClassToSelector(this.optionSelectors[2], valueIndex3, hasAvailableVariant3, hasAtLeastOneCombination3);
                  }
                );
              }
            }
          );
        }
      });
    }
  }

  _areElementsPresent() {
    let result = false;

    this._elementsToUpdate.forEach(el => {
      if (document.querySelector(el)) {
        result = true;
      }
    });

    return result;
  }

  async _fetchData(productHandle, currentVariantId, sectionId, sellingPlanId) {
    try {
      if (!sellingPlanId) {
        sellingPlanId = "one-time";
      }
      let url = `${window.Shopify.routes.root}products/${productHandle}?variant=${currentVariantId}&section_id=${sectionId}&selling_plan=${sellingPlanId}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch product: ${response.statusText}`);
      }

      const data = await response.text();
      const parser = new DOMParser();
      const parsedData = parser.parseFromString(data, "text/html");

      this._elementsToUpdate.forEach(selector => this._updateData(selector, parsedData));
      this._updateQuantityRules(parsedData);
    } catch (error) {
      console.error(`An error occurred: ${error}`);
    }
  }

  _updateData(selector, parsedData) {
    const oldElements = document.querySelectorAll(selector);
    const newElements = parsedData.querySelectorAll(selector);

    oldElements.forEach((oldEl, index) => {
      if (index < newElements.length) {
        oldEl.innerHTML = newElements[index].innerHTML;
      }
    });
  }

  _updateQuantityRules(parsedData) {
    const quantitySelector = document.querySelector('quantity-selector');
    const updatedQuantityInput = parsedData.querySelector('quantity-selector input');

    if (!quantitySelector || !updatedQuantityInput) {
      return;
    }

    quantitySelector.max = +updatedQuantityInput.getAttribute('max');
  }
};
customElements.define("product-variants", ProductVariants);

// Quantity input custom element
class QuantitySelector extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.inputElement = this.querySelector("input");
    this.decrementButton = this.querySelector("button[name='minus']");
    this.incrementButton = this.querySelector("button[name='plus']");
    this._checkQuantity();

    this.decrementButton.addEventListener("click", () => {
      this.inputElement.quantity = this.inputElement.quantity - 1;
      this._checkQuantity();
    });

    this.incrementButton.addEventListener("click", () => {
      this.inputElement.quantity = this.inputElement.quantity + 1;
      this._checkQuantity();
    });
  }

  _checkQuantity() {
    if (this.inputElement.value == this.inputElement.max) {
      this.incrementButton.classList.add("is-disabled");
    } else {
      this.incrementButton.classList.remove("is-disabled");
    }

    if (this.inputElement.value == this.inputElement.min) {
      this.decrementButton.classList.add("is-disabled");
    } else {
      this.decrementButton.classList.remove("is-disabled");
    }
  }

  get quantity() {
    return this.inputElement.quantity;
  }

  set quantity(value) {
    this.inputElement.quantity = value;
    this._checkQuantity();
  }

  get min() {
    return this.inputElement.min;
  }

  set min(value) {
    this.inputElement.min = value;

    if (this.quantity < value) {
      this.quantity = value;
    } else {
      this._checkQuantity();
    }
  }

  get max() {
    return this.inputElement.max;
  }

  set max(value) {
    this.inputElement.max = value;

    if (this.quantity > value) {
      this.quantity = value;
    } else {
      this._checkQuantity();
    }
  }
}
customElements.define("quantity-selector", QuantitySelector);

// Subscription block custom element
class SubscriptionBlock extends MasterProduct {
  constructor() {
    super();
  }

  connectedCallback() {
    super.init();
    this.swatches = this.querySelectorAll('[data-selling-plan-swatch]');

    // subscription price
    this.subscriptionOffer = this.querySelector('[data-subscription-offer]');
    this.subscriptionPrice = this.subscriptionOffer.querySelector('[data-price]');
    this.subscriptionCompareAtPrice = this.subscriptionOffer.querySelector('[data-compare-at-price]');
    this.subscriptionDiscount = this.querySelector('[data-subscription-offer] [data-discount]');

    // one-time price
    this.oneTimeOffer = this.querySelector('[data-one-time-offer]');
    this.oneTimePrice = this.oneTimeOffer.querySelector('[data-price]');
    this.oneTimeCompareAtPrice = this.oneTimeOffer.querySelector('[data-compare-at-price]');

    this.selectedOfferType = this.querySelector("[name='subscription']:checked").dataset.offerType;

    this.querySelectorAll("[name='subscription']").forEach(input => input.addEventListener('change', this._onOfferChanged.bind(this)));
    this.querySelectorAll("[name='selling_plan']").forEach(input => input.addEventListener('change', this._onSellingPlanChanged.bind(this)));

    if (this.form) {
      this.form.addEventListener('variant:changed', this._onVariantChanged.bind(this));
    }
  }

  _onOfferChanged(event) {
    this.selectedOfferType = event.currentTarget.dataset.offerType;

    let newSellingPlan = null;
    switch (this.selectedOfferType) {
      case "one-time":
        this.form.selling_plan.forEach(input => input.disabled = true);
        this._updateUrl();
        break;
      case "subscription":
        this.form.selling_plan.forEach(input => input.disabled = false);
        this._updateUrl(this.selectedSellingPlan.selling_plan_id);
        newSellingPlan = this.selectedSellingPlan;
        break;
    }

    this.form.dispatchEvent(new CustomEvent("selling-plan:changed", { bubbles: false, detail: { newSellingPlan: newSellingPlan } }));
  }

  _onSellingPlanChanged(event) {
    this._updateUrl(this.selectedSellingPlan.selling_plan_id);
    this._updateSubscriptionPrice();
    this.form.dispatchEvent(new CustomEvent("selling-plan:changed", { bubbles: false, detail: { newSellingPlan: this.selectedSellingPlan } }));
  }

  _onVariantChanged(event) {
    // update selling plan swatches according to new variant
    this.swatches.forEach((swatch, index) => {
      if (this.form.selling_plan[index].value == this.selectedVariant.selling_plan_allocations?.[index]?.selling_plan_id) {
        swatch.classList.remove('jc-hidden');
        this.form.selling_plan[index].disabled = false;
      } else {
        swatch.classList.add('jc-hidden');
        this.form.selling_plan[index].checked = false;
        this.form.selling_plan[index].disabled = true;
      }
    }
    );

    // select first selling plan if new variant doesn't have the selected one
    if (!this.querySelector("[name='selling_plan']:checked")) {
      const firstAvailablePlanInput = this.querySelector("[name='selling_plan']:not(:disabled)");
      if (firstAvailablePlanInput) {
        firstAvailablePlanInput.checked = true;
        this._updateUrl(firstAvailablePlanInput.value);
      }
    }

    // update prices
    this._updateSubscriptionPrice();
    this._updateOneTimePrice();

    let newSellingPlan = this.selectedOfferType == "one-time" ? null : this.selectedSellingPlan
    this.form.dispatchEvent(new CustomEvent("selling-plan:changed", { bubbles: false, detail: { newSellingPlan: newSellingPlan } }));
  }

  _updateUrl(sellingPlanId) {
    if (this.updateUrl && history.replaceState) {
      const newUrl = new URL(window.location.href);
      if (sellingPlanId) {
        newUrl.searchParams.set("selling_plan", sellingPlanId);
      } else {
        newUrl.searchParams.set("selling_plan", "one-time");
      }

      window.history.replaceState({ path: newUrl.toString() }, "", newUrl.toString());
    }
  }

  _updateSubscriptionPrice() {
    const price = this.selectedSellingPlan.price;
    const compareAtPrice = this.selectedSellingPlan.compare_at_price;

    this.subscriptionPrice.innerHTML = formatMoney(price)
    if (compareAtPrice > price) {
      this.subscriptionCompareAtPrice.innerHTML = formatMoney(compareAtPrice);
      this.subscriptionOffer.classList.add('jc-compare-at-price');
      if (this.subscriptionDiscount) {
        this.subscriptionDiscount.innerHTML = Math.floor(100 - (price / compareAtPrice) * 100) + "%";
      }
    } else {
      this.subscriptionOffer.classList.remove('jc-compare-at-price');
    }
  }

  _updateOneTimePrice() {
    const price = this.selectedVariant.price;
    const compareAtPrice = this.selectedVariant.compare_at_price;

    this.oneTimePrice.innerHTML = formatMoney(price)
    if (compareAtPrice > price) {
      this.oneTimeOffer.classList.add('jc-compare-at-price');
      this.oneTimeCompareAtPrice.innerHTML = formatMoney(compareAtPrice);
    } else {
      this.oneTimeOffer.classList.remove('jc-compare-at-price');
    }
  }

  get selectedSellingPlan() {
    return this._getSellingPlanById(this.form.selling_plan.value);
  }

  _getSellingPlanById(id) {
    return this.selectedVariant.selling_plan_allocations.find(plan => plan.selling_plan_id == id);
  }

  get updateUrl() {
    return this.hasAttribute("update-url");
  }
}
customElements.define('subscription-block', SubscriptionBlock);

// Sticky ATC custom element
class ProductStickyAtc extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.form = document.getElementById(this.getAttribute('data-form-id'));

    if (this.form) {
      this.form.addEventListener("variant:changed", this._onVariantChanged.bind(this));
    }

    this._setupVisibilityObserver();
    this._addPaddingToBodyTag();
  }

  _onVariantChanged(event) {
    const variant = event.detail.variant;

    // Update current variant title
    this.checkedOptions = this.querySelector('[data-sticky-checked-options]');
    this.checkedOptions.innerText = variant.title;

    // Update current variant featured media
    this._updateMedia(variant);
  }

  _updateMedia(variant) {
    const variantMediaId = variant?.featured_media?.id;
    if (!variantMediaId) {
      return;
    }

    const stickyMedia = this.querySelectorAll('[data-sticky-media-id]');
    const stickyMediaActive = this.querySelector(`[data-sticky-media-id^="${variantMediaId}"]`);
    if (!stickyMediaActive) {
      return;
    }

    stickyMedia.forEach((media) => {
      media.classList.remove('active');
    });
    stickyMediaActive.classList.add('active');
  }

  set toggleBarVisibility(isVisible) {
    this.classList.toggle("active", !isVisible);
  }

  _setupVisibilityObserver() {
    const productFormElement = this.form;
    if (!productFormElement) {
      return;
    }
    const options = { rootMargin: "0px" };

    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === productFormElement) {
          const boundingRect = productFormElement.getBoundingClientRect();
          this._isPaymentContainerPassed = entry.intersectionRatio === 0 && boundingRect.top + boundingRect.height <= 0;
        }
      });

      this.toggleBarVisibility = !this._isPaymentContainerPassed;
    });

    this.intersectionObserver.observe(productFormElement, options);
  }

  _addPaddingToBodyTag() {
    const stickyAtcHeight = this.offsetHeight;
    if (stickyAtcHeight > 0) {
      document.body.style.paddingBottom = `${stickyAtcHeight}px`;
    }
  }
}
customElements.define('product-sticky-atc', ProductStickyAtc);

// Product gallery custom element
class ProductGallery extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.swiper = this.querySelector('#productMainSwiper').swiper;
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

// Modal window custom element
class dialogBox extends HTMLDialogElement {
  constructor() {
    super();
    this.addEventListener('click', this._handleOutsideClosing.bind(this));
  }

  connectedCallback() {
    this._handleInsideClosing();
  }

  _handleInsideClosing() {
    this.querySelectorAll('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => this.close());
    });
  }

  _handleOutsideClosing(event) {
    const rect = this.getBoundingClientRect();
    const isInDialog = (rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
      rect.left <= event.clientX && event.clientX <= rect.left + rect.width);

    if (!isInDialog) {
      this.close();
    }
  }
}
customElements.define('dialog-box', dialogBox, { extends: 'dialog' });

// Modal window trigger custom element
class dialogBoxTrigger extends HTMLButtonElement {
  constructor() {
    super();
    this.handleClick = this._openDialog.bind(this);
  }

  connectedCallback() {
    if (!this.dataset.openDialog) {
      console.warn('dialogBoxTrigger: No dialog ID provided.');
      return;
    }

    this.dialogId = this.dataset.openDialog;
    this.dialog = document.getElementById(this.dialogId);

    if (!this.dialog) {
      console.error(`dialogBoxTrigger: No dialog found with ID "${this.dialogId}".`);
      return;
    }

    this.addEventListener('click', this.handleClick);
  }

  _openDialog() {
    this.dialog.showModal();
  }
}
customElements.define('dialog-box-trigger', dialogBoxTrigger, { extends: 'button' });

class LightBox extends HTMLElement {
  constructor() {
    super();

    // Constants
    this.CONSTANTS = {
      SELECTORS: {
        SWIPER_CONTAINER: ".swiper",
        OPEN_TRIGGERS: "[data-lightbox-open]",
        CLOSE_TRIGGERS: "[data-lightbox-close]",
        MEDIA_ELEMENTS: "[data-swiper-media-id]"
      },
      DATA_ATTRIBUTES: {
        ZOOM_ACTIVE: "data-zoom-active",
        OPEN: "data-lightbox-open"
      },
      DEFAULT_ZOOM: {
        X: "50%",
        Y: "50%"
      },
      TOUCH: {
        MAX_ZOOM: 100,
        MIN_ZOOM: 0
      },
      TRANSITION_DURATION: 500
    };

    // Private properties
    this._touchState = null;
    this._lastMousePosition = null;
    this._isAnimating = false;

    // Bind methods to preserve context
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.mobileTouchStart = this.mobileTouchStart.bind(this);
    this.mobileTouchMove = this.mobileTouchMove.bind(this);
    this.mobileTouchEnd = this.mobileTouchEnd.bind(this);
    this.openLightBox = this.openLightBox.bind(this);
    this.closeLightBox = this.closeLightBox.bind(this);
    this.toggleZoom = this.toggleZoom.bind(this);
  }

  connectedCallback() {
    this._initializeElements();
    this._initializeSwiper();
    this._attachEventListeners();
    this._setupKeyboardNavigation();
  }

  _initializeElements() {
    try {
      this.openTriggers = document.querySelectorAll(this.CONSTANTS.SELECTORS.OPEN_TRIGGERS);
      this.closeTriggers = this.querySelectorAll(this.CONSTANTS.SELECTORS.CLOSE_TRIGGERS);
      this.mediaElements = this.querySelectorAll(this.CONSTANTS.SELECTORS.MEDIA_ELEMENTS);

      if (!this.openTriggers.length || !this.closeTriggers.length || !this.mediaElements.length) {
        throw new Error('Required elements not found');
      }
    } catch (error) {
      console.error('Failed to initialize LightBox elements:', error);
    }
  }

  _initializeSwiper() {
    const swiperContainer = this.querySelector(this.CONSTANTS.SELECTORS.SWIPER_CONTAINER);
    if (!swiperContainer) {
      console.warn('Swiper container not found');
      return;
    }

    this.swiper = new Swiper(swiperContainer, {
      slidesPerView: 1,
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
        enabled: true,
        hideOnClick: false
      },
      on: {
        beforeTransitionStart: this._handleSwiperTransition.bind(this)
      }
    });
  }

  _attachEventListeners() {
    this.openTriggers.forEach(trigger => 
      trigger.addEventListener("click", this.openLightBox)
    );
    
    this.closeTriggers.forEach(trigger => 
      trigger.addEventListener("click", this.closeLightBox)
    );
    
    this.mediaElements.forEach(element => 
      element.addEventListener("click", this.toggleZoom)
    );
  }

  _handleSwiperTransition(swiper) {
    const mediaElement = swiper.slides[swiper.activeIndex]?.querySelector(this.CONSTANTS.SELECTORS.MEDIA_ELEMENTS);
    if (!mediaElement) {
      console.warn("No media element found in swiper slide");
      return;
    }

    this._resetZoomState(mediaElement);
  }

  _resetZoomState(element) {
    element.removeAttribute(this.CONSTANTS.DATA_ATTRIBUTES.ZOOM_ACTIVE);
    element.style.setProperty("--zoom-x", this.CONSTANTS.DEFAULT_ZOOM.X);
    element.style.setProperty("--zoom-y", this.CONSTANTS.DEFAULT_ZOOM.Y);
    this._detachZoomListeners(element);
  }

  toggleZoom(e) {
    const target = e.currentTarget;
    if (!target.hasAttribute(this.CONSTANTS.DATA_ATTRIBUTES.ZOOM_ACTIVE)) {
      this._activateZoom(e, target);
    } else {
      this._deactivateZoom(target);
    }
  }

  _activateZoom(e, target) {
    const rect = target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    this._setZoomPosition(target, x, y);
    target.setAttribute(this.CONSTANTS.DATA_ATTRIBUTES.ZOOM_ACTIVE, "");
    this._attachZoomListeners(target);
  }

  _deactivateZoom(target) {
    target.removeAttribute(this.CONSTANTS.DATA_ATTRIBUTES.ZOOM_ACTIVE);
    this._detachZoomListeners(target);
    this._setZoomPosition(target, 50, 50);
  }

  _setZoomPosition(target, x, y) {
    target.style.setProperty("--zoom-x", `${x}%`);
    target.style.setProperty("--zoom-y", `${y}%`);
  }

  handleMouseMove(e) {
    const target = e.currentTarget;
    if (!target || !target.hasAttribute(this.CONSTANTS.DATA_ATTRIBUTES.ZOOM_ACTIVE)) return;

    const rect = target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    this._setZoomPosition(target, x, y);
  }

  mobileTouchStart(e) {
    const target = e.currentTarget;
    if (!target.hasAttribute(this.CONSTANTS.DATA_ATTRIBUTES.ZOOM_ACTIVE) || e.touches.length !== 1) return;

    this.swiper.allowTouchMove = false;
    const rect = target.getBoundingClientRect();
    const currentZoomX = parseFloat(getComputedStyle(target).getPropertyValue("--zoom-x"));
    
    this._touchState = {
      startX: e.touches[0].clientX,
      currentZoomX: currentZoomX,
      targetWidth: rect.width
    };
  }

  mobileTouchMove(e) {
    if (!e.currentTarget.hasAttribute(this.CONSTANTS.DATA_ATTRIBUTES.ZOOM_ACTIVE) || e.touches.length !== 1) return;
    e.preventDefault();

    const target = e.currentTarget;
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - this._touchState.startX;
    
    const moveXPct = (deltaX / this._touchState.targetWidth) * 100;
    const newZoomX = Math.min(
      this.CONSTANTS.TOUCH.MAX_ZOOM,
      Math.max(
        this.CONSTANTS.TOUCH.MIN_ZOOM,
        this._touchState.currentZoomX - moveXPct
      )
    );

    this._setZoomPosition(target, newZoomX, 50);
  }

  mobileTouchEnd(e) {
    this.swiper.allowTouchMove = true;
    this._touchState = null;
  }

  openLightBox(e) {
    const slideToIndex = e.currentTarget.dataset.swiperSlideIndex;
    if (!this.swiper) {
      console.warn("Swiper is undefined in Lightbox");
      return;
    }

    document.body.setAttribute(this.CONSTANTS.DATA_ATTRIBUTES.OPEN, "");
    this.dataset.open = "true";
    this.swiper.slideTo(slideToIndex, this.CONSTANTS.TRANSITION_DURATION, true);
  }

  closeLightBox() {
    document.body.removeAttribute(this.CONSTANTS.DATA_ATTRIBUTES.OPEN);
    this.dataset.open = "false";
  }

  _attachZoomListeners(el) {
    el.addEventListener("mousemove", this.handleMouseMove);
    el.addEventListener("touchstart", this.mobileTouchStart, { passive: false });
    el.addEventListener("touchmove", this.mobileTouchMove, { passive: false });
    el.addEventListener("touchend", this.mobileTouchEnd);
  }

  _detachZoomListeners(el) {
    el.removeEventListener("mousemove", this.handleMouseMove);
    el.removeEventListener("touchstart", this.mobileTouchStart);
    el.removeEventListener("touchmove", this.mobileTouchMove);
    el.removeEventListener("touchend", this.mobileTouchEnd);
  }

  _setupKeyboardNavigation() {
    document.addEventListener('keydown', this._handleKeyDown.bind(this));
  }

  _handleKeyDown(e) {
    if (!this.dataset.open === 'true') return;

    switch (e.key) {
      case 'Escape':
        this.closeLightBox();
        break;
      case 'ArrowLeft':
        this.swiper?.slidePrev();
        break;
      case 'ArrowRight':
        this.swiper?.slideNext();
        break;
    }
  }

  _cleanup() {
    // Clean up event listeners
    this.openTriggers?.forEach(trigger => 
      trigger.removeEventListener("click", this.openLightBox)
    );
    
    this.closeTriggers?.forEach(trigger => 
      trigger.removeEventListener("click", this.closeLightBox)
    );
    
    this.mediaElements?.forEach(element => 
      element.removeEventListener("click", this.toggleZoom)
    );

    // Remove keyboard event listener
    document.removeEventListener('keydown', this._handleKeyDown);

    // Destroy swiper instance
    this.swiper?.destroy(true, true);
  }

  disconnectedCallback() {
    this._cleanup();
  }
}

customElements.define("light-box", LightBox);



