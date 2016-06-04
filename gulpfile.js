var gulp = require( 'gulp' );
var replace = require("gulp-replace");
var concat = require("gulp-concat");
var filter = require("gulp-filter");

gulp.task( 'build', function() {

  return gulp.src([
    "src/Characters.ts",
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
    "src/PositionedChar.ts",
    "src/PositionedWord.ts",
    "src/PositionedParagraph.ts",
    "src/Range.ts",
    "src/Rect.ts",
    "src/Run.ts",
    "src/Split.ts",
    "src/Text.ts",
    "src/Word.ts",
    "src/Paragraph.ts",
    "src/LayouterParagraph.ts",
    "src/LayouterFrame.ts",
    "src/importexport/EngineData.ts",
    "src/importexport/EngineDataExport.ts",
    "src/importexport/EngineDataImport.ts",
    "src/Carota.ts"
    ])
    .pipe(replace(/^import[\s\S]*?;/gm,''))
    .pipe(concat('carota.ts'))
    .pipe(filter(['carota.ts']))
    .pipe(gulp.dest('./lib/'));

});