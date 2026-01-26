# Lio (Breathe-Lio) Bundle/Cart System - Technical Analysis

## Executive Summary

The Lio product bundle system is implemented entirely on the **frontend** using Shopify's native Liquid templating and JavaScript. There is **no custom backend app** processing bundles after cart addition. The system uses:

- Shopify's standard `cart/add.js` API
- Variant metafields for product configuration
- Line item properties for bundle product lists
- Custom UI components for pack/variant selection

---

## 1. Frontend Implementation - Theme Repository

### 1.1 Product Page Bundle Selection

The bundle/pack selection is implemented through multiple interchangeable UI patterns:

#### A. Pack Selector Block (`snippets/product-info.liquid`)

Location: `snippets/product-info.liquid` (lines 54-543)

Two implementations exist:

**1. `pack_selector` block** (simpler version):
```liquid
{% when 'pack_selector' %}
  <div class="ws-pack-selector" id="ws-pack-selector-{{ block.id }}">
    <!-- STEP 1: LIO Selector (dropdown) -->
    <div class="ws-lio-dropdown" data-selected-type="{{ default_type | handleize }}">
      ...
    </div>
    
    <!-- STEP 2: Pack Options -->
    <ul class="ws-pack-options">
      {% for variant in product.variants %}
        <li class="ws-pack-option" 
            data-variant-id="{{ variant.id }}"
            data-media-id="{{ variant.featured_media.id }}"
            data-variant-type="{{ type }}">
          ...
        </li>
      {% endfor %}
    </ul>
    
    <!-- CTA Button -->
    <button class="ws-cta__button">...</button>
  </div>
```

**2. `product-selector` block** (more feature-rich):
- Two-step selection process:
  1. Choose LIO device type (Olive, Walnut, Black, Silver variants)
  2. Choose pack size/type
- Filtered by variant option[0] (device type)

#### B. Dedicated Pack Selector Section (`sections/ecom-pack-selector.liquid`)

A standalone section with:
- Media card carousel for LIO types
- Pack option cards with toggle support
- Variant-based pricing display

#### C. Variant Picker V2 (`snippets/variant-picker-v2.liquid`)

Tab-based variant selection:
- **Packs Tab**: Shows multi-core pack variants
- **Single Tab**: Shows single-item variant
- Uses `variant.metafields.custom.core_weeks` for "X weeks" labels

### 1.2 Bundle Builder Section (`sections/ss-bundle-builder-3.liquid`)

Third-party component from Section Store for "build your own bundle":

**Key Features:**
- Product grid selection from collection
- Quantity limits per bundle variant
- Sidebar showing selected products
- Dynamic product count tracking

**Configuration:**
```liquid
{%- assign bundle_product = section.settings.bundle_product -%}
{%- assign limits = section.settings.limits -%}  <!-- e.g., "12,6" -->
```

---

### 1.3 Add to Cart Flow

#### Standard Product (Pack Selector)

```javascript
// From snippets/product-info.liquid
fetch('/cart/add.js', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    items: [{ 
      id: selectedVariantId,  // Standard Shopify variant ID
      quantity: 1 
    }] 
  })
})
```

**No custom attributes** are sent with standard pack selections - just the variant ID.

#### Bundle Builder

```liquid
{%- form 'product', bundle_product, id: product_form_id -%}
  <input type="hidden" name="id" value="{{ bundle_product.selected_or_first_available_variant.id }}">
  <input type="hidden" name="quantity" value="1">
  <input class="bundle-input-property-{{ section.id }}" 
         type="hidden" 
         value="" 
         name="properties[Products]">
{%- endform -%}
```

The `properties[Products]` value is populated dynamically via JavaScript:

```javascript
function updateBundleInputProperty() {
  let sidebarProducts = document.querySelectorAll('.bundle-sidebar-product-{{ section.id }}');
  let productList = Array.from(sidebarProducts).map(product => {
    let title = product.querySelector('.bundle-sidebar-product-title-{{ section.id }}').innerText;
    let count = product.querySelector('.count-{{ section.id }}').innerText;
    return `${title} (x${count})`;
  }).join(', ');
  bundleInputProperty.value = productList;
}
```

**Example Property Value:**
```
"Minty Magic (x4), Fresh Mint (x2), Cool Breeze (x6)"
```

### 1.4 Custom Attributes/Properties Sent with Cart Item

| Property Name | Source | Format | Purpose |
|--------------|--------|--------|---------|
| `properties[Products]` | Bundle Builder | `"Product A (x2), Product B (x4)"` | Lists selected bundle items |
| `selling_plan` | Selling Plan Selector | Shopify Selling Plan ID | Subscription handling |

**Standard pack selections do NOT use line item properties** - they rely solely on the variant ID which encodes all the selection information (device type + pack size).

### 1.5 Variant Selection and Quantity Handling

**Variant Structure:**
Products use a multi-option variant structure:
- **Option 1**: Device type (Olive, Walnut, Black, Silver, BlackGen2, SilverGen2)
- **Option 2**: Pack size/type (Single, 6-Pack, 12-Pack, etc.)

**Selection Logic:**
```javascript
// Filter pack options by selected device type
function updatePacksByType(type) {
  packOptions.forEach(pack => {
    const packType = pack.dataset.variantType;
    if (packType === type) {
      pack.style.display = '';
    } else {
      pack.style.display = 'none';
    }
  });
}
```

**Quantity:**
- Standard products: `quantity: 1` (always)
- Bundle builder: `quantity: 1` for the bundle product; individual counts tracked in `properties[Products]`

### 1.6 Key Files and Code Structure

| File | Purpose |
|------|---------|
| `snippets/product-info.liquid` | Main product info, pack selectors, variant blocks |
| `sections/main-product.liquid` | Product page section wrapper |
| `sections/ecom-pack-selector.liquid` | Standalone pack selector section |
| `sections/ss-bundle-builder-3.liquid` | Build-your-own bundle functionality |
| `snippets/variant-picker.liquid` | Standard variant picker with dropdown/swatch support |
| `snippets/variant-picker-v2.liquid` | Tab-based variant picker (Single/Packs) |
| `assets/theme.js` | ProductForm class, cart handling |
| `src/templates/api.js` | Cart API helper functions |
| `snippets/line-item.liquid` | Cart line item display (shows properties) |
| `sections/cart-drawer.liquid` | Cart drawer with line items |

---

## 2. Backend/App Implementation

### 2.1 No Custom App Detected

**Finding: There is NO custom Shopify app backend processing bundles.**

The entire system operates using:
1. **Native Shopify cart API** (`/cart/add.js`, `/cart/update.js`, `/cart/change.js`)
2. **Variant-based pricing** (all pricing is configured at variant level)
3. **Line item properties** for display purposes only (not backend processing)

### 2.2 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User selects device type (Option 1)                         │
│           ↓                                                      │
│  2. UI filters available pack variants                          │
│           ↓                                                      │
│  3. User selects pack size (Option 2)                           │
│           ↓                                                      │
│  4. JavaScript captures variant ID                               │
│           ↓                                                      │
│  5. POST /cart/add.js                                           │
│     {                                                            │
│       items: [{                                                  │
│         id: 12345678901234,  // Variant ID                      │
│         quantity: 1,                                             │
│         properties: {...}   // Optional, for bundle builder     │
│       }]                                                         │
│     }                                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SHOPIFY NATIVE                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  - Cart stores line item with variant ID + properties           │
│  - Checkout uses standard Shopify checkout                       │
│  - Order created with line item properties preserved            │
│  - NO webhook/app processing detected                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 What Happens After Cart Addition

1. **Standard Shopify behavior** - item added to cart
2. **Cart drawer updates** via section rendering (bundled sections)
3. **No cart modification** by external apps
4. **Checkout proceeds normally** with Shopify's standard checkout

### 2.4 Selling Plans (Subscriptions)

The theme supports Shopify Selling Plans for subscriptions:

```liquid
{%- when 'custom_selling_plans' -%}
  {% for plan in group.selling_plans %}
    <div class="plan-box"
         data-selling-plan-id="{{ plan.id }}"
         data-discount-percent="{{ adjustment.value }}">
      ...
    </div>
  {% endfor %}
```

```javascript
// Selling plan injection
const inp = document.createElement("input");
inp.type = "hidden";
inp.name = "selling_plan";
inp.value = box.dataset.sellingPlanId;
form.appendChild(inp);
```

---

## 3. Key Technical Details

### 3.1 Data Structure for Custom Attributes

**Line Item Properties (Bundle Builder only):**
```javascript
{
  "properties": {
    "Products": "Minty Magic (x4), Fresh Mint (x2), Cool Breeze (x6)"
  }
}
```

**Standard Pack Selection:**
```javascript
{
  "id": 12345678901234,  // Variant ID encodes all selection info
  "quantity": 1
  // NO properties field
}
```

### 3.2 Line Items in Cart

**Answer: ONE line item per selection**

- Standard pack: 1 line item = 1 variant
- Bundle builder: 1 line item = 1 bundle product variant + properties listing contents

The bundle builder does NOT create multiple line items for each selected product. Instead, it creates ONE line item for the "bundle product" with a text property listing what's included.

### 3.3 Metafields Used

| Namespace.Key | Type | Purpose |
|--------------|------|---------|
| `custom.featured_icon` | Image | Device type icon (square) |
| `custom.featured_icon_horizontal` | Image | Device type icon (horizontal) |
| `custom.pack_option_title` | Text | Override variant title in UI |
| `custom.pack_option_description` | Text | Pack description text |
| `custom.pack_option_badge` | Text | Badge text (e.g., "Most Popular") |
| `custom.pack_option_badge_two` | Text | Secondary badge style |
| `custom.pack_option_toggle` | Boolean | Enable toggle UI for variant |
| `custom.core_weeks` | Number | Weeks of supply (for variant picker V2) |
| `custom.usps` | JSON | List of USP items with icons |
| `custom.badge` | Text | Product badge text |
| `custom.badge_text` | Text | Alternative badge field |

**No Metaobjects detected** - all data is stored in variant/product metafields.

### 3.4 API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/cart/add.js` | POST | Add items to cart |
| `/cart/update.js` | POST | Update cart quantities |
| `/cart/change.js` | POST | Change individual item |
| `/cart/clear.js` | POST | Clear cart |
| `/cart.js` | GET | Get cart contents |
| `/products/{handle}?variant={id}&section_id={id}` | GET | Section rendering for variant changes |
| `/search/suggest` | GET | Predictive search |

### 3.5 Events Dispatched

```javascript
// Variant change event
form.dispatchEvent(new CustomEvent('variant:change', {
  bubbles: true,
  detail: {
    formId: form.id,
    variant: { id: parseInt(variantId) },
    previousVariant: { id: parseInt(previousVariantId) }
  }
}));

// Cart change event
document.documentElement.dispatchEvent(new CustomEvent('cart:change', {
  bubbles: true,
  detail: {
    baseEvent: 'variant:add',
    cart: cartContent
  }
}));

// Cart prepare bundled sections
document.documentElement.dispatchEvent(new CustomEvent('cart:prepare-bundled-sections', {
  bubbles: true,
  detail: { sections: sectionsToBundle }
}));
```

---

## 4. Summary

### What the System DOES:
- ✅ Variant-based product selection with visual UI
- ✅ Device type filtering (show relevant packs per device)
- ✅ Bundle builder with product selection limits
- ✅ Line item properties for bundle contents display
- ✅ Selling plan (subscription) support
- ✅ Dynamic pricing display per variant
- ✅ Gallery syncing with variant selection

### What the System DOES NOT DO:
- ❌ No custom backend app processing
- ❌ No cart modification after addition
- ❌ No automatic discount application (uses variant pricing)
- ❌ No multi-line-item creation from single selection
- ❌ No webhook-based order processing
- ❌ No metaobjects (only metafields)

### Architecture Pattern:
**"Configuration-at-Variant-Level"** - All bundle/pack configurations are stored as Shopify variants with metafields providing additional display data. No complex backend logic required.

---

## 5. File Reference Quick Guide

```
/workspace/
├── snippets/
│   ├── product-info.liquid        # Main pack selector implementations
│   ├── variant-picker.liquid      # Standard variant picker
│   ├── variant-picker-v2.liquid   # Tab-based variant picker
│   ├── line-item.liquid           # Cart line item display
│   └── buy-buttons.liquid         # Add to cart buttons
├── sections/
│   ├── main-product.liquid        # Product page wrapper
│   ├── ecom-pack-selector.liquid  # Standalone pack selector
│   ├── ss-bundle-builder-3.liquid # Build-your-own bundle
│   └── cart-drawer.liquid         # Cart drawer
├── assets/
│   ├── theme.js                   # ProductForm, cart handling
│   └── jc-bundle-*.js             # Bundle-related JS chunks
├── src/
│   └── templates/api.js           # Cart API helpers
└── templates/
    └── page.bundle-builder.json   # Bundle builder page config
```

---

*Document generated: January 26, 2026*
*Analysis based on theme repository code review*
