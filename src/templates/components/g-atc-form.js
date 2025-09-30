import { shopifyAPI } from '../api';

// cart/add form custom element
class AddToCartForm extends HTMLFormElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.submitButtons = Array.from(this.elements).filter(
      (button) => button.type === "submit"
    );
    this.addEventListener("submit", this._onSubmit.bind(this));
  }

  async _onSubmit(event) {
    event.preventDefault();
    const formData = new FormData(this);

    let data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    const { id, quantity = 1 } = data;

    if (!id) return;

    this._setButtonBusy(true);
    try {
      const cartResponse = await shopifyAPI.cart.addItem(id, quantity);
    } catch (error) {
      console.error('Error adding item to cart:', error);
    } finally {
      this._setButtonBusy(false);
    }
  }

  // Toggle loading
  _setButtonBusy(state) {
    const stateStr = state ? "true" : "false";
    this.submitButtons.forEach(button => button.setAttribute('aria-busy', stateStr));
  }
}

window.customElements.define("atc-form", AddToCartForm, { extends: "form" });