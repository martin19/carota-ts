import {Run, IFormattingMap} from "./Run";

enum ParagraphAlignment {
  left,
  center,
  right,
  justifyLastLeft,
  justifyLastCentered,
  justifyLastRight,
  justifyAll
}

export interface IParagraphFormatting {
  align:ParagraphAlignment,
  marginLeft : number,
  marginRight : number,
  marginTop : number,
  marginBottom : number,
  hyphenate : boolean
}


export class ParagraphRun extends Run {
  static formattingKeys:Array<string> = ["align","marginLeft","marginRight","marginTop","marginBottom","hyphenate"];

  static defaultFormatting:IParagraphFormatting = {
    align:ParagraphAlignment.left,
    marginLeft : 0,
    marginRight : 0,
    marginTop : 0,
    marginBottom : 0,
    hyphenate : false
  };

  constructor(text:string|Array<string>, formatting:IFormattingMap) {
    super(text, formatting);
  }
}