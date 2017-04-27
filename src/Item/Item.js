/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery*/

(function (ns, $) {

    var OPACITY_QUEUE = "opacity." + ns.NS,

        NS = "Item",

        API = ["zoom", "fitZoom", "setOrigin", "isScrollable", "getContent", "refreshSize", "load", "isNext", "isPrev", "isCurrent", "getSrc", "getTypeAttr", "getType", "setTitle", "setDescription", "getTitle", "getDescription", "get", "getSource", "getHeight", "getWidth", "getIndex"],

        APIMap = {
            getSrc: "getSrcAttr",
            getSrcset: "getSrcsetAttr",
            getSizes: "getSizesAttr"
        },

        isEventScrollType = function (event, type) {

            return (type === ns.EVENTS.SCROLL || (/touch/.test(event.type) && type === ns.EVENTS.POINTER && event.originalEvent.touches.length !== 2));
        },

        ItemAPI = function ItemAPI(item) {

            ns.Item.generateAPI.call(this, item, API);

            if (ns.DEBUG) {

                this.item = item;
            }
        },

        Item = ns.Item = function Item($source, mjGallery, index, preload, APIClass) {

            this.mjGallery = mjGallery;

            this.index = index;

            this.$source = $source || $(null);

            APIClass = APIClass || ItemAPI;

            this.API = new APIClass(this);

            this.prev = false;
            this.next = false;
            this.current = false;

            this.zoomable = this.zoomable || false;
            this.zoomValue = 1;

            this.generateItem();

            this.transformationController = ns.USE_TRANSITIONS ?
                new ns.ItemTransformationCSSController(this, mjGallery) :
                new ns.ItemTransformationJSController(this, mjGallery);

            if (preload) {

                this.load();
            }

            this.refreshSize();

            this.refreshSize = this.refreshSize.bind(this);

            ns.EVENT.on(ns.EVENT.resize, this.refreshSize.bind(this), mjGallery);
        };


    Item.API = API;

    Item.TYPE = {};

    Item.CLASS = {};

    Item.GET_TYPE = {};

    Item.getClass = function ($source) {

        var type = Item.getType($source),

            Class = Item;

        $.each(Item.TYPE, function (prop, value) {

            if (value === type) {

                Class = Item.CLASS[prop];

                return false;
            }
        });

        return Class;
    };

    Item.getType = function ($source) {

        var src = $source.data(ns.DATA.src) || $source.attr("href"),

            type = $source.data(ns.DATA.type);

        if (type) {

            return type;
        }

        $.each(Item.GET_TYPE, function (t, fn) {

            var result = fn ? fn(src, type) : false;

            if (result) {

                type = ns.Item.TYPE[t];
            }
        });

        return type;
    };

    Item.extend = function (PROP, type, Class, getTypeFn) {

        ns.extend(Class, Item);

        Item.TYPE[PROP] = type;

        Item.CLASS[PROP] = Class;

        Item.GET_TYPE[PROP] = getTypeFn;
    };

    Item.generateAPI = function (item, API) {

        API.forEach(function (method) {

            this[method] = function () {

                var returnValue = item[APIMap[method] || method].apply(item, arguments);

                if (returnValue === item) {

                    return this;
                }

                return returnValue;
            };
        }, this);
    };


    Item.prototype.destroy = function () {

        ns.EVENT.off(ns.EVENT.resize, this.refreshSize, this.mjGallery);
    };

    Item.prototype.getOption = function (type) {

        return this.$source.data(ns.DATA[type]);
    };

    Item.prototype.getAPI = function () {

        return this.API;
    };

    Item.prototype.getIframe = function () {

        return null;
    };

    Item.prototype.get = function () {

        return this.$self;
    };

    Item.prototype.getSource = function () {

        return this.$source;
    };

    Item.prototype.getContent = function () {

        return this.$content;
    };

    Item.prototype.getHeight = function () {

        return this.height;
    };

    Item.prototype.getWidth = function () {

        return this.width;
    };

    Item.prototype.getIndex = function () {

        return this.index;
    };

    Item.prototype.isEmpty = function () {

        return !this.$self.length;
    };

    Item.prototype.isNext = function () {

        return this.next;
    };

    Item.prototype.isPrev = function () {

        return this.prev;
    };

    Item.prototype.isCurrent = function () {

        return this.current;
    };

    Item.prototype.getZoomRect = function () {

        return this.$zoom[0].getBoundingClientRect();
    };

    Item.prototype.getContentRect = function () {

        return this.$content[0].getBoundingClientRect();
    };

    Item.prototype.isScrollable = function ($scrollable) {

        $scrollable = $scrollable ? $scrollable.add($scrollable.parents(ns.DATA.selector("scrollable", true))) : null;

        var isScrollable = false;

        if ($scrollable) {

            isScrollable = ($scrollable.get() || []).some(function (scrollable) {

                return scrollable.offsetHeight !== scrollable.scrollHeight || scrollable.offsetWidth !== scrollable.scrollWidth;
            });
        }

        return isScrollable || this.isViewScrollable();
    };

    Item.prototype.isViewScrollable = function () {

        return this.$view[0].offsetHeight !== this.$view[0].scrollHeight || this.$view[0].offsetWidth !== this.$view[0].scrollWidth;
    };

    Item.prototype.considerEventAsOnOverlay = function (event) {

        var $target = ns.$t(event.target);

        return !this.loaded || $target.hasClass(ns.CLASS.zoom) || $target.hasClass(ns.CLASS.view) || $target.hasClass(ns.CLASS.item);
    };

    Item.prototype.fitZoom = function (/*done*/) {

        this.transformationController.fitZoom.apply(this.transformationController, arguments);

        return this;
    };
    Item.prototype.zoom = function (zoom/*, origin, animate, fit, done*/) {

        if (typeof zoom !== "undefined") {

            this.transformationController.zoom.apply(this.transformationController, arguments);

            return this;
        }

        return this.zoomValue;
    };

    Item.prototype.translateZoomBy = function (diff, duration, returnDiff) {

        var returnValue = this.transformationController.translateZoomBy.apply(this.transformationController, arguments);

        return returnDiff ? returnValue : this;
    };

    Item.prototype.slideZoom = function (/*diff, done*/) {

        this.transformationController.slideZoom.apply(this.transformationController, arguments);

        return this;

    };

    Item.prototype.getZoom = function () {

        return this.$zoom;
    };

    Item.prototype.isZoomedIn = function () {

        return this.transformationController.isZoomedIn.apply(this.transformationController, arguments);
    };

    Item.prototype.isZoomable = function () {

        return this.zoomable && this.mjGallery.getOption(ns.OPTIONS.ZOOMABLE) && this.getZoomableAttr() !== false;
    };

    Item.prototype.shouldPreserveEvent = function (type, event) {

        var events = this.getOption("events") || "";

        //není nastaveno zachování událostí u položky
        if (!events && !this.mjGallery.getOptions().getOriginal(ns.OPTIONS.PRESERVE_EVENTS) && this.isViewScrollable()) {

            if (isEventScrollType(event, type)) {

                return true;
            }

        //není nastaveno zachování událostí u položky -> použít globální
        } else if (!events) {

            events = this.mjGallery.getOption(ns.OPTIONS.PRESERVE_EVENTS) || "";
        }

        var eventEvent = new ns.EVENT.Event({
            type: type,
            item: this.getAPI(),
            event: event
        }, this.mjGallery);

        ns.EVENT.fire(ns.EVENT.event, eventEvent, this.mjGallery);

        return eventEvent.isDefaultPrevented() || (events !== ns.EVENTS.NONE && (events === ns.EVENTS.ALL || ~events.indexOf(type)));
    };

    Item.prototype.generateItem = function () {

        if (!this.$source.length) {

            this.$self = this.$content = this.$source;

            return this;
        }

        this.$self = $(ns.TEMPLATE.ITEM.SELF({
            loaded: false,
            type: this.type,
            zoomable: this.isZoomable(),
            fullSize: this.isFullSize(),
            objectFitCover: this.isObjectFitCover()
        }));

        this.generateContent();

        this.$view = this.$self.find(ns.CLASS.selector("view"));
        this.$zoom = this.$self.find(ns.CLASS.selector("zoom"));

        this.addSizesToContent()
            .addSizesToView();

        this.$self.find(ns.CLASS.selector("view"))
            .append(this.$content);

        this.mjGallery.$itemsList
            .append(this.$self);

        return this;
    };

    Item.prototype.generateContent = function () {

        this.$content = $("<div></div>");

        return this;
    };

    Item.prototype.load = function () {

        if (this.isEmpty()) {

            return this;
        }

        this.setAsLoaded();

        this.fireLoadEvent();

        return this;
    };

    Item.prototype.setAsLoaded = function () {

        this.loading = false;
        this.loaded = true;

        this.$self.addClass(ns.CLASS.itemLoaded);

        return this;
    };

    Item.prototype.fireLoadEvent = function () {

        this.loadEvent = new ns.EVENT.Event({
            item: this.getAPI(),
            index: this.getIndex(),
            src: this.getSrcAttr()
        }, this.mjGallery);

        ns.EVENT.fire(ns.EVENT.load, this.loadEvent, this.mjGallery);

        return this;
    };

    Item.prototype.getSrcAttr = function () {

        if (this.src) {

            return this.src;
        }

        this.src = String(this.getOption("src") || this.$source.attr("href"));

        this.src = this.src === "undefined" ? "" : this.src;

        return this.src;
    };

    Item.prototype.getFullSizeAttr = function () {

        if (this.fullSizeAttr) {

            return this.fullSizeAttr;
        }

        this.fullSizeAttr = this.getOption("fullSize");

        return this.fullSizeAttr;
    };

    Item.prototype.getZoomableAttr = function () {

        if (this.zoomableAttr) {

            return this.zoomableAttr;
        }

        this.zoomableAttr = this.getOption("zoomable");

        return this.zoomableAttr;
    };

    Item.prototype.getObjectFitCoverAttr = function () {

        if (this.objectFitCoverAttr) {

            return this.objectFitCoverAttr;
        }

        this.objectFitCoverAttr = this.getOption("objectFitCover");

        return this.objectFitCoverAttr;
    };

    Item.prototype.isObjectFitCover = function () {

        var objectFitCover = this.getObjectFitCoverAttr();

        if (typeof objectFitCover === "boolean") {

            return objectFitCover;
        }

        return (ns.SUPPORTS_OBJECT_FIT && this.mjGallery.getOption(ns.OPTIONS.CONTENT_OBJECT_FIT_COVER)) || false;
    };

    Item.prototype.isFullSize = function () {

        var fullSizeAttr = this.getFullSizeAttr();

        if (typeof fullSizeAttr === "boolean") {

            return fullSizeAttr;
        }

        return  this.mjGallery.getOption(ns.OPTIONS.FULL_SIZE_ITEMS) || false;
    };

    Item.prototype.getTypeAttr = function () {

        if (this.typeAttr) {

            return this.typeAttr;
        }

        this.typeAttr = this.getOption("type");

        return this.typeAttr;
    };

    Item.prototype.getType = function () {

        return this.type;
    };

    Item.prototype.getContentSizes = function () {

        if (this.contentSizes) {

            return this.contentSizes;
        }

        this.contentSizes = {};

        this.contentSizes.maxHeight = this.getOption("itemMaxHeight") || this.mjGallery.contentSizes.maxHeight;
        this.contentSizes.minHeight = this.getOption("itemMinHeight") || this.mjGallery.contentSizes.minHeight;
        this.contentSizes.maxWidth = this.getOption("itemMaxWidth") || this.mjGallery.contentSizes.maxWidth;
        this.contentSizes.minWidth = this.getOption("itemMinWidth") || this.mjGallery.contentSizes.minWidth;

        return this.contentSizes;
    };

    Item.prototype.getViewSizes = function () {

        if (this.viewSizes) {

            return this.viewSizes;
        }

        this.viewSizes = {};

        this.viewSizes.maxHeight = this.getOption("viewMaxHeight") || this.mjGallery.viewSizes.maxHeight;
        this.viewSizes.maxWidth = this.getOption("viewMaxWidth") || this.mjGallery.viewSizes.maxWidth;

        return this.viewSizes;
    };

    Item.prototype.addSizesToContent = function () {

        if (!this.$content) {

            return;
        }

        if (!this.contentSizes) {

            this.getContentSizes();
        }

        this.$content.css(this.contentSizes);

        return this;
    };

    Item.prototype.addSizesToView = function () {

        if (!this.$view) {

            return;
        }

        if (!this.viewSizes) {

            this.getViewSizes();
        }

        this.$view.css(this.viewSizes);

        return this;
    };

    Item.prototype.setTitle = function (value) {

        var alreadySet = typeof this.title !== "undefined";

        this.title = value;

        if (alreadySet) {

            this.mjGallery.refreshItemInfo();
        }

        return this;
    };

    Item.prototype.setDescription = function (value) {

        var alreadySet = typeof this.description !== "undefined";

        this.description = value;

        if (alreadySet) {

            this.mjGallery.refreshItemInfo();
        }

        return this;
    };

    Item.prototype.getTitle = function () {

        if (typeof this.title !== "undefined") {

            return this.title;
        }

        var itemTitleSelector = this.mjGallery.getOption(ns.OPTIONS.ITEM_TITLE_SELECTOR);

        if (itemTitleSelector === false) {

            this.title = "";

            return this.title;
        }

        var itemTitle = this.getOption("itemTitle");

        if (typeof itemTitle !== "undefined") {

            this.title = itemTitle;

        } else {

            if (itemTitleSelector) {

                if (typeof itemTitleSelector === "function") {

                    this.title = itemTitleSelector.call(this.API);

                } else {

                    this.title = this.$source.find(itemTitleSelector).text();
                }

            } else {

                this.title = this.$source.find("[alt]").attr("alt") ||
                    this.$source.attr("title") ||
                    this.$source.attr("aria-label") ||
                    $("#" + this.$source.attr("aria-labelledby")).text() ||
                    this.$source.find("figcaption, h1, h2, h3, h4, h5, h6, [class*='title'], [class*='name']").first().text() ||
                    this.$source.text() || "";
            }
        }

        return this.title;
    };

    Item.prototype.getDescription = function () {

        if (typeof this.description !== "undefined") {

            return this.description;
        }

        var itemDescriptionSelector = this.mjGallery.getOption(ns.OPTIONS.ITEM_DESCRIPTION_SELECTOR);

        if (itemDescriptionSelector === false) {

            this.description = "";

            return this.description;
        }

        var itemDescription = this.getOption("itemDescription");

        if (typeof itemDescription !== "undefined") {

            this.description = itemDescription;

        } else {

            if (itemDescriptionSelector) {

                if (typeof itemDescriptionSelector === "function") {

                    this.description = itemDescriptionSelector.call(this.API);

                } else {

                    this.description = this.$source.find(itemDescriptionSelector).text();
                }

            } else {

                this.description = this.$source.attr("aria-description") ||
                    $("#" + this.$source.attr("aria-describedby")).text() ||
                    this.$source.find("p, [class*='description'], [class*='detail']").first().text() || "";
            }
        }

        return this.description;
    };

    Item.prototype.refreshSize = function () {

        this.width = this.$self.width();
        this.height = this.$self.height();

        this.gap = this.isFullSize() ? Math.abs(parseInt(this.$self.css("left") || 0) * 2) : 0;

        return this;
    };

    Item.prototype.transform = function (/*value, duration*/) {

        this.transformationController.transform.apply(this.transformationController, arguments);

        return this;
    };

    Item.prototype.translate = function (/*value, useCurrentScale, duration*/) {

        this.transformationController.translate.apply(this.transformationController, arguments);

        return this;
    };

    Item.prototype.translateByState = function (/*value, useCurrentScale, duration*/) {

        this.transformationController.translateByState.apply(this.transformationController, arguments);

        return this;
    };

    Item.prototype.scale = function (/*value, useCurrentTranslate, duration*/) {

        this.transformationController.scale.apply(this.transformationController, arguments);

        return this;
    };

    Item.prototype.getTranslate = function () {

        return this.transformationController.getTranslate.apply(this.transformationController, arguments);
    };

    Item.prototype.getScale = function () {

        return this.transformationController.getScale.apply(this.transformationController, arguments);
    };

    Item.prototype.getZoomScale = function () {

        return this.transformationController.getZoomScale.apply(this.transformationController, arguments);
    };

    Item.prototype.clearTransform = function (/*duration, done*/) {

        this.transformationController.clearTransform.apply(this.transformationController, arguments);

        return this;
    };

    Item.prototype.setOpacity = function (value, duration) {

        var CSS = {
            opacity: value
        };

        CSS[ns.TRANSITION_PROP + "Duration"] = duration ? duration + "s" : "";

        CSS[ns.TRANSITION_PROP] = duration ? "" : "none";

        if (duration && !ns.USE_TRANSITIONS) {

            if (typeof value !== "number") {

                CSS.opacity = 1;
            }

            CSS[ns.TRANSITION_PROP] = "none";

            this.$self.stop(OPACITY_QUEUE)
                .animate(CSS, {
                    queue: OPACITY_QUEUE,

                    easing: ns.JS_EASING,
                    duration: duration * 1000
                });

            this.$self.dequeue(OPACITY_QUEUE);

        } else {

            this.$self.css(CSS);
        }

        return this;
    };

    Item.prototype.getOpacity = function () {

        return +this.$self.css("opacity");
    };

    Item.prototype.clearOpacity = function (duration) {

        return this.setOpacity("", duration);
    };

    Item.prototype.setAsCurrent = function (duration, done) {

        this.prev = false;
        this.next = false;
        this.current = true;

        this.load();

        if (duration) {

            this.transformationController.clearTransform(duration, function () {

                done.call(this);

            }.bind(this));

        } else {

            if (ns.USE_TRANSITIONS) {

                this.transformationController.stopTransition();
            }
        }

        this.$self.removeClass(ns.CLASS.itemPrev)
            .removeClass(ns.CLASS.itemNext)
            .addClass(ns.CLASS.itemCurrent)
            .removeClass(ns.CLASS.itemAnim);

        var currentItemChangedEvent = new ns.EVENT.Event({
            item: this.API,
            index: this.getIndex()
        }, this.mjGallery);

        ns.EVENT.fire(ns.EVENT.currentItemChanged, currentItemChangedEvent, this.mjGallery);

        return this;
    };

    Item.prototype.setAsPrev = function (duration, done) {

        this.prev = true;
        this.next = false;
        this.current = false;

        this.load();

        if (this.isZoomedIn()) {

            this.zoom(1, undefined, duration, true);
        }

        if (duration) {

            if (ns.USE_TRANSITIONS) {

                this.$self.addClass(ns.CLASS.itemAnim);
            }

            this.transformationController.clearTransform(duration, function () {

                this.$self.removeClass(ns.CLASS.itemAnim);

                if (done) {

                    done.call(this);
                }

            }.bind(this));

        } else {

            this.$self.removeClass(ns.CLASS.itemAnim);

            if (ns.USE_TRANSITIONS) {

                this.transformationController.stopTransition();
            }
        }

        this.$self.removeClass(ns.CLASS.itemCurrent)
            .removeClass(ns.CLASS.itemNext)
            .addClass(ns.CLASS.itemPrev);

        return this;
    };

    Item.prototype.setAsNext = function (duration, done) {

        this.prev = false;
        this.next = true;
        this.current = false;

        this.load();

        if (this.isZoomedIn()) {

            this.zoom(1, undefined, duration, true);
        }

        if (duration) {

            if (ns.USE_TRANSITIONS) {

                this.$self.addClass(ns.CLASS.itemAnim);
            }

            this.transformationController.clearTransform(duration, function () {

                this.$self.removeClass(ns.CLASS.itemAnim);

                if (done) {

                    done.call(this);
                }

            }.bind(this));

        } else {

            this.$self.removeClass(ns.CLASS.itemAnim);

            if (ns.USE_TRANSITIONS) {

                this.transformationController.stopTransition();
            }
        }

        this.$self.removeClass(ns.CLASS.itemCurrent)
            .removeClass(ns.CLASS.itemPrev)
            .addClass(ns.CLASS.itemNext);

        return this;
    };

    Item.prototype.clearState = function () {

        this.prev = false;
        this.next = false;
        this.current = false;

        this.transformationController.clearTransform();

        this.unsetAsClosing();

        this.$self.removeClass(ns.CLASS.itemCurrent)
            .removeClass(ns.CLASS.itemPrev)
            .removeClass(ns.CLASS.itemNext)
            .removeClass(ns.CLASS.itemAnim);

        return this;
    };

    Item.prototype.setAsClosing = function (/*duration, dir, translate, scale*/) {

        this.transformationController.closeAnim.apply(this.transformationController, arguments);

        return this;
    };

    Item.prototype.unsetAsClosing = function () {

        this.$self.removeClass(ns.CLASS.itemClosingDown)
            .removeClass(ns.CLASS.itemClosingUp)
            .removeClass(ns.CLASS.itemClosingScale);

        var doneCSS = {
            opacity: ""
        };

        doneCSS[ns.TRANSFORM_PROP] = "";
        doneCSS[ns.TRANSITION_PROP + "Duration"] = "";
        doneCSS[ns.TRANSITION_PROP] = "";

        this.$self.stop()
            .css(doneCSS);

        return this;
    };

    Item.prototype.edgeAnim = function (/*dir, done*/) {

        this.transformationController.edgeAnim.apply(this.transformationController, arguments);

        return this;
    };

    Item.prototype.on = function (type, cb, off) {

        if (off) {

            this.$self.off(type + "." + NS);
        }

        this.$self.on(type + "." + NS, cb.bind(this));

        return this;
    };

    Item.prototype.one = function (type, cb, off) {

        if (off) {

            this.$self.off(type + "." + NS);
        }

        this.$self.one(type + "." + NS, cb.bind(this));

        return this;
    };

}(window.mjGallery, jQuery));
