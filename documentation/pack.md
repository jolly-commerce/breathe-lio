You need to write custom componnet which will do this for step 2 and step 2 prodiuct cards make simple, try to avoide use hard logic
I have 3 different packs I`ve alredy set up liquid for this pack-selectors.liquid:
When i change seps by clicking on complete pack i need to remove all selections and select all cards by one
When i select 3 or 6 packs i need update max-quantity
FIRST: 3 BAGS → 3 flavors to choose - if you add more than 3, it switches to the 6 BAGS pack
SECOND: 6 BAGS → 6 flavors to choose - you can't add more than 6
THIRD: COMPLETE → automatic selection of 6 flavors, 1 of each - you can't add more than 6 and you can't deselect one of them and add specific class to each card with jc-complete-pack

on eah step i need update data-min-flavors to set up to 3 or 6 also i need to update button and updata data-text-select-minimum-flavors with right count
<pack-selector-component
  class="jc-block jc-w-full"
  data-max-flavors="6"
  data-min-flavors="3"
  data-text-summary-select-your-lio="{{ 'bundle_pack.summary_select_your_lio' | t }}"
  data-text-button-add-to-cart="{{ 'bundle_pack.button_add_to_cart' | t }}"
  data-text-button-adding-to-cart="{{ 'bundle_pack.button_adding_to_cart' | t }}"
  data-text-select-minimum-flavors="{{ 'bundle_pack.select_minimum_flavors' | t }}"
>