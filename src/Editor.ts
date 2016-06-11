import {Dom} from "./Dom";
import {CarotaDoc} from "./Doc";
import {Rect} from "./Rect";
import {Input} from "./Input";
import {Run} from "./Run";
import {Paragraph} from "./Paragraph";

export interface EditorOptions {
  canvas : HTMLCanvasElement;
  x : number;
  y : number;
  w? : number;
  h? : number;
  backgroundColor? : string;
  wrap? : boolean
  bindHandlers? : boolean,
  manageTextArea? : boolean,
  paintSelection? : boolean,
  paintBaselines? : boolean,
  manualRepaint? : boolean
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
  richClipboard:Array<Paragraph>;
  plainClipboard:string;
  toggles:{[n:number]:string};
  verticalAlignment:string;
  nextCaretToggle:number;

  private ox : number;
  private oy : number;
  private w : number;
  private h : number;
  private cx : number;
  private cy : number;
  private sx : number;
  private sy : number;
  private skewX : number;
  private skewY : number;
  private alpha : number;

  private backgroundColor : string;
  private wrap : boolean;
  private manualRepaint : boolean;
  private bindInputHandlers : boolean;
  private manageTextArea : boolean;
  private paintSelection : boolean;
  private paintBaselines : boolean;

  constructor(options:EditorOptions) {

    this.canvas = options.canvas;
    this.canvas.classList.add("carotaEditorCanvas");

    this.cx = options.x;
    this.cy = options.y;
    this.w = typeof options.w == "number" ? options.w : 0;
    this.h = typeof options.h == "number" ? options.h : 0;
    this.ox = 0;
    this.oy = 0;
    this.alpha = 0;
    this.sx = 1.0;
    this.sy = 1.0;
    this.skewX = 0;
    this.skewY = 0;

    this.wrap = typeof options.wrap === "boolean" ? options.wrap : true;
    this.bindInputHandlers = typeof options.bindHandlers === "boolean" ? options.bindHandlers : true;
    this.manageTextArea = typeof options.manageTextArea === "boolean" ? options.manageTextArea : true;
    this.paintSelection = typeof options.paintSelection === "boolean" ? options.paintSelection : true;
    this.paintBaselines = typeof options.paintBaselines === "boolean" ? options.paintBaselines : false;
    this.backgroundColor = typeof options.backgroundColor === "string" ? options.backgroundColor : null;
    this.manualRepaint = typeof options.manualRepaint === "boolean" ? options.manualRepaint : false;

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

    this.doc.setWrap(this.wrap);

    this.doc.selectionChanged.on(({getFormatting:getFormatting, takeFocus:takeFocus}) => {
      if(!this.manualRepaint) this.paint();
      this.input.updateTextArea();
    });

    Dom.handleEvent(this.canvas, 'carotaEditorSharedTimer', ()=> {
      this.update();
    });

    if(!this.manualRepaint) this.paint();
    this.update();
    this.input = new Input(this, this.bindInputHandlers);
  }

  getDoc() {
    return this.doc;
  }

  /**
   * Clone the editor instance.
   * @return {Editor}
   */
  clone():Editor {
    var clone = new Editor({
      canvas : this.canvas,
      x : this.cx,
      y : this.cy,
      w : this.w,
      h : this.h,
      backgroundColor : this.backgroundColor,
      wrap : this.wrap,
      bindHandlers : this.bindInputHandlers,
      manageTextArea : this.manageTextArea,
      paintSelection : this.paintSelection,
      paintBaselines : this.paintBaselines,
      manualRepaint : this.manualRepaint
    });
    clone.setOrigin(this.getOrigin().x, this.getOrigin().y);
    clone.setScale(this.getScale().x, this.getScale().y);
    clone.setRotation(this.getRotation());
    clone.setPosition(this.getPosition().x, this.getPosition().y);
    clone.setSize(this.getSize().w, this.getSize().h);
    clone.setSkew(this.getSkew().skewX, this.getSkew().skewY);
    clone.doc.load(this.doc.save());
    return clone;
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
      if(!this.manualRepaint) this.paint();
    }
  }
  
  /**
   * Get bounds of editor.
   * @param actual
   * @returns {Rect}
   */
  bounds(actual?:boolean) {
    return this.doc.frame.bounds(actual);
  }

  /**
   * Paint editor contents to the assigned canvas element.
   * If a canvas element is passed, the contents will be rendered to this element.
   * @param canvas
   */
  paint(canvas? : HTMLCanvasElement) {

    if (this.doc.frame.width !== this.w || this.doc.frame.height !== this.h) {
      this.doc.frame.setSize(this.w, this.h);
    }

    var bounds = this.bounds();
    var boundsActual = this.bounds(true);
    var anchorX = this.cx - bounds.w * (this.ox+0.5);
    var anchorY = this.cy - bounds.h * (this.oy+0.5);

    if(typeof canvas !== "undefined") {
      var ctx = canvas.getContext("2d");
    } else {
      ctx = this.canvas.getContext('2d');
    }
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();

    ctx.translate(this.cx, this.cy);
    ctx.rotate(this.alpha);
    ctx.transform(1,Math.tan(this.skewX),Math.tan(this.skewY),1,0,0);
    ctx.scale(this.sx, this.sy);
    ctx.translate(-this.cx, - this.cy);
    ctx.translate(anchorX, anchorY);

    if(this.backgroundColor) {
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(bounds.l, bounds.t, bounds.w, bounds.h);
    }

    if(this.manageTextArea) {
      this.updateTextArea(bounds.w, bounds.h);
    }

    this.doc.draw(ctx, bounds);

    if(this.paintBaselines) {
      this.doc.drawBaselines(ctx, bounds);
    }

    if(this.paintSelection) {
      this.doc.drawSelection(ctx, true, boundsActual);
    }

    ctx.restore();
  }

  private updateTextArea(logicalWidth : number, logicalHeight : number) {
    var b = this.bounds();
    var anchorX = this.cx - b.w * (this.ox+0.5);
    var anchorY = this.cy - b.h * (this.oy+0.5);

    var transform = "translate(" + this.cx + "px," + this.cy + "px) " +
      "rotate(" + this.alpha + "rad) " +
      "skewY(" + this.skewY + "rad) " +
      "skewX(" + this.skewX + "rad) " +
      "scale(" + this.sx + "," + this.sy + ") " +
      "translate(" + -this.cx + "px," + -this.cy + "px) " +
      "translate(" + anchorX + "px," + anchorY + "px) ";
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

  /**
   * Delete the character before the caret.
   */
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

  /**
   * Deletes the character after the caret.
   */
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

  /**
   * Moves caret to start of document.
   */
  goDocStart() {
    var ordinal = 0;
    this.updateCaretAndSelection(ordinal);
  }

  /**
   * Moves caret to end of document.
   */
  goDocEnd() {
    var ordinal = this.doc.frame.length - 1;
    this.updateCaretAndSelection(ordinal);
  }

  /**
   * Moves caret to start of line.
   */
  goLineStart() {
    var ordinal = this.getOrdinal();
    ordinal = this.doc.endOfLine(ordinal, -1);
    this.updateCaretAndSelection(ordinal);
  }

  /**
   * Moves caret to end of line.
   */
  goLineEnd() {
    var ordinal = this.getOrdinal();
    ordinal = this.doc.endOfLine(ordinal, 1);
    this.updateCaretAndSelection(ordinal);
  }

  /**
   * Moves caret one line up.
   */
  goLineUp() {
    var ordinal = this.getOrdinal();
    var caretX = this.doc.getCaretCoords(ordinal).l;
    ordinal = this.doc.changeLine(ordinal, -1, this.keyboardX);
    this.nextKeyboardX = this.keyboardX ? this.keyboardX : caretX;
    this.updateCaretAndSelection(ordinal);
  }

  /**
   * Moves caret one line down.
   */
  goLineDown() {
    var ordinal = this.getOrdinal();
    var caretX = this.doc.getCaretCoords(ordinal).l;
    ordinal = this.doc.changeLine(ordinal, 1, this.keyboardX);
    this.nextKeyboardX = this.keyboardX ? this.keyboardX : caretX;
    this.updateCaretAndSelection(ordinal);
  }

  /**
   * Moves caret left one character.
   */
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

  /**
   * Moves caret right one character.
   */
  goCharRight() {
    var start = this.doc.selection.start,
      end = this.doc.selection.end;
    var ordinal = this.getOrdinal();
    if (!this.keyboardSelect && start != end) {
      ordinal = end;
    }
    if (ordinal < this.doc.frame.length) {
      ordinal++;
    }
    this.updateCaretAndSelection(ordinal);
  }

  /**
   * Moves caret left one word.
   */
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

  /**
   * Moves caret right one word.
   */
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

  /**
   * Select whole document.
   */
  selectAll() {
    var length = this.doc.frame.length - 1;
    this.doc.select(0, length);
  }

  /**
   * Select nothing.
   */
  selectNothing() {
    this.doc.select(0, 0);
  }

  /**
   * Get origin for editor frame transformations in normalized object coordinate system.
   * @return {{x: number, y: number}}
   */
  getOrigin() {
    return { x : this.ox, y : this.oy }
  }

  /**
   * Set origin for editor frame transformations in normalized object coordinate system.
   * @param x
   * @param y
   */
  setOrigin(x : number, y : number) {
    this.ox = x;
    this.oy = y;
    if(!this.manualRepaint) this.paint();
  }

  /**
   * Get translation of editor frame in world coordinates.
   * Translation is relative to origin.
   * @return {{x: number, y: number}}
   */
  getPosition() {
    return { x : this.cx, y : this.cy }
  }

  /**
   * Set translation of editor frame in world coordinates.
   * Translation is relative to origin.
   * @return {{x: number, y: number}}
   */
  setPosition(x : number, y : number) {
    this.cx = x;
    this.cy = y;
    if(!this.manualRepaint) this.paint();
  }

  /**
   * Get size of editor frame in world coordinates.
   * @return {{w: number, h: number}}
   */
  getSize() {
    return { w : this.w, h : this.h }
  }

  /**
   * Set size of editor frame in world coordinates.
   * @param w
   * @param h
   */
  setSize(w : number, h : number) {
    this.w = w;
    this.h = h;
    this.doc.frame.setSize(w,h);
    if(!this.manualRepaint) this.paint();
  }

  /**
   * Set rotation of editor frame.
   * @param alpha
   */
  setRotation(alpha : number) {
    this.alpha = alpha;
    if(!this.manualRepaint) this.paint();
  }

  /**
   * Get rotation of editor frame.
   * @return {number}
   */
  getRotation() {
    return this.alpha;
  }

  /**
   * Set scale factor of editor frame.
   * @param sx
   * @param sy
   */
  setScale(sx : number, sy : number) {
    this.sx = sx;
    this.sy = sy;
    if(!this.manualRepaint) this.paint();
  }

  /**
   * Get scale factor of editor frame.
   * @return {{x: number, y: number}}
   */
  getScale() {
    return { x : this.sx, y : this.sy };
  }

  /**
   * Sets the skew in radians.
   * @param skewX
   * @param skewY
   */
  setSkew(skewX:number, skewY:number) {
    this.skewX = skewX;
    this.skewY = skewY;
    if(!this.manualRepaint) this.paint();
  }

  /**
   * Get skew in radians.
   */
  getSkew() {
    return { skewX : this.skewX, skewY : this.skewY };
  }

  getWorldToEditorTransform() {
    var bounds = this.bounds();

    var alpha = this.alpha;
    var ax = this.cx - bounds.w * (this.ox+0.5);
    var ay = this.cy - bounds.h * (this.oy+0.5);
    var sx = this.sx;
    var sy = this.sy;
    var skx = this.skewX;
    var sky = this.skewY;
    var cx = this.cx;
    var cy = this.cy;

    function Sec(alpha:number) {
      return 1/Math.cos(alpha);
    }

    var a:number, b:number, c:number, d:number, e:number, f:number;
    a = (Math.cos(skx)*Math.cos(alpha - sky)*Sec(skx + sky)) / sx;
    b = -(Math.cos(sky)*Sec(skx + sky)*Math.sin(alpha + skx)) / sy;
    c = (Math.cos(skx)*Sec(skx + sky)*Math.sin(alpha - sky)) / sx;
    d = (Math.cos(alpha + skx)*Math.cos(sky)*Sec(skx + sky)) / sy;
    e = ((ax - cx)*sx*Math.cos(skx + sky)*Sec(skx)*Sec(sky) +
    Math.sin(alpha)*(cy + cx*Math.tan(sky)) + Math.cos(alpha)*(cx - cy*Math.tan(sky))) / (sx*(-1 + Math.tan(skx)*Math.tan(sky)));
    f = ((ay - cy)*sy*Math.cos(skx + sky)*Sec(skx)*Sec(sky) +
    Math.cos(alpha)*(cy - cx*Math.tan(skx)) - Math.sin(alpha)*(cx + cy*Math.tan(skx))) / (sy*(-1 + Math.tan(skx)*Math.tan(sky)));
    return [a,b,c,d,e,f];
  }

  /**
   * Returns the editorframe to world transform.
   * @returns {number[]}
   */
  getEditorToWorldTransform() {
    var bounds = this.bounds();

    var alpha = this.alpha;
    var ax = this.cx - bounds.w * (this.ox+0.5);
    var ay = this.cy - bounds.h * (this.oy+0.5);
    var sx = this.sx;
    var sy = this.sy;
    var skx = this.skewX;
    var sky = this.skewY;
    var cx = this.cx;
    var cy = this.cy;

    function Sec(alpha:number) {
      return 1/Math.cos(alpha);
    }

    var a:number, b:number, c:number, d:number, e:number, f:number;
    a = sx*Math.cos(alpha + skx)*Sec(skx);
    b = sx*Sec(skx)*Math.sin(alpha + skx);
    c = -sy*Sec(sky)*Math.sin(alpha - sky);
    d = sy*(Math.cos(alpha) + Math.sin(alpha)*Math.tan(sky));
    e = cx + (ax - cx)*sx*Math.cos(alpha + skx)*Sec(skx) + (-ay + cy)*sy*Sec(
      sky)*Math.sin(alpha - sky);
    f = cy + (ax - cx)*sx*Sec(skx)*Math.sin(
    alpha + skx) + (ay - cy)*sy*(Math.cos(alpha) + Math.sin(alpha)*Math.tan(sky));

    return [a,b,c,d,e,f];
  }

  /**
   * If set to true, baselines are painted.
   * @param value
   */
  setPaintBaselines(value : boolean) {
    this.paintBaselines = value;
    if(!this.manualRepaint) this.paint();
  }

  /**
   *
   * @return {boolean}
   */
  getPaintBaselines() {
    return this.paintBaselines;
  }
}

setInterval(function () {
  var editors = document.querySelectorAll('.carotaEditorCanvas');

  var ev = document.createEvent('Event');
  ev.initEvent('carotaEditorSharedTimer', true, true);

  for (var n = 0; n < editors.length; n++) {
    editors[n].dispatchEvent(ev);
  }
}, 200);