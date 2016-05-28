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
import {IFormattingMap} from "./Run";
import {PositionedChar} from "./PositionedChar";
import {PositionedParagraph} from "./PositionedParagraph";
import {Paragraph} from "./Paragraph";
import {Part} from "./Part";

export interface IDocumentSettings {
  SuperscriptSize: number;
  SuperscriptPosition: number;
  SubscriptSize: number;
  SubscriptPosition: number;
  SmallCapSize: number;
}

export interface ISelection {
  start : number;
  end : number;
}

interface IWordPointer {
  /**
   * The word pointed to.
   */
  word : Word;
  /**
   * The ordinal value of the start of the word.
   */
  ordinal : number;
  /**
   * The index of the word in the words array.
   */
  index: number;
  /**
   * The offset into the word.
   */
  offset : number;
}

interface IParagraphPointer {
  /**
   * The paragraph pointed to.
   */
  paragraph : Paragraph;
  /**
   * The ordinal number of the start of the paragraph.
   */
  ordinal : number;
  /**
   * The index of the paragraph in the paragraphs_ array.
   */
  index: number;
  /**
   * The offset into the paragraph.
   */
  offset : number;
}

var makeEditCommand = function(doc:CarotaDoc, startWord:number, wordCount:number, words:Array<Word>,
  startParagraph : number, paragraphCount:number, paragraphs:Array<Paragraph>) {
  var selStart = doc.selection.start, selEnd = doc.selection.end;
  return function(log:(f1:(f2:()=>void)=>void)=>void) {
    doc._wordOrdinals = [];
    doc._paragraphOrdinals = [];

    var oldParagraphs = doc._paragraphs.splice(startParagraph, paragraphCount);
    doc._paragraphs = doc._paragraphs.slice(0,startParagraph).concat(paragraphs).concat(doc._paragraphs.slice(startParagraph));
    
    var oldWords = doc.words.splice(startWord,wordCount);
    doc.words = doc.words.slice(0,startWord).concat(words).concat(doc.words.slice(startWord));

    //All runs in words in new paragraphs must reference the new paragraphs.
    paragraphs.forEach((p:Paragraph, i : number)=>{
      var paragraphStart = doc.paragraphOrdinal(startParagraph + i);
      var paragraphEnd = paragraphStart + p.length - 1;
      var startWord = doc.wordContainingOrdinal(paragraphStart);
      var endWord = doc.wordContainingOrdinal(paragraphEnd);
      for(var i = startWord.index; i <= endWord.index; i++) {
        var word = doc.words[i];
        word.text.parts.forEach((part:Part)=>{ part.run.parent = p; });
        word.space.parts.forEach((part:Part)=>{ part.run.parent = p; });
      }
    });

    log(makeEditCommand(doc, startWord, words.length, oldWords, startParagraph, paragraphs.length, oldParagraphs));
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
  selection : ISelection;
  _nextSelection : ISelection;
  caretVisible : boolean;
  selectionChanged : LiteEvent<any>;
  contentChanged : LiteEvent<any>;
  undo : Array<(f1:(f2:()=>void)=>void)=>void>;
  redo : Array<(f1:(f2:()=>void)=>void)=>void>;
  words : Array<Word>;
  _paragraphs : Array<Paragraph>;
  /**
   * Cache for word ordinal numbers
   */
  _wordOrdinals:Array<number>;
  /**
   * Cache for paragraph ordinal numbers
   */
  _paragraphOrdinals:Array<number>;
  frame : Frame;
  nextInsertFormatting:{[s:string]:string|boolean|number};
  selectionJustChanged:boolean;
  _currentTransaction:(f1:(f2:()=>void)=>void)=>void;
  sendKey:(key:number, selecting:boolean, ctrlKey:boolean)=>void;
  wrap : boolean;

  static settings: IDocumentSettings = {
    SmallCapSize : 0.7,
    SuperscriptSize : 0.583,
    SuperscriptPosition : 0.333,
    SubscriptSize : 0.583,
    SubscriptPosition : 0.333
  };

  constructor() {
    super();
    this.type = 'document';
    this.selection = { start: 0, end: 0 };
    this.caretVisible = true;
    this.selectionChanged = new LiteEvent<any>();
    this.contentChanged = new LiteEvent<any>();
    this.wrap = true;
    this.load([]);
  }

  load(paragraphs:Array<Paragraph>, takeFocus?:boolean) {
    var self = this;
    this.undo = [];
    this.redo = [];
    this._wordOrdinals = [];
    this._paragraphOrdinals = [];

    if(!paragraphs.length) {
      var p = new Paragraph();
      p.addRun(new Run("\n",{},p));
      paragraphs = [p];
    }

    this._paragraphs = paragraphs;
    var runs = new Per(paragraphs).per(Paragraph.runs).all();
    this.words = new Per(characters(runs)).per(Split()).map(function (w:ICoords) {
      return new Word(w);
    }).all();
    this.layout();
    this.contentChanged.trigger();
    this.select(0, 0, takeFocus);
  }

  layout() {
    this.frame = new Frame(this, 0);
    try {
      this.frame.layout();
    } catch (x) {
      console.error(x);
    }
    if (!this.frame) {
      console.error('A bug somewhere has produced an invalid state - rolling back');
      this.performUndo();
    } else if (this._nextSelection) {
      var next = this._nextSelection;
      this._nextSelection = null;
      this.select(next.start, next.end);
    }
  }

  range(start:number, end:number) {
    return new Range(this, start, end);
  }

  documentRange() {
    return this.range(0, this.frame.length);
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
  insert(text:string|Array<Paragraph>, takeFocus?:boolean) {
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
   * Returns the ordinal number (first character) of word with index
   * @param index
   * @returns {number}
   */
  wordOrdinal(index:number) {
    if (index < this.words.length) {
      var cached = this._wordOrdinals.length;
      if (cached < (index + 1)) {
        var o = cached > 0 ? this._wordOrdinals[cached - 1] + this.words[cached-1].length: 0;
        for (var n = cached; n <= index; n++) {
          this._wordOrdinals[n] = o;
          o += this.words[n].length;
        }
      }
      return this._wordOrdinals[index];
    }
  }

  /**
   * Returns the ordinal number (first character) of paragraph with index 
   * @param index
   */
  paragraphOrdinal(index:number) {
    if(index < this._paragraphs.length) {
      var cached = this._paragraphOrdinals.length;
      if(cached < (index + 1)) {
        var o = cached > 0 ? this._paragraphOrdinals[cached -1] + this._paragraphs[cached-1].length: 0;
        for(var n = cached; n <= index; n++) {
          this._paragraphOrdinals[n] = o;
          o += this._paragraphs[n].length;
        }
      }
      return this._paragraphOrdinals[index];
    }  
  }

  /**
   * Returns an object containing the word that contains the character with ordinal number "ordinal".
   * @param ordinal
   * @return {{word: Word, ordinal: number, index: number, offset: number}}
   */
  wordContainingOrdinal(ordinal:number) {
    // could rewrite to be faster using binary search over this.wordOrdinal
    var result : IWordPointer;
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
   * Returns a paragraph containing the word that contains the character with ordinal number "ordinal".
   * @param ordinal
   * @returns {Paragraph}
   */
  paragraphContainingOrdinal(ordinal:number) {
    var result : IParagraphPointer;

    //compute ordinal, index and offset
    var pos = 0;
    this._paragraphs.some((p:Paragraph, i : number)=>{
      if(ordinal >= pos && ordinal < (pos + p.length)) {
        result = {
          paragraph : p,
          ordinal : pos,
          index : i,
          offset: ordinal - pos
        };
        return true;
      }
      pos += p.length;
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
   * Emits this document's paragraphs within a given range (or the complete document if no Range is given.)
   * @param emit
   * @param range
   */
  paragraphs(emit:(p:Paragraph)=>void, range:IRange) {
    var start = this.paragraphContainingOrdinal(Math.max(0, range.start)),
      end = this.paragraphContainingOrdinal(Math.min(range.end-1, this.frame.length - 1));

    if (start.index === end.index) {
      emit(start.paragraph.partialParagraph({ start : start.offset, end : end.offset + 1}));
    } else {
      emit(start.paragraph.partialParagraph({ start : start.offset}));
      for (var n = start.index + 1; n < end.index; n++) { emit(this._paragraphs[n]); }
      emit(end.paragraph.partialParagraph({ end : end.offset + 1}));
    }
  }

  /**
   * Splice/connect/glue given a start word by index, wordCount of words, and an Array of runs.
   * @param wordIndex
   * @param wordCount
   * @param runs
   * @param paragraphIndex
   * @param paragraphCount
   * @param paragraphs
   */
  spliceWordsWithRuns(wordIndex:number, wordCount:number, runs:Array<Run>,
    paragraphIndex:number, paragraphCount:number, newParagraphs:Array<Paragraph>) {
    var self = this;

    var newWords = new Per(characters(runs))
      .per(Split())
      .truthy()
      .map(function (w:ICoords) {
        return new Word(w);
      })
      .all();

    this.transaction(function (log) {
      makeEditCommand(self, wordIndex, wordCount, newWords, paragraphIndex, paragraphCount, newParagraphs)(log);
    });
  }

  /**
   * Splice/connect/glue a range of characters with a string/Array of Paragraphs
   * @param start - start ordinal of range to splice
   * @param end - end ordinal of range to splice
   * @param text - text to splice
   * @returns {number}
   */
  splice(start:number, end:number, text:Array<Paragraph>|string) {
    var text_:Array<Paragraph>;
    if (typeof text === 'string') {
      //If plaintext is entered, try to create a sampleRun by cloning the first run after "start"
      var sample = Math.max(0, start - 1);
      var sampleRun = new Per({start: sample, end: sample + 1}).per(this.runs, this).first();
      text_ = [];
      if(!sampleRun) {
        //If sampleRun could not be created, create a run with empty formatting.
        sampleRun = new Run(text, {}, null)
      }
      if (sampleRun) {
        var paragraphText = text.split("\n");
        paragraphText.forEach((t:string, i : number)=>{
          var run = sampleRun.clone();
          run.text = t + ((i != paragraphText.length-1) ? "\n" : "");
          var p = new Paragraph();
          p.addRun(run);
          text_.push(p)
        });
      }

      //get this paragraphs formatting
      var paragraphFormatting = this.paragraphContainingOrdinal(start).paragraph.formatting;

      //apply insert formatting
      text_.forEach((p:Paragraph)=>{
        p.formatRuns(this.nextInsertFormatting);
        p.formatting = Paragraph.cloneFormatting(paragraphFormatting);
      });
    } else {
      //If rich-text is entered, set text to the entered rich-text content.
      text_ = text;
    }
    var textLength_ = 0;
    text_.forEach((p:Paragraph)=>{
      textLength_+=p.length;
    });

    //Get old WordPointers for start and end
    var startWordPtr = this.wordContainingOrdinal(start);
    var endWordPtr = this.wordContainingOrdinal(Math.min(end,this.frame.length-1));

    //Include previous word and omit next word if breaker
    if (start === startWordPtr.ordinal) {
      if (startWordPtr.index > 0 && !isBreaker(this.words[startWordPtr.index - 1])) {
        startWordPtr = this.wordContainingOrdinal(this.wordOrdinal(startWordPtr.index-1));
      }
    }
    if (end === endWordPtr.ordinal) {
      //if ((end === this.frame.length - 1) || isBreaker(endWordPtr.word)) {
      if (endWordPtr.word.eof) {
        var previousWord = this.wordContainingOrdinal(this.wordOrdinal(endWordPtr.index-1));
        if(previousWord) {
          endWordPtr = previousWord;
        }
      }
    }

    //Get ParagraphPointers for start and end
    var startParagraphPtr = this.paragraphContainingOrdinal(start);
    var endParagraphPtr = this.paragraphContainingOrdinal(Math.min(end,this.frame.length-1));

    //Constitute array of new Paragraphs
    var startParagraph = startParagraphPtr.paragraph;
    var endParagraph = endParagraphPtr.paragraph;
    var newParagraphs:Array<Paragraph> = [startParagraph.partialParagraph({end : startParagraphPtr.offset})]
      .concat(text_)
      .concat([endParagraph.partialParagraph({start : endParagraphPtr.offset})]);

    //Consolidate new Paragraphs
    var consolidatedNewParagraphs:Array<Paragraph> = [];
    var cons = new Per(Paragraph.consolidate()).into(consolidatedNewParagraphs);
    new Per(newParagraphs).forEach((p:Paragraph)=>cons.submit(p));

    //Consolidate runs in consolidatedNewParagraphs
    consolidatedNewParagraphs.forEach((p:Paragraph)=>{
      var runs:Array<Run> = [];
      var consRuns = new Per(Run.consolidate()).into(runs);
      new Per(p.runs,p).forEach((r:Run)=>consRuns.submit(r));
      p.clearRuns();
      p.addRuns(runs);
    });

    var textLengthDiff = textLength_ - (Math.min(end,this.frame.length-1)-start);

    //Get new Runs from consolidated new paragraphs.
    var newRuns:Array<Run> = [];
    //start of start word relative to startParagraphPtr
    var startOrdinal = startWordPtr.ordinal - startParagraphPtr.ordinal;
    //end of end word relative to startParagraphPtr
    var endOrdinal = textLengthDiff + endWordPtr.ordinal + endWordPtr.word.length  - startParagraphPtr.ordinal;
    consolidatedNewParagraphs.forEach((p:Paragraph, i : number)=>{
      newRuns = newRuns.concat( new Per({start:startOrdinal, end:endOrdinal }).per(p.runs,p).all() );
      startOrdinal = Math.max(startOrdinal - p.length, 0);
      endOrdinal = Math.max(endOrdinal - p.length, 0);
    });

    var oldLength = this.frame.length;

    this.spliceWordsWithRuns(startWordPtr.index, (endWordPtr.index - startWordPtr.index) + 1, newRuns,
      startParagraphPtr.index, (endParagraphPtr.index - startParagraphPtr.index) + 1, consolidatedNewParagraphs
    );

    return this.frame ? (this.frame.length - oldLength) : 0;
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
          b = new Rect(lineBounds.l, lineBounds.b, 2, newLineBounds.h);
        } else {
          b = nodeBefore.bounds();
          b = new Rect(b.r, b.t, 2, b.h);
        }
      } else {
        b = node.bounds();
        if (b.h) {
          b = new Rect(b.l, b.t, 2, b.h);
        } else {
          b = new Rect(b.l, b.t, b.w, 1);
        }
      }
      return b;
    }
  }

  // byCoordinate(x:number, y:number) {
  //   var ordinal = this.frame.byCoordinate(x, y).ordinal;
  //   var caret = this.getCaretCoords(ordinal);
  //   while (caret.b <= y && ordinal < (this.frame.length - 1)) {
  //     ordinal++;
  //     caret = this.getCaretCoords(ordinal);
  //   }
  //   while (caret.t >= y && ordinal > 0) {
  //     ordinal--;
  //     caret = this.getCaretCoords(ordinal);
  //   }
  //   return this.byOrdinal(ordinal);
  // }

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
          ctx.fillStyle = 'rgba(0,0,0,1.0)';
          ctx.globalCompositeOperation = "xor";
          caret.fill(ctx);
          ctx.restore();
        }
      }
    } else {
      ctx.save();
      //ctx.fillStyle = hasFocus ? 'rgba(0, 100, 200, 0.3)' : 'rgba(160, 160, 160, 0.3)';
      ctx.fillStyle = hasFocus ? 'rgba(0, 0, 0, 1.0)' : 'rgba(160, 160, 160, 0.3)';
      ctx.beginPath();
      this.selectedRange().parts(function (part:CNode) {
        var b = part.bounds(true);
        if(viewport.contains(b.l,b.t) && viewport.contains(b.r,b.b)) {
        //if(viewport.t <= b.t && viewport.b >= b.b) {
          ctx.moveTo(b.l, b.t);
          ctx.lineTo(b.r, b.t);
          ctx.lineTo(b.r, b.b);
          ctx.lineTo(b.l, b.b);
          ctx.closePath();
        }
      }.bind(this));
      ctx.globalCompositeOperation = "xor";
      ctx.fill();
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
    console.log("select:" + ordinal + "->" + ordinalEnd);
    if (!this.frame) {
      // Something has gone terribly wrong - doc.transaction will rollback soon
      return;
    }
    this.selection.start = Math.max(0, ordinal);
    this.selection.end = Math.min(
      typeof ordinalEnd === 'number' ? ordinalEnd : this.selection.start,
      this.frame.length
    );
    //Disallow setting cursor after last newline.
    if(this.selection.start == this.frame.length && this.selection.end == this.frame.length) {
      this.selection.start--;
      this.selection.end--;
    }
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

  /**
   * Return document bounds. Equals to frame bounds.
   * @param actual
   * @returns {Rect|Rect}
   */
  bounds(actual : boolean) {
    return this.frame.bounds(actual);
  }
}