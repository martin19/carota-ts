var gulp = require( 'gulp' );
var replace = require("gulp-replace");
var concat = require("gulp-concat");
var filter = require("gulp-filter");

gulp.task( 'build', function() {

  return gulp.src([
    "src/Characters.ts",
    "src/Codes.ts",
    "src/Dom.ts",
    "src/Editor.ts",
    "src/Node.ts",
    "src/Doc.ts",
    "src/Frame.ts",
    "src/Html.ts",
    "src/Input.ts",
    "src/Line.ts",
    "src/LiteEvent.ts",
    "src/Part.ts",
    "src/Per.ts",
    "src/Positionedword.ts",
    "src/Range.ts",
    "src/Rect.ts",
    "src/Run.ts",
    "src/Split.ts",
    "src/Text.ts",
    "src/Word.ts",
    "src/Wrap.ts",
    "src/Carota.ts"
    ])
    .pipe(replace(/^import.*$\r\n/gm,''))
    .pipe(concat('carota.ts'))
    .pipe(filter(['carota.ts']))
    .pipe(gulp.dest('./lib/'));

});