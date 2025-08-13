do this in xxxx.liquid

Using Figma MCP (`get_code` and `get_image`), create a pixel-perfect version of the provided design.

Use only Tailwind CSS classes (check `tailwind.config.js` and `main.css` to see what’s available, and feel free to extend these if needed to achieve pixel perfection).

For icons, use those provided in Figma (fetch them via `curl` or export from Figma).

figma mobile:https://www.figma.com/design/1oN6NBVBT6fyMAmZNu7ePn/Lio-%F0%9F%9A%AC?node-id=24-5193&m=dev
figma desktop:https://www.figma.com/design/1oN6NBVBT6fyMAmZNu7ePn/Lio-%F0%9F%9A%AC?node-id=24-3203&m=dev

<rules>

<rule>If any structure repeats, create a snippet prefixed with `block_` in its name to avoid code duplication.</rule>

<rule>Wrap content inside each section with `jc-container`. Do not add extra `px-*` padding on containers — horizontal padding and centering come from `theme.container` in `tailwind.config.js`. If the background spans the full width but content does not, apply the container class to the appropriate child element.</rule>

<rule>All `{% render %}` or `{% include %}` tags and arguments must be written on one line.</rule>

<rule>Use the `container` class for the top-level wrapper instead of adding custom paddings.</rule>

<rule>Do not use inline CSS, except for `background-image`.</rule>

<rule>After downloading icon SVGs, write them inline inside a snippet named `icon-xxxx.liquid` in the `snippets/` folder, and reference them in the code.</rule>

<rule>Do not duplicate content separately for desktop and mobile — use responsive Tailwind classes instead.</rule>

<rule>If JavaScript is required, create a Web Component.</rule>

<rule>JavaScript files should be placed in `src/templates.components/<name-of-webcomponent>.js` and imported in `src/templates/main.js`.</rule>

<rule>Do not write HTML directly inside JavaScript files.</rule>

</rules>
