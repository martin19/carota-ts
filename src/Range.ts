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
    list.some((item) => {
      if (item.ordinal + item.length <= this.start) {
        return false;
      }
      if (item.ordinal >= this.end) {
        return true;
      }
      if (item.ordinal >= this.start &&
        item.ordinal + item.length <= this.end) {
        emit(item);
      } else {
        this.parts(emit, item.children());
      }
      return false;
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
    let paragraphs = new Per(this.paragraphs, this).all();

    //consolidate runs in paragraphs and remove paragraph reference
    let consolidatedParagraphs = paragraphs.map((p:Paragraph)=>{
      p = p.clone();
      let runs:Array<Run> = [];
      let cons = new Per<Run>(Run.consolidate()).into(runs);
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
    let range = this;
    if (range.start === range.end) {
      let pos = range.start;
      // take formatting of character before, if any, because that's
      // where plain text picks up formatting when inserted
      if (pos > 0) {
        pos--;
      }
      range.start = pos;
      range.end = pos + 1;
    }

    let formatting = Run.cloneFormatting(Run.defaultFormatting);
    let lastRun = new Per(range.runs, range).reduceWithoutSeed(Run.merge).last();
    if(lastRun) {
      let specificFormatting:IFormattingMap = lastRun.formatting;
      for(let prop in specificFormatting) {
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
  setCharacterFormatting(attribute:string, value:string|boolean|number) {
    let range:Range = this;
    if (range.start === range.end) {
      range.doc.modifyInsertFormatting(attribute, value);
    } else {
      let saved = range.save();
      let formatting:IFormattingMap = {};
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
    let start = this.doc.paragraphContainingOrdinal(this.start),
      end = this.doc.paragraphContainingOrdinal(this.end);

    if(!start || !end) return {} as IParagraphFormatting;

    let paragraphs = this.doc._paragraphs.slice(start.index,end.index+1);

    let formatting = Paragraph.cloneFormatting(Paragraph.defaultFormatting);
    let lastParagraph = new Per(paragraphs).reduceWithoutSeed(Paragraph.merge).last();
    if(lastParagraph) {
      let specificFormatting:IFormattingMap = lastParagraph.formatting;
      for(let prop in specificFormatting) {
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
    let start = this.doc.paragraphContainingOrdinal(this.start),
      end = this.doc.paragraphContainingOrdinal(this.end);

    let extendedRange = new Range(this.doc, start.ordinal, end.ordinal + this.doc._paragraphs[end.index].length );
    let saved = extendedRange.save();

    saved.forEach((p:Paragraph)=>{
      p.formatting[attribute] = value;
    });

    extendedRange.setText(saved);
  }
}
