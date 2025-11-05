/**
 * Welcome Content Service
 * Generates welcome posts for new users during system initialization
 *
 * Part of SPARC System Initialization specification
 * Agent 2: Welcome Content System
 *
 * Responsibilities:
 * - Generate Λvi welcome post (strategic + warm tone)
 * - Generate Get-to-Know-You onboarding post (Phase 1)
 * - Generate reference guide post (complete system documentation)
 * - Create all welcome posts in correct order
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Template file paths
const TEMPLATES_DIR = join(__dirname, '../../templates/welcome');
const AVI_TEMPLATE_PATH = join(TEMPLATES_DIR, 'avi-welcome.md');
const ONBOARDING_TEMPLATE_PATH = join(TEMPLATES_DIR, 'onboarding-phase1.md');
const REFERENCE_TEMPLATE_PATH = join(TEMPLATES_DIR, 'reference-guide.md');

/**
 * Generate Λvi's welcome post
 * @param {string} userId - The user ID
 * @param {string} displayName - The user's display name (optional, defaults to generic greeting)
 * @returns {Object} Post data for Λvi's welcome
 */
export function generateAviWelcome(userId, displayName = null) {
  let content = readFileSync(AVI_TEMPLATE_PATH, 'utf-8');

  // Personalize greeting if display name is available
  if (displayName && displayName !== 'User' && displayName !== 'New User') {
    content = content.replace('Welcome!', `Welcome, ${displayName}!`);
  }

  return {
    title: "Welcome to Agent Feed!",
    content: content,
    authorId: userId,
    isAgentResponse: true,
    agentId: 'lambda-vi',
    agent: {
      name: 'lambda-vi',
      displayName: 'Λvi'
    },
    metadata: {
      isSystemInitialization: true,
      welcomePostType: 'avi-welcome',
      createdAt: new Date().toISOString()
    }
  };
}

/**
 * Generate Get-to-Know-You agent's onboarding post (Phase 1)
 * @param {string} userId - The user ID
 * @returns {Object} Post data for onboarding
 */
export function generateOnboardingPost(userId) {
  const content = readFileSync(ONBOARDING_TEMPLATE_PATH, 'utf-8');

  return {
    title: "Hi! Let's Get Started",
    content: content,
    authorId: userId,
    isAgentResponse: true,
    agentId: 'get-to-know-you-agent',
    agent: {
      name: 'get-to-know-you-agent',
      displayName: 'Get-to-Know-You'
    },
    metadata: {
      isSystemInitialization: true,
      welcomePostType: 'onboarding-phase1',
      onboardingPhase: 1,
      onboardingStep: 'name',
      createdAt: new Date().toISOString()
    }
  };
}

/**
 * Generate reference guide post
 * @returns {Object} Post data for reference guide
 */
export function generateReferenceGuide() {
  const content = readFileSync(REFERENCE_TEMPLATE_PATH, 'utf-8');

  return {
    title: "📚 How Agent Feed Works",
    content: content,
    authorId: 'demo-user-123', // System post
    isAgentResponse: true,
    agentId: 'system',
    agent: {
      name: 'system',
      displayName: 'System Guide'
    },
    metadata: {
      isSystemInitialization: true,
      welcomePostType: 'reference-guide',
      isSystemDocumentation: true,
      createdAt: new Date().toISOString()
    }
  };
}

/**
 * Create all welcome posts for a new user
 * Returns array in REVERSE chronological order for correct display
 *
 * Feed displays posts in DESC order (newest first), so we create posts with timestamps:
 * 1. Reference Guide (oldest timestamp T) - will display LAST
 * 2. Onboarding (middle timestamp T+3s) - will display MIDDLE
 * 3. Λvi Welcome (newest timestamp T+6s) - will display FIRST
 *
 * This creates the desired user-visible order:
 * - "Welcome to Agent Feed!" appears FIRST (top of feed)
 * - "Hi! Let's Get Started" appears SECOND (middle)
 * - "📚 How Agent Feed Works" appears THIRD (bottom)
 *
 * @param {string} userId - The user ID
 * @param {string} displayName - The user's display name (optional)
 * @returns {Array<Object>} Array of post data objects in reverse chronological order
 */
export function createAllWelcomePosts(userId, displayName = null) {
  return [
    generateReferenceGuide(),                    // Oldest (T) - will show LAST in DESC feed
    generateOnboardingPost(userId),              // Middle (T+3s) - will show MIDDLE
    generateAviWelcome(userId, displayName)      // Newest (T+6s) - will show FIRST in DESC feed
  ];
}

/**
 * Validate welcome post content
 * Ensures no prohibited language (e.g., "chief of staff")
 *
 * @param {Object} postData - Post data to validate
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
export function validateWelcomeContent(postData) {
  const errors = [];
  const content = postData.content.toLowerCase();

  // AC-2: Check for prohibited "chief of staff" language
  if (content.includes('chief of staff')) {
    errors.push('Content contains prohibited phrase "chief of staff"');
  }

  // Check for required role description in Λvi's post
  if (postData.agentId === 'lambda-vi') {
    if (!content.includes('ai partner') && !content.includes('strategic')) {
      errors.push('Λvi welcome missing required role description');
    }

    if (!content.includes('get-to-know-you')) {
      errors.push('Λvi welcome missing CTA to Get-to-Know-You agent');
    }
  }

  // Check for required content in onboarding post
  if (postData.agentId === 'get-to-know-you-agent') {
    if (!content.includes('what should i call you') && !content.includes('your name')) {
      errors.push('Onboarding post missing name question');
    }
  }

  // Check for required content in reference guide
  if (postData.agentId === 'system') {
    const requiredSections = ['what is agent feed', 'how it works', 'proactive agents'];
    const missingSections = requiredSections.filter(section => !content.includes(section));

    if (missingSections.length > 0) {
      errors.push(`Reference guide missing sections: ${missingSections.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get welcome post statistics
 * @param {Array<Object>} posts - Array of post data
 * @returns {Object} Statistics about welcome posts
 */
export function getWelcomePostStats(posts) {
  return {
    totalPosts: posts.length,
    postTypes: posts.map(p => p.metadata.welcomePostType),
    agents: posts.map(p => p.agentId),
    totalContentLength: posts.reduce((sum, p) => sum + p.content.length, 0),
    averageContentLength: Math.round(posts.reduce((sum, p) => sum + p.content.length, 0) / posts.length)
  };
}

export default {
  generateAviWelcome,
  generateOnboardingPost,
  generateReferenceGuide,
  createAllWelcomePosts,
  validateWelcomeContent,
  getWelcomePostStats
};
