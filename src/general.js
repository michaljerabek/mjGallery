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
