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
