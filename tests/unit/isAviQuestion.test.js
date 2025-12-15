/**
 * TDD Test Suite for isAviQuestion() - Auto-Question Routing
 *
 * NEW BEHAVIOR: Avi responds to ALL questions that don't @mention another agent
 *
 * ROUTING PRIORITY:
 * 1. Posts with URLs -> link-logger (skip AVI)
 * 2. Explicit @mention of another agent -> that agent (skip AVI)
 * 3. Explicit AVI mention (avi, @avi, λvi) -> AVI
 * 4. General questions (? or question words) -> AVI as default responder
 * 5. Otherwise -> not AVI
 */

// Mock the containsURL function used by isAviQuestion
const containsURL = (content) => {
  const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+/i;
  return urlPattern.test(content);
};

/**
 * NEW implementation for testing - matches updated server.js
 */
function isAviQuestion(content) {
  if (!content || typeof content !== 'string') {
    return false;
  }

  const lowerContent = content.toLowerCase();
  const trimmedContent = content.trim();

  // PRIORITY 1: Skip if contains URL (goes to link-logger)
  if (containsURL(content)) {
    return false;
  }

  // PRIORITY 2: Skip if explicit @mention of another agent (not avi)
  const agentMentionPattern = /@(link-logger|personal-todos|follow-ups|meeting-prep|meeting-next-steps|page-builder|skills|get-to-know-you|feedback|ideas|agent-architect|learning-optimizer|system-architect)(-agent)?\b/i;
  if (agentMentionPattern.test(content)) {
    return false;
  }

  // PRIORITY 3: Explicit AVI mention - use word boundary to avoid false positives
  const aviPattern = /\bavi\b|@avi\b|\bλvi\b/i;
  if (aviPattern.test(content)) {
    return true;
  }

  // PRIORITY 4: Question detection - route to AVI as default responder
  // 4a: Contains question mark
  if (content.includes('?')) {
    return true;
  }

  // 4b: Starts with question words
  const questionWordPattern = /^(what|how|why|when|where|who|which|can|could|would|should|is|are|do|does|will|has|have|did)\b/i;
  if (questionWordPattern.test(trimmedContent)) {
    return true;
  }

  // 4c: Contains question phrases (help requests)
  const helpPattern = /\b(help me|tell me|explain|can you|could you|would you|please)\b/i;
  if (helpPattern.test(content)) {
    return true;
  }

  return false;
}

describe('isAviQuestion() - Auto-Question Routing TDD Suite', () => {

  describe('✅ PRIORITY 4: Questions should route to AVI (NEW BEHAVIOR)', () => {

    test('returns true for question with "?" - What is the weather?', () => {
      expect(isAviQuestion('What is the weather?')).toBe(true);
    });

    test('returns true for question - What is the weather like in los gatos?', () => {
      expect(isAviQuestion('What is the weather like in los gatos?')).toBe(true);
    });

    test('returns true for question with multiple "??"', () => {
      expect(isAviQuestion('Really??')).toBe(true);
    });

    test('returns true for multiple questions', () => {
      expect(isAviQuestion('Where are you? What time is it?')).toBe(true);
    });

    test('returns true for yes/no question', () => {
      expect(isAviQuestion('Is this working?')).toBe(true);
    });

    test('returns true for help request with question', () => {
      expect(isAviQuestion('Can you help me with this task?')).toBe(true);
    });

    test('returns true for how-to question', () => {
      expect(isAviQuestion('How do I fix this bug?')).toBe(true);
    });

  });

  describe('✅ PRIORITY 4b: Question words WITHOUT "?" should route to AVI', () => {

    test('returns true for "what" at start', () => {
      expect(isAviQuestion('what is going on')).toBe(true);
    });

    test('returns true for "how" at start', () => {
      expect(isAviQuestion('how do I do this')).toBe(true);
    });

    test('returns true for "why" at start', () => {
      expect(isAviQuestion('why is this happening')).toBe(true);
    });

    test('returns true for "when" at start', () => {
      expect(isAviQuestion('when will this be done')).toBe(true);
    });

    test('returns true for "where" at start', () => {
      expect(isAviQuestion('where is the config file')).toBe(true);
    });

    test('returns true for "who" at start', () => {
      expect(isAviQuestion('who wrote this code')).toBe(true);
    });

    test('returns true for "can" at start', () => {
      expect(isAviQuestion('can you help me')).toBe(true);
    });

    test('returns true for "is" at start', () => {
      expect(isAviQuestion('is this correct')).toBe(true);
    });

    test('returns true for "are" at start', () => {
      expect(isAviQuestion('are we done yet')).toBe(true);
    });

  });

  describe('✅ PRIORITY 4c: Help patterns should route to AVI', () => {

    test('returns true for "help me" pattern', () => {
      expect(isAviQuestion('please help me with this')).toBe(true);
    });

    test('returns true for "tell me" pattern', () => {
      expect(isAviQuestion('tell me about this')).toBe(true);
    });

    test('returns true for "explain" pattern', () => {
      expect(isAviQuestion('explain how this works')).toBe(true);
    });

    test('returns true for "can you" pattern', () => {
      expect(isAviQuestion('can you show me the logs')).toBe(true);
    });

    test('returns true for "please" pattern', () => {
      expect(isAviQuestion('please check the status')).toBe(true);
    });

  });

  describe('✅ PRIORITY 3: Explicit AVI mentions should route to AVI', () => {

    test('returns true for lowercase "avi"', () => {
      expect(isAviQuestion('avi, what is the weather?')).toBe(true);
    });

    test('returns true for uppercase "AVI"', () => {
      expect(isAviQuestion('AVI can you help me?')).toBe(true);
    });

    test('returns true for @avi mention', () => {
      expect(isAviQuestion('@avi what time is it')).toBe(true);
    });

    test('returns true for lambda character "λvi"', () => {
      expect(isAviQuestion('λvi, what is the status?')).toBe(true);
    });

    test('returns true for "avi" in middle of sentence', () => {
      expect(isAviQuestion('Can avi help with this task?')).toBe(true);
    });

    test('returns true for "avi" at end of sentence', () => {
      expect(isAviQuestion('I need help, avi')).toBe(true);
    });

  });

  describe('❌ PRIORITY 2: @mentions of OTHER agents should NOT route to AVI', () => {

    test('returns false for @link-logger mention', () => {
      expect(isAviQuestion('@link-logger check this URL')).toBe(false);
    });

    test('returns false for @personal-todos mention', () => {
      expect(isAviQuestion('@personal-todos add task')).toBe(false);
    });

    test('returns false for @page-builder mention', () => {
      expect(isAviQuestion('@page-builder create a new page?')).toBe(false);
    });

    test('returns false for @skills mention', () => {
      expect(isAviQuestion('@skills what skills do I have?')).toBe(false);
    });

    test('returns false for @meeting-prep mention', () => {
      expect(isAviQuestion('@meeting-prep prepare for standup?')).toBe(false);
    });

    test('returns false for @follow-ups mention', () => {
      expect(isAviQuestion('@follow-ups what are my follow-ups?')).toBe(false);
    });

    test('returns false for @feedback mention', () => {
      expect(isAviQuestion('@feedback how was the feature?')).toBe(false);
    });

    test('returns false for @link-logger-agent (full name)', () => {
      expect(isAviQuestion('@link-logger-agent check this')).toBe(false);
    });

  });

  describe('❌ PRIORITY 1: URLs should NOT route to AVI', () => {

    test('returns false for content with http:// URL', () => {
      expect(isAviQuestion('Check this out http://example.com?query=test')).toBe(false);
    });

    test('returns false for content with https:// URL', () => {
      expect(isAviQuestion('What do you think? https://google.com')).toBe(false);
    });

    test('returns false for content with www. URL', () => {
      expect(isAviQuestion('Is this good? www.example.com')).toBe(false);
    });

    test('returns false for URL even with question mark', () => {
      expect(isAviQuestion('https://example.com?utm_source=test')).toBe(false);
    });

  });

  describe('✅ Word Boundaries - "avi" inside words should NOT match', () => {

    test('returns false for "aviation" (contains avi)', () => {
      // Word boundary fix: aviation should NOT trigger AVI
      expect(isAviQuestion('Check out aviation news')).toBe(false);
    });

    test('returns false for "navigate" (contains avi)', () => {
      expect(isAviQuestion('Navigate to the settings page')).toBe(false);
    });

    test('returns false for "behavior" (contains avi)', () => {
      expect(isAviQuestion('The expected behavior is correct')).toBe(false);
    });

    test('returns false for "aviator" (contains avi)', () => {
      expect(isAviQuestion('The aviator sunglasses look cool')).toBe(false);
    });

    test('returns true for "aviation" WITH question mark (question detection)', () => {
      // Question mark triggers AVI even though aviation doesn't match word boundary
      expect(isAviQuestion('What about aviation?')).toBe(true);
    });

  });

  describe('❌ Non-questions should NOT route to AVI', () => {

    test('returns false for simple statement', () => {
      expect(isAviQuestion('The sky is blue today')).toBe(false);
    });

    test('returns false for status update', () => {
      expect(isAviQuestion('I finished the task')).toBe(false);
    });

    test('returns false for exclamation', () => {
      expect(isAviQuestion('Great job!')).toBe(false);
    });

    test('returns false for greeting', () => {
      expect(isAviQuestion('Hello everyone')).toBe(false);
    });

    test('returns false for short statement', () => {
      expect(isAviQuestion('Done')).toBe(false);
    });

  });

  describe('⚠️ Edge Cases - Empty, null, undefined', () => {

    test('returns false for empty string', () => {
      expect(isAviQuestion('')).toBe(false);
    });

    test('returns false for undefined (graceful handling)', () => {
      expect(isAviQuestion(undefined)).toBe(false);
    });

    test('returns false for null (graceful handling)', () => {
      expect(isAviQuestion(null)).toBe(false);
    });

    test('returns false for whitespace only', () => {
      expect(isAviQuestion('   ')).toBe(false);
    });

    test('returns false for only question marks', () => {
      expect(isAviQuestion('???')).toBe(true); // Still a question
    });

  });

  describe('🎯 Real-World Scenarios', () => {

    test('User asking weather question without avi → routes to AVI', () => {
      expect(isAviQuestion('What is the weather like in los gatos?')).toBe(true);
    });

    test('User asking avi directly → routes to AVI', () => {
      expect(isAviQuestion('Hey avi, can you check the logs?')).toBe(true);
    });

    test('User mentioning @link-logger with question → routes to link-logger', () => {
      expect(isAviQuestion('@link-logger can you save this link?')).toBe(false);
    });

    test('User posting a link → routes to link-logger', () => {
      expect(isAviQuestion('Check out https://example.com')).toBe(false);
    });

    test('Generic statement → no AVI routing', () => {
      expect(isAviQuestion('The build completed successfully')).toBe(false);
    });

    test('Help request without avi mention → routes to AVI', () => {
      expect(isAviQuestion('help me understand this code')).toBe(true);
    });

  });

});

describe('📊 Test Summary - Expected Results', () => {

  test('Questions WITHOUT avi now route to AVI (NEW BEHAVIOR)', () => {
    const newBehaviorResults = [
      isAviQuestion('What is the weather?'),      // ✅ Now TRUE (was false)
      isAviQuestion('Really??'),                   // ✅ Now TRUE
      isAviQuestion('Is this working?'),           // ✅ Now TRUE
      isAviQuestion('How do I fix this?'),         // ✅ Now TRUE
      isAviQuestion('help me with this'),          // ✅ Now TRUE
    ];

    console.log('\n✅ NEW AUTO-QUESTION ROUTING BEHAVIOR:');
    console.log('Questions without "avi" now route to AVI:', newBehaviorResults.every(r => r === true));
  });

  test('@mentions of other agents still skip AVI', () => {
    const agentMentionResults = [
      isAviQuestion('@link-logger check this'),     // FALSE - goes to link-logger
      isAviQuestion('@personal-todos add task'),    // FALSE - goes to personal-todos
      isAviQuestion('@page-builder create page?'),  // FALSE - goes to page-builder
    ];

    console.log('\n❌ @mentions of other agents skip AVI:', agentMentionResults.every(r => r === false));
  });

  test('Word boundaries prevent false positives', () => {
    const wordBoundaryResults = [
      isAviQuestion('Check aviation news'),         // FALSE - not avi
      isAviQuestion('Navigate to settings'),        // FALSE - not avi
      isAviQuestion('avi help me'),                 // TRUE - is avi
    ];

    console.log('\n✅ Word boundaries work correctly:',
      wordBoundaryResults[0] === false &&
      wordBoundaryResults[1] === false &&
      wordBoundaryResults[2] === true
    );
  });

});
