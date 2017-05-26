import {Rect} from "./Rect";
export class CNode {
  type:string;
  _left:number;
  _top:number;
  ordinal:number;
  length:number;
  block:any;

  constructor() {
  }

  children():Array<CNode> {
    return [];
  }

  parent():CNode|null {
    return null;
  }

  /**
   * Returns the first child of this CNode.
   * @returns {CNode}
   */
  first() {
    return this.children()[0];
  }

  /**
   * Returns the last child of this CNode.
   * @returns {CNode}
   */
  last() {
    return this.children()[this.children().length - 1];
  }

  /**
   * Returns the next siblings youngest first descendant.
   * the
   * @returns {CNode}
   */
  next() {
    let self:CNode = this;
    for (; ;) {
      let parent = self.parent();
      if (!parent) {
        return null;
      }
      let siblings = parent.children();
      let next = siblings[siblings.indexOf(self) + 1];
      if (next) {
        for (; ;) {
          let first = next.first();
          if (!first) {
            break;
          }
          next = first;
        }
        return next;
      }
      self = parent;
    }
  }

  /**
   * Returns the previous sibling of this CNode, or if this has no previous sibling,
   * the parent's last child.
   * @returns {CNode}
   */
  previous():CNode|null {
    let parent = this.parent();
    if (!parent) {
      return null;
    }
    let siblings = parent.children();
    let prev = siblings[siblings.indexOf(this) - 1];
    if (prev) {
      return prev;
    }
    let prevParent = parent.previous();
    return !prevParent ? null : prevParent.last();
  }

  byOrdinal(index:number):CNode|null {
    let found:CNode|null = null;
    if (this.children().some((child) => {
        if (index >= child.ordinal && index < child.ordinal + child.length) {
          found = child.byOrdinal(index);
          if (found) {
            return true;
          }
        }
        return false;
      })) {
      return found;
    }
    return this;
  }

  /**
   * Finds a child node by coordinate.
   * @param x
   * @param y
   * @param actualBounds - determines if user set bounds or actual bounds are considered.
   * @returns {CNode}
   */
  findChildByCoordinate(x:number, y: number, actualBounds?:boolean) {
    let found:CNode|null = null;
    if(this.bounds(actualBounds).contains(x,y)) {
      found = this;
      this.children().forEach((child:CNode)=>{
        let foundChild = child.findChildByCoordinate(x,y,actualBounds);
        if(foundChild) {
          found = foundChild;
        }
      });
    }
    return found;
  }

  /**
   * Find closest child node by coordinate.
   * @param x
   * @param y
   * @param actualBounds - determines if user set bounds or actual bounds are considered.
   * @returns {CNode}
   */
  byCoordinate(x:number, y:number, actualBounds?:boolean):CNode[]|null {
    let found:Array<CNode>|null;
    let foundNodes:Array<CNode> = [];

    function dist2(a:{x:number, y:number},b:{x:number, y:number}) {
      return (a.x-b.x)*(a.x-b.x)+(a.y-b.y)*(a.y-b.y);
    }

    this.children().forEach((child:CNode)=> {
      let b = child.bounds(actualBounds);
      if (b.contains(x, y)) {
        found = child.byCoordinate(x, y, actualBounds);
        if (found) {
          foundNodes = foundNodes.concat(found);
          //return true;
        }
      }
    });

    foundNodes.sort((n1:CNode,n2:CNode)=>{
      return dist2(n1.center(),{x:x,y:y}) < dist2(n2.center(),{x:x,y:y}) ? -1 : 1;
    });

    if (foundNodes.length == 0) {
      foundNodes.push(this.last());
      while (foundNodes[0]) {
        let next = foundNodes[0].last();
        if (!next) {
          break;
        }
        foundNodes[0] = next;
      }
    }
    return foundNodes;
  }

  draw(ctx:CanvasRenderingContext2D, viewport?:Rect) {
    this.children().forEach(function (child:CNode) {
      child.draw(ctx,viewport);
    });
  }

  parentOfType(type:string):CNode|null {
    let p = this.parent();
    return (p && (p.type === type ? p : p.parentOfType(type)));
  }

  /**
   * Get bounding box of this CNode.
   * @returns {Rect}
   */
  bounds(actual?:boolean) {
    let l = this._left, t = this._top, r = 0, b = 0;
    this.children().forEach(function (child) {
      let cb = child.bounds();
      l = Math.min(l, cb.l);
      t = Math.min(t, cb.t);
      r = Math.max(r, cb.l + cb.w);
      b = Math.max(b, cb.t + cb.h);
    });
    return new Rect(l, t, r - l, b - t);
  }

  /**
   * Get Center of bounding box.
   * @returns {{x: number, y: number}}
   */
  center() {
    return this.bounds().center();
  }
}


export class generic extends CNode {
  type:string;
  private _children:Array<CNode>;
  private _parent:CNode;
  ordinal:number;
  length:number;

  constructor(type:string, parent:CNode, left?:number, top?:number) {
    super();
    this.type = type;
    this._children = [];
    this._parent = parent;
    this._left = typeof left === 'number' ? left : Number.MAX_VALUE;
    this._top = typeof top === 'number' ? top : Number.MAX_VALUE;
  }

  children() {
    return this._children;
  }

  parent() {
    return this._parent;
  }

  finalize(startDecrement?:number, lengthIncrement?:number) {
    let start = Number.MAX_VALUE, end = 0;
    this._children.forEach(function (child) {
      start = Math.min(start, child.ordinal);
      end = Math.max(end, child.ordinal + child.length);
    });
    this.ordinal = start - (startDecrement || 0);
    this.length = (lengthIncrement || 0) + end - start;
  }
}
