import {CNode} from "./Node";
import {CarotaDoc} from "./Doc";
import {Dom} from "./Dom";
import {Frame} from "./Frame";
import {Text} from "./Text";
import {Rect} from "./Rect";
import {Editor} from "./Editor";
import {html} from "./Html";
import {Run} from "./Run";
import {EngineData} from "./import/EngineData";
import {Paragraph} from "./Paragraph";

export var carota = {
  Node: CNode,
  Editor: Editor,
  Doc: CarotaDoc,
  Dom: Dom,
  Paragraph : Paragraph,
  Run : Run,
  Html: html,
  Frame: Frame,
  Text: Text,
  Rect: Rect
  //EngineData: EngineData
};