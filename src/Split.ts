import {Character} from "./Characters";
import {ICoords} from "./Word";
/**
 * Creates a stateful transformer function that consumes Characters and produces "word coordinate"
 * objects, which are triplets of Characters representing the first characters of:
 *
 * start   - the word itself
 * end     - any trailing whitespace
 * next    - the subsequent word, or end of document.
 *
 * Newline characters are NOT whitespace. They are always emitted as separate single-character
 * words.
 *
 * If start.equals(end) then the "word" only contains whitespace and so must represent spaces
 * at the start of a line. So even in this case, whitespace is always treated as "trailing
 * after" a word - even if that word happens to be zero characters long!
 */
export const Split = function() {

  let word:Character|null = null;
  let trailingSpaces:Character|null = null;
  let newLine = true;

  return (emit:(p:ICoords|null)=>void|boolean, inputChar:Character):boolean|undefined => {

    let endOfWord:boolean = false;
    if (inputChar.char === null) {
      endOfWord = true;
    } else {
      if (newLine) {
        endOfWord = true;
        newLine = false;
      }
      if (typeof inputChar.char === 'string') {
        switch (inputChar.char) {
          case ' ':
            if (!trailingSpaces) {
              trailingSpaces = inputChar;
            }
            break;
          case '\n':
            endOfWord = true;
            newLine = true;
            break;
          default:
            if (trailingSpaces) {
              endOfWord = true;
            }
        }
      }
    }
    if (endOfWord) {
      if (word && !word.equals(inputChar)) {
        if (emit({
            text: word,
            spaces: trailingSpaces || inputChar,
            end: inputChar
          }) === false) {
          return false;
        }
        trailingSpaces = null;
      }
      if (inputChar.char === null) {
        emit(null); // Indicate end of stream
      }

      word = inputChar;
    }
  };
};
