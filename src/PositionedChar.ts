import {Text} from "./Text";
import {CNode} from "./Node";
import {Rect} from "./Rect";
import {PositionedWord} from "./PositionedWord";
import {Part} from "./Part";
import {Run} from "./Run";

var newLineWidth = function (run:Run) {
  return Text.measure(Text.enter, run).width;
};

export class PositionedChar extends CNode {
  /**
   * The PositionedWord containing the instance.
   */
  word : PositionedWord;
  /**
   * Width of the character in pixels.
   */
  width : number;
  /**
   * Left offset in pixels from left PositionedWord boundaries.
   */
  left : number;
  part : Part;
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

  byCoordinate(x:number, y:number):CNode[] {
    if (x <= this.bounds().center().x) {
      return [this];
    }
    return [this.next()];
  }
}