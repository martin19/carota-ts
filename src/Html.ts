import {Per} from "./Per";
import {IFormattingMap} from "./Run";
import {Run} from "./Run";
import {Paragraph} from "./Paragraph";

type INodeHandler = (node:HTMLElement, formatting:IFormattingMap)=>void;

let tag = function (name:string, formattingProperty:string) {
  return (node:HTMLElement, formatting:IFormattingMap)=> {
    if (node.nodeName === name) {
      formatting[formattingProperty] = true;
    }
  };
};

let value = function (type:string, styleProperty:string, formattingProperty:string, transformValue?:(p:string|number|boolean)=>string|number|boolean) {
  return (node:HTMLElement, formatting:IFormattingMap) =>{

    //let val = node[type] && node[type][styleProperty];
    let val:string|number|boolean|null = null;
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

let attrValue = function (styleProperty:string, formattingProperty:string, transformValue?:(p:string|number|boolean)=>string|number|boolean) {
  return value('attributes', styleProperty, formattingProperty, transformValue);
};

let styleValue = function (styleProperty:string, formattingProperty:string, transformValue?:(p:string|number|boolean)=>string|number|boolean) {
  return value('style', styleProperty, formattingProperty, transformValue);
};

let styleFlag = function (styleProperty:string, styleValue:string, formattingProperty:string) {
  return function (node:HTMLElement, formatting:IFormattingMap) {
    if (node.style && node.style.getPropertyValue(styleProperty) === styleValue) {
      formatting[formattingProperty] = true;
    }
  };
};

let obsoleteFontSizes = [6, 7, 9, 10, 12, 16, 20, 30];

let aligns:{[s:string]:boolean} = {left: true, center: true, right: true, justify: true};

let checkAlign = function (value:string) {
  return aligns[value] ? value : 'left';
};

let fontName = function (name:string) {
  let s = name.split(/\s*,\s*/g);
  if (s.length == 0) {
    return name;
  }
  name = s[0];
  let raw = name.match(/^"(.*)"$/);
  if (raw) {
    return raw[1].trim();
  }
  raw = name.match(/^'(.*)'$/);
  if (raw) {
    return raw[1].trim();
  }
  return name;
};

let headings:{[s:string]:number} = {
  H1: 72,
  H2: 20,
  H3: 16,
  H4: 14,
  H5: 12
};

let handlers:Array<INodeHandler> = [
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
    let m = size.match(/^([\d\.]+)pt$/);
    return m ? parseFloat(m[1]) : 10
  }),
  styleValue('letter-spacing','letterSpacing', function(letterSpacing:string) {
    let m =  letterSpacing.match(/^([\d\.]+)em$/);
    return m ? parseFloat(m[1]) : 0
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
    let size = headings[node.nodeName];
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

//let newLines = ['BR', 'P', 'H1', 'H2', 'H3', 'H4', 'H5'];
let isNewLine:{[s:string]:boolean} = {
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
    let root:HTMLDivElement;
    if (typeof html === 'string') {
      root = document.createElement('div');
      root.innerHTML = html;
    } else {
      root = html;
    }

    let runs:Array<Run> = [];
    let currentParagraph:Paragraph = new Paragraph();
    let paragraphs:Array<Paragraph> = [];

    let inSpace = true;
    let cons = new Per<Run>(Run.consolidate()).into(runs);
    let emitRun = (text:string, formatting:IFormattingMap) => {
      cons.submit(new Run(text, formatting, currentParagraph));
    };

    let dealWithSpaces = function (text:string, formatting:IFormattingMap) {
      text = text.replace(/\n+\s*/g, ' ');
      let fullLength = text.length;
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
      if(text.length>0) {
        emitRun(text, formatting);
      }
    };

    function recurse(node:HTMLElement, formatting:IFormattingMap) {
      if (node.nodeType == 3) {
        node.nodeValue && dealWithSpaces(node.nodeValue, formatting);
      } else {
        formatting = Run.cloneFormatting(formatting);

        //let classNames = node.attributes['class'];
        let classNames = node.attributes.getNamedItem("class");
        if (classNames) {
          classNames.value.split(' ').forEach(function (cls:string) {
            let cls_ = classes[cls];
            if (cls_) {
              Object.keys(cls_).forEach(function (key) {
                formatting[key] = cls_[key];
              });
            }
          })
        }

        handlers.forEach((handler:INodeHandler)=> {
          handler(node, formatting);
        });
        if (node.childNodes) {
          for (let n = 0; n < node.childNodes.length; n++) {
            recurse(node.childNodes[n] as HTMLElement, formatting);
          }
        }
        if (isNewLine[node.nodeName]) {
          emitRun('\n', formatting);
          // Add runs to current paragraph, append paragraph to list of paragraphs and 
          // create new paragraph.
          currentParagraph.addRuns(runs);
          paragraphs.push(currentParagraph);
          currentParagraph = new Paragraph();
          runs = [];
          cons = new Per<Run>(Run.consolidate()).into(runs);
          
          inSpace = true;
        }
      }
    }

    recurse(root, {});
    return paragraphs;
  }
}