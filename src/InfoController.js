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

            this.$itemInfo = mjGallery.$self.find(ns.CLASS.selector("itemInfo"));

            this.$info = this.mjGallery.get().find(ns.CLASS.selector("info"));

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

        this.mjGallery.get().toggleClass(ns.CLASS.selfInfoActive);

        return this;
    };

    InfoController.prototype.showInfo = function () {

        this.mjGallery.get().addClass(ns.CLASS.selfInfoActive);

        return this;
    };

    InfoController.prototype.hideInfo = function () {

        this.mjGallery.get().removeClass(ns.CLASS.selfInfoActive);

        return this;
    };


}(window.mjGallery, jQuery));
