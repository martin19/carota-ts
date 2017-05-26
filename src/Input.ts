import {PositionedWord} from "./PositionedWord";
import {Dom} from "./Dom";
import {Editor} from "./Editor";
import {CNode} from "./Node";
import {Run} from "./Run";
import {Paragraph} from "./Paragraph";

export class Input {
  editor : Editor;

  constructor(editor:Editor, bindInputHandlers : boolean) {
    this.editor = editor;
    if(bindInputHandlers) {
      this.bindHandlersInternal();
    }
    editor.doc.sendKey = this.onKeyDown;
  }

  bindHandlersInternal() {
    Dom.handleEvent(document.body, 'keydown', (ev:KeyboardEvent)=> {
      if (this.onKeyDown(ev.keyCode, ev.shiftKey, ev.ctrlKey)) {
        return false;
      }
    });

    Dom.handleEvent(this.editor.textArea, 'input', ()=> {
      this.onInput();
    });

    this.registerMouseEvent('mousedown', (node:CNode)=> {
      this.onMouseDown(node);
    });

    this.registerMouseEvent('dblclick', (node:CNode)=> {
      this.onDblClick(node);
    });

    this.registerMouseEvent('mousemove', (node:CNode)=> {
      this.onMouseMove(node);
    });

    this.registerMouseEvent('mouseup', (node:CNode)=> {
      this.onMouseUp();
    });
  }

  registerMouseEvent(name:string, handler:(n:CNode)=>void) {
    Dom.handleMouseEvent(this.editor.canvas, name, (e:MouseEvent,x:number,y:number) => {
      let W2E = this.editor.getWorldToEditorTransform();
      let xE = W2E[0] * x + W2E[2] * y + W2E[4];
      let yE = W2E[1] * x + W2E[3] * y + W2E[5];
      let nodes = this.editor.doc.byCoordinate(xE, yE);
      if(nodes) {
        handler(nodes[0]||this.editor.doc.frame);
      }
    });
  }

  onMouseUp() {
    this.editor.selectDragStart = null;
    this.editor.keyboardX = null;
  };

  onMouseMove(node:CNode) {
    let editor = this.editor;
    if (editor.selectDragStart !== null) {
      if (node) {
        editor.focusChar = node.ordinal;
        if (editor.selectDragStart > node.ordinal) {
          editor.doc.select(node.ordinal, editor.selectDragStart);
        } else {
          editor.doc.select(editor.selectDragStart, node.ordinal);
        }
      }
    }
  };

  onDblClick(node:CNode) {
    let editor = this.editor;
    let positionedWord = node.parent();
    if (positionedWord instanceof PositionedWord) {
      editor.doc.select(positionedWord.ordinal, positionedWord.ordinal +
        (positionedWord.word ? positionedWord.word.text.length : positionedWord.length));
    }
  };

  onMouseDown(node:CNode) {
    let editor = this.editor;
    editor.selectDragStart = node.ordinal;
    editor.doc.select(node.ordinal, node.ordinal);
    editor.keyboardX = null;
  };

  onInput() {
    let newText:string|Array<Paragraph> = this.editor.textArea.value;
    if (this.editor.textAreaContent != newText) {
      this.editor.textAreaContent = '';
      this.editor.textArea.value = '';
      if (newText === this.editor.plainClipboard) {
        newText = this.editor.richClipboard;
      }
      this.editor.doc.insert(newText);
    }
  };

  onKeyDown(key:number, selecting:boolean, ctrlKey:boolean) {
    let editor = this.editor;
    editor.nextKeyboardX = null;

    //Note: this prevents the event being propagated to the textarea
    //which causes trouble e.g for CTRL+Z
    let handled = false;

    if (!selecting) {
      editor.keyboardSelect = 0;
    } else if (!editor.keyboardSelect) {
      switch (key) {
        case 37: // left arrow
        case 38: // up - find character above
        case 36: // start of line
        case 33: // page up
          editor.keyboardSelect = -1;
          break;
        case 39: // right arrow
        case 40: // down arrow - find character below
        case 35: // end of line
        case 34: // page down
          editor.keyboardSelect = 1;
          break;
      }
    }

    switch (key) {
      case 37: // left arrow
        if(ctrlKey) {
          this.editor.goWordLeft();
        } else {
          this.editor.goCharLeft();
        }
        break;
      case 39: // right arrow
        if(ctrlKey) {
          this.editor.goWordRight();
        } else {
          this.editor.goCharRight();
        }
        break;
      case 40: // down arrow - find character below
        this.editor.goLineDown();
        break;
      case 38: // up - find character above
        this.editor.goLineUp();
        break;
      case 36: // start of line
        this.editor.goLineStart();
        break;
      case 35: // end of line
        this.editor.goLineEnd();
        break;
      case 33: // page up
        this.editor.goDocStart();
        break;
      case 34: // page down
        this.editor.goDocEnd();
        break;
      case 8: // backspace
        this.editor.delCharBefore();
        break;
      case 46: // del
        this.editor.delCharAfter();
        break;
      case 90: // Z undo
        if (ctrlKey) {
          editor.doc.performUndo();
          handled = true;
        }
        break;
      case 89: // Y undo
        if (ctrlKey) {
          editor.doc.performUndo(true);
          handled = true;
        }
        break;
      case 65: // A select all
        if (ctrlKey) {
          editor.selectAll();
          handled = true;
        }
        break;
      case 67: // C - copy to clipboard
      case 88: // X - cut to clipboard
        if (ctrlKey) {
          // Allow standard handling to take place as well
          editor.richClipboard = editor.doc.selectedRange().save();
          editor.plainClipboard = editor.doc.selectedRange().plainText();
        }
        break;
    }

    return handled;
  };

  updateTextArea() {
    this.editor.textAreaContent = this.editor.doc.selectedRange().plainText();
    if(this.editor.textArea) {
      this.editor.textArea.value = this.editor.textAreaContent;
      this.editor.textArea.select();
    }

    setTimeout(function () {
      if(this.editor.textArea) {
        this.editor.textArea.focus();
        this.editor.textArea.select();
      }
    }.bind(this), 10);
  }
}