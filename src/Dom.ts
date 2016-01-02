export class Dom {

  static isAttached(element:HTMLElement) {
    var ancestor = element;
    while (ancestor.parentElement) {
      ancestor = ancestor.parentElement;
    }
    return !!(ancestor.hasOwnProperty("body"));
  };

  static clear(element:HTMLElement) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  };

  static setText(element:HTMLElement, text:string) {
    Dom.clear(element);
    element.appendChild(document.createTextNode(text));
  };

  static handleEvent(element:HTMLElement, name:string, handler:(e:Event)=>boolean|void) {
    element.addEventListener(name, function (ev) {
      if (handler(ev) === false) {
        ev.preventDefault();
      }
    });
  };

  static handleMouseEvent(element:HTMLElement, name:string, handler:(e:MouseEvent,x:number,y:number)=>boolean|void) {
    Dom.handleEvent(element, name, function (ev:MouseEvent) {
      var rect = element.getBoundingClientRect();
      return handler(ev, ev.clientX - rect.left, ev.clientY - rect.top);
    });
  };

  static effectiveStyle(element:HTMLElement, name:string) {
    return document.defaultView.getComputedStyle(element).getPropertyValue(name);
  };

}
