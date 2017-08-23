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

            this.stealsPointer = true;

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
