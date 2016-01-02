import {Dom} from "./Dom";
import {CarotaDoc} from "./Doc";
import {Rect} from "./Rect";
import {CNode} from "./Node";
import {PositionedWord} from "./Positionedword";
import {IFormattingMap} from "./Run";
import {Input} from "./Input";
import {Run} from "./Run";

export interface EditorOptions {
  canvas : HTMLCanvasElement;
  cx? : number,
  cy? : number,
  alpha? : number;
  w? : number,
  h? : number,
  sx? : number,
  sy? : number,
  bindHandlers? : boolean,
  manageTextArea? : boolean,
  paintSelection? : boolean,
}

export class Editor {
  input:Input;
  canvas:HTMLCanvasElement;
  textArea:HTMLTextAreaElement;
  textAreaContent:string;
  doc:CarotaDoc;
  keyboardSelect:number;
  /**
   * Remember the current x position of the cursor.
   */
  keyboardX:number;
  nextKeyboardX:number;
  selectDragStart:number;
  focusChar:number;
  richClipboard:Array<Run>;
  plainClipboard:string;
  toggles:{[n:number]:string};
  verticalAlignment:string;
  nextCaretToggle:number;

  rect:Rect;

  private cx:number;
  private cy:number;
  private alpha:number;
  private sx:number;
  private sy:number;
  private w:number;
  private h:number;
  public bindHandlers : boolean;
  public manageTextArea : boolean;
  public paintSelection : boolean;

  constructor(options:EditorOptions) {

    this.canvas = options.canvas;
    this.canvas.classList.add("carotaEditorCanvas");

    this.cx = options.cx || 0;
    this.cy = options.cy || 0;
    this.alpha = options.alpha || 0;
    this.w = options.w || 100;
    this.h = options.h || 100;
    this.sx = 1.0;
    this.sy = 1.0;
    this.bindHandlers = typeof options.bindHandlers === "boolean" ? options.bindHandlers : true;
    this.manageTextArea = typeof options.manageTextArea === "boolean" ? options.manageTextArea : true;
    this.paintSelection = typeof options.paintSelection === "boolean" ? options.paintSelection : true;

    if(this.manageTextArea) {
      this.textArea = document.createElement("textarea");
      this.textArea.style.position = "absolute";
      this.textArea.style.zIndex = "-10000";
      document.body.appendChild(this.textArea);
      this.textAreaContent = "";
    }

    this.doc = new CarotaDoc();
    this.keyboardSelect = 0;
    this.keyboardX = null;
    this.nextKeyboardX = null;
    this.selectDragStart = null;
    this.focusChar = null;
    this.richClipboard = null;
    this.plainClipboard = null;
    this.toggles = {
      66: 'bold',
      73: 'italic',
      85: 'underline',
      83: 'strikeout'
    };
    this.verticalAlignment = 'top';
    this.nextCaretToggle = new Date().getTime();

    this.doc.setVerticalAlignment = function (va) {
      this.verticalAlignment = va;
      this.paint();
    };

    this.doc.selectionChanged.on(({getFormatting:getFormatting, takeFocus:takeFocus}) => {
      this.paint();
      this.input.updateTextArea();
    });

    Dom.handleEvent(this.canvas, 'carotaEditorSharedTimer', ()=> {
      this.update();
    });

    this.updateTransform();
    this.update();
    this.input = new Input(this);
  }

  getDoc() {
    return this.doc;
  }

  /**
   * Gets vertical offset of editor
   * @return {number}
   */
  getVerticalOffset() {
    var docHeight = this.doc.frame.bounds().h;
    if (docHeight < this.h) {
      switch (this.verticalAlignment) {
        case 'middle':
          return (this.h - docHeight) / 2;
        case 'bottom':
          return this.h - docHeight;
      }
    }
    return 0;
  }

  /**
   * Updates editor contents. Paint is called if
   * caret is moved or if w/h of rect has
   * changed.
   */
  update() {

    var requirePaint = false;

    var now = new Date().getTime();
    if (now > this.nextCaretToggle) {
      this.nextCaretToggle = now + 500;
      if (this.doc.toggleCaret()) {
        requirePaint = true;
      }
    }

    if (requirePaint) {
      this.paint();
    }
  }

  /**
   * Paint editor contents
   */
  paint() {

    var availableWidth = this.w;
    if (this.doc.width() !== availableWidth) {
      this.doc.width(availableWidth);
    }

    var logicalWidth = Math.max(this.doc.frame.actualWidth(), this.w);
    var logicalHeight = this.h;

    var l = this.cx - this.w / 2;
    var t = this.cy - this.h / 2;

    var ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();

    ctx.translate(this.cx, this.cy);
    ctx.rotate(this.alpha);
    ctx.scale(this.sx, this.sy);
    ctx.translate(-this.cx, - this.cy);
    ctx.translate(l, t + this.getVerticalOffset());
    ctx.fillStyle = "#FFF";
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    if(this.manageTextArea) {
      this.updateTextArea(logicalWidth, logicalHeight);
    }

    this.doc.draw(ctx, new Rect(0, 0, logicalWidth, logicalHeight));

    if(this.paintSelection) {
      this.doc.drawSelection(ctx, true, new Rect(0,0, logicalWidth, logicalHeight));
    }
    ctx.restore();
  }

  private updateTextArea(logicalWidth : number, logicalHeight : number) {
    var l = this.cx - this.w / 2;
    var t = this.cy - this.h / 2;
    var transform = "translate(" + this.cx + "px," + this.cy + "px) " +
      "rotate(" + this.alpha + "rad) " +
      "scale(" + this.sx + "," + this.sy + ") " +
      "translate(" + -this.cx + "px," + -this.cy + "px) " +
      "translate(" + l + "px," + (t+this.getVerticalOffset()) + "px) ";
    this.textArea.style.transformOrigin = "0 0";
    this.textArea.style.left = "10px";
    this.textArea.style.top = "40px";
    this.textArea.style.width  = logicalWidth+"px";
    this.textArea.style.height = logicalHeight+"px";
    this.textArea.style.transform = transform;
  }

  private updateCaretAndSelection(ordinal:number) {
    var start = this.doc.selection.start,
      end = this.doc.selection.end;

    switch (this.keyboardSelect) {
      case 0:
        start = end = ordinal;
        break;
      case -1:
        start = ordinal;
        break;
      case 1:
        end = ordinal;
        break;
    }

    if (start === end) {
      this.keyboardSelect = 0;
    } else {
      if (start > end) {
        this.keyboardSelect = -this.keyboardSelect;
        var t = end;
        end = start;
        start = t;
      }
    }
    this.focusChar = ordinal;
    this.doc.select(start, end);

    this.keyboardX = this.nextKeyboardX;
  }

  private getOrdinal() {
    var start = this.doc.selection.start, end = this.doc.selection.end;
    return this.keyboardSelect === 1 ? end : start;
  }

  delCharBefore() {
    var start = this.doc.selection.start,
      end = this.doc.selection.end;
    var ordinal = this.getOrdinal();
    if (start === end && start > 0) {
      this.doc.range(start - 1, start).clear();
      this.focusChar = start - 1;
      this.doc.select(this.focusChar, this.focusChar);
      this.updateCaretAndSelection(ordinal - 1);
    }
  }

  delCharAfter() {
    var start = this.doc.selection.start,
        end = this.doc.selection.end,
      length = this.doc.frame.length - 1;
    var ordinal = this.getOrdinal();

    if (start === end && start < length) {
      this.doc.range(start, start + 1).clear();
      this.updateCaretAndSelection(ordinal);
    }
  }

  goDocStart() {
    var ordinal = 0;
    this.updateCaretAndSelection(ordinal);
  }

  goDocEnd() {
    var ordinal = this.doc.frame.length - 1;
    this.updateCaretAndSelection(ordinal);
  }

  goLineStart() {
    var ordinal = this.getOrdinal();
    ordinal = this.doc.endOfLine(ordinal, -1);
    this.updateCaretAndSelection(ordinal);
  }

  goLineEnd() {
    var ordinal = this.getOrdinal();
    ordinal = this.doc.endOfLine(ordinal, 1);
    this.updateCaretAndSelection(ordinal);
  }

  goLineUp() {
    var ordinal = this.getOrdinal();
    var caretX = this.doc.getCaretCoords(ordinal).l;
    ordinal = this.doc.changeLine(ordinal, -1, this.keyboardX);
    this.nextKeyboardX = this.keyboardX ? this.keyboardX : caretX;
    this.updateCaretAndSelection(ordinal);
  }

  goLineDown() {
    var ordinal = this.getOrdinal();
    var caretX = this.doc.getCaretCoords(ordinal).l;
    ordinal = this.doc.changeLine(ordinal, 1, this.keyboardX);
    this.nextKeyboardX = this.keyboardX ? this.keyboardX : caretX;
    this.updateCaretAndSelection(ordinal);
  }

  goCharLeft() {
    var start = this.doc.selection.start,
      end = this.doc.selection.end;
    var ordinal = this.getOrdinal();
    if (!this.keyboardSelect && start != end) {
      ordinal = start;
    }
    if (ordinal > 0) {
      ordinal--;
    }
    this.updateCaretAndSelection(ordinal);
  }

  goCharRight() {
    var start = this.doc.selection.start,
      end = this.doc.selection.end;
    var ordinal = this.getOrdinal();
    if (!this.keyboardSelect && start != end) {
      ordinal = end;
    }
    var length = this.doc.frame.length - 1;
    if (ordinal < length) {
      ordinal++;
    }
    this.updateCaretAndSelection(ordinal);
  }

  goWordLeft() {
    var start = this.doc.selection.start,
      end = this.doc.selection.end;
    var ordinal = this.getOrdinal();
    if (!this.keyboardSelect && start != end) {
      ordinal = start;
    }
    if (ordinal > 0) {
      var wordInfo = this.doc.wordContainingOrdinal(ordinal);
      if (wordInfo.ordinal === ordinal) {
        ordinal = wordInfo.index > 0 ? this.doc.wordOrdinal(wordInfo.index - 1) : 0;
      } else {
        ordinal = wordInfo.ordinal;
      }
      this.updateCaretAndSelection(ordinal);
    }
  }

  goWordRight() {
    var start = this.doc.selection.start,
      end = this.doc.selection.end;
    var ordinal = this.getOrdinal();
    if (!this.keyboardSelect && start != end) {
      ordinal = end;
    }
    var length = this.doc.frame.length - 1;
    if (ordinal < length) {
      var wordInfo = this.doc.wordContainingOrdinal(ordinal);
      ordinal = wordInfo.ordinal + wordInfo.word.length;
      this.updateCaretAndSelection(ordinal);
    }
  }

  selectAll() {
    var length = this.doc.frame.length - 1;
    //handled = true;
    this.doc.select(0, length);
  }

  updateTransform() {
    this.paint();
  }

  getPosition() {
    return { cx : this.cx, cy : this.cy }
  }

  setPosition(x : number, y : number) {
    this.cx = x;
    this.cy = y;
    this.updateTransform();
  }

  getSize() {
    return { w : this.w, h : this.h }
  }

  setSize(w : number, h : number) {
    this.w = w;
    this.h = h;
    this.updateTransform();
  }

  setRotation(alpha : number) {
    this.alpha = alpha;
    this.updateTransform();
  }

  getRotation() {
    return this.alpha;
  }

  setScale(sx : number, sy : number) {
    this.sx = sx;
    this.sy = sy;
    this.updateTransform();
  }

  getScale() {
    return { sx : this.sx, sy : this.sy };
  }
}

setInterval(function () {
  var editors = document.querySelectorAll('.carotaEditorCanvas');

  var ev = document.createEvent('Event');
  ev.initEvent('carotaEditorSharedTimer', true, true);

  // not in IE, apparently:
  // var ev = new CustomEvent('carotaEditorSharedTimer');

  for (var n = 0; n < editors.length; n++) {
    editors[n].dispatchEvent(ev);
  }
}, 200);