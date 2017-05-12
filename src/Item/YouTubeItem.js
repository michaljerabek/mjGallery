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

        ns.EVENT.off(ns.EVENT.beforeClose, this.pauseVideoBeforeClose);
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
