import {Text} from "./Text";
import {ITextMeasurement} from "./Text";
import {CNode} from "./Node";
import {Word} from "./Word";
import {IFormatting} from "./Run";
import {Run} from "./Run";

var defaultInline = {
  measure: function (formatting:Run) {
    var text_:ITextMeasurement = Text.measure('?', formatting);
    return {
      width: text_.width + 4,
      ascent: text_.width + 2,
      descent: text_.width + 2
    };
  },
  draw: function (ctx:CanvasRenderingContext2D, x:number, y:number, width:number, ascent:number, descent:number) {
    ctx.fillStyle = 'silver';
    ctx.fillRect(x, y - ascent, width, ascent + descent);
    ctx.strokeRect(x, y - ascent, width, ascent + descent);
    ctx.fillStyle = 'black';
    ctx.fillText('?', x + 2, y);
  }
};

/**
 A Part is a section of a word with its own run, because a Word can span the
 boundaries between runs, so it may have several parts in its text or space
 arrays.

 run           - Run being measured.
 isNewLine     - True if this part only contain a newline (\n). This will be
 the only Part in the Word, and this is the only way newlines
 ever occur.
 width         - Width of the run
 ascent        - Distance from baseline to top
 descent       - Distance from baseline to bottom

 And methods:

 draw(ctx, x, y)
 - Draws the Word at x, y on the canvas context ctx. The y
 coordinate is assumed to be the baseline. The call
 prepareContext(ctx) will set the canvas up appropriately.
 */

export interface ICode {
  measure : (p:any) => ITextMeasurement;
  draw : (ctx:CanvasRenderingContext2D, x:number, y:number, width:number, ascent:number, descent:number, formatting:Run) => void;
  block?: (left:number, top:number, width:number, ordinal:number, parent:CNode, formatting:Run) => (w:Word)=>CNode;
  eof? : boolean;
}

export class Part {
  run:Run;
  isNewLine:boolean;
  width:number;
  ascent:number;
  descent:number;
  code:ICode;

  constructor(run:Run, codes:(s:string, data?:any)=>ICode) {
    var m : ITextMeasurement, isNewLine : boolean, code : ICode;
    if (typeof run.text === 'string') {
      isNewLine = (run.text.length === 1) && (run.text[0] === '\n');
      m = Text.measure(isNewLine ? Text.nbsp : <string>run.text, run);
    } else {
      code = codes(<string>(run.text)) || defaultInline;
      m = code.measure ? code.measure(run) : {
        width: 0, ascent: 0, descent: 0
      };
    }

    this.run = run;
    this.isNewLine = isNewLine;
    this.width = isNewLine ? 0 : m.width;
    this.ascent = m.ascent;
    this.descent = m.descent;
    if (code) {
      this.code = code;
    }
  }

  draw(ctx:CanvasRenderingContext2D, x:number, y:number) {
    if (typeof this.run.text === 'string') {
      Text.draw(ctx, <string>(this.run.text), this.run, x, y, this.width, this.ascent, this.descent);
    } else if (this.code && this.code.draw) {
      ctx.save();
      this.code.draw(ctx, x, y, this.width, this.ascent, this.descent, this.run);
      ctx.restore();
    }
  }
}
