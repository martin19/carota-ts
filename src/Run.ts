import {Character} from "./Characters";

export interface IFormatting {
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

export interface IRun extends IFormatting {
  text : string|Array<string>;
}

export type IFormattingMap = {[s:string]:any};
export type IRunMap = {[s:string]:any};


/**
 * The text property of a run can be an ordinary string, or a "character object",
 * or it can be an array containing strings and "character objects".
 * A character object is not a string, but is treated as a single character.
 *
 * We abstract over this to provide the same string-like operations regardless.
 *
 * TODO: where are character objects created and are there really occurences? if not we might drop this abstraction
 */
export class Run implements IRun,IFormatting {
  static formattingKeys = ['bold', 'italic', 'underline', 'strikeout', 'color', 'font', 'size', 'lineHeight', 'align', 'script'];

  static defaultFormatting:IFormatting = {
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

  text : string|Array<string>;
  formatting : IFormatting;

  constructor(text:string|Array<string>, formatting : IFormatting) {
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
    return Run.formattingKeys.every(function (key:string) {
      return (<IFormattingMap>run1.formatting)[key] === (<IFormattingMap>run2.formatting)[key];
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
      return Run.merge(Array.prototype.slice.call(arguments, 0));
    }
    if(run1 instanceof Run && run2 instanceof Run) {
      var mergedFormatting:IFormattingMap = {};
      Run.formattingKeys.forEach(function (key) {
        if (key in run1.formatting || key in run2.formatting) {
          if ((<IFormattingMap>run1.formatting)[key] === (<IFormattingMap>run2.formatting)[key]) {
            mergedFormatting[key] = (<IFormattingMap>run1.formatting)[key];
          } else {
            mergedFormatting[key] = Run.multipleValues;
          }
        }
      });
    }
    return new Run("",mergedFormatting);
  }

  /**
   * Formats this with given formatting
   * @param template
   */
  format(template:IFormatting) {
    Object.keys(template).forEach(function (key) {
      if ((<IFormattingMap>template)[key] !== Run.multipleValues) {
        (<IFormattingMap>this.formatting)[key] = (<IFormattingMap>template)[key];
      }
    });
  }

  static format(run:Run|Array<Run>, template:IFormatting) {
    if (Array.isArray(run)) {
      run.forEach(function (r:Run) {
        Run.format(r, template);
      });
    } else {
      Object.keys(template).forEach(function (key) {
        if ((<IFormattingMap>template)[key] !== Run.multipleValues) {
          (<IFormattingMap>run.formatting)[key] = (<IFormattingMap>template)[key];
        }
      });
    }
  }

  static consolidate() {
    var current:Run;
    return function (emit:(p:Run)=>void, run:Run) {
      if (!current || !Run.sameFormatting(run,current) ||
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
      (<Array<string>>(run.text)).forEach(function (piece:string) {
        str.push(Run.getPiecePlainText(piece));
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

  static getTextLength(text:string|Array<string>) {
    if (typeof text === 'string') {
      return text.length;
    }
    if (Array.isArray(text)) {
      var length = 0;
      text.forEach(function (piece) {
        length += Run.getPieceLength(piece);
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
        var pieceLength = Run.getPieceLength(piece);
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
    Run.getSubText(function (c) {
      result = c
    }, text, offset, 1);
    return result;
  }

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