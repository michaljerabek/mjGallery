/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery*/

(function (ns, $) {

    var ItemTransformationController = ns.ItemTransformationController = function ItemTransformationController(item, mjGallery) {

            if (this.constructor === ns.ItemTransformationController) {

                throw "ItemTransformationController is an abstract class!";
            }

            this.mjGallery = mjGallery;

            this.item = item;

            this.zoomValue = 1;

            this.$zoom = item.getZoom();
        };


    ItemTransformationController.prototype.getZoomRect = function () {

        return this.$zoom[0].getBoundingClientRect();
    };

    ItemTransformationController.prototype.getContentRect = function () {

        return this.item.getContent()[0].getBoundingClientRect();
    };

    ItemTransformationController.prototype.prepareFitZoom = function () {

        if (this.zoomValue === 1) {

            return null;
        }

        var translate = this.calcFitZoomTranslate(),
            currentTranslate = ns.getTranslate(this.$zoom),

            CSS = {};

        if (currentTranslate.x === translate[0] && currentTranslate.y === translate[1]) {

            return null;
        }

        CSS[ns.TRANSITION_PROP + "Duration"] = "";
        CSS[ns.TRANSITION_PROP] = "";

        CSS[ns.TRANSFORM_PROP] = ns.getTransformValue({
            translate: translate,
            scale: [this.zoomValue]
        });

        return {
            CSS: CSS,
            translate: translate,
            currentTranslate: currentTranslate
        };
    };

    ItemTransformationController.prototype.fitZoom = function (/*done*/) {

        throw "Implement fitZoom!";
    };

    ItemTransformationController.prototype.calcFitZoomTranslate = function () {

        var contentRect = this.getContentRect(),
            zoomRect = this.getZoomRect(),

            zoomTranslate = ns.getTranslate(this.$zoom),

            translate = [],

            centerHor = ((zoomRect.width - this.item.width) / -2) - zoomRect.left,
            centerVer = ((zoomRect.height - this.item.height) / -2) - zoomRect.top;

        //obsah je menší než šířka okna -> zarovnat horizontálně do středu
        if (contentRect.width < this.item.width - this.item.gap) {

            translate.push(centerHor + zoomTranslate.x - (this.item.gap / 2));

        //obsah je větší než šířka okna a není na levé/pravé hraně (ani ji nepřesahuje) -> zarovnat k levé/pravé hraně
        } else if (contentRect.left > 0 || contentRect.right < this.item.width - this.item.gap) {

            var edgeHor = ((this.item.width - contentRect.width) / 2);

            if (contentRect.left > 0) {

                edgeHor *= -1;

            } else if (contentRect.right < this.item.width - this.item.gap) {

                edgeHor -= this.item.gap;
            }

            translate.push(centerHor + edgeHor + zoomTranslate.x);

        //obsah vyplňuje celé okno našířku
        } else {

            translate.push(zoomTranslate.x);
        }

        //obsah je menší než výška okna -> zarovnat vertikálně do středu
        if (contentRect.height < this.item.height) {

            translate.push(centerVer + zoomTranslate.y);

        //obsah je větší než výška okna a není na horní/dolní hraně (ani ji nepřesahuje) -> zarovnat k horní/dolní hraně
        } else if (contentRect.top > 0 || contentRect.bottom < this.item.height) {

            var edgeVer = ((this.item.height - contentRect.height) / 2);

            if (contentRect.top > 0) {

                edgeVer *= -1;
            }

            translate.push(centerVer + edgeVer + zoomTranslate.y);

        //obsah vyplňuje celé okno navýšku
        } else {

            translate.push(zoomTranslate.y);
        }

        translate[0] = Math.round(translate[0]);
        translate[1] = Math.round(translate[1]);

        return translate;
    };

    ItemTransformationController.prototype.setOrigin = function (origin) {

        var CSS = {},

            currentTranslate = ns.getTranslate(this.$zoom),
            translate = [currentTranslate.x, currentTranslate.y],

            offset = null;

        if (this.isZoomedIn()) {

            CSS[ns.TRANSFORM_PROP] = ns.getTransformValue({
                translate: translate,
                scale: [this.zoomValue]
            });

            offset = this.$zoom.offset();
        }

        CSS[ns.TRANSITION_PROP + "Duration"] = "none";
        CSS[ns.TRANSITION_PROP] = "none";

        CSS[ns.TRANSFORM_PROP + "Origin"] = origin.x + "% " + origin.y + "%";

        this.$zoom.stop().css(CSS);

        if (this.isZoomedIn()) {

            this.$zoom.offset(offset);
        }

        return this;
    };

    ItemTransformationController.prototype.isZoomedIn = function () {

        return this.item.isZoomable() && this.zoomValue > 1;
    };

    ItemTransformationController.prototype.zoomAnim = function (/*CSS, zoom, duration, translate, endTranslate, done*/) {

        throw "Implement zoomAnim!";
    };

    ItemTransformationController.prototype.zoom = function (zoom, origin, animate, fit, done) {

        if (typeof zoom !== "undefined") {

            if (this.item.isZoomable()) {

                clearTimeout(this.zoomAnimTimeout);
                this.$zoom.off(this.mjGallery.withNS(ns.TRANSITIONEND + ".zoom"));

                origin = typeof origin === "undefined" ? {x: 50, y: 50} : origin;

                var CSS = {},

                    currentTranslate = ns.getTranslate(this.$zoom),
                    translate = [currentTranslate.x, currentTranslate.y];

                CSS[ns.TRANSITION_PROP] = "none";
                CSS[ns.TRANSITION_PROP + "Duration"] = "none";

                //při prvním doteku se přenastavý bod zvětšování (origin)
                //pro zachování bodu je potřeba, aby origin by definovám a byl falsy
                if (origin) {

                    this.setOrigin(origin);
                }

                if (animate) {

                    //nejdříve je potřeba zjistit velikost po dokončení animace, aby se mohl obrázek vycentrovat
                    if (fit) {

                        var endZoomCSS = {};

                        endZoomCSS[ns.TRANSFORM_PROP] = ns.getTransformValue({
                            translate: translate,
                            scale: [zoom]
                        });

                        this.$zoom.css(endZoomCSS);
                    }

                    var endTranslate = fit ? this.calcFitZoomTranslate() : translate;

                    //zjistí se vycentrovaná pozice (má-li se centrovat)
                    CSS[ns.TRANSFORM_PROP] = ns.getTransformValue({
                        translate: endTranslate,
                        scale: [zoom]
                    });

                    //vrátí se počáteční pozice
                    if (fit) {

                        var backToCurrrentCSS = {};

                        backToCurrrentCSS[ns.TRANSFORM_PROP] = ns.getTransformValue({
                            translate: translate,
                            scale: [this.zoomValue]
                        });

                        this.$zoom.css(backToCurrrentCSS);
                    }

                    this.zoomAnimTimeout = setTimeout(this.zoomAnim.bind(this, CSS, zoom, animate, translate, endTranslate, done), 35);

                } else {

                    CSS[ns.TRANSFORM_PROP] = ns.getTransformValue({
                        translate: translate,
                        scale: [zoom]
                    });

                    this.$zoom.css(CSS);

                    if (done) {

                        done.call(this.item);
                    }

                    var zoomEvent = new ns.EVENT.Event({
                        current: this.item.getAPI(),
                        zoom: zoom,
                        zoomedIn: zoom > 1
                    }, this.mjGallery);

                    ns.EVENT.fire(ns.EVENT.zoom, zoomEvent, this.mjGallery);
                }

                this.zoomValue = zoom;
            }

            return this;
        }

        return this.zoomValue;
    };

    ItemTransformationController.prototype.translateZoomBy = function (diff, duration, returnDiff) {

        var CSS = {},

            translate = [],

            contentRect = this.getContentRect(),
            zoomRect = this.getZoomRect(),

            zoomTranslate = ns.getTranslate(this.$zoom),

            maxMoveX = ns.GET_MAX_MOVE_OVER(),
            maxMoveY = maxMoveX,

            diffX = diff[0],
            diffY = diff[1],

            moveUp = diffY < 0,
            moveRight = diffX > 0,

            edgeX = false,
            edgeY = false;

        //obsah je menší než šířka okna
        if (contentRect.width <= this.item.width - this.item.gap) {

            var edgeHor = zoomRect.left + zoomRect.right - this.item.width + this.item.gap;

            if (!moveRight) {

                edgeHor *= -1;
            }

            //obsah se posouvá od levé/pravé hrany
            if (edgeHor > 0) {

                diffX = diffX * (1 - (Math.min(maxMoveX, Math.abs(edgeHor)) / (maxMoveX)));

                edgeX = true;
            //else: obsah se posouvá do středu
            }
        //obsah je větší než šířka okna a obsah se posouvá od levé/pravé hrany
        } else if ((contentRect.left > 0 && moveRight) || (contentRect.right < this.item.width - this.item.gap && !moveRight)) {

            diffX = diffX * (1 - (Math.min(maxMoveX, Math.abs(moveRight ? contentRect.left : contentRect.right - this.item.width - (this.item.gap / 2))) / (maxMoveX)));

            edgeX = true;
        //else: obsah vyplňuje celé okno našířku
        }

        translate[0] = zoomTranslate.x + diffX;

        //obsah je menší než výška okna
        if (contentRect.height <= this.item.height) {

            var edgeVer = zoomRect.top + zoomRect.bottom - this.item.height;

            if (moveUp) {

                edgeVer *= -1;
            }

            //obsah se posouvá od horní/dolní hrany
            if (edgeVer > 0) {

                diffY = diffY * (1 - (Math.min(maxMoveY, Math.abs(edgeVer)) / (maxMoveY)));

                edgeY = true;
            //else: obsah se posouvá do středu
            }

        //obsah je větší než výška okna a obsah se posouvá od horní/dolní hrany
        } else if ((contentRect.top > 0 && !moveUp) || (contentRect.bottom < this.item.height && moveUp)) {

            diffY = diffY * (1 - (Math.min(maxMoveY, Math.abs(!moveUp ? contentRect.top : contentRect.bottom - this.item.height)) / (maxMoveY)));

            edgeY = true;
        //else: obsah vyplňuje celé okno navýšku
        }

        translate[1] = zoomTranslate.y + diffY;

        CSS[ns.TRANSITION_PROP] = duration ? ns.TRANSFORM_PREFIX + "transform linear" : "none";
        CSS[ns.TRANSITION_PROP + "Duration"] = duration ? duration + "s" : "none";

        CSS[ns.TRANSFORM_PROP] = ns.getTransformValue({
            translate: translate,
            scale: [this.zoomValue]
        });

        if (this.stopJQAnimIfTranslated && !this.translateZoomByCalledBySlideZoom) {

            this.$zoom.stop();
        }

        this.$zoom.css(CSS);

        if (returnDiff) {

            return {
                x: diffX,
                y: diffY,
                edge: edgeX && edgeY
            };
        }

        return this;
    };

    ItemTransformationController.prototype.slideZoom = function (diff, done) {

        var CSS = {
                textIndent: 0
            },

            contentRect = this.getContentRect(),

            diffX = diff[0],
            diffY = diff[1],

            maxOver = ns.GET_MAX_MOVE_OVER(),

            endDiffX = diffX * 3 * Math.max(1, Math.abs(diffX / 100)),
            endDiffY = diffY * 3 * Math.max(1, Math.abs(diffY / 100)),

            movedDiffX = 0,
            movedDiffY = 0;

        endDiffX = Math.min(Math.abs(endDiffX), Math.abs(contentRect.width - (diffX > 0 ? contentRect.right : -contentRect.left + this.item.width - this.item.gap) + maxOver));
        endDiffY = Math.min(Math.abs(endDiffY), Math.abs(contentRect.height - (diffY > 0 ? contentRect.bottom : -contentRect.top + this.item.height) + maxOver));

        var duration = Math.abs(endDiffX > endDiffY ? endDiffX : endDiffY);

        duration = Math.max(ns.MIN_DURATION / 1.5, Math.min(duration, ns.MAX_DURATION / 1.5));

        endDiffX *= diffX < 0 ? -1 : 1;
        endDiffY *= diffY < 0 ? -1 : 1;

        this.stopJQAnimIfTranslated = true;

        this.$zoom.stop()
            .css(CSS)
            .animate({textIndent: 1}, {
                duration: duration,
                easing: "easeOutQuart",

                step: function (step) {

                    var x = (Math.abs(endDiffX) * step) - Math.abs(movedDiffX),
                        y = (Math.abs(endDiffY) * step) - Math.abs(movedDiffY);

                    x *= diffX < 0 ? -1 : 1;
                    y *= diffY < 0 ? -1 : 1;

                    this.translateZoomByCalledBySlideZoom = true;

                    var endDiff = this.translateZoomBy([x, y], null, true);

                    this.translateZoomByCalledBySlideZoom = false;

                    movedDiffX += x;
                    movedDiffY += y;

                    //ukončit animaci, pokud je pohyb menší jak 1px a obrázek je posunutý od kraje
                    if (endDiff.edge && Math.abs(endDiff.x) < 1 && Math.abs(endDiff.y) < 1 && step > 0.5) {

                        this.$zoom.stop();

                        this.fitZoom(done);

                        this.stopJQAnimIfTranslated = false;
                    }

                }.bind(this),

                done: function () {

                    this.fitZoom(done);

                    this.stopJQAnimIfTranslated = false;

                }.bind(this)
            });
    };

    ItemTransformationController.prototype.transform = function (value, duration) {

        var CSS = {};

        CSS[ns.TRANSITION_PROP + "Duration"] = duration ? duration + "s" : "";

        CSS[ns.TRANSITION_PROP] = duration ? "" : "none";

        CSS[ns.TRANSFORM_PROP] = ns.getTransformValue(value);

        this.item.get().css(CSS);

        return this;
    };

    ItemTransformationController.prototype.translate = function (value, useCurrentScale, duration) {

        var CSS = {},

            scale = useCurrentScale ?  this.getScale() : null;

        CSS[ns.TRANSITION_PROP + "Duration"] = duration ? duration + "s" : "";

        CSS[ns.TRANSITION_PROP] = duration ? "" : "none";

        CSS[ns.TRANSFORM_PROP] = ns.getTransformValue({
            translate: value,
            scale: scale ? [scale.x, scale.y] : [1]
        });

        this.item.get().css(CSS);

        return this;
    };

    ItemTransformationController.prototype.translateByState = function (value, useCurrentScale, duration) {

        value[0] = this.item.isCurrent() ? value[0] : this.item.isPrev() ? -this.item.width + value[0] : this.item.width + value[0];

        return this.translate(value, useCurrentScale, duration);
    };

    ItemTransformationController.prototype.scale = function (value, useCurrentTranslate, duration) {

        var CSS = {},

            translate = useCurrentTranslate ?  this.getTranslate() : null;

        CSS[ns.TRANSITION_PROP + "Duration"] = duration ? duration + "s" : "";

        CSS[ns.TRANSITION_PROP] = duration ? "" : "none";

        CSS[ns.TRANSFORM_PROP] = ns.getTransformValue({
            translate: translate ? [translate.x, translate.y] : [0],
            scale: value
        });

        this.item.get().css(CSS);

        return this;
    };

    ItemTransformationController.prototype.clearTransform = function (/*duration, done*/) {

        throw "Implement clearTransform!";
    };

    ItemTransformationController.prototype.edgeAnim = function (/*dir, done*/) {

        throw "Implement edgeAnim!";
    };

    ItemTransformationController.prototype.closeAnim = function (/*duration, dir, translate, scale*/) {

        throw "Implement closeAnim!";
    };

    ItemTransformationController.prototype.getTranslate = function () {

        return ns.getTranslate(this.item.get());
    };

    ItemTransformationController.prototype.getScale = function () {

        return ns.getScale(this.item.get());
    };

    ItemTransformationController.prototype.getZoomScale = function () {

        return ns.getScale(this.$zoom);
    };


}(window.mjGallery, jQuery));
