import {Run} from "./Run";

function compatible(a:Character, b:Character) {
  if (a._runs !== b._runs) {
    throw new Error('Characters for different documents');
  }
}

export class Character {

  /**
   * Array of runs this character lives in.
   */
  _runs:Array<Run>;
  /**
   * The run number this character lives in.
   */
  _run:number;
  /**
   * The offset of the character within _run.
   */
  _offset:number;
  /**
   * The character data.
   */
  char:string;

  constructor(runArray:Array<Run>, run:number, offset:number) {
    this._runs = runArray;
    this._run = run;
    this._offset = offset;
    this.char = run >= runArray.length ? null : Run.getTextChar(runArray[run].text, offset);
  }

  equals(other:Character) {
    compatible(this, other);
    return this._run === other._run && this._offset === other._offset;
  }

  cut(upTo:Character) {
    compatible(this, upTo);
    var self = this;
    return function (eachRun:(r:Run)=>void) {
      for (var runIndex = self._run; runIndex <= upTo._run; runIndex++) {
        var run = self._runs[runIndex];
        if (run) {
          var start = (runIndex === self._run) ? self._offset : 0;
          var stop = (runIndex === upTo._run) ? upTo._offset : Run.getTextLength(run.text);
          if (start < stop) {
            Run.getSubText(function (piece) {
              var pieceRun = run.clone();
              pieceRun.text = piece;
              eachRun(pieceRun);
            }, run.text, start, stop - start);
          }
        }
      }
    };
  }
}

/**
 * Get first non-empty character in runArray.
 * @param runArray
 * @param n
 * @returns {Character}
 */
function firstNonEmpty(runArray:Array<Run>, n:number) {
  for (; n < runArray.length; n++) {
    if (Run.getTextLength(runArray[n].text) != 0) {
      return new Character(runArray, n, 0);
    }
  }
  return new Character(runArray, runArray.length, 0);
}

/**
 * Returns a function which emits all characters from an array of runs.
 * @param runArray
 * @returns {function(function(Character): void): undefined}
 */
export var characters = function (runArray:Array<Run>) {
  return function (emit:(c:Character)=>void) {
    var c = firstNonEmpty(runArray, 0);
    while (!emit(c) && (c.char !== null)) {
      c = (c._offset + 1 < Run.getTextLength(runArray[c._run].text))
        ? new Character(runArray, c._run, c._offset + 1)
        : firstNonEmpty(runArray, c._run + 1);
    }
  };
};
