"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = exports.SessionStatus = exports.AutomationStatus = exports.ActionType = exports.TriggerType = exports.FeedStatus = exports.FeedType = void 0;
var FeedType;
(function (FeedType) {
    FeedType["RSS"] = "rss";
    FeedType["ATOM"] = "atom";
    FeedType["JSON"] = "json";
    FeedType["API"] = "api";
    FeedType["WEBHOOK"] = "webhook";
})(FeedType || (exports.FeedType = FeedType = {}));
var FeedStatus;
(function (FeedStatus) {
    FeedStatus["ACTIVE"] = "active";
    FeedStatus["PAUSED"] = "paused";
    FeedStatus["ERROR"] = "error";
    FeedStatus["PENDING"] = "pending";
})(FeedStatus || (exports.FeedStatus = FeedStatus = {}));
var TriggerType;
(function (TriggerType) {
    TriggerType["NEW_ITEM"] = "new_item";
    TriggerType["KEYWORD_MATCH"] = "keyword_match";
    TriggerType["SCHEDULE"] = "schedule";
    TriggerType["CUSTOM"] = "custom";
})(TriggerType || (exports.TriggerType = TriggerType = {}));
var ActionType;
(function (ActionType) {
    ActionType["CLAUDE_FLOW_SPAWN"] = "claude_flow_spawn";
    ActionType["NOTIFICATION"] = "notification";
    ActionType["WEBHOOK"] = "webhook";
    ActionType["EMAIL"] = "email";
    ActionType["CUSTOM"] = "custom";
})(ActionType || (exports.ActionType = ActionType = {}));
var AutomationStatus;
(function (AutomationStatus) {
    AutomationStatus["PENDING"] = "pending";
    AutomationStatus["RUNNING"] = "running";
    AutomationStatus["COMPLETED"] = "completed";
    AutomationStatus["FAILED"] = "failed";
    AutomationStatus["CANCELLED"] = "cancelled";
})(AutomationStatus || (exports.AutomationStatus = AutomationStatus = {}));
var SessionStatus;
(function (SessionStatus) {
    SessionStatus["INITIALIZING"] = "initializing";
    SessionStatus["ACTIVE"] = "active";
    SessionStatus["PAUSED"] = "paused";
    SessionStatus["COMPLETED"] = "completed";
    SessionStatus["FAILED"] = "failed";
})(SessionStatus || (exports.SessionStatus = SessionStatus = {}));
// Error Types
class AppError extends Error {
    statusCode;
    isOperational;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
//# sourceMappingURL=index.js.map