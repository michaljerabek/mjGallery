/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery*/

(function (ns, $) {

    var API = [].concat(ns.Item.API),

        IframeAPI = function IframeAPI(item) {

            ns.Item.generateAPI.call(this, item, API);
        },

        TEMPLATE = function (data) {

            data = data || {};

            return "<iframe src=\"" + (data.src || "") + "\" scrolling=\"yes\" frameborder=\"0\" allowfullscreen mozallowfullscreen webkitallowfullscreen class=\"" + ns.CLASS.itemContent + " " + ns.CLASS.draggable + " " + ns.CLASS.iframe + "\"></iframe>";
        },

        IframeItem = ns.IframeItem = function IframeItem($source, mjGallery, index) {

            this.type = ns.Item.TYPE.IFRAME;

            ns.Item.call(this, $source, mjGallery, index, IframeAPI);
        };

    ns.Item.extend("IFRAME", "iframe", IframeItem, function (src) {

        src = String(src);

        return src.match(/^(?:https?:)?(?:\/\/)?(?:www\.)?(google\.[a-z]+|goo\.gl)\/maps/);
    });


    IframeItem.prototype.generateContent = function () {

        this.$content = $(TEMPLATE());

        return this;
    };

    IframeItem.prototype.getIframe = function () {

        return this.$content;
    };

    IframeItem.prototype.load = function () {

        if (this.loaded || this.loading || this.isEmpty()) {

            return this;
        }

        this.$content.attr("src", this.getSrcAttr());

        this.loading = true;

        this.$content.off(this.mjGallery.withNS("load"))
            .one(this.mjGallery.withNS("load"), function () {

                this.setAsLoaded();

                this.fireLoadEvent();

                setTimeout(this.refreshSize.bind(this), 0);

            }.bind(this));

        return this;
    };

}(window.mjGallery, jQuery));
