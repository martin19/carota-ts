import {CNode} from "./Node";
import {Rect} from "./Rect";
import {Word} from "./Word";
import {PositionedParagraph} from "./PositionedParagraph";
import {LayouterFrame} from "./LayouterFrame";
import {CarotaDoc} from "./Doc";

export class Frame extends CNode {
  type:string;
  paragraphs:Array<PositionedParagraph>;
  _parent:CarotaDoc;
  _bounds : Rect;
  height:number;
  _actualWidth:number;

  constructor(parent:CarotaDoc, ordinal : number) {
    super();
    this.type = 'frame';
    this.paragraphs = [];
    this._parent = parent;
    this.ordinal = ordinal;
  }

  /**
   * Returns a function that emits a Frame by adding words without wrapping at boundaries.
   * @param left - left coordinate of frame in pixels
   * @param top - top coordinate of frame in pixels
   * @param ordinal - ordinal number of first character in frame
   * @param parent - parent node of frame (the document node)
   * @return {function(function(Frame): void, Word): boolean}
   */
  static noWrap(left:number, top:number, ordinal:number, parent:CNode) {
    //TODO
  }

  /**
   * Returns function that emits a Frame by laying out words in paragraphs.
   * @param left - left coordinate of frame in pixels 
   * @param top - top coordinate of frame in pixels
   * @param width - width of frame in pixels
   * @param ordinal - ordinal number of first character in frame
   * @param wrap - enable line wrapping at frame boundaries
   * @param parent - parent node of frame (the document node)
   * @return {function(function(Frame): void, Word): boolean}
   */
  static layout(left:number, top:number, width:number, ordinal:number, wrap:boolean, parent:CarotaDoc) {
    var frame_ = new Frame(parent, ordinal);
    var paragraphs = frame_.paragraphs;
    var layouter = LayouterFrame(left, top, width, ordinal, wrap, frame_);
    var length = 0, height = 0;
    return (emit:(f:Frame)=>void, word:Word) => {
      if(layouter((p:PositionedParagraph)=>{
        paragraphs.push(p);
        length += p.length;
        height += p.height;
      }, word)) {
        frame_.length = length;
        frame_.height = height;
        frame_.actualWidth();
        emit(frame_);
      }
    };
  }

  /**
   * Gets the bounds of the Frame.
   * @param actual
   * @returns {Rect}
   */
  bounds(actual? : boolean) {
  var left = Number.MAX_VALUE, top = Number.MAX_VALUE, right = -Number.MAX_VALUE, bottom = -Number.MAX_VALUE;
  if (this.paragraphs.length) {
    this.paragraphs.forEach((paragraph:PositionedParagraph, i:number)=> {
      var b = paragraph.bounds(actual);
      left = Math.min(left, b.l);
      top = Math.min(top, b.t);
      right = Math.max(right, b.l + b.w);
      bottom = Math.max(bottom, b.t + b.h);
    });
  }
  if (actual) {
    return new Rect(left, top, right - left, bottom - top);
  }
  return new Rect(left, top, right - left, this.height);

}

  actualWidth() {
    if (!this._actualWidth) {
      var result = 0;
      this.paragraphs.forEach((p:PositionedParagraph)=>{
        if (typeof p.actualWidth === 'number') {
          result = Math.max(result, p.actualWidth);
        }
      });
      this._actualWidth = result;
    }
    return this._actualWidth;
  }

  children():Array<CNode> {
    return this.paragraphs;
  }

  parent() {
    return this._parent;
  }
  
  draw(ctx:CanvasRenderingContext2D, viewPort:Rect) {
    this.paragraphs.forEach((p:PositionedParagraph)=> {
      p.draw(ctx, viewPort);
    });

    //draw frame bounds
    var b = this.bounds();
    ctx.strokeStyle = "red";
    ctx.strokeRect(b.l, b.t, b.w, b.h);

    //draw actual frame bounds
    var b = this.bounds(true);
    ctx.strokeStyle = "yellow";
    ctx.strokeRect(b.l, b.t, b.w, b.h);
  }
}