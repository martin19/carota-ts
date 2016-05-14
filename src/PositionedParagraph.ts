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
   * @param parent - parent node of frame (the document node)
   * @param paragraph - the paragraph to be positioned.
   * @return {function(function(PositionedParagraph): void, Word): boolean}
   */
  static layout(left:number, top:number, width:number, ordinal:number, parent:Frame, paragraph:Paragraph) {
    var length = 0;
    var height = 0;
    var marginLeft = 0, marginRight = 0, spaceBefore = 0, spaceAfter = 0;
    var pp = new PositionedParagraph(parent, left, top, width, ordinal);
    if(paragraph) {
      pp.formatting = paragraph.formatting as IParagraphFormatting;
      marginLeft = pp.formatting.marginLeft || 0;
      marginRight = pp.formatting.marginRight || 0;
      pp.left = left + marginLeft;
      pp.top = top;
      pp.width = width - (marginLeft + marginRight);
    }
    var lines = pp.lines;

    var layouter = LayouterParagraph(pp.left, pp.top, pp.width, ordinal, pp);

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

  bounds() {
    return new Rect(this.left, this.top, this.width, this.height);
  }

  parent() {
    return this.frame;
  }

  children() {
    return this.lines;
  }

  drawBaselines(ctx:CanvasRenderingContext2D, viewport:Rect) {
    ctx.strokeStyle = "black";
    this.lines.forEach((line:Line)=>{
      var b = line.bounds(true);
      if(viewport.contains(line.left,line.baseline) && viewport.contains(line.left+line.width, line.baseline)) {
        ctx.beginPath();
        ctx.moveTo(b.l, line.baseline);
        ctx.lineTo(b.r, line.baseline);
        ctx.stroke();
      }
    });
  }

  draw(ctx:CanvasRenderingContext2D, viewPort:Rect) {
    var top = viewPort ? viewPort.t : 0;
    var bottom = viewPort ? (viewPort.t + viewPort.h) : Number.MAX_VALUE;
    this.lines.some((l:Line)=> {
      var b = l.bounds();
      if (b.t + b.h < top) {
        return false;
      }
      if (b.b > bottom) {
        return true;
      }
      l.draw(ctx, viewPort);
    });
  }

  plainText() {
    return this.lines.map((l:Line)=>{
      return l.plainText();
    }).join("");
  }
}