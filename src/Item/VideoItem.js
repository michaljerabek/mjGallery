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

        VideoItem = ns.VideoItem = function VideoItem($source, mjGallery, index, preload) {

            this.type = ns.Item.TYPE.YOUTUBE;

            ns.Item.call(this, $source, mjGallery, index, preload, VideoItemAPI);

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

        if (type === ns.EVENTS.POINTER) {

            return true;
        }

        return ns.Item.prototype.shouldPreserveEvent.apply(this, arguments);
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

        ns.EVENT.off(ns.EVENT.beforeClose, this.pauseVideoBeforeClose);
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
