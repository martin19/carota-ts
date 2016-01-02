import {Line} from "./Line";
import {CNode} from "./Node";
import {Word} from "./Word";
import {ICode} from "./Part";
import {CarotaDoc} from "./Doc";
import {Frame} from "./Frame";
/**
 * A stateful transformer function that accepts words and emits lines.
 * Lines will grow in size until a linebreak character is encountered.
 *
 * The y-coordinate is the top of the first line, not the baseline.
 *
 * Returns a stream of line objects, each containing an array of positionedWord objects.
 */
export var NoWrap = function (left:number, top:number, ordinal:number, parent:Frame, includeTerminator?:(p:ICode)=>boolean, initialAscent?:number, initialDescent?:number) {

  var lineBuffer:Array<Word> = [],
    lineWidth = 0,
    maxAscent = initialAscent || 0,
    maxDescent = initialDescent || 0,
    quit:boolean|void,
    lastNewLineHeight = 0,
    y = top;

  var store = function (word:Word, emit:(p:Line|number)=>boolean|void) {
    lineBuffer.push(word);
    lineWidth += word.width;
    maxAscent = Math.max(maxAscent, word.ascent);
    maxDescent = Math.max(maxDescent, word.descent);
    if (word.isNewLine()) {
      send(emit);
      lastNewLineHeight = word.ascent + word.descent;
    }
  };

  var send = function (emit:(p:Line|number)=>boolean|void) {
    if (quit || lineBuffer.length === 0) {
      return;
    }

    var width = 0;
    lineBuffer.forEach((word:Word)=>{
      width += word.width;
    });

    var l = new Line(parent, left, width, y + maxAscent, maxAscent, maxDescent, lineBuffer, ordinal);
    ordinal += l.length;
    quit = emit(l);
    y += (maxAscent + maxDescent);
    lineBuffer.length = 0;
    lineWidth = maxAscent = maxDescent = 0;
  };

  return function (emit:(p:Line|number)=>boolean|void, inputWord:Word) {
    if (inputWord.eof) {
      if (!lineBuffer.length) {
        emit(y + lastNewLineHeight - top);
      } else {
        send(emit);
        emit(y - top);
      }
      quit = true;
    } else {
      lastNewLineHeight = 0;
      store(inputWord, emit);
    }
    return quit;
  };
};
