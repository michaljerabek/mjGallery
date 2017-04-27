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
