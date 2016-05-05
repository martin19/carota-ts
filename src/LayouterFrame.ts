import {Line} from "./Line";
import {CNode} from "./Node";
import {Word} from "./Word";
import {ICode} from "./Part";
import {CarotaDoc} from "./Doc";
import {Frame} from "./Frame";
import {Paragraph} from "./Paragraph";
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
 * @returns {function(function(Paragraph): (boolean|void), Word): boolean|void}
 * @constructor
 */
export var LayouterFrame = function (left:number, top:number, width:number, ordinal:number, parent:Frame) {

  var quit:boolean|void;
  var lastNewLineHeight = 0;
  var layouter:(emit:(p:Paragraph)=>void, word:Word)=>void|boolean;
  var y = top;
  
  layouter = Paragraph.layout(left, top, width, ordinal, parent);

  return function (emit:(p:Paragraph)=>boolean|void, word:Word) {
    if(word.eof) {
      quit = true;
    }
    layouter((p:Paragraph)=> { 
      ordinal += p.length;
      y += p.height;
      emit(p); 
    }, word);
    if (word.isNewLine()) {
      layouter = Paragraph.layout(left, y, width, ordinal, parent);
    }
    return quit;
  }
};
