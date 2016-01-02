export interface ILiteEvent<T> {
  on(handler: { (data?: T): void }):void;
  off(handler: { (data?: T): void }):void;
}

export class LiteEvent<T> implements ILiteEvent<T> {
  private handlers: { (data?: T): void; }[] = [];

  public on(handler: { (data?: T): void }) {
    this.handlers.push(handler);
  }

  public off(handler?: { (data?: T): void }) {
    if(!handler) {
      this.handlers = [];
    } else {
      this.handlers = this.handlers.filter(h => h !== handler);
    }
  }

  public trigger(data?: T) {
    this.handlers.slice(0).forEach(h => h(data));
  }
}