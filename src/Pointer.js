/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
/*global jQuery*/

(function (ns, $) {

    var Pointer = ns.Pointer = function Pointer() {

        this.start = { x: 0, y: 0 };
        this.current = { x: 0, y: 0 };
        this.diff = { x: 0, y: 0 };
        this.diffHistory = [];
        this.startDiff = { x: 0, y: 0 };
        this._prev = { x: 0, y: 0 };
        this.prev = { x: 0, y: 0 };
        this.dist = 0;

        this.pinch = {
            dist: 0,
            _prev: 0,
            prev: 0,
            diff: 0,
            start: {
                0: { x: 0, y: 0 },
                1: { x: 0, y: 0 }
            },
            current: {
                0: { x: 0, y: 0 },
                1: { x: 0, y: 0 }
            },
            startDiff: 0,
            startDist: 0
        };

        this.count = 0;

        this.moved = false;

        this.type = null;

        this.event = null;

        this.dblTap = false;
        this._lastDblTap = +new Date();
    };

    Pointer.FIX = {
        HOR: 1,
        VER: 2
    };

    Pointer.DIR = {
        HOR: 1,
        VER: 2
    };

    Pointer.TYPE = {
        TOUCH: 1,
        MOUSE: 2
    };

    Pointer.prototype.onStart = function (event) {

        this.event = event;

        var XY = ns.getClientValue(event);

        event = event.originalEvent || event;

        this.count = event.touches ? event.touches.length : 1;

        if (event.type === "touchstart") {

            if (this.count === 2) {

                this.dblTap = false;

            } else {

                var currentTap = +new Date();

                this.dblTap = currentTap - this._lastDblTap < 300 && Math.sqrt(Math.pow(this._prev.x - XY.x, 2) + Math.pow(this._prev.y - XY.y, 2)) < 20;

                this._lastDblTap = currentTap;
            }
        }

        this.start.x = XY.x;
        this.start.y = XY.y;

        this.current.x = XY.x;
        this.current.y = XY.y;

        this._prev.x = this.current.x;
        this._prev.y = this.current.y;

        this.prev.x = 0;
        this.prev.y = 0;

        this.dist = 0;
        this.diffHistory = [];

        this.pinch._prev = 0;
        this.pinch.prev = 0;
        this.pinch.diff = 0;
        this.pinch.dist = 0;
        this.pinch.startDiff = 0;
        this.pinch.startDist = 0;

        if (this.count === 2) {

            var XY2 = ns.getClientValue(event, 1);

            this.pinch._prev = Math.sqrt(Math.pow(XY2.x - XY.x, 2) + Math.pow(XY2.y - XY.y, 2));

            this.pinch.prev = 0;

            this.pinch.start = {
                0: {
                    x: XY.x,
                    y: XY.y
                },
                1: {
                    x: XY2.x,
                    y: XY2.y
                }
            };

            this.pinch.current = {
                0: {
                    x: XY.x,
                    y: XY.y
                },
                1: {
                    x: XY2.x,
                    y: XY2.y
                }
            };

            this.pinch.startDist = this.pinch._prev;
        }

        this.moved = false;

        this.type = event.type.match(/mouse/) ? Pointer.TYPE.MOUSE : Pointer.TYPE.TOUCH;
    };

    Pointer.prototype.onMove = function (event) {

        this.event = event;

        var XY = ns.getClientValue(event);

        this.prev.x = this._prev.x;
        this.prev.y = this._prev.y;

        this.diff.x = XY.x - this._prev.x;
        this.diff.y = XY.y - this._prev.y;

        this.diffHistory = this.diffHistory.slice(0, 2);
        this.diffHistory.unshift(this.diff);

        this.startDiff.x = XY.x - this.start.x;
        this.startDiff.y = XY.y - this.start.y;

        this._prev.x = this.current.x;
        this._prev.y = this.current.y;

        this.current.x = XY.x;
        this.current.y = XY.y;

        this.dist = Math.sqrt(Math.pow(this.diff.x, 2) + Math.pow(this.diff.y, 2));

        event = event.originalEvent || event;

        this.count = event.touches ? event.touches.length : 1;

        if (this.count === 2) {

            this.pinch.prev = this.pinch._prev;

            var XY2 = ns.getClientValue(event, 1);

            this.pinch.dist = Math.sqrt(Math.pow(XY2.x - XY.x, 2) + Math.pow(XY2.y - XY.y, 2));

            this.pinch.diff = this.pinch.dist - this.pinch._prev;

            this.pinch.startDiff = this.pinch.dist - Math.sqrt(Math.pow(this.pinch.start[1].x - this.pinch.start[0].x, 2) + Math.pow(this.pinch.start[1].y - this.pinch.start[0].y, 2));

            this.pinch.current = {
                0: {
                    x: XY.x,
                    y: XY.y
                },
                1: {
                    x: XY2.x,
                    y: XY2.y
                }
            };

            this.pinch._prev = this.pinch.dist;
        }

        this.moved = true;

        this.type = event.type.match(/mouse/) ? Pointer.TYPE.MOUSE : Pointer.TYPE.TOUCH;
    };

    Pointer.prototype.left = function () {

        return this.diff.x < 1;
    };

    Pointer.prototype.right = function () {

        return this.diff.x > 1;
    };

    Pointer.prototype.up = function () {

        return this.diff.y < 1;
    };

    Pointer.prototype.down = function () {

        return this.diff.y > 1;
    };

    Pointer.prototype.scaleDown = function () {

        return this.pinch.diff <= 0;
    };

    Pointer.prototype.scaleUp = function () {

        return this.pinch.diff > 0;
    };

    Pointer.prototype.dirX = function () {

        return (this.right() && 1) || -1;
    };

    Pointer.prototype.dirY = function () {

        return (this.down() && 1) || -1;
    };

    Pointer.prototype.dir = function () {

        return {
            x: this.dirX(),
            y: this.dirY()
        };
    };

    Pointer.prototype.horFix = function () {

        return Math.abs(this.diff.x) >= Math.abs(this.diff.y);
    };

    Pointer.prototype.verFix = function () {

        return Math.abs(this.diff.x) < Math.abs(this.diff.y);
    };

    Pointer.prototype.dirFix = function (tolerance) {

        if (tolerance && tolerance.value) {

            if (tolerance.dir === Pointer.DIR.VER) {

                return this.horFix() || Math.abs(this.diff.y) < tolerance.value ? Pointer.FIX.HOR : Pointer.FIX.VER;

            } else {

                return this.horFix() || Math.abs(this.diff.x) < tolerance.value ? Pointer.FIX.HOR : Pointer.FIX.VER;
            }
        }

        return this.horFix() ? Pointer.FIX.HOR : Pointer.FIX.VER;
    };

    Pointer.prototype.isMouse = function () {

        return this.type === Pointer.TYPE.MOUSE;
    };

    Pointer.prototype.isTouch = function () {

        return this.type === Pointer.TYPE.TOUCH;
    };

    Pointer.prototype.getDiff = function () {

        var x = 0,
            y = 0;

        if (this.diffHistory.length) {

            this.diffHistory.forEach(function (diff) {

                x += diff.x;
                y += diff.y;
            });

            x = x / this.diffHistory.length;
            y = y / this.diffHistory.length;
        }

        return {
            x: x,
            y: y
        };
    };

    Pointer.prototype.absDiff = function () {

        return {
            x: Math.abs(this.diff.x),
            y: Math.abs(this.diff.y)
        };
    };

    Pointer.prototype.absStartDiff = function () {

        return {
            x: Math.abs(this.startDiff.x),
            y: Math.abs(this.startDiff.y)
        };
    };

    Pointer.prototype.getPinchMiddle = function () {

        return {
            x: (this.pinch.current[0].x + this.pinch.current[1].x) / 2,
            y: (this.pinch.current[0].y + this.pinch.current[1].y) / 2
        };
    };

    Pointer.prototype.isDblTap = function () {

        return this.dblTap;
    };


}(window.mjGallery, jQuery));
