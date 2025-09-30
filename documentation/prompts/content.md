now about content : \n  \n  \n We want to move the content to make is editable outside of the code \n  \n text \n  \n <rules> \n  \n <rule>all user facing content should be either moved to the locales files or referenced in product data/metadata because these are the only elements that can be localized</rule> \n  \n <rule>if an information should change from one product to another, reference product data (fields available are visible in product-data.md . if we need product specific info but no product data field is available , we need to create a metadata field. </rule> \n  \n <rule>If we need to create a metadata field, add this field reference with product.metadata.XXXX and add the referenced field in metadata.md</rule>


<rule>Use global.<section>.\* translation keys; render with {% t "global.<section>.<key>" %}.

Pass translation keys into blocks and resolve with {% t text %}.</rule> \n  \n <rule>in metadata.md we should see the field name, and its type (single line text or richtext)</rule> \n  \n </rules> \n  \n Images and videos \n  \n <rules> \n  \n <rule>images and videos that can change should be referenced in the settings. check settings.md for details</rule> \n  \n <rule>if it's a background image, we should be able to define a different one on mobile and desktop</rule> \n  \n <rule>images and videos that should be always the same and don’t need the merchant to change them can be hardcoded (icons for example</rule> \n  \n </rules> \n  \n Links \n  \n <rules> \n  \n <rule>no links should be hardcoded. no exceptions.</rule> \n  \n <rule>links should be defined in the settings. Check settings.md for detils</rule> \n  \n </rules> \n 

global rules :

<rules>



</rules>

 \n Once you've made those changes, make sure you reference the settings/translations etc in the html files

