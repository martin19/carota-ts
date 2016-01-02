import {CNode} from "./Node";
import {Per} from "./Per";
import {characters} from "./Characters";
import {Word} from "./Word";
import {Frame} from "./Frame";
import {Split} from "./Split";
import {LiteEvent} from "./LiteEvent";
import {Range} from "./Range";
import {Codes} from "./Codes";
import {Rect} from "./Rect";
import {ICode} from "./Part";
import {IRange} from "./Range";
import {PositionedWord} from "./Positionedword";
import {PositionedChar} from "./Positionedword";
import {IFormatting} from "./Run";
import {Part} from "./Part";
import {ICoords} from "./Word";
import {Character} from "./Characters";
import {Run} from "./Run";
import {IFormattingMap} from "./Run";
import {Line} from "./Line";

export interface ISelection {
  start : number;
  end : number;
}

var makeEditCommand = function(doc:CarotaDoc, start:number, count:number, words:Array<Word>) {
  var selStart = doc.selection.start, selEnd = doc.selection.end;
  return function(log:(f1:(f2:()=>void)=>void)=>void) {
    doc._wordOrdinals = [];

    //var oldWords = Array.prototype.splice.apply(doc.words, [start, count].concat(words));
    var oldWords = doc.words.splice(start,count);
    doc.words = doc.words.slice(0,start).concat(words).concat(doc.words.slice(start));

    log(makeEditCommand(doc, start, words.length, oldWords));
    doc._nextSelection = { start: selStart, end: selEnd };
  };
};

var makeTransaction = function(perform:(f1:(f2:()=>void)=>void)=>void) {
  var commands:Array<(f1:()=>void)=>void> = [];

  var log = function(command:()=>void) {
    commands.push(command);
    log.length = commands.length;
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
  var code = word.code();
  return !!(code && (code.block || code.eof));
};

export class CarotaDoc extends CNode {
  type : string;
  _width : number;
  selection : ISelection;
  _nextSelection : ISelection;
  caretVisible : boolean;
  customCodes:(code:string, data:any, allCodes:(code:string, data?:any)=>void)=>void;
  codes:(code:string, data?:any)=>ICode;
  selectionChanged : LiteEvent<any>;
  contentChanged : LiteEvent<any>;
  editFilters:Array<(doc:CarotaDoc)=>void>;
  undo : Array<(f1:(f2:()=>void)=>void)=>void>;
  redo : Array<(f1:(f2:()=>void)=>void)=>void>;
  words : Array<Word>;
  _wordOrdinals:Array<number>;
  frame : Frame;
  nextInsertFormatting:{[s:string]:string|boolean|number};
  selectionJustChanged:boolean;
  _filtersRunning:number;
  _currentTransaction:(f1:(f2:()=>void)=>void)=>void;
  sendKey:(key:number, selecting:boolean, ctrlKey:boolean)=>void;

  constructor() {
    super();
    var self = this;
    this.type = 'document';
    this._width = 0;
    this.selection = { start: 0, end: 0 };
    this.caretVisible = true;
    this.customCodes = function(code:string, data:any, allCodes:(code:string, data?:any)=>void) {};
    this.codes = function(code:string, data?:any) {
      var instance = new Codes(code, data, this.codes);
      return instance || this.customCodes(code, data, this.codes);
    };
    this.selectionChanged = new LiteEvent<any>();
    this.contentChanged = new LiteEvent<any>();
    this.editFilters = [Codes.editFilter];
    this.load([]);
  }

  load(runs:Array<Run>, takeFocus?:boolean) {
    var self = this;
    this.undo = [];
    this.redo = [];
    this._wordOrdinals = [];
    this.words = new Per(characters(runs)).per(Split(self.codes)).map(function (w:ICoords) {
      return new Word(w, self.codes);
    }).all();
    this.layout();
    this.contentChanged.trigger();
    this.select(0, 0, takeFocus);
  }

  layout() {
    this.frame = null;
    try {
      this.frame = new Per(this.words).per(Frame.wrap(0, 0, this._width, 0, this)).first();
    } catch (x) {
      console.error(x);
    }
    if (!this.frame) {
      console.error('A bug somewhere has produced an invalid state - rolling back');
      this.performUndo();
    } else if (this._nextSelection) {
      var next = this._nextSelection;
      //delete this._nextSelection;
      this.select(next.start, next.end);
    }
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

  paragraphRange(start:number, end:number) {
    var i:number;

    // find the character after the nearest breaker before start
    var startInfo = this.wordContainingOrdinal(start);
    start = 0;
    if (startInfo && !isBreaker(startInfo.word)) {
      for (i = startInfo.index; i > 0; i--) {
        if (isBreaker(this.words[i - 1])) {
          start = this.wordOrdinal(i);
          break;
        }
      }
    }

    // find the nearest breaker after end
    var endInfo = this.wordContainingOrdinal(end);
    end = this.frame.length - 1;
    if (endInfo && !isBreaker(endInfo.word)) {
      for (i = endInfo.index; i < this.words.length; i++) {
        if (isBreaker(this.words[i])) {
          end = this.wordOrdinal(i);
          break;
        }
      }
    }

    return this.range(start, end);
  }

  insert(text:string|Array<Run>, takeFocus?:boolean) {
    this.select(this.selection.end + this.selectedRange().setText(text), null, takeFocus);
  }

  modifyInsertFormatting(attribute:string, value:string|boolean) {
    this.nextInsertFormatting[attribute] = value;
    this.notifySelectionChanged();
  }

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
   *
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

  runs(emit:(p:Run)=>void, range:IRange) {
    var startDetails = this.wordContainingOrdinal(Math.max(0, range.start)),
      endDetails = this.wordContainingOrdinal(Math.min(range.end, this.frame.length - 1));
    if (startDetails.index === endDetails.index) {
      startDetails.word.runs(emit, {
        start: startDetails.offset,
        end: endDetails.offset
      });
    } else {
      startDetails.word.runs(emit, {start: startDetails.offset});
      for (var n = startDetails.index + 1; n < endDetails.index; n++) {
        this.words[n].runs(emit);
      }
      endDetails.word.runs(emit, {end: endDetails.offset});
    }
  }

  spliceWordsWithRuns(wordIndex:number, count:number, runs:Array<Run>) {
    var self = this;

    var newWords = new Per(characters(runs))
      .per(Split(self.codes))
      .truthy()
      .map(function (w:ICoords) {
        return new Word(w, self.codes);
      })
      .all();

    // Check if old or new content contains any fancy control codes:
    var runFilters = false;

    if ('_filtersRunning' in self) {
      self._filtersRunning++;
    } else {
      for (var n = 0; n < count; n++) {
        if (this.words[wordIndex + n].code()) {
          runFilters = true;
        }
      }
      if (!runFilters) {
        runFilters = newWords.some(function (word:Word) {
          return !!word.code();
        });
      }
    }

    this.transaction(function (log) {
      makeEditCommand(self, wordIndex, count, newWords)(log);
      if (runFilters) {
        self._filtersRunning = 0;
        try {
          for (; ;) {
            var spliceCount = self._filtersRunning;
            if (!self.editFilters.some(function (filter) {
                filter(self);
                return spliceCount !== self._filtersRunning;
              })) {
              break; // No further changes were made
            }
          }
        } finally {
          delete self._filtersRunning;
        }
      }
    });
  }

  splice(start:number, end:number, text:string|Array<Run>) {
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

    } else if (!Array.isArray(text)) {
      text_ = [new Run(text,{})];
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

  registerEditFilter(filter:(doc:CarotaDoc)=>void) {
    this.editFilters.push(filter);
  }

  width(width?:number) {
    if (arguments.length === 0) {
      return this._width;
    }
    this._width = width;
    this.layout();
  }

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
    ctx.strokeStyle = "black";
    this.frame.lines.forEach((line:Line)=>{
      var b = line.bounds(true);
      if(viewport.contains(line.left,line.baseline) && viewport.contains(line.left+line.width, line.baseline)) {
        ctx.beginPath();
        ctx.moveTo(b.l, line.baseline);
        ctx.lineTo(b.r, line.baseline);
        ctx.stroke();
      }
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
    var cachedFormatting:IFormatting = null;
    var self = this;
    var getFormatting = function () {
      if (!cachedFormatting) {
        cachedFormatting = self.selectedRange().getFormatting();
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
          changed = log.length > 0;
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
}