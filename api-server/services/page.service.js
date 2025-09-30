const PageRepository = require('../repositories/page.repository');
const matter = require('gray-matter');
const path = require('path');
const { writeFileSafe, readFileSafe, deleteFileSafe } = require('../utils/file-utils');
const { generatePageId } = require('../utils/db-utils');

class PageService {
  constructor() {
    this.repository = PageRepository;
    this.pagesDirectory = path.join(__dirname, '../../data/agent-pages');
  }

  /**
   * List all pages for an agent
   */
  async listPages(agentId, options = {}) {
    const {
      limit = 20,
      offset = 0,
      status,
      content_type,
      search
    } = options;

    const result = await this.repository.findByAgentId(agentId, {
      limit,
      offset,
      status,
      content_type,
      search
    });

    return result;
  }

  /**
   * Get single page by ID
   */
  async getPage(agentId, pageId) {
    const page = await this.repository.findById(pageId);

    if (!page || page.agent_id !== agentId) {
      return null;
    }

    // Read specification from file if file_path exists
    if (page.file_path) {
      try {
        const filePath = path.join(this.pagesDirectory, page.file_path);
        const content = await readFileSafe(filePath);
        const { content: specification } = matter(content);
        page.specification = specification.trim();
      } catch (error) {
        console.error('Error reading page file:', error.message);
      }
    }

    return page;
  }

  /**
   * Create new page
   */
  async createPage(agentId, data) {
    const pageId = generatePageId();
    const fileName = `${pageId}.md`;

    // Prepare frontmatter
    const frontMatter = {
      id: pageId,
      agent_id: agentId,
      title: data.title,
      content_type: data.content_type || 'json',
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: data.content_metadata || {}
    };

    // Write markdown file
    const fileContent = matter.stringify(
      data.content_value || '',
      frontMatter
    );

    const filePath = path.join(this.pagesDirectory, fileName);
    await writeFileSafe(filePath, fileContent);

    // Insert into database
    await this.repository.create({
      id: pageId,
      agent_id: agentId,
      title: data.title,
      content_type: data.content_type || 'json',
      content_value: data.content_value || '',
      content_metadata: data.content_metadata,
      status: data.status || 'draft',
      tags: data.tags || [],
      file_path: fileName
    });

    return await this.getPage(agentId, pageId);
  }

  /**
   * Update existing page
   */
  async updatePage(agentId, pageId, updates) {
    const existingPage = await this.repository.findById(pageId);

    if (!existingPage || existingPage.agent_id !== agentId) {
      throw new Error('Page not found');
    }

    // Update database record
    await this.repository.update(pageId, {
      title: updates.title,
      content_type: updates.content_type,
      content_value: updates.content_value,
      content_metadata: updates.content_metadata,
      status: updates.status,
      tags: updates.tags
    });

    // Update file if content changed
    if (updates.content_value !== undefined || updates.title !== undefined) {
      const updatedPage = await this.repository.findById(pageId);

      const frontMatter = {
        id: pageId,
        agent_id: agentId,
        title: updates.title || existingPage.title,
        content_type: updates.content_type || existingPage.content_type,
        version: updatedPage.version,
        created_at: existingPage.created_at,
        updated_at: updatedPage.updated_at,
        metadata: updates.content_metadata || existingPage.content_metadata
      };

      const fileContent = matter.stringify(
        updates.content_value || existingPage.content_value,
        frontMatter
      );

      const filePath = path.join(this.pagesDirectory, existingPage.file_path);
      await writeFileSafe(filePath, fileContent);
    }

    return await this.getPage(agentId, pageId);
  }

  /**
   * Delete page
   */
  async deletePage(agentId, pageId) {
    const page = await this.repository.findById(pageId);

    if (!page || page.agent_id !== agentId) {
      throw new Error('Page not found');
    }

    // Delete file
    if (page.file_path) {
      const filePath = path.join(this.pagesDirectory, page.file_path);
      await deleteFileSafe(filePath);
    }

    // Delete from database
    await this.repository.delete(pageId);

    return {
      id: pageId,
      deleted_at: new Date().toISOString()
    };
  }

  /**
   * Publish page
   */
  async publishPage(agentId, pageId) {
    const page = await this.repository.findById(pageId);

    if (!page || page.agent_id !== agentId) {
      throw new Error('Page not found');
    }

    await this.repository.update(pageId, {
      status: 'published'
    });

    return await this.getPage(agentId, pageId);
  }

  /**
   * Unpublish page
   */
  async unpublishPage(agentId, pageId) {
    const page = await this.repository.findById(pageId);

    if (!page || page.agent_id !== agentId) {
      throw new Error('Page not found');
    }

    await this.repository.update(pageId, {
      status: 'draft'
    });

    return await this.getPage(agentId, pageId);
  }
}

module.exports = new PageService();