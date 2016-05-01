import {Line} from "./Line";
import {CNode} from "./Node";
import {Word} from "./Word";
import {ICode} from "./Part";
import {CarotaDoc} from "./Doc";
import {Frame} from "./Frame";
/**
 * A stateful transformer function that accepts words and emits lines. If the first word
 * is too wide, it will overhang; if width is zero or negative, there will be one word on
 * each line.
 *
 * The y-coordinate is the top of the first line, not the baseline.
 *
 * Returns a stream of line objects, each containing an array of positionedWord objects.
 */
export var Wrap = function (left:number, top:number, width:number, ordinal:number, parent:Frame, includeTerminator?:(p:ICode)=>boolean, initialAscent?:number, initialDescent?:number) {

  var lineBuffer:Array<Word> = [],
    lineWidth = 0,
    maxAscent = initialAscent || 0,
    maxDescent = initialDescent || 0,
    maxLineHeight = 0,
    quit:boolean|void,
    lastNewLineHeight = 0,
    y = top;

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

  var consumer:(p:Word)=>CNode = null;

  return function (emit:(p:Line|number)=>boolean|void, inputWord:Word) {
    if (consumer) {
      /*TODO: check when this branch is used
      lastNewLineHeight = 0;
      var node = consumer(inputWord);
      if (node) {
        consumer = null;
        ordinal += node.length;
        y += node.bounds().h;
        node.block = true;
        emit(node);
      }*/
    } else {
      if (inputWord.eof) {
        store(inputWord, emit);
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
          store(inputWord, emit);
        } else {
          if (lineWidth + inputWord.text.width > width) {
            send(emit);
          }
          store(inputWord, emit);
        }
      }
    }
    return quit;
  };
};
