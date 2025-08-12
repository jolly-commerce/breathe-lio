/**
 * Converts an object into a query string.
 * @param {Object} params - The parameters to convert.
 * @returns {string} - The resulting query string.
 */
function _getQueryString(obj, prefix) {
  const pairs = [];

  for (let key in obj) {
    if (!obj.hasOwnProperty(key)) {
      continue;
    }

    const value = obj[key];
    const enkey = encodeURIComponent(key);
    let pair;

    if (typeof value === "object") {
      if (Array.isArray(value)) {
        pair = value
          .map((item) => {
            return _getQueryString(
              item,
              prefix ? `${prefix}[${enkey}][]` : `${enkey}[]`
            );
          })
          .join("&");
      } else {
        pair = _getQueryString(value, prefix ? `${prefix}[${enkey}]` : enkey);
      }
    } else {
      pair =
        (prefix ? `${prefix}[${enkey}]` : enkey) +
        "=" +
        encodeURIComponent(value);
    }

    pairs.push(pair);
  }

  return pairs.join("&");
}

/**
 * Fetches search suggestions from Shopify's Predictive Search API.
 * @param {Object} params - Parameters for the search query.
 * @param {string} params.q - The search query.
 * @param {('products'|'pages'|'articles'|'collections')} [params.resources] - Types of resources to retrieve. Optional.
 * @param {number} [params.limit] - Limit the number of results for each resource type. Optional.
 * @param {string} [params.options] - Additional options for the search. Optional.
 * @param {string} [params.section_id] - ID of the section containing the search input. Optional.
 * @param {string[]} [renderSelectors] - list of selectors where to render results
 */
async function suggest(params, renderSelectors) {
  let requestResponse;

  return fetch(
    window.Shopify.routes.root + `search/suggest?${_getQueryString(params)}`
  )
    .then((response) => {
      requestResponse = response;
      return response.text();
    })
    .then((text) => {
      if (!requestResponse.ok) {
        throw new Error(`${requestResponse.status}: ${text}`);
      }
      renderSelectors.forEach((renderSelector) => {
        const resultsMarkup = new DOMParser()
          .parseFromString(text, "text/html")
          .querySelector(renderSelector).innerHTML;

        // Ensure this element is defined or passed to the function
        document.querySelector(renderSelector).innerHTML = resultsMarkup;
      });
    })
    .catch((error) => {
      console.error(error);
    });
}

/**
 * Adds a single item to the cart.
 * @param {string} variantId - The ID of the product variant to add.
 * @param {number} quantity - The quantity of the product to add.
 * @param {string|null} [subscriptionPlanId=null] - The subscription plan ID if applicable.
 * @param {Object} [customProperties={}] - Custom properties of the product.
 */
async function addItem(variantId, quantity = 1, subscriptionPlanId = null, customProperties = {}) {
  const lineItem = {
    id: variantId,
    quantity: quantity,
    properties: customProperties,
  };

  if (subscriptionPlanId) {
    lineItem.selling_plan = subscriptionPlanId;
  }

  try {
    const response = await fetch(`${window.Shopify.routes.root}cart/add.js`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items: [lineItem] }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "An error occurred while adding the product to the cart");
    }

    console.log("Product added to cart:", data);
    return data;
  } catch (error) {
    console.error("Error adding product to cart:", error.message);
    return false;
  }
}

/**
 * Adds multiple items to the cart.
 * @param {Array<Object>} items - An array of items to add to the cart.
 * Each item should have the following structure:
 * {
 *   variantId: string,
 *   quantity: number,
 *   subscriptionPlanId?: string,
 *   customProperties?: Object
 * }
 */
async function addItems(items) {
  try {
    const response = await fetch(window.Shopify.routes.root + "cart/add.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items }),
    });

    const data = await response.json();
    if (response.ok) {
      console.log("Products added to cart:", data);
    } else {
      throw new Error(
        data.message ||
          "An error occurred while adding the products to the cart"
      );
    }
  } catch (error) {
    console.error("Error adding products to cart:", error.message);
  }
}

/**
 * Retrieves the contents of the cart.
 * @returns {Promise<Object>} The cart data.
 */
async function getAll() {
  try {
    const response = await fetch(window.Shopify.routes.root + "cart.js", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    if (response.ok) {
      console.log("Cart contents:", data);
      return data;
    } else {
      throw new Error(
        data.message || "An error occurred while retrieving the cart"
      );
    }
  } catch (error) {
    console.error("Error retrieving cart:", error.message);
    throw error;
  }
}

/**
 * Updates the quantity of a single item in the cart.
 * @param {string} variantId - The ID of the product variant to update.
 * @param {number} quantity - The new quantity for the specified variant.
 * @returns {Promise<Object>} The updated cart data.
 */
async function updateItem(variantId, quantity) {
  try {
    const updates = {
      [variantId]: quantity,
    };

    const response = await fetch(
      window.Shopify.routes.root + "cart/update.js",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ updates }),
      }
    );

    const data = await response.json();
    if (response.ok) {
      console.log("Cart updated:", data);
      return data;
    } else {
      throw new Error(
        data.message || "An error occurred while updating the cart"
      );
    }
  } catch (error) {
    console.error("Error updating cart:", error.message);
    throw error;
  }
}

/**
 * Updates the quantities of multiple items in the cart.
 * @param {Object} updates - An object where the keys are variant IDs and the values are the new quantities.
 * @returns {Promise<Object>} The updated cart data.
 */
async function updateItems(updates) {
  try {
    const response = await fetch(
      window.Shopify.routes.root + "cart/update.js",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ updates }),
      }
    );

    const data = await response.json();
    if (response.ok) {
      console.log("Cart updated:", data);
      return data;
    } else {
      throw new Error(
        data.message || "An error occurred while updating the cart"
      );
    }
  } catch (error) {
    console.error("Error updating cart:", error.message);
    throw error;
  }
}

/**
 * Updates the cart attributes.
 * @param {Object} attributes - An object containing the attributes to update.
 * @returns {Promise<Object>} The updated cart data.
 */
async function updateAttributes(attributes) {
  try {
    const response = await fetch(
      window.Shopify.routes.root + "cart/update.js",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ attributes }),
      }
    );

    const data = await response.json();
    if (response.ok) {
      console.log("Cart updated:", data);
      return data;
    } else {
      throw new Error(
        data.message || "An error occurred while updating the cart"
      );
    }
  } catch (error) {
    console.error("Error updating cart:", error.message);
    throw error;
  }
}

/**
 * Changes the quantity or attributes of a single item in the cart.
 * @param {string} variantId - The ID of the product variant to change.
 * @param {number} quantity - The new quantity for the specified variant.
 * @param {string|null} [subscriptionPlanId=null] - The subscription plan ID if applicable.
 * @param {Object} [customProperties={}] - Custom properties of the product.
 * @returns {Promise<Object>} The updated cart data.
 */
async function changeItem(
  variantId,
  quantity,
  subscriptionPlanId = null,
  customProperties = {}
) {
  try {
    const change = {
      id: variantId,
      quantity: quantity,
      properties: customProperties,
    };

    if (subscriptionPlanId) {
      change.selling_plan = subscriptionPlanId;
    }

    const response = await fetch(
      window.Shopify.routes.root + "cart/change.js",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(change),
      }
    );

    const data = await response.json();
    if (response.ok) {
      console.log("Cart item changed:", data);
      return data;
    } else {
      throw new Error(
        data.message || "An error occurred while changing the cart item"
      );
    }
  } catch (error) {
    console.error("Error changing cart item:", error.message);
    throw error;
  }
}

/**
 * Clears all items from the cart.
 * @returns {Promise<Object>} The cleared cart data.
 */
async function clear() {
  try {
    const response = await fetch(window.Shopify.routes.root + "cart/clear.js", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    if (response.ok) {
      console.log("Cart cleared:", data);
      return data;
    } else {
      throw new Error(
        data.message || "An error occurred while clearing the cart"
      );
    }
  } catch (error) {
    console.error("Error clearing cart:", error.message);
    throw error;
  }
}

const cart = {
  addItem,
  addItems,
  getAll,
  updateItem,
  updateItems,
  updateAttributes,
  changeItem,
  clear,
};

export const shopifyAPI = {
  suggest,
  cart,
};
