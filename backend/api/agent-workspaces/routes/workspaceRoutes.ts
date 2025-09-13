import { Router } from 'express';
import { WorkspaceController } from '../controllers/WorkspaceController';
import { validateInput } from '../../../middleware/validation';
import { validateWorkspaceAccess } from '../../../middleware/security';
import { createRateLimiter } from '../../../middleware/security';
import { workspaceValidators } from '../validators/workspaceValidators';

const router = Router();

// Rate limiting for workspace operations
const workspaceRateLimit = createRateLimiter(15 * 60 * 1000, 50); // 50 requests per 15 minutes

// Initialize controller (dependency injection handled by app.ts)
let workspaceController: WorkspaceController;

export const setWorkspaceController = (controller: WorkspaceController) => {
  workspaceController = controller;
};

// Workspace CRUD routes
router.post(
  '/',
  workspaceRateLimit,
  validateInput(workspaceValidators.createWorkspace),
  async (req, res) => workspaceController.createWorkspace(req, res)
);

router.get(
  '/:agentName',
  workspaceRateLimit,
  validateWorkspaceAccess('read'),
  async (req, res) => workspaceController.getWorkspace(req, res)
);

router.put(
  '/:agentName',
  workspaceRateLimit,
  validateWorkspaceAccess('write'),
  validateInput(workspaceValidators.updateWorkspace),
  async (req, res) => workspaceController.updateWorkspace(req, res)
);

router.delete(
  '/:agentName',
  workspaceRateLimit,
  validateWorkspaceAccess('admin'),
  async (req, res) => workspaceController.deleteWorkspace(req, res)
);

// Workspace usage and quota management
router.get(
  '/:agentName/usage',
  workspaceRateLimit,
  validateWorkspaceAccess('read'),
  async (req, res) => workspaceController.getWorkspaceUsage(req, res)
);

router.get(
  '/:agentName/permissions',
  workspaceRateLimit,
  validateWorkspaceAccess('admin'),
  async (req, res) => workspaceController.getWorkspacePermissions(req, res)
);

router.post(
  '/:agentName/permissions',
  workspaceRateLimit,
  validateWorkspaceAccess('admin'),
  validateInput(workspaceValidators.grantPermission),
  async (req, res) => workspaceController.grantPermission(req, res)
);

router.delete(
  '/:agentName/permissions/:permissionId',
  workspaceRateLimit,
  validateWorkspaceAccess('admin'),
  async (req, res) => workspaceController.revokePermission(req, res)
);

// Audit and security
router.get(
  '/:agentName/audit-log',
  workspaceRateLimit,
  validateWorkspaceAccess('admin'),
  async (req, res) => workspaceController.getAuditLog(req, res)
);

export default router;