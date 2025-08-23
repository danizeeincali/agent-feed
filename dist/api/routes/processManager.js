"use strict";
/**
 * ProcessManager API Routes
 *
 * Express routes for Claude instance management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ProcessManager_1 = require("../../services/ProcessManager");
const router = (0, express_1.Router)();
// Get current process info
router.get('/info', (req, res) => {
    try {
        const info = ProcessManager_1.processManager.getProcessInfo();
        res.json({ success: true, data: info });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Launch new instance
router.post('/launch', async (req, res) => {
    try {
        const config = req.body;
        const info = await ProcessManager_1.processManager.launchInstance(config);
        res.json({ success: true, data: info });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Kill current instance
router.post('/kill', async (req, res) => {
    try {
        await ProcessManager_1.processManager.killInstance();
        res.json({ success: true, message: 'Instance killed' });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Restart instance
router.post('/restart', async (req, res) => {
    try {
        const info = await ProcessManager_1.processManager.restartInstance();
        res.json({ success: true, data: info });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Update configuration
router.put('/config', (req, res) => {
    try {
        const config = req.body;
        ProcessManager_1.processManager.updateConfig(config);
        res.json({ success: true, message: 'Configuration updated' });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=processManager.js.map