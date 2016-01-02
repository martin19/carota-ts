export class Rect {
  /**
   * left
   */
  public l:number;
  /**
   * top
   */
  public t:number;
  /**
   * width
   */
  public w:number;
  /**
   * height
   */
  public h:number;
  /**
   * right
   */
  public r:number;
  /**
   * bottom
   */
  public b:number;

  constructor(l:number, t:number, w:number, h:number) {
    this.l = l;
    this.t = t;
    this.w = w;
    this.h = h;
    this.r = l + w;
    this.b = t + h;
  }

  //TODO: contains may be off by one
  contains(x:number, y:number) {
    return x >= this.l && x <= (this.l + this.w) &&
      y >= this.t && y <= (this.t + this.h);
  }

  stroke(ctx:CanvasRenderingContext2D) {
    ctx.strokeRect(this.l, this.t, this.w, this.h);
  }

  fill(ctx:CanvasRenderingContext2D) {
    ctx.fillRect(this.l, this.t, this.w, this.h);
  }

  offset(x:number, y:number) {
    return new Rect(this.l + x, this.t + y, this.w, this.h);
  }

  equals(other:Rect) {
    return this.l === other.l && this.t === other.t &&
      this.w === other.w && this.h === other.h;
  }

  center() {
    return {x: this.l + this.w / 2, y: this.t + this.h / 2};
  }
}
