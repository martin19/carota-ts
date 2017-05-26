import {CNode} from "./Node";
import {Rect} from "./Rect";
import {Word} from "./Word";
import {PositionedParagraph} from "./PositionedParagraph";
import {LayouterFrame} from "./LayouterFrame";
import {CarotaDoc} from "./Doc";
import {Per} from "./Per";

export class Frame extends CNode {
  type:string;
  paragraphs:Array<PositionedParagraph>;
  _parent:CarotaDoc;

  /**
   * Computed height and width
   */
  actualHeight:number;
  actualWidth:number;

  /**
   * User set dimensions
   */
  top:number;
  left:number;
  width:number;
  height:number;


  constructor(parent:CarotaDoc, ordinal:number) {
    super();
    this.type = 'frame';
    this.paragraphs = [];
    this._parent = parent;
    this.ordinal = ordinal;

    this.left = 0;
    this.top = 0;
    this.width = 0;
    this.height = 0;
    this.actualHeight = 0;
    this.actualWidth = 0;
  }
  
  /**
   * Lays out the frames content. 
   */
  layout() {

    let left = this.left;
    let top = this.top;
    let width = this.width;
    let words = this.parent().words;
    let wrap = this.parent().wrap;
    let ordinal = 0;

    this.paragraphs = [];
    let layouter = LayouterFrame(left, top, width, ordinal, wrap, this);
    let length = 0, height = 0;

    new Per(words).forEach((word:Word)=> {
      if (layouter((p:PositionedParagraph)=> {
          this.paragraphs.push(p);
          length += p.length;
          height += p.height;
        }, word)) {
        this.length = length;
        this.actualHeight = height;
        this.updateActualWidth();
      }
    });
  }

  /**
   * Gets the bounds of the Frame.
   * @param actual
   * @returns {Rect}
   */
  bounds(actual?:boolean) {
    let left = Number.MAX_VALUE, top = Number.MAX_VALUE, right = -Number.MAX_VALUE, bottom = -Number.MAX_VALUE;
    if (this.paragraphs.length) {
      this.paragraphs.forEach((paragraph:PositionedParagraph, i:number)=> {
        let b = paragraph.bounds(actual);
        left = Math.min(left, b.l);
        top = Math.min(top, b.t);
        right = Math.max(right, b.l + b.w);
        bottom = Math.max(bottom, b.t + b.h);
      });
    }
    if (actual) {
      return new Rect(left, top, right - left, bottom - top);
    }
    return new Rect(left, top, this.width, this.height);

  }

  /**
   * Sets the current width of the frame.
   * @param width
   * @param height
   * @returns {number}
   */
  setSize(width:number, height:number) {
    this.width = width;
    this.height = height;
    this.layout();
  }

  updateActualWidth() {
    if (!this.actualWidth) {
      let result = 0;
      this.paragraphs.forEach((p:PositionedParagraph)=> {
        if (typeof p.actualWidth === 'number') {
          result = Math.max(result, p.actualWidth);
        }
      });
      this.actualWidth = result;
    }
    return this.actualWidth;
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
    let b = this.bounds();
    ctx.strokeStyle = "red";
    ctx.strokeRect(b.l, b.t, b.w, b.h);

    //draw actual frame bounds
    b = this.bounds(true);
    ctx.strokeStyle = "yellow";
    ctx.strokeRect(b.l, b.t, b.w, b.h);
  }
}