/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery*/

(function (ns, $) {

    var OPACITY_QUEUE = "opacity." + ns.NS,
        TRANSFORM_QUEUE = "transform." + ns.NS,

        ItemTransformationJSController = ns.ItemTransformationJSController = function ItemTransformationJSController(item, mjGallery) {

            ns.ItemTransformationController.call(this, item, mjGallery);
        };

    ns.extend(ns.ItemTransformationJSController, ns.ItemTransformationController);


    ItemTransformationJSController.prototype.fitZoom = function (done) {

        var result = this.prepareFitZoom();

        if (!result) {

            this.$zoom.stop();

            if (done) {

                done.call(this.item);
            }

            return this;
        }

        var currentScale = ns.getScale(this.$zoom),

            jsCSS = {
                textIndent: 0
            };

        this.$zoom.css(jsCSS)
            .stop()
            .animate({ textIndent: 1 }, {

                easing: ns.JS_EASING,

                duration: 250,

                step: function (step) {

                    var stepCSS = {};

                    stepCSS[ns.TRANSFORM_PROP] = ns.getTransformValue({
                        translate: [
                            result.currentTranslate.x + ((result.translate[0] - result.currentTranslate.x) * step),
                            result.currentTranslate.y + ((result.translate[1] - result.currentTranslate.y) * step)
                        ],
                        scale: [currentScale.x]
                    });

                    this.$zoom.css(stepCSS);

                }.bind(this),

                done: function () {

                    if (done) {

                        done.call(this.item);
                    }
                }.bind(this)
            });

        return this;
    };


    ItemTransformationJSController.prototype.zoomAnim = function (CSS, zoom, duration, translate, endTranslate, done) {

        var currentScale = ns.getScale(this.$zoom),

            jsCSS = {
                textIndent: 0
            };

        this.$zoom.css(jsCSS)
            .stop()
            .animate({ textIndent: 1 }, {

                easing: ns.JS_EASING,

                duration: typeof duration === "number" ? duration * 1000 : 250,

                step: function (step) {

                    var stepCSS = {};

                    stepCSS[ns.TRANSFORM_PROP] = ns.getTransformValue({
                        translate: [
                            translate[0] + ((endTranslate[0] - translate[0]) * step),
                            translate[1] + ((endTranslate[1] - translate[1]) * step)
                        ],
                        scale: [currentScale.x + ((zoom - currentScale.x) * step)]
                    });

                    this.$zoom.css(stepCSS);

                }.bind(this),

                done: function () {

                    if (done) {

                        done.call(this.item);
                    }

                    var zoomEvent = new ns.EVENT.Event({
                        current: this.item.getAPI(),
                        zoom: this.zoomValue,
                        zoomedIn: this.isZoomedIn()
                    }, this.mjGallery);

                    ns.EVENT.fire(ns.EVENT.zoom, zoomEvent, this.mjGallery);

                }.bind(this)
            });

        return this;
    };

    ItemTransformationJSController.prototype.clearTransform = function (duration, done) {

        var CSS = {};

        CSS[ns.TRANSITION_PROP] = "none";

        if (!duration) {

            CSS[ns.TRANSFORM_PROP] = "";

            this.item.get().css(CSS);

            if (done) {

                done.call(this.item);
            }

            return this;
        }

        var translate = this.getTranslate(),
            scale = this.getScale();

        CSS.textIndent = 1;

        this.item.get().css(CSS);

        this.item.get().stop(TRANSFORM_QUEUE)
            .animate({ textIndent: 0 }, {

                queue: TRANSFORM_QUEUE,

                easing: ns.JS_EASING,
                duration: duration ? duration * 1000 : ns.DEF_DURATION,

                step: function (step) {

                    var stepCSS = {};

                    if (this.item.isPrev()) {

                        stepCSS[ns.TRANSFORM_PROP] = ns.getTransformValue({
                            translate: [
                                -this.item.width + ((this.item.width + translate.x) * step), translate.y * step
                            ],
                            scale: [scale.x + ((1 - scale.x) * (1 - step))]
                        });

                    } else if (this.item.isNext()) {

                        stepCSS[ns.TRANSFORM_PROP] = ns.getTransformValue({
                            translate: [
                                this.item.width + ((translate.x - this.item.width) * step), translate.y * step
                            ],
                            scale: [scale.x + ((1 - scale.x) * (1 - step))]
                        });

                    } else if (this.item.isCurrent()) {

                        stepCSS[ns.TRANSFORM_PROP] = ns.getTransformValue({
                            translate: [
                                translate.x * step, translate.y * step
                            ],
                            scale: [scale.x + ((1 - scale.x) * (1 - step))]
                        });
                    }

                    this.item.get().css(stepCSS);

                }.bind(this),

                done: done ? done.bind(this.item) : null
            });

        this.item.get().dequeue(TRANSFORM_QUEUE);

        return this;
    };

    ItemTransformationJSController.prototype.edgeAnim = function (dir, done) {

        if (!this.item.isCurrent()) {

            return this;
        }

        var CSS = {},

            className = ns.CLASS["itemEdgeAnim" + (dir === ns.DIR.RIGHT ? "Right" : "Left")];

        CSS[ns.TRANSFORM_PROP] = "";

        CSS[ns.TRANSITION_PROP] = "none";

        CSS.textIndent = 0;

        this.item.get().css(CSS)
            .addClass(className);

        var translate = this.getTranslate();

        this.item.get().css(CSS)
            .stop(TRANSFORM_QUEUE)
            .animate({ textIndent: 1 }, {

                queue: TRANSFORM_QUEUE,

                easing: ns.JS_EASING,
                duration: ns.EDGE_ANIM_START_DURATION,

                step: function (step) {

                    var stepCSS = {};

                    stepCSS[ns.TRANSFORM_PROP] = ns.getTransformValue({
                        translate: [translate.x * step],
                        scale: [1]
                    });

                    this.item.get().css(stepCSS);

                }.bind(this),

                done: function () {

                    this.item.get().removeClass(className);

                    this.clearTransform(ns.DEF_DURATION / 1000, done);

                }.bind(this)
            });

        this.item.get().dequeue(TRANSFORM_QUEUE);

        return this;
    };

    ItemTransformationJSController.prototype.closeAnim = function (duration, dir, translate, scale) {

        var CSS = {},

            selfTranslate = this.getTranslate(),
            selfScale = this.getScale();

        CSS.textIndent = 1;

        CSS.opacity = this.item.getOpacity();

        this.item.get().css(CSS)
            .stop(TRANSFORM_QUEUE)
            .stop(OPACITY_QUEUE)
            .animate({ textIndent: 0 }, {

                easing: ns.JS_EASING,
                duration: duration ? duration * 1000 : ns.DEF_DURATION,

                step: function (step) {

                    var stepCSS = {
                            opacity: translate ?
                                CSS.opacity - (CSS.opacity * (1 - ((step / 0.25   ) - 3))) :
                                CSS.opacity - (CSS.opacity * (1 - ((step / 0.33333) - 2)))
                        },

                        itemHalfHeight = this.item.height / 2,

                        translateY = dir === ns.DIR.UP ?
                            -itemHalfHeight + ((itemHalfHeight + selfTranslate.y) * step) :
                            itemHalfHeight + ((selfTranslate.y - itemHalfHeight) * step);

                        stepCSS.opacity = Math.min(1, Math.max(0, stepCSS.opacity));

                        stepCSS[ns.TRANSFORM_PROP] = ns.getTransformValue({
                            translate: [0, translate ? translateY : 0],
                            scale: [scale ? selfScale.x - ((selfScale.x - 0.33333) * (1 - step)) : 1]
                        });

                        this.item.get().css(stepCSS);

                }.bind(this)
            });

        if (translate) {

            this.item.get().addClass(ns.CLASS["itemClosing" + (dir === ns.DIR.UP ? "Up" : "Down")]);
        }

        if (scale) {

            this.item.get().addClass(ns.CLASS.itemClosingScale);
        }

        return this;
    };


}(window.mjGallery, jQuery));
