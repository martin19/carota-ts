import {Per} from "./Per";
import {CarotaDoc} from "./Doc";
import {CNode} from "./Node";
import {IFormattingMap} from "./Run";
import {ICharacterFormatting} from "./Run";
import {Run} from "./Run";

export interface IRange {
  start? : number,
  end? : number,
}

export class Range implements IRange{

  doc:CarotaDoc;
  start:number;
  end:number;

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
  setText(text:Array<Run>|string) {
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
   * Returns the range's contents as plain text.
   * @returns {string}
   */
  plainText():string {
    return new Per(this.runs, this).map(Run.getPlainText).all().join('');
  };

  save():Array<Run> {
    return new Per(this.runs, this).per(Run.consolidate()).all();
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
      var template:IFormattingMap = {};
      template[attribute] = value;
      Run.format(saved, <ICharacterFormatting>template);
      range.setText(saved);
    }
  };

  /**
   * Sets ParagraphFormatting "attribute" to value.
   * @param attribute
   * @param value
   */
  setParagraphFormatting(attribute:string, value:string|boolean|number) {
    throw "not implemented.";
    // var range:Range = this;
    // if(range.start === range.end) {
    //   //TODO: modify insert formatting
    //   throw "ParagraphInsertFormatting cannot be modified yet.";
    // } else {
    //   range.paragraphRuns((paragraphRun:ParagraphRun)=>{
    //     //TODO:
    //     //paragraph
    //   });
    // }
  }
}
