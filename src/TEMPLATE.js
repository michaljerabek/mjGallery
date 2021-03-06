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

                    "<div class=\"" + ns.CLASS.ui + "\">",

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

                    "</div>",

                    "<ul class=\"" + ns.CLASS.items + "\">",

                        //ITEMS

                    "</ul>",

                    "<div class=\"" + ns.CLASS.itemInfoWrapper + "\">",

                        "<div class=\"" + ns.CLASS.itemInfo + " " + ns.CLASS.itemInfoNoContent + "\">",

                            //ITEM_INFO_CONTENT

                        "</div>",

                    "</div>",

                "</div>"
            ].join("");
        }
    };

}(window.mjGallery, jQuery));
