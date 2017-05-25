/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery*/

(function (NS, $) {

    var ns,

        API = ["zoomOut", "zoomIn", "zoom", "fullscreen", "getId", "open", "close", "next", "prev",  "destroy", "refresh", "getOption", "getOptions", "get", "getItems", "getTotalCount", "getPrev", "getCurrent", "getNext", "getCurrentIndex", "getCurrentPosition", "isOpened", "isClosed", "toggleInfo", "showInfo", "hideInfo", "on", "off"],

        APIMap = {
            getNext: "getNextItemAPI",
            getPrev: "getPrevItemAPI",
            getCurrent: "getCurrentItemAPI",
            getItems: "getItemsAPI",
            zoom: "toggleZoom"
        },

        mjGallery = window[NS] = ns = function mjGallery(options) {

            this.id = ns.instances++;

            this.NS = ns.NS + "-" + this.id;

            this.initialized = false;

            this.API = new ns.mjGalleryAPI(this);

            this.init(options);

            return this.API;
        };


    ns.mjGalleryAPI = function mjGalleryAPI(mjGallery) {

        API.forEach(function (method) {

            this[method] = function () {

                var returnValue = mjGallery[APIMap[method] || method].apply(mjGallery, arguments);

                if (returnValue === mjGallery) {

                    return this;
                }

                return returnValue;
            };
        }, this);

        if (ns.DEBUG) {

            this.mjGallery = mjGallery;
        }
    };


    ns.NS = NS;

    ns.instances = 0;

    ns.DIR = {
        LEFT: 1,
        RIGHT: 2,
        UP: 3,
        DOWN: 4
    };

    var fire = function (type, event) {

            return ns.EVENT.fire(type, event, this);
        },

        hideScrollbars = function () {

            var type = this.getOption(ns.OPTIONS.SCROLLBARS_VISIBILITY),

                scrollTop = ns.$win.scrollTop(),

                css = ns.$t(document.body).css(["paddingRight", "paddingTop", "paddingBottom", "marginRight", "marginTop", "marginBottom"]),

                paddingRight = parseFloat(css.paddingRight),
                marginRight = parseFloat(css.marginRight),
                marginTop = parseFloat(css.marginTop),
                marginBottom = parseFloat(css.marginBottom);

            scrollTop = scrollTop - marginTop - marginBottom;

            switch (type) {

                case ns.SCROLLBARS.PADDING:

                    if (ns.$win.outerWidth() > ns.$win.innerWidth()) {

                        ns.$t(document.documentElement).addClass(ns.CLASS.hideScrollbars)
                            .addClass(ns.CLASS.hideScrollbarsPadding);

                        ns.$t(document.body).css({
                                paddingRight: ns.SCROLLBAR_WIDTH + paddingRight + marginRight,
                                marginRight: -ns.SCROLLBAR_WIDTH
                            })
                            .scrollTop(scrollTop);
                    }

                    break;

                case ns.SCROLLBARS.MARGIN:

                    if (ns.$win.outerWidth() > ns.$win.innerWidth()) {

                        ns.$t(document.documentElement).addClass(ns.CLASS.hideScrollbars)
                            .addClass(ns.CLASS.hideScrollbarsMargin);

                        ns.$t(document.body).css({
                                marginRight: -ns.SCROLLBAR_WIDTH,
                                paddingRight: paddingRight + marginRight
                            })
                            .scrollTop(scrollTop);
                    }

                    break;

                case ns.SCROLLBARS.OVERFLOW:

                    if (ns.$win.outerWidth() > ns.$win.innerWidth()) {

                        ns.$t(document.documentElement).addClass(ns.CLASS.hideScrollbars)
                            .addClass(ns.CLASS.hideScrollbarsOverflow);
                    }

                    break;
            }
        },

        showScrollbars = function () {

            var type = this.getOption(ns.OPTIONS.SCROLLBARS_VISIBILITY),

                scrollTop = ns.$t(document.body).scrollTop(),

                css = ns.$t(document.body).css(["marginTop", "marginBottom"]),

                marginTop = parseFloat(css.marginTop),
                marginBottom = parseFloat(css.marginBottom);

            scrollTop = scrollTop + (scrollTop ? marginTop + marginBottom : ns.$win.scrollTop() - scrollTop);

            switch (type) {

                case ns.SCROLLBARS.PADDING:
                case ns.SCROLLBARS.MARGIN:

                    ns.$t(document.documentElement)
                        .removeClass(ns.CLASS.hideScrollbars)
                        .removeClass(ns.CLASS.hideScrollbarsPadding)
                        .removeClass(ns.CLASS.hideScrollbarsMargin);

                    ns.$t(document.body).css({
                        paddingRight: "",
                        marginRight: ""
                    });

                    ns.$win.scrollTop(scrollTop);

                    break;

                case ns.SCROLLBARS.OVERFLOW:

                    ns.$t(document.documentElement)
                        .removeClass(ns.CLASS.hideScrollbars)
                        .removeClass(ns.CLASS.hideScrollbarsOverflow);

                    break;
            }
        },

        afterOpenAnimation = function () {

            var afterOpenEvent = new ns.EVENT.Event({
                current: this.getCurrentItemAPI(),
                currentIndex: this.getCurrentIndex()
            }, this);

            fire.call(this, ns.EVENT.afterOpen, afterOpenEvent);

            this.ignoreEvents = false;
        },

        openAnimation = function () {

            var selfCSS = {};

            if (ns.USE_TRANSITIONS) {

                selfCSS[ns.TRANSITION_PROP] = "";
                selfCSS[ns.TRANSITION_PROP + "Duration"] = "";

                this.$self.stop()
                    .css(selfCSS)
                    .off(this.withNS(ns.TRANSITIONEND))
                    .one(this.withNS(ns.TRANSITIONEND), afterOpenAnimation.bind(this));
            } else {

                selfCSS.opacity = 0;

                selfCSS[ns.TRANSITION_PROP] = "none";

                this.$self.css(selfCSS)
                    .stop()
                    .animate({ opacity: 1 }, ns.DEF_FIX_DURATION, ns.JS_EASING, afterOpenAnimation.bind(this));
            }
        },

        afterCloseAnimation = function () {

            this.currentItem.unsetAsClosing();

            this.infoController.hideItemInfoContent(true);

            if (this.getOption(ns.OPTIONS.SCROLLBARS_VISIBILITY) !== ns.SCROLLBARS.VISIBLE && ns.SCROLLBAR_WIDTH) {

                showScrollbars.call(this);
            }

            fire.call(this, ns.EVENT.afterClose);
        },

        closeAnimation = function (duration) {

            if (ns.USE_TRANSITIONS) {

                this.$self.removeClass(ns.CLASS.selfActive);

                this.$self.off(this.withNS(ns.TRANSITIONEND))
                    .on(this.withNS(ns.TRANSITIONEND),  function (event) {

                        if (event.originalEvent.propertyName === "visibility" && event.target === this.$self[0]) {

                            var doneCSS = {};

                            doneCSS[ns.TRANSITION_PROP] = "";
                            doneCSS[ns.TRANSITION_PROP + "Duration"] = "";

                            this.$self.hide()
                                .css(doneCSS);

                            afterCloseAnimation.call(this);
                        }

                    }.bind(this));

            } else {

                this.$self.stop()
                    .animate({ opacity: 0 }, duration * 1000, ns.JS_EASING, function () {

                        this.$self.removeClass(ns.CLASS.selfActive)
                            .hide()
                            .css({ opacity: "" });

                        afterCloseAnimation.call(this);

                    }.bind(this));
            }
        },

        //vrátí opacity celé galerie na 1
        reverseClosingEffect = function () {

            var selfCSS = {};

            if (ns.USE_TRANSITIONS) {

                selfCSS.opacity = "";

                selfCSS[ns.TRANSITION_PROP] = "";
                selfCSS[ns.TRANSITION_PROP + "Duration"] = "";

                this.$self.css(selfCSS);

            } else {

                selfCSS.opacity = +this.$self.css("opacity");

                selfCSS[ns.TRANSITION_PROP] = "none";

                this.$self.css(selfCSS)
                    .stop()
                    .animate({ opacity: 1 }, ns.DEF_DURATION, ns.JS_EASING);
            }
        },

        moveItemHorizontally = function () {

            if (this.ignoreEvents) {

                return;
            }

            var currentTranslateX = this.currentItem.getTranslate().x,

                diffX = this.pointer.diff.x / 2,

                moveX = currentTranslateX + diffX;

            this.currentItem.translateByState([moveX]);

            this.prevItem.translateByState([moveX]);

            this.nextItem.translateByState([moveX]);
        },

        moveEdgeItemHorizontally = function () {

            if (this.ignoreEvents) {

                return;
            }

            var currentTranslateX = this.currentItem.getTranslate().x,

                diffX = this.pointer.diff.x / 2,

                maxMoveX = window.innerWidth / 4,

                moveX = currentTranslateX + (diffX * (1 - (Math.min(maxMoveX, Math.abs(currentTranslateX)) / (maxMoveX))));

            this.currentItem.translateByState([moveX]);

            this.backFromEdge = true;
        },

        moveItemVertically = function () {

            if (this.ignoreEvents) {

                return;
            }

            var translate = this.currentItem.getTranslate(),

                height = this.currentItem.getHeight() / 4,
                currentTranslateY = Math.abs(translate.y),

                opacityChange = Math.max(0, Math.min(currentTranslateY / height, 1));

            this.currentItem.setOpacity(1 - opacityChange)
                .translate([0, this.pointer.startDiff.y]);

            //když slajd zmizí, "vypínat" celou galerii
            var selfCSS = {
                opacity: ""
            };

            selfCSS[ns.TRANSITION_PROP] = "none";

            if (opacityChange === 1) {

                currentTranslateY = currentTranslateY - height;

                opacityChange = Math.max(0, Math.min(currentTranslateY / height, 1));

                selfCSS.opacity = 1 - opacityChange;
            }

            this.$self.css(selfCSS);
        },

        zoomResetItem = function () {

            if (this.zoomingResetAnim) {

                return;
            }

            if (this.zoomingAnim) {

                this.zoomResetAfterZooming = true;

                return;
            }

            if (!this.currentItem.isZoomedIn()) {

                return;
            }

            this.ignoreEvents = true;
            this.zoomingResetAnim = true;

            this.currentItem.zoom(1, {x: 50, y: 50}, true, true, function () {

                this.zoomingResetAnim = false;
                this.ignoreEvents = false;

            }.bind(this));
        },

        getZoomOrigin = function (event) {

            var zoomRect = this.currentItem.getZoomRect(),

                isPinch = event && event.originalEvent.touches ? event.originalEvent.touches.length === 2: false,

                x  = event ? ns.getClientValue(event, 0, "X") - zoomRect.left : (window.innerWidth / 2) - zoomRect.left,
                y  = event ? ns.getClientValue(event, 0, "Y") - zoomRect.top : (window.innerHeight / 2) - zoomRect.top,
                x2 = isPinch ? ns.getClientValue(event, 1, "X") - zoomRect.left : null,
                y2 = isPinch ? ns.getClientValue(event, 1, "Y") - zoomRect.top : null,

                //střed mezi dvěma body
                mX = isPinch ? (x + x2) / 2 : x,
                mY = isPinch ? (y + y2) / 2 : y;

            return {
                x: (mX / zoomRect.width) * 100,
                y: (mY / zoomRect.height) * 100
            };
        },

        afterZoomItemByClickOrDblTap = function () {

            this.ignoreEvents = false;
            this.zoomingAnim = this.backFromScaleEdge && !this.zoomResetAfterZooming;

            //během přibližování uživatel přiblížení zrušil
            if (this.zoomResetAfterZooming) {

                this.zoomResetAfterZooming = false;

                zoomResetItem.call(this);

                return;
            }

            if (this.backFromScaleEdge) {

                this.currentItem.zoom(this.backFromScaleEdgeValue, null, ns.EDGE_ANIM_START_DURATION / 1000, true, function () {

                    this.ignoreEvents = false;
                    this.zoomingAnim = false;

                    //během vracení se zpět z maximální velikosti uživatel přiblížení zrušil
                    if (this.zoomResetAfterZooming) {

                        this.zoomResetAfterZooming = false;

                        zoomResetItem.call(this);
                    }
                }.bind(this));
            }
        },

        zoomItemByClickOrDblTap = function (zoomOut, origin, event) {

            if (this.zoomingAnim || this.zoomingResetAnim || !this.currentItem.isZoomable()) {

                return;
            }

            var scale = this.currentItem.getZoomScale().x,

                diff = 0;

            if (zoomOut) {

                diff = scale >= 2 ? -1 : scale - 2;

                if (scale === 1) {

                    diff = -0.125;
                }

            } else {

                diff = scale <= ns.MAX_ZOOM - 1 ? 1 : ns.MAX_ZOOM - scale;

                if (scale === ns.MAX_ZOOM) {

                    diff = 0.375;
                }
            }

            var changedScale = scale + diff;

            if (!origin) {

                origin = getZoomOrigin.call(this, event === false ? null : this.pointer.event);
            }

            this.backFromScaleEdge = changedScale > ns.MAX_ZOOM || changedScale < 1;
            this.backFromScaleEdgeValue = changedScale > ns.MAX_ZOOM ? ns.MAX_ZOOM : changedScale < 1 ? 1 : changedScale;

            this.ignoreEvents = true;
            this.zoomingAnim = true;

            this.currentItem.zoom(
                changedScale, origin, this.backFromScaleEdge ? ns.EDGE_ANIM_START_DURATION / 1000 : true, true, afterZoomItemByClickOrDblTap.bind(this)
            );
        },

        zoomItem = function (useOrigin) {

            var scale = this.currentItem.getZoomScale().x,

                diff = this.pointer.pinch.diff / ns.GET_MAX_MOVE_OVER(),

                limitFrom = this.pointer.scaleUp() ? ns.MAX_ZOOM : 1,

                limit = this.pointer.scaleUp() ? ns.MAX_ZOOM + 0.5 : 0.75,

                changedScale = scale + diff,

                origin = null;

            if (changedScale >= limitFrom && this.pointer.scaleUp()) {

                changedScale = scale + (diff * (1 - (Math.min(limit - (ns.MAX_ZOOM - 1), Math.abs(scale - ns.MAX_ZOOM)) / (limit - (ns.MAX_ZOOM - 1)))));
            }

            if (changedScale <= limitFrom && this.pointer.scaleDown()) {

                changedScale = scale + (diff * (1 - (Math.min(1 - limit, 1 - Math.abs(scale)) / (1 - limit))));
            }

            changedScale = Math.max(0.1, Math.min(10, Math.abs(changedScale)));

            if (useOrigin) {

                origin = getZoomOrigin.call(this, this.pointer.event);
            }

            this.backFromScaleEdge = changedScale > ns.MAX_ZOOM || changedScale < 1;
            this.backFromScaleEdgeValue = changedScale > ns.MAX_ZOOM ? ns.MAX_ZOOM : changedScale < 1 ? 1 : changedScale;

            this.zoomingAnim = false;
            this.zoomingResetAnim = false;
            this.ignoreEvents = false;

            this.currentItem.zoom(changedScale, origin);
        },

        scaleToClose = function () {

            var scale = this.currentItem.getScale().x,

                diff = this.pointer.pinch.diff / this.pointer.pinch.startDist,

                maxScale = 1.25,

                changedScale = scale >= 1 && this.pointer.scaleUp() ? scale + (diff * (1 - (Math.min(maxScale, Math.abs(scale)) / (maxScale)))) : scale + diff,

                opacityChange = Math.min((1 - scale) * 3, 1);

            changedScale = Math.abs(changedScale);

            //povolit zvětšení, pokud uživatel zrušil vypínání pomocí pinche
            this.allowScaleUpOnCancelCloseByScale = this.allowScaleUpOnCancelCloseByScale || changedScale < 1;

            this.currentItem.setOpacity(1 - opacityChange)
                .scale([changedScale]);

            //když slajd zmizí, "vypínat" celou galerii
            var selfCSS = {
                opacity: ""
            };

            selfCSS[ns.TRANSITION_PROP] = "none";

            if (opacityChange === 1) {

                opacityChange = Math.min((1 - scale - 0.33333) * 3, 1);

                selfCSS.opacity = 1 - opacityChange;
            }

            this.$self.css(selfCSS);
        },

        scaleItem = function () {

            if (this.zoomMode) {

                zoomItem.call(this);

                return this;
            }

            //nezvětšovatelný obsah
            if (this.pointer.scaleUp() && !this.currentItem.isZoomable() && !this.allowScaleUpOnCancelCloseByScale) {

                return;
            }

            //přejít do zvětšovacího módu, pouze pokud uživatel nezačal galerii vypínat pinchem
            this.zoomMode = (this.currentItem.isZoomable() && this.pointer.scaleUp() && !this.allowScaleUpOnCancelCloseByScale) || this.currentItem.isZoomedIn();

            if (this.zoomMode) {

                zoomItem.call(this, true);

                return this;
            }

            scaleToClose.call(this);
        },

        moveZoomedItem = function () {

            if (this.ignoreEvents) {

                this.zoomMode = this.currentItem.isZoomedIn();

                return;
            }

            var diffX = this.pointer.diff.x / 2,
                diffY = this.pointer.diff.y / 2;

            this.currentItem.translateZoomBy([diffX, diffY]);

            this.zoomMode = true;

            this.lastMoveZoomedItem = Date.now();
        },

        onItemMove = function (event) {

            this.pointer.onMove(event);

            this.backFromEdge = false;
            this.backFromScaleEdge = false;

            //pinch
            if (this.pointer.count > 1 && !this.itemDirFix) {

                var scale = this.currentItem.getScale().x;

                scaleItem.call(this);

                //slajd se zmenšuje a je menší než 1 (nezvětšuje se na výchozí velikost) -> zavřít
                this.possibleCloseByScale = this.pointer.scaleDown() && scale < 1;
                this.possibleClose = false;
                this.possibleItemChange = false;

                return false;
            }

            //přesunutí přiblíženého obsahu
            if (this.pointer.count === 1 && !this.itemDirFix && this.currentItem.isZoomedIn()) {

                moveZoomedItem.call(this);

                return false;
            }

            this.itemDirFix = this.itemDirFix || this.pointer.dirFix({
                dir: ns.Pointer.DIR.VER,
                value: this.pointer.isTouch() ? 9 : 0
            });

            var translate = this.currentItem.getTranslate();

            //další/předchozí slajd (doleva/doprava)
            if (this.itemDirFix === ns.Pointer.FIX.HOR) {

                //slajd se posouvá doleva a je před středem nebo se posouvá doprava a je za středem (slajd se neposouvá zpět do středu) -> další/předchozí slajd
                this.possibleItemChange = (this.pointer.left() && translate.x < 0) || (this.pointer.right() && translate.x > 0);

                //v případě jednoho obrázku nepovolit posunutí dál
                if (this.totalCount === 1 && this.possibleItemChange) {

                    moveEdgeItemHorizontally.call(this);

                    this.possibleItemChange = false;

                //případě dvou obrázků nepovolit posunutí dál/zpět, pokud je zobrazen 2./1. obrázek
                } else if (this.totalCount === 2 && this.possibleItemChange && ((this.prevItem.isEmpty() && this.pointer.right()) || (this.nextItem.isEmpty() && this.pointer.left()))) {

                    moveEdgeItemHorizontally.call(this);

                    this.possibleItemChange = false;

                } else {

                    moveItemHorizontally.call(this);
                }

                this.possibleClose = false;
                this.possibleCloseByScale = false;

            //zavřít (nahoru/dolu)
            } else {

                moveItemVertically.call(this);

                //slajd se posouvá nahoru a je nad středem nebo se posouvá dolu a je pod středem (slajd se neposouvá zpět do středu) -> zavřít
                this.possibleClose = (this.pointer.up() && translate.y < 0) || (this.pointer.down() && translate.y > 0);
                this.possibleItemChange = false;
                this.possibleCloseByScale = false;
            }

            return false;
        },

        //zjistí, jestli se má obrázek vrátit na původní místo
        shouldReverseToCurrent = function () {

            return (
                //další/předchozí obrázek, ale příliš krátké posunutí
                (this.possibleItemChange   && Math.abs(this.pointer.startDiff.x)     < ns.MIN_MOVE_TO_CHANGE) ||
                //vypnout galerii posunem nahoru/dolu, ale příliš krátké posunutí
                (this.possibleClose        && Math.abs(this.pointer.startDiff.y)     < ns.MIN_MOVE_TO_CHANGE) ||
                //vypnout galerii posunem zmenšením obrázku, ale příliš malé zmenšení
                (!this.scaling && this.possibleCloseByScale && Math.abs(this.pointer.pinch.startDiff) < ns.MIN_MOVE_TO_CHANGE) ||
                //vrátit se zpět ve všech ostatních případech, kdy se galerie nezavírá a kdy se obrázek neposouvá dál/zpět
                //(přičemž není na konci/začátku galerie v případě 1 a 2 obrázků),
                //pokud uživatel vrací obrázek na původní místo sám, použije se jiná metoda
                (!this.possibleClose && !this.possibleItemChange && (this.itemDirFix !== ns.Pointer.FIX.HOR || this.backFromEdge) && !this.possibleCloseByScale && !this.backFromScaleEdge)
            );
        },

        onItemEndNotMoved = function () {

            this.itemDirFix = false;
            this.zoomMode = false;

            if (this.focusOnEnd) {

                ns.$t(this.focusOnEnd).focus();
            }

            if (!this.currentItem.isZoomable() || !this.pointer.isMouse()) {

                return;
            }

            //levé tlačítko
            if (this.pointer.event.which === 1) {

                zoomItemByClickOrDblTap.call(this);

            //prostřední tlačítko
            } else if (this.pointer.event.which === 2) {

                zoomResetItem.call(this);
            }
        },

        onItemEndZoomedItemMoved = function () {

            var diff = this.pointer.getDiff();

            //spustit animované posouvání zvětšného obrázku, pouze pokud se nejedná o přesné posunutí
            if (Date.now() - this.lastMoveZoomedItem < 30 && (Math.abs(diff.x) > 3 || Math.abs(diff.y) > 3)) {

                if (this.pointer.isTouch()) {

                    diff.x /= 2;
                    diff.y /= 2;
                }

                this.currentItem.slideZoom([diff.x, diff.y]);

            } else {

                this.currentItem.fitZoom(function () {

                    this.ignoreEvents = false;

                }.bind(this));
            }

            this.itemDirFix = false;
            this.zoomMode = false;
        },

        onItemEndReturnToMinMaxScale = function () {

            this.ignoreEvents = true;

            this.currentItem.zoom(this.backFromScaleEdgeValue, null, true, true, function () {

                this.ignoreEvents = false;
                this.zoomingAnim = false;

            }.bind(this));

            this.itemDirFix = false;
            this.zoomMode = false;
        },

        onItemEndClose = function () {

            var duration, move, multiplier;

            if (this.possibleCloseByScale) {

                multiplier = Math.max(1, 8 - Math.log(Math.min(window.innerWidth, window.innerHeight) + Math.abs(window.innerWidth - window.innerHeight) / 2));

                move = this.pointer.pinch.diff * multiplier;

                duration = ((ns.MIN_DURATION + ns.MAX_DURATION) - Math.max(ns.MIN_DURATION, Math.min(ns.MAX_DURATION, Math.abs(move) * 20))) / 1000;

            } else {

                multiplier = Math.max(1, 8 - Math.log(window.innerWidth));

                move = this.pointer.diff.y * multiplier;

                duration = ((ns.MIN_DURATION + ns.MAX_DURATION) - Math.max(ns.MIN_DURATION, Math.min(ns.MAX_DURATION, Math.abs(move) * (this.pointer.isMouse() ? 25 : 10)))) / 1000;

                //??
                if (window.innerHeight > window.innerWidth) {

                    duration *= window.innerHeight / window.innerWidth;
                }
            }

            this.close(!this.possibleCloseByScale, this.possibleCloseByScale, this.pointer.up() ? ns.DIR.UP : ns.DIR.DOWN, duration);

            this.itemDirFix = false;
        },

        onItemEndMoveToNextPrev = function () {

            var duration, move, multiplier;

            multiplier = Math.max(1, 8 - Math.log(window.innerWidth));

            move = this.pointer.diff.x * multiplier;

            duration = ((ns.MIN_DURATION + ns.MAX_DURATION) - Math.max(ns.MIN_DURATION, Math.min(ns.MAX_DURATION, Math.abs(move) * 12))) / 1000;

            //posunutí na další/předchozí obrázek
            if (this.possibleItemChange) {

                this[this.pointer.left() ? "next" : "prev"](duration);

            } else {

                var isReturningFromEdge = (this.nextItem.isEmpty() && this.pointer.right()) || (this.prevItem.isEmpty() && this.pointer.left());

                this.resetToCurrent(isReturningFromEdge ? duration / 2 : duration);
            }

            this.itemDirFix = false;
        },

        onItemEnd = function () {

            ns.$win.off(this.withNS("mousemove", "touchmove"));

            this.$self.removeClass(ns.CLASS.selfGrabbing);

            this.eventsActive = false;

            //kliknutí -> obrázek se neposunul dál
            if (!this.pointer.moved) {

                onItemEndNotMoved.call(this);

                return;
            }

            if (this.zoomMode && !this.backFromScaleEdge) {

                onItemEndZoomedItemMoved.call(this);

                return false;
            }

            this.zoomMode = false;

            if (shouldReverseToCurrent.call(this)) {

                this.resetToCurrent();

                reverseClosingEffect.call(this);

                this.itemDirFix = false;

                return false;
            }

            if (this.backFromScaleEdge) {

                onItemEndReturnToMinMaxScale.call(this);

                return false;
            }

            //zavírání galerie (nahoru/dolu/zmenšení)
            if (this.itemDirFix === ns.Pointer.FIX.VER || this.possibleCloseByScale) {

                onItemEndClose.call(this);

                return false;
            }

            onItemEndMoveToNextPrev.call(this);

            return false;
        },

        onItemStart = function (event) {

            this.focusOnEnd = false;

            if (this.currentItem.shouldPreserveEvent(ns.EVENTS.POINTER, event)) {

                return;
            }

            this.pointer.onStart(event);

            //probíhá animace nebo už jsou události move a up/end zaregistrované (aby se při více dotecích nespouštěly vícekrát)
            if (this.ignoreEvents || this.eventsActive || this.pointer.count > 2) {

                event.preventDefault();

                return;
            }

            if (this.pointer.isDblTap()) {

                this.toggleZoom();
            }

            this.eventsActive = true;

            this.$self.addClass(ns.CLASS.selfGrabbing);

            this.currentItem.refreshSize();
            this.nextItem.refreshSize();
            this.prevItem.refreshSize();

            ns.$win.off(this.withNS("mousemove", "touchmove"))
                .on(this.withNS("mousemove", "touchmove"), onItemMove.bind(this));

            ns.$win.off(this.withNS("mouseup", "touchend"))
                .one(this.withNS("mouseup", "touchend"), onItemEnd.bind(this));

            this.resetScroll();

            var onFocusable = ns.$t(event.target).is("a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]");

            if (onFocusable) {

                this.focusOnEnd = event.type.match(/touch/) ? event.target: null;

                if (!this.focusOnEnd) {

                    ns.$t(event.target).focus();
                }
            }

            event.preventDefault();
        },

        onOpenGalleryByUser = function (event, pointerMoved) {

            if (!event.type.match(/touchmove|touchstart/) && !pointerMoved) {

                if (event.type !== "touchend" || event.originalEvent.touches.length === 1) {

                    this.open(event.currentTarget);

                    event.preventDefault();
                }
            }
        },

        initEvents = function () {

            this.pointer = new ns.Pointer();

            this.$self.off(this.withNS("mousedown", "touchstart", "mouseup", "touchend", "mousemove", "touchmove", "contextmenu", "dblclick"));

            this.$self.on(this.withNS("dblclick"), ns.CLASS.selector("itemContent"), function () {

                    if (this.currentItem.isZoomable()) {

                        zoomResetItem.call(this);
                    }

                }.bind(this));

            this.$self.on(this.withNS("contextmenu"), ns.CLASS.selector("itemContent"), function () {

                    if (this.currentItem.isZoomedIn() && !this.ignoreEvents) {

                        zoomItemByClickOrDblTap.call(this, true);

                        return false;
                    }

                }.bind(this));

            this.$self.on(this.withNS("mousedown", "touchstart"), ns.CLASS.selector("draggable"), onItemStart.bind(this));

            ns.$win.off(this.withNS("resize"))
                .on(this.withNS("resize"), function () {

                    fire.call(this, ns.EVENT.resize);

                    if (this.currentItem && this.currentItem.isZoomable()) {

                        this.ignoreEvents = true;

                        this.currentItem.fitZoom(function () {

                            this.ignoreEvents = false;

                        }.bind(this));
                    }

                }.bind(this));

            //openBy
            if (this.getOption(ns.OPTIONS.OPENING_ELEMENT)) {

                this.$openingElement = ns.jQueryfy(
                    this.getOption(ns.OPTIONS.OPENING_ELEMENT)
                );

                var onOpeningElementMove = false;

                this.$openingElement.off(this.withNS("click", "touchend", "touchmove", "touchstart"))
                    .on(this.withNS("click", "touchend", "touchmove", "touchstart"), function (event) {

                        onOpenGalleryByUser.call(this, event, onOpeningElementMove);

                        onOpeningElementMove = event.type === "touchmove";

                    }.bind(this));
            }

            //pokud se používá openBy, pak přiřadit otevírání zrdojům, jen pokud je nastaven selector
            if (this.options.isSetByUser(ns.OPTIONS.ITEMS_SELECTOR) || (!this.getOption(ns.OPTIONS.OPENING_ELEMENT) && this.getOption(ns.OPTIONS.ITEMS_SELECTOR))) {

                var onSourceElementMove = false;

                ns.$doc.off(this.withNS("click", "touchend", "touchmove", "touchstart"))
                    .on(this.withNS("click", "touchend", "touchmove", "touchstart"), this.getOption(ns.OPTIONS.ITEMS_SELECTOR), function (event) {

                        onOpenGalleryByUser.call(this, event, onSourceElementMove);

                        onSourceElementMove = event.type === "touchmove";

                    }.bind(this));
            }
        },

        destroyEvents = function () {

            this.$self.off("." + this.NS);

            ns.$win.off("." + this.NS);

            ns.$doc.off("." + this.NS);

            ns.EVENT.off(null, null, this);

            if (!this.refreshing) {

                this.userEvents = {};
            }
        },

        init$Elements = function () {

            this.$itemsList = this.$self.find(ns.CLASS.selector("items"));
            this.$overlay = this.$self.find(ns.CLASS.selector("overlay"));
        };


    mjGallery.prototype.init = function (options) {

        if (this.initialized) {

            return;
        }

        var constructEvent = new ns.EVENT.Event({
            options: this.prevOptions ? $.extend(this.prevOptions, options || {}) : options
        }, this);

        fire.call(this, ns.EVENT.construct, constructEvent);

        if (constructEvent.isDefaultPrevented()) {

            return this;
        }

        this.userEvents = {};

        this.options = new ns.Options(this.prevOptions || options, this);

        this.$self = $(ns.TEMPLATE.SELF({
            zoomBtn: this.getOption(ns.OPTIONS.SHOW_BTN_ZOOM),
            infoBtn: this.getOption(ns.OPTIONS.SHOW_BTN_INFO),
            fullscreenBtn: this.getOption(ns.OPTIONS.SHOW_BTN_FULLSCREEN),
            closeBtn: this.getOption(ns.OPTIONS.SHOW_BTN_CLOSE)
        }));

        init$Elements.call(this);

        this.$self.attr("id", this.NS);

        this.options.init();

        this.$overlay.css("opacity", this.getOption(ns.OPTIONS.OVERLAY_OPACITY));

        this.itemDirFix = null;
        this.possibleItemChange = null;
        this.possibleClose = null;
        this.possibleCloseByScale = null;
        this.backFromEdge = null;
        this.backFromScaleEdge = null;
        this.zoomingAnim = false;
        this.zoomingResetAnim = false;
        this.zoomMode = false;
        this.lastMoveZoomedItem = Date.now();

        this.firstOpen = true;
        this.opened = false;
        this.closed = true;

        ns.$t(document.body).append(this.$self);

        initEvents.call(this);

        this.itemsGenerator = new ns.ItemsGenerator(this, this.options);

        this.infoController = new ns.InfoController(this);

        this.UIController = new ns.UIController(this, this.infoController);

        this.initialized = true;

        fire.call(this, ns.EVENT.init);

        return this;
    };

    mjGallery.prototype.destroy = function () {

        if (!this.initialized) {

            return;
        }

        this.prevOptions = null;

        if (!this.refreshing) {

            var beforeDestroyEvent = new ns.EVENT.Event({
                current: this.getCurrentItemAPI(),
                currentIndex: this.getCurrentIndex()
            }, this);

            fire.call(this, ns.EVENT.beforeDestroy, beforeDestroyEvent);

            if (beforeDestroyEvent.isDefaultPrevented()) {

                return this;
            }

            this.prevOptions = this.options.get();
        }

        destroyEvents.call(this);

        this.infoController = this.UIController = this.itemsGenerator = this.options = this.pointer = this.API = null;

        this.currentItem = this.prevItem = this.nextItem = this.items = null;

        this.$self.remove();

        this.$controller = this.$self = null;

        this.initialized = false;

        this.firstOpen = true;

        fire.call(this, ns.EVENT.afterDestroy);

        return this;
    };

    mjGallery.prototype.refresh = function (options) {

        var beforeRefreshEvent = new ns.EVENT.Event({
            current: this.getCurrentItemAPI(),
            currentIndex: this.getCurrentIndex()
        }, this);

        fire.call(this, ns.EVENT.beforeRefresh, beforeRefreshEvent);

        if (beforeRefreshEvent.isDefaultPrevented()) {

            return this;
        }

        this.refreshing = true;

        this.destroy();

        //při refreshi vrátit události registrované uživatelem
        $.each(this.userEvents, function (type, cbs) {

            cbs.forEach(function (cb) {

                ns.EVENT.on(type, cb, this);

            }, this);

        }.bind(this));

        this.init(options);

        this.refreshing = false;

        fire.call(this, ns.EVENT.afterRefresh);

        return this;
    };

    mjGallery.prototype.getOpeningElement = function () {

        return this.$openingElement;
    };

    mjGallery.prototype.getItemsList = function () {

        return this.$itemsList;
    };

    mjGallery.prototype.getOption = function (option) {

        return option ? this.options.get(option) : this.getOptions().get();
    };

    mjGallery.prototype.getOptions = function () {

        return this.options;
    };

    mjGallery.prototype.get = function () {

        return this.$self;
    };

    mjGallery.prototype.getId = function () {

        return this.id;
    };

    mjGallery.prototype.getAPI = function () {

        return this.API;
    };

    mjGallery.prototype.getItems = function () {

        return this.items;
    };

    mjGallery.prototype.getItemsAPI = function () {

        return this.items.map(function (item) {

            return item.getAPI();
        });
    };

    mjGallery.prototype.refreshItemInfo = function () {

        this.infoController.showItemInfo();

        return this;
    };

    mjGallery.prototype.resetScroll = function () {

        this.$itemsList.scrollLeft(0).scrollTop(0);

        return this;
    };

    mjGallery.prototype.getTotalCount = function () {

        return this.totalCount;
    };

    mjGallery.prototype.getCurrentItem = function () {

        return this.currentItem && !this.currentItem.isEmpty() ? this.currentItem : null;
    };

    mjGallery.prototype.getPrevItem = function () {

        return this.prevItem && !this.prevItem.isEmpty() ? this.prevItem : null;
    };

    mjGallery.prototype.getNextItem = function () {

        return this.mextItem && !this.mextItem.isEmpty() ? this.mextItem : null;
    };

    mjGallery.prototype.getCurrentItemAPI = function () {

        return this.currentItem && !this.currentItem.isEmpty() ? this.currentItem.API : null;
    };

    mjGallery.prototype.getPrevItemAPI = function () {

        return this.prevItem && !this.prevItem.isEmpty() ? this.prevItem.API : null;
    };

    mjGallery.prototype.getNextItemAPI = function () {

        return this.mextItem && !this.mextItem.isEmpty() ? this.mextItem.API : null;
    };

    mjGallery.prototype.getCurrentIndex = function () {

        return this.currentItem ? this.currentItem.getIndex() : -1;
    };

    mjGallery.prototype.getCurrentPosition = function () {

        return this.getCurrentIndex() + 1;
    };

    mjGallery.prototype.zoomIn = function () {

        zoomItemByClickOrDblTap.call(this, false, null, false);

        return this;
    };

    mjGallery.prototype.zoomOut = function () {

        zoomItemByClickOrDblTap.call(this, true, null, false);

        return this;
    };

    mjGallery.prototype.fullscreen = function (state) {

        this.UIController.fullscreen(state);

        return this;
    };

    mjGallery.prototype.toggleInfo = function () {

        this.UIController.toggleInfo();

        return this;
    };

    mjGallery.prototype.showInfo = function () {

        this.UIController.showInfo();

        return this;
    };

    mjGallery.prototype.hideInfo = function () {

        this.UIController.hideInfo();

        return this;
    };

    mjGallery.prototype.isOpened = function () {

        return this.opened;
    };

    mjGallery.prototype.isClosed = function () {

        return this.closed;
    };

    mjGallery.prototype.initItems = function (openingElement) {

        this.items = this.itemsGenerator.generate(openingElement);

        this.totalCount = this.itemsGenerator.getTotalCount();

        this.emptyItem = this.itemsGenerator.getEmptyItem();
        this.prevItem = this.itemsGenerator.getPrevItem();
        this.nextItem = this.itemsGenerator.getNextItem();
        this.currentItem = this.itemsGenerator.getCurrentItem();
    };

    mjGallery.prototype.open = function (openingElement) {

        if (this.$self) {

            //položkám tvrdíme, že je galerie otevřená, uživateli ne (událost je beforeopen)
            this.opened = true;
            this.closed = false;

            this.initItems(openingElement);

            //položkám tvrdíme, že je galerie otevřená, uživateli ne (událost je beforeopen)
            this.opened = false;
            this.closed = true;

            var beforeOpenEvent = new ns.EVENT.Event({
                current: this.getCurrentItemAPI(),
                currentIndex: this.getCurrentIndex()
            }, this);

            if (this.firstOpen) {

                fire.call(this, ns.EVENT.beforeFirstOpen, beforeOpenEvent);

                this.firstOpen = false;
            }

            fire.call(this, ns.EVENT.beforeOpen, beforeOpenEvent);

            if (beforeOpenEvent.isDefaultPrevented()) {

                return this;
            }

            this.opened = true;
            this.closed = false;

            this.$self.show();

            openAnimation.call(this);

            this.$self.addClass(ns.CLASS.selfActive);

            if (this.getOption(ns.OPTIONS.SCROLLBARS_VISIBILITY) !== ns.SCROLLBARS.VISIBLE && ns.SCROLLBAR_WIDTH) {

                hideScrollbars.call(this);
            }

            var openEvent = new ns.EVENT.Event({
                current: this.getCurrentItemAPI(),
                currentIndex: this.getCurrentIndex()
            }, this);

            fire.call(this, ns.EVENT.open, openEvent);
        }

        return this;
    };

    mjGallery.prototype.close = function (translate, scale, dir, duration) {

        if (this.$self) {

            var beforeCloseEvent = new ns.EVENT.Event({
                current: this.getCurrentItemAPI(),
                currentIndex: this.getCurrentIndex()
            }, this);

            fire.call(this, ns.EVENT.beforeClose, beforeCloseEvent);

            if (beforeCloseEvent.isDefaultPrevented()) {

                return this;
            }

            duration = duration || ns.DEF_FIX_DURATION / 1000;

            this.opened = false;
            this.closed = true;

            var selfCSS = {};

            if (this.currentItem.isZoomedIn()) {

                this.currentItem.zoom(1, undefined, true, true);
            }

            if (translate || scale) {

                this.currentItem.setAsClosing(duration, dir, translate, scale);

                if (ns.USE_TRANSITIONS) {

                    selfCSS.opacity = "";

                    selfCSS[ns.TRANSITION_PROP] = "opacity " + (duration || ns.DEF_FIX_DURATION / 1000) + "s ease-in 0s, visibility 0s linear " + (duration || ns.DEF_FIX_DURATION / 1000) + "s";
                    selfCSS[ns.TRANSITION_PROP + "Duration"] = (duration || ns.DEF_FIX_DURATION / 1000) + "s";

                } else {

                    selfCSS.opacity = +this.$self.css("opacity");

                    selfCSS[ns.TRANSITION_PROP] = "";
                }

                this.$self.css(selfCSS);
            }

            closeAnimation.call(this, duration);

            fire.call(this, ns.EVENT.close);
        }

        return this;
    };

    mjGallery.prototype.prev = function (duration) {

        if (this.$self && !this.ignoreEvents) {

            //nejsou předchozí položky
            if (this.totalCount === 1 || (this.totalCount === 2 && this.getCurrentIndex() === 0)) {

                this.ignoreEvents = true;

                this.currentItem.edgeAnim(ns.DIR.LEFT, function () {

                    this.ignoreEvents = false;

                }.bind(this));

                return this;
            }

            var beforeChangeEvent = this.fireChangeEvent(ns.EVENT.beforeChange);

            if (beforeChangeEvent.isDefaultPrevented()) {

                this.resetToCurrent(duration);

                return this;
            }

            this.ignoreEvents = true;

            this.nextItem.clearTransform();

            this.swapItemsBackwards();

            this.nextItem.setAsNext(duration || ns.DEF_DURATION / 1000);

            this.currentItem.setAsCurrent(duration || ns.DEF_DURATION / 1000, function () {

                this.prevItem.setAsPrev();

                this.fireChangeEvent(ns.EVENT.afterChange);

                this.nextItem.clearOpacity();

                this.clearStateOfInvisibleItems();

                this.ignoreEvents = false;

            }.bind(this));

            this.fireChangeEvent(ns.EVENT.change);
        }

        this.resetScroll();

        return this;
    };

    mjGallery.prototype.next = function (duration) {

        if (this.$self && !this.ignoreEvents) {

            //nejsou další položky
            if (this.totalCount === 1 || (this.totalCount === 2 && this.getCurrentIndex() === 1)) {

                this.ignoreEvents = true;

                this.currentItem.edgeAnim(ns.DIR.RIGHT, function () {

                    this.ignoreEvents = false;

                }.bind(this));

                return this;
            }

            var beforeChangeEvent = this.fireChangeEvent(ns.EVENT.beforeChange);

            if (beforeChangeEvent.isDefaultPrevented()) {

                this.resetToCurrent(duration);

                return this;
            }

            this.ignoreEvents = true;

            this.prevItem.clearTransform();

            this.swapItemsForwards();

            this.prevItem.setAsPrev(duration || ns.DEF_DURATION / 1000);

            this.currentItem.setAsCurrent(duration || ns.DEF_DURATION / 1000, function () {

                this.nextItem.setAsNext();

                this.fireChangeEvent(ns.EVENT.afterChange);

                this.ignoreEvents = false;

                this.prevItem.clearOpacity();

                this.clearStateOfInvisibleItems();

            }.bind(this));

            this.fireChangeEvent(ns.EVENT.change);
        }

        this.resetScroll();

        return this;
    };

    mjGallery.prototype.fireChangeEvent = function (type) {

        var changeEvent = new ns.EVENT.Event({
            current: this.getCurrentItemAPI(),
            next: this.getNextItemAPI(),
            prev: this.getPrevItemAPI(),

            currentIndex: this.getCurrentIndex()
        }, this);

        fire.call(this, type, changeEvent);

        return changeEvent;
    };

    mjGallery.prototype.swapItemsForwards = function () {

        this.prevItem = this.currentItem;

        this.currentItem = this.nextItem;

        this.nextItem = this.items[this.getCurrentIndex() + 1] || this.emptyItem;

        //začátek seznamu -> hledat předchozí na konci, pouze pokud je polžek více jak dvě
        if (this.nextItem.isEmpty() && this.totalCount > 2) {

            this.nextItem = this.items[0];
        }

        return this;
    };

    mjGallery.prototype.swapItemsBackwards = function () {

        this.nextItem = this.currentItem;

        this.currentItem = this.prevItem;

        this.prevItem = this.items[this.getCurrentIndex() - 1] || this.emptyItem;

        //začátek seznamu -> hledat předchozí na konci, pouze pokud je polžek více jak dvě
        if (this.prevItem.isEmpty() && this.totalCount > 2) {

            this.prevItem = this.items[this.items.length - 1];
        }

        return this;
    };

    mjGallery.prototype.clearStateOfInvisibleItems = function () {

        this.items.forEach(function (item) {

            if (item !== this.currentItem && item !== this.prevItem && item !== this.nextItem) {

                item.clearState();
            }
        }, this);

        return this;
    };

    mjGallery.prototype.resetToCurrent = function (duration) {

        var currentTranslate = this.currentItem.getTranslate(),
            currentScale = this.currentItem.getScale();

        this.ignoreEvents = !!(currentTranslate.x || currentTranslate.y || currentScale.x !== 1);

        this.currentItem.clearOpacity(duration || ns.DEF_DURATION / 1000)
            .clearTransform(duration || ns.DEF_DURATION / 1000, function () {

                this.ignoreEvents = false;
                this.allowScaleUpOnCancelCloseByScale = false;

            }.bind(this));

        this.prevItem.clearOpacity(duration || ns.DEF_DURATION / 1000)
            .clearTransform(duration || ns.DEF_DURATION / 1000);

        this.nextItem.clearOpacity(duration || ns.DEF_DURATION / 1000)
            .clearTransform(duration || ns.DEF_DURATION / 1000);

        this.resetScroll();

        return this;
    };

    mjGallery.prototype.toggleZoom = function (origin) {

        if (this.currentItem.isZoomable()) {

            if (this.currentItem.isZoomedIn()) {

                zoomResetItem.call(this);

            } else {

                zoomItemByClickOrDblTap.call(this, false, origin);
            }
        }
    };

    mjGallery.prototype.withNS = function (events) {

        events = events instanceof Array ? events : Array.prototype.slice.call(arguments);

        var ns = "." + this.NS + " ";

        return (events.join(ns) + ns).trim();
    };

    mjGallery.prototype.on = function (type, cb) {

        this.userEvents[type] = this.userEvents[type] || [];

        this.userEvents[type].push(cb);

        ns.EVENT.on(type, cb, this);

        return this;
    };

    mjGallery.prototype.off = function (type, handler) {

        if (this.userEvents[type]) {

            this.userEvents[type] = this.userEvents[type].filter(function (cb) {

                return cb !== handler;
            });
        }

        ns.EVENT.off(type, handler, this);

        return this;
    };

}("mjGallery", jQuery));

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery, HTMLElement, NodeList, HTMLCollection*/

(function (ns, $) {

    ns.DEBUG = false;

    ns.TRANSFORM_PREFIX = "";

    ns.TRANSFORM_PROP = (function () {

        var el = document.createElement("div"),

            prefixes = ["", "o", "ms", "moz", "webkit"],

            use = "transform";

        prefixes.some(function (prefix) {

            var prop = prefix ? prefix + "Transform" : "transform";

            if (el.style[prop] !== undefined) {

                use = prop;

                ns.TRANSFORM_PREFIX = prefix ? "-" + prefix + "-" : "";

                return true;
            }
        });

        return use;
    }());

    ns.T3D = (function () {

        var el = document.createElement("div");

        el.style[ns.TRANSFORM_PROP] = "translate3d(0,0,0)";

        return !!el.style[ns.TRANSFORM_PROP];
    }());

    ns.TRANSITION_PROP = "transition";

    ns.TRANSITION_PREFIX = "";

    ns.TRANSITIONEND = (function () {

        var el = document.createElement("div"),

            transitions = [
                "transition"      , "transitionend"      , ""        ,
                "OTransition"     , "otransitionend"     , "-o-"     ,
                "MozTransition"   , "transitionend"      , "-moz-"   ,
                "WebkitTransition", "webkitTransitionEnd", "-webkit-"
            ],

            i = 0, length = transitions.length;

        for (i; i < length; i += 3) {

            if (el.style[transitions[i]] !== undefined) {

                ns.TRANSITION_PROP = transitions[i];

                ns.TRANSITION_PREFIX = transitions[i + 2];

                return transitions[i + 1];
            }
        }

        return null;

    }());

    ns.USE_TRANSITIONS = !!ns.TRANSITIONEND;

    ns.SUPPORTS_OBJECT_FIT = (function () {

        var el = document.createElement("div");

        return typeof el.style.objectFit !== "undefined";

    }());

    ns.SUPPORTS_FULLSCREEN = false;

    ns.EXIT_FULLSCREEN_FN = "exitFullscreen";

    ns.REQUEST_FULLSCREEN_FN = (function () {

        var el = document.createElement("div"),

            prefixes = ["", "ms", "moz", "webkit"],

            prefix = "", use = "", screen = "";

        prefixes.some(function (p) {

            var prop = p ? p + "RequestFull" : "requestFull";

            if (el[prop + "Screen"]) {

                screen = "Screen";

            } else if (el[prop + "screen"]) {

                screen = "screen";
            }

            if (screen) {

                prefix = p;

                use = prop + screen;

                return true;
            }
        });

        ns.SUPPORTS_FULLSCREEN = !!use;

        if (ns.SUPPORTS_FULLSCREEN) {

            ns.EXIT_FULLSCREEN_FN = prefix ? prefix + "ExitFull" + screen : "exitFull" + screen;

            if (!document[ns.EXIT_FULLSCREEN_FN] && document[prefix ? prefix + "CancelFull" + screen : "cancelFull" + screen]) {

                ns.EXIT_FULLSCREEN_FN = prefix ? prefix + "CancelFull" + screen : "cancelFull" + screen;
            }
        }

        return use;

    }());

    ns.SCROLLBAR_WIDTH = (function () {

        function SCROLLBAR_WIDTH() {

            var outer = document.createElement("div"),
                inner = document.createElement("div");

            outer.style.cssText = "width: 100px; height: 100px; overflow: scroll;";
            inner.style.cssText = "width: 100%; height: 100%;";

            outer.appendChild(inner);

            document.body.appendChild(outer);

            var scrollbarWidth = outer.offsetWidth - inner.offsetWidth;

            document.body.removeChild(outer);

            return scrollbarWidth;
        }

        if (document.body) {

            ns.SCROLLBAR_WIDTH = SCROLLBAR_WIDTH();

        } else {

            $(function () {

                ns.SCROLLBAR_WIDTH = SCROLLBAR_WIDTH();
            });
        }

        return 17;
    }());


    ns.extend = function (subO, superO) {
        function object(obj) { function F() {} F.prototype = obj; return new F(); }
        var prototype = object(superO.prototype);
        prototype.constructor = subO;
        subO.prototype = prototype;
    };

    //podporuje jenom translate a scale
    //{translate: [x (, y = 0px, z = 0px)], scale: [x (, y = x, z = 0)]}
    ns.getTransformValue = function (values) {

        var transform = [];

        $.each(values, function (prop, value) {

            if (prop === "translate") {

                value = value.map(function (value) {

                    return typeof value === "number" ? value + "px" : value;
                });

                if (value.length < 2) {

                    value.push("0px");
                }

                if (ns.T3D && value.length < 3) {

                    value.push("0px");
                }

            } else if (prop === "scale") {

                if (value.length < 2) {

                    value.push(value[0]);
                }

                if (ns.T3D && value.length < 3) {

                    value.push(1);
                }
            }

            if (!ns.T3D && value.length > 2) {

                value = value.slice(0, 2);
            }

            transform.push(prop + (ns.T3D ? "3d" : "") + "(" + value.join(", ") + ")");
        });

        return transform.join(" ");
    };


    ns.$win = $(window);
    ns.$doc = $(document);

    ns.FOCUSABLE = "a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]";

    ns.NOT_FULL_SIZE_ITEMS_WIDTH = 85;

    ns.MIN_MOVE_TO_CHANGE = window.innerWidth < 768 ? window.innerWidth < 480 ? 35 : 50 : 75;

    ns.TRANTSLATE_ZOOM_STEP = 15;

    ns.MAX_ZOOM = 4;

    ns.DEF_FIX_DURATION = 300;

    ns.DEF_DURATION =  window.innerWidth <= 1024 ? window.innerWidth < 768 ? 250 : 300 : 350;

    ns.MIN_DURATION = window.innerWidth < 768 ? 200 : 250;

    ns.MAX_DURATION = window.innerWidth < 768 ? 650 : 750;

    ns.EDGE_ANIM_START_DURATION = 150;

    ns.GET_MAX_MOVE_OVER = function () {

        return Math.sqrt(Math.pow(window.innerWidth, 2) + Math.pow(window.innerHeight, 2)) / 6;
    };

    ns.JS_EASING = "easeOutQuad";

    $.easing.easeOutQuad = $.easing.easeOutQuad || function (x) {
        return 1 - (1 - x) * (1 - x);
    };

    $.easing.easeInQuad = $.easing.easeInQuad || function (x) {
        return x * x;
    };

    $.easing.easeOutQuart = $.easing.easeOutQuart || function (x) {
        return 1 - Math.pow(1 - x, 4);
    };

    ns.$win.on("resize." + ns.NS, function () {

        ns.MIN_MOVE_TO_CHANGE = window.innerWidth < 768 ? window.innerWidth < 480 ? 35 : 50 : 75;

        ns.DEF_DURATION = window.innerWidth <= 1024 ? window.innerWidth < 768 ? 250 : 300 : 350;

        ns.MIN_DURATION = window.innerWidth < 768 ? 200 : 250;

        ns.MAX_DURATION = window.innerWidth < 768 ? 650 : 750;
    });

    ns.$t = (function() {

        var $temp = $([null]);

        return function (element) {

            $temp[0] = element;

            return $temp;
        };
    }());

    ns.getClientValue = function (event, directionOrPointerIndex, direction) {

        var pointerIndex = 0;

        if (typeof directionOrPointerIndex === "number") {

            pointerIndex = directionOrPointerIndex;

            directionOrPointerIndex = direction;
        }

        if (typeof directionOrPointerIndex === "undefined") {

            return {
                x: ns.getClientValue(event, pointerIndex, "x"),
                y: ns.getClientValue(event, pointerIndex, "y")
            };
        }

        var prop = "client" + directionOrPointerIndex.toUpperCase();

        event = event.originalEvent || event;

        return typeof event[prop] === "number" ? event[prop] : event.touches[pointerIndex][prop];
    };

    ns.getCurrentMatrix = function ($element) {

        var currentTransform = $element.css(ns.TRANSFORM_PROP);

        currentTransform = currentTransform === "none" || !currentTransform ? "matrix(1, 0, 0, 1, 0, 0)" : currentTransform;

        var matrix = currentTransform.replace(/^.*\((.*)\)$/g, "$1").split(/, +/),

            isMatrix3d = currentTransform.indexOf("3d") !== -1;

        return {
            value: matrix,
            is3d: isMatrix3d
        };
    };

    ns.getTranslate = function ($element) {

        var matrix = ns.getCurrentMatrix($element);

        return {
            x: (matrix.is3d ? +matrix.value[12] : +matrix.value[4]),
            y: (matrix.is3d ? +matrix.value[13] : +matrix.value[5])
        };
    };

    ns.getScale = function ($element) {

        var matrix = ns.getCurrentMatrix($element);

        return {
            x: +matrix.value[0],
            y: (matrix.is3d ? +matrix.value[5] : +matrix.value[3])
        };
    };

    ns.jQueryfy = function (source) {

        return typeof source === "string" ||
            source instanceof HTMLElement ||
            source instanceof NodeList    ||
            source instanceof HTMLCollection ?
                $(source) : typeof source === "object" ?
                    source.jquery ?
                        source : $(source) :
                    $([null]);
    };

    ns.BEM_BLOCK = "mj-gallery";

    ns.BEM = function (E, M) {

        return ns.BEM_BLOCK + (E ? "__" + E : "") + (M ? "--" + M : "");
    };

    ns.CLASS = {
        self: ns.BEM(),
        selfActive: ns.BEM(null, "active"),
        selfInfoActive: ns.BEM(null, "info-active"),
        selfItemInfoActive: ns.BEM(null, "item-info-active"),
        selfWhite: ns.BEM(null, "white"),
        selfKeyboardFocus: ns.BEM(null, "keyboard-focus"),
        selfGrabbing: ns.BEM(null, "grabbing"),

        overlay: ns.BEM("overlay"),

        info: ns.BEM("info"),
        infoNoContent: ns.BEM("info", "no-content"),
        title: ns.BEM("title"),
        position: ns.BEM("position"),
        positionCurrent: ns.BEM("current"),
        positionTotal: ns.BEM("total"),

        controller: ns.BEM("controller"),
        controllerToolbar: ns.BEM("controller-toolbar"),
        btn: ns.BEM("btn"),
        btnHidden: ns.BEM("btn", "hidden"),
        btnClose: ns.BEM("close"),
        btnToggleInfo: ns.BEM("toggle-info"),
        btnToggleZoom: ns.BEM("toggle-zoom"),
        btnToggleZoomActive: ns.BEM("toggle-zoom", "active"),
        btnFullscreen: ns.BEM("fullscreen"),
        btnFullscreenActive: ns.BEM("fullscreen", "active"),
        arrows: ns.BEM("arrows"),
        arrow: ns.BEM("arrow"),
        arrowLeft: ns.BEM("arrow", "left"),
        arrowRight: ns.BEM("arrow", "right"),
        arrowHidden: ns.BEM("arrow", "hidden"),
        arrowRepeat: ns.BEM("arrow", "repeat"),

        items: ns.BEM("items"),

        item: ns.BEM("item"),
        itemImage: ns.BEM("item", "image"),
        itemIframe: ns.BEM("item", "iframe"),
        itemYoutube: ns.BEM("item", "youtube"),
        itemVimeo: ns.BEM("item", "vimeo"),
        itemHtml: ns.BEM("item", "html"),
        itemVideo: ns.BEM("item", "video"),
        itemCurrent: ns.BEM("item", "current"),
        itemPrev: ns.BEM("item", "prev"),
        itemNext: ns.BEM("item", "next"),
        itemAnim: ns.BEM("item", "anim"),
        itemLoaded: ns.BEM("item", "loaded"),
        itemFullSize: ns.BEM("item", "full-size"),
        itemObjectFitCover: ns.BEM("item", "object-fit-cover"),
        itemClosingUp: ns.BEM("item", "closing-up"),
        itemClosingDown: ns.BEM("item", "closing-down"),
        itemClosingScale: ns.BEM("item", "closing-scale"),
        itemEdgeAnimRight: ns.BEM("item", "edge-anim-right"),
        itemEdgeAnimLeft: ns.BEM("item", "edge-anim-left"),

        view: ns.BEM("view"),
        zoom: ns.BEM("zoom"),
        zoomZoomable: ns.BEM("zoom", "zoomable"),
        draggable: ns.BEM("draggable"),
        loader: ns.BEM("loader"),
        itemContent: ns.BEM("item-content"),
        itemHtmlContentWrapper: ns.BEM("html-item-content-wrapper"),
        itemHtmlContentCenter: ns.BEM("html-item-content-center"),
        image: ns.BEM("item-content", "image"),
        iframe: ns.BEM("item-content", "iframe"),
        youtube: ns.BEM("item-content", "youtube"),
        vimeo: ns.BEM("item-content", "vimeo"),
        html: ns.BEM("item-content", "html"),
        video: ns.BEM("item-content", "video"),

        itemInfo: ns.BEM("item-info"),
        itemInfoNoContent: ns.BEM("item-info", "no-content"),
        itemInfoContent: ns.BEM("item-info-content"),
        itemInfoTitle: ns.BEM("item-title"),
        itemInfoDescription: ns.BEM("item-description"),

        hideScrollbars: ns.BEM("hide-scrollbars"),
        hideScrollbarsPadding: ns.BEM("hide-scrollbars", "padding"),
        hideScrollbarsMargin: ns.BEM("hide-scrollbars", "margin"),
        hideScrollbarsOverflow: ns.BEM("hide-scrollbars", "overflow"),

        selector: function (item) {

            return "." + this[item];
        }
    };

    ns.DATA_PREFIX = "mjg-";

    ns.DATA = {
        itemContentIsRemoving: "item-content-is-removing",
        itemTitle: ns.DATA_PREFIX + "title",
        itemDescription: ns.DATA_PREFIX + "description",
        action: ns.DATA_PREFIX + "action",

        itemsSelector: ns.DATA_PREFIX + "selector",
        openingSelector: ns.DATA_PREFIX + "open",

        viewMaxWidth: ns.DATA_PREFIX + "view-width",
        viewMaxHeight: ns.DATA_PREFIX + "view-height",

        itemMaxWidth: ns.DATA_PREFIX + "max-width",
        itemMaxHeight: ns.DATA_PREFIX + "max-height",
        itemMinWidth: ns.DATA_PREFIX + "min-width",
        itemMinHeight: ns.DATA_PREFIX + "min-height",

        type: ns.DATA_PREFIX + "type",
        events: ns.DATA_PREFIX + "events",

        src: ns.DATA_PREFIX + "src",
        srcset: ns.DATA_PREFIX + "srcset",
        sizes: ns.DATA_PREFIX + "sizes",

        method: ns.DATA_PREFIX + "method",

        autoplay: ns.DATA_PREFIX + "autoplay",

        zoomable: ns.DATA_PREFIX + "zoomable",
        fullSize: ns.DATA_PREFIX + "full-size",
        objectFitCover: ns.DATA_PREFIX + "cover",
        scrollable: ns.DATA_PREFIX + "scrollable",

        attr: function (attr) {

            return "data-" + this[attr];
        },

        selector: function (attr, value) {

            return "[" + this.attr(attr) + (typeof value !== "undefined" ? "='" + value + "'": "") + "]";
        }
    };

    ns.EVENT = {
        zoom: "zoom",
        event: "event",
        youtubeReady: "youtubeready",
        vimeoReady: "vimeoready",
        videoReady: "videoready",
        load: "load",
        beforeDestroy: "beforedestroy",
        afterDestroy: "afterdestroy",
        afterRefresh: "afterrefresh",
        beforeRefresh: "beforerefresh",
        construct: "construct",
        init: "init",
        change: "change",
        beforeChange: "beforechange",
        afterChange: "afterchange",
        resize: "resize",
        open: "open",
        beforeOpen: "beforeopen",
        beforeFirstOpen: "beforefirstopen",
        beforeClose: "beforeclose",
        afterOpen: "afteropen",
        afterClose: "afterclose",
        close: "close",
        currentItemChanged: "currentitemchanged"
    };

    (function () {

        var events = {};

        ns.EVENT.on = function (type, cb, mjGallery) {

            var mjgId = mjGallery.getId();

            events[mjgId] = events[mjgId] || {};

            events[mjgId][type] = events[mjgId][type] || [];

            events[mjgId][type].push(cb);
        };

        ns.EVENT.off = function (type, handler, mjGallery) {

            var mjgId = mjGallery.getId();

            if (!handler) {

                if (!type) {

                    delete events[mjgId];

                    return;
                }

                delete events[mjgId][type];

                return;
            }

            if (events[mjgId] && events[mjgId][type]) {

                events[mjgId][type] = events[mjgId][type].filter(function (cb) {

                    return handler !== cb;
                });
            }
        };

        ns.EVENT.fire = function (type, event, mjGallery) {

            event = event || new ns.EVENT.Event({}, mjGallery);

            var mjgId = mjGallery.getId();

            if (events[mjgId] && events[mjgId][type]) {

                events[mjgId][type].forEach(function (handler) {

                    var returned = handler.call(mjGallery.getAPI(), event);

                    if (returned === false) {

                        event.preventDefault();
                    }
                });
            }
        };

        ns.EVENT.Event = function Event(event, mjGallery) {

            var isDefaultPrevented = false;

            event = event || {};

            event.mjGallery = mjGallery.getAPI();

            event.preventDefault = function () {

                isDefaultPrevented = true;
            };

            event.isDefaultPrevented = function () {

                return isDefaultPrevented;
            };

            $.extend(this, event);
        };

    }());

}(window.mjGallery, jQuery));

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery*/

(function (ns, $) {

    ns.TEMPLATE = {

        ITEM_INFO_CONTENT: function (content) {

            content = content || {};

            var tpl = [];

            if (content.title) {

                tpl.push(
                    "<h3 class=\"" + ns.CLASS.itemInfoTitle + "\">",
                        content.title,
                    "</h3>"
                );
            }

            if (content.description) {

                tpl.push(
                    "<p class=\"" + ns.CLASS.itemInfoDescription + "\">",
                        content.description,
                    "</p>"
                );
            }

            return [
                "<div class=\"" + ns.CLASS.itemInfoContent + "\">",
                    tpl.join(""),
                "</div>"
            ].join("");
        },

        POSITION: function (current, total) {

            return [
                "<div class=\"" + ns.CLASS.position + "\">",
                    "<span class=\"" + ns.CLASS.positionCurrent + "\">" + current + "</span>",
                        "/",
                    "<span class=\"" + ns.CLASS.positionTotal + "\">" + total + "</span>",
                "</div>"
            ].join("");
        },

        ITEM: {

            SELF: function (data) {

                data = data || {};

                return [

                    "<li class=\"" + ns.CLASS.item + " " + ns.BEM("item", data.type) + " " + (data.loaded ? ns.CLASS.itemLoaded : "") + " " + (data.fullSize ? ns.CLASS.itemFullSize : "") + " " + (data.objectFitCover ? ns.CLASS.itemObjectFitCover : "") + "\">",

                        "<div class=\"" + ns.CLASS.loader + "\">",
                            "<div class=\"inner\"></div>",
                        "</div>",

                        "<div class=\"" + ns.CLASS.zoom + " " + (data.zoomable ? ns.CLASS.zoomZoomable : "") + "\">",
                            "<div class=\"" + ns.CLASS.view + "\">",

                                //ITEM-CONTENT

                            "</div>",
                        "</div>",

                    "</li>"

                ].join("");
            },

            CONTENT: {}

        },

        ICON: {

            SELF: function (content, mod) {

                return [
                    "<span class=\"mj-gallery__icon " + (mod ? "mj-gallery__icon--" + mod: "") + "\">",
                        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\">",
                            content,
                        "</svg>",
                    "</span>"
                ].join("");
            },

            CLOSE: function () {

                return ns.TEMPLATE.ICON.SELF("<path d=\"M23.954 21.03l-9.184-9.095 9.092-9.174-2.832-2.807-9.09 9.179-9.176-9.088-2.81 2.81 9.186 9.105-9.095 9.184 2.81 2.81 9.112-9.192 9.18 9.1z\"/>");
            },

            ZOOM_IN: function () {

                return ns.TEMPLATE.ICON.SELF("<path d=\"M13 10h-3v3h-2v-3h-3v-2h3v-3h2v3h3v2zm8.172 14l-7.387-7.387c-1.388.874-3.024 1.387-4.785 1.387-4.971 0-9-4.029-9-9s4.029-9 9-9 9 4.029 9 9c0 1.761-.514 3.398-1.387 4.785l7.387 7.387-2.828 2.828zm-12.172-8c3.859 0 7-3.14 7-7s-3.141-7-7-7-7 3.14-7 7 3.141 7 7 7z\"/>", "in");
            },

            ZOOM_OUT: function () {

                return ns.TEMPLATE.ICON.SELF("<path d=\"M13 10h-8v-2h8v2zm8.172 14l-7.387-7.387c-1.388.874-3.024 1.387-4.785 1.387-4.971 0-9-4.029-9-9s4.029-9 9-9 9 4.029 9 9c0 1.761-.514 3.398-1.387 4.785l7.387 7.387-2.828 2.828zm-12.172-8c3.859 0 7-3.14 7-7s-3.141-7-7-7-7 3.14-7 7 3.141 7 7 7z\"/>", "out");
            },

            INFO: function () {

                return ns.TEMPLATE.ICON.SELF("<path d=\"M24 17.981h-13l-7 5.02v-5.02h-4v-16.981h24v16.981zm-2-14.981h-20v12.981h4v3.125l4.357-3.125h11.643v-12.981zm-9 6.001v5h-2v-5h2zm-1-1.5c.69 0 1.25-.56 1.25-1.25s-.56-1.25-1.25-1.25-1.25.56-1.25 1.25.56 1.25 1.25 1.25z\"/>");
            },

            FULLSCREEN_ON: function () {

                return ns.TEMPLATE.ICON.SELF("<path d=\"M24 9h-2v-4h-4v-2h6v6zm-6 12v-2h4v-4h2v6h-6zm-18-6h2v4h4v2h-6v-6zm6-12v2h-4v4h-2v-6h6z\"/>", "on");
            },

            FULLSCREEN_OFF: function () {

                return ns.TEMPLATE.ICON.SELF("<path d=\"M18 3h2v4h4v2h-6v-6zm6 12v2h-4v4h-2v-6h6zm-18 6h-2v-4h-4v-2h6v6zm-6-12v-2h4v-4h2v6h-6z\"/>", "off");
            },

            ARROW_LEFT: function () {

                return ns.TEMPLATE.ICON.SELF("<path d=\"M16.67 0l2.83 2.829-9.339 9.175 9.339 9.167-2.83 2.829-12.17-11.996z\"/>", "arrow");
            },

            ARROW_RIGHT: function () {

                return ns.TEMPLATE.ICON.SELF("<path d=\"M5 3l3.057-3 11.943 12-11.943 12-3.057-3 9-9z\"/>", "arrow");
            },

            ARROW_START: function () {

                return ns.TEMPLATE.ICON.SELF("<path d=\"M18.885 3.515c-4.617-4.618-12.056-4.676-16.756-.195l-2.129-2.258v7.938h7.484l-2.066-2.191c2.82-2.706 7.297-2.676 10.073.1 4.341 4.341 1.737 12.291-5.491 12.291v4.8c3.708 0 6.614-1.244 8.885-3.515 4.686-4.686 4.686-12.284 0-16.97z\"/>", "repeat");
            },

            ARROW_END: function () {

                return ns.TEMPLATE.ICON.SELF("<path d=\"M5.115 3.515c4.617-4.618 12.056-4.676 16.756-.195l2.129-2.258v7.938h-7.484l2.066-2.191c-2.82-2.706-7.297-2.676-10.073.1-4.341 4.341-1.737 12.291 5.491 12.291v4.8c-3.708 0-6.614-1.244-8.885-3.515-4.686-4.686-4.686-12.284 0-16.97z\"/>", "repeat");
            }
        },

        BUTTON: function (action, className, icon) {

            return "<button type=\"button\" class=\"" + className + " " + ns.CLASS.btn + "\" data-mjg-action=\"" + action + "\">" + icon + "</button>";
        },

        SELF: function (data) {

            data = data || {};

            return [
                "<div class=\"" + ns.CLASS.self + "\">",

                    "<div class=\"" + ns.CLASS.overlay  + "\"></div>",

                    "<div class=\"" + ns.CLASS.info + "\">",

                        //POSITION

                    "</div>",

                    "<div class=\"" + ns.CLASS.controller + "\">",

                        "<div class=\"" + ns.CLASS.controllerToolbar + "\">",

                            data.closeBtn ? ns.TEMPLATE.BUTTON("close", ns.CLASS.btnClose, ns.TEMPLATE.ICON.CLOSE()) : "",

                            data.infoBtn ? ns.TEMPLATE.BUTTON("toggleInfo", ns.CLASS.btnToggleInfo, ns.TEMPLATE.ICON.INFO()) : "",

                            data.zoomBtn ? ns.TEMPLATE.BUTTON("toggleZoom", ns.CLASS.btnToggleZoom, ns.TEMPLATE.ICON.ZOOM_IN() + ns.TEMPLATE.ICON.ZOOM_OUT()) : "",

                            data.fullscreenBtn ? ns.TEMPLATE.BUTTON("fullscreen", ns.CLASS.btnFullscreen, ns.TEMPLATE.ICON.FULLSCREEN_ON() + ns.TEMPLATE.ICON.FULLSCREEN_OFF()) : "",

                        "</div>",

                        "<div class=\"" + ns.CLASS.arrows + "\">",

                            ns.TEMPLATE.BUTTON("prev", [ns.CLASS.arrow, ns.CLASS.arrowLeft].join(" "), ns.TEMPLATE.ICON.ARROW_LEFT() + ns.TEMPLATE.ICON.ARROW_END()),

                            ns.TEMPLATE.BUTTON("next", [ns.CLASS.arrow, ns.CLASS.arrowRight].join(" "), ns.TEMPLATE.ICON.ARROW_RIGHT() + ns.TEMPLATE.ICON.ARROW_START()),

                        "</div>",

                    "</div>",

                    "<ul class=\"" + ns.CLASS.items + "\">",

                        //ITEMS

                    "</ul>",

                    "<div class=\"" + ns.CLASS.itemInfo + " " + ns.CLASS.itemInfoNoContent + "\">",

                        //ITEM_INFO_CONTENT

                    "</div>",

                "</div>"
            ].join("");
        }
    };

}(window.mjGallery, jQuery));

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery*/

(function (ns, $) {

    var ANIM_DURATION = 250;


    var onChange = function (event) {

            this.current = event.item;

            if (this.mjGallery.getOption(ns.OPTIONS.SHOW_POSITION)) {

                this.$positionCurrent.text(event.index + 1);
            }

            this.showItemInfo();
        },

        createPositionInfo = function () {

            this.$position = $(ns.TEMPLATE.POSITION(
                this.mjGallery.getCurrentPosition(), this.mjGallery.getTotalCount()
            ));

            this.$info.append(this.$position);

            this.$positionCurrent = this.$position.find(ns.CLASS.selector("positionCurrent"));
            this.$positionTotal = this.$position.find(ns.CLASS.selector("positionTotal"));
        },

        initInfo = function (event) {

            this.current = event.current;

            this.$itemInfo.append(ns.TEMPLATE.ITEM_INFO_CONTENT());

            if (this.mjGallery.getOption(ns.OPTIONS.SHOW_POSITION)) {

                createPositionInfo.call(this);
            }

            if (this.mjGallery.getOption(ns.OPTIONS.SHOW_INFO)) {

                this.showInfo();
            }

            this.showItemInfo();

            if (!this.mjGallery.getOption(ns.OPTIONS.SHOW_POSITION)) {

                this.$info.addClass(ns.CLASS.infoNoContent);
            }

            ns.EVENT.on(ns.EVENT.currentItemChanged, onChange.bind(this), this.mjGallery);
        },

        initEvents = function () {

            ns.EVENT.on(ns.EVENT.beforeFirstOpen, initInfo.bind(this), this.mjGallery);

            ns.EVENT.on(ns.EVENT.beforeClose, function () {

                this.currentContent = null;
                this.currentContentFromItem = null;

            }.bind(this), this.mjGallery);
        },

        showNewContent = function ($newContent) {

            $newContent.show().stop()
                .animate({ marginTop: 0 }, ANIM_DURATION, ns.JS_EASING, function () {

                $newContent.stop().animate({ opacity: 1 }, ANIM_DURATION, ns.JS_EASING);
            });
        },

        prepareNewContent = function (content) {

            var $newContent = $(ns.TEMPLATE.ITEM_INFO_CONTENT(content)),

                noContentShown = this.$itemInfo.hasClass(ns.CLASS.itemInfoNoContent);

            this.$itemInfo.append($newContent)
                .removeClass(ns.CLASS.itemInfoNoContent);

            $newContent.css({
                    opacity: 0,
                    marginTop: -$newContent.outerHeight(true)
                })
                .hide();

            if (!ns.USE_TRANSITIONS && noContentShown) {

                var CSS = {
                    textIndent: 1
                };

                this.$itemInfo.css(CSS)
                    .stop()
                    .animate({ textIndent: 0 }, {
                        duration: ns.DEF_DURATION,
                        easing: ns.JS_EASING,

                        step: function (step) {

                            var stepCSS = {};

                            stepCSS[ns.TRANSFORM_PROP] = ns.getTransformValue({
                                translate: [0, (step * 100) + "%"]
                            });

                            this.$itemInfo.css(stepCSS);

                        }.bind(this),

                        done: function () {

                            var doneCSS = {};

                            doneCSS[ns.TRANSFORM_PROP] = "";

                            this.$itemInfo.css(doneCSS);

                        }.bind(this)
                    });
            }

            return $newContent;
        },

        toggleCurrentContent = function ($currentContent, $newContent, newContentShown) {

            var $currentContentToToggle = $currentContent.filter(function (i, element) {

                    return !ns.$t(element).data(
                        this.mjGallery.withNS(ns.DATA.itemContentIsRemoving)
                    );
                }.bind(this));

            $currentContentToToggle.stop()
                .data(this.mjGallery.withNS(ns.DATA.itemContentIsRemoving), true)
                .animate({ opacity: 0 }, ANIM_DURATION, ns.JS_EASING, function () {

                    $currentContentToToggle.animate({ height: 0 }, ANIM_DURATION, ns.JS_EASING, function () {

                        $currentContentToToggle.remove();
                    });

                    if (!newContentShown && $newContent && !$newContent.data(this.mjGallery.withNS(ns.DATA.itemContentIsRemoving))) {

                        showNewContent.call(this, $newContent);

                        return;
                    }

                    if (!$newContent) {

                        this.$itemInfo.addClass(ns.CLASS.itemInfoNoContent);

                        if (!ns.USE_TRANSITIONS) {

                            var CSS = {
                                textIndent: 0
                            };

                            this.$itemInfo.css(CSS)
                                .stop()
                                .animate({ textIndent: 1 }, {
                                    duration: ns.DEF_DURATION,
                                    easing: ns.JS_EASING,

                                    step: function (step) {

                                        var stepCSS = {};

                                        stepCSS[ns.TRANSFORM_PROP] = ns.getTransformValue({
                                            translate: [0, (step * 100) + "%"]
                                        });

                                        this.$itemInfo.css(stepCSS);

                                    }.bind(this),

                                    done: function () {

                                        var doneCSS = {};

                                        doneCSS[ns.TRANSFORM_PROP] = "";

                                        this.$itemInfo.css(doneCSS);

                                    }.bind(this)
                                });
                        }
                    }

                }.bind(this));
        };


    var InfoController = ns.InfoController = function InfoController(mjGallery) {

            this.mjGallery = mjGallery;

            this.$mjg = mjGallery.get();

            this.$itemInfo = this.$mjg.find(ns.CLASS.selector("itemInfo"));

            this.$info = this.$mjg.find(ns.CLASS.selector("info"));

            this.current = null;

            initEvents.call(this);
        };


    InfoController.prototype.get = function () {

        return this.$info;
    };

    InfoController.prototype.hideItemInfoContent = function (noAnim) {

        var $currentContent = this.$itemInfo.find(ns.CLASS.selector("itemInfoContent"));

        if (noAnim) {

            $currentContent.empty();

            return this;
        }

        toggleCurrentContent.call(this, $currentContent, null);

        return this;
    };

    InfoController.prototype.getItemInfo = function (item) {

        var title = item.getTitle(),

            description = item.getDescription();

        return title || description ? {
            title: title,
            description: description
        } : null;
    };

    InfoController.prototype.hasInfoChanged = function (info) {

        if (info && this.currentContent && this.current === this.currentContentFromItem) {

            return info.description !== this.currentContent.description || info.title !== this.currentContent.title;
        }

        return true;
    };

    InfoController.prototype.showItemInfo = function () {

        var content = this.getItemInfo(this.current);

        if (!this.hasInfoChanged(content)) {

            return;
        }

        this.currentContent = content;
        this.currentContentFromItem = this.current;

        var $currentContent = this.$itemInfo.find(ns.CLASS.selector("itemInfoContent")),
            $newContent = null,

            noContentShown = this.$itemInfo.hasClass(ns.CLASS.itemInfoNoContent);

        if (!content && noContentShown) {

            return;
        }

        if (content) {

            $newContent = prepareNewContent.call(this, content);

            if (noContentShown) {

                showNewContent.call(this, $newContent);
            }
        }

        toggleCurrentContent.call(this, $currentContent, $newContent, noContentShown);
    };

    InfoController.prototype.hasInfo = function () {

        return Boolean(this.getItemInfo(this.current)) || !this.$info.hasClass(ns.CLASS.infoNoContent);
    };

    InfoController.prototype.toggleInfo = function () {

        this.$mjg.toggleClass(ns.CLASS.selfInfoActive);

        return this;
    };

    InfoController.prototype.showInfo = function () {

        this.$mjg.addClass(ns.CLASS.selfInfoActive);

        return this;
    };

    InfoController.prototype.hideInfo = function () {

        this.$mjg.removeClass(ns.CLASS.selfInfoActive);

        return this;
    };


}(window.mjGallery, jQuery));

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery*/

(function (ns, $) {

    var ItemsGenerator = ns.ItemsGenerator = function ItemsGenerator(mjGallery, options) {

            this.options = options;

            this.mjGallery = mjGallery;

            this.$itemsList = this.mjGallery.getItemsList();

            this.emptyItem = new ns.Item(null, this.mjGallery);

            this.items = null;
        };


        var haveSourcesChanged = function ($prev) {

                if ($prev.length !== this.$sources.length) {

                    return true;
                }

                var prev = $prev.toArray(),

                    changed;

                changed = this.$sources.toArray().some(function (source) {

                    return !~prev.indexOf(source);
                });

                return changed;
            },

            createItems = function () {

                if (this.items && this.items.length) {

                    this.items.forEach(function (item) {

                        item.destroy();
                    });
                }

                this.items = [];

                this.$sources.get().forEach(function (source, index) {

                    var $source = $(source),

                        ItemType = ns.Item.getClass($source);

                    this.items.push(new ItemType($source, this.mjGallery, index));

                }, this);
            },

            initPrevNextCurrent = function (openingSource) {

                var currentIndex = 0;

                this.items.some(function (item, index) {

                    if (item.$source[0] === openingSource) {

                        currentIndex = index;

                        return true;
                    }
                }, this);

                this.currentItem = this.items[currentIndex] || this.emptyItem;

                if (this.totalCount > 1) {

                    this.nextItem = this.items[currentIndex + 1];
                    this.prevItem = this.items[currentIndex - 1];

                    if (this.totalCount > 2 && !this.prevItem) {

                        this.prevItem = this.items[this.totalCount - 1];
                    }

                    if (this.totalCount > 2 && !this.nextItem) {

                        this.nextItem = this.items[0];
                    }
                }

                this.nextItem = this.nextItem || this.emptyItem;
                this.prevItem = this.prevItem || this.emptyItem;

                this.nextItem.setAsNext();
                this.prevItem.setAsPrev();
                this.currentItem.setAsCurrent();
            },

            findOpeningSourceByOpenAttr = function (attr) {

                return this.$sources.filter(function () {

                    return ns.$t(this).is(attr);

                })[0];
            },

            findOpeningSourceByHref = function (href) {

                return this.$sources.filter(function () {

                    return this.href === href ||
                        this.src === href ||
                        this.getAttribute(ns.DATA.attr("src")) === href ||
                        href.match(new RegExp(this.getAttribute(ns.DATA.attr("src")) + "$"));
                })[0];
            },

            findOpeningSourceBySrcAttr = function (srcAttr) {

                return this.$sources.filter(function () {

                    return this.href === srcAttr ||
                        this.src === srcAttr ||
                        this.getAttribute(ns.DATA.attr("src")) === srcAttr ||
                        srcAttr.match(new RegExp(this.href + "$")) ||
                        srcAttr.match(new RegExp(this.src + "$"));
                })[0];
            };

        ItemsGenerator.prototype.generate = function (openingSource) {

            var $prevSources = this.$sources,

                originalOpeningSource = openingSource,

                $openingElement = this.mjGallery.getOpeningElement(),

                selector;

            //je použit otevírací element (openBy) a je kliknuto na něj -> najít zdroje položek
            //1. první podle selektoru v data atributu.
            //2. první podle nastavení v "selector".
            //3. otevírací element
            if ($openingElement && ~$openingElement.toArray().indexOf(openingSource)) {

                //selektor zdrojů z data atributu nebo z options
                selector = $openingElement.data(ns.DATA.itemsSelector) || this.options.getOriginal(ns.OPTIONS.ITEMS_SELECTOR);

                //pokud je nastaven selektor zdrojů, tak se otevře ten první (může se přepsat pomocí atributu open)
                openingSource = selector ? $(selector)[0] : openingSource;

                //pokud je nastaven selektor zdrojů, tak se vyberou, jinak se použíjí elementy podle openBy
                selector = selector || ($openingElement && $openingElement.get());
            }

            if (this.options.get(ns.OPTIONS.GALLERY_MODE)) {

                this.$sources = $(selector || this.options.get(ns.OPTIONS.ITEMS_SELECTOR));

            } else {

                this.$sources = $(openingSource);
            }

            //otevřít specifický element podle atributu open/href/data-mjg-src (pouze v případě, že se klikne na openBy element)
            if ($openingElement && ~$openingElement.toArray().indexOf(originalOpeningSource)) {

                var open = $(originalOpeningSource).attr(ns.DATA.attr("openingSelector"));

                if (open) {

                    openingSource = findOpeningSourceByOpenAttr.call(this, open) || openingSource;

                } else if (originalOpeningSource.href) {

                    openingSource = findOpeningSourceByHref.call(this, originalOpeningSource.href) || openingSource;

                } else if (originalOpeningSource.getAttribute(ns.DATA.attr("src"))) {

                    var srcAttr = originalOpeningSource.getAttribute(ns.DATA.attr("src"));

                    openingSource = findOpeningSourceBySrcAttr.call(this, srcAttr) || openingSource;
                }
            }

            //obsah na stránce se změnil nebo se galerie otevírá poprvé -> načíst všechny položky a vytvořít Itemy
            if (!this.items || !$prevSources || this.options.get(ns.OPTIONS.ALWAYS_REFRESH_ITEMS) || haveSourcesChanged.call(this, $prevSources)) {

                this.$itemsList.empty();

                createItems.call(this);

                this.totalCount = this.items.length;

                this.$items = this.$itemsList.find(ns.CLASS.selector("item"));

            //obsah na stránce je stejný jako při posledním otevření
            } else {

                this.items.forEach(function (item) {

                   item.clearState();
                });
            }

            initPrevNextCurrent.call(this, openingSource);

            return this.items;
        };

    ItemsGenerator.prototype.getTotalCount = function () {

        return this.totalCount || 0;
    };

    ItemsGenerator.prototype.getEmptyItem = function () {

        return this.emptyItem;
    };

    ItemsGenerator.prototype.getPrevItem = function () {

        return this.prevItem;
    };

    ItemsGenerator.prototype.getNextItem = function () {

        return this.nextItem;
    };

    ItemsGenerator.prototype.getCurrentItem = function () {

        return this.currentItem;
    };

}(window.mjGallery, jQuery));

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

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery*/

(function (ns, $) {

    var Pointer = ns.Pointer = function Pointer() {

        this.start = { x: 0, y: 0 };
        this.current = { x: 0, y: 0 };
        this.diff = { x: 0, y: 0 };
        this.diffHistory = [];
        this.startDiff = { x: 0, y: 0 };
        this._prev = { x: 0, y: 0 };
        this.prev = { x: 0, y: 0 };
        this.dist = 0;

        this.pinch = {
            dist: 0,
            _prev: 0,
            prev: 0,
            diff: 0,
            start: {
                0: { x: 0, y: 0 },
                1: { x: 0, y: 0 }
            },
            current: {
                0: { x: 0, y: 0 },
                1: { x: 0, y: 0 }
            },
            startDiff: 0,
            startDist: 0
        };

        this.count = 0;

        this.moved = false;

        this.type = null;

        this.event = null;

        this.dblTap = false;
        this._lastDblTap = +new Date();
    };

    Pointer.FIX = {
        HOR: 1,
        VER: 2
    };

    Pointer.DIR = {
        HOR: 1,
        VER: 2
    };

    Pointer.TYPE = {
        TOUCH: 1,
        MOUSE: 2
    };

    Pointer.prototype.onStart = function (event) {

        this.event = event;

        var XY = ns.getClientValue(event);

        event = event.originalEvent || event;

        this.count = event.touches ? event.touches.length : 1;

        if (event.type === "touchstart") {

            if (this.count === 2) {

                this.dblTap = false;

            } else {

                var currentTap = +new Date();

                this.dblTap = currentTap - this._lastDblTap < 300 && Math.sqrt(Math.pow(this._prev.x - XY.x, 2) + Math.pow(this._prev.y - XY.y, 2)) < 20;

                this._lastDblTap = currentTap;
            }
        }

        this.start.x = XY.x;
        this.start.y = XY.y;

        this.current.x = XY.x;
        this.current.y = XY.y;

        this._prev.x = this.current.x;
        this._prev.y = this.current.y;

        this.prev.x = 0;
        this.prev.y = 0;

        this.dist = 0;
        this.diffHistory = [];

        this.pinch._prev = 0;
        this.pinch.prev = 0;
        this.pinch.diff = 0;
        this.pinch.dist = 0;
        this.pinch.startDiff = 0;
        this.pinch.startDist = 0;

        if (this.count === 2) {

            var XY2 = ns.getClientValue(event, 1);

            this.pinch._prev = Math.sqrt(Math.pow(XY2.x - XY.x, 2) + Math.pow(XY2.y - XY.y, 2));

            this.pinch.prev = 0;

            this.pinch.start = {
                0: {
                    x: XY.x,
                    y: XY.y
                },
                1: {
                    x: XY2.x,
                    y: XY2.y
                }
            };

            this.pinch.current = {
                0: {
                    x: XY.x,
                    y: XY.y
                },
                1: {
                    x: XY2.x,
                    y: XY2.y
                }
            };

            this.pinch.startDist = this.pinch._prev;
        }

        this.moved = false;

        this.type = event.type.match(/mouse/) ? Pointer.TYPE.MOUSE : Pointer.TYPE.TOUCH;
    };

    Pointer.prototype.onMove = function (event) {

        this.event = event;

        var XY = ns.getClientValue(event);

        this.prev.x = this._prev.x;
        this.prev.y = this._prev.y;

        this.diff.x = XY.x - this._prev.x;
        this.diff.y = XY.y - this._prev.y;

        this.diffHistory = this.diffHistory.slice(0, 2);
        this.diffHistory.unshift(this.diff);

        this.startDiff.x = XY.x - this.start.x;
        this.startDiff.y = XY.y - this.start.y;

        this._prev.x = this.current.x;
        this._prev.y = this.current.y;

        this.current.x = XY.x;
        this.current.y = XY.y;

        this.dist = Math.sqrt(Math.pow(this.diff.x, 2) + Math.pow(this.diff.y, 2));

        event = event.originalEvent || event;

        this.count = event.touches ? event.touches.length : 1;

        if (this.count === 2) {

            this.pinch.prev = this.pinch._prev;

            var XY2 = ns.getClientValue(event, 1);

            this.pinch.dist = Math.sqrt(Math.pow(XY2.x - XY.x, 2) + Math.pow(XY2.y - XY.y, 2));

            this.pinch.diff = this.pinch.dist - this.pinch._prev;

            this.pinch.startDiff = this.pinch.dist - Math.sqrt(Math.pow(this.pinch.start[1].x - this.pinch.start[0].x, 2) + Math.pow(this.pinch.start[1].y - this.pinch.start[0].y, 2));

            this.pinch.current = {
                0: {
                    x: XY.x,
                    y: XY.y
                },
                1: {
                    x: XY2.x,
                    y: XY2.y
                }
            };

            this.pinch._prev = this.pinch.dist;
        }

        this.moved = true;

        this.type = event.type.match(/mouse/) ? Pointer.TYPE.MOUSE : Pointer.TYPE.TOUCH;
    };

    Pointer.prototype.left = function () {

        return this.diff.x < 1;
    };

    Pointer.prototype.right = function () {

        return this.diff.x > 1;
    };

    Pointer.prototype.up = function () {

        return this.diff.y < 1;
    };

    Pointer.prototype.down = function () {

        return this.diff.y > 1;
    };

    Pointer.prototype.scaleDown = function () {

        return this.pinch.diff <= 0;
    };

    Pointer.prototype.scaleUp = function () {

        return this.pinch.diff > 0;
    };

    Pointer.prototype.dirX = function () {

        return (this.right() && 1) || -1;
    };

    Pointer.prototype.dirY = function () {

        return (this.down() && 1) || -1;
    };

    Pointer.prototype.dir = function () {

        return {
            x: this.dirX(),
            y: this.dirY()
        };
    };

    Pointer.prototype.horFix = function () {

        return Math.abs(this.diff.x) >= Math.abs(this.diff.y);
    };

    Pointer.prototype.verFix = function () {

        return Math.abs(this.diff.x) < Math.abs(this.diff.y);
    };

    Pointer.prototype.dirFix = function (tolerance) {

        if (tolerance && tolerance.value) {

            if (tolerance.dir === Pointer.DIR.VER) {

                return this.horFix() || Math.abs(this.diff.y) < tolerance.value ? Pointer.FIX.HOR : Pointer.FIX.VER;

            } else {

                return this.horFix() || Math.abs(this.diff.x) < tolerance.value ? Pointer.FIX.HOR : Pointer.FIX.VER;
            }
        }

        return this.horFix() ? Pointer.FIX.HOR : Pointer.FIX.VER;
    };

    Pointer.prototype.isMouse = function () {

        return this.type === Pointer.TYPE.MOUSE;
    };

    Pointer.prototype.isTouch = function () {

        return this.type === Pointer.TYPE.TOUCH;
    };

    Pointer.prototype.getDiff = function () {

        var x = 0,
            y = 0;

        if (this.diffHistory.length) {

            this.diffHistory.forEach(function (diff) {

                x += diff.x;
                y += diff.y;
            });

            x = x / this.diffHistory.length;
            y = y / this.diffHistory.length;
        }

        return {
            x: x,
            y: y
        };
    };

    Pointer.prototype.absDiff = function () {

        return {
            x: Math.abs(this.diff.x),
            y: Math.abs(this.diff.y)
        };
    };

    Pointer.prototype.absStartDiff = function () {

        return {
            x: Math.abs(this.startDiff.x),
            y: Math.abs(this.startDiff.y)
        };
    };

    Pointer.prototype.getPinchMiddle = function () {

        return {
            x: (this.pinch.current[0].x + this.pinch.current[1].x) / 2,
            y: (this.pinch.current[0].y + this.pinch.current[1].y) / 2
        };
    };

    Pointer.prototype.isDblTap = function () {

        return this.dblTap;
    };


}(window.mjGallery, jQuery));

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery*/

(function (ns, $) {

    var NS = "UIController",

        pointerMovedOnBtn = false,

        shiftKey = false,

        onOverlay = function (event) {

            var onOverlay = this.mjGallery.getCurrentItem().considerEventAsOnOverlay(event);

            //při psunutí myši/prstu nezavírat
            if (event.type.match(/move/) && onOverlay) {

                this.mjGallery.get().off(this.mjGallery.withNS(".onOverlay" + NS));

                //uživatel posouvá obrázkem => zachovat události
                if (this.mjGallery.eventsActive) {

                    return;
                }

                return false;
            }

            if (onOverlay && !event.type.match(/move/)) {

                this.mjGallery.close();

                //zrušit click
                if (event.type === "touchend") {

                    return false;
                }
            }
        },

        tapOnAction = function (event) {

            if (pointerMovedOnBtn || this.mjGallery.ignoreEvents || (event.type.match(/touch/) && event.originalEvent.touches.length)) {

                pointerMovedOnBtn = false;

                event.preventDefault();

                return;
            }

            var $btn = ns.$t(event.target).closest(ns.DATA.selector("action"));

            if ($btn.length) {

                var actions = $btn.data(ns.DATA.action).split(",");

                actions.forEach(function (action) {

                    if (typeof this.mjGallery.getAPI()[action] === "function") {

                        this.mjGallery.getAPI()[action]();

                    } else if (typeof this.mjGallery[action] === "function") {

                        this.mjGallery[action]();

                    } else if (typeof this[action] === "function") {

                        this[action]();
                    }
                }, this);

                return false;
            }
        },

        moveByMouseWheel = function (event) {

            var dir;

            if (event.type === "DOMMouseScroll") {

                dir = event.originalEvent.detail > 0 ? ns.DIR.DOWN : ns.DIR.UP;

            } else {

                dir = event.originalEvent.wheelDelta < 0 ? ns.DIR.DOWN : ns.DIR.UP;
            }

            this.mjGallery[dir === ns.DIR.DOWN ? "next" : "prev"]();
        },

        moveByKeyboard = function (event) {

            var dir = ~[38, 39].indexOf(event.which) ? ns.DIR.DOWN : ns.DIR.UP;

            this.mjGallery[dir === ns.DIR.DOWN ? "next" : "prev"]();
        },

        onKeyup = function (event) {

            if (event.which === 16) {

                shiftKey = false;
            }

            if (this.mjGallery.isClosed()) {

                return;
            }

            ///TAB
            if (event.which === 9) {

                this.mjGallery.get().addClass(ns.CLASS.selfKeyboardFocus);

                return;
            }

            var currentItem = this.mjGallery.getCurrentItem();

            ///ESC
            if (event.which === 27) {

                if (currentItem.isZoomedIn() && !currentItem.shouldPreserveEvent(ns.EVENTS.KEYS, event)) {

                    this.mjGallery.toggleZoom();

                    return false;
                }

                this.mjGallery.close();

                return false;
            }

            if (currentItem.shouldPreserveEvent(ns.EVENTS.KEYS, event)) {

                return;
            }

            //+-
            if (~[107, 109].indexOf(event.which) && currentItem.isZoomable()) {

                this.mjGallery[event.which === 107 ? "zoomIn" : "zoomOut"]();

                return false;
            }

            //šipky
            if (~[37, 38, 39, 40].indexOf(event.which)) {

                if (currentItem.isZoomedIn()) {

                    this.mjGallery.ignoreEvents = true;

                    currentItem.fitZoom(function () {

                        this.mjGallery.ignoreEvents = false;

                    }.bind(this));

                    return false;
                }

                moveByKeyboard.call(this, event);

                return false;
            }
        },

        onKeydown = function (event) {

            if (event.which === 16) {

                shiftKey = true;
            }

            if (this.mjGallery.isClosed() || this.mjGallery.getCurrentItem().shouldPreserveEvent(ns.EVENTS.KEYS, event)) {

                return;
            }

            //šipky
            if (~[37, 38, 39, 40].indexOf(event.which)) {

                if (this.mjGallery.getCurrentItem().isZoomedIn()) {

                    var step = ns.TRANTSLATE_ZOOM_STEP;

                    this.mjGallery.getCurrentItem().translateZoomBy([
                        event.which === 37 ? step : event.which === 39 ? -step : 0,
                        event.which === 38 ? step : event.which === 40 ? -step : 0
                    ], ((1000 / 60) / 1000) * 2);

                    this.mjGallery.ignoreEvents = true;
                }

                return false;
            }

            //+-
            if (this.mjGallery.getCurrentItem().isZoomable() && ~[107, 109].indexOf(event.which)) {

                return false;
            }
        },

        initFocus = function () {

            var $iframe = this.mjGallery.getCurrentItem().getIframe();

            if ($iframe && $iframe.length) {

                $iframe[0].focus();

            } else if (this.rightArrow) {

                this[this.rightArrowRepeat ? "$leftArrow" : "$rightArrow"].focus();

            } else if (this.leftArrow) {

                this[this.leftArrowRepeat ? "$rightArrow" : "$leftArrow"].focus();

            } else {

                this.$closeBtn.focus();
            }

            ns.EVENT.on(ns.EVENT.afterChange, function () {

                if (this.mjGallery.getTotalCount() < 2) {

                    return;
                }

                if (this.addFocusRight) {

                    this.addFocusRight = false;

                    this.$rightArrow.focus();

                } else if (this.addFocusLeft) {

                    this.addFocusLeft = false;

                    this.$leftArrow.focus();
                }
            }.bind(this), this.mjGallery);
        },

        onFocus = function (event) {

            var $target = ns.$t(event.target),

                $focusedItem = $target.closest(ns.CLASS.selector("item")),
                $currentItem = this.mjGallery.getCurrentItem().get(),

                focusedItemIndex = $focusedItem.index(),
                currentItemIndex = $currentItem.index(),

                focusInNotCurrentItem = $focusedItem.length && $focusedItem[0] !== $currentItem[0],

                $focusable;

            if (!$target.closest(ns.CLASS.selector("self")).length || focusInNotCurrentItem) {

                if (focusedItemIndex > -1 && focusedItemIndex > currentItemIndex) {

                    $focusable = this.$self.find(ns.FOCUSABLE);

                } else if (focusedItemIndex > -1 && focusedItemIndex < currentItemIndex) {

                    $focusable = !shiftKey ? $currentItem.find(ns.FOCUSABLE) : this.$self.find(ns.FOCUSABLE);

                } else {

                    $focusable = shiftKey ? $currentItem.find(ns.FOCUSABLE) : this.$self.find(ns.FOCUSABLE);
                }

                $focusable[shiftKey ? "last" : "first"]().focus();

                if (focusInNotCurrentItem) {

                    this.mjGallery.resetScroll();
                }

                return false;
            }
        },

        onScroll = function (event) {

            if (this.mjGallery.isOpened()) {

                if (event.type.match(/mouse/i)) {

                    if (this.mjGallery.getCurrentItem().shouldPreserveEvent(ns.EVENTS.SCROLL, event)) {

                        var $content = ns.$t(event.target).closest(ns.CLASS.selector("itemContent")),

                            onContent = !!$content.length;

                        if (!onContent) {

                            moveByMouseWheel.call(this, event);
                        }

                        return onContent;
                    }

                    moveByMouseWheel.call(this, event);
                }

                return false;
            }
        },

        onZoom = function (event) {

            this.$zoomBtn[event.zoomedIn ? "addClass" : "removeClass"](ns.CLASS.btnToggleZoomActive);
        },

        initEvents = function () {

            //zakázat posouvání stránky na infoControlleru (nahoře)
            this.infoController.get().on(this.mjGallery.withNS("touchmove." + NS), function () {

                return false;
            });

            //zakázat posouvání stránky na infoControlleru (dole)
            this.infoController.$itemInfo.on(this.mjGallery.withNS("touchmove." + NS), function () {

                return false;
            });

            //ovládání klávesnicí
            ns.$win.on(this.mjGallery.withNS("keyup." + NS), onKeyup.bind(this));
            ns.$win.on(this.mjGallery.withNS("keydown." + NS), onKeydown.bind(this));

            //zakázat posouvání stránky myší + ovládání kolečkem
            ns.$win.on(this.mjGallery.withNS("scroll." + NS, "DOMMouseScroll." + NS, "mousewheel." + NS), onScroll.bind(this));

            //zrušit předchozí informaci o posunu myší/prstem
            ns.$win.on(this.mjGallery.withNS("touchstart." + NS, "mousedown." + NS), function () {

                var itemViewZoomSelector = [ns.CLASS.selector("zoom"), ns.CLASS.selector("view"), ns.CLASS.selector("item"), ns.CLASS.selector("html")].join(",");

                //zavřít tapnutím na overlay (ve skutečnosti na item nebo view)
                this.mjGallery.get().off(this.mjGallery.withNS(".onOverlay" + NS))
                    .one(
                        this.mjGallery.withNS("click.onOverlay" + NS, "touchend.onOverlay" + NS, "touchmove.onOverlay" + NS, "mousemove.onOverlay" + NS), itemViewZoomSelector, onOverlay.bind(this)
                    );

            }.bind(this));

            //zachovat focus v galerii
            ns.$win.on(this.mjGallery.withNS("focusin." + NS), onFocus.bind(this));

            //ovládání tlačítky
            this.mjGallery.get().on(
                this.mjGallery.withNS("click." + NS, "touchend." + NS), tapOnAction.bind(this)
            );

            //zakázat posouvání stránky na UIControlleru
            this.$self.on(this.mjGallery.withNS("touchmove." + NS), function () {

                pointerMovedOnBtn = true;

                return false;
            });

            //zakázat spuštění akce při posunu
            this.mjGallery.get().on(this.mjGallery.withNS("touchmove." + NS), ns.DATA.selector("action"), function () {

                pointerMovedOnBtn = true;
            });

            if (!this.internalEventsRegistred) {

                this.internalEventsRegistred = true;

                ns.EVENT.on(ns.EVENT.afterOpen, initFocus.bind(this), this.mjGallery);

                ns.EVENT.on(ns.EVENT.zoom, onZoom.bind(this), this.mjGallery);
            }

            if (!this.rightArrow && !this.leftArrow) {

                this.$closeBtn.focus();
            }
        },

        destroyEvents = function () {

            //zakázat posouvání stránky na infoControlleru (nahoře)
            this.infoController.get().off(this.mjGallery.withNS("touchmove." + NS));

            //zakázat posouvání stránky na infoControlleru (dole)
            this.infoController.$itemInfo.off(this.mjGallery.withNS("touchmove." + NS));

            //focus
            //ovládání klávesnicí
            //zakázat posouvání stránky myší + ovládání kolečkem
            //zrušit předchozí informaci o posunu myší/prstem
            ns.$win.off(this.mjGallery.withNS("focusin." + NS, "scroll." + NS, "DOMMouseScroll." + NS, "mousewheel." + NS, "touchstart." + NS, "mousedown." + NS, "keyup." + NS, "keydown." + NS));

            //zavřít tapnutím na overlay (ve skutečnosti na item nebo view)
            //ovládání tlačítky
            this.mjGallery.get().off(this.mjGallery.withNS("click." + NS, "touchend." + NS, "touchmove." + NS, "mousemove." + NS));
        },

        toggleArrow = function (which, enable, init) {

            this["$" + which + "Arrow"][enable ? "removeClass" : "addClass"](ns.CLASS.arrowHidden);

            if (!enable) {

                this["$" + which + "Arrow"].blur();

                this["addFocus" + (which === "left" ? "Right" : "Left")] = !init;
            }

            this[which + "Arrow"] = enable;
            this["$" + which + "Arrow"][0].disabled = !enable;
        },

        toggleRepeatArrow = function (which, show) {

            this["$" + which + "Arrow"][show ? "addClass" : "removeClass"](ns.CLASS.arrowRepeat);

            this[which + "ArrowRepeat"] = show;
        },

        initArrows = function () {

            var totalCount = this.mjGallery.getTotalCount(),
                currentIndex = this.mjGallery.getCurrentIndex();

            if (totalCount === 1) {

                toggleArrow.call(this, "left", false, true);
                toggleArrow.call(this, "right", false, true);

            } else if (totalCount === 2) {

                toggleArrow.call(this, "left", currentIndex !== 0, true);
                toggleArrow.call(this, "right", currentIndex === 0, true);

            } else {

                toggleRepeatArrow.call(this, "left", currentIndex === 0);
                toggleRepeatArrow.call(this, "right", currentIndex + 1 === totalCount);
            }
        },

        toggleZoomBtn = function () {

            this.$zoomBtn[this.mjGallery.getCurrentItem().isZoomable() ? "removeClass": "addClass"](ns.CLASS.btnHidden);
        },

        toggleInfoBtn = function () {

            this.$infoBtn[this.infoController.hasInfo() ? "removeClass": "addClass"](ns.CLASS.btnHidden);
        },

        onBeforeOpen = function () {

            toggleInfoBtn.call(this);
            toggleZoomBtn.call(this);

            initArrows.call(this);
        },

        onBeforeChange = function () {

            clearTimeout(this.addFocusToIframeTimeout);
        },

        onAfterChange = function () {

            var $iframe = this.mjGallery.getCurrentItem().getIframe();

            if ($iframe && $iframe.length) {

                this.addFocusToIframeTimeout = setTimeout(function() {

                    $iframe.focus();

                }.bind(this), 0);
            }
        },

        onChange = function (event) {

            var totalCount = this.mjGallery.getTotalCount();

            toggleInfoBtn.call(this);
            toggleZoomBtn.call(this);

            if (totalCount === 2) {

                if (!event.prev || !event.next) {

                    toggleArrow.call(this, "right", !event.prev);
                    toggleArrow.call(this, "left", !!event.prev);

                //pro jistotu
                } else {

                    toggleArrow.call(this, "right", true);
                    toggleArrow.call(this, "left", true);
                }

            } else if (totalCount > 2) {

                toggleRepeatArrow.call(this, "left", event.currentIndex === 0);
                toggleRepeatArrow.call(this, "right", event.currentIndex + 1 === totalCount);
            }
        };


    var UIController = ns.UIController = function UIController(mjGallery, infoController) {

            this.internalEventsRegistred = false;

            this.mjGallery = mjGallery;

            this.infoController = infoController;

            this.$self = this.mjGallery.get().find(ns.CLASS.selector("controller"));

            this.$closeBtn = this.mjGallery.get().find(ns.CLASS.selector("btnClose"));
            this.$zoomBtn = this.mjGallery.get().find(ns.CLASS.selector("btnToggleZoom"));
            this.$fullscreenBtn = this.mjGallery.get().find(ns.CLASS.selector("btnFullscreen"));
            this.$infoBtn = this.mjGallery.get().find(ns.CLASS.selector("btnToggleInfo"));

            this.$leftArrow = this.$self.find(ns.CLASS.selector("arrowLeft"));
            this.$rightArrow = this.$self.find(ns.CLASS.selector("arrowRight"));

            this.leftArrow = this.rightArrow = true;

            ns.EVENT.on(ns.EVENT.beforeOpen, onBeforeOpen.bind(this), mjGallery);

            ns.EVENT.on(ns.EVENT.beforeChange, onBeforeChange.bind(this), this.mjGallery);
            ns.EVENT.on(ns.EVENT.change, onChange.bind(this), this.mjGallery);
            ns.EVENT.on(ns.EVENT.afterChange, onAfterChange.bind(this), this.mjGallery);

            ns.EVENT.on(ns.EVENT.open, initEvents.bind(this), this.mjGallery);
            ns.EVENT.on(ns.EVENT.beforeClose, destroyEvents.bind(this), this.mjGallery);
            ns.EVENT.on(ns.EVENT.beforeDestroy, destroyEvents.bind(this), this.mjGallery);
        };


    UIController.prototype.fullscreen = function (state) {

        if (this.mjGallery.get() && ns.SUPPORTS_FULLSCREEN) {

            if (!this.$fullscreenBtn.hasClass(ns.CLASS.btnFullscreenActive) && state !== false) {

                this.mjGallery.get()[0][ns.REQUEST_FULLSCREEN_FN]();

                this.$fullscreenBtn.addClass(ns.CLASS.btnFullscreenActive);

            } else if (document[ns.EXIT_FULLSCREEN_FN] && state !== true) {

                document[ns.EXIT_FULLSCREEN_FN]();

                this.$fullscreenBtn.removeClass(ns.CLASS.btnFullscreenActive);
            }
        }

        return this;
    };

    UIController.prototype.toggleInfo = function () {

        this.infoController.toggleInfo();

        return this;
    };

    UIController.prototype.showInfo = function () {

        this.infoController.showInfo();

        return this;
    };

    UIController.prototype.hideInfo = function () {

        this.infoController.hideInfo();

        return this;
    };


}(window.mjGallery, jQuery));

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

        Item = ns.Item = function Item($source, mjGallery, index, APIClass) {

            this.mjGallery = mjGallery;

            this.index = index;

            this.$source = $source || $(null);

            APIClass = APIClass || ItemAPI;

            this.API = new APIClass(this);

            this.prev = this.next = this.current = false;

            this.zoomable = this.zoomable || false;
            this.zoomValue = 1;

            this.generateItem();

            this.trfCtrl = ns.USE_TRANSITIONS ?
                new ns.ItemTransformationCSSController(this, mjGallery) :
                new ns.ItemTransformationJSController(this, mjGallery);

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

    Item.prototype.getZoom = function () {

        return this.$zoom;
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

        this.trfCtrl.fitZoom.apply(this.trfCtrl, arguments);

        return this;
    };

    Item.prototype.zoom = function (zoom/*, origin, animate, fit, done*/) {

        if (typeof zoom !== "undefined") {

            this.trfCtrl.zoom.apply(this.trfCtrl, arguments);

            return this;
        }

        return this.zoomValue;
    };

    Item.prototype.translateZoomBy = function (diff, duration, returnDiff) {

        var returnValue = this.trfCtrl.translateZoomBy.apply(this.trfCtrl, arguments);

        return returnDiff ? returnValue : this;
    };

    Item.prototype.slideZoom = function (/*diff, done*/) {

        this.trfCtrl.slideZoom.apply(this.trfCtrl, arguments);

        return this;
    };

    Item.prototype.isZoomedIn = function () {

        return this.trfCtrl.isZoomedIn.apply(this.trfCtrl, arguments);
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

        return this.getOption("fullSize");
    };

    Item.prototype.getZoomableAttr = function () {

        return this.getOption("zoomable");
    };

    Item.prototype.getObjectFitCoverAttr = function () {

        return this.getOption("objectFitCover");
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

        return this.getOption("type");
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

        if (!this.contentSizes) {

            this.getContentSizes();
        }

        this.$content.css(this.contentSizes);

        return this;
    };

    Item.prototype.addSizesToView = function () {

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

        this.trfCtrl.transform.apply(this.trfCtrl, arguments);

        return this;
    };

    Item.prototype.translate = function (/*value, useCurrentScale, duration*/) {

        this.trfCtrl.translate.apply(this.trfCtrl, arguments);

        return this;
    };

    Item.prototype.translateByState = function (/*value, useCurrentScale, duration*/) {

        this.trfCtrl.translateByState.apply(this.trfCtrl, arguments);

        return this;
    };

    Item.prototype.scale = function (/*value, useCurrentTranslate, duration*/) {

        this.trfCtrl.scale.apply(this.trfCtrl, arguments);

        return this;
    };

    Item.prototype.getTranslate = function () {

        return this.trfCtrl.getTranslate.apply(this.trfCtrl, arguments);
    };

    Item.prototype.getScale = function () {

        return this.trfCtrl.getScale.apply(this.trfCtrl, arguments);
    };

    Item.prototype.getZoomScale = function () {

        return this.trfCtrl.getZoomScale.apply(this.trfCtrl, arguments);
    };

    Item.prototype.clearTransform = function (/*duration, done*/) {

        this.trfCtrl.clearTransform.apply(this.trfCtrl, arguments);

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

    Item.prototype.removeFocus = function () {

        var $focused = this.$self.find(":focus");

        if ($focused.length) {

            $focused.blur();
        }

        return this;
    };

    Item.prototype.setAsCurrent = function (duration, done) {

        this.prev = this.next = false;
        this.current = true;

        this.load();

        if (duration) {

            this.trfCtrl.clearTransform(duration, function () {

                done.call(this);

            }.bind(this));

        } else {

            if (ns.USE_TRANSITIONS) {

                this.trfCtrl.stopTransition();
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

        this.next = this.current = false;
        this.prev = true;

        this.load();

        if (this.isZoomedIn()) {

            this.zoom(1, undefined, duration, true);
        }

        this.removeFocus();

        if (duration) {

            if (ns.USE_TRANSITIONS) {

                this.$self.addClass(ns.CLASS.itemAnim);
            }

            this.trfCtrl.clearTransform(duration, function () {

                this.$self.removeClass(ns.CLASS.itemAnim);

                if (done) {

                    done.call(this);
                }

            }.bind(this));

        } else {

            this.$self.removeClass(ns.CLASS.itemAnim);

            if (ns.USE_TRANSITIONS) {

                this.trfCtrl.stopTransition();
            }
        }

        this.$self.removeClass(ns.CLASS.itemCurrent)
            .removeClass(ns.CLASS.itemNext)
            .addClass(ns.CLASS.itemPrev);

        return this;
    };

    Item.prototype.setAsNext = function (duration, done) {

        this.prev = this.current = false;
        this.next = true;

        this.load();

        if (this.isZoomedIn()) {

            this.zoom(1, undefined, duration, true);
        }

        this.removeFocus();

        if (duration) {

            if (ns.USE_TRANSITIONS) {

                this.$self.addClass(ns.CLASS.itemAnim);
            }

            this.trfCtrl.clearTransform(duration, function () {

                this.$self.removeClass(ns.CLASS.itemAnim);

                if (done) {

                    done.call(this);
                }

            }.bind(this));

        } else {

            this.$self.removeClass(ns.CLASS.itemAnim);

            if (ns.USE_TRANSITIONS) {

                this.trfCtrl.stopTransition();
            }
        }

        this.$self.removeClass(ns.CLASS.itemCurrent)
            .removeClass(ns.CLASS.itemPrev)
            .addClass(ns.CLASS.itemNext);

        return this;
    };

    Item.prototype.clearState = function () {

        this.prev = this.next = this.current = false;

        this.trfCtrl.clearTransform();

        this.unsetAsClosing();

        this.$self.removeClass(ns.CLASS.itemCurrent)
            .removeClass(ns.CLASS.itemPrev)
            .removeClass(ns.CLASS.itemNext)
            .removeClass(ns.CLASS.itemAnim);

        return this;
    };

    Item.prototype.setAsClosing = function (/*duration, dir, translate, scale*/) {

        this.removeFocus();

        this.trfCtrl.closeAnim.apply(this.trfCtrl, arguments);

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

        this.trfCtrl.edgeAnim.apply(this.trfCtrl, arguments);

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

        HTMLItem = ns.HTMLItem = function HTMLItem($source, mjGallery, index) {

            this.type = ns.Item.TYPE.HTML;

            ns.Item.call(this, $source, mjGallery, index, HTMLAPI);
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

        if (this.$iframe) {

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

            onTextInput = ns.$t(event.target).is("input:not([disabled], [type='submit'], [type='checkbox'], [type='radio']), textarea:not([disabled]), *[contenteditable]");

        if (((type === ns.EVENTS.POINTER && (!/touch/.test(event.type) || ns.$t(event.target).is(":focus"))) || type === ns.EVENTS.KEYS) && onTextInput) {

            return true;
        }

        var onWrapper = !!ns.$t(event.target).closest(ns.CLASS.selector("itemHtmlContentWrapper")).length,

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

        var method = this.$source.data(ns.DATA.method) || this.mjGallery.getOption(ns.OPTIONS.HTML_GENERATE_METHOD);

        method = method ? method.toLowerCase() : this.getSrcAttr() ? HTMLItem.METHOD.APPEND : HTMLItem.METHOD.GENERATE;

        return method;
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

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery*/

(function (ns, $) {

    var API = ["play", "pause", "stop", "seekTo", "volume", "getPlayer"].concat(ns.Item.API),

        VideoItemAPI = function VideoItemAPI(item) {

            ns.Item.generateAPI.call(this, item, API);
        },

        TEMPLATE = function () {

            return "<div class=\"" + ns.CLASS.itemContent + " " + ns.CLASS.draggable + " " + ns.CLASS.video + "\"></div>";
        },

        VideoItem = ns.VideoItem = function VideoItem($source, mjGallery, index) {

            this.type = ns.Item.TYPE.YOUTUBE;

            ns.Item.call(this, $source, mjGallery, index, VideoItemAPI);

            this.pauseVideoBeforeClose = function () {

                this.pause();

            }.bind(this);
        };

    ns.Item.extend("VIDEO", "video", VideoItem);


    VideoItem.METHOD = {
        APPEND: "append",
        CLONE: "clone"
    };


    VideoItem.prototype.generateContent = function () {

        this.$content = $(TEMPLATE());

        return this;
    };

    VideoItem.prototype.shouldPreserveEvent = function (type) {

        return type === ns.EVENTS.POINTER || ns.Item.prototype.shouldPreserveEvent.apply(this, arguments);
    };

    VideoItem.prototype.getPlayer = function () {

        return this.videoPlayer || null;
    };

    VideoItem.prototype.volume = function (volume) {

        if (typeof volume === "undefined") {

            if (this.videoPlayer && this.loaded) {

                return this.videoPlayer.volume;
            }

            return null;
        }

        if (this.videoPlayer && this.loaded) {

            this.videoPlayer.volume = volume;
        }

        return this;
    };

    VideoItem.prototype.shouldAutoplay = function () {

        if (typeof this.autoplay !== "undefined") {

            return this.autoplay;
        }

        this.autoplay = this.getOption("autoplay");

        if (this.$video && this.$video.length && this.$video[0].hasAttribute("autoplay")) {

            this.autoplay = this.$video.prop("autoplay");
        }

        if (typeof this.autoplay === "undefined") {

            this.autoplay = this.mjGallery.getOption(ns.OPTIONS.AUTOPLAY_VIDEO);
        }

        return this.autoplay;
    };

    VideoItem.prototype.play = function (atStoppedOrTime) {

        if (this.videoPlayer && this.loaded) {

            if (atStoppedOrTime) {

                this.seekTo(atStoppedOrTime);
            }

            this.videoPlayer.play();
        }

        return this;
    };

    VideoItem.prototype.pause = function () {

        if (this.videoPlayer && this.loaded) {

            this.videoPlayer.pause();
        }

        return this;
    };

    VideoItem.prototype.seekTo = function (time) {

        if (this.videoPlayer && this.loaded) {

            this.videoPlayer.currentTime = time === true ? this.stoppedAt || 0 : time || 0;
        }

        return this;
    };

    VideoItem.prototype.stop = function () {

        if (this.videoPlayer && this.loaded) {

            this.videoPlayer.pause();

            this.videoPlayer.currentTime = 0;
        }

        return this;
    };

    VideoItem.prototype.destroy = function () {

        ns.Item.prototype.destroy.call(this);

        ns.EVENT.off(ns.EVENT.beforeClose, this.pauseVideoBeforeClose, this.mjGallery);
    };

    VideoItem.prototype.getMethod = function () {

        if (typeof this.method !== "undefined") {

            return this.method;
        }

        this.method = this.$source.data(ns.DATA.method) || this.mjGallery.getOption(ns.OPTIONS.HTML_GENERATE_METHOD);

        this.method = this.method ? this.method.toLowerCase() : VideoItem.METHOD.APPEND;

        if (!~[VideoItem.METHOD.APPEND, VideoItem.METHOD.CLONE].indexOf(this.method)) {

            this.method = VideoItem.METHOD.APPEND;
        }

        return this.method;
    };

    VideoItem.prototype.get$Video = function () {

        if (typeof this.$video !== "undefined") {

            return this.$html;
        }

        this.$video = $(this.getSrcAttr());

        if (this.$video[0].tagName.toLowerCase() === "script") {

            this.$video = $(this.$video.html());
        }

        if (this.getMethod() === VideoItem.METHOD.CLONE) {

            this.$video = this.$video.clone();
        }

        this.$video.css("display", "");

        return this.$video;
    };

    VideoItem.prototype.load = function () {

        if (this.loaded || this.loading || this.isEmpty()) {

            if (this.suspended) {

                this.suspended = false;

                this.getPlayer().load();
            }

            return this;
        }

        this.get$Video();

        this.videoPlayer = this.$video[0];

        this.$content.append(this.$video);

        var fn = function () {

            this.setAsLoaded();

            this.fireLoadEvent();

            setTimeout(this.refreshSize.bind(this), 0);

            this.mjGallery.on(ns.EVENT.beforeClose, this.pauseVideoBeforeClose, this.mjGallery);

            var videoReadyEvent = new ns.EVENT.Event({
                item: this.API,
                index: this.getIndex(),
                player: this.getPlayer()
            }, this.mjGallery);

            ns.EVENT.fire(ns.EVENT.videoReady, videoReadyEvent, this.mjGallery);

            if (!this.current || videoReadyEvent.isDefaultPrevented() || this.loadEvent.isDefaultPrevented() || this.mjGallery.isClosed()) {

                this.stop();

            } else if (this.shouldAutoplay()) {

                this.play();
            }

            this.$video.off(this.mjGallery.withNS("timeupdate", "pause", "seeked"))
                .on(this.mjGallery.withNS("timeupdate", "pause", "seeked"), function () {

                    this.stoppedAt = this.$video[0].currentTime;

                }.bind(this));

            this.$video.off(this.mjGallery.withNS("abort", "ended"))
                .on(this.mjGallery.withNS("abort", "ended"), function () {

                    this.stoppedAt = 0;

                }.bind(this));

        }.bind(this);


        if (this.$video[0].readyState && this.$video[0].videoHeight !== 0) {

            fn();

            return this;
        }

        this.loading = true;

        this.$video.off(this.mjGallery.withNS("suspend"))
            .one(this.mjGallery.withNS("suspend"), function () {

                if (this.current) {

                    this.getPlayer().load();

                    return;
                }

                this.suspended = true;

            }.bind(this));

        this.$video.off(this.mjGallery.withNS("canplay"))
            .one(this.mjGallery.withNS("canplay"), function () {

                fn();

                setTimeout(this.refreshSize.bind(this), 0);

            }.bind(this));

        return this;
    };

    VideoItem.prototype.setAsCurrent = function (duration, done) {

        if (duration) {

            ns.Item.prototype.setAsCurrent.call(this, duration, function () {

                if (this.videoPlayer && this.loaded) {

                    this.seekTo(true);

                    this[this.shouldAutoplay() ? "play" : this.stoppedAt ? "pause" : "stop"]();
                }

                done();

            }.bind(this));

        } else {

            ns.Item.prototype.setAsCurrent.apply(this, arguments);

            if (this.videoPlayer && this.loaded) {

                this.seekTo(true);

                this[this.shouldAutoplay() ? "play" : this.stoppedAt ? "pause" : "stop"]();
            }
        }
        return this;
    };

    VideoItem.prototype.setAsPrev = function (/*duration, done*/) {

        ns.Item.prototype.setAsPrev.apply(this, arguments);

        if (this.videoPlayer && this.loaded && !this.videoPlayer.paused) {

            this[this.stoppedAt ? "pause": "stop"]();
        }

        return this;
    };

    VideoItem.prototype.setAsNext = function (/*duration, done*/) {

        ns.Item.prototype.setAsNext.apply(this, arguments);

        if (this.videoPlayer && this.loaded && !this.videoPlayer.paused) {

            this[this.stoppedAt ? "pause": "stop"]();
        }

        return this;
    };

}(window.mjGallery, jQuery));

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery, Vimeo*/

(function (ns, $) {

    var API_URL = (window.location.protocol || "https:") + "//player.vimeo.com/api/player.js",

        $VimeoAPI = null,

        onVimeoAPIReady = [],
        vimeoAPIReady = false,

        loadVimeoAPI = function () {

            if ($VimeoAPI) {

                return;
            }

            $VimeoAPI = $("<script>");

            ns.$t(document.body).append($VimeoAPI);

            $VimeoAPI.one("load." + ns.NS, function () {

                vimeoAPIReady = true;

                onVimeoAPIReady.forEach(function (fn) {

                    fn();
                });

                onVimeoAPIReady = [];
            });

            $VimeoAPI.attr("src", API_URL);
        },

        API = ["getVideoId", "play", "pause", "stop", "seekTo", "volume", "getPlayer"].concat(ns.Item.API),

        VimeoItemAPI = function VimeoItemAPI(item) {

            ns.Item.generateAPI.call(this, item, API);
        },

        TEMPLATE = function () {

            return "<div class=\"" + ns.CLASS.itemContent + " " + ns.CLASS.draggable + " " + ns.CLASS.vimeo + "\"></div>";
        },

        VimeoItem = ns.VimeoItem = function VimeoItem($source, mjGallery, index) {

            this.type = ns.Item.TYPE.VIMEO;

            ns.Item.call(this, $source, mjGallery, index, VimeoItemAPI);

            this.pauseVideoBeforeClose = function () {

                this.pause();

            }.bind(this);
        };

    ns.Item.extend("VIMEO", "vimeo", VimeoItem, function (src) {

        src = String(src);

        return src.match(/^(?:https?:)?(?:\/\/)?(?:www\.)?(vimeo\.com|player\.vimeo\.com)/);
    });


    VimeoItem.prototype.generateContent = function () {

        this.$content = $(TEMPLATE());

        return this;
    };

    VimeoItem.prototype.getIframe = function () {

        return this.$iframe;
    };

    VimeoItem.prototype.getPlayer = function () {

        return this.vimeoPlayer || null;
    };

    VimeoItem.prototype.volume = function (volume) {

        if (typeof volume === "undefined") {

            if (this.vimeoPlayer && this.vimeoPlayer.stop) {

                return this.vimeoPlayer.getVolume();
            }

            return null;
        }

        if (this.vimeoPlayer && this.vimeoPlayer.stop) {

            this.vimeoPlayer.setVolume(volume);
        }

        return this;
    };

    VimeoItem.prototype.shouldAutoplay = function () {

        if (typeof this.autoplay !== "undefined") {

            return this.autoplay;
        }

        this.autoplay = this.getOption("autoplay");

        if (typeof this.autoplay === "undefined") {

            this.autoplay = this.mjGallery.getOption(ns.OPTIONS.AUTOPLAY_VIDEO);
        }

        return this.autoplay;
    };

    VimeoItem.prototype.play = function (atStoppedOrTime) {

        if (this.vimeoPlayer && this.vimeoPlayer.play) {

            if (atStoppedOrTime) {

                this.seekTo(atStoppedOrTime);
            }

            this.vimeoPlayer.play();
        }

        return this;
    };

    VimeoItem.prototype.pause = function () {

        if (this.vimeoPlayer && this.vimeoPlayer.pause) {

            this.vimeoPlayer.pause();
        }

        return this;
    };

    VimeoItem.prototype.seekTo = function (time) {

        if (this.vimeoPlayer && this.vimeoPlayer.setCurrentTime) {

            this.vimeoPlayer.setCurrentTime(time === true ? this.stoppedAt || 0 : time || 0);
        }

        return this;
    };

    VimeoItem.prototype.stop = function () {

        if (this.vimeoPlayer && this.vimeoPlayer.stop) {

            this.vimeoPlayer.stop();
        }

        return this;
    };

    VimeoItem.prototype.destroy = function () {

        ns.Item.prototype.destroy.call(this);

        ns.EVENT.off(ns.EVENT.beforeClose, this.pauseVideoBeforeClose, this.mjGallery);
    };

    VimeoItem.prototype.getVideoId = function () {

        var src = this.getSrcAttr(),

            id = src.match(/(?:video\/|vimeo\.com\/)([0-9]+)/);

        return id ? id[1] : src;
    };

    VimeoItem.prototype.getIframe = function () {

        return this.$iframe && this.$iframe.length ? this.$iframe : this.$content.find("iframe");
    };

    VimeoItem.prototype.load = function () {

        //video se občas nenačte, pokud se galerie zavře -> odstraněním a opětovným vložením se spustí načítání znova
        if (this.loading) {

            this.$iframe = this.getIframe();

            if (this.$iframe.length && !this.$iframe.data("ready")) {

                this.$iframe.parent()
                    .append(this.$iframe);
            }
        }

        if (this.loaded || this.loading || this.isEmpty()) {

            return this;
        }

        var fn = function () {

            this.vimeoPlayer = new Vimeo.Player(this.$content[0], {
                id: this.getVideoId(),
                autoplay: this.current && this.shouldAutoplay() && this.mjGallery.isOpened(),
                autopause: false
            });

            this.vimeoPlayer.ready().then(function () {

                this.setAsLoaded();

                this.fireLoadEvent();

                this.$iframe = this.getIframe()
                    .attr("width", "")
                    .attr("height", "");

                setTimeout(this.refreshSize, 0);

                this.getTitle();

                this.mjGallery.on(ns.EVENT.beforeClose, this.pauseVideoBeforeClose, this.mjGallery);

                var vimeoReadyEvent = new ns.EVENT.Event({
                    item: this.getAPI(),
                    index: this.getIndex(),
                    player: this.getPlayer()
                }, this.mjGallery);

                ns.EVENT.fire(ns.EVENT.vimeoReady, vimeoReadyEvent, this.mjGallery);

                if (vimeoReadyEvent.isDefaultPrevented() || this.loadEvent.isDefaultPrevented() || this.mjGallery.isClosed()) {

                    this.stop();
                }
            }.bind(this));

            this.vimeoPlayer.on("pause", function (event) {

                this.stoppedAt = event.seconds;

            }.bind(this));

            this.vimeoPlayer.on("ended", function () {

                this.stoppedAt = 0;

            }.bind(this));

        }.bind(this);

        if (vimeoAPIReady) {

            fn();

        } else {

            loadVimeoAPI(this);

            onVimeoAPIReady.push(fn);
        }

        this.loading = true;

        return this;
    };

    VimeoItem.prototype.setAsCurrent = function (duration, done) {

        if (duration) {

            ns.Item.prototype.setAsCurrent.call(this, duration, function () {

                if (this.vimeoPlayer && this.vimeoPlayer.play) {

                    if (this.shouldAutoplay()) {

                        this.seekTo(true);

                        this.play();

                    } else {

                        this.pause();
                    }
                }

                done();

            }.bind(this));

        } else {

            ns.Item.prototype.setAsCurrent.apply(this, arguments);

            if (this.vimeoPlayer && this.vimeoPlayer.play) {

                if (this.shouldAutoplay()) {

                    this.seekTo(true);

                    this.play();

                } else {

                    this.pause();
                }
            }
        }

        return this;
    };

    VimeoItem.prototype.getTitle = function () {

        if (!this.title && !this.mjGallery.getOptions().isSetByUser(ns.OPTIONS.ITEM_TITLE_SELECTOR)) {

            this.title = this.getOption("itemTitle") || "";

            if (!this.title && this.loaded) {

                this.vimeoPlayer.getVideoTitle().then(function (title) {

                    this.title = title || "";

                    this.mjGallery.refreshItemInfo();

                }.bind(this));
            }

        } else {

            ns.Item.prototype.getTitle.call(this);
        }

        return this.title;
    };

    VimeoItem.prototype.setAsPrev = function (/*duration, done*/) {

        ns.Item.prototype.setAsPrev.apply(this, arguments);

        if (this.vimeoPlayer && this.vimeoPlayer.pause) {

            this.pause();
        }

        return this;
    };

    VimeoItem.prototype.setAsNext = function (/*duration, done*/) {

        ns.Item.prototype.setAsNext.apply(this, arguments);

        if (this.vimeoPlayer && this.vimeoPlayer.pause) {

            this.pause();
        }

        return this;
    };

}(window.mjGallery, jQuery));

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery, YT*/

(function (ns, $) {

    var API_URL = (window.location.protocol || "https:") + "//www.youtube.com/iframe_api",

        $YouTubeAPI = null,

        onYouTubeIframeAPIReady = [],
        youTubeIframeAPIReady = false,

        loadYouTubeAPI = function () {

            if ($YouTubeAPI) {

                return;
            }

            $YouTubeAPI = $("<script>");

            ns.$t(document.body).append($YouTubeAPI);

            var savedReadyFn = window.onYouTubeIframeAPIReady;

            window.onYouTubeIframeAPIReady = function () {

                youTubeIframeAPIReady = true;

                if (savedReadyFn) {

                    savedReadyFn();
                }

                onYouTubeIframeAPIReady.forEach(function (fn) {

                    fn();
                });

                onYouTubeIframeAPIReady = [];
            };

            $YouTubeAPI.attr("src", API_URL);
        },

        API = ["getVideoId", "play", "pause", "stop", "seekTo", "volume", "getPlayer"].concat(ns.Item.API),

        YouTubeItemAPI = function YouTubeItemAPI(item) {

            ns.Item.generateAPI.call(this, item, API);
        },

        TEMPLATE = function () {

            return "<div class=\"" + ns.CLASS.itemContent + " " + ns.CLASS.draggable + " " + ns.CLASS.youtube + "\"></div>";
        },

        YouTubeItem = ns.YouTubeItem = function YouTubeItem($source, mjGallery, index) {

            this.type = ns.Item.TYPE.YOUTUBE;

            ns.Item.call(this, $source, mjGallery, index, YouTubeItemAPI);

            this.pauseVideoBeforeClose = function () {

                this.pause();

            }.bind(this);
        };

    ns.Item.extend("YOUTUBE", "youtube", YouTubeItem, function (src) {

        src = String(src);

        return src.match(/^(?:https?:)?(?:\/\/)?(?:www\.)?(youtube\.com|youtu\.be)/);
    });


    YouTubeItem.prototype.generateContent = function () {

        this.$content = $(TEMPLATE());

        return this;
    };

    YouTubeItem.prototype.getIframe = function () {

        return this.$content;
    };

    YouTubeItem.prototype.getPlayer = function () {

        return this.youTubePlayer || null;
    };

    YouTubeItem.prototype.volume = function (volume) {

        if (typeof volume === "undefined") {

            if (this.youTubePlayer && this.loaded) {

                return this.youTubePlayer.getVolume();
            }

            return null;
        }

        if (this.youTubePlayer && this.loaded) {

            this.youTubePlayer.setVolume(volume);
        }

        return this;
    };

    YouTubeItem.prototype.shouldAutoplay = function () {

        if (typeof this.autoplay !== "undefined") {

            return this.autoplay;
        }

        this.autoplay = this.getOption("autoplay");

        if (typeof this.autoplay === "undefined") {

            this.autoplay = this.mjGallery.getOption(ns.OPTIONS.AUTOPLAY_VIDEO);
        }

        return this.autoplay;
    };

    YouTubeItem.prototype.play = function (atStoppedOrTime) {

        if (this.youTubePlayer && this.loaded) {

            if (atStoppedOrTime) {

                this.seekTo(atStoppedOrTime);
            }

            this.youTubePlayer.playVideo();
        }

        return this;
    };

    YouTubeItem.prototype.pause = function () {

        if (this.youTubePlayer && this.loaded) {

            this.youTubePlayer.pauseVideo();
        }

        return this;
    };

    YouTubeItem.prototype.seekTo = function (time) {

        if (this.youTubePlayer && this.loaded) {

            this.youTubePlayer.seekTo(time === true ? this.stoppedAt || 0 : time || 0);
        }

        return this;
    };

    YouTubeItem.prototype.stop = function () {

        if (this.youTubePlayer && this.loaded) {

            this.youTubePlayer.stopVideo();
        }

        return this;
    };

    YouTubeItem.prototype.destroy = function () {

        ns.Item.prototype.destroy.call(this);

        ns.EVENT.off(ns.EVENT.beforeClose, this.pauseVideoBeforeClose, this.mjGallery);
    };

    YouTubeItem.prototype.getVideoId = function () {

        var src = this.getSrcAttr();

        src = src.split("/").pop();

        if (src.match(/^[A-Za-z0-9_\-]+$/)) {

            return src;
        }

        var id = src.match(/(?:watch\/?\?v=)([A-Za-z0-9_\-]+)/);

        return id ? id[1] : src;
    };

    YouTubeItem.prototype.load = function () {

        //video se občas nenačte, pokud se galerie zavře -> odstraněním a opětovným vložením se spustí načítání znova
        if (this.loading) {

            if (this.$content[0].tagName.toLowerCase() !== "iframe") {

                this.$content = this.$self.find(ns.CLASS.selector("itemContent"));

                if (this.$content[0].tagName.toLowerCase() !== "iframe") {

                    return this;
                }
            }

            this.$content.parent()
                .append(this.$content);
        }

        if (this.loaded || this.loading || this.isEmpty()) {

            return this;
        }

        var fn = function () {

            this.youTubePlayer = new YT.Player(this.$content[0], {

                videoId: this.getVideoId(),

                playerVars: {
                    autoplay: Number(this.current && this.shouldAutoplay() && this.mjGallery.isOpened()),
                    rel: 0
                },

                events: {
                    onReady: function () {

                        this.setAsLoaded();

                        this.$content = this.$self.find(ns.CLASS.selector("itemContent"));

                        setTimeout(this.refreshSize, 0);

                        this.mjGallery.on(ns.EVENT.beforeClose, this.pauseVideoBeforeClose, this.mjGallery);

                        this.mjGallery.refreshItemInfo();

                        this.fireLoadEvent();

                        var youtubeReadyEvent = new ns.EVENT.Event({
                            item: this.getAPI(),
                            index: this.getIndex(),
                            player: this.getPlayer()
                        }, this.mjGallery);

                        ns.EVENT.fire(ns.EVENT.youtubeReady, youtubeReadyEvent, this.mjGallery);

                        if (youtubeReadyEvent.isDefaultPrevented() || this.loadEvent.isDefaultPrevented() || this.mjGallery.isClosed()) {

                            this.stop();

                        } else if (this.current && this.shouldAutoplay()) {

                            this.play(true);
                        }
                    }.bind(this),

                    onStateChange: function (event) {

                        var state = event.data,
                            states = YT.PlayerState;

                        clearInterval(this.saveCurrentTimeInterval);

                        if (state === states.PLAYING) {

                            this.saveCurrentTimeInterval = setInterval(function () {

                                this.stoppedAt = this.youTubePlayer.getCurrentTime();

                            }.bind(this), 500);

                        } else if (state === states.PAUSED || state === states.BUFFERING) {

                            this.stoppedAt = this.youTubePlayer.getCurrentTime();

                        } else if (state !== states.UNSTARTED && state !== states.CUED) {//???

                            this.stoppedAt = 0;
                        }

                    }.bind(this)
                }
            });

        }.bind(this);

        if (youTubeIframeAPIReady) {

            fn();

        } else {

            loadYouTubeAPI(this);

            onYouTubeIframeAPIReady.push(fn);
        }

        this.loading = true;

        return this;
    };

    YouTubeItem.prototype.setAsCurrent = function (duration, done) {

        if (duration) {

            ns.Item.prototype.setAsCurrent.call(this, duration, function () {

                if (this.youTubePlayer && this.loaded) {

                    this.seekTo(true);

                    this[this.shouldAutoplay() ? "play" : this.stoppedAt ? "pause" : "stop"]();
                }

                done();

            }.bind(this));

        } else {

            ns.Item.prototype.setAsCurrent.apply(this, arguments);

            if (this.youTubePlayer && this.loaded) {

                this.seekTo(true);

                this[this.shouldAutoplay() ? "play" : this.stoppedAt ? "pause" : "stop"]();
            }
        }
        return this;
    };

    YouTubeItem.prototype.getTitle = function () {

        if (!this.title && !this.mjGallery.getOptions().isSetByUser(ns.OPTIONS.ITEM_TITLE_SELECTOR)) {

            this.title = this.getOption("itemTitle") || "";

            if (!this.title && this.loaded) {

                this.title = this.youTubePlayer.getVideoData().title || "";
            }

        } else {

            ns.Item.prototype.getTitle.call(this);
        }

        return this.title;
    };

    YouTubeItem.prototype.setAsPrev = function (/*duration, done*/) {

        ns.Item.prototype.setAsPrev.apply(this, arguments);

        var state = this.youTubePlayer && this.loaded ? this.youTubePlayer.getPlayerState() : null;

        if (window.YT && (state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING)) {

            this[this.stoppedAt ? "pause": "stop"]();
        }

        return this;
    };

    YouTubeItem.prototype.setAsNext = function (/*duration, done*/) {

        ns.Item.prototype.setAsNext.apply(this, arguments);

        var state = this.youTubePlayer && this.loaded ? this.youTubePlayer.getPlayerState() : null;

        if (window.YT && (state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING)) {

            this[this.stoppedAt ? "pause": "stop"]();
        }

        return this;
    };

}(window.mjGallery, jQuery));
