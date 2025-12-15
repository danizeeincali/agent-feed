import { Router } from 'express';
import { PageController } from '../controllers/PageController';
import { validateInput } from '../../../middleware/validation';
import { validateWorkspaceAccess } from '../../../middleware/security';
import { createRateLimiter } from '../../../middleware/security';
import { pageValidators } from '../validators/pageValidators';

const router = Router({ mergeParams: true });

// Rate limiting for page operations
const pageRateLimit = createRateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes

// Initialize controller
let pageController: PageController;

export const setPageController = (controller: PageController) => {
  pageController = controller;
};

// Page CRUD routes
router.get(
  '/',
  pageRateLimit,
  validateWorkspaceAccess('read'),
  async (req, res) => pageController.getPages(req, res)
);

router.post(
  '/',
  pageRateLimit,
  validateWorkspaceAccess('write'),
  validateInput(pageValidators.createPage),
  async (req, res) => pageController.createPage(req, res)
);

router.get(
  '/:pageId',
  pageRateLimit,
  validateWorkspaceAccess('read'),
  async (req, res) => pageController.getPage(req, res)
);

router.put(
  '/:pageId',
  pageRateLimit,
  validateWorkspaceAccess('write'),
  validateInput(pageValidators.updatePage),
  async (req, res) => pageController.updatePage(req, res)
);

router.delete(
  '/:pageId',
  pageRateLimit,
  validateWorkspaceAccess('write'),
  async (req, res) => pageController.deletePage(req, res)
);

// Page publishing and sharing
router.post(
  '/:pageId/publish',
  pageRateLimit,
  validateWorkspaceAccess('write'),
  validateInput(pageValidators.publishPage),
  async (req, res) => pageController.publishPage(req, res)
);

router.post(
  '/:pageId/unpublish',
  pageRateLimit,
  validateWorkspaceAccess('write'),
  async (req, res) => pageController.unpublishPage(req, res)
);

// Page versioning
router.get(
  '/:pageId/versions',
  pageRateLimit,
  validateWorkspaceAccess('read'),
  async (req, res) => pageController.getPageVersions(req, res)
);

router.get(
  '/:pageId/versions/:versionNumber',
  pageRateLimit,
  validateWorkspaceAccess('read'),
  async (req, res) => pageController.getPageVersion(req, res)
);

router.post(
  '/:pageId/versions/:versionNumber/restore',
  pageRateLimit,
  validateWorkspaceAccess('write'),
  async (req, res) => pageController.restorePageVersion(req, res)
);

// Page rendering and preview
router.get(
  '/:pageId/render',
  pageRateLimit,
  validateWorkspaceAccess('read'),
  async (req, res) => pageController.renderPage(req, res)
);

router.post(
  '/:pageId/preview',
  pageRateLimit,
  validateWorkspaceAccess('read'),
  validateInput(pageValidators.previewPage),
  async (req, res) => pageController.previewPage(req, res)
);

// Page validation and security
router.post(
  '/:pageId/validate',
  pageRateLimit,
  validateWorkspaceAccess('read'),
  async (req, res) => pageController.validatePage(req, res)
);

export default router;