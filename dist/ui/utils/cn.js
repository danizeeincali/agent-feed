"use strict";
/**
 * Utility function for conditional class name joining
 * Used throughout the UI components for dynamic styling
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cn = cn;
const clsx_1 = require("clsx");
const tailwind_merge_1 = require("tailwind-merge");
function cn(...inputs) {
    return (0, tailwind_merge_1.twMerge)((0, clsx_1.clsx)(inputs));
}
//# sourceMappingURL=cn.js.map