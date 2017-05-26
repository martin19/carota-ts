import {Text} from "./Text";
import {ITextMeasurement} from "./Text";
import {CNode} from "./Node";
import {Word} from "./Word";
import {ICharacterFormatting} from "./Run";
import {Run} from "./Run";


/**
 * A Part is a section of a word with its own Run, because a Word can span the
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
  /**
   * Distance from baseline to top (before applying character scaling)
   */
  ascentUnscaled:number;
  /**
   * Distance from baseline to bottom (before applying character scaling)
   */
  descentUnscaled:number;
  /**
   * Estimated type ascender.
   */
  estimatedTypeAscender: number;

  
  lineHeight:number;

  constructor(run:Run) {
    this.run = run;
    
    let m : ITextMeasurement;
    let isNewLine : boolean = false;
    if (typeof run.text === 'string') {
      isNewLine = (run.text.length === 1) && (run.text[0] === '\n');
      m = Text.measure(isNewLine ? Text.nbsp : this.maybeCapitalize(run.text as string), run);
      this.width = isNewLine ? 0 : m.width;
      this.ascent = m.ascent;
      this.descent = m.descent;
      this.ascentUnscaled = m.ascentUnscaled;
      this.descentUnscaled = m.descentUnscaled;
      this.lineHeight = m.lineHeight || 0;
      this.estimatedTypeAscender = m.extendedFontMetrics ? m.extendedFontMetrics.estimatedTypeAscender : 0;
    }

    this.isNewLine = isNewLine;
  }

  /**
   * Capitalize the runs text if "capitals" formatting is set.
   * @param text
   * @returns {string}
   */
  maybeCapitalize(text:string):string {
    if((this.run.formatting as ICharacterFormatting).capitals) {
      return (<string>(this.run.text)).toUpperCase();
    }
    return <string>this.run.text;
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
      Text.draw(ctx, this.maybeCapitalize(this.run.text as string), this.run, x, y, this.width, this.ascent, this.descent);
    }
  }
}
