import {Text} from "./Text";
import {CNode} from "./Node";
import {Part} from "./Part";
import {Rect} from "./Rect";
import {Line} from "./Line";
import {Word} from "./Word";
import {CharacterRun} from "./CharacterRun";
import {PositionedChar} from "./PositionedChar";

var newLineWidth = function (run:CharacterRun) {
  return Text.measure(Text.enter, run).width;
};

/**
 * A PositionedWord is just a realised Word plus a reference back to the containing Line and
 * the left coordinate (x coordinate of the left edge of the word).
 */
export class PositionedWord extends CNode {
  type:string;

  /**
   * Word object associated with this PositionedWord.
   */
  word:Word;
  /**
   * Parent of this PositionedWord. 
   */
  line:Line;
  /**
   * Left offset in pixels of this PositionedWord instance in the Line.
   */
  left:number;
  /**
   * Width of this instance in pixels.
   */
  width:number;
  /**
   * Children nodes of this instance.
   */
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

  /**
   * Draw the word within its containing line, applying the specified (x, y) offset.
   * @param ctx
   */
  draw(ctx:CanvasRenderingContext2D) {
    this.word.draw(ctx, this.line.left + this.left, this.line.baseline);

    // Handy for showing how word boundaries work
    var b = this.bounds();
    ctx.strokeRect(b.l, b.t, b.w, b.h);
  }

  /**
   * Returns a rect for the bounding box.
   * @returns {Rect}
   */
  bounds() {
    return new Rect(
      this.line.left + this.left,
      this.line.baseline - this.line.ascent,
      this.word.isNewLine() ? newLineWidth(null) : this.width,
      this.line.ascent + this.line.descent);
  }

  /**
   * Applies function "eachPart" to each part of word's text and space section.
   * @param eachPart
   */
  parts(eachPart:(p:Part)=>void) {
    this.word.text.parts.forEach(eachPart);
    this.word.space.parts.forEach(eachPart);
  }

  /**
   * Creates an Array of PositionedChars from parts of the PositionedWord.
   * The characters are pushed onto a cache "_characters"
   * Every PositionedChar receives a new Run with the words formatting and text
   * being a single character.
   * TODO: formatting of character run is probably never used
   */
  realiseCharacters() {
    if (!this._characters) {
      var cache:Array<PositionedChar> = [];
      var x = 0, self = this, ordinal = this.ordinal;
      this.parts(function (wordPart:Part) {
        CharacterRun.pieceCharacters(function (char) {
          var charRun = wordPart.run.clone();
          charRun.text = char;
          var p = new Part(charRun);
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
        if (this.word.isNewLine()) {
          lastChar.newLine = true;
        }
      }
      this._characters = cache;
    }
  }

  /**
   * Creates PositionedChars and returns them.
   * @returns {Array<PositionedChar>}
   */
  children() {
    this.realiseCharacters();
    return this._characters;
  }

  /**
   * Returns the parent Line object of the PositionedWord.
   * @returns {Line}
   */
  parent():Line {
    return this.line;
  }

  /**
   * Gets content as plaintext string.
   */
  plainText():string {
    return this.word.plainText();
  }
}