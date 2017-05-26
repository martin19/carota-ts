///
import {Run, ICharacterFormatting, IFormattingMap} from "../Run";
import {Paragraph} from "../Paragraph";
import {IColor, IEngineData, IParagraphRunData, IStyleSheetData} from "./EngineData";

export class EngineDataImport {

  static getColor(color : IColor) {
    return "rgba("+Math.floor(color.Values[1]*255)+","+Math.floor(color.Values[2]*255)+","+Math.floor(color.Values[3]*255)+","+color.Values[0]+")";
  }

  static getCharacterFormatting(engineData:IEngineData, runIndex:number) {
    let formatting:IFormattingMap = {};
    let defaultStyleSheetData = engineData.ResourceDict.StyleSheetSet[engineData.ResourceDict.TheNormalStyleSheet].StyleSheetData;
    let styleSheetData = engineData.EngineDict.StyleRun.RunArray[runIndex].StyleSheet.StyleSheetData;
    let mergedStyleSheet = $.extend(true, {},defaultStyleSheetData,styleSheetData) as IStyleSheetData;

    formatting["size"] = mergedStyleSheet.FontSize;
    switch(mergedStyleSheet.FontBaseline) {
      case 0 : formatting["script"] = "normal"; break;
      case 1 : formatting["script"] = "super"; break;
      case 2 : formatting["script"] = "sub"; break;
    }
    mergedStyleSheet.Font && (formatting["font"] = engineData.ResourceDict.FontSet[mergedStyleSheet.Font].Name);
    mergedStyleSheet.FillColor && (formatting["color"] = EngineDataImport.getColor(mergedStyleSheet.FillColor));
    formatting["baselineShift"] = mergedStyleSheet.BaselineShift;
    mergedStyleSheet.Tracking && (formatting["letterSpacing"] = mergedStyleSheet.Tracking/1000);
    formatting["lineHeight"] = mergedStyleSheet.AutoLeading ? 0 : mergedStyleSheet.Leading;
    formatting["verticalScaling"] = mergedStyleSheet.VerticalScale;
    formatting["horizontalScaling"] = mergedStyleSheet.HorizontalScale;
    formatting["bold"] = mergedStyleSheet.FauxBold;
    formatting["italic"] = mergedStyleSheet.FauxItalic;
    formatting["underline"] = mergedStyleSheet.Underline;
    formatting["strikeout"] = mergedStyleSheet.Strikethrough;
    formatting["capitals"] = mergedStyleSheet.FontCaps == 2;
    return formatting;
  }

  static getParagraphFormatting(engineData:IEngineData, runIndex:number) {
    let formatting:IFormattingMap = {};
    let properties = engineData.EngineDict.ParagraphRun.RunArray[runIndex].ParagraphSheet.Properties;
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
   let runs:Array<Run> = [];
   console.log(engineData);
    console.log(engineData.EngineDict.Editor.Text);

   let text = engineData.EngineDict.Editor.Text;
   text = decodeURIComponent(encodeURIComponent(text));
   text = text.replace(/\r/g,"\n");
   let charCounter = 0;

   let paragraphs:Array<Paragraph> = [];
   let paragraphOrdinal = 0;
   let runOrdinal = 0;
   engineData.EngineDict.ParagraphRun.RunArray.forEach((paragraphRunData:IParagraphRunData, i : number)=>{
     let paragraphLength = engineData.EngineDict.ParagraphRun.RunLengthArray[i];
     let runLength:number;
     let paragraph = new Paragraph();

     //get runs and partial runs in this paragraph
     let j = 0;
     runOrdinal = 0;
     runLength = engineData.EngineDict.StyleRun.RunLengthArray[j];
     while(runOrdinal+runLength < paragraphOrdinal) {
       runOrdinal += runLength;
       runLength = engineData.EngineDict.StyleRun.RunLengthArray[++j];
     }

     let formatting = EngineDataImport.getCharacterFormatting(engineData,j);
     let run = new Run(text.substring(paragraphOrdinal,Math.min(runOrdinal + runLength, paragraphOrdinal+paragraphLength)),formatting,paragraph);
     paragraph.addRun(run);
     runOrdinal += runLength;
     runLength = engineData.EngineDict.StyleRun.RunLengthArray[++j];

     while(runOrdinal < paragraphOrdinal+paragraphLength) {
      formatting = EngineDataImport.getCharacterFormatting(engineData,j);
      let run = new Run(text.substring(runOrdinal,Math.min(runOrdinal + runLength, paragraphOrdinal+paragraphLength)),formatting,paragraph);
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