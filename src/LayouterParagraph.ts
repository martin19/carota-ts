import {Line} from "./Line";
import {CNode} from "./Node";
import {Word} from "./Word";
import {ICode} from "./Part";
import {CarotaDoc} from "./Doc";
import {Frame} from "./Frame";
import {Paragraph} from "./Paragraph";
/**
 * A stateful transformer function that accepts words and emits lines. If the first word
 * is too wide, it will overhang; if width is zero or negative, there will be one word on
 * each line.
 *
 * The y-coordinate is the top of the first line, not the baseline.
 *
 * Returns a stream of line objects, each containing an array of positionedWord objects.
 */
export var LayouterParagraph = function (left:number, top:number, width:number, ordinal:number, parent:Paragraph) {

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

    if(y == top) {
      var l = new Line(parent, left, width, y + maxAscent, maxAscent, maxDescent, lineBuffer, ordinal);
    } else {
      var l = new Line(parent, left, width, y + maxLineHeight - maxDescent, maxAscent, maxDescent, lineBuffer, ordinal);
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
      if (!lineBuffer.length) {
        //if linebuffer is empty, store the word => minimum one word per line
        store(word, emit);
      } else {
        //if lineWidth is exceeded, send a new line object.
        if (lineWidth + word.text.width > width) {
          send(emit);
        }
        //store the word to the lineBuffer
        store(word, emit);
      }
      if(word.isNewLine()) {
        quit = true;
      }
    }
    return quit;
  };
};
