import {Per} from "./Per";
import {IFormattingMap} from "./Run";
import {CharacterRun} from "./CharacterRun";

var tag = function (name:string, formattingProperty:string) {
  return function (node:Node, formatting:IFormattingMap) {
    if (node.nodeName === name) {
      formatting[formattingProperty] = true;
    }
  };
};

var value = function (type:string, styleProperty:string, formattingProperty:string, transformValue?:(p:string|number|boolean)=>string|number|boolean) {
  return function (node:HTMLElement, formatting:IFormattingMap) {

    //var val = node[type] && node[type][styleProperty];
    var val:string|number|boolean = null;
    switch(type) {
      case "attributes": val = node.getAttribute(styleProperty); break;
      case "style": val = node.style.getPropertyValue(styleProperty); break;
    }


    if (val) {
      if (transformValue) {
        val = transformValue(val);
      }
      formatting[formattingProperty] = val;
    }
  };
};

var attrValue = function (styleProperty:string, formattingProperty:string, transformValue?:(p:string|number|boolean)=>string|number|boolean) {
  return value('attributes', styleProperty, formattingProperty, transformValue);
};

var styleValue = function (styleProperty:string, formattingProperty:string, transformValue?:(p:string|number|boolean)=>string|number|boolean) {
  return value('style', styleProperty, formattingProperty, transformValue);
};

var styleFlag = function (styleProperty:string, styleValue:string, formattingProperty:string) {
  return function (node:HTMLElement, formatting:IFormattingMap) {
    if (node.style && node.style.getPropertyValue(styleProperty) === styleValue) {
      formatting[formattingProperty] = true;
    }
  };
};

var obsoleteFontSizes = [6, 7, 9, 10, 12, 16, 20, 30];

var aligns:{[s:string]:boolean} = {left: true, center: true, right: true, justify: true};

var checkAlign = function (value:string) {
  return aligns[value] ? value : 'left';
};

var fontName = function (name:string) {
  var s = name.split(/\s*,\s*/g);
  if (s.length == 0) {
    return name;
  }
  name = s[0];
  var raw = name.match(/^"(.*)"$/);
  if (raw) {
    return raw[1].trim();
  }
  raw = name.match(/^'(.*)'$/);
  if (raw) {
    return raw[1].trim();
  }
  return name;
};

var headings:{[s:string]:number} = {
  H1: 30,
  H2: 20,
  H3: 16,
  H4: 14,
  H5: 12
};

var handlers = [
  tag('B', 'bold'),
  tag('STRONG', 'bold'),
  tag('I', 'italic'),
  tag('EM', 'italic'),
  tag('U', 'underline'),
  tag('S', 'strikeout'),
  tag('STRIKE', 'strikeout'),
  tag('DEL', 'strikeout'),
  styleFlag('fontWeight', 'bold', 'bold'),
  styleFlag('fontStyle', 'italic', 'italic'),
  styleFlag('textDecoration', 'underline', 'underline'),
  styleFlag('textDecoration', 'line-through', 'strikeout'),
  styleValue('color', 'color'),
  styleValue('fontFamily', 'font', fontName),
  styleValue('fontSize', 'size', function (size:string) {
    var m = size.match(/^([\d\.]+)pt$/);
    return m ? parseFloat(m[1]) : 10
  }),
  styleValue('textAlign', 'align', checkAlign),
  function (node:Node, formatting:IFormattingMap) {
    if (node.nodeName === 'SUB') {
      formatting["script"] = 'sub';
    }
  },
  function (node:Node, formatting:IFormattingMap) {
    if (node.nodeName === 'SUPER') {
      formatting["script"] = 'super';
    }
  },
  function (node:Node, formatting:IFormattingMap) {
    if (node.nodeName === 'CODE') {
      formatting["font"] = 'monospace';
    }
  },
  function (node:Node, formatting:IFormattingMap) {
    var size = headings[node.nodeName];
    if (size) {
      formatting["size"] = size;
    }
  },
  attrValue('color', 'color'),
  attrValue('face', 'font', fontName),
  attrValue('align', 'align', checkAlign),
  attrValue('size', 'size', function (size:number) {
    return obsoleteFontSizes[size] || 10;
  })
];

//var newLines = ['BR', 'P', 'H1', 'H2', 'H3', 'H4', 'H5'];
var isNewLine:{[s:string]:boolean} = {
  'BR':true,
  'P':true,
  'H1':true,
  'H2':true,
  'H3':true,
  'H4':true,
  'H5':true
};

export class html {
  static parse(html:string|HTMLDivElement, classes:{[s:string]:IFormattingMap}) {
    var root:HTMLDivElement;
    if (typeof html === 'string') {
      root = document.createElement('div');
      root.innerHTML = html;
    } else {
      root = html;
    }

    var result:Array<CharacterRun> = [], inSpace = true;
    var cons = new Per<CharacterRun>(CharacterRun.consolidate()).into(result);
    var emit = function (text:string, formatting:IFormattingMap) {
      cons.submit(new CharacterRun(text, formatting));
    };
    var dealWithSpaces = function (text:string, formatting:IFormattingMap) {
      text = text.replace(/\n+\s*/g, ' ');
      var fullLength = text.length;
      text = text.replace(/^\s+/, '');
      if (inSpace) {
        inSpace = false;
      } else if (fullLength !== text.length) {
        text = ' ' + text;
      }
      fullLength = text.length;
      text = text.replace(/\s+$/, '');
      if (fullLength !== text.length) {
        inSpace = true;
        text += ' ';
      }
      emit(text, formatting);
    };

    function recurse(node:Node, formatting:IFormattingMap) {
      if (node.nodeType == 3) {
        dealWithSpaces(node.nodeValue, formatting);
      } else {
        formatting = CharacterRun.cloneFormatting(formatting);

        //var classNames = node.attributes['class'];
        var classNames = node.attributes.getNamedItem("class");
        if (classNames) {
          classNames.value.split(' ').forEach(function (cls:string) {
            var cls_ = classes[cls];
            if (cls_) {
              Object.keys(cls_).forEach(function (key) {
                formatting[key] = cls_[key];
              });
            }
          })
        }

        handlers.forEach(function (handler) {
          handler(node, formatting);
        });
        if (node.childNodes) {
          for (var n = 0; n < node.childNodes.length; n++) {
            recurse(node.childNodes[n], formatting);
          }
        }
        if (isNewLine[node.nodeName]) {
          emit('\n', formatting);
          inSpace = true;
        }
      }
    }

    recurse(root, {});
    return result;
  }
}