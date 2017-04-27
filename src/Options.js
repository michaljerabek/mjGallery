/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery*/

(function (ns, $) {

    var DEFAULTS = {},

        Options = ns.Options = function Options(options, mjGallery) {

            this.mjGallery = mjGallery;

            this.originalOptions = options;

            this.options = $.extend({}, DEFAULTS, options);
        };

    ns.OPTIONS = {

        //neomezovat velikost položek
        //výchozí: false
        //lze nastavit samostatně atributem data-mjg-full-size="true"
        FULL_SIZE_ITEMS: "fullSize", //Boolean

        //nastavit obsah na object-fit: cover
        CONTENT_OBJECT_FIT_COVER: "cover", //Boolean

        //bílá varianta
        WHITE_UI: "white", //Boolean

        //neprůhlednost překryvu
        OVERLAY_OPACITY: "overlay", //Number

        //zobrazit informace nahoře - název a pozice
        // - v případě, že je zobrazení pozice vypnuto a není nastaven title, výchozí hodnota je false
        //zobrazit informace o položce - název a popis
        // - přednost mají nastavení ITEM_TITLE_SELECTOR a ITEM_DESCRIPTION_SELECTOR
        // - poté mají prednost vlastní atributy - data-mjg-title a data-mjg-description
        // - dále - název:
        //    - element s atributem alt (a jeho hodnota)
        //    - atribut title
        //    - atribut aria-label
        //    - text elementu podle aria-labelledby
        //    - text elementu figcaption, h1, h2, h3, h4, h5, h6, [class*='title'], [class*='name'] (uvnitř zdroje)
        //    - text zdroje
        // - dále - popis:
        //    - atribut aria-description
        //    - text elementu podle aria-describedby
        //    - text elementu p, [class*='description'], [class*='detail'] (uvnitř zdroje)
        SHOW_INFO: "info", //Boolean

        //zobrazit aktuální pozici a počet položek
        // - v případě, že je vypnut mód galerie, výchozí hodnota je false
        SHOW_POSITION: "counter", //Boolean

        //element otevírající galerii (většinou pro případ, že ji neotevírají samotné položky)
        // - může obsahovat položky stejně jako ITEMS_SELECTOR
        // - může specifikovat zdroj (selektor) položek v data-mjg-selector
        //    - pokud není specifikována konkrétní položka (viz dále), otevře se první nalezená
        // - může specifikovat konkrétní položku, která se má otevřít v data-mjg-open (hodnota se použíje jako parametr jQuery funkce filter)
        //    - pokud nemá atribut open, ale má atribut href, otevřená položka se vyhledá podle atributu href
        // - cesta k obsahu pro otřevření viz ITEMS_SELECTOR
        OPENING_ELEMENT: "openBy", //String (selektor), $, HTLElement, NodeList, HTMLCollection

        //selector položek v galerii - položky musí mít atribut href nebo data-mjg-src
        // - pokud není specifikován, je možné použít OPENING_ELEMENT
        // - možnosti nastavení
        //    - data-mjg-srcset = atribut srcset u img
        //    - data-mjg-sizes = atribut sizes u img
        //    - data-mjg-type = typ obsahu - image (výchozí), iframe, html, youtube, vimeo, video
        //    - data-mjg-min-height = minimální výška obsahu
        //    - data-mjg-min-width = minimální šířka obsahu
        //    - data-mjg-max-height = maximální výška obsahu
        //    - data-mjg-max-width = maximální šířka obsahu
        //    - data-mjg-view-width = maximální šířka elementu, do kterého se má obsah přizpůsobit
        //    - data-mjg-view-height = maximální výška elementu, do kterého se má obsah přizpůsobit
        ITEMS_SELECTOR: "selector", //String

        //selector (nebo funkce) elementu obsahujicího název položky
        // - lze nastavit false pro zakázání hledání
        ITEM_TITLE_SELECTOR: "title", //String (selektor), Function, Boolean (false)

        //selector (nebo funkce) elementu obsahujicího popis položky
        // - lze nastavit false pro zakázání hledání
        ITEM_DESCRIPTION_SELECTOR: "description", //String (selektor), Function, Boolean (false)

        //třída přiřazená galerii
        CUSTOM_CLASS: "addClass", //String

        //zobrazovat položky jako galerii nebo samostatně
        GALLERY_MODE: "gallery", //Boolean

        //při otevření vždy načíst položky znovu
        // - jinak se načítají pouze při změně elementů
        ALWAYS_REFRESH_ITEMS: "alwaysRefresh", //Boolean

        //zobrazovat/skrýt posuvníky
        SCROLLBARS_VISIBILITY: "scrollbars", //mjGallery.SCROLLBARS

        //maximální velkost elementu, do kterého se musí přizpůsobit obsah
        // - procento velikosti okna
        VIEW_MAX_WIDTH: "viewWidth", //Number
        VIEW_MAX_HEIGHT: "viewHeight", //Number

        //maximální/minimální rozměry obsahu
        MAX_CONTENT_WIDTH: "maxWidth", //String
        MIN_CONTENT_WIDTH: "minWidth", //String
        MAX_CONTENT_HEIGHT: "maxHeight", //String
        MIN_CONTENT_HEIGHT: "minHeight", //String

        //spouštět video automaticky
        AUTOPLAY_VIDEO: "autoplay", //Boolean

        //zachovat události
        // - lze nastavit samostatně pomocí atributu data-mjg-events
        // - none - položky nebude možné přepnout přesunutím, kolečkem ani klávesnicí
        // - all - položky bude možné přepnout přesunutím, kolečkem i klávesnicí
        // - scroll - položky nebude možné přepnout kolečkem
        // - pointer - položky nebude možné přepnout přesunutím
        // - keys - položky nebude možné přepnout klávestnicí
        // - výchozí: ns.mjGallery.EVENTS.NONE (v případě html obsahu se zachová scroll a pointer (pouze touch), pokud je obsah scrollovatelný; atributem data-mjg-scrollable="true" nastavit elementy, které mohou být scrollovatelné)
        // - je možné použít více hodnot najednou: data-mjg-events="scroll pointer"
        PRESERVE_EVENTS: "events", //mjGallery.EVENTS

        //funkce generující html obsah
        // - po vygenerování obsahu je nutné za volat funkci done (první parametr)
        //    - argument fukce done je vygenerovaný obsah (HTMLElement, $, String)
        HTML_GENERATOR: "html", //Function

        //metoda, kterou se má vytvořít html obsah
        // - append - vybraný element (selektor v atributu src) se přesune do galerie (výchozí, pokud je uveden src)
        // - clone - vybraný element se naklonuje
        // - generate - obsah se vygeneruje pomocí funkce v HTML_GENERATOR (výchozí, pokud není uveden src)
        HTML_GENERATE_METHOD: "method", //HTMLItem.METHOD | VideoItem.METHOD (nepodporuje generate)

        //mají být zoomovatelné položky zoomovatelné nebo ne
        ZOOMABLE: "zoomable", //Boolean

        //zobrazovat tlačítka
        SHOW_BTN_ZOOM: "zoomBtn", //Boolean
        SHOW_BTN_INFO: "infoBtn", //Boolean
        SHOW_BTN_FULLSCREEN: "fullscreenBtn", //Boolean
        SHOW_BTN_CLOSE: "closeBtn" //Boolean
    };

    ns.SCROLLBARS = {

        //posuvník bude vidět
        VISIBLE: "visible",

        //posuvník se skryje pomocí negativního marginu na body
        // - změní se velikost obsahu
        // - obsah bude scrollovatelný
        MARGIN: "margin",

        //posuvník se skryje pomocí negativního marginu a paddingu na body
        // - nezmění se velikost obsahu
        // - obsah bude scrollovatelný
        PADDING: "padding",

        //na body se přídá overflow: hidden
        // - obsah nebude scrollovatelný
        OVERFLOW: "overflow"
    };


    ns.EVENTS = {
        ALL: "all",
        NONE: "none",
        SCROLL: "scroll",
        POINTER: "pointer",
        KEYS: "keys"
    };


    DEFAULTS[ns.OPTIONS.FULL_SIZE_ITEMS] = false;
    DEFAULTS[ns.OPTIONS.CONTENT_OBJECT_FIT_COVER] = false;
    DEFAULTS[ns.OPTIONS.WHITE_UI] = false;
    DEFAULTS[ns.OPTIONS.OVERLAY_OPACITY] = 0.85;
    DEFAULTS[ns.OPTIONS.SHOW_INFO] = true;
    DEFAULTS[ns.OPTIONS.SHOW_POSITION] = true;
    DEFAULTS[ns.OPTIONS.ITEMS_SELECTOR] = "a:has(img)";
    DEFAULTS[ns.OPTIONS.ITEM_TITLE_SELECTOR] = null;
    DEFAULTS[ns.OPTIONS.ITEM_DESCRIPTION_SELECTOR] = null;
    DEFAULTS[ns.OPTIONS.CUSTOM_CLASS] = null;
    DEFAULTS[ns.OPTIONS.GALLERY_MODE] = true;
    DEFAULTS[ns.OPTIONS.OPENING_ELEMENT] = null;
    DEFAULTS[ns.OPTIONS.ALWAYS_REFRESH_ITEMS] = false;
    DEFAULTS[ns.OPTIONS.SCROLLBARS_VISIBILITY] = ns.SCROLLBARS.PADDING;
    DEFAULTS[ns.OPTIONS.AUTOPLAY_VIDEO] = false;
    DEFAULTS[ns.OPTIONS.PRESERVE_EVENTS] = ns.EVENTS.NONE;
    DEFAULTS[ns.OPTIONS.ZOOMABLE] = true;
    DEFAULTS[ns.OPTIONS.SHOW_BTN_FULLSCREEN] = true;
    DEFAULTS[ns.OPTIONS.SHOW_BTN_INFO] = true;
    DEFAULTS[ns.OPTIONS.SHOW_BTN_ZOOM] = true;
    DEFAULTS[ns.OPTIONS.SHOW_BTN_CLOSE] = true;


    Options.prototype.init = function () {

        //není galerie a není vynucené zobrazení pozice -> pozici nezobrazovat
        if (this.is(ns.OPTIONS.GALLERY_MODE, false) && !this.byUserIs(ns.OPTIONS.SHOW_POSITION, true)) {

            this.set(ns.OPTIONS.SHOW_POSITION, false);
        }

        if (this.is(ns.OPTIONS.WHITE_UI, true)) {

            this.mjGallery.get().addClass(ns.CLASS.selfWhite);
        }

        if (this.get(ns.OPTIONS.CUSTOM_CLASS)) {

            this.mjGallery.get().addClass(this.get(ns.OPTIONS.CUSTOM_CLASS));
        }

        this.mjGallery.contentSizes = {
            maxWidth: this.get(ns.OPTIONS.MAX_CONTENT_WIDTH),
            minWidth: this.get(ns.OPTIONS.MIN_CONTENT_WIDTH),
            maxHeight: this.get(ns.OPTIONS.MAX_CONTENT_HEIGHT),
            minHeight: this.get(ns.OPTIONS.MIN_CONTENT_HEIGHT)
        };

        this.mjGallery.viewSizes = {
            maxWidth: this.get(ns.OPTIONS.VIEW_MAX_WIDTH),
            maxHeight: this.get(ns.OPTIONS.VIEW_MAX_HEIGHT)
        };
    };

    Options.prototype.getDefaults = function () {

        return DEFAULTS;
    };

    Options.prototype.isSetByUser = function (option) {

        return typeof this.originalOptions[option] !== "undefined";
    };

    Options.prototype.isSet = function (option) {

        return typeof this.options[option] !== "undefined";
    };

    Options.prototype.is = function (option, value) {

        return this.options[option] === value;
    };

    Options.prototype.byUserIs = function (option, value) {

        return this.originalOptions[option] === value;
    };

    Options.prototype.get = function (option) {

        return option ? this.options[option] : this.options;
    };

    Options.prototype.set = function (option, value) {

        this.options[option] = value;

        return this;
    };

    Options.prototype.getOriginal = function (option) {

        return option ? this.originalOptions[option] : this.originalOptions;
    };

}(window.mjGallery, jQuery));
