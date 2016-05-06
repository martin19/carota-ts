import {CNode} from "./Node";
import {Per} from "./Per";
import {characters} from "./Characters";
import {Word} from "./Word";
import {Frame} from "./Frame";
import {Split} from "./Split";
import {LiteEvent} from "./LiteEvent";
import {Range} from "./Range";
import {Rect} from "./Rect";
import {IRange} from "./Range";
import {ICharacterFormatting} from "./Run";
import {ICoords} from "./Word";
import {Run} from "./Run";
import {IFormattingMap} from "./RunBase";
import {PositionedChar} from "./PositionedChar";
import {PositionedParagraph} from "./PositionedParagraph";

export interface ISelection {
  start : number;
  end : number;
}

var makeEditCommand = function(doc:CarotaDoc, start:number, count:number, words:Array<Word>) {
  var selStart = doc.selection.start, selEnd = doc.selection.end;
  return function(log:(f1:(f2:()=>void)=>void)=>void) {
    doc._wordOrdinals = [];

    var oldWords = doc.words.splice(start,count);
    doc.words = doc.words.slice(0,start).concat(words).concat(doc.words.slice(start));

    log(makeEditCommand(doc, start, words.length, oldWords));
    doc._nextSelection = { start: selStart, end: selEnd };
  };
};

interface logFunction {
  ():any;
  len:number;
}

var makeTransaction = function(perform:(f1:(f2:()=>void)=>void)=>void) {
  var commands:Array<(f1:()=>void)=>void> = [];


  var log:logFunction = <logFunction>function(command:()=>void) {
    commands.push(command);
    log.len = commands.length;
  };

  perform(log);

  return function(outerLog:(f1:(f2:()=>void)=>void)=>void) {
    outerLog(makeTransaction(function(innerLog:()=>void) {
      while (commands.length) {
        commands.pop()(innerLog);
      }
    }));
  };
};

var isBreaker = function(word:Word) {
  if (word.isNewLine()) {
    return true;
  }
};

export class CarotaDoc extends CNode {
  type : string;
  _width : number;
  selection : ISelection;
  _nextSelection : ISelection;
  caretVisible : boolean;
  selectionChanged : LiteEvent<any>;
  contentChanged : LiteEvent<any>;
  undo : Array<(f1:(f2:()=>void)=>void)=>void>;
  redo : Array<(f1:(f2:()=>void)=>void)=>void>;
  words : Array<Word>;
  _wordOrdinals:Array<number>;
  frame : Frame;
  nextInsertFormatting:{[s:string]:string|boolean|number};
  selectionJustChanged:boolean;
  _currentTransaction:(f1:(f2:()=>void)=>void)=>void;
  sendKey:(key:number, selecting:boolean, ctrlKey:boolean)=>void;
  wrap : boolean;

  constructor() {
    super();
    this.type = 'document';
    this._left = 0;
    this._top = 0;
    this._width = 0;
    this.selection = { start: 0, end: 0 };
    this.caretVisible = true;
    this.selectionChanged = new LiteEvent<any>();
    this.contentChanged = new LiteEvent<any>();
    this.wrap = true;
    this.load([]);
  }

  load(runs:Array<Run>, takeFocus?:boolean) {
    var self = this;
    this.undo = [];
    this.redo = [];
    this._wordOrdinals = [];
    this.words = new Per(characters(runs)).per(Split()).map(function (w:ICoords) {
      return new Word(w);
    }).all();
    this.layout();
    this.contentChanged.trigger();
    this.select(0, 0, takeFocus);
  }

  layout() {
    this.frame = null;
    try {
      if(this.wrap) {
        this.frame = new Per(this.words).per(Frame.layout(0, 0, this._width, 0, this)).first();
      } else {
        //this.frame = new Per(this.words).per(Frame.noWrap(0, 0, 0, this)).first();
      }
    } catch (x) {
      console.error(x);
    }
    if (!this.frame) {
      console.error('A bug somewhere has produced an invalid state - rolling back');
      this.performUndo();
    } /*
      TODO: what is this used for? causes an error when deleting the last character
      else if (this._nextSelection) {
      var next = this._nextSelection;
      this._nextSelection = null;
      this.select(next.start, next.end);
    }*/
  }

  range(start:number, end:number) {
    return new Range(this, start, end);
  }

  documentRange() {
    return this.range(0, this.frame.length - 1);
  }

  selectedRange() {
    return this.range(this.selection.start, this.selection.end);
  }

  save() {
    return this.documentRange().save();
  }

  /**
   * Insert/Replace selection with new text (string or Array of runs.)
   * @param text
   * @param takeFocus
   */
  insert(text:string|Array<Run>, takeFocus?:boolean) {
    this.select(this.selection.end + this.selectedRange().setText(text), null, takeFocus);
  }

  /**
   * Change insert formatting that will be applied to newly inserted text.
   * @param attribute - the formatting attribute to set.
   * @param value - the value to set the attribute to.
   */
  modifyInsertFormatting(attribute:string, value:string|boolean) {
    this.nextInsertFormatting[attribute] = value;
    this.notifySelectionChanged();
  }

  /**
   * Applies the insertFormatting to an array of runs.
   * @param text
   */
  applyInsertFormatting(text:Array<Run>) {
    var formatting = this.nextInsertFormatting;
    var insertFormattingProperties = Object.keys(formatting);
    if (insertFormattingProperties.length) {
      text.forEach(function (run:Run) {
        insertFormattingProperties.forEach(function (property) {
          (<IFormattingMap>run.formatting)[property] = formatting[property];
        });
      });
    }
  }

  /**
   * Returns the ordinal number (first character) of word with index "index".
   * @param index
   * @returns {number}
   */
  wordOrdinal(index:number) {
    if (index < this.words.length) {
      var cached = this._wordOrdinals.length;
      if (cached < (index + 1)) {
        var o = cached > 0 ? this._wordOrdinals[cached - 1] : 0;
        for (var n = cached; n <= index; n++) {
          this._wordOrdinals[n] = o;
          o += this.words[n].length;
        }
      }
      return this._wordOrdinals[index];
    }
  }

  /**
   * Returns an object containing the word that contains the character with ordinal number "ordinal".
   * @param ordinal
   * @return {{word: Word, ordinal: number, index: number, offset: number}}
   */
  wordContainingOrdinal(ordinal:number) {
    // could rewrite to be faster using binary search over this.wordOrdinal
    var result : {
      word : Word;
      ordinal : number;
      index: number;
      offset : number;
    };
    var pos = 0;
    this.words.some(function (word:Word, i:number) {
      if (ordinal >= pos && ordinal < (pos + word.length)) {
        result = {
          word: word,
          ordinal: pos,
          index: i,
          offset: ordinal - pos
        };
        return true;
      }
      pos += word.length;
    });
    return result;
  }

  /**
   * Emits this document's runs within a given Range (or the complete document if no Range is given.)
   * @param emit
   * @param range
   */
  runs(emit:(p:Run)=>void, range:IRange) {
    var start = this.wordContainingOrdinal(Math.max(0, range.start)),
      end = this.wordContainingOrdinal(Math.min(range.end, this.frame.length - 1));
    if (start.index === end.index) {
      start.word.runs(emit, {
        start: start.offset,
        end: end.offset
      });
    } else {
      start.word.runs(emit, {start: start.offset});
      for (var n = start.index + 1; n < end.index; n++) {
        this.words[n].runs(emit);
      }
      end.word.runs(emit, {end: end.offset});
    }
  }

  /**
   * Splice/connect/glue given a start word by index, count of words, and an Array of runs. 
   * Creates an array of new Words.
   * @param wordIndex
   * @param count
   * @param runs
   */
  spliceWordsWithRuns(wordIndex:number, count:number, runs:Array<Run>) {
    var self = this;

    var newWords = new Per(characters(runs))
      .per(Split())
      .truthy()
      .map(function (w:ICoords) {
        return new Word(w);
      })
      .all();

    this.transaction(function (log) {
      makeEditCommand(self, wordIndex, count, newWords)(log);
    });
  }

  /**
   * Splice/connect/glue a range of characters with a string/Array of runs
   * @param start
   * @param end
   * @param text
   * @returns {number}
   */
  splice(start:number, end:number, text:Array<Run>|string) {
    var text_:Array<Run>;
    if (typeof text === 'string') {
      var sample = Math.max(0, start - 1);
      var sampleRun = new Per<IRange>({start: sample, end: sample + 1})
        .per(this.runs, this)
        .first();
      text_ = [];
      if(sampleRun) {
        var run = sampleRun.clone();
        run.text = text;
        text_.push(run);
      } else {
        text_.push(new Run(text,{}));
      }
    } else {
      text_ = text;
    }

    this.applyInsertFormatting(text_);

    var startWord = this.wordContainingOrdinal(start),
      endWord = this.wordContainingOrdinal(end);

    var prefix:Array<Run>;
    if (start === startWord.ordinal) {
      if (startWord.index > 0 && !isBreaker(this.words[startWord.index - 1])) {
        startWord.index--;
        var previousWord = this.words[startWord.index];
        prefix = new Per({}).per(previousWord.runs, previousWord).all();
      } else {
        prefix = [];
      }
    } else {
      prefix = new Per({end: startWord.offset})
        .per(startWord.word.runs, startWord.word)
        .all();
    }

    var suffix:Array<Run>;
    if (end === endWord.ordinal) {
      if ((end === this.frame.length - 1) || isBreaker(endWord.word)) {
        suffix = [];
        endWord.index--;
      } else {
        suffix = new Per({}).per(endWord.word.runs, endWord.word).all();
      }
    } else {
      suffix = new Per({start: endWord.offset})
        .per(endWord.word.runs, endWord.word)
        .all();
    }

    var oldLength = this.frame.length;

    this.spliceWordsWithRuns(startWord.index, (endWord.index - startWord.index) + 1,
      new Per(prefix).concat(text_).concat(suffix).per(Run.consolidate()).all());

    return this.frame ? (this.frame.length - oldLength) : 0;
  }

  /**
   * Gets/sets the current width of the document.
   * @param width
   * @returns {number}
   */
  width(width?:number) {
    if (arguments.length === 0) {
      return this._width;
    }
    this._width = width;
    this.layout();
  }

  /**
   * Returns the child (frame) of the document.
   * @returns {Frame[]}
   */
  children() {
    return [this.frame];
  }

  toggleCaret() {
    var old = this.caretVisible;
    if (this.selection.start === this.selection.end) {
      if (this.selectionJustChanged) {
        this.selectionJustChanged = false;
      } else {
        this.caretVisible = !this.caretVisible;
      }
    }
    return this.caretVisible !== old;
  }

  getCaretCoords(ordinal:number):Rect {
    var node = this.byOrdinal(ordinal), b:Rect;
    if (node) {
      if (node.block && ordinal > 0) {
        var nodeBefore = this.byOrdinal(ordinal - 1);
        //if (nodeBefore.newLine) {
        if (nodeBefore instanceof PositionedChar) {
          var newLineBounds = nodeBefore.bounds();
          var lineBounds = nodeBefore.parent().parent().bounds();
          b = new Rect(lineBounds.l, lineBounds.b, 1, newLineBounds.h);
        } else {
          b = nodeBefore.bounds();
          b = new Rect(b.r, b.t, 1, b.h);
        }
      } else {
        b = node.bounds();
        if (b.h) {
          b = new Rect(b.l, b.t, 1, b.h);
        } else {
          b = new Rect(b.l, b.t, b.w, 1);
        }
      }
      return b;
    }
  }

  byCoordinate(x:number, y:number) {
    var ordinal = this.frame.byCoordinate(x, y).ordinal;
    var caret = this.getCaretCoords(ordinal);
    while (caret.b <= y && ordinal < (this.frame.length - 1)) {
      ordinal++;
      caret = this.getCaretCoords(ordinal);
    }
    while (caret.t >= y && ordinal > 0) {
      ordinal--;
      caret = this.getCaretCoords(ordinal);
    }
    return this.byOrdinal(ordinal);
  }

  drawBaselines(ctx:CanvasRenderingContext2D, viewport:Rect) {
    this.frame.paragraphs.forEach((p:PositionedParagraph)=>{
      p.drawBaselines(ctx, viewport);  
    });
  }
  
  drawSelection(ctx:CanvasRenderingContext2D, hasFocus:boolean, viewport:Rect) {
    if (this.selection.end === this.selection.start) {
      if (this.selectionJustChanged || hasFocus && this.caretVisible) {
        var caret = this.getCaretCoords(this.selection.start);
        if (caret && viewport.contains(caret.l, caret.t) && viewport.contains(caret.r, caret.b)) {
          ctx.save();
          ctx.fillStyle = 'black';
          caret.fill(ctx);
          ctx.restore();
        }
      }
    } else {
      ctx.save();
      ctx.fillStyle = hasFocus ? 'rgba(0, 100, 200, 0.3)' : 'rgba(160, 160, 160, 0.3)';
      this.selectedRange().parts(function (part:CNode) {
        var b = part.bounds();
        if(viewport.contains(b.l,b.t) && viewport.contains(b.r,b.b)) {
          part.bounds().fill(ctx);
        }
      }.bind(this));
      ctx.restore();
    }
  }

  notifySelectionChanged(takeFocus?:boolean) {
    // When firing selectionChanged, we pass a function can be used
    // to obtain the formatting, as this highly likely to be needed
    var cachedFormatting:ICharacterFormatting = null;
    var self = this;
    var getFormatting = function () {
      if (!cachedFormatting) {
        cachedFormatting = self.selectedRange().getCharacterFormatting();
      }
      return cachedFormatting;
    };
    this.selectionChanged.trigger({ getFormatting: getFormatting, takeFocus:takeFocus});
  }

  select(ordinal:number, ordinalEnd:number, takeFocus?:boolean) {
    if (!this.frame) {
      // Something has gone terribly wrong - doc.transaction will rollback soon
      return;
    }
    this.selection.start = Math.max(0, ordinal);
    this.selection.end = Math.min(
      typeof ordinalEnd === 'number' ? ordinalEnd : this.selection.start,
      this.frame.length - 1
    );
    this.selectionJustChanged = true;
    this.caretVisible = true;
    this.nextInsertFormatting = {};

    /*  NB. always fire this even if the positions stayed the same. The
     event means that the formatting of the selection has changed
     (which can happen either by moving the selection range or by
     altering the formatting)
     */
    this.notifySelectionChanged(takeFocus);
  }

  performUndo(redo?:boolean) {
    var fromStack = redo ? this.redo : this.undo,
      toStack = redo ? this.undo : this.redo,
      oldCommand = fromStack.pop();

    if (oldCommand) {
      oldCommand(function (newCommand) {
        toStack.push(newCommand);
      });
      this.layout();
      this.contentChanged.trigger();
    }
  }

  canUndo(redo?:boolean) {
    return redo ? !!this.redo.length : !!this.undo.length;
  }

  transaction(perform:(f1:(f2:()=>void)=>void)=>void) {
    if (this._currentTransaction) {
      perform(this._currentTransaction);
    } else {
      var self = this;
      while (this.undo.length > 50) {
        self.undo.shift();
      }
      this.redo.length = 0;
      var changed = false;
      this.undo.push(makeTransaction(function (log:(f1:(f2:()=>void)=>void)=>void) {
        self._currentTransaction = log;
        try {
          perform(log);
        } finally {
          changed = (<logFunction>log).len > 0;
          self._currentTransaction = null;
        }
      }));
      if (changed) {
        self.layout();
        self.contentChanged.trigger();
      }
    }
  }

  exhausted(ordinal:number, direction:number) {
    return direction < 0 ? ordinal <= 0 : ordinal >= this.frame.length - 1;
  }

  /**
   * Returns true if caret1 is on a different line than caret2.
   * @param caret1
   * @param caret2
   * @return {boolean}
   */
  differentLine(caret1:Rect, caret2:Rect) {
    return (caret1.b <= caret2.t) || (caret2.b <= caret1.t);
  }

  /**
   * Changes the line of the caret.
   * @param ordinal
   * @param direction
   * @param desiredX x position of caret
   * @return {number}
   */
  changeLine(ordinal:number, direction:number, desiredX? : number) {

    var originalCaret = this.getCaretCoords(ordinal), newCaret:Rect;
    var keyboardX = desiredX ? desiredX : originalCaret.l;

    while (!this.exhausted(ordinal, direction)) {
      ordinal += direction;
      newCaret = this.getCaretCoords(ordinal);
      if (this.differentLine(newCaret, originalCaret)) {
        break;
      }
    }

    originalCaret = newCaret;
    while (!this.exhausted(ordinal, direction)) {
      //if ((direction > 0 && newCaret.l >= this.nextKeyboardX) || (direction < 0 && newCaret.l <= this.nextKeyboardX)) {
      if ((direction > 0 && newCaret.l >= keyboardX) || (direction < 0 && newCaret.l <= keyboardX)) {
        break;
      }

      ordinal += direction;
      newCaret = this.getCaretCoords(ordinal);
      if (this.differentLine(newCaret, originalCaret)) {
        ordinal -= direction;
        break;
      }
    }

    return ordinal;
  }

  /**
   *
   * @param ordinal
   * @param direction
   * @return {number}
   */
  endOfLine(ordinal:number, direction:number) {
    var originalCaret = this.getCaretCoords(ordinal), newCaret:Rect;
    while (!this.exhausted(ordinal, direction)) {
      ordinal += direction;
      newCaret = this.getCaretCoords(ordinal);
      if (this.differentLine(newCaret, originalCaret)) {
        ordinal -= direction;
        break;
      }
    }
    return ordinal;
  }

  //TODO
  setVerticalAlignment(va:any){}

  /**
   * Turns on/off wrapping lines at frame boundaries.
   * @param wrap
   */
  setWrap(wrap : boolean) {
    this.wrap = wrap;
    this.layout();
  }
}