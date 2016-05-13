import {Line} from "./Line";
import {CNode} from "./Node";
import {Word} from "./Word";
import {ICode} from "./Part";
import {CarotaDoc} from "./Doc";
import {Frame} from "./Frame";
import {PositionedParagraph} from "./PositionedParagraph";
import {LayouterParagraph} from "./LayouterParagraph";

/**
 * A transformer function that accepts words and emits paragraphs. If the first word
 * is too wide, it will overhang; if width is zero or negative, there will be one word on
 * each line.
 *
 * The y-coordinate is the top of the first line, not the baseline.
 * Returns a stream of paragraph objects, each containing an array of line objects.
 *
 * @param left - left coordinate of parent Frame in pixels.
 * @param top - top coordinate of parent Frame in pixels.
 * @param width - width of parent Frame in pixels.
 * @param ordinal - ordinal value of first character.
 * @param parent - parent Frame.
 * @returns {function(function(PositionedParagraph): (boolean|void), Word): boolean|void}
 * @constructor
 */
export var LayouterFrame = function (left:number, top:number, width:number, ordinal:number, parent:Frame) {

  var quit:boolean|void;
  var lastNewLineHeight = 0;
  var layouter:(emit:(p:PositionedParagraph)=>void, word:Word)=>void|boolean;
  var y = top;
  var paragraphIndex = 0;
  
  layouter = PositionedParagraph.layout(left, top, width, ordinal, parent, parent._parent._paragraphs[paragraphIndex]);

  return function (emit:(p:PositionedParagraph)=>boolean|void, word:Word) {
    if(word.eof) {
      quit = true;
    }
    layouter((p:PositionedParagraph)=> { 
      ordinal += p.length;
      y += p.height;
      emit(p); 
    }, word);
    if (word.isNewLine()) {
      paragraphIndex++;
      layouter = PositionedParagraph.layout(left, y, width, ordinal, parent, parent._parent._paragraphs[paragraphIndex]);
    }
    return quit;
  }
};
