import {CNode} from "./Node";
import {Text} from "./Text";
import {generic} from "./Node";
import {Frame} from "./Frame";
import {Rect} from "./Rect";
import {ITextMeasurement} from "./Text";
import {CarotaDoc} from "./Doc";

//class inlineNode extends node {
//  inline;
//  _parent : node;
//  length : number;
//  ordinal : number;
//  formatting;
//  measured:ITextMeasurement;
//  left : number;
//  baseline : number;
//  _bounds:rect;
//
//  constructor(inline, parent:node, ordinal:number, length:number, formatting) {
//    super();
//
//    if (!inline.draw || !inline.measure) {
//      throw new Error();
//    }
//
//    this.inline = inline;
//    this._parent = parent;
//    this.ordinal = ordinal;
//    this.length = length;
//    this.formatting = formatting;
//    this.measured = inline.measure(formatting);
//  }
//
//  parent() {
//    return this._parent;
//  }
//
//  draw(ctx:CanvasRenderingContext2D) {
//    this.inline.draw(ctx,
//      this.left,
//      this.baseline,
//      this.measured.width,
//      this.measured.ascent,
//      this.measured.descent,
//      this.formatting);
//  }
//
//  position(left:number, baseline:number, bounds:rect) {
//    this.left = left;
//    this.baseline = baseline;
//    if (bounds) {
//      this._bounds = bounds;
//    }
//  }
//
//  bounds() {
//    return this._bounds || new rect(this.left, this.baseline - this.measured.ascent,
//        this.measured.width, this.measured.ascent + this.measured.descent);
//  }
//
//  byCoordinate(x, y) {
//    if (x <= this.bounds().center().x) {
//      return this;
//    }
//    return this.next();
//  }
//}


//var codes = {
//  number : null,
//  listStart : null,
//  listNext : null,
//};
//
//codes.number = function(obj, number) {
//  var formattedNumber = (number + 1) + '.';
//  return {
//    measure: function(formatting) {
//      return text.measure(formattedNumber, formatting);
//    },
//    draw: function(ctx, x, y, width, ascent, descent, formatting) {
//      text.draw(ctx, formattedNumber, formatting, x, y, width, ascent, descent);
//    }
//  };
//};
//
//var listTerminator = function(obj) {
//  return util.derive(obj, {
//    eof: true,
//    measure: function(formatting) {
//      return { width: 18, ascent: 0, descent: 0 }; // text.measure(text.enter, formatting);
//    },
//    draw: function(ctx, x, y) {
//      // ctx.fillText(text.enter, x, y);
//    }
//  });
//};
//
//codes.listNext = codes.listEnd = listTerminator;
//
//codes.listStart = function(obj, data, allCodes) {
//  return util.derive(obj, {
//    block: function(left, top, width, ordinal, parent, formatting) {
//      var list = new generic('list', parent, left, top),
//        itemNode,
//        itemFrame,
//        itemMarker;
//
//      var indent = 50, spacing = 10;
//
//      var startItem = function(code, formatting) {
//        itemNode = new generic('item', list);
//        var marker = allCodes(code.marker || { $: 'number' }, list.children().length);
//        itemMarker = new inlineNode(marker, itemNode, ordinal, 1, formatting);
//        itemMarker.block = true;
//        itemFrame = frame.wrap(
//          left + indent, top, width - indent, ordinal + 1, itemNode,
//          function(terminatorCode) {
//            return terminatorCode.$ === 'listEnd';
//          },
//          itemMarker.measured.ascent
//        );
//      };
//
//      startItem(obj, formatting);
//
//      return function(inputWord) {
//        if (itemFrame) {
//          itemFrame(function(finishedFrame) {
//            ordinal = finishedFrame.ordinal + finishedFrame.length;
//            var frameBounds = finishedFrame.bounds();
//
//            // get first line and position marker
//            var firstLine = finishedFrame.first();
//            var markerLeft = left + indent - spacing - itemMarker.measured.width;
//            var markerBounds = new rect(left, top, indent, frameBounds.h);
//            if ('baseline' in firstLine) {
//              itemMarker.position(markerLeft, firstLine.baseline, markerBounds);
//            } else {
//              itemMarker.position(markerLeft, top + itemMarker.measured.ascent, markerBounds);
//            }
//
//            top = frameBounds.t + frameBounds.h;
//
//            itemNode.children().push(itemMarker);
//            itemNode.children().push(finishedFrame);
//            itemNode.finalize();
//
//            list.children().push(itemNode);
//            itemNode = itemFrame = itemMarker = null;
//          }, inputWord);
//        } else {
//          ordinal++;
//        }
//
//        if (!itemFrame) {
//          var i = inputWord.code();
//          if (i) {
//            if (i.$ == 'listEnd') {
//              list.finalize();
//              return list;
//            }
//            if (i.$ == 'listNext') {
//              startItem(i, inputWord.codeFormatting());
//            }
//          }
//        }
//      };
//    }
//  });
//};

export class Codes {
  constructor(obj:any, number:number, allCodes:any) {
    //var impl = codes[obj.$];
    //return impl && impl(obj, number, allCodes);
  }

  static editFilter = function(doc:CarotaDoc) {
    //dummy;
  };

  //static editFilter = function (doc) {
  //  var balance = 0;
  //
  //  if (!doc.words.some(function (word, i) {
  //      var code = word.code();
  //      if (code) {
  //        switch (code.$) {
  //          case 'listStart':
  //            balance++;
  //            break;
  //          case 'listNext':
  //            if (balance === 0) {
  //              doc.spliceWordsWithRuns(i, 1, [util.derive(word.codeFormatting(), {
  //                text: {
  //                  $: 'listStart',
  //                  marker: code.marker
  //                }
  //              })]);
  //              return true;
  //            }
  //            break;
  //          case 'listEnd':
  //            if (balance === 0) {
  //              doc.spliceWordsWithRuns(i, 1, []);
  //            }
  //            balance--;
  //            break;
  //        }
  //      }
  //    })) {
  //    if (balance > 0) {
  //      var ending = [];
  //      while (balance > 0) {
  //        balance--;
  //        ending.push({
  //          text: {$: 'listEnd'}
  //        });
  //      }
  //      doc.spliceWordsWithRuns(doc.words.length - 1, 0, ending);
  //    }
  //  }
  //}
}