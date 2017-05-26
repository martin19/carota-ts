import {Word} from "./Word";
import {Frame} from "./Frame";
import {PositionedParagraph} from "./PositionedParagraph";

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
 * @param wrap - enable wrapping at frame boundaries
 * @param parent - parent Frame.
 * @returns {function(function(PositionedParagraph): (boolean|void), Word): boolean|void}
 * @constructor
 */
export var LayouterFrame = function (left:number, top:number, width:number, ordinal:number, wrap:boolean, parent:Frame) {

  let quit:boolean|void;
  let layouter:(emit:(p:PositionedParagraph)=>void, word:Word)=>void|boolean;
  let y = top;
  let paragraphIndex = 0;

  let paragraphs = parent._parent._paragraphs;
  layouter = PositionedParagraph.layout(left, y, width, ordinal, wrap, parent, paragraphs[paragraphIndex]);

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

      let spaceBefore = 0;
      if(paragraphs[paragraphIndex]) {
        spaceBefore += paragraphs[paragraphIndex].formatting["spaceAfter"]||0;
      }
      paragraphIndex++;
      if(paragraphs[paragraphIndex]) {
        spaceBefore += paragraphs[paragraphIndex].formatting["spaceBefore"]||0;
      }
      y+=spaceBefore;
      layouter = PositionedParagraph.layout(left, y, width, ordinal, wrap, parent, paragraphs[paragraphIndex]);
    }
    return quit;
  }
};
