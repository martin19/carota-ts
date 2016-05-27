import {ICharacterFormatting} from "./Run";
import {Run} from "./Run";
import {CarotaDoc} from "./Doc";

export interface ITextMeasurement {
  ascent : number;
  descent : number;
  ascentUnscaled : number;
  descentUnscaled : number;
  height? : number;
  lineHeight? : number;
  width : number;
}

export class Text {

  static ctxMeasure:CanvasRenderingContext2D = document.createElement("canvas").getContext("2d");

  /**
   * Returns a font CSS/Canvas string based on the settings in a run
   * @param run
   * @return {string}
   */
  static getFontString(run:Run) {

    var size = (run && (<ICharacterFormatting>run.formatting).size) || Run.defaultFormatting.size;

    if (run) {
      switch ((<ICharacterFormatting>run.formatting).script) {
        case 'super':
          size *= CarotaDoc.settings.SuperscriptSize;
          break;
        case 'sub':
          size *= CarotaDoc.settings.SubscriptSize;
          break;
      }
    }

    return (run && (<ICharacterFormatting>run.formatting).italic ? 'italic ' : '') +
      (run && (<ICharacterFormatting>run.formatting).bold ? 'bold ' : '') + ' ' +
      size + 'px ' +
      ((run && (<ICharacterFormatting>run.formatting).font) || Run.defaultFormatting.font);
  }

  /**
   * Applies the style of a run to the canvas context
   * @param ctx
   * @param run
   */
  static applyRunStyle(ctx:CanvasRenderingContext2D, run:Run) {
    ctx.fillStyle = (run && (<ICharacterFormatting>run.formatting).color) || Run.defaultFormatting.color;
    ctx.font = Text.getFontString(run);
  };

  static prepareContext(ctx:CanvasRenderingContext2D) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  };

  /**
   * Generates the value for a CSS style attribute
   * @param run
   * @return {string}
   */
  static getRunStyle(run:Run) {
    var parts:Array<string> = [];
    if (run) {
      var formatting = <ICharacterFormatting>run.formatting;

      parts.push('font: ' + Text.getFontString(run));

      parts.push('; color: ' + (formatting.color || Run.defaultFormatting.color));

      switch (formatting.script) {
        case 'super':
          parts.push('; vertical-align: super');
          break;
        case 'sub':
          parts.push('; vertical-align: sub');
          break;
      }

      if(formatting.lineHeight) {
        if(formatting.lineHeight !== -1) {
          parts.push("; line-height:"+formatting.lineHeight + "px");
        }
      }

      if(formatting.letterSpacing) {
        parts.push("; letter-spacing:"+formatting.letterSpacing + "em");
      }

      if(formatting.verticalScaling) {
        parts.push("; vertical-scaling"+formatting.verticalScaling);
      }

      if(formatting.horizontalScaling) {
        parts.push("; horizontal-scaling"+formatting.horizontalScaling);
      }

      if(formatting.baselineShift) {
        parts.push("; baseline-shift"+formatting.baselineShift);
      }
    }

    return parts.join('');
  }

  static nbsp = String.fromCharCode(160);
  static enter = Text.nbsp; // String.fromCharCode(9166);

  /*
  NOTE: More accurate but only available in canvasv5 API which is only implemented
  in chrome with experimental canvas features turned on.

  static measureText2(text_:string, style:string) {
    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    ctx.font = style.split(";")[0].replace("font:","");
    console.log(ctx.font);
    document.body.appendChild(canvas);
    var metrics = ctx.measureText(text_.replace(/\s/g, Text.nbsp));
    var result:ITextMeasurement = {
      ascent : metrics.fontBoundingBoxAscent,
      height : metrics.fountBoundingBoxAscent + metrics.fontBoundingBoxDescent,
      descent: metrics.fontBoundingBoxDescent,
      width : metrics.width
    };
    canvas.parentNode.removeChild(canvas);
    return result;
  }
  */

  /**
   * Returns width, height, ascent, descent in pixels for the specified text and font.
   * The ascent and descent are measured from the baseline. Note that we add/remove
   * all the DOM elements used for a measurement each time - this is not a significant
   * part of the cost, and if we left the hidden measuring node in the DOM then it
   * would affect the dimensions of the whole page.
   * @param text_
   * @param style
   * @param formatting
   * @return {ITextMeasurement}
   */
  static measureText(text_:string, style:string, formatting:ICharacterFormatting) {
    var span:HTMLSpanElement, block:HTMLDivElement, div:HTMLDivElement;

    span = document.createElement('span');
    block = document.createElement('div');
    div = document.createElement('div');

    block.style.display = 'inline-block';
    block.style.width = '1px';
    block.style.height = '0';

    div.style.visibility = 'hidden';
    div.style.position = 'absolute';
    div.style.top = '0';
    div.style.left = '0';
    div.style.width = '500px';
    div.style.height = '200px';

    div.appendChild(span);
    div.appendChild(block);
    document.body.appendChild(div);
    try {
      var result:ITextMeasurement = {
        ascent : null,
        height : null,
        descent : null,
        width : null,
        lineHeight : null,
        ascentUnscaled : null,
        descentUnscaled : null
      };

      span.setAttribute('style', style);
      var letterSpacing = formatting && formatting.letterSpacing ? formatting.letterSpacing : Run.defaultFormatting.letterSpacing;
      var verticalScaling = formatting && formatting.verticalScaling ? formatting.verticalScaling : Run.defaultFormatting.verticalScaling;
      var horizontalScaling = formatting && formatting.horizontalScaling ? formatting.horizontalScaling : Run.defaultFormatting.horizontalScaling;
      var fontSize = formatting && formatting.size ? formatting.size : Run.defaultFormatting.size;
      //var lineHeight = formatting && formatting.lineHeight ? formatting.lineHeight : Run.defaultFormatting.lineHeight;
      var lineHeight = formatting && formatting.lineHeight ? formatting.lineHeight : fontSize*1.2;
      var baselineShift = formatting && formatting.baselineShift ? formatting.baselineShift : Run.defaultFormatting.baselineShift;
      span.style.lineHeight = "normal";

      span.innerHTML = '';
      span.appendChild(document.createTextNode(text_.replace(/\s/g, Text.nbsp)));

      block.style.verticalAlign = 'baseline';
      result.ascentUnscaled = (block.offsetTop);
      result.ascent = ((block.offsetTop) + ((baselineShift > 0) ? baselineShift : 0)) * verticalScaling;

      block.style.verticalAlign = 'bottom';
      result.height = ((block.offsetTop) - ((baselineShift < 0) ? baselineShift : 0)) * verticalScaling ;

      result.descentUnscaled = (block.offsetTop) - result.ascentUnscaled;
      result.descent = (result.height - result.ascent);

      //TODO: constrain measurements to lineheight.
      //result.ascent = (lineHeight / result.height) * result.ascent;
      //result.descent = (lineHeight / result.height) * result.descent;
      //result.height = lineHeight;

      Text.ctxMeasure.font = style.split(";")[0].replace("font:","");
      //if formatting contains letter spacing, respect in width computation
      if(letterSpacing) {
        //result.width = Text.ctxMeasure.measureText(text_).width + ((text_.length) * letterSpacing * (fontSize * 96 / 72));
        result.width = Text.ctxMeasure.measureText(text_).width + ((text_.length) * letterSpacing * fontSize);
      } else {
        result.width = Text.ctxMeasure.measureText(text_).width;
      }
      result.width *= horizontalScaling;
      result.lineHeight = lineHeight;
    } finally {
      div.parentNode.removeChild(div);
      div = null;
    }
    return result;
  };

  /**
   * Create a function that works like measureText except it caches every result for every
   * unique combination of (text, style) - that is, it memorizes measureText.
   *
   * So for example:
   *
   * var measure = cachedMeasureText();
   *
   * Then you can repeatedly do lots of separate calls to measure, e.g.:
   *
   * var m = measure('Hello, world', 'font: 12pt Arial');
   * console.log(m.ascent, m.descent, m.width);
   *
   * A cache may grow without limit if the text varies a lot. However, during normal interactive
   * editing the growth rate will be slow. If memory consumption becomes a problem, the cache
   * can be occasionally discarded, although of course this will cause a slow down as the cache
   * has to build up again (text measuring is by far the most costly operation we have to do).
   *
   * @return {function(any, any): *}
   */
  static createCachedMeasureText() {
    var cache:{[s:string]:ITextMeasurement} = {};
    return (text_:string, style:string, formatting:ICharacterFormatting)=> {
      var key = style + '<>!&%' + text_;
      var result = cache[key];
      if (!result) {
        cache[key] = result = Text.measureText(text_, style, formatting);
      }
      return result;
    };
  };

  static cachedMeasureText:(text:string,style:string,formatting:ICharacterFormatting)=>ITextMeasurement;

  static measure(str:string, run:Run) {
    var formatting:ICharacterFormatting;
    if(run) {
      formatting = run.formatting;
    }
    return Text.cachedMeasureText(str, Text.getRunStyle(run), formatting);
  };

  static draw(ctx:CanvasRenderingContext2D, str:string, formatting:Run, left:number, baseline:number, width:number, ascent:number, descent:number) {
    Text.prepareContext(ctx);
    Text.applyRunStyle(ctx, formatting);
    switch ((<ICharacterFormatting>formatting.formatting).script) {
      case 'super':
        baseline -= (ascent + descent) * CarotaDoc.settings.SuperscriptPosition;
        break;
      case 'sub':
        baseline += (ascent + descent) * CarotaDoc.settings.SubscriptPosition;
        break;
    }
    //ctx.fillText(str === '\n' ? Text.enter : str, left, baseline);

    var vscale = formatting.formatting["verticalScaling"] || Run.defaultFormatting.verticalScaling;
    var hscale = formatting.formatting["horizontalScaling"] || Run.defaultFormatting.horizontalScaling;
    var baselineShift = formatting.formatting["baselineShift"] || Run.defaultFormatting.baselineShift;

    ctx.scale(hscale,vscale);

    var totalWidth = 0;
    if(str === '\n') {
      ctx.fillText(Text.enter, left/hscale, baseline/vscale);
    } else {
      if(!formatting.formatting["letterSpacing"] || formatting.formatting["letterSpacing"]===0) {
        ctx.fillText(str, left/hscale, baseline/vscale - baselineShift);
        totalWidth = width;
      } else {
        var leftPointer = left;
        for(var i = 0; i < str.length; i++) {
          var measurement = Text.measure(str[i], formatting);
          ctx.fillText(str[i], leftPointer/hscale, baseline/vscale - baselineShift);
          leftPointer += measurement.width;
          totalWidth += measurement.width;
        }
      }
    }

    if ((<ICharacterFormatting>formatting.formatting).underline) {
      ctx.fillRect(left/hscale, (1 + baseline)/vscale - baselineShift, totalWidth/hscale, 1);
    }
    if ((<ICharacterFormatting>formatting.formatting).strikeout) {
      ctx.fillRect(left/hscale, (1 + baseline - (ascent/4))/vscale - ((baselineShift > 0) ? baselineShift/2 : baselineShift) , totalWidth/hscale, 1);
    }

    ctx.scale(1/hscale,1/vscale);
  };
}
Text.cachedMeasureText = Text.createCachedMeasureText();