import {Line} from "./Line";
import {CNode} from "./Node";
import {Word} from "./Word";
import {ICode} from "./Part";
import {CarotaDoc} from "./Doc";
import {Frame} from "./Frame";
import {PositionedParagraph} from "./PositionedParagraph";
/**
 * A stateful transformer function that accepts words and emits lines.
 * Lines will grow in size until a linebreak character is encountered.
 *
 * The y-coordinate is the top of the first line, not the baseline.
 *
 * Returns a stream of line objects, each containing an array of positionedWord objects.
 */
export var NoWrap = function (left:number, top:number, ordinal:number, parent:PositionedParagraph) {

  var lineBuffer:Array<Word> = [],
    lineWidth = 0,
    maxAscent = 0,
    maxDescent = 0,
    maxLineHeight = 0,
    quit:boolean|void,
    lastNewLineHeight = 0,
    y = top;

  /**
   * Stores a word in the lineBuffer, updates lineWidth, maxAscent, maxDescent, maxLineHeight
   * @param word - the word to store.
   * @param emit - the emit function is called once a newLine is found.
   */
  var store = function (word:Word, emit:(p:Line|number)=>boolean|void) {
    lineBuffer.push(word);
    lineWidth += word.width;
    maxAscent = Math.max(maxAscent, word.ascent);
    maxDescent = Math.max(maxDescent, word.descent);
    maxLineHeight = Math.max(maxLineHeight, word.lineHeight);
    if (word.isNewLine()) {
      send(emit);
      lastNewLineHeight = word.ascent + word.descent;
    }
  };

  /**
   * Create a new Line object from lineBuffer and send it.
   * @param emit
   */
  var send = function (emit:(p:Line|number)=>boolean|void) {
    if (quit || lineBuffer.length === 0) {
      return;
    }

    var width = 0;
    lineBuffer.forEach((word:Word)=>{
      width += word.width;
    });

    var align = lineBuffer[0].align();
    var x = left;
    switch(align) {
      case 'right':
        x = left - width;
        break;
      case 'center':
        x = left - width/2;
        break;
      case 'justify':
        //TODO: what is the desired behaviour?
        break;
    }

    if(y == top) {
      var l = new Line(parent, x, width, y + maxAscent, maxAscent, maxDescent, lineBuffer, ordinal);
    } else {
      var l = new Line(parent, x, width, y + maxLineHeight - maxDescent, maxAscent, maxDescent, lineBuffer, ordinal);
    }
    ordinal += l.length;
    quit = emit(l);
    if(y == top) {
      y += (maxAscent + maxDescent);
    } else {
      y += maxLineHeight;
    }
    lineBuffer.length = 0;
    lineWidth = maxAscent = maxDescent = maxLineHeight = 0;
  };

  return function (emit:(p:Line|number)=>boolean|void, word:Word) {
    if (word.eof) {
      store(word, emit);
      if (!lineBuffer.length) {
        emit(y + lastNewLineHeight - top);
      } else {
        send(emit);
        emit(y - top);
      }
      quit = true;
    } else {
      lastNewLineHeight = 0;
      store(word, emit);
    }
    return quit;
  };
};
