import {CNode} from "./Node";
import {PositionedWord} from "./PositionedWord";
import {Rect} from "./Rect";
import {CarotaDoc} from "./Doc";
import {Word} from "./Word";
import {Frame} from "./Frame";
import {PositionedParagraph} from "./PositionedParagraph";

/*  A Line is returned by the wrap function. It contains an array of PositionedWord objects that are
 all on the same physical line in the wrapped text.

 It has a width (which is actually the same for all lines returned by the same wrap). It also has
 coordinates for baseline, ascent and descent. The ascent and descent have the maximum values of
 the individual words' ascent and descent coordinates.

 It has methods:

 draw(ctx, x, y)
 - Draw all the words in the line applying the specified (x, y) offset.
 bounds()
 - Returns a Rect for the bounding box.
 */

export class Line extends CNode {
  positionedWords:Array<PositionedWord>;
  actualWidth:number;
  type:string;
  paragraph:PositionedParagraph;
  left:number;
  width:number;
  baseline:number;
  ascent:number;
  descent:number;
  align:string;

  constructor(paragraph:PositionedParagraph, left:number, width:number, baseline:number, ascent:number, descent:number, words:Array<Word>, ordinal:number) {
    super();
    this.type = 'line';
    var self = this;

    var align = words[0].align();

    this.paragraph = paragraph;
    this.left = left;
    this.width = width;
    this.baseline = baseline;
    this.ascent = ascent;
    this.descent = descent;
    this.ordinal = ordinal;
    this.align = align;


    var actualWidth = 0;
    words.forEach(function (word) {
      actualWidth += word.width;
    });
    actualWidth -= words[words.length - 1].space.width;

    var x = 0, spacing = 0;
    if (actualWidth < width) {
      switch (align) {
        case 'right':
          x = width - actualWidth;
          break;
        case 'center':
          x = (width - actualWidth) / 2;
          break;
        case 'justify':
          if (words.length > 1 && !words[words.length - 1].isNewLine()) {
            spacing = (width - actualWidth) / (words.length - 1);
          }
          break;
      }
    }

    this.positionedWords = words.map(function (word:Word) {
      var wordLeft = x;
      x += (word.width + spacing);
      var wordOrdinal = ordinal;
      ordinal += (word.text.length + word.space.length);
      return new PositionedWord(word, self, wordLeft, wordOrdinal, word.width + spacing);
    });
    this.actualWidth = actualWidth;
    this.length = ordinal - this.ordinal;
  }

  bounds(minimal?:boolean) {
    if (minimal) {
      var firstWord = this.first().bounds(),
        lastWord = this.last().bounds();
      return new Rect(
        firstWord.l,
        this.baseline - this.ascent,
        (lastWord.l + lastWord.w) - firstWord.l,
        this.ascent + this.descent);
    }
    return new Rect(this.left, this.baseline - this.ascent,
      this.width, this.ascent + this.descent);
  }

  parent() {
    return this.paragraph;
  }

  children() {
    return this.positionedWords;
  }

  /**
   * Gets content as plaintext.
   */
  plainText() {
    return this.positionedWords.map((w : PositionedWord)=>{
      return w.plainText();
    }).join("");
  }
}
