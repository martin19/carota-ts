import {Text} from "./Text";
import {ITextMeasurement} from "./Text";
import {CNode} from "./Node";
import {Word} from "./Word";
import {ICharacterFormatting} from "./Run";
import {Run} from "./Run";


/**
 * A Part is a section of a word with its own CharacterRun, because a Word can span the
 * boundaries between CharacterRuns, so it may have several parts in its text or space
 * arrays.
 */
export class Part {
  /**
   *  Run being measured.
   */
  run:Run;
  /**
   * True if this part only contain a newline (\n). This will be
   * the only Part in the Word, and this is the only way newlines
   * ever occur.
   */
  isNewLine:boolean;
  /**
   *  Width of the run.
   */
  width:number;
  /**
   * Distance from baseline to top.
   */
  ascent:number;
  /**
   * Distance from baseline to bottom.
   */
  descent:number;
  lineHeight:number;

  constructor(run:Run) {
    var m : ITextMeasurement, isNewLine : boolean;
    if (typeof run.text === 'string') {
      isNewLine = (run.text.length === 1) && (run.text[0] === '\n');
      m = Text.measure(isNewLine ? Text.nbsp : <string>run.text, run);
    }

    this.run = run;
    this.isNewLine = isNewLine;
    this.width = isNewLine ? 0 : m.width;
    this.ascent = m.ascent;
    this.descent = m.descent;
    this.lineHeight = m.lineHeight;
  }

  /**
   *  Draws the Word at x, y on the canvas context ctx. The y
   * coordinate is assumed to be the baseline. The call
   * prepareContext(ctx) will set the canvas up appropriately.
   * @param ctx
   * @param x
   * @param y
   */
  draw(ctx:CanvasRenderingContext2D, x:number, y:number) {
    if (typeof this.run.text === 'string') {
      Text.draw(ctx, <string>(this.run.text), this.run, x, y, this.width, this.ascent, this.descent);
    }
  }
}
