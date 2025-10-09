import { s as styles_default, c as classRenderer_v3_unified_default, a as classDiagram_default, C as ClassDB } from "./chunk-B4BG7PRW-yW9hqZze.js";
import { _ as __name } from "./index-E23w2Ly2.js";
import "./chunk-FMBD7UC4-BLwJPKRH.js";
import "./chunk-55IACEB6-C4Gm1Wll.js";
import "./chunk-QN33PNHL-CiBr1Yvm.js";
import "./query-nnCaEDT4.js";
import "./vendor-Dda1ojue.js";
import "./router-nbYElDQQ.js";
import "./ui-WXJLiGcV.js";
import "./charts-bHvzI7z8.js";
var diagram = {
  parser: classDiagram_default,
  get db() {
    return new ClassDB();
  },
  renderer: classRenderer_v3_unified_default,
  styles: styles_default,
  init: /* @__PURE__ */ __name((cnf) => {
    if (!cnf.class) {
      cnf.class = {};
    }
    cnf.class.arrowMarkerAbsolute = cnf.arrowMarkerAbsolute;
  }, "init")
};
export {
  diagram
};
//# sourceMappingURL=classDiagram-2ON5EDUG-8H8F6qkB.js.map
