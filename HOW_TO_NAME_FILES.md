# For SECTIONS

([AJAX])-[PAGE_TYPE]-[SECTION_NAME]

[AJAX] (optional)
- if it's an ajax section that is only rendered with 

[PAGE_TYPE]
- home
- product
- collection
- blog
- blog-article
- cart
- header
- footer
- layout: for all snippets used on the layout (for scripts etc...)
- g (global) : for all sections / snippets that can be used on any page type

[SECTION_NAME]

# For SNIPPETS

[PAGE_TYPE]-([PARENT_SECTION])-[SNIPPET_NAME]--([VARIATION_NAME])


[PAGE_TYPE]
- Same as for sections

[PARENT_SECTION] (optional)
- if only used in one section, write the name of the section here

[SNIPPET_NAME]
- Same as for sections

[VARIATION_NAME] (optional)
- if there are several variations of the same snippet (exemple : product-card--big | product-card--small) 


# For JS/CSS

Just give them the same name as section or snippet with .js / .css