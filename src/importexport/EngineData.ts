export interface IColor {
  Type : number;
  Values : Array<number>;
}


export interface IParagraphProperties {
  AutoHyphenate: boolean;
  AutoLeading: number;
  Burasagari: boolean;
  ConsecutiveHyphens: number;
  EndIndent: number;
  EveryLineComposer: boolean;
  FirstLineIndent: number;
  GlyphSpacing: Array<number>
  Hanging: boolean;
  HyphenatedWordSize: number;
  Justification: number;
  KinsokuOrder: number;
  LeadingType: number;
  LetterSpacing: Array<number>
  PostHyphen: number;
  PreHyphen: number;
  SpaceAfter: number;
  SpaceBefore: number;
  StartIndent: number;
  WordSpacing: Array<number>
  Zone: number;
}

export interface IFont {
  FontType: number;
  Name: string;
  Script: number;
  Synthetic: number;
}

export interface IParagraphSheet {
  DefaultStyleSheet : number;
  Name : string;
  Properties : IParagraphProperties;
}

export interface IStyleSheetData {
  AutoKerning: boolean;
  AutoLeading: boolean;
  BaselineDirection: number;
  BaselineShift: number;
  DLigatures: boolean;
  FauxBold: boolean;
  FauxItalic: boolean;
  FillColor: IColor;
  FillFirst: boolean;
  FillFlag: boolean;
  Font: number;
  FontBaseline: number;
  FontCaps: number;
  FontSize: number;
  HorizontalScale: number;
  Kerning: number;
  Language: number;
  Leading: number;
  Ligatures: boolean;
  NoBreak: boolean;
  OutlineWidth: number;
  Strikethrough: boolean;
  StrokeColor: IColor;
  StrokeFlag: boolean;
  StyleRunAlignment: number;
  Tracking: number;
  Tsume: number;
  Underline: boolean;
  VerticalScale: number;
  YUnderline: number;
}

export interface IStyleSheet {
  Name : string;
  StyleSheetData : IStyleSheetData;
}

export interface IEditor {
  Text : string;
}

export interface IGridInfo {
  AlignLineHeightToGridFlags: boolean;
  GridColor: IColor;
  GridIsOn: boolean;
  GridLeading: number;
  GridLeadingFillColor: IColor;
  GridSize: number;
  ShowGrid: boolean;
}

export interface IAdjustments {
  Axis: Array<number>;
  XY: Array<number>
}

//paragraph runs
export interface IParagraphRunData {
  Adjustments: IAdjustments;
  ParagraphSheet: IParagraphSheet;
}

export interface IParagraphRun {
  DefaultRunData : IParagraphRunData;
  RunArray : Array<IParagraphRunData>;
  RunLengthArray : Array<number>
}

//style runs
export interface IStyleRunData {
  StyleSheet : IStyleSheet;
}

export interface IStyleRun {
  DefaultRunData : IStyleRunData;
  RunArray : Array<IStyleRunData>;
  RunLengthArray : Array<number>
  IsJoinable : boolean;
}

//rendered

export interface IShape {
  Cookie : {
    Photoshop : {
      Base : {
        ShapeType : number;
        TransformPoint0 : Array<number>;
        TransformPoint1 : Array<number>;
        TransformPoint2 : Array<number>;
      },
      BoxBounds?:Array<number>;
      PointBase?:Array<number>;
    }
  };
  Lines : {
    Children : Array<string>;
    WritingDirection:number;
  };
  Procession : number;
  ShapeType : number;
}

export interface IShapes {
  childeren : Array<IShape>
  WritingDirection : number;
}

export interface IRendered {
  Shapes : IShapes;
  Version : number;
}

//top level

export interface IEngineData {
  DocumentResources:{
    FontSet:Array<IFont>;
    ParagraphSheetSet:Array<IParagraphSheet>;
    StyleSheetSet: Array<IStyleSheet>
    KinsokuSet:Array<any>;
    MojiKumiSet:Array<any>
    SmallCapSize:number;
    SubscriptPosition: number;
    SubscriptSize: number;
    SuperscriptPosition: number;
    SuperscriptSize: number;
    TheNormalParagraphSheet: number;
    TheNormalStyleSheet: number;
  }
  EngineDict:{
    AntiAlias: number;
    Editor:IEditor;
    GridInfo:IGridInfo;
    ParagraphRun:IParagraphRun;
    Rendered:IRendered;
    StyleRun:IStyleRun;
    UseFractionalGlyphWidths: boolean;
  }
  ResourceDict:{
    FontSet:Array<IFont>;
    ParagraphSheetSet:Array<IParagraphSheet>;
    StyleSheetSet: Array<IStyleSheet>
    KinsokuSet:Array<any>;
    MojiKumiSet:Array<any>
    SmallCapSize:number;
    SubscriptPosition: number;
    SubscriptSize: number;
    SuperscriptPosition: number;
    SuperscriptSize: number;
    TheNormalParagraphSheet: number;
    TheNormalStyleSheet: number;
  }
}