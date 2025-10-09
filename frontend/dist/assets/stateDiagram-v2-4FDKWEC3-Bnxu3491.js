import { s as styles_default, b as stateRenderer_v3_unified_default, a as stateDiagram_default, S as StateDB } from "./chunk-DI55MBZ5-BSiwZxN4.js";
import { _ as __name } from "./index-E23w2Ly2.js";
import "./chunk-55IACEB6-C4Gm1Wll.js";
import "./chunk-QN33PNHL-CiBr1Yvm.js";
import "./query-nnCaEDT4.js";
import "./vendor-Dda1ojue.js";
import "./router-nbYElDQQ.js";
import "./ui-WXJLiGcV.js";
import "./charts-bHvzI7z8.js";
var diagram = {
  parser: stateDiagram_default,
  get db() {
    return new StateDB(2);
  },
  renderer: stateRenderer_v3_unified_default,
  styles: styles_default,
  init: /* @__PURE__ */ __name((cnf) => {
    if (!cnf.state) {
      cnf.state = {};
    }
    cnf.state.arrowMarkerAbsolute = cnf.arrowMarkerAbsolute;
  }, "init")
};
export {
  diagram
};
//# sourceMappingURL=stateDiagram-v2-4FDKWEC3-Bnxu3491.js.map
