import {
  IEngineData, IShape, IParagraphRun, IParagraphRunData, IParagraphSheet,
  IParagraphProperties, IStyleRunData, IStyleSheet, IStyleSheetData, IFont, IColor
} from "./EngineData";
import {Paragraph, IParagraphFormatting} from "../Paragraph";
import {CarotaDoc} from "../Doc";
import {Run, ICharacterFormatting} from "../Run";
import {EngineDataImport} from "./EngineDataImport";

var DefaultParagraphSheet:IParagraphSheet = {
  "DefaultStyleSheet": 0,
  "Properties": {
    "Justification": 0,
    "FirstLineIndent": 0,
    "StartIndent": 0,
    "EndIndent": 0,
    "SpaceBefore": 0,
    "SpaceAfter": 0,
    "AutoHyphenate": false,
    "HyphenatedWordSize": 6,
    "PreHyphen": 2,
    "PostHyphen": 2,
    "ConsecutiveHyphens": 8,
    "Zone": 36,
    "WordSpacing": [0.8, 1, 1.33],
    "LetterSpacing": [0, 0, 0],
    "GlyphSpacing": [1, 1, 1],
    "AutoLeading": 1.2,
    "LeadingType": 0,
    "Hanging": false,
    "Burasagari": false,
    "KinsokuOrder": 0,
    "EveryLineComposer": false
  }
};

var DefaultStyleSheet:IStyleSheet = {
  "StyleSheetData": {
    "Font": 1,
    "FontSize": 12,
    "FauxBold": false,
    "FauxItalic": false,
    "AutoLeading": true,
    "Leading": 0.01,
    "HorizontalScale": 1,
    "VerticalScale": 1,
    "Tracking": 0,
    "AutoKerning": true,
    "Kerning": 0,
    "BaselineShift": 0,
    "FontCaps": 0,
    "FontBaseline": 0,
    "Underline": false,
    "Strikethrough": false,
    "Ligatures": true,
    "DLigatures": false,
    "BaselineDirection": 1,
    "Tsume": 0,
    "StyleRunAlignment": 2,
    "Language": 0,
    "NoBreak": false,
    "FillColor": {
      "Type": 1,
      "Values": [1, 0, 0, 0]
    },
    "StrokeColor": {
      "Type": 1,
      "Values": [1, 0, 0, 0]
    },
    "FillFlag": true,
    "StrokeFlag": false,
    "FillFirst": false,
    "YUnderline": 1,
    "OutlineWidth": 1
  }
};

var DefaultFontSet:Array<IFont> = [
  {
    Name: "LiberationSans",
    Script: 0,
    FontType: 1,
    Synthetic: 0
  }, {
    Name: "AdobeInvisFont",
    Script: 0,
    FontType: 0,
    Synthetic: 0
  }, {
    Name: "MyriadHebrew-Regular",
    Script: 6,
    FontType: 0,
    Synthetic: 0
  }
];

var DefaultEngineData:IEngineData = {
  "EngineDict":{
    "Editor": {
      "Text": ""
    },
    "ParagraphRun": {
      "DefaultRunData": {
        "ParagraphSheet": {
          "DefaultStyleSheet": 0,
          "Properties": {}
        },
        "Adjustments": {
          "Axis": [1,0,1],
          "XY": [0,0]
        }
      },
      "RunArray": [],
      "RunLengthArray": [],
      "IsJoinable": 1
    },
    "StyleRun": {
      "DefaultRunData": {
        "StyleSheet": {
          "StyleSheetData": {}
        }
      },
      "RunArray": [],
      "RunLengthArray": [],
      "IsJoinable": 2
    },
    "GridInfo": {
      "GridIsOn": false,
      "ShowGrid": false,
      "GridSize": 18,
      "GridLeading": 22,
      "GridColor": {
        "Type": 1,
        "Values": [0,0,0,1]
      },
      "GridLeadingFillColor": {
        "Type": 1,
        "Values": [0,0,0,1]
      },
      "AlignLineHeightToGridFlags": false
    },
    "AntiAlias": 4,
    "UseFractionalGlyphWidths": true,
    "Rendered": {
      "Version": 1,
      "Shapes": {
        "WritingDirection": 0,
        "Children": [
          {
            "ShapeType": 1,
            "Procession": 0,
            "Lines": {
              "WritingDirection": 0,
              "Children": [""]
            },
            "Cookie": {
              "Photoshop": {
                "ShapeType": null,
                "BoxBounds": null,
                "Base": {
                  "ShapeType": null,
                  "TransformPoint0": [1,0],
                  "TransformPoint1": [0,1],
                  "TransformPoint2": [0,0]
                }
              }
            }
          }
        ]
      }
    }
  },
  "ResourceDict":{
    "KinsokuSet": [
      {
        "Name": "PhotoshopKinsokuHard",
        "NoStart": "\u3001\u3002\uff0c\uff0e\u30fb\uff1a\uff1b\uff1f\uff01\u30fc\u2015\u2019\u201d\uff09\u3015\uff3d\uff5d\u3009\u300b\u300d\u300f\u3011\u30fd\u30fe\u309d\u309e\u3005\u3041\u3043\u3045\u3047\u3049\u3063\u3083\u3085\u3087\u308e\u30a1\u30a3\u30a5\u30a7\u30a9\u30c3\u30e3\u30e5\u30e7\u30ee\u30f5\u30f6\u309b\u309c?!)]},.:;\u2103\u2109\u00a2\uff05\u2030",
        "NoEnd": "\u2018\u201c\uff08\u3014\uff3b\uff5b\u3008\u300a\u300c\u300e\u3010([{\uffe5\uff04\u00a3\uff20\u00a7\u3012\uff03",
        "Keep": "\u2015\u2025",
        "Hanging": "\u3001\u3002.,"
      },
      {
        "Name": "PhotoshopKinsokuSoft",
        "NoStart": "\u3001\u3002\uff0c\uff0e\u30fb\uff1a\uff1b\uff1f\uff01\u2019\u201d\uff09\u3015\uff3d\uff5d\u3009\u300b\u300d\u300f\u3011\u30fd\u30fe\u309d\u309e\u3005",
        "NoEnd": "\u2018\u201c\uff08\u3014\uff3b\uff5b\u3008\u300a\u300c\u300e\u3010",
        "Keep": "\u2015\u2025",
        "Hanging": "\u3001\u3002.,"
      }
    ],
    "MojiKumiSet": [
      {
        "InternalName": "Photoshop6MojiKumiSet1"
      },
      {
        "InternalName": "Photoshop6MojiKumiSet2"
      },
      {
        "InternalName": "Photoshop6MojiKumiSet3"
      },
      {
        "InternalName": "Photoshop6MojiKumiSet4"
      }
    ],
    "TheNormalStyleSheet": 0,
    "TheNormalParagraphSheet": 0,
    "ParagraphSheetSet": [
      {
        "Name": "Normal RGB",
        "DefaultStyleSheet": 0,
        "Properties": {
          "Justification": 0,
          "FirstLineIndent": 0,
          "StartIndent": 0,
          "EndIndent": 0,
          "SpaceBefore": 0,
          "SpaceAfter": 0,
          "AutoHyphenate": true,
          "HyphenatedWordSize": 6,
          "PreHyphen": 2,
          "PostHyphen": 2,
          "ConsecutiveHyphens": 8,
          "Zone": 36,
          "WordSpacing": [0.8,1,1.33],
          "LetterSpacing": [0,0,0],
          "GlyphSpacing": [1,1,1],
          "AutoLeading": 1.2,
          "LeadingType": 0,
          "Hanging": false,
          "Burasagari": false,
          "KinsokuOrder": 0,
          "EveryLineComposer": false
        }
      }
    ],
    "StyleSheetSet": [
      {
        "Name": "Normal RGB",
        "StyleSheetData": {
          "Font": 1,
          "FontSize": 12,
          "FauxBold": false,
          "FauxItalic": false,
          "AutoLeading": true,
          "Leading": 0,
          "HorizontalScale": 1,
          "VerticalScale": 1,
          "Tracking": 0,
          "AutoKerning": true,
          "Kerning": 0,
          "BaselineShift": 0,
          "FontCaps": 0,
          "FontBaseline": 0,
          "Underline": false,
          "Strikethrough": false,
          "Ligatures": true,
          "DLigatures": false,
          "BaselineDirection": 2,
          "Tsume": 0,
          "StyleRunAlignment": 2,
          "Language": 0,
          "NoBreak": false,
          "FillColor": {
            "Type": 1,
            "Values": [1,0,0,0]
          },
          "StrokeColor": {
            "Type": 1,
            "Values": [1,0,0,0]
          },
          "FillFlag": true,
          "StrokeFlag": false,
          "FillFirst": true,
          "YUnderline": 1,
          "OutlineWidth": 1
        }
      }
    ],
    "FontSet": [],
    "SuperscriptSize": 0.583,
    "SuperscriptPosition": 0.333,
    "SubscriptSize": 0.583,
    "SubscriptPosition": 0.333,
    "SmallCapSize": 0.7
  },
  "DocumentResources": {
    "KinsokuSet": [
      {
        "Name": "PhotoshopKinsokuHard",
        "NoStart": "\u3001\u3002\uff0c\uff0e\u30fb\uff1a\uff1b\uff1f\uff01\u30fc\u2015\u2019\u201d\uff09\u3015\uff3d\uff5d\u3009\u300b\u300d\u300f\u3011\u30fd\u30fe\u309d\u309e\u3005\u3041\u3043\u3045\u3047\u3049\u3063\u3083\u3085\u3087\u308e\u30a1\u30a3\u30a5\u30a7\u30a9\u30c3\u30e3\u30e5\u30e7\u30ee\u30f5\u30f6\u309b\u309c?!)]},.:;\u2103\u2109\u00a2\uff05\u2030",
        "NoEnd": "\u2018\u201c\uff08\u3014\uff3b\uff5b\u3008\u300a\u300c\u300e\u3010([{\uffe5\uff04\u00a3\uff20\u00a7\u3012\uff03",
        "Keep": "\u2015\u2025",
        "Hanging": "\u3001\u3002.,"
      },
      {
        "Name": "PhotoshopKinsokuSoft",
        "NoStart": "\u3001\u3002\uff0c\uff0e\u30fb\uff1a\uff1b\uff1f\uff01\u2019\u201d\uff09\u3015\uff3d\uff5d\u3009\u300b\u300d\u300f\u3011\u30fd\u30fe\u309d\u309e\u3005",
        "NoEnd": "\u2018\u201c\uff08\u3014\uff3b\uff5b\u3008\u300a\u300c\u300e\u3010",
        "Keep": "\u2015\u2025",
        "Hanging": "\u3001\u3002.,"
      }
    ],
    "MojiKumiSet": [
      {
        "InternalName": "Photoshop6MojiKumiSet1"
      },
      {
        "InternalName": "Photoshop6MojiKumiSet2"
      },
      {
        "InternalName": "Photoshop6MojiKumiSet3"
      },
      {
        "InternalName": "Photoshop6MojiKumiSet4"
      }
    ],
    "TheNormalStyleSheet": 0,
    "TheNormalParagraphSheet": 0,
    "ParagraphSheetSet": [
      {
        "Name": "Normal RGB",
        "DefaultStyleSheet": 0,
        "Properties": {
          "Justification": 0,
          "FirstLineIndent": 0,
          "StartIndent": 0,
          "EndIndent": 0,
          "SpaceBefore": 0,
          "SpaceAfter": 0,
          "AutoHyphenate": true,
          "HyphenatedWordSize": 6,
          "PreHyphen": 2,
          "PostHyphen": 2,
          "ConsecutiveHyphens": 8,
          "Zone": 36,
          "WordSpacing": [0.8,1,1.33],
          "LetterSpacing": [0,0,0],
          "GlyphSpacing": [1,1,1],
          "AutoLeading": 1.2,
          "LeadingType": 0,
          "Hanging": false,
          "Burasagari": false,
          "KinsokuOrder": 0,
          "EveryLineComposer": false
        }
      }
    ],
    "StyleSheetSet": [
      {
        "Name": "Normal RGB",
        "StyleSheetData": {
          "Font": 1,
          "FontSize": 12,
          "FauxBold": false,
          "FauxItalic": false,
          "AutoLeading": true,
          "Leading": 0,
          "HorizontalScale": 1,
          "VerticalScale": 1,
          "Tracking": 0,
          "AutoKerning": true,
          "Kerning": 0,
          "BaselineShift": 0,
          "FontCaps": 0,
          "FontBaseline": 0,
          "Underline": false,
          "Strikethrough": false,
          "Ligatures": true,
          "DLigatures": false,
          "BaselineDirection": 2,
          "Tsume": 0,
          "StyleRunAlignment": 2,
          "Language": 0,
          "NoBreak": false,
          "FillColor": {
            "Type": 1,
            "Values": [1,0,0,0]
          },
          "StrokeColor": {
            "Type": 1,
            "Values": [1,0,0,0]
          },
          "FillFlag": true,
          "StrokeFlag": false,
          "FillFirst": true,
          "YUnderline": 1,
          "OutlineWidth": 1
        }
      }
    ],
    "FontSet": [],
    "SuperscriptSize": 0.583,
    "SuperscriptPosition": 0.333,
    "SubscriptSize": 0.583,
    "SubscriptPosition": 0.333,
    "SmallCapSize": 0.7
  }
};

function rgbaToIColor(colorStr : string):IColor {
  if(!colorStr) return { Type : 1, Values : [1,0,0,0] };
  var colorArr = colorStr.slice(colorStr.indexOf('(') + 1, colorStr.indexOf(')')).split(",");
  if(colorArr && colorArr.length==4) {
    var color:IColor = {
      Type : 1,
      Values : [parseFloat(colorArr[3]), parseFloat(colorArr[0])/255,parseFloat(colorArr[1])/255,parseFloat(colorArr[2])/255]
    }
  } else color = { Type : 1, Values : [1,0,0,0] };
  return color;
}

export class EngineDataExport {
  constructor() {
  }


  static getStyleSheet(run:Run, fontSet : Array<IFont>) {

    function getFontIndex(name : string) {
      var fontIndex:number = null;
      fontSet.forEach((f:IFont, i : number)=>{
        if(f.Name === name) {
          fontIndex = i;
        }
      });
      if(!fontIndex) {
        fontSet.push({
          "Name": name,
          "Script": 0,
          "FontType": 1,
          "Synthetic": 1
        });
        fontIndex = fontSet.length - 1;
      }
      return fontIndex;
    }

    var styleSheet:IStyleSheet = JSON.parse(JSON.stringify(DefaultStyleSheet));
    var styleSheetData:IStyleSheetData = styleSheet.StyleSheetData;
    var formatting = run.formatting as ICharacterFormatting;
    if(typeof formatting.size !== "undefined") styleSheetData.FontSize = formatting.size;
    if(typeof formatting.font !== "undefined") {
      styleSheetData.Font = getFontIndex(formatting.font);
    }
    if(typeof formatting.script !== "undefined") {
      switch(formatting["script"]) {
        case "normal" : styleSheetData.FontBaseline = 0; break;
        case "super" : styleSheetData.FontBaseline = 1; break;
        case "sub" : styleSheetData.FontBaseline = 2; break;
      }
    }
    if(typeof formatting.color !== "undefined") styleSheetData.FillColor = rgbaToIColor(formatting.color);
    if(typeof formatting.baselineShift !== "undefined") styleSheetData.BaselineShift = formatting.baselineShift;
    if(typeof formatting.letterSpacing !== "undefined") styleSheetData.Tracking = formatting.letterSpacing*1000;
    if(typeof formatting.lineHeight !== "undefined") styleSheetData.AutoLeading = (formatting.lineHeight === 0) ? true : false;
    if(typeof formatting.lineHeight !== "undefined") styleSheetData.Leading = formatting.lineHeight;
    if(typeof formatting.verticalScaling !== "undefined") styleSheetData.VerticalScale = formatting.verticalScaling;
    if(typeof formatting.horizontalScaling !== "undefined") styleSheetData.HorizontalScale = formatting.horizontalScaling;
    if(typeof formatting.bold !== "undefined") styleSheetData.FauxBold = formatting.bold;
    if(typeof formatting.italic !== "undefined") styleSheetData.FauxItalic = formatting.italic;
    if(typeof formatting.underline !== "undefined") styleSheetData.Underline = formatting.underline;
    if(typeof formatting.strikeout !== "undefined") styleSheetData.Strikethrough = formatting.strikeout;
    if(typeof formatting.capitals !== "undefined") styleSheetData.FontCaps = formatting.capitals ? 2 : 0;
    return styleSheetData;
  }

  static getParagraphSheet(paragraph:Paragraph) {
    var paragraphSheet:IParagraphSheet = JSON.parse(JSON.stringify(DefaultParagraphSheet));
    var properties:IParagraphProperties = paragraphSheet.Properties;
    var formatting = paragraph.formatting as IParagraphFormatting;
    if(typeof formatting.marginLeft !== "undefined") properties.StartIndent = formatting.marginLeft;
    if(typeof formatting.marginRight !== "undefined") properties.EndIndent = formatting.marginRight;
    if(typeof formatting.spaceBefore !== "undefined") properties.SpaceBefore = formatting.spaceBefore;
    if(typeof formatting.spaceAfter !== "undefined") properties.SpaceAfter = formatting.spaceAfter;

    if(typeof formatting.align !== "undefined") {
      switch(formatting.align) {
        case "left": properties.Justification = 0; break;
        case "center": properties.Justification = 2; break;
        case "right": properties.Justification = 1; break;
        case "justifyLastLeft": properties.Justification = 3; break;
        case "justifyLastCentered": properties.Justification = 5; break;
        case "justifyLastRight": properties.Justification = 4; break;
        case "justifyAll": properties.Justification = 6; break;
      }
    }
    paragraphSheet.Properties = properties;
    return paragraphSheet;
  }

  static save(doc : CarotaDoc) {
    var engineData = JSON.parse(JSON.stringify(DefaultEngineData)) as IEngineData;
    var fontSet:Array<IFont> = JSON.parse(JSON.stringify(DefaultFontSet));
    engineData.EngineDict.Editor.Text = doc.documentRange().plainText().replace(/\n/g,"\r");
    var paragraphs = doc.documentRange().save();
    paragraphs.forEach((p:Paragraph)=>{
      var paragraphRun:IParagraphRunData = {
        ParagraphSheet : EngineDataExport.getParagraphSheet(p),
        Adjustments: { Axis: [1,0,1], XY: [0,0] }
      };
      engineData.EngineDict.ParagraphRun.RunArray.push(paragraphRun);
      engineData.EngineDict.ParagraphRun.RunLengthArray.push(p.length);
      engineData.EngineDict.ParagraphRun.IsJoinable = 1;
      
      p.runs((r:Run)=>{
        var styleRun:IStyleRunData = {
          StyleSheet : {
            StyleSheetData : EngineDataExport.getStyleSheet(r, fontSet)
          }
        };
        engineData.EngineDict.StyleRun.RunArray.push(styleRun);
        engineData.EngineDict.StyleRun.RunLengthArray.push(Run.getTextLength(r.text));
        engineData.EngineDict.StyleRun.IsJoinable = 2;
      });
    });

    engineData.ResourceDict.FontSet = fontSet;
    engineData.DocumentResources.FontSet = fontSet;

    var shape:IShape = {
      ShapeType : null,
      Procession : 0,
      Lines : { WritingDirection : 0, Children : [] },
      Cookie : {
        Photoshop: {
          ShapeType: null,
          BoxBounds: null,
          Base: {
            ShapeType: null,
            TransformPoint0: [1,0],
            TransformPoint1: [0,1],
            TransformPoint2: [0,0]
          }
        }
      }
    };
    if(!doc.wrap) {
      shape.ShapeType = 0;
      shape.Cookie.Photoshop.ShapeType = 0;
      shape.Cookie.Photoshop.PointBase = [0,0];
      shape.Cookie.Photoshop.Base.ShapeType = 0;
    } else {
      shape.ShapeType = 1;
      shape.Cookie.Photoshop.ShapeType = 1;
      //shape.Cookie.Photoshop.BoxBounds = [0,0,503,343];
      shape.Cookie.Photoshop.BoxBounds = [0,0,doc.bounds().w,doc.bounds().h];
      shape.Cookie.Photoshop.Base.ShapeType = 1;
    }
    engineData.EngineDict.Rendered.Shapes.Children = [shape];
    return engineData;
  }
}