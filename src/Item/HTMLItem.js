/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery*/

(function (ns, $) {

    var API = ["getHTML", "getMethod"].concat(ns.Item.API),

        HTMLAPI = function HTMLAPI(item) {

            ns.Item.generateAPI.call(this, item, API);
        },

        TEMPLATE = function () {

            return [
                "<div class=\"" + ns.CLASS.itemContent + " " + ns.CLASS.html + "\">",
                    "<div class=\"" + ns.CLASS.itemHtmlContentCenter + "\">",
                        "<div class=\"" + ns.CLASS.itemHtmlContentWrapper + " " + ns.CLASS.draggable + "\">",

                            //CONTENT

                        "</div>",
                    "</div>",
                "</div>"
            ].join("");
        },

        HTMLItem = ns.HTMLItem = function HTMLItem($source, mjGallery, index, preload) {

            this.type = ns.Item.TYPE.HTML;

            ns.Item.call(this, $source, mjGallery, index, preload, HTMLAPI);
        };

    ns.Item.extend("HTML", "html", HTMLItem, function (src, type) {

        return !src && (!type || type === ns.Item.TYPE.IMAGE);
    });


    HTMLItem.METHOD = {
        APPEND: "append",
        CLONE: "clone",
        GENERATE: "generate"
    };


    HTMLItem.prototype.generateContent = function () {

        this.$content = $(TEMPLATE());

        this.$wrapper = this.$content.find(ns.CLASS.selector("itemHtmlContentWrapper"));

        return this;
    };

    HTMLItem.prototype.isScrollable = function ($scrollable) {

        return ns.Item.prototype.isScrollable.call(this, $scrollable) || this.$wrapper[0].offsetHeight !== this.$wrapper[0].scrollHeight || this.$wrapper[0].offsetWidth !== this.$wrapper[0].scrollWidth;
    };

    HTMLItem.prototype.getIframe = function () {

        if (this.iframe) {

            return this.$iframe;
        }

        this.$iframe = this.$iframe || this.$self.find("iframe");

        if (!this.$iframe && !this.$iframe.length) {

            this.$iframe = null;
        }

        return this.$iframe;
    };

    HTMLItem.prototype.considerEventAsOnOverlay = function (event) {

        var $target = ns.$t(event.target);

        return ns.Item.prototype.considerEventAsOnOverlay.call(this, event) || $target.hasClass(ns.CLASS.itemHtmlContentCenter) || $target.hasClass(ns.CLASS.html);
    };

    HTMLItem.prototype.shouldPreserveEvent = function (type, event) {

        var events = this.getOption("events") || "",

            onWrapper = !!ns.$t(event.target).closest(ns.CLASS.selector("itemHtmlContentWrapper")).length,

            $scrollable = ns.$t(event.target).closest(ns.DATA.selector("scrollable", true)),

            onScrollable = !!$scrollable.length;

        //není nastaveno zachování událostí u položky a k události došlo na wrapperu nebo scrollovatelném elementu (data-mjg-scrollable)
        if (!events && !this.mjGallery.getOptions().getOriginal(ns.OPTIONS.PRESERVE_EVENTS) && (onWrapper || onScrollable || this.isViewScrollable())) {

            //obsah je scrollovatelný a event je SCROLL nebo dotek (= scrollovaní na dotykovém zařízení)
            if (this.isScrollable($scrollable) && (type === ns.EVENTS.SCROLL || (/touch/.test(event.type) && type === ns.EVENTS.POINTER && event.originalEvent.touches.length !== 2))) {

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

        return event.isDefaultPrevented() || (events !== ns.EVENTS.NONE && (events === ns.EVENTS.ALL || ~events.indexOf(type)));
    };

    HTMLItem.prototype.getHTML = function (done) {

        if (typeof this.$html !== "undefined") {

            return this.$html;
        }

        if (~[HTMLItem.METHOD.APPEND, HTMLItem.METHOD.CLONE].indexOf(this.getMethod())) {

            this.$html = $(this.getSrcAttr());

            if (this.$html[0].tagName.toLowerCase() === "script") {

                this.$html = $(this.$html.html());
            }

            if (this.getMethod() === HTMLItem.METHOD.CLONE) {

                this.$html = this.$html.clone();
            }

            this.$html.css("display", "");

            if (done) {

                done(this.$html);
            }

        } else if (this.mjGallery.getOption(ns.OPTIONS.HTML_GENERATOR)) {

            this.mjGallery.getOption(ns.OPTIONS.HTML_GENERATOR).call(this.getAPI(), done, this.getAPI());

            this.$html = $([null]);
        }

        return this.$html;
    };

    HTMLItem.prototype.addSizesToContent = function () {

        if (!this.$content) {

            return;
        }

        if (!this.contentSizes) {

            this.getContentSizes();
        }

        this.$content.find(ns.CLASS.selector("itemHtmlContentWrapper")).css(this.contentSizes);

        return this;
    };

    HTMLItem.prototype.getMethod = function () {

        if (typeof this.method !== "undefined") {

            return this.method;
        }

        this.method = this.$source.data(ns.DATA.method) || this.mjGallery.getOption(ns.OPTIONS.HTML_GENERATE_METHOD);

        this.method = this.method ? this.method.toLowerCase() : this.getSrcAttr() ? HTMLItem.METHOD.APPEND : HTMLItem.METHOD.GENERATE;

        return this.method;
    };

    HTMLItem.prototype.appendContent = function (content) {

        this.$wrapper.append(content);

        return this;
    };

    HTMLItem.prototype.load = function () {

        if (this.loaded || this.loading || this.isEmpty()) {

            return this;
        }

        this.loading = true;

        this.getHTML(function ($html) {

            if ($html) {

                this.$html = $html.jquery ? $html : $($html);
            }

            this.appendContent(this.$html);

            this.setAsLoaded();

            this.refreshSize();

            this.fireLoadEvent();

        }.bind(this));

        return this;
    };

}(window.mjGallery, jQuery));
