import {Per} from "./Per";
import {Part} from "./Part";
import {Character} from "./Characters";
import {IRange} from "./Range";
import {Run, ICharacterFormatting} from "./Run";

export interface ICoords {
  text : Character;
  spaces : Character;
  end : Character;
}

export interface ISection {
  /**
   * array of Parts
   */
  parts: Array<Part>;
  /**
   * Ascent (distance from baseline to top) for whole section
   */
  ascent: number;
  /**
   * Descent (distance from baseline to bottom) for whole section
   */
  descent: number;
  /**
   * line height of section.
   */
  lineHeight:number;
  /**
   * Width of the whole section
   */
  width: number;
  /**
   * length of section in characters.
   */
  length: number;
  /**
   * Section as plaintext.
   */
  plainText: string;
}

/**
 * A Word object.
 * A word contains of a non-space section (text) and a section of trailing spaces (space)
 */
export class Word {
  /**
   * Section (see below) for non-space portion of word.
   */
  text:ISection;
  /**
   * Section for trailing space portion of word.
   */
  space:ISection;
  /**
   * Ascent (distance from baseline to top) for whole word
   */
  ascent:number;
  /**
   *  Descent (distance from baseline to bottom) for whole word
   */
  descent:number;
  /**
   * Line height of word.
   */
  lineHeight:number;
  /**
   * Width of the whole word (including trailing space) in pixels.
   */
  width:number;
  /**
   * Length of word in characters (non-space section length + space section length)
   */
  length:number;
  /**
   * True if word is "End of file".
   */
  eof:boolean;

  constructor(coords:ICoords) {
    var text:((p:(r:Run)=>void)=>void)|Array<Run>,
      space:((p:(r:Run)=>void)=>void)|Array<Run>;
    if (!coords) {
      // special end-of-document marker, mostly like a newline with no formatting
      text = [new Run('\n',{},null)];
      space = [];
    } else {
      text = coords.text.cut(coords.spaces);
      space = coords.spaces.cut(coords.end);
    }

    this.text = section(text);
    this.space = section(space);
    this.ascent = Math.max(this.text.ascent, this.space.ascent);
    this.descent = Math.max(this.text.descent, this.space.descent);
    this.lineHeight = this.text.lineHeight;
    this.width = this.text.width + this.space.width;
    this.length = this.text.length + this.space.length;
    if (!coords) {
      this.eof = true;
    }
  }

  /**
   * Returns true if the Word represents a newline. Newlines are
   * always represented by separate words.
   * @returns {boolean}
   */
  isNewLine() {
    return this.text.parts.length == 1 && this.text.parts[0].isNewLine;
  }

  /**
   * Draws the Word at x, y on the canvas context ctx.
   * @param ctx
   * @param x
   * @param y
   */
  draw(ctx:CanvasRenderingContext2D, x:number, y:number) {
    new Per(this.text.parts).concat(this.space.parts).forEach(function (part:Part) {
      part.draw(ctx, x, y);
      x += part.width;
    });
  }

  plainText() {
    return this.text.plainText + this.space.plainText;
  }

  /**
   * Get the alignment of this Word.
   * The alignment is taken as the words first parts' alignment formatting.
   * @returns {string}
   */
  align() {
    var first = this.text.parts[0];
    return first ? (<ICharacterFormatting>first.run.formatting).align : 'left';
  }

  /**
   * Emits this word's runs within a given Range (or the full word if no range is given.)
   * @param emit
   * @param range
   */
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


var section = function (runEmitter:((p:(r:Run)=>void)=>void)|Array<Run>) {
  var s:ISection = {
    parts: new Per(runEmitter).map(function (p:Run) {
      return new Part(p);
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
