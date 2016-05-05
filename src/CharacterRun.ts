import {IFormattingMap, Run} from "./Run";

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

export class CharacterRun extends Run {
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
  
  constructor(text:string|Array<string>, formatting:IFormattingMap) {
    super(text, formatting);
  }

  clone() {
    return new CharacterRun(this.text, this.formatting);
  }
}