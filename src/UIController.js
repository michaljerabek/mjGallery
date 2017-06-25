/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery*/

(function (ns, $) {

    var NS = "UIController",

        pointerMovedOnBtn = false,
        preventCloseOnOverlay = false,

        shiftKey = false,

        onOverlay = function (event) {

            var onOverlay = this.mjGallery.getCurrentItem().considerEventAsOnOverlay(event);

            if (event.type.match(/move/)) {

                preventCloseOnOverlay = true;
            }

            //při psunutí myši/prstu nezavírat
            if (event.type.match(/move/) && onOverlay) {

                this.mjGallery.get().off(this.mjGallery.withNS(".onOverlay" + NS));

                preventCloseOnOverlay = false;

                //uživatel posouvá obrázkem => zachovat události
                if (this.mjGallery.eventsActive) {

                    return;
                }

                return false;
            }

            if (!preventCloseOnOverlay && onOverlay && !event.type.match(/move/)) {

                preventCloseOnOverlay = false;

                this.mjGallery.get().off(this.mjGallery.withNS(".onOverlay" + NS));

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

                if ((focusedItemIndex > -1 && focusedItemIndex < currentItemIndex && !shiftKey) || (focusedItemIndex === -1 && shiftKey)) {

                    $focusable = $currentItem.find(ns.FOCUSABLE);
                }

                if (!$focusable || !$focusable.length) {

                    $focusable = this.$self.find(ns.FOCUSABLE);
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
