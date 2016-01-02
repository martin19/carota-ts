import {CNode} from "./Node";
import {Wrap} from "./Wrap";
import {Rect} from "./Rect";
import {Line} from "./Line";
import {Word} from "./Word";
import {ICode} from "./Part";

export class Frame extends CNode {
  type:string;
  lines:Array<Line>;
  _parent:CNode;
  ordinal:number;
  _bounds : Rect;
  height:number;
  _actualWidth:number;

  constructor(left:number, top:number, width:number, ordinal:number, parent:CNode, includeTerminator?:(p:ICode)=>boolean, initialAscent?:number, initialDescent?:number) {
    super();
    this.type = 'frame';
    this.lines = [];
    this._parent = parent;
    this.ordinal = ordinal;
  }

  static wrap(left:number, top:number, width:number, ordinal:number, parent:CNode, includeTerminator?:(p:ICode)=>boolean, initialAscent?:number, initialDescent?:number) {
    var frame_ = new Frame(left, top, width, ordinal, parent, includeTerminator, initialAscent, initialDescent);
    var lines = frame_.lines;
    var wrapper = Wrap(left, top, width, ordinal, frame_, includeTerminator, initialAscent, initialDescent);
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
    if (!this._bounds) {
      var left = 0, top = 0, right = 0, bottom = 0;
      if (this.lines.length) {
        var first = this.lines[0].bounds();
        left = first.l;
        top = first.t;
        this.lines.forEach(function (line) {
          var b = line.bounds();
          right = Math.max(right, b.l + b.w);
          bottom = Math.max(bottom, b.t + b.h);
        });
      }
      this._bounds = new Rect(left, top, right - left, this.height || bottom - top);
    }
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