import {CNode} from "./Node";
import {PositionedWord} from "./PositionedWord";
import {Rect} from "./Rect";
import {Word} from "./Word";
import {PositionedParagraph} from "./PositionedParagraph";
import {ParagraphAlignment} from "./Paragraph";

/**
 * A Line is returned by the wrap function. It contains an array of PositionedWord objects that are
 * all on the same physical line in the wrapped text.
 */
export class Line extends CNode {
  type:string;
  /**
   * The positionedWords this Line contains.
   */
  positionedWords:Array<PositionedWord>;
  /**
   * Actual width of the PositionedWords inside this Line.
   */
  actualWidth:number;
  /**
   * The parent PositionedParagraph object.
   */
  paragraph:PositionedParagraph;
  /**
   * Left coordinate of the line.
   */
  left:number;
  /**
   * width - the same for all lines returned by the same wrap.
   */
  width:number;
  /**
   * The baseline y coordinate of this Line.
   */
  baseline:number;
  /**
   * Ascent of the line (top - baseline).
   */
  ascent:number;
  /**
   * Descent of the line (baseline - bottom).
   */
  descent:number;
  /**
   * Ascent of the line (top - baseline) (before applying character scaling.)
   */
  ascentUnscaled:number;
  /**
   * Descent of the line (baseline - bottom) (before applying character scaling.)
   */
  descentUnscaled:number;
  /**
   * Maximum lineHeight formatting within line.
   */
  maxLineHeight:number;
  
  /**
   * Alignment of the PositionedWords inside the Line.
   */
  align:ParagraphAlignment;

  constructor(paragraph:PositionedParagraph, left:number, width:number, baseline:number, ascent:number, descent:number, ascentUnscaled:number, descentUnscaled:number, maxLineHeight:number, words:Array<Word>, ordinal:number) {
    super();
    this.type = 'line';
    var self = this;

    this.paragraph = paragraph;
    this.left = left;
    this.width = width;
    this.baseline = baseline;
    this.ascent = ascent;
    this.descent = descent;
    this.ascentUnscaled = ascentUnscaled;
    this.descentUnscaled = descentUnscaled;
    this.maxLineHeight = maxLineHeight;
    this.ordinal = ordinal;
    var align = this.paragraph.formatting.align;
    this.align = align;

    var actualWidth = 0;
    words.forEach(function (word) {
      actualWidth += word.width;
    });
    actualWidth -= words[words.length - 1].space.width;

    var last = words[words.length-1].isNewLine();
    if(last && align == "justifyLastLeft") align = "left";
    if(last && align == "justifyLastCentered") align = "center";
    if(last && align == "justifyLastRight") align = "right";

    var x = 0, spacing = 0;
    if (actualWidth < width) {
      switch (align) {
        case "left":
          x = 0;
          break;
        case "right":
          x = width - actualWidth;
          break;
        case "center":
          x = (width - actualWidth) / 2;
          break;
        case "justifyLastLeft":
        case "justifyLastCentered":
        case "justifyLastRight":
        case "justifyAll":
          if (words.length > 1) {
            spacing = (width - actualWidth) / (words.length - 1);
          }
        break;
        default:
          x = 0;
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

  /**
   * Returns a Rect for the bounding box.
   * @param minimal
   * @returns {Rect}
   */
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
    return new Rect(this.left, this.baseline - this.ascent, this.width, this.ascent + this.descent);
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
