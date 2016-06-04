import {Run, ICharacterFormatting, IFormattingMap} from "../Run";
import {Paragraph} from "../Paragraph";
import {IColor, IEngineData, IParagraphRunData} from "./EngineData";

export class EngineDataImport {

  static getColor(color : IColor) {
    return "rgba("+Math.floor(color.Values[1]*255)+","+Math.floor(color.Values[2]*255)+","+Math.floor(color.Values[3]*255)+","+color.Values[0]+")";
  }

  static getCharacterFormatting(engineData:IEngineData, runIndex:number) {
    var formatting:IFormattingMap = {};
    var styleSheetData = engineData.EngineDict.StyleRun.RunArray[runIndex].StyleSheet.StyleSheetData;
    formatting["size"] = styleSheetData.FontSize;
    var fontIndex = styleSheetData.Font;
    switch(styleSheetData.FontBaseline) {
      case 0 : formatting["script"] = "normal"; break;
      case 1 : formatting["script"] = "super"; break;
      case 2 : formatting["script"] = "sub"; break;
    }
    formatting["font"] = engineData.ResourceDict.FontSet[fontIndex].Name;
    formatting["color"] = EngineDataImport.getColor(styleSheetData.FillColor);
    formatting["baselineShift"] = styleSheetData.BaselineShift;
    formatting["letterSpacing"] = styleSheetData.Tracking/1000;
    formatting["lineHeight"] = styleSheetData.AutoLeading ? 0 : styleSheetData.Leading;
    formatting["verticalScaling"] = styleSheetData.VerticalScale;
    formatting["horizontalScaling"] = styleSheetData.HorizontalScale;
    formatting["bold"] = styleSheetData.FauxBold;
    formatting["italic"] = styleSheetData.FauxItalic;
    formatting["underline"] = styleSheetData.Underline;
    formatting["strikeout"] = styleSheetData.Strikethrough;
    formatting["capitals"] = styleSheetData.FontCaps == 2;
    return formatting;
  }

  static getParagraphFormatting(engineData:IEngineData, runIndex:number) {
    var formatting:IFormattingMap = {};
    var properties = engineData.EngineDict.ParagraphRun.RunArray[runIndex].ParagraphSheet.Properties;
    formatting["marginLeft"] = properties.StartIndent;
    formatting["marginRight"] = properties.EndIndent;
    formatting["spaceBefore"] = properties.SpaceBefore;
    formatting["spaceAfter"] = properties.SpaceAfter;
    switch(properties.Justification) {
      case 0 : formatting["align"] = "left"; break;
      case 2 : formatting["align"] = "center"; break;
      case 1 : formatting["align"] = "right"; break;
      case 3 : formatting["align"] = "justifyLastLeft"; break;
      case 5 : formatting["align"] = "justifyLastCentered"; break;
      case 4 : formatting["align"] = "justifyLastRight"; break;
      case 6 : formatting["align"] = "justifyAll"; break;
    }
    return formatting;
  }

  static parse(engineData:IEngineData):Array<Paragraph> {
   var runs:Array<Run> = [];
   console.log(engineData);
    console.log(engineData.EngineDict.Editor.Text);

   var text = engineData.EngineDict.Editor.Text;
   var text = decodeURIComponent(encodeURIComponent(text));
   text = text.replace(/\r/g,"\n");
   var charCounter = 0;

   var paragraphs:Array<Paragraph> = [];
   var paragraphOrdinal = 0;
   var runOrdinal = 0;
   engineData.EngineDict.ParagraphRun.RunArray.forEach((paragraphRunData:IParagraphRunData, i : number)=>{
     var paragraphLength = engineData.EngineDict.ParagraphRun.RunLengthArray[i];
     var runLength:number;
     var paragraph = new Paragraph();

     //get runs and partial runs in this paragraph
     var j = 0;
     runOrdinal = 0;
     runLength = engineData.EngineDict.StyleRun.RunLengthArray[j];
     while(runOrdinal+runLength < paragraphOrdinal) {
       runOrdinal += runLength;
       runLength = engineData.EngineDict.StyleRun.RunLengthArray[++j];
     }

     var formatting = EngineDataImport.getCharacterFormatting(engineData,j);
     var run = new Run(text.substring(paragraphOrdinal,Math.min(runOrdinal + runLength, paragraphOrdinal+paragraphLength)),formatting,paragraph);
     paragraph.addRun(run);
     runOrdinal += runLength;
     runLength = engineData.EngineDict.StyleRun.RunLengthArray[++j];

     while(runOrdinal < paragraphOrdinal+paragraphLength) {
      formatting = EngineDataImport.getCharacterFormatting(engineData,j);
      var run = new Run(text.substring(runOrdinal,Math.min(runOrdinal + runLength, paragraphOrdinal+paragraphLength)),formatting,paragraph);
      paragraph.addRun(run);
      runOrdinal += runLength;
      runLength = engineData.EngineDict.StyleRun.RunLengthArray[++j];
     }

     paragraph.formatting = EngineDataImport.getParagraphFormatting(engineData, i);
     paragraphs.push(paragraph);
     paragraphOrdinal+=paragraphLength;
   });

   console.log(paragraphs);
   return paragraphs;
  }
}