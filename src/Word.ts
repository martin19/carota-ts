import {Per} from "./Per";
import {Part} from "./Part";
import {Range} from "./Range";
import {Character} from "./Characters";
import {ICode} from "./Part";
import {IRange} from "./Range";
import {Run} from "./Run";

/*  A Word has the following properties:

 text      - Section (see below) for non-space portion of word.
 space     - Section for trailing space portion of word.
 ascent    - Ascent (distance from baseline to top) for whole word
 descent   - Descent (distance from baseline to bottom) for whole word
 width     - Width of the whole word (including trailing space)

 It has methods:

 isNewLine()
 - Returns true if the Word represents a newline. Newlines are
 always represented by separate words.

 draw(ctx, x, y)
 - Draws the Word at x, y on the canvas context ctx.

 Note: a section (i.e. text and space) is an object containing:

 parts     - array of Parts
 ascent    - Ascent (distance from baseline to top) for whole section
 descent   - Descent (distance from baseline to bottom) for whole section
 width     - Width of the whole section
 */

export interface ICoords {
  text : Character;
  spaces : Character;
  end : Character;
}

export interface ISection {
  parts: Array<Part>;
  ascent: number;
  descent: number;
  lineHeight:number;
  width: number;
  length: number;
  plainText: string;
}

export class Word {
  text:ISection;
  space:ISection;
  ascent:number;
  descent:number;
  lineHeight:number;
  width:number;
  length:number;
  eof:boolean;

  constructor(coords:ICoords, codes:(s:string)=>ICode) {
    var text:((p:(r:Run)=>void)=>void)|Array<Run>,
      space:((p:(r:Run)=>void)=>void)|Array<Run>;
    if (!coords) {
      // special end-of-document marker, mostly like a newline with no formatting
      text = [new Run('\n',{})];
      space = [];
    } else {
      text = coords.text.cut(coords.spaces);
      space = coords.spaces.cut(coords.end);
    }

    this.text = section(text, codes);
    this.space = section(space, codes);
    this.ascent = Math.max(this.text.ascent, this.space.ascent);
    this.descent = Math.max(this.text.descent, this.space.descent);
    this.lineHeight = this.text.lineHeight;
    this.width = this.text.width + this.space.width;
    this.length = this.text.length + this.space.length;
    if (!coords) {
      this.eof = true;
    }
  }

  isNewLine() {
    return this.text.parts.length == 1 && this.text.parts[0].isNewLine;
  }

  code() {
    return this.text.parts.length == 1 && this.text.parts[0].code;
  }

  codeFormatting() {
    return this.text.parts.length == 1 && this.text.parts[0].run;
  }

  draw(ctx:CanvasRenderingContext2D, x:number, y:number) {
    new Per(this.text.parts).concat(this.space.parts).forEach(function (part:Part) {
      part.draw(ctx, x, y);
      x += part.width;
    });
  }

  plainText() {
    return this.text.plainText + this.space.plainText;
  }

  align() {
    var first = this.text.parts[0];
    return first ? first.run.formatting.align : 'left';
  }

  runs(emit:(p:Run)=>void, range?:IRange) {
    var start = range && range.start || 0,
      end = range && range.end;
    if (typeof end !== 'number') {
      end = Number.MAX_VALUE;
    }
    [this.text, this.space].forEach(function (section) {
      section.parts.some(function (part) {
        if (start >= end || end <= 0) {
          return true;
        }
        var run = part.run, text = run.text;
        if (typeof text === 'string') {
          if (start <= 0 && end >= text.length) {
            emit(run);
          } else if (start < text.length) {
            var pieceRun = run.clone();
            var firstChar = Math.max(0, start);
            pieceRun.text = text.substr(
              firstChar,
              Math.min(text.length, end - firstChar)
            );
            emit(pieceRun);
          }
          start -= text.length;
          end -= text.length;
        } else {
          if (start <= 0 && end >= 1) {
            emit(run);
          }
          start--;
          end--;
        }
      });
    });
  }
}


var section = function (runEmitter:((p:(r:Run)=>void)=>void)|Array<Run>, codes:(s:string)=>ICode) {
  var s:ISection = {
    parts: new Per(runEmitter).map(function (p:Run) {
      return new Part(p, codes);
    }).all(),
    ascent: 0,
    descent: 0,
    lineHeight: 0,
    width: 0,
    length: 0,
    plainText: ''
  };
  s.parts.forEach(function (p:Part) {
    s.ascent = Math.max(s.ascent, p.ascent);
    s.descent = Math.max(s.descent, p.descent);
    s.lineHeight = Math.max(s.lineHeight, p.lineHeight);
    s.width += p.width;
    s.length += Run.getPieceLength(p.run.text);
    s.plainText += Run.getPiecePlainText(p.run.text);
  });
  return s;
};
