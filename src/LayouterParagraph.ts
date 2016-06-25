import {Line} from "./Line";
import {Word} from "./Word";
import {PositionedParagraph} from "./PositionedParagraph";
/**
 * A stateful transformer function that accepts words and emits lines. If the first word
 * is too wide, it will overhang; if width is zero or negative, there will be one word on
 * each line.
 *
 * The y-coordinate is the top of the first line, not the baseline.
 *
 * Returns a stream of line objects, each containing an array of positionedWord objects.
 */
export var LayouterParagraph = function (left:number, top:number, width:number, ordinal:number, wrap:boolean, parent:PositionedParagraph) {

  var lineBuffer:Array<Word> = [],
    lineWidth = 0,
    maxAscent = 0,
    maxDescent = 0,
    maxAscentUnscaled = 0,
    maxDescentUnscaled = 0,
    maxLineHeight = 0,
    quit:boolean|void,
    lastNewLineHeight = 0,
    y = top;

  //determine previous baseline (last line of previous Paragraph)
  //TODO: add spaceAfter to the baseline
  var previousBaseline:number = top;
  var previousLine = parent.frame.last() ? parent.frame.last().last() : null;
  if(previousLine && previousLine instanceof Line) {
    previousBaseline = previousLine.baseline;
  }

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
    maxAscentUnscaled = Math.max(maxAscentUnscaled, word.ascentUnscaled);
    maxDescentUnscaled = Math.max(maxDescentUnscaled, word.descentUnscaled);
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

    var x = left;
    if(!wrap) {
      width = 0;
      lineBuffer.forEach((word:Word)=>{
        width += word.width;
      });

      switch(parent.formatting.align) {
        case 'left':
          x = left;
          break;
        case 'right':
          x = left - width;
          break;
        case 'center':
          x = left - width/2;
          break;
      }
    }

    if(maxLineHeight !== 0) {
      if(y==top) {
        y = previousBaseline;
      }
      if(wrap) {
        if(y == 0) {
          var l = new Line(parent, x, width, y + maxAscentUnscaled, maxAscent, maxDescent, maxAscentUnscaled, maxDescentUnscaled, maxLineHeight, lineBuffer, ordinal);
        } else {
          var l = new Line(parent, x, width, y + maxLineHeight, maxAscent, maxDescent, maxAscentUnscaled, maxDescentUnscaled, maxLineHeight, lineBuffer, ordinal);
        }
      } else {
        var l = new Line(parent, x, width, y + maxLineHeight, maxAscent, maxDescent, maxAscentUnscaled, maxDescentUnscaled, maxLineHeight, lineBuffer, ordinal);
      }
    } else {
      var l = new Line(parent, x, width, y + maxAscentUnscaled, maxAscent, maxDescent, maxAscentUnscaled, maxDescentUnscaled, maxLineHeight, lineBuffer, ordinal);
    }

    ordinal += l.length;
    quit = emit(l);

    //lineHeight is set to Auto
    if(maxLineHeight === 0) {
      y += (maxAscentUnscaled + maxDescentUnscaled);
    } else {
      y += maxLineHeight;
    }

    lineBuffer.length = 0;
    lineWidth = maxAscent = maxDescent = maxLineHeight = maxDescentUnscaled = maxAscentUnscaled = 0;
  };

  return (emit:(p:Line|number)=>boolean|void, word:Word) => {
    if (word.eof) {
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
        if (wrap && lineWidth + word.text.width > width) {
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
