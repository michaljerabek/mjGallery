/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery*/

(function (ns, $) {

    var API = ["getSrcset", "getSizes"].concat(ns.Item.API),

        ImageAPI = function ImageAPI(item) {

            ns.Item.generateAPI.call(this, item, API);
        },

        TEMPLATE = function (data) {

            data = data || {};

            return "<img src=\"" + (data.src || "") + "\" srcset=\"" + (data.srcset || "") + "\" sizes=\"" + (data.sizes || "") + "\" alt=\"" + (data.alt || "") + "\" class=\"" + ns.CLASS.itemContent + " " + ns.CLASS.draggable + " " + ns.CLASS.image + "\">";
        },

        ImageItem = ns.ImageItem = function ImageItem($source, mjGallery, index) {

            this.type = ns.Item.TYPE.IMAGE;

            this.zoomable = true;

            ns.Item.call(this, $source, mjGallery, index, ImageAPI);
        };

    ns.Item.extend("IMAGE", "image", ImageItem, function (src, type) {

        return !type;
    });


    ImageItem.prototype.generateContent = function () {

        this.$content = $(TEMPLATE({
            alt: this.getTitle(),
            sizes: this.getSizesAttr()
        }));

        return this;
    };

    ImageItem.prototype.load = function () {

        if (this.loaded || this.loading || this.isEmpty()) {

            return this;
        }

        this.$content.attr({
            srcset: this.getSrcsetAttr(),
            src: this.getSrcAttr()
        });

        if (this.$content[0].complete && this.$content[0].naturalHeight !== 0) {

            this.setAsLoaded();

            this.fireLoadEvent();
        }

        if (this.loaded) {

            this.setAsLoaded();

            this.refreshSize();

            return this;
        }

        this.loading = true;

        this.$content.off(this.mjGallery.withNS("load"))
            .one(this.mjGallery.withNS("load"), function () {

                this.setAsLoaded();

                this.fireLoadEvent();

                setTimeout(this.refreshSize.bind(this), 0);

            }.bind(this));

        return this;
    };

    ImageItem.prototype.getSrcsetAttr = function () {

        return this.getOption("srcset") || "";
    };

    ImageItem.prototype.getSizesAttr = function () {

        var imgSizes = this.getOption("sizes");

        if (!imgSizes) {

            this.getContentSizes();

            if (this.contentSizes.maxWidth) {

                imgSizes = parseFloat(this.contentSizes.maxWidth) + "%";

            } else {

                imgSizes = this.mjGallery.getOption(ns.OPTIONS.FULL_SIZE_ITEMS) ? "100%" : ns.NOT_FULL_SIZE_ITEMS_WIDTH + "%";
            }
        }

        return imgSizes;
    };

}(window.mjGallery, jQuery));
