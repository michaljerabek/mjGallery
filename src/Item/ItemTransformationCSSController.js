/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery*/

(function (ns, $) {

    var ItemTransformationCSSController = ns.ItemTransformationCSSController = function ItemTransformationCSSController(item, mjGallery) {

        ns.ItemTransformationController.call(this, item, mjGallery);
    };

    ns.extend(ns.ItemTransformationCSSController, ns.ItemTransformationController);


    ItemTransformationCSSController.prototype.fitZoom = function (done) {

        var result = this.prepareFitZoom();

        if (!result) {

            this.$zoom.stop();

            if (done) {

                done.call(this.item);
            }

            return this;
        }

        this.$zoom.off(this.mjGallery.withNS(ns.TRANSITIONEND + ".fitZoom"));

        if (done) {

            this.$zoom.one(this.mjGallery.withNS(ns.TRANSITIONEND + ".fitZoom"), function () {

                    if (done) {

                        done.call(this.item);
                    }
                }.bind(this));

            this.$zoom.stop().css(result.CSS);

        } else {

            this.$zoom.stop().css(result.CSS);
        }

        return this;
    };

    ItemTransformationCSSController.prototype.zoomAnim = function (CSS, zoom, duration, translate, endTranslate, done) {

        var zoomEvent = new ns.EVENT.Event({
            current: this.item.getAPI(),
            zoom: this.zoomValue,
            zoomedIn: this.isZoomedIn()
        }, this.mjGallery);

        CSS[ns.TRANSITION_PROP] = "";
        CSS[ns.TRANSITION_PROP + "Duration"] = typeof duration === "number" ? duration + "s" : "";

        this.$zoom.off(this.mjGallery.withNS(ns.TRANSITIONEND + ".zoom"))
            .one(this.mjGallery.withNS(ns.TRANSITIONEND + ".zoom"), function () {

                if (done) {

                    done.call(this.item);
                }

                ns.EVENT.fire(ns.EVENT.zoom, zoomEvent, this.mjGallery);

            }.bind(this));

        this.$zoom.stop().css(CSS);

        return this;
    };

    ItemTransformationCSSController.prototype.clearTransform = function (duration, done) {

        var CSS = {};

        CSS[ns.TRANSITION_PROP] = duration ? "" : "none";

        CSS[ns.TRANSITION_PROP + "Duration"] = duration ? duration + "s" : "";

        CSS[ns.TRANSFORM_PROP] = "";

        if (duration && done) {

            this.item.on(this.mjGallery.withNS(ns.TRANSITIONEND), function (event) {

                if (event.originalEvent.propertyName.match(/transform/i)) {

                    this.item.get().off(this.mjGallery.withNS(ns.TRANSITIONEND));

                    done.call(this.item);
                }

            }.bind(this), true);
        }

        this.item.get().css(CSS);

        if (!duration && done) {

            done.call(this.item);
        }

        return this;
    };

    ItemTransformationCSSController.prototype.setTransition = function (value) {

        var CSS = {};

        CSS[ns.TRANSITION_PROP] = value;

        this.item.get().css(CSS);

        return this;
    };

    ItemTransformationCSSController.prototype.clearTransition = function (duration) {

        if (duration) {

            this.clearTransitionDuration();
        }

        return this.setTransition("");
    };

    ItemTransformationCSSController.prototype.stopTransition = function (duration) {

        if (duration) {

            this.setTransitionDuration(0);
        }

        return this.setTransition("none");
    };

    ItemTransformationCSSController.prototype.setTransitionDuration = function (value) {

        var CSS = {};

        value = typeof value === "number" ? value + "s" : value;

        CSS[ns.TRANSITION_PROP + "Duration"] = value;

        this.item.get().css(CSS);

        return this;
    };

    ItemTransformationCSSController.prototype.clearTransitionDuration = function () {

        return this.setTransitionDuration("");
    };

    ItemTransformationCSSController.prototype.edgeAnim = function (dir, done) {

        if (!this.item.isCurrent()) {

            return this;
        }

        var CSS = {},

            className = ns.CLASS["itemEdgeAnim" + (dir === ns.DIR.RIGHT ? "Right" : "Left")];

        CSS[ns.TRANSFORM_PROP] = "";

        CSS[ns.TRANSITION_PROP] = "";
        CSS[ns.TRANSITION_PROP + "Duration"] = (ns.EDGE_ANIM_START_DURATION / 1000) + "s";

        this.item.get().css(CSS)
            .addClass(className);

        this.item.one(this.mjGallery.withNS(ns.TRANSITIONEND), function () {

            this.item.get().removeClass(className);

            this.clearTransform(ns.DEF_DURATION / 1000, done);

        }.bind(this), true);

        return this;
    };

    ItemTransformationCSSController.prototype.closeAnim = function (duration, dir, translate, scale) {

        this.clearTransform()
            .setTransition(duration ? ns.TRANSFORM_PREFIX + "transform " + duration + "s, opacity " + (duration / 4) + "s" : "");

        if (translate) {

            this.item.get().addClass(ns.CLASS["itemClosing" + (dir === ns.DIR.UP ? "Up" : "Down")]);
        }

        if (scale) {

            this.item.get().addClass(ns.CLASS.itemClosingScale);
        }

        return this;
    };


}(window.mjGallery, jQuery));
