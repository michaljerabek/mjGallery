/*jslint indent: 4, white: true, nomen: true, regexp: true, unparam: true, node: true, browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, vars: true*/
var gulp = require("gulp");
var rename = require("gulp-rename");
var uglify = require("gulp-uglify");
var concat = require("gulp-concat");
var cleanCSS = require("gulp-clean-css");

gulp.task("js", function () {

    gulp.src(["./src/mjGallery.js", "./src/general.js", "./src/TEMPLATE.js", "./src/*.js", "./src/Item/ItemTransformationController.js", "./src/Item/Item.js", "./src/Item/*.js"])
        .pipe(concat("mjGallery.build.js"))
        .pipe(
            gulp.dest("./build")
        )
        .pipe(uglify())
        .pipe(rename(function (path) {
            path.basename = "mjGallery.build.min";
        }))
        .pipe(
            gulp.dest("./build")
        );
});

gulp.task("css", function () {

    gulp.src(["./src/css/*.css"])
        .pipe(concat("mjGallery.css"))
        .pipe(
            gulp.dest("./build/css")
        )
        .pipe(cleanCSS())
        .pipe(rename(function (path) {
            path.basename = "mjGallery.build.min";
        }))
        .pipe(
            gulp.dest("./build/css")
        );
});

gulp.task("watch", function () {

    gulp.watch(["src/**/*.js", "src/*.js"], ["js"]);
    gulp.watch(["src/css/*.css"], ["css"]);
});
