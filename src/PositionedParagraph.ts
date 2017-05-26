import {CNode} from "./Node";
import {Line} from "./Line";
import {Frame} from "./Frame";
import {Word} from "./Word";
import {Rect} from "./Rect";
import {LayouterParagraph} from "./LayouterParagraph";
import {IParagraphFormatting, Paragraph} from "./Paragraph";

export class PositionedParagraph extends CNode {
  frame : Frame;
  lines : Array<Line>;
  top : number;
  left : number;
  height : number;
  actualWidth : number;
  width : number;
  formatting : IParagraphFormatting;

  /**
   * Create a new Paragraph.
   * @param frame
   * @param left
   * @param top
   * @param width
   * @param ordinal
   */
  constructor(frame : Frame, left : number, top:number, width : number, ordinal : number) {
    super();
    this.type = "paragraph";
    this.frame = frame;
    this.left = left;
    this.top = top;
    this.width = width;
    this.height = 0;
    this.actualWidth = width;
    this.ordinal = ordinal;
    this.formatting = Paragraph.defaultFormatting;
    this.lines = [];
  }
  
  /**
   * Returns function that emits a Frame by wrapping words at frame boundaries.
   * @param left - left coordinate of frame in pixels
   * @param top - top coordinate of frame in pixels
   * @param width - width of frame in pixels
   * @param ordinal - ordinal number of first character in frame
   * @param wrap - enable wrapping at frame boundaries.
   * @param parent - parent node of frame (the document node)
   * @param paragraph - the paragraph to be positioned.
   * @return {function(function(PositionedParagraph): void, Word): boolean}
   */
  static layout(left:number, top:number, width:number, ordinal:number, wrap:boolean, parent:Frame, paragraph:Paragraph) {
    let length = 0;
    let height = 0;
    let marginLeft = 0, marginRight = 0, spaceBefore = 0, spaceAfter = 0;
    let pp = new PositionedParagraph(parent, left, top, width, ordinal);
    if(paragraph) {
      pp.formatting = paragraph.formatting as IParagraphFormatting;
      marginLeft = pp.formatting.marginLeft || 0;
      marginRight = pp.formatting.marginRight || 0;
      pp.left = left + marginLeft;
      pp.top = top;
      pp.width = width - (marginLeft + marginRight);
    }
    let lines = pp.lines;

    let layouter = LayouterParagraph(pp.left, pp.top, pp.width, ordinal, wrap, pp);

    return (emit:(p:PositionedParagraph)=>void, word:Word) => {

      if (layouter(function (line:number|Line) {
          if (typeof line === 'number') {
            height = line;
          } else {
            length = (line.ordinal + line.length) - ordinal;
            //lineHeight is auto or lineHeight is set
            height += line.maxLineHeight > 0 ? line.maxLineHeight : line.ascentUnscaled + line.descentUnscaled;
            lines.push(line);
          }
        }, word)) {
        pp.length = length;
        pp.height = height;
        emit(pp);
        return true;
      }
    };
  }

  bounds(actual?:boolean) {
    if(!actual) {
      return new Rect(this.left, this.top, this.width, this.height);
    } else {
      let left = Number.MAX_VALUE, top = Number.MAX_VALUE, right = -Number.MAX_VALUE, bottom = -Number.MAX_VALUE;
      if (this.lines.length) {
        this.lines.forEach((line:Line,i:number)=> {
          let b = line.bounds(actual);
          left = Math.min(left, b.l);
          top = Math.min(top, b.t);
          right = Math.max(right, b.l + b.w);
          bottom = Math.max(bottom, b.t + b.h);
        });
      }
      return new Rect(left, top, right - left, bottom - top);
    }
  }

  parent():CNode|null {
    return this.frame;
  }

  children() {
    return this.lines;
  }

  drawBaselines(ctx:CanvasRenderingContext2D, viewport:Rect) {
    ctx.strokeStyle = "black";
    this.lines.forEach((line:Line)=>{
      let b = line.bounds(true);
      if(viewport.contains(line.left,line.baseline) && viewport.contains(line.left+line.width, line.baseline)) {
        ctx.beginPath();
        ctx.moveTo(b.l, line.baseline);
        ctx.lineTo(b.r, line.baseline);
        ctx.stroke();
      }
    });
  }

  draw(ctx:CanvasRenderingContext2D, viewPort:Rect) {
    let top = viewPort ? viewPort.t : -Number.MAX_VALUE;
    let bottom = viewPort ? (viewPort.t + viewPort.h) : Number.MAX_VALUE;
    this.lines.some((l:Line)=> {
      let b = l.bounds();
      if (b.t + b.h < top) {
        return false;
      }
      if (b.b > bottom) {
        return true;
      }
      l.draw(ctx, viewPort);
      return false;
    });
  }

  plainText() {
    return this.lines.map((l:Line)=>{
      return l.plainText();
    }).join("");
  }
}