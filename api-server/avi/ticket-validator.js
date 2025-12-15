/**
 * Ticket Validator - Field validation for work queue tickets
 *
 * Ensures all required fields are present and properly formatted
 * before ticket processing begins.
 */

export class TicketValidator {
  /**
   * Validate a comment ticket
   * @param {Object} ticket - The ticket object
   * @throws {Error} If validation fails
   * @returns {boolean} True if valid
   */
  validateCommentTicket(ticket) {
    if (!ticket) {
      throw new Error('Ticket object is required');
    }

    // Critical: Must have content field (not post_content)
    if (ticket.content === undefined || ticket.content === null) {
      throw new Error('Missing ticket.content field');
    }

    // Validate content is a string
    if (typeof ticket.content !== 'string') {
      throw new Error('ticket.content must be a string');
    }

    // Validate content is not empty
    if (ticket.content.trim().length === 0) {
      throw new Error('ticket.content cannot be empty');
    }

    // Comment tickets must have parent post ID
    if (!ticket.metadata?.parent_post_id) {
      throw new Error('Missing metadata.parent_post_id for comment ticket');
    }

    return true;
  }

  /**
   * Validate a post ticket
   * @param {Object} ticket - The ticket object
   * @throws {Error} If validation fails
   * @returns {boolean} True if valid
   */
  validatePostTicket(ticket) {
    if (!ticket) {
      throw new Error('Ticket object is required');
    }

    // Critical: Must have content field (not post_content)
    if (ticket.content === undefined || ticket.content === null) {
      throw new Error('Missing ticket.content field');
    }

    // Validate content is a string
    if (typeof ticket.content !== 'string') {
      throw new Error('ticket.content must be a string');
    }

    // Validate content is not empty
    if (ticket.content.trim().length === 0) {
      throw new Error('ticket.content cannot be empty');
    }

    return true;
  }

  /**
   * Validate any ticket type (auto-detects)
   * @param {Object} ticket - The ticket object
   * @throws {Error} If validation fails
   * @returns {boolean} True if valid
   */
  validateTicket(ticket) {
    if (!ticket) {
      throw new Error('Ticket object is required');
    }

    // Determine if this is a comment ticket
    const isComment = ticket.metadata && ticket.metadata.type === 'comment';

    if (isComment) {
      return this.validateCommentTicket(ticket);
    } else {
      return this.validatePostTicket(ticket);
    }
  }

  /**
   * Validate ticket metadata structure
   * @param {Object} metadata - The metadata object
   * @returns {Object} Validation result
   */
  validateMetadata(metadata) {
    const result = {
      valid: true,
      errors: []
    };

    if (!metadata) {
      result.valid = false;
      result.errors.push('Metadata is required');
      return result;
    }

    // Check for type field
    if (!metadata.type) {
      result.errors.push('metadata.type is missing');
    }

    // If it's a comment, check for parent references
    if (metadata.type === 'comment') {
      if (!metadata.parent_post_id) {
        result.valid = false;
        result.errors.push('metadata.parent_post_id is required for comments');
      }
    }

    result.valid = result.errors.length === 0;
    return result;
  }
}

// Export singleton instance for convenience
export const ticketValidator = new TicketValidator();
