import {CNode} from "./Node";
import {Wrap} from "./Wrap";
import {Rect} from "./Rect";
import {Line} from "./Line";
import {Word} from "./Word";
import {ICode} from "./Part";
import {NoWrap} from "./NoWrap";

export class Frame extends CNode {
  type:string;
  lines:Array<Line>;
  _parent:CNode;
  _bounds : Rect;
  height:number;
  _actualWidth:number;

  constructor(parent:CNode, ordinal : number) {
    super();
    this.type = 'frame';
    this.lines = [];
    this._parent = parent;
    this.ordinal = ordinal;
  }

  /**
   * Creates a Frame by adding words without wrapping at boundaries.
   * @param left
   * @param top
   * @param ordinal
   * @param parent
   * @param includeTerminator
   * @param initialAscent
   * @param initialDescent
   * @return {function(function(Frame): void, Word): boolean}
   */
  static noWrap(left:number, top:number, ordinal:number, parent:CNode, includeTerminator?:(p:ICode)=>boolean, initialAscent?:number, initialDescent?:number) {
    var frame_ = new Frame(parent, ordinal);
    var lines = frame_.lines;
    var wrapper = NoWrap(left, top, ordinal, frame_, includeTerminator, initialAscent, initialDescent);
    var length = 0, height = 0;
    return function (emit:(p:Frame)=>void, word:Word) {
      if (wrapper(function (line:number|Line) {
          if (typeof line === 'number') {
            height = line;
          } else {
            length = (line.ordinal + line.length) - ordinal;
            lines.push(line);
          }
        }, word)) {
        frame_.length = length;
        emit(frame_);
        return true;
      }
    };
  }

  /**
   * Creates a Frame by wrapping words at frame boundaries.
   * @param left
   * @param top
   * @param width
   * @param ordinal
   * @param parent
   * @return {function(function(Frame): void, Word): boolean}
   */
  static wrap(left:number, top:number, width:number, ordinal:number, parent:CNode) {
    var frame_ = new Frame(parent, ordinal);
    var lines = frame_.lines;
    var wrapper = Wrap(left, top, width, ordinal, frame_);
    var length = 0, height = 0;
    return function (emit:(p:Frame)=>void, word:Word) {
      if (wrapper(function (line:number|Line) {
          if (typeof line === 'number') {
            height = line;
          } else {
            length = (line.ordinal + line.length) - ordinal;
            lines.push(line);
          }
        }, word)) {
        frame_.length = length;
        frame_.height = height;
        emit(frame_);
        return true;
      }
    };
  }

  bounds() {
    var left = Number.MAX_VALUE, top = Number.MAX_VALUE, right = -Number.MAX_VALUE, bottom = -Number.MAX_VALUE;
    if (this.lines.length) {
      this.lines.forEach(function (line) {
        var b = line.bounds();
        left = Math.min(left, b.l);
        top = Math.min(top, b.t);
        right = Math.max(right, b.l + b.w);
        bottom = Math.max(bottom, b.t + b.h);
      });
    }
    this._bounds = new Rect(left, top, right - left, this.height || bottom - top);
    return this._bounds;
  }

  actualWidth() {
    if (!this._actualWidth) {
      var result = 0;
      this.lines.forEach(function (line) {
        if (typeof line.actualWidth === 'number') {
          result = Math.max(result, line.actualWidth);
        }
      });
      this._actualWidth = result;
    }
    return this._actualWidth;
  }

  children():Array<CNode> {
    return this.lines;
  }

  parent() {
    return this._parent;
  }

  draw(ctx:CanvasRenderingContext2D, viewPort:Rect) {
    var top = viewPort ? viewPort.t : 0;
    var bottom = viewPort ? (viewPort.t + viewPort.h) : Number.MAX_VALUE;
    this.lines.some(function(line) {
      var b = line.bounds();
      if (b.t + b.h < top) {
        return false;
      }
      if (b.b > bottom) {
        return true;
      }
      line.draw(ctx, viewPort);
    });
  }
}