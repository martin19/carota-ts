import {Text} from "./Text";
import {CNode} from "./Node";
import {Part} from "./Part";
import {Rect} from "./Rect";
import {Line} from "./Line";
import {Word} from "./Word";
import {CarotaDoc} from "./Doc";
import {Run} from "./Run";

var newLineWidth = function (run:Run) {
  return Text.measure(Text.enter, run).width;
};

export class PositionedChar extends CNode {
  type : string;
  word : PositionedWord;
  width : number;
  left : number;
  part : Part;
  ordinal : number;
  length : number;
  newLine : boolean;

  constructor(left : number, part : Part, word : PositionedWord, ordinal : number, length: number) {
    super();
    this.type = "character";
    this.left = left;
    this.part = part;
    this.word = word;
    this.ordinal = ordinal;
    this.length = length;
  }

  bounds() {
    var wb = this.word.bounds();
    var width = this.word.word.isNewLine() ? newLineWidth(null) : this.width || this.part.width;
    return new Rect(wb.l + this.left, wb.t, width, wb.h);
  }

  parent() {
    return this.word;
  }

  byOrdinal() {
    return this;
  }

  byCoordinate(x:number, y:number):CNode {
    if (x <= this.bounds().center().x) {
      return this;
    }
    return this.next();
  }
}

/*  A positionedWord is just a realised Word plus a reference back to the containing Line and
 the left coordinate (x coordinate of the left edge of the word).

 It has methods:

 draw(ctx, x, y)
 - Draw the word within its containing line, applying the specified (x, y)
 offset.
 bounds()
 - Returns a rect for the bounding box.
 */

export class PositionedWord extends CNode {
  type:string;
  word:Word;
  line:Line;
  left:number;
  width:number;
  ordinal:number;
  length:number;
  _characters:Array<PositionedChar>;


  constructor(word:Word, line:Line, left:number, ordinal:number, width:number) {
    super();
    this.type = 'word';
    this.word = word;
    this.line = line;
    this.left = left;
    this.width = width; // can be different to word.width if (align == 'justify')
    this.ordinal = ordinal;
    this.length = word.text.length + word.space.length;
  }

  draw(ctx:CanvasRenderingContext2D) {
    this.word.draw(ctx, this.line.left + this.left, this.line.baseline);

    // Handy for showing how word boundaries work
    //var b = this.bounds();
    //ctx.strokeRect(b.l, b.t, b.w, b.h);
  }

  bounds() {
    return new Rect(
      this.line.left + this.left,
      this.line.baseline - this.line.ascent,
      this.word.isNewLine() ? newLineWidth(null) : this.width,
      this.line.ascent + this.line.descent);
  }

  parts(eachPart:(p:Part)=>void) {
    /*this.word.text.parts.some(eachPart) ||
    this.word.space.parts.some(eachPart);*/
    this.word.text.parts.forEach(eachPart);
    this.word.space.parts.forEach(eachPart);
  }

  realiseCharacters() {
    if (!this._characters) {
      var cache:Array<PositionedChar> = [];
      var x = 0, self = this, ordinal = this.ordinal,
        codes = (<CarotaDoc>this.parentOfType('document')).codes;
      this.parts(function (wordPart:Part) {
        Run.pieceCharacters(function (char) {
          var charRun = wordPart.run.clone();
          charRun.text = char;
          var p = new Part(charRun, codes);
          cache.push(new PositionedChar(x, p, self, ordinal, 1));
          x += p.width;
          ordinal++;
        }, wordPart.run.text);
      });
      // Last character is artificially widened to match the length of the
      // word taking into account (align === 'justify')
      var lastChar = cache[cache.length - 1];
      if (lastChar) {
        lastChar.width = this.width - lastChar.left;
        if (this.word.isNewLine() || (this.word.code() && this.word.code().eof)) {
          lastChar.newLine = true;
        }
      }
      this._characters = cache;
    }
  }

  children() {
    this.realiseCharacters();
    return this._characters;
  }

  parent():CNode {
    return this.line;
  }
}