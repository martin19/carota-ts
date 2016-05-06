import {Paragraph} from "./Paragraph";
export type IFormattingMap = {[s:string]:any};

export interface ICharacterFormatting {
  size?: number;
  lineHeight?: string;
  font?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikeout?: boolean;
  align?: string;
  script?: string;
}

/**
 * The text property of a run can be an ordinary string, or a "character object",
 * or it can be an array containing strings and "character objects".
 * A character object is not a string, but is treated as a single character.
 *
 * We abstract over this to provide the same string-like operations regardless.
 *
 * TODO: where are character objects created and are there really occurrences? if not we might drop this abstraction
 */
export class Run {
  static formattingKeys:Array<string> = ['bold', 'italic', 'underline', 'strikeout', 'color', 'font', 'size', 'lineHeight', 'align', 'script'];

  static defaultFormatting:ICharacterFormatting = {
    size: 10,
    lineHeight: 'auto',
    font: 'sans-serif',
    color: 'black',
    bold: false,
    italic: false,
    underline: false,
    strikeout: false,
    align: 'left',
    script: 'normal'
  };


  static multipleValues = {};

  parent : Paragraph;
  text : string|Array<string>;
  formatting : IFormattingMap;

  constructor(text:string|Array<string>, formatting : IFormattingMap) {
    this.text = text;
    this.formatting = Run.cloneFormatting(formatting);
  }

  static cloneFormatting(formattingMap:IFormattingMap) {
    var clone:IFormattingMap = {};
    for (var i in formattingMap) {
      if (formattingMap.hasOwnProperty(i)) {
        clone[i] = formattingMap[i];
      }
    }
    return clone;
  }

  static sameFormatting(run1:Run, run2:Run) {
    return this.formattingKeys.every(function (key:string) {
      return (run1.formatting)[key] === (run2.formatting)[key];
    });
  }

  clone() {
    return new Run(this.text, this.formatting);
  }

  static merge(run1:Run|Array<Run>, run2?:Run):Run {
    if (arguments.length === 1) {
      return Array.isArray(run1) ? run1.reduce(Run.merge) : run1;
    }
    if (arguments.length > 2) {
      return this.merge(Array.prototype.slice.call(arguments, 0));
    }
    if(run1 instanceof Run && run2 instanceof Run) {
      var mergedFormatting:IFormattingMap = {};
      this.formattingKeys.forEach(function (key) {
        if (key in run1.formatting || key in run2.formatting) {
          if ((run1.formatting)[key] === (run2.formatting)[key]) {
            mergedFormatting[key] = (run1.formatting)[key];
          } else {
            mergedFormatting[key] = Run.multipleValues;
          }
        }
      });
    }
    return new this("",mergedFormatting);
  }

  /**
   * Formats this with given formatting
   * @param template
   */
  format(template:IFormattingMap) {
    Object.keys(template).forEach(function (key) {
      if ((template)[key] !== Run.multipleValues) {
        this.formatting[key] = template[key];
      }
    });
  }

  static format(run:Run|Array<Run>, template:IFormattingMap) {
    if (Array.isArray(run)) {
      run.forEach((r:Run)=>{
        this.format(r, template);
      });
    } else {
      Object.keys(template).forEach(function (key) {
        if (template[key] !== Run.multipleValues) {
          run.formatting[key] = template[key];
        }
      });
    }
  }

  /**
   * Consolidate subsequent runs if formatting matches.
   * @returns {function(function(Run): void, Run): void}
   */
  static consolidate() {
    var current:Run;
    return (emit:(p:Run)=>void, run:Run)=> {
      if (!current || !this.sameFormatting(run,current) ||
        (typeof current.text != 'string') ||
        (typeof run.text != 'string')) {
        current = run.clone();
        emit(current);
      } else {
        current.text += <string>(run.text);
      }
    };
  }

  static getPlainText(run:Run) {
    if (typeof run.text === 'string') {
      return run.text;
    }
    if (Array.isArray(run.text)) {
      var str:Array<string> = [];
      (<Array<string>>(run.text)).forEach((piece:string)=> {
        str.push(this.getPiecePlainText(piece));
      });
      return str.join('');
    }
    return '_';
  }

  static getPieceLength(piece:string|Array<string>) {
    return piece.length || 1; // either a string or something like a character
  }

  static getPiecePlainText(piece:string|Array<string>):string {
    if(typeof piece === "string") {
      return piece;
    } else {
      return '_';
    }
  }

  /**
   * Gets the length of text if text is a string or cumulated
   * length of text if text is an Array of strings.
   * @param text
   * @returns {number}
   */
  static getTextLength(text:string|Array<string>) {
    if (typeof text === 'string') {
      return text.length;
    }
    if (Array.isArray(text)) {
      var length = 0;
      text.forEach(function (piece) {
        length += this.getPieceLength(piece);
      });
      return length;
    }
    return 1;
  }

  //transformer function
  static getSubText(emit:(p:string)=>void, text:string|Array<string>, start:number, count:number) {
    if (count === 0) {
      return;
    }
    if (typeof text === 'string') {
      emit(text.substr(start, count));
      return;
    }
    if (Array.isArray(text)) {
      var pos = 0;
      text.some(function (piece) {
        if (count <= 0) {
          return true;
        }
        var pieceLength = this.getPieceLength(piece);
        if (pos + pieceLength > start) {
          if (pieceLength === 1) {
            emit(piece);
            count -= 1;
          } else {
            var str = piece.substr(Math.max(0, start - pos), count);
            emit(str);
            count -= str.length;
          }
        }
        pos += pieceLength;
      });
      return;
    }
  }

  static getTextChar(text:string|Array<string>, offset:number) {
    var result:string;
    this.getSubText(function (c) {
      result = c
    }, text, offset, 1);
    return result;
  }

  /**
   * Apply "each" to each character in "piece".
   * @param each - function to apply to each character in "piece"
   * @param piece - a string or an array of strings.
   */
  static pieceCharacters(each:(s:string|Array<string>)=>void, piece:string|Array<string>) {
    if (typeof piece === 'string') {
      for (var c = 0; c < piece.length; c++) {
        each(piece[c]);
      }
    } else {
      each(piece);
    }
  }

}