/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery, google, GoogleMap*/
(function ($) {

    /**
     * Zajišťuje inicializaci map po spojení s Googlem.
     *
     * K GoogleMaps.onInit lze přiřadit funkci, která se spustí při inicializaci.
     */
    var GoogleMaps = window.GoogleMaps = (function GoogleMaps() {

        var maps = [],

            initialized = false,

            /*
             * Přidá novou GoogleMap a inicializuje ji, pokud již byly Google Maps inicializovány.
             *
             * map - instance GoogleMap.
             * */
            addMap = function (map) {

                if (!(map instanceof GoogleMap)) {

                    return false;
                }

                maps.push(map);

                if (initialized) {

                    map.init();
                }

                return map;
            },

            /**
             * Inicializuje připravené GoogleMapy.
             */
            init = function () {

                maps.forEach(function (map) {

                    map.init();
                });

                initialized = true;
            };

        /*Funkce, kterou zavolá skript Googlu (nastavená v callbacku).*/
        window.googleMapsInit = function googleMapsInit() {

            window.GoogleMaps.$EVENT.trigger("googleMapInit.GoogleMap");

            if (typeof window.GoogleMaps.onInit === "function") {

                window.GoogleMaps.onInit();
            }

            google.maps.event.addDomListener(window, "load", init);
        };

        return {
            //window.GoogleMaps.onInit
            addMap: addMap
        };

    }());

    GoogleMaps.$EVENT = $({});

}(jQuery));

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery, google, HTMLElement, GoogleMapHTMLOverlay, GoogleMaps, GoogleMapStyle*/

(function ($) {

    /*
     * Vytvoří novou mapu.
     *
     * options - {
     *     el: "#map" | $() | HTMLElement, - element, do kterého se vloží mapa
     *     coords: [50.0879712, 14.4172372] | LatLng, - souřadnice "výchozího místa" (použije se jako střed mapy, což lze přepsat v options)
     *     icon: "marker.png", - obrázek pro vlastní pin
     *     markers: [{icon: "marker.png", coords: [], info: "", options: {}, id: "" | 0, group: ""}], - více vlastních pinů
     *     addMarker: false, - jestli přidávat marker, pokud není nastaveno icon
     *     html: "" | HTMLElement | {html: "" | HTMLElement, coords: [] | Marker | LatLng, draw: function} | [...] - html obsah na mapě
     *     zoom: 14, - přiblížení mapy
     *     styles: [] | GoogleMapStyle, - styl mapy
     *     info: "", - informace zobrazující se u výchozího markeru
     *     options: {}, - nastavení přidávající k mapě další nastavení
     *     controls: false, - ne/zobrazovat všechny ovládací prvky (lze přepsat v options)
     *     centerToLocationOnResize: 100 | true - vycentrovat mapu na coords při změně velikosti okna | číslo nastavuje, za jak dlouho po události resize považovat změnu velikosti za ukončenou
     * }
     * */
    var DEFAUlTS = { /*Výchozí nastavení je možné změnit v GoogleMap.DEFAULTS.*/
            el: "#map",

            zoom: 14,
            controls: false,
            styles: [],
            centerToLocationOnResize: 100
        },

        GoogleMap = window.GoogleMap = function GoogleMap(options) {

            if (typeof options !== "object") {

                throw "Options required.";
            }

            this.options = $.extend({}, DEFAUlTS, options);

            if (!this.options.coords) {

                throw "Coords are required.";
            }

            if (!this.options.el) {

                this.options.el = GoogleMap.DEFAULTS.el;
            }

            if (!this.options.zoom) {

                this.options.zoom = GoogleMap.DEFAULTS.zoom;
            }

            if (!this.options.styles) {

                this.options.styles = GoogleMap.DEFAULTS.styles;
            }

            this.el = null;
            this.$el = null;
            this.map = null;

            this._animations = {};
            this._$animEl = $("<div></div>");

            this._idHTMLCounter = 0;
            this._idMarkerCounter = 0;
            this._idInfoCounter = 0;

            this._markers = [];
            this._infos = [];
            this._htmls = [];

            this.markers = {};
            this.groupedMarkers = {};
            this.infos = {};
            this.HTMLs = {};

            this.markerId = null;
            this.infoId = null;
            this.HTMLId = null;

            GoogleMaps.addMap(this);
        },

        generateId = function (type) {

            switch (type) {

                case "HTML"  : return !this.HTMLs[++this._idHTMLCounter]     ? this._idHTMLCounter   : generateId.call(this, type);
                case "Marker": return !this.markers[++this._idMarkerCounter] ? this._idMarkerCounter : generateId.call(this, type);
                case "Info"  : return !this.infos[++this._idInfoCounter]     ? this._idInfoCounter   : generateId.call(this, type);
            }
        },

        closeAllInfos = function () {

            $.each(this.infos, function (id, info) {

                info.close();
            });
        },

        initInfoEvents = function (info, marker) {

            var touch = false,

                _this = this;

            google.maps.event.addListener(marker, "touchend", function() {

                touch = true;

                closeAllInfos.call(_this);

                info.open(this.map, this);
            });

            google.maps.event.addListener(marker, "click", function() {

                if (touch) {

                    touch = false;

                    return;
                }

                closeAllInfos.call(_this);

                info.open(this.map, this);
            });
        };

    GoogleMap.DEFAULTS = DEFAUlTS;

    GoogleMap.STYLES = {};

    /*Prázdný styl.*/
    GoogleMap.STYLES.empty = function () {

        return [];
    };

    /**
     * Inicializuje mapu včetně markerů, infoboxů a html.
     */
    GoogleMap.prototype.init = function () {

        this.$el = this.options.el.jquery ? this.options.el : $(this.options.el);
        this.el = this.$el[0];

        var mapOptions = {
            zoom: this.options.zoom
        };

        if (this.options.coords instanceof google.maps.LatLng) {

            mapOptions.location = this.options.coords;

        } else {

            mapOptions.location = new google.maps.LatLng(this.options.coords[0], this.options.coords[1]);
        }

        if (this.options.styles instanceof GoogleMapStyle) {

            mapOptions.styles = this.options.styles.getStyles();

        } else {

            mapOptions.styles = this.options.styles;
        }

        mapOptions.center = mapOptions.location;

        if (!this.options.controls && !GoogleMap.DEFAULTS.controls) {

            mapOptions.zoomControl = false;
            mapOptions.mapTypeControl = false;
            mapOptions.scaleControl = false;
            mapOptions.streetViewControl = false;
            mapOptions.rotateControl = false;
            mapOptions.fullscreenControl = false;
        }

        if (this.options.options) {

            mapOptions = $.extend({}, mapOptions, this.options.options);
        }

        this.map = new google.maps.Map(this.el, mapOptions);

        if (this.options.centerToLocationOnResize) {

            this.initCenterToLocationOnResize(this.options.centerToLocationOnResize);
        }

        this.initialized = true;

        if (this.options.icon || this.options.addMarker) {

            this.markerId = generateId.call(this, "Marker");

            if (this.options.info) {

                this.infoId = generateId.call(this, "Info");
            }

            this.addMarker({
                coords: mapOptions.location,
                icon: this.options.icon,
                info: this.options.info,
                infoId: this.options.infoId,
                id: this.markerId
            });
        }

        if (this.options.markers) {

            this.options.markers.forEach(this.addMarker.bind(this));
        }

        if (this.options.html) {

            if (this.options.html instanceof Array) {

                this.options.html.forEach(this.addHTML.bind(this));

            } else {

                this.HTMLId = generateId.call(this, "HTML");

                this.addHTML({
                    html: this.options.html,
                    id: this.HTMLId
                });
            }
        }

        this._markers.forEach(this.addMarker.bind(this));
        this._infos.forEach(this.addInfo.bind(this));
        this._htmls.forEach(this.addHTML.bind(this));

        if (typeof this.options.onInit === "function") {

            this.options.onInit.call(this);
        }
    };

    /**
     * Přidá k mapě marker. Pokud je mapa inicializovaná vrátí instanci Markeru.
     * Všechny markery jsou v instance.markers.
     *
     * options - {
     *     coords: [1, 1] | LatLng, - souřadnice markeru
     *     icon: "marker.png", - ikona markeru
     *     options: {}, - ostatní nastavení markeru
     *     info: "" - informace zobrazované u markeru
     *     id: id Markeru, podle kterého je možné najít příslušný objekt
     *     infoId: id Infa, podle kterého je možné najít příslušný objekt,
     *     group: "" - skupina markerů
     * }
     * returnInstance (Boolean) - vrátit místo id instanci
     */
    GoogleMap.prototype.addMarker = function (options, returnInstance) {

        options = options || {};

        var id = options.id || generateId.call(this, "Marker");

        if (!this.initialized) {

            options.id = options.id || id;

            this._markers.push(options);

            return returnInstance ? null : id;
        }

        if (options.coords && !(options.coords instanceof google.maps.LatLng)) {

            options.coords = new google.maps.LatLng(options.coords[0], options.coords[1]);
        }

        var markerOptions = {
            position: options.coords || this.map.location,
            map: this.map,
            icon: options.icon || this.options.icon
        };

        if (options.options) {

            markerOptions = $.extend({}, markerOptions, options.options);
        }

        var marker = new google.maps.Marker(markerOptions);

        if (options.info) {

            this.addInfo({
                content: options.info,
                marker: marker,
                id: options.infoId
            });
        }

        this.markers[id] = marker;

        options.group = options.group || "no-group";

        this.groupedMarkers[options.group] = this.groupedMarkers[options.group] || {};

        this.groupedMarkers[options.group][id] = marker;

        return returnInstance ? marker : id;
    };

    /**
     * Vrátí instanci InfoWindow podle id.
     *
     * id - id Markeru
     */
    GoogleMap.prototype.getMarker = function (id) {

        return this.markers[id] || null;
    };

    /**
     * Přidá informace k markeru. Pokud je mapa inicializovaná vrátí instanci InfoWindow.
     * Info se zobrazuje při kliknutí (a touchend) na pin. Všechny info jsou v instance.infos.
     *
     * options - {
     *     content: "", - obsah
     *     options: {}, - další nastavení
     *     marker: Marker - marker, ke kterému se má info přiřadit (pokud není nastaveno použije se poslední)
     *     id: id Infa, podle kterého je možné najít příslušný objekt
     * }
     * returnInstance (Boolean) - vrátit místo id instanci
     */
    GoogleMap.prototype.addInfo = function (options, returnInstance) {

        options = options || {};

        var id = options.id || generateId.call(this, "Info");

        if (!this.initialized) {

            options.id = options.id || id;

            this._infos.push(options);

            return returnInstance ? null : id;
        }

        options.marker = options.marker || this.markers[this.markers.length - 1];

        var infoOptions = {
            content: options.content
        };

        if (options.options) {

            infoOptions = $.extend({}, infoOptions, options.options);
        }

        var info = new google.maps.InfoWindow(infoOptions);

        initInfoEvents.call(this, info, options.marker);

        this.infos[id] = info;

        return returnInstance ? info : id;
    };

    /**
     * Vrátí instanci InfoWindow podle id.
     *
     * id - id Infa
     */
    GoogleMap.prototype.getInfo = function (id) {

        return this.infos[id] || null;
    };

    /**
     * Přidá do mapy vlastní HTML obsah. Pokud je mapa inicializovaná vrátí instanci GoogleMapHTMLOverlay.
     * Všechny HTML jsou v instance.HTMLs.
     *
     * options - "<div></div>" | {
     *     html: "" | HTMLElement, - vlastní HTML obsah
     *     coords: [1, 1] | LatLng | Marker, - souřadnice, kam vložit HTML (pokud není nastaveno, použije se location mapy)
     *     draw: function, - vlastní funkce zajišťující vykreslení HTML
     *     id: id HTML, podle kterého je možné najít příslušný objekt
     * }
     * returnInstance (Boolean) - vrátit místo id instanci
     */
    GoogleMap.prototype.addHTML = function (options, returnInstance) {

        options = options || {};

        var id = options.id || generateId.call(this, "HTML");

        if (!this.initialized) {

            if (typeof options === "string") {

                options = {
                    html: options,
                    id: id
                };

            } else {

                options.id = options.id || id;
            }

            this._htmls.push(options);

            return returnInstance ? null : id;
        }

        var html = typeof options === "string" || options instanceof HTMLElement ? options : options.html,
            position = typeof options === "object" && !(options instanceof HTMLElement) ? options.coords : null,
            draw = typeof options === "object" && !(options instanceof HTMLElement) ? options.draw : null,

            overlay = new GoogleMapHTMLOverlay(this.map, html, position, draw);

        this.HTMLs[id] = overlay;

        return returnInstance ? overlay : id;
    };

    /**
     * Vrátí instanci GoogleMapHTMLOverlay podle id.
     *
     * id - id HTML
     */
    GoogleMap.prototype.getHTML = function (id) {

        return this.HTMLs[id] || null;
    };

    /**
     * Varátí styl podle jména. Pokud styl neexistuje, vrátí styl "empty".
     * Vrací instanci GoogleMapStyle.
     *
     * name (String) - název stylu
     * modifier (Function) - funkce pro úpravu stylu
     */
    GoogleMap.getStyles = function (name, modifier) {

        var style;

        if (!GoogleMap.STYLES[name]) {

            style = new GoogleMapStyle(GoogleMap.STYLES.empty());

        } else {

            style = new GoogleMapStyle(GoogleMap.STYLES[name]());
        }

        if (typeof modifier === "function") {

            modifier.call(style);
        }

        return style;
    };

    /**
     * Při změně velikosti okna zarovná mapu na střed location.
     *
     * ms (Number) - debouncing
     */
    GoogleMap.prototype.initCenterToLocationOnResize = function (ms) {

        if (this.resizeInitialized) {

            return;
        }

        var debounce = typeof ms === "number",

            _this = this;

        google.maps.event.addDomListener(window, "resize", function () {

            if (debounce) {

                clearTimeout(debounce);

                debounce = setTimeout(_this.centerToLocation.bind(_this), ms);

                return;
            }

            _this.centerToLocation();
        });

        this.resizeInitialized = true;
    };

    /**
     * Zarovná mapu na střed location.
     */
    GoogleMap.prototype.centerToLocation = function () {

        this.map.setCenter(this.map.location);
    };

    /**
     * Zarovná mapu na střed zadaného objektu.
     *
     * object (String) - id Markeru nabo HTML
     * object (LatLng, Array) - souřadnice
     */
    GoogleMap.prototype.center = function (object) {

        if (typeof object === "string" || typeof object === "number") {

            object = this.getMarker(object) || this.getHTML(object);
        }

        if (object instanceof Array) {

            object = new google.maps.LatLng(object[0], object[1]);
        }

        if (object instanceof google.maps.LatLng) {

            this.map.setCenter(object);

        } else if (object && object.position) {

            this.map.setCenter(object.position);

        } else {

            this.centerToLocation();
        }
    };

    /**
     * Aktivuje animaci zadaného Markeru.
     *
     * marker (String, Marker) - id Markeru nebo Marker
     * duration (Number) - délka animace
     * animation (google.maps.Animation) - typ animace (Výchozí: BOUNCE)
     */
    GoogleMap.prototype.animate = function (marker, duration, animation) {

        if (typeof marker === "string" || typeof marker === "number") {

            marker = this.getMarker(marker);
        }

        if (marker) {

            var animId = marker.getPosition().toString();

            clearTimeout(this._animations[animId]);

            if (marker.getAnimation() !== null) {

                marker.setAnimation(null);
            }

            marker.setAnimation(animation || google.maps.Animation.BOUNCE);

            this._animations[animId] = setTimeout(marker.setAnimation.bind(marker, null), duration || 2800);
        }
    };

    /**
     * Aktivuje animaci skupiny Markerů.
     *
     * group (String) - název skupiny
     * duration (Number) - délka animace
     * animation (google.maps.Animation) - typ animace (Výchozí: BOUNCE)
     */
    GoogleMap.prototype.animateGroup = function (group, duration, animation) {

        $.each(this.groupedMarkers[group], function (i, marker) {

            this.animate(marker, duration, animation);

        }.bind(this));
    };

    /**
     * Nastaví zadanému Markeru opacity.
     *
     * marker (String, Marker) - id Markeru nebo Marker
     * opacity (Number) - opacity
     * duration (Number) - délka animace
     * easing (String) - easing
     */
    GoogleMap.prototype.opacity = function (marker, opacity, duration, easing) {

        if (typeof marker === "string" || typeof marker === "number") {

            marker = this.getMarker(marker);
        }

        if (marker && duration) {

            var initOpacity;

            this._$animEl.stop(true, true).animate({opacity: opacity}, {
                duration: duration,
                progress: function (x, pct) {

                    if (typeof initOpacity !== "number") {

                        initOpacity = typeof marker.getOpacity() === "number" ? marker.getOpacity() : marker.getVisible() ? 1 : 0;
                    }

                    var toAnimate = initOpacity - opacity;

                    if (toAnimate) {

                        marker.setOpacity(initOpacity - (toAnimate * pct));
                    }

                    if (!marker.getVisible() && opacity > 0) {

                        marker.setVisible(true);
                    }

                    if (opacity === 0 && pct === 1) {

                        marker.setVisible(false);
                    }
                },
                easing: easing || "linear"
            });

            return;
        }

        marker.setOpacity(opacity);

        marker.setVisible(opacity > 0);
    };

    /**
     * Nastaví opacity skupině Markerů.
     *
     * group (String) - název skupiny
     * opacity (Number) - opacity
     * duration (Number) - délka animace
     * easing (String) - easing
     */
    GoogleMap.prototype.groupOpacity = function (group, opacity, duration, easing) {

        if (duration) {

            var initOpacity = [];

            this._$animEl.stop(true, true).animate({opacity: opacity}, {
                duration: duration,
                progress: function (x, pct) {

                    $.each(this.groupedMarkers[group], function (m, marker) {


                        if (typeof initOpacity[m] !== "number") {

                            initOpacity[m] = typeof marker.getOpacity() === "number" ? marker.getOpacity() : marker.getVisible() ? 1 : 0;
                        }

                        var toAnimate = initOpacity[m] - opacity;

                        if (toAnimate) {

                            marker.setOpacity(initOpacity[m] - (toAnimate * pct));
                        }

                        if (!marker.getVisible() && opacity > 0) {

                            marker.setVisible(true);
                        }

                        if (opacity === 0 && pct === 1) {

                            marker.setVisible(false);
                        }

                    }.bind(this));
                }.bind(this),
                easing: easing || "linear"
            });

            return;
        }

        $.each(this.groupedMarkers[group], function (m, marker) {

            marker.setOpacity(opacity);

            marker.setVisible(opacity > 0);

        }.bind(this));
    };

    /**
     * Zobrazí zadaný Marker.
     *
     * marker (String, Marker) - id Markeru nebo Marker
     * duration (Number) - délka animace
     * easing (String) - easing
     */
    GoogleMap.prototype.show = function (marker, duration, easing) {

        this.opacity(marker, 1, duration, easing);
    };

    /**
     * Zobrazí skupinu Markerů.
     *
     * group (String) - název skupiny
     * duration (Number) - délka animace
     * easing (String) - easing
     */
    GoogleMap.prototype.showGroup = function (group, duration, easing) {


        this.groupOpacity(group, 1, duration, easing);
    };

    /**
     * Skryje zadaný Marker.
     *
     * marker (String, Marker) - id Markeru nebo Marker
     * duration (Number) - délka animace
     */
    GoogleMap.prototype.hide = function (marker, duration, easing) {

        this.opacity(marker, 0, duration, easing);
    };

    /**
     * Srkyje skupinu Markerů.
     *
     * group (String) - název skupiny
     * duration (Number) - délka animace
     */
    GoogleMap.prototype.hideGroup = function (group, duration, easing) {

        this.groupOpacity(group, 0, duration, easing);
    };

    /**
     * Zvýrazní zadaný marker.
     *
     * markerToHightlight (String, Marker, Boolean) - id Markeru nebo Marker; pokud je false, zvýraznění se zruší
     * opacity (Number) - jakou opacity mají mít ostatní markery
     * duration (Number) - délka animace
     * easing (String) - easing
    */
    GoogleMap.prototype.highlight = function (markerToHightlight, duration, opacity, easing) {

        opacity = opacity || 0;

        if (typeof markerToHightlight === "string" || typeof markerToHightlight === "number") {

            markerToHightlight = this.getMarker(markerToHightlight);
        }

        if (duration) {

            var initOpacity = [];

            this._$animEl.stop(true).animate({opacity: opacity}, {
                duration: duration,
                progress: function (x, pct) {

                    $.each(this.markers, function (m, marker) {

                        if (typeof initOpacity[m] !== "number") {

                            initOpacity[m] = typeof marker.getOpacity() === "number" ? marker.getOpacity() : marker.getVisible() ? 1 : 0;
                        }

                        var targetOpacity = marker !== markerToHightlight && markerToHightlight !== false ? opacity : 1,

                            toAnimate = initOpacity[m] - targetOpacity;

                        if (toAnimate) {

                            marker.setOpacity(initOpacity[m] - (toAnimate * pct));
                        }

                        if (targetOpacity === 0 && pct === 1) {

                            marker.setVisible(false);
                        }

                        if (targetOpacity > 0 && !marker.getVisible()) {

                            marker.setVisible(true);
                        }
                    });

                }.bind(this),
                easing: easing || "linear"
            });

            return;
        }

        $.each(this.markers, function (m, marker) {

            if (opacity) {

                marker.setOpacity(marker === markerToHightlight || markerToHightlight === false ? 1 : opacity);

                if (marker === markerToHightlight || markerToHightlight === false || opacity > 0) {

                    marker.setVisible(true);
                }


                if (marker !== markerToHightlight && markerToHightlight === false && opacity === 0) {

                    marker.setVisible(false);
                }

            } else {

                if (marker === markerToHightlight || markerToHightlight === false) {

                    marker.setOpacity(1);
                }

                marker.setVisible(marker === markerToHightlight || markerToHightlight === false);
            }
        });
    };

    /**
     * Zvýrazní skupinu Markerů.
     *
     * groupToHighlight (String, Boolean) - název skupiny; pokud je false, zvýraznění se odstraní
     * opacity (Number) - jakou opacity mají mít ostatní markery
     * duration (Number) - délka animace
     * easing (String) - easing
    */
    GoogleMap.prototype.highlightGroup = function (groupToHighlight, duration, opacity, easing) {

        opacity = opacity || 0;

        if (duration) {

            var initOpacity = {};

            this._$animEl.stop(true).animate({opacity: opacity}, {
                duration: duration,
                progress: function (x, pct) {

                    $.each(this.groupedMarkers, function (group) {

                        if (typeof initOpacity[group] !== "object") {

                            initOpacity[group] = [];
                        }

                        $.each(this.groupedMarkers[group], function (m, marker) {

                            if (typeof initOpacity[group][m] !== "number") {

                                initOpacity[group][m] = typeof marker.getOpacity() === "number" ? marker.getOpacity() : marker.getVisible() ? 1 : 0;
                            }

                            var targetOpacity = group !== groupToHighlight && groupToHighlight !== false ? opacity : 1,

                                toAnimate = initOpacity[group][m] - targetOpacity;

                            if (toAnimate) {

                                marker.setOpacity(initOpacity[group][m] - (toAnimate * pct));
                            }

                            if (targetOpacity === 0 && pct === 1) {

                                marker.setVisible(false);
                            }

                            if (targetOpacity > 0 && !marker.getVisible()) {

                                marker.setVisible(true);
                            }

                        }.bind(this));

                    }.bind(this));

                }.bind(this),
                easing: easing || "linear"
            });

            return;
        }

        $.each(this.groupedMarkers, function (group) {

            $.each(this.groupedMarkers[group], function (m, marker) {

                if (opacity) {

                    marker.setOpacity(group === groupToHighlight || groupToHighlight === false ? 1 : opacity);

                    if (group === groupToHighlight || groupToHighlight === false || opacity > 0) {

                        marker.setVisible(true);
                    }


                    if (group !== groupToHighlight && groupToHighlight === false && opacity === 0) {

                        marker.setVisible(false);
                    }

                } else {

                    if (group === groupToHighlight || groupToHighlight === false) {

                        marker.setOpacity(1);
                    }

                    marker.setVisible(group === groupToHighlight || groupToHighlight === false);
                }

            }.bind(this));
        }.bind(this));
    };

    /**
     * Přiřadí k mapě event listener a vrátí jeho instanci.
     *
     * type (String) - typ události (click, ...)
     * cb (Function) - funkce, která se má spustit při události
     */
    GoogleMap.prototype.on = function (type, cb) {

        return this.map.addListener(type, cb);
    };

    /*
     * Odstraní z mapy event listener.
     *
     * listener - instance event listeneru
     */
    GoogleMap.prototype.off = function (listener) {

        this.map.removeListener(listener);
    };

    /**
     * Přiřadí k Markeru event listener a vrátí jeho instanci.
     *
     * marker (String, Marker) - id Markeru nebo Marker
     * type (String) - typ události (click, ...)
     * cb (Function) - funkce, která se má spustit při události
     */
    GoogleMap.prototype.onMarker = function (marker, type, cb) {

        if (typeof marker === "string" || typeof marker === "number") {

            marker = this.getMarker(marker);
        }

        return google.maps.event.addListener(marker, type, cb);
    };

    /*
     * Odstraní z Markeru event listener.
     *
     * listener - instance event listeneru
     */
    GoogleMap.prototype.offMarker = function (listener) {

        google.maps.event.removeListener(listener);
    };

}(jQuery));

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery, google, GoogleMaps*/

(function ($) {

    /**
     * Třída zajišťující vložení vlastního HTML do mapy.
     *
     * map - instance Map
     * html (String | HTMLElement) - HTML obsah
     * position - [1, 1] | LatLng | Marker - suřadnice, kam HTML vložit (pokud není nastaveno, použije se location mapy)
     * drawFn (Function) - vlastní funkce pro vykreslení HTML na mapě
     */
    var GoogleMapHTMLOverlay = window.GoogleMapHTMLOverlay = function GoogleMapHTMLOverlay(map, html, position, drawFn) {

        this.html = html;

        this.$el = null;
        this.el = null;

        this.map = map;

        if (drawFn) {

            this.draw = drawFn;
        }

        if (position instanceof google.maps.LatLng) {

            this.position = position;

        } else if (position instanceof google.maps.Marker) {

            this.position = position.position;

        } else if (position instanceof Array) {

            this.position = new google.maps.LatLng(position[0], position[1]);

        } else {

            this.position = this.map.location;
        }

        this.setMap(map);
    };

    /*Prototype GoogleMapHTMLOverlay je potřeba nastavit až po inicializaci, protože potřebujeme globální objekt google.*/
    GoogleMaps.$EVENT.on("googleMapInit.GoogleMap", function () {

        GoogleMapHTMLOverlay.prototype = new google.maps.OverlayView();

        /*
         * Povinná metoda pro přidání mapy.
         * */
        GoogleMapHTMLOverlay.prototype.onAdd = function() {

            var panes = this.getPanes();

            this.$el = $("<div></div>");

            this.$el
                .css("position", "absolute")
                .html(this.html)
                .appendTo(panes.overlayLayer);

            this.el = this.$el[0];
        };

        /*
         * Povinná metoda pro vykreslení mapy.
         * Zarovná HTML doprostřed nad souřadnice.
         * */
        GoogleMapHTMLOverlay.prototype.draw = function() {

            var overlayProjection = this.getProjection(),

                position = overlayProjection.fromLatLngToDivPixel(this.position),
                size = {
                    width: this.el.offsetWidth,
                    height: this.el.offsetHeight
                };

            this.el.style.left = (position.x - (size.width / 2)) + "px";
            this.el.style.top = (position.y - size.height) + "px";
        };

        /*
         * Povinná metoda pro odstranění HTML.
         */
        GoogleMapHTMLOverlay.prototype.onRemove = function() {

            this.$el.remove();

            this.$el = null;
            this.el = null;
        };

        /*
         * Následující funkce volají stejnojmenné funkce jQuery (kromě show/hide, které fungují jako fadeIn/fadeOut) na nejvyšším elementu HTML.
         */

        /*pokud je animate false, duration se nastaví na 0*/
        GoogleMapHTMLOverlay.prototype.show = function(animate) {

            var args = Array.prototype.slice.call(arguments);

            if (animate === false) {

                args[0] = 0;
            }

            return this.$el.fadeIn.apply(this.$el, args);
        };

        /*pokud je animate false, duration se nastaví na 0*/
        GoogleMapHTMLOverlay.prototype.hide = function(animate) {

            var args = Array.prototype.slice.call(arguments);

            if (animate === false) {

                args[0] = 0;
            }

            return this.$el.fadeOut.apply(this.$el, args);
        };

        GoogleMapHTMLOverlay.prototype.animate = function() {

            return this.$el.animate.apply(this.$el, arguments);
        };

        GoogleMapHTMLOverlay.prototype.css = function() {

            return this.$el.css.apply(this.$el, arguments);
        };

        GoogleMapHTMLOverlay.prototype.find = function() {

            return this.$el.find.apply(this.$el, arguments);
        };

        GoogleMapHTMLOverlay.prototype.addClass = function() {

            return this.$el.addClass.apply(this.$el, arguments);
        };

        GoogleMapHTMLOverlay.prototype.removeClass = function() {

            return this.$el.removeClass.apply(this.$el, arguments);
        };

        GoogleMapHTMLOverlay.prototype.hasClass = function() {

            return this.$el.hasClass.apply(this.$el, arguments);
        };
    });


}(jQuery));

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery*/

(function ($) {


    /**
     * Třída obsahující styly pro mapu. Obsahuje jednoduché API pro upravování stylu.
     *
     * styles (Array) - styly pro mapu: https://developers.google.com/maps/documentation/javascript/style-reference
     */
    var GoogleMapStyle = window.GoogleMapStyle = function GoogleMapStyle(styles) {

        this.styles = styles || [];
    };

    /**
     * Nastaví styly pro zadaný featureType a elementType. Pokud existuje, přepíše se. Jinak se vytvoří nový styl.
     * https://developers.google.com/maps/documentation/javascript/style-reference
     *
     * featureType (String) - nastavovaná vlastnost
     * elementType (String) - nastavovaný element
     * styles - {
     *     color: "#fff000",
     *     lightness: 20
     * }
     * unsetSubtypes (Boolean) - odstraní všechny styly, které jsou podtypem tohoto stylu (viz GoogleMapStyle.prototype.findSubtypes)
     */
    GoogleMapStyle.prototype.set = function (featureType, elementType, styles, unsetSubtypes) {

        var styleFound = false;

        this.each(function (style) {

            if ((style.featureType === featureType || (!style.featureType && !featureType)) && (style.elementType === elementType || (!style.elementType && !elementType))) {

                style.stylers = this.toStylers(styles);

                styleFound = true;

                return false;
            }
        });

        if (!styleFound) {

            this.styles.push({
                featureType: featureType,
                elementType: elementType,
                stylers: this.toStylers(styles)
            });
        }

        if (unsetSubtypes) {

            this.findSubtypes(featureType, elementType).forEach(function (style) {

                this.unset(style.featureType, style.elementType);

            }.bind(this));
        }
    };

    /**
     * Přepíše styly pro zadaný elementType ve všech featureType. Pokud je featureType false nebo "all", přenastaví se u všech,
     * které odpovídají elementType. Pokud je featureType zadán, přenastaví se i všechny podtypy.
     * https://developers.google.com/maps/documentation/javascript/style-reference
     *
     * featureType (String) - nastavovaná vlastnost
     * elementType (String) - nastavovaný element
     * styles - {
     *     color: "#fff000",
     *     lightness: 20
     * }
     * unsetSubtypes (Boolean) - odstraní všechny styly, které jsou podtypem tohoto stylu (viz GoogleMapStyle.prototype.findSubtypes)
     */
    GoogleMapStyle.prototype.all = function (featureType, elementType, styles, unsetSubtypes) {

        this.each(function (style) {

            if ((style.featureType === featureType || !featureType || featureType === "all" || (style.featureType && style.featureType.indexOf(featureType + ".") === 0)) && (style.elementType === elementType || (!style.elementType && !elementType))) {

                style.stylers = this.toStylers(styles);
            }
        });

        if (unsetSubtypes) {

            this.findSubtypes(featureType, elementType).forEach(function (style) {

                this.unset(style.featureType, style.elementType);

            }.bind(this));
        }
    };

    /**
     * Odstraní všechy styly pro zadaný featureType a elementType.
     * https://developers.google.com/maps/documentation/javascript/style-reference
     *
     * featureType (String) - odstraňovaná vlastnost
     * elementType (String) - odstraňovaný element
     * styles - {
     *     color: "#fff000",
     *     lightness: 20
     * }
     * subtypes (Boolean) - odstraní všechny styly, které jsou podtypem tohoto stylu (viz GoogleMapStyle.prototype.findSubtypes)
     */
    GoogleMapStyle.prototype.unset = function (featureType, elementType, subtypes) {

        this.each(function (style, i) {

            if ((style.featureType === featureType || (!style.featureType && !featureType)) && (style.elementType === elementType || (!style.elementType && !elementType))) {

                this.styles.splice(i, 1);

                return false;
            }
        });

        if (subtypes) {

            this.findSubtypes(featureType, elementType).forEach(function (style) {

                this.unset(style.featureType, style.elementType);

            }.bind(this));
        }
    };

    /**
     * Přidá styly k zadanému featureType a elementType. Pokud kombinace neexistuje, vytvoří se nový styl.
     * Pokud vlastnost již u stylu je, přepíše se.
     * https://developers.google.com/maps/documentation/javascript/style-reference
     *
     * featureType (String) - nastavovaná vlastnost
     * elementType (String) - nastavovaný element
     * styles - {
     *     color: "#fff000",
     *     lightness: 20
     * }
     * removeSubtypes (Boolean) - odstraní všechny styly specifikované ve styles, které jsou podtypem tohoto stylu (viz GoogleMapStyle.prototype.findSubtypes)
     */
    GoogleMapStyle.prototype.add = function (featureType, elementType, styles, removeSubtypes) {

        var styleFound = false;

        this.each(function (style) {

            if ((style.featureType === featureType || (!style.featureType && !featureType)) && (style.elementType === elementType || (!style.elementType && !elementType))) {

                $.each(styles, function (name, newValue) {

                    var found = false;

                    $.each(style.stylers, function (i, styler) {

                        if (typeof styler[name] !== "undefined") {

                            style.stylers[i][name] = newValue;

                            found = true;

                            return false;
                        }
                    });

                    if (!found) {

                        var newStyler = {};

                        newStyler[name] = newValue;

                        style.stylers = style.stylers || [];

                        style.stylers.push(newStyler);
                    }
                });

                styleFound = true;

                return false;
            }
        });

        if (!styleFound) {

            this.set(featureType, elementType, styles);
        }

        if (removeSubtypes) {

            this.findSubtypes(featureType, elementType).forEach(function (style) {

                this.remove(style.featureType, style.elementType, Object.keys(styles));

            }.bind(this));
        }
    };

    /**
     * Odstraní styly patřící k featureType a elementType.
     * https://developers.google.com/maps/documentation/javascript/style-reference
     *
     * featureType (String) - vlastnost, ze které se styl odsraňuje
     * elementType (String) - element, ze kterého se styl odsraňuje
     * styles (String | Array) - styly, které se mají odstranit
     * subtypes (Boolean) - odstraní všechny styly specifikované ve styles, které jsou podtypem tohoto stylu (viz GoogleMapStyle.prototype.findSubtypes)
     */
    GoogleMapStyle.prototype.remove = function (featureType, elementType, styles, subtypes) {

        styles = typeof styles === "string" ? [styles] : styles;

        var styleFound = false;

        this.each(function (style) {

            if ((style.featureType === featureType || (!style.featureType && !featureType)) && (style.elementType === elementType || (!style.elementType && !elementType))) {

                styles.forEach(function (name) {

                    $.each(style.stylers, function (i, styler) {

                        if (typeof styler[name] !== "undefined") {

                            style.stylers.splice(i, 1);

                            return false;
                        }
                    });
                }.bind(this));

                if (!style.stylers.length) {

                    this.unset(featureType, elementType);
                }

                styleFound = true;

                return false;
            }
        });

        if (!styleFound) {

            this.unset(featureType, elementType, subtypes);
        }

        if (subtypes) {

            this.findSubtypes(featureType, elementType).forEach(function (style) {

                this.remove(style.featureType, style.elementType, styles);

            }.bind(this));
        }
    };

    /**
     * Převede objekt se styly na stylery vyžadované Google Maps API.
     */
    GoogleMapStyle.prototype.toStylers = function (styles) {

        var stylers = [];

        $.each(styles, function (name, value) {

            var styler = {};

            styler[name] = value;

            stylers.push(styler);
        });

        return stylers;
    };

    /**
     * Vyhledá všechny podtypy pro featureType a elementType a vrátí je v poli.
     * Logika je komplikovaná, ale asi ne moc geniální. FeatureType je považován za
     * důležitější než elementType, takže pokud není featureType zadán, pak podtypy
     * elementTypu, které jsou zároveň přiřazeny k featureType nejsou považovány za podtyp.
     *
     * featureType (String) - vlastnost, podle které se hledá podtyp
     * elementType (String) - element, podle kterého se hledá podtyp
     */
    GoogleMapStyle.prototype.findSubtypes = function (featureType, elementType) {

        var substyles = [],

            featureTypeDot = featureType ? featureType + "." : null,
            elementTypeDot = elementType ? elementType + "." : null;

        this.each(function (style) {

            var added = false,

                styleHasFeature = !!style.featureType,
                styleHasElement = !!style.elementType,
                styleIsFeature = style.featureType === featureType,
                styleIsElement = style.elementType === elementType,
                styleIsFeatureSubtype = styleHasFeature && (style.featureType.indexOf(featureTypeDot) === 0 || (featureType === "all" && style.featureType !== "all")),
                styleIsElementSubtype = styleHasElement && (style.elementType.indexOf(elementTypeDot) === 0 || (elementType === "all" && style.elementType !== "all"));

            if ((!styleHasFeature && !featureType) || (styleHasFeature && (styleIsFeature || styleIsFeatureSubtype))) {

                if (styleHasElement && styleIsElementSubtype) {

                    added = substyles.push(style);
                }
            }

            if (!added && (!elementType && (!styleHasElement || (styleHasFeature && styleIsFeatureSubtype)))) {

                if (styleHasFeature && styleIsFeatureSubtype) {

                    added = substyles.push(style);
                }
            }

            if (!added && styleHasFeature && styleHasElement) {

                if (((styleIsFeature && styleIsElementSubtype) || (styleIsFeatureSubtype && styleIsElement)) || (styleIsElementSubtype && styleIsFeatureSubtype)) {

                    added = substyles.push(style);
                }

                if (!added && styleIsFeature && !elementType && styleHasElement) {

                    added = substyles.push(style);
                }
            }
        });

        return substyles;
    };

    /**
     * Spustí funkci pro každý styl.
     *
     * fn (Function)
     */
    GoogleMapStyle.prototype.each = function (fn) {

        this.getStyles().forEach(fn.bind(this));
    };

    /**
     * Spustí funkci pro každý styl.
     *
     * fnOrDeep (Function, Boolean) - v případě true, zavolá funkci pro každý styl
     * fn (Function)
     */
    GoogleMapStyle.prototype.each = function (fnOrDeep, fn) {

        if (fnOrDeep === true) {

            this.getStyles().forEach(function (style) {

                if (style.stylers) {

                    style.stylers.forEach(function (styler) {

                        fn.call(this, styler, style.featureType, style.elementType);
                    });
                }
            });

            return;
        }

        this.getStyles().forEach(fnOrDeep.bind(this));
    };

    /**
     * Vratí pole se styly.
     */
    GoogleMapStyle.prototype.getStyles = function () {

        return this.styles;
    };


}(jQuery));

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global GoogleMap*/

GoogleMap.STYLES.dark = function () {

    return [
        {
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#212121"
                }
            ]
        },
        {
            "elementType": "labels.icon",
            "stylers": [
                {
                    "visibility": "off"
                }
            ]
        },
        {
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#757575"
                }
            ]
        },
        {
            "elementType": "labels.text.stroke",
            "stylers": [
                {
                    "color": "#212121"
                }
            ]
        },
        {
            "featureType": "administrative",
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#757575"
                }
            ]
        },
        {
            "featureType": "administrative.country",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#9e9e9e"
                }
            ]
        },
        {
            "featureType": "administrative.land_parcel",
            "stylers": [
                {
                    "visibility": "off"
                }
            ]
        },
        {
            "featureType": "administrative.locality",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#bdbdbd"
                }
            ]
        },
        {
            "featureType": "poi",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#757575"
                }
            ]
        },
        {
            "featureType": "poi.park",
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#181818"
                }
            ]
        },
        {
            "featureType": "poi.park",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#616161"
                }
            ]
        },
        {
            "featureType": "poi.park",
            "elementType": "labels.text.stroke",
            "stylers": [
                {
                    "color": "#1b1b1b"
                }
            ]
        },
        {
            "featureType": "road",
            "elementType": "geometry.fill",
            "stylers": [
                {
                    "color": "#2c2c2c"
                }
            ]
        },
        {
            "featureType": "road",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#8a8a8a"
                }
            ]
        },
        {
            "featureType": "road.arterial",
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#373737"
                }
            ]
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#3c3c3c"
                }
            ]
        },
        {
            "featureType": "road.highway.controlled_access",
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#4e4e4e"
                }
            ]
        },
        {
            "featureType": "road.local",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#616161"
                }
            ]
        },
        {
            "featureType": "transit",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#757575"
                }
            ]
        },
        {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [
                {
                    "color": "#000000"
                }
            ]
        },
        {
            "featureType": "water",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "color": "#3d3d3d"
                }
            ]
        }
    ];
};

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global GoogleMap*/

GoogleMap.STYLES.desaturate = function () {

    return [
        {
            featureType: "all",
            stylers: [
                {
                    saturation: -100
                }
            ]
        }
    ];
};

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global GoogleMap*/

GoogleMap.STYLES["monochrome-dark"] = function () {

    return [
        {
            "featureType": "all",
            "elementType": "all",
            "stylers": [
                {
                    "color": "#7f7f7f"
                }
            ]
        },
        {
            "featureType": "all",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "lightness": 0
                }
            ]
        },
        {
            "featureType": "all",
            "elementType": "labels.text.stroke",
            "stylers": [
                {
                    "visibility": "on"
                },
                {
                    "lightness": -90
                }
            ]
        },
        {
            "featureType": "all",
            "elementType": "labels.icon",
            "stylers": [
                {
                    "visibility": "off"
                }
            ]
        },
        {
            "featureType": "administrative",
            "elementType": "geometry.fill",
            "stylers": [
                {
                    "lightness": -76
                }
            ]
        },
        {
            "featureType": "administrative",
            "elementType": "geometry.stroke",
            "stylers": [
                {
                    "lightness": -82
                },
                {
                    "weight": 1.2
                }
            ]
        },
        {
            "featureType": "landscape",
            "elementType": "geometry",
            "stylers": [
                {
                    "lightness": -80
                }
            ]
        },
        {
            "featureType": "poi",
            "elementType": "geometry",
            "stylers": [
                {
                    "lightness": -72
                }
            ]
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry.fill",
            "stylers": [
                {
                    "lightness": -80
                }
            ]
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry.stroke",
            "stylers": [
                {
                    "lightness": -60
                },
                {
                    "weight": 0.75
                }
            ]
        },
        {
            "featureType": "road.arterial",
            "elementType": "geometry",
            "stylers": [
                {
                    "lightness": -92
                }
            ]
        },
        {
            "featureType": "road.local",
            "elementType": "geometry",
            "stylers": [
                {
                    "lightness": -92
                }
            ]
        },
        {
            "featureType": "transit",
            "elementType": "geometry",
            "stylers": [
                {
                    "lightness": -92
                }
            ]
        },
        {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [
                {
                    "lightness": -88
                }
            ]
        }
    ];
};

/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global GoogleMap*/

GoogleMap.STYLES.monochrome = function () {

    return [
        {
            "featureType": "all",
            "elementType": "all",
            "stylers": [
                {
                    "color": "#7f7f7f"
                }
            ]
        },
        {
            "featureType": "all",
            "elementType": "labels.text.fill",
            "stylers": [
                {
                    "lightness": 0
                }
            ]
        },
        {
            "featureType": "all",
            "elementType": "labels.text.stroke",
            "stylers": [
                {
                    "visibility": "on"
                },
                {
                    "lightness": 90
                }
            ]
        },
        {
            "featureType": "all",
            "elementType": "labels.icon",
            "stylers": [
                {
                    "visibility": "off"
                }
            ]
        },
        {
            "featureType": "administrative",
            "elementType": "geometry.fill",
            "stylers": [
                {
                    "lightness": 70
                }
            ]
        },
        {
            "featureType": "administrative",
            "elementType": "geometry.stroke",
            "stylers": [
                {
                    "lightness": 85
                },
                {
                    "weight": 1.2
                }
            ]
        },
        {
            "featureType": "landscape",
            "elementType": "geometry",
            "stylers": [
                {
                    "lightness": 80
                }
            ]
        },
        {
            "featureType": "poi",
            "elementType": "geometry",
            "stylers": [
                {
                    "lightness": 70
                }
            ]
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry.fill",
            "stylers": [
                {
                    "lightness": 60
                }
            ]
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry.stroke",
            "stylers": [
                {
                    "lightness": 95
                },
                {
                    "weight": 0.75
                }
            ]
        },
        {
            "featureType": "road.arterial",
            "elementType": "geometry",
            "stylers": [
                {
                    "lightness": 93
                }
            ]
        },
        {
            "featureType": "road.local",
            "elementType": "geometry",
            "stylers": [
                {
                    "lightness": 93
                }
            ]
        },
        {
            "featureType": "transit",
            "elementType": "geometry",
            "stylers": [
                {
                    "lightness": 93
                }
            ]
        },
        {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [
                {
                    "lightness": 90
                }
            ]
        }
    ];
};
