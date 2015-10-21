'use strict';
var path = require('path');
var gulp = require('gulp');
var less = require('gulp-less');
var cortexCompiler = require('gulp-cortex-handlebars-compiler');
var testCompiler = require('./util/test-compiler');

var pagesPath = {
    src: path.join(__dirname, 'html/**/*.html'),
    dest: path.join(__dirname, 'pages'),
    less: path.join(__dirname, 'less/page/*.less')
};

gulp.task('pages', function() {
    if (process.env.CORTEX_EFTE_TEST_BUILD === 'true') {
        return gulp.src(pagesPath.src)
            .pipe(testCompiler())
            .pipe(gulp.dest(pagesPath.dest))
    } else {
        return gulp.src(pagesPath.src)
            .pipe(cortexCompiler({
                cwd: __dirname,
                href_root: process.env.CORTEX_EFTE_HREF_ROOT,
                js_ext: process.env.CORTEX_EFTE_JS_EXT || '.js',
                css_ext: process.env.CORTEX_EFTE_CSS_EXT || '.css'
            }).compile())
            .pipe(gulp.dest(pagesPath.dest));
    }
});

gulp.task('less', function() {
    gulp.src(pagesPath.less)
        .pipe(less({
            paths: [path.join(__dirname, 'less', 'base'), path.join(__dirname, 'less', 'component')]
        }))
        .pipe(gulp.dest('pages/css'));
    gulp.src('./less/common/img/**/*.*')
        .pipe(gulp.dest('pages/img'));

});

gulp.task('img', function() {
    gulp.src('./less/page/img/**/*.*')
        .pipe(gulp.dest('src/img'));

});

gulp.task('default', ['pages', 'less', 'img']);