'use strict';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var saveLicense = require('uglify-save-license');
var wrap = require("gulp-wrap");
var replace = require("gulp-replace");
var ngAnnotate = require('gulp-ng-annotate');

gulp.task('scripts', function () {
  return gulp.src(['src/*.js'])
    .pipe(ngAnnotate())
    .pipe($.concat('bindonce.js'))
    .pipe(replace(/'use strict';/g, ''))
    .pipe(replace(/"use strict";/g, ''))
    .pipe(wrap("(function(){\n'use strict';\n<%= contents %>\n})();"))
    .pipe(gulp.dest('dist'))
    .pipe($.uglify({preserveComments: saveLicense}))
    .pipe($.rename('bindonce.min.js'))
    .pipe(gulp.dest('dist'))
    .pipe($.size());
});

gulp.task('jshint', function () {
  return gulp.src(['src/*.js'])
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'))
    .pipe($.size());
});

gulp.task('clean', function () {
  return gulp.src(['.tmp', 'dist'], { read: false })
    .pipe($.rimraf());
});

gulp.task('build', ['jshint', 'scripts']);

gulp.task('default', ['clean'], function () {
  gulp.start('build');
});
