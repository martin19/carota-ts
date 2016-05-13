import {Run} from "./Run";
import {IFormattingMap} from "./Run";
import {IRange} from "./Range";
import {Per} from "./Per";

export type ParagraphAlignment = "left"|"center"|"right"|"justifyLastLeft"|"justifyLastCentered"|"justifyLastRight"|"justifyAll";

export interface IParagraphFormatting {
  align:ParagraphAlignment,
  marginLeft : number,
  marginRight : number,
  spaceBefore : number,
  spaceAfter : number,
  hyphenate : boolean
}


export class Paragraph {
  static formattingKeys:Array<string> = ["align","marginLeft","marginRight","spaceBefore","spaceAfter","hyphenate"];

  static defaultFormatting:IParagraphFormatting = {
    align:"left",
    marginLeft : 0,
    marginRight : 0,
    spaceBefore : 0,
    spaceAfter : 0,
    hyphenate : false
  };

  static multipleValues = {};

  /**
   * The formatting of this paragraph.
   */
  formatting : IFormattingMap;
  /**
   * The runs contained in this Paragraph.
   */
  runs_ : Array<Run>;
  /**
   * Length of this paragraph in characters.
   */
  length : number;

  /**
   * Creates a new Paragraph.
   * @param formatting
   */
  constructor(formatting?:IFormattingMap) {
    this.formatting = typeof formatting !== "undefined" ? formatting : {};
    this.runs_ = [];
    this.length = 0;
  }

  /**
   * Append a run to this paragraph.
   * @param run
   */
  addRun(run:Run) {
    run.parent = this;
    this.runs_.push(run);
    this.length += run.text.length;
  }

  /**
   * Append runs to this paragraph.
   * @param runs
   */
  addRuns(runs:Array<Run>) {
    runs.forEach((r:Run)=>{
      this.addRun(r);
    });
  }

  clearRuns() {
    this.runs_ = [];
    this.length = 0;
  }

  clone() {
    var p = new Paragraph(this.formatting);
    p.addRuns(this.runs_);
    return p;
  }

  /**
   * Creates a partial paragraph from this by consolidating runs within range
   * @param range
   * @returns {Paragraph}
   */
  partialParagraph(range?:IRange) {
    var paragraph = this.clone();
    paragraph.clearRuns();
    var runs:Array<Run> = [];

    //TODO: why does this not work?
    //new Per(range).per(this.runs, this).per(Run.consolidate()).into(runs);

    var cons = new Per<Run>(Run.consolidate()).into(runs);
    new Per(range).per(this.runs, this).forEach((r:Run)=>{
      cons.submit(r);
    });

    paragraph.addRuns(runs);
    return paragraph;
  }

  /**
   * Checks if the paragraph ends with a newline character.
   * @returns {boolean}
   */
  endsWithNewLine() {
    if(this.runs_ && this.runs_.length) {
      return this.runs_[this.runs_.length-1].text.slice(-1) == "\n";
    }
    return false;
  }

  /**
   * Emits this paragraph's runs within a given Range (or the full paragraph if no range is given.)
   * @param emit
   * @param range - absolute or relative to paragraph start?
   */
  runs(emit:(p:Run)=>void, range?:IRange) {
    var start = range && range.start || 0,
      end = range && range.end;
    if (typeof end !== 'number') {
      end = Number.MAX_VALUE;
    }
    this.runs_.some((run:Run)=>{
      if (start >= end || end <= 0) {
        return true;
      }
      var text = run.text;
      if(typeof text === "string") {
        if (start <= 0 && end >= text.length) {
          emit(run);
        } else if (start < text.length) {
          var pieceRun = run.clone();
          var firstChar = Math.max(0, start);
          pieceRun.text = text.substr(
            firstChar,
            Math.min(text.length, end - firstChar)
          );
          emit(pieceRun);
        }
        start -= text.length;
        end -= text.length;
      } else {
        if (start <= 0 && end >= 1) {
          emit(run);
        }
        start--;
        end--;
      }
    });
  }

  // TODO: copied from Run.cloneFormatting - refactor?
  static cloneFormatting(formattingMap:IFormattingMap) {
    var clone:IFormattingMap = {};
    for (var i in formattingMap) {
      if (formattingMap.hasOwnProperty(i)) {
        clone[i] = formattingMap[i];
      }
    }
    return clone;
  }

  /**
   * Merge runs formatting into single run.
   * TODO: forked from Run.merge - refactor?
   * @param p1
   * @param p2
   * @returns {Paragraph}
   */
  static merge(p1:Paragraph|Array<Paragraph>, p2?:Paragraph):Paragraph {
    if (arguments.length === 1) {
      return Array.isArray(p1) ? p1.reduce(Paragraph.merge) : p1;
    }
    if (arguments.length > 2) {
      return Paragraph.merge(Array.prototype.slice.call(arguments, 0));
    }
    if(p1 instanceof Paragraph && p2 instanceof Paragraph) {
      var mergedFormatting:IFormattingMap = {};
      Paragraph.formattingKeys.forEach(function (key) {
        if (key in p1.formatting || key in p2.formatting) {
          if ((p1.formatting)[key] === (p2.formatting)[key]) {
            mergedFormatting[key] = (p1.formatting)[key];
          } else {
            mergedFormatting[key] = Paragraph.multipleValues;
          }
        }
      });
      return new Paragraph(mergedFormatting);
    }
    throw "Unexpected control flow in Run.merge.";
  }


  /**
   * Consolidate subsequent paragraphs if there is no newline at end.
   * @returns {function(function(Run): void, Run): void}
   */
  static consolidate() {
    var current:Paragraph;
    return (emit:(p:Paragraph)=>void, paragraph:Paragraph)=> {
      if ((!current) || current.endsWithNewLine()) {
        current = paragraph.clone();
        emit(current);
      } else {
        current.addRuns(paragraph.runs_);
      }
    };
  }

  //TODO: remove
  static runs(emit:(p:Run)=>void, paragraph:Paragraph) {
    paragraph.runs_.forEach((r:Run)=>{
      emit(r)
    });
  }
}
