import {Per} from "./Per";
import {CarotaDoc} from "./Doc";
import {CNode} from "./Node";
import {IFormattingMap} from "./Run";
import {ICharacterFormatting} from "./Run";
import {Run} from "./Run";
import {Paragraph, IParagraphFormatting} from "./Paragraph";

export interface IRange {
  start? : number,
  end? : number,
}

export class Range implements IRange{

  doc:CarotaDoc;
  start:number;
  end:number;

  /**
   * Create a Range spanning characters from start to end.
   * @param doc - the document
   * @param start - start ordinal
   * @param end - end ordinal
   */
  constructor(doc:CarotaDoc, start:number, end:number) {
    this.doc = doc;
    this.start = start;
    this.end = end;
    if (start > end) {
      this.start = end;
      this.end = start;
    }
  }

  /**
   * Emits the range's CNode objects. ??? 
   * @param emit
   * @param list
   */
  parts(emit:(n:CNode)=>void, list?:Array<CNode>) {
    list = list || this.doc.children();
    var self = this;

    list.some(function (item) {
      if (item.ordinal + item.length <= self.start) {
        return false;
      }
      if (item.ordinal >= self.end) {
        return true;
      }
      if (item.ordinal >= self.start &&
        item.ordinal + item.length <= self.end) {
        emit(item);
      } else {
        self.parts(emit, item.children());
      }
    });
  }

  clear() {
    return this.setText([]);
  }

  /**
   * Sets range's contents to a given string/Array of runs.
   * @param text
   * @returns {number}
   */
  setText(text:Array<Paragraph>|string) {
    return this.doc.splice(this.start, this.end, text);
  }

  /**
   * Emits the range's runs.
   * @param emit
   */
  runs(emit:(r:Run)=>void) {
    this.doc.runs(emit, this);
  };

  /**
   * Emits the range's paragraphs.
   * @param emit
   */
  paragraphs(emit:(p:Paragraph)=>void) {
    this.doc.paragraphs(emit, this);
  }

  /**
   * Returns the range's contents as plain text.
   * @returns {string}
   */
  plainText():string {
    return new Per(this.runs, this).map(Run.getPlainText).all().join('');
  };

  /**
   * Save an array of runs by consolidating.
   */
  save():Array<Paragraph> {
    var paragraphs = new Per(this.paragraphs, this).all();

    //consolidate runs in paragraphs and remove paragraph reference
    var consolidatedParagraphs = paragraphs.map((p:Paragraph)=>{
      p = p.clone();
      var runs:Array<Run> = [];
      var cons = new Per<Run>(Run.consolidate()).into(runs);
      p.runs((r:Run)=>{
        cons.submit(r);
      });
      p.clearRuns();
      p.addRuns(runs);
      p.runs_.forEach((r:Run)=>{ delete r.parent; });
      return p;
    });
    
    return consolidatedParagraphs;
  };

  /**
   * Returns the character formatting for this range.
   * @returns {IFormattingMap}
   */
  getCharacterFormatting():ICharacterFormatting {
    var range = this;
    if (range.start === range.end) {
      var pos = range.start;
      // take formatting of character before, if any, because that's
      // where plain text picks up formatting when inserted
      if (pos > 0) {
        pos--;
      }
      range.start = pos;
      range.end = pos + 1;
    }

    var formatting = Run.cloneFormatting(Run.defaultFormatting);
    var lastRun = new Per(range.runs, range).reduce(Run.merge).last();
    if(lastRun) {
      var specificFormatting:IFormattingMap = lastRun.formatting;
      for(var prop in specificFormatting) {
        if(specificFormatting.hasOwnProperty(prop)) {
          formatting[prop] = specificFormatting[prop]
        }
      }
    }
    return formatting;
  };

  /**
   * Set CharacterFormatting "attribute" to value.
   * @param attribute
   * @param value
   */
  setCharacterFormatting(attribute:string, value:string|boolean) {
    var range:Range = this;
    if (range.start === range.end) {
      range.doc.modifyInsertFormatting(attribute, value);
    } else {
      var saved = range.save();
      var formatting:IFormattingMap = {};
      formatting[attribute] = value;

      saved.forEach((p:Paragraph)=>{
        new Per(p.runs, p).forEach((r:Run)=>{
          Run.format(r, <ICharacterFormatting>formatting);
        });
      });
      range.setText(saved);
    }
  };

  /**
   * Returns the paragraph formatting for this range.
   * @returns {IParagraphFormatting}
   */
  getParagraphFormatting():IParagraphFormatting {
    var start = this.doc.paragraphContainingOrdinal(this.start),
      end = this.doc.paragraphContainingOrdinal(this.end);

    if(!start || !end) return {} as IParagraphFormatting;

    var paragraphs = this.doc._paragraphs.slice(start.index,end.index+1);

    var formatting = Paragraph.cloneFormatting(Paragraph.defaultFormatting);
    var lastParagraph = new Per(paragraphs).reduce(Paragraph.merge).last();
    if(lastParagraph) {
      var specificFormatting:IFormattingMap = lastParagraph.formatting;
      for(var prop in specificFormatting) {
        if(specificFormatting.hasOwnProperty(prop)) {
          formatting[prop] = specificFormatting[prop]
        }
      }
    }
    return formatting as IParagraphFormatting;
  }
  
  /**
   * Sets ParagraphFormatting "attribute" to value.
   * @param attribute
   * @param value
   */
  setParagraphFormatting(attribute:string, value:string|boolean|number) {
    var start = this.doc.paragraphContainingOrdinal(this.start),
      end = this.doc.paragraphContainingOrdinal(this.end);

    var extendedRange = new Range(this.doc, start.ordinal, end.ordinal + this.doc._paragraphs[end.index].length );
    var saved = extendedRange.save();

    saved.forEach((p:Paragraph)=>{
      p.formatting[attribute] = value;
    });

    extendedRange.setText(saved);
  }
}
