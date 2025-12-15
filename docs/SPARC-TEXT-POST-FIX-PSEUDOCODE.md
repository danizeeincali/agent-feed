# SPARC Pseudocode: Text Post URL Validation & Reply Posting Fix

## Document Metadata
- **Phase**: Pseudocode
- **Component**: Agent Worker Validation & Reply Posting
- **File**: `/workspaces/agent-feed/api-server/worker/agent-worker.js`
- **Lines**: 110-126 (validation), 555-577 (reply posting)
- **Date**: 2025-10-27
- **Author**: SPARC Pseudocode Agent

---

## 1. Ticket Validation Algorithm

### 1.1 Main Validation Flow

```
ALGORITHM: ValidateTicketFields
INPUT: ticket (Object)
OUTPUT: validated ticket (Object) or error

CONSTANTS:
    COMMENT_TYPE = 'comment'
    REPLY_TYPE = 'reply'
    URL_POST_TYPE = 'url'
    TEXT_POST_TYPE = 'text'

BEGIN
    // Step 1: Null/Undefined Check
    IF ticket IS null OR ticket IS undefined THEN
        THROW Error("Ticket object is null or undefined")
    END IF

    // Step 2: Basic Field Existence Check
    basicFields ← ['id', 'agent_id', 'content']
    missingBasic ← []

    FOR EACH field IN basicFields DO
        IF ticket[field] IS null OR ticket[field] IS undefined THEN
            missingBasic.append(field)
        END IF
    END FOR

    IF missingBasic.length > 0 THEN
        THROW Error("Missing required basic fields: " + missingBasic.join(', '))
    END IF

    // Step 3: Determine Ticket Type
    ticketType ← DetermineTicketType(ticket)

    // Step 4: Type-Specific Validation
    CASE ticketType OF
        COMMENT_TYPE:
            ValidateCommentTicket(ticket)
        REPLY_TYPE:
            ValidateReplyTicket(ticket)
        URL_POST_TYPE:
            ValidateUrlPostTicket(ticket)
        TEXT_POST_TYPE:
            ValidateTextPostTicket(ticket)
        DEFAULT:
            THROW Error("Unknown ticket type")
    END CASE

    RETURN ticket
END
```

### 1.2 Ticket Type Determination

```
ALGORITHM: DetermineTicketType
INPUT: ticket (Object)
OUTPUT: ticketType (string)

BEGIN
    // Priority 1: Check metadata.type (explicit type declaration)
    IF ticket.metadata IS NOT null AND ticket.metadata.type IS NOT null THEN
        metaType ← ticket.metadata.type

        // Validate known metadata types
        IF metaType IN ['comment', 'reply'] THEN
            RETURN metaType
        END IF
    END IF

    // Priority 2: Check for parent_post_id (indicates reply)
    IF ticket.metadata IS NOT null AND ticket.metadata.parent_post_id IS NOT null THEN
        RETURN 'reply'
    END IF

    // Priority 3: Check for comment_id (indicates comment interaction)
    IF ticket.metadata IS NOT null AND ticket.metadata.comment_id IS NOT null THEN
        RETURN 'comment'
    END IF

    // Priority 4: Check for URL field (indicates URL post)
    IF ticket.url IS NOT null AND ticket.url IS NOT empty string THEN
        RETURN 'url'
    END IF

    // Priority 5: Default to text post (no URL required)
    RETURN 'text'
END
```

### 1.3 Comment Ticket Validation

```
ALGORITHM: ValidateCommentTicket
INPUT: ticket (Object)
OUTPUT: void (throws error on failure)

BEGIN
    requiredFields ← [
        'id',
        'agent_id',
        'post_id',      // Original post being commented on
        'content',
        'metadata'
    ]

    missingFields ← []

    // Check each required field
    FOR EACH field IN requiredFields DO
        IF ticket[field] IS null OR ticket[field] IS undefined THEN
            missingFields.append(field)
        END IF
    END FOR

    IF missingFields.length > 0 THEN
        THROW Error("Comment ticket missing fields: " + missingFields.join(', '))
    END IF

    // Validate metadata structure
    IF ticket.metadata.type !== 'comment' THEN
        THROW Error("Comment ticket must have metadata.type = 'comment'")
    END IF

    // Validate post_id is valid integer
    IF NOT IsValidInteger(ticket.post_id) THEN
        THROW Error("Comment ticket post_id must be a valid integer")
    END IF

    // Optional: Validate comment_id if present
    IF ticket.metadata.comment_id IS NOT null THEN
        IF NOT IsValidInteger(ticket.metadata.comment_id) THEN
            THROW Error("Invalid comment_id in metadata")
        END IF
    END IF
END
```

### 1.4 Reply Ticket Validation

```
ALGORITHM: ValidateReplyTicket
INPUT: ticket (Object)
OUTPUT: void (throws error on failure)

BEGIN
    requiredFields ← [
        'id',
        'agent_id',
        'post_id',      // This will be the comment_id (for ticket tracking)
        'content',
        'metadata'
    ]

    requiredMetadataFields ← [
        'type',             // Must be 'reply'
        'parent_post_id',   // The actual post ID to post reply to
        'comment_id'        // The comment being replied to
    ]

    missingFields ← []
    missingMetadata ← []

    // Check required fields
    FOR EACH field IN requiredFields DO
        IF ticket[field] IS null OR ticket[field] IS undefined THEN
            missingFields.append(field)
        END IF
    END FOR

    IF missingFields.length > 0 THEN
        THROW Error("Reply ticket missing fields: " + missingFields.join(', '))
    END IF

    // Check required metadata fields
    FOR EACH field IN requiredMetadataFields DO
        IF ticket.metadata[field] IS null OR ticket.metadata[field] IS undefined THEN
            missingMetadata.append(field)
        END IF
    END FOR

    IF missingMetadata.length > 0 THEN
        THROW Error("Reply ticket missing metadata: " + missingMetadata.join(', '))
    END IF

    // Validate metadata.type
    IF ticket.metadata.type !== 'reply' THEN
        THROW Error("Reply ticket must have metadata.type = 'reply'")
    END IF

    // Validate IDs are integers
    IF NOT IsValidInteger(ticket.metadata.parent_post_id) THEN
        THROW Error("parent_post_id must be a valid integer")
    END IF

    IF NOT IsValidInteger(ticket.metadata.comment_id) THEN
        THROW Error("comment_id must be a valid integer")
    END IF
END
```

### 1.5 URL Post Ticket Validation

```
ALGORITHM: ValidateUrlPostTicket
INPUT: ticket (Object)
OUTPUT: void (throws error on failure)

BEGIN
    requiredFields ← [
        'id',
        'agent_id',
        'url',          // URL is REQUIRED for URL posts
        'post_id',
        'content'
    ]

    missingFields ← []

    // Check required fields
    FOR EACH field IN requiredFields DO
        IF ticket[field] IS null OR ticket[field] IS undefined THEN
            missingFields.append(field)
        END IF
    END FOR

    IF missingFields.length > 0 THEN
        THROW Error("URL post ticket missing fields: " + missingFields.join(', '))
    END IF

    // Validate URL format
    IF NOT IsValidUrl(ticket.url) THEN
        THROW Error("Invalid URL format: " + ticket.url)
    END IF

    // Validate URL is not empty string
    IF ticket.url.trim().length === 0 THEN
        THROW Error("URL cannot be empty string")
    END IF
END
```

### 1.6 Text Post Ticket Validation

```
ALGORITHM: ValidateTextPostTicket
INPUT: ticket (Object)
OUTPUT: void (throws error on failure)

BEGIN
    requiredFields ← [
        'id',
        'agent_id',
        'post_id',
        'content'
        // NOTE: 'url' is NOT required for text posts
    ]

    missingFields ← []

    // Check required fields
    FOR EACH field IN requiredFields DO
        IF ticket[field] IS null OR ticket[field] IS undefined THEN
            missingFields.append(field)
        END IF
    END FOR

    IF missingFields.length > 0 THEN
        THROW Error("Text post ticket missing fields: " + missingFields.join(', '))
    END IF

    // Validate content is not empty
    IF ticket.content.trim().length === 0 THEN
        THROW Error("Text post content cannot be empty")
    END IF

    // Optional: Log if URL field exists but is null (informational)
    IF ticket.url IS null OR ticket.url IS undefined THEN
        Log("Text post ticket has no URL field (expected)")
    END IF
END
```

---

## 2. Reply Posting Algorithm

### 2.1 Main Reply Posting Flow

```
ALGORITHM: CreateReply
INPUT: ticket (Object)
OUTPUT: result (Object) with comment data

BEGIN
    // Step 1: Validate ticket is reply type
    IF ticket.metadata IS null OR ticket.metadata.type !== 'reply' THEN
        THROW Error("Ticket is not a reply type")
    END IF

    // Step 2: Extract correct post ID
    actualPostId ← ExtractTargetPostId(ticket)

    // Step 3: Build comment payload
    commentPayload ← BuildCommentPayload(ticket, actualPostId)

    // Step 4: Post comment to API
    result ← PostCommentToApi(actualPostId, commentPayload)

    // Step 5: Return result
    RETURN result
END
```

### 2.2 Extract Target Post ID

```
ALGORITHM: ExtractTargetPostId
INPUT: ticket (Object)
OUTPUT: postId (integer)

ANALYSIS:
    Problem: ticket.post_id contains the comment_id for tracking,
             but we need the actual post ID to post the reply.
    Solution: Use ticket.metadata.parent_post_id which contains
             the actual post ID.

BEGIN
    // Step 1: Check if this is a comment/reply ticket
    isCommentOrReply ← (
        ticket.metadata IS NOT null AND
        ticket.metadata.type IN ['comment', 'reply']
    )

    IF NOT isCommentOrReply THEN
        // For regular posts, use ticket.post_id directly
        RETURN ticket.post_id
    END IF

    // Step 2: For replies, check parent_post_id exists
    IF ticket.metadata.parent_post_id IS null OR
       ticket.metadata.parent_post_id IS undefined THEN
        THROW Error("Reply ticket missing metadata.parent_post_id")
    END IF

    // Step 3: Validate parent_post_id is valid integer
    parentPostId ← ticket.metadata.parent_post_id

    IF NOT IsValidInteger(parentPostId) THEN
        THROW Error("Invalid parent_post_id: " + parentPostId)
    END IF

    // Step 4: Return the actual post ID
    RETURN parentPostId
END
```

### 2.3 Build Comment Payload

```
ALGORITHM: BuildCommentPayload
INPUT: ticket (Object), postId (integer)
OUTPUT: payload (Object)

BEGIN
    // Base comment structure
    payload ← {
        agent_id: ticket.agent_id,
        content: ticket.content,
        skipTicket: true  // Prevent infinite loop
    }

    // Add parent_comment_id if this is a reply
    IF ticket.metadata.type === 'reply' AND
       ticket.metadata.comment_id IS NOT null THEN
        payload.parent_comment_id ← ticket.metadata.comment_id
    END IF

    // Add metadata if present
    IF ticket.metadata IS NOT null THEN
        // Copy relevant metadata fields
        payload.metadata ← {
            original_ticket_id: ticket.id,
            ticket_type: ticket.metadata.type
        }

        // Include comment_id for threading
        IF ticket.metadata.comment_id IS NOT null THEN
            payload.metadata.replying_to_comment ← ticket.metadata.comment_id
        END IF
    END IF

    RETURN payload
END
```

### 2.4 Post Comment to API

```
ALGORITHM: PostCommentToApi
INPUT: postId (integer), payload (Object)
OUTPUT: result (Object)

BEGIN
    // Step 1: Build API endpoint URL
    endpoint ← apiBaseUrl + "/api/agent-posts/" + postId + "/comments"

    // Step 2: Prepare request options
    requestOptions ← {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    }

    // Step 3: Make HTTP request
    TRY
        response ← fetch(endpoint, requestOptions)

        // Step 4: Check response status
        IF NOT response.ok THEN
            errorText ← response.text() OR response.statusText
            THROW Error(
                "Failed to create comment on post " + postId +
                ": " + response.status + " " + errorText
            )
        END IF

        // Step 5: Parse response
        result ← response.json()

        // Step 6: Normalize result format
        normalizedResult ← {
            ...result.data,
            comment_id: result.data.id  // Add comment_id for compatibility
        }

        RETURN normalizedResult

    CATCH error
        // Enhanced error handling
        THROW Error(
            "API request failed for post " + postId + ": " + error.message
        )
    END TRY
END
```

---

## 3. Helper Algorithms

### 3.1 Integer Validation

```
ALGORITHM: IsValidInteger
INPUT: value (any)
OUTPUT: isValid (boolean)

BEGIN
    // Step 1: Check if value exists
    IF value IS null OR value IS undefined THEN
        RETURN false
    END IF

    // Step 2: Check if value is a number
    IF typeof(value) === 'number' THEN
        // Check if it's an integer (not NaN, not Infinity, no decimals)
        IF IsNaN(value) OR NOT IsFinite(value) THEN
            RETURN false
        END IF

        IF value !== Math.floor(value) THEN
            RETURN false
        END IF

        RETURN true
    END IF

    // Step 3: Check if value is a string that represents an integer
    IF typeof(value) === 'string' THEN
        // Try parsing as integer
        parsed ← parseInt(value, 10)

        // Check if parsing was successful
        IF IsNaN(parsed) THEN
            RETURN false
        END IF

        // Check if string representation matches parsed value
        IF value !== parsed.toString() THEN
            RETURN false
        END IF

        RETURN true
    END IF

    // Step 4: All other types are invalid
    RETURN false
END
```

### 3.2 URL Validation

```
ALGORITHM: IsValidUrl
INPUT: url (string)
OUTPUT: isValid (boolean)

BEGIN
    // Step 1: Basic checks
    IF url IS null OR url IS undefined THEN
        RETURN false
    END IF

    IF typeof(url) !== 'string' THEN
        RETURN false
    END IF

    IF url.trim().length === 0 THEN
        RETURN false
    END IF

    // Step 2: Try URL parsing
    TRY
        urlObject ← new URL(url)

        // Step 3: Validate protocol
        IF urlObject.protocol NOT IN ['http:', 'https:'] THEN
            RETURN false
        END IF

        // Step 4: Validate hostname exists
        IF urlObject.hostname IS null OR urlObject.hostname.length === 0 THEN
            RETURN false
        END IF

        RETURN true

    CATCH error
        // URL parsing failed
        RETURN false
    END TRY
END
```

---

## 4. Error Handling Strategy

### 4.1 Validation Error Types

```
STRUCTURE: ValidationErrorTypes

1. MISSING_FIELDS
   - Message: "Missing required fields: {field_list}"
   - Code: 'VALIDATION_MISSING_FIELDS'
   - HTTP Status: 400

2. INVALID_TYPE
   - Message: "Invalid ticket type: {type}"
   - Code: 'VALIDATION_INVALID_TYPE'
   - HTTP Status: 400

3. INVALID_FORMAT
   - Message: "Invalid format for field {field}: {value}"
   - Code: 'VALIDATION_INVALID_FORMAT'
   - HTTP Status: 400

4. INVALID_METADATA
   - Message: "Invalid or missing metadata: {details}"
   - Code: 'VALIDATION_INVALID_METADATA'
   - HTTP Status: 400

5. INVALID_URL
   - Message: "Invalid URL format: {url}"
   - Code: 'VALIDATION_INVALID_URL'
   - HTTP Status: 400

6. INVALID_ID
   - Message: "Invalid ID field {field}: must be integer"
   - Code: 'VALIDATION_INVALID_ID'
   - HTTP Status: 400
```

### 4.2 Error Response Builder

```
ALGORITHM: BuildValidationError
INPUT: errorType (string), details (Object)
OUTPUT: error (Error object)

BEGIN
    error ← new Error()

    CASE errorType OF
        'MISSING_FIELDS':
            error.message ← "Missing required fields: " + details.fields.join(', ')
            error.code ← 'VALIDATION_MISSING_FIELDS'
            error.httpStatus ← 400

        'INVALID_TYPE':
            error.message ← "Invalid ticket type: " + details.type
            error.code ← 'VALIDATION_INVALID_TYPE'
            error.httpStatus ← 400

        'INVALID_FORMAT':
            error.message ← "Invalid format for " + details.field + ": " + details.value
            error.code ← 'VALIDATION_INVALID_FORMAT'
            error.httpStatus ← 400

        'INVALID_METADATA':
            error.message ← "Invalid metadata: " + details.description
            error.code ← 'VALIDATION_INVALID_METADATA'
            error.httpStatus ← 400

        'INVALID_URL':
            error.message ← "Invalid URL format: " + details.url
            error.code ← 'VALIDATION_INVALID_URL'
            error.httpStatus ← 400

        'INVALID_ID':
            error.message ← "Invalid ID field " + details.field + ": must be integer"
            error.code ← 'VALIDATION_INVALID_ID'
            error.httpStatus ← 400

        DEFAULT:
            error.message ← "Validation error: " + details.description
            error.code ← 'VALIDATION_ERROR'
            error.httpStatus ← 400
    END CASE

    error.details ← details
    error.timestamp ← getCurrentTimestamp()

    RETURN error
END
```

---

## 5. Backward Compatibility

### 5.1 Legacy Ticket Format Support

```
ALGORITHM: EnsureBackwardCompatibility
INPUT: ticket (Object)
OUTPUT: normalizedTicket (Object)

PURPOSE:
    Support tickets created before the text post fix.
    These tickets may have inconsistent URL field handling.

BEGIN
    normalizedTicket ← { ...ticket }

    // Step 1: Handle missing metadata
    IF normalizedTicket.metadata IS null OR normalizedTicket.metadata IS undefined THEN
        normalizedTicket.metadata ← {}

        // Infer type from URL presence
        IF normalizedTicket.url IS NOT null AND normalizedTicket.url.length > 0 THEN
            normalizedTicket.metadata.type ← 'url'
        ELSE
            normalizedTicket.metadata.type ← 'text'
        END IF
    END IF

    // Step 2: Handle missing metadata.type
    IF normalizedTicket.metadata.type IS null OR
       normalizedTicket.metadata.type IS undefined THEN

        // Infer from other fields
        IF normalizedTicket.metadata.comment_id IS NOT null THEN
            normalizedTicket.metadata.type ← 'comment'
        ELSE IF normalizedTicket.metadata.parent_post_id IS NOT null THEN
            normalizedTicket.metadata.type ← 'reply'
        ELSE IF normalizedTicket.url IS NOT null AND normalizedTicket.url.length > 0 THEN
            normalizedTicket.metadata.type ← 'url'
        ELSE
            normalizedTicket.metadata.type ← 'text'
        END IF
    END IF

    // Step 3: Normalize URL field
    IF normalizedTicket.url IS undefined THEN
        // Convert undefined to null for consistency
        normalizedTicket.url ← null
    END IF

    IF normalizedTicket.url === '' THEN
        // Convert empty string to null
        normalizedTicket.url ← null
    END IF

    // Step 4: Add version tag for tracking
    IF normalizedTicket.metadata.compatibility_version IS undefined THEN
        normalizedTicket.metadata.compatibility_version ← 'legacy'
    END IF

    RETURN normalizedTicket
END
```

### 5.2 Migration Path

```
ALGORITHM: MigrateTicketFormat
INPUT: legacyTicket (Object)
OUTPUT: modernTicket (Object)

PURPOSE:
    Convert legacy ticket format to modern format with proper
    metadata.type field and consistent URL handling.

BEGIN
    modernTicket ← { ...legacyTicket }

    // Ensure metadata exists
    IF modernTicket.metadata IS null THEN
        modernTicket.metadata ← {}
    END IF

    // Step 1: Determine and set type
    IF legacyTicket.metadata AND legacyTicket.metadata.type THEN
        // Already has type, keep it
        modernTicket.metadata.type ← legacyTicket.metadata.type
    ELSE
        // Infer type from content
        inferredType ← InferTicketType(legacyTicket)
        modernTicket.metadata.type ← inferredType
    END IF

    // Step 2: Normalize URL field
    IF modernTicket.metadata.type IN ['text', 'comment', 'reply'] THEN
        // These types don't require URL
        IF modernTicket.url === '' OR modernTicket.url IS undefined THEN
            modernTicket.url ← null
        END IF
    ELSE IF modernTicket.metadata.type === 'url' THEN
        // URL type requires valid URL
        IF modernTicket.url IS null OR modernTicket.url === '' THEN
            THROW Error("URL post ticket missing valid URL")
        END IF
    END IF

    // Step 3: Add migration metadata
    modernTicket.metadata.migrated_from ← 'legacy'
    modernTicket.metadata.migration_timestamp ← getCurrentTimestamp()

    RETURN modernTicket
END

SUBROUTINE: InferTicketType
INPUT: ticket (Object)
OUTPUT: type (string)

BEGIN
    IF ticket.metadata AND ticket.metadata.comment_id THEN
        RETURN 'comment'
    END IF

    IF ticket.metadata AND ticket.metadata.parent_post_id THEN
        RETURN 'reply'
    END IF

    IF ticket.url AND ticket.url.length > 0 THEN
        RETURN 'url'
    END IF

    RETURN 'text'
END
```

---

## 6. Test Case Algorithms

### 6.1 Text Post Validation Test

```
TEST ALGORITHM: TestTextPostValidation

TEST CASES:
    1. Valid text post (no URL)
    2. Text post with null URL
    3. Text post with undefined URL
    4. Text post with empty content (should fail)
    5. Text post missing agent_id (should fail)

BEGIN
    // Test Case 1: Valid text post
    ticket1 ← {
        id: 'test-1',
        agent_id: 'agent-123',
        post_id: 456,
        content: 'This is a text post without URL',
        url: null,
        metadata: { type: 'text' }
    }

    TRY
        ValidateTicketFields(ticket1)
        ASSERT_SUCCESS("Test 1 passed")
    CATCH error
        ASSERT_FAIL("Test 1 failed: " + error.message)
    END TRY

    // Test Case 2: Text post with null URL
    ticket2 ← {
        id: 'test-2',
        agent_id: 'agent-123',
        post_id: 456,
        content: 'Text post with explicitly null URL',
        url: null
    }

    TRY
        ValidateTicketFields(ticket2)
        ASSERT_SUCCESS("Test 2 passed")
    CATCH error
        ASSERT_FAIL("Test 2 failed: " + error.message)
    END TRY

    // Test Case 3: Text post with undefined URL
    ticket3 ← {
        id: 'test-3',
        agent_id: 'agent-123',
        post_id: 456,
        content: 'Text post without URL field'
        // url field omitted (undefined)
    }

    TRY
        ValidateTicketFields(ticket3)
        ASSERT_SUCCESS("Test 3 passed")
    CATCH error
        ASSERT_FAIL("Test 3 failed: " + error.message)
    END TRY

    // Test Case 4: Empty content (should fail)
    ticket4 ← {
        id: 'test-4',
        agent_id: 'agent-123',
        post_id: 456,
        content: ''
    }

    TRY
        ValidateTicketFields(ticket4)
        ASSERT_FAIL("Test 4 should have failed")
    CATCH error
        ASSERT_SUCCESS("Test 4 correctly failed: " + error.message)
    END TRY

    // Test Case 5: Missing agent_id (should fail)
    ticket5 ← {
        id: 'test-5',
        post_id: 456,
        content: 'Missing agent_id'
    }

    TRY
        ValidateTicketFields(ticket5)
        ASSERT_FAIL("Test 5 should have failed")
    CATCH error
        ASSERT_SUCCESS("Test 5 correctly failed: " + error.message)
    END TRY
END
```

### 6.2 Reply Posting Test

```
TEST ALGORITHM: TestReplyPosting

TEST CASES:
    1. Valid reply with parent_post_id
    2. Reply using ticket.post_id (should fail)
    3. Reply missing parent_post_id (should fail)
    4. Reply with invalid parent_post_id format (should fail)

BEGIN
    // Test Case 1: Valid reply
    ticket1 ← {
        id: 'reply-test-1',
        agent_id: 'agent-123',
        post_id: 999,  // This is the comment_id
        content: 'This is a reply',
        metadata: {
            type: 'reply',
            parent_post_id: 456,  // Actual post ID
            comment_id: 789
        }
    }

    TRY
        postId ← ExtractTargetPostId(ticket1)
        ASSERT_EQUALS(postId, 456, "Should extract parent_post_id")
        ASSERT_SUCCESS("Test 1 passed")
    CATCH error
        ASSERT_FAIL("Test 1 failed: " + error.message)
    END TRY

    // Test Case 2: Verify ticket.post_id is NOT used
    ticket2 ← {
        id: 'reply-test-2',
        agent_id: 'agent-123',
        post_id: 999,  // Wrong ID (comment_id)
        content: 'Reply test',
        metadata: {
            type: 'reply',
            parent_post_id: 456,  // Correct post ID
            comment_id: 789
        }
    }

    TRY
        postId ← ExtractTargetPostId(ticket2)
        ASSERT_NOT_EQUALS(postId, ticket2.post_id,
            "Should NOT use ticket.post_id for replies")
        ASSERT_EQUALS(postId, 456, "Should use parent_post_id")
        ASSERT_SUCCESS("Test 2 passed")
    CATCH error
        ASSERT_FAIL("Test 2 failed: " + error.message)
    END TRY

    // Test Case 3: Missing parent_post_id (should fail)
    ticket3 ← {
        id: 'reply-test-3',
        agent_id: 'agent-123',
        post_id: 999,
        content: 'Reply without parent_post_id',
        metadata: {
            type: 'reply',
            comment_id: 789
            // parent_post_id missing
        }
    }

    TRY
        postId ← ExtractTargetPostId(ticket3)
        ASSERT_FAIL("Test 3 should have failed")
    CATCH error
        ASSERT_SUCCESS("Test 3 correctly failed: " + error.message)
    END TRY

    // Test Case 4: Invalid parent_post_id format
    ticket4 ← {
        id: 'reply-test-4',
        agent_id: 'agent-123',
        post_id: 999,
        content: 'Reply with invalid parent_post_id',
        metadata: {
            type: 'reply',
            parent_post_id: 'not-a-number',
            comment_id: 789
        }
    }

    TRY
        postId ← ExtractTargetPostId(ticket4)
        ASSERT_FAIL("Test 4 should have failed")
    CATCH error
        ASSERT_SUCCESS("Test 4 correctly failed: " + error.message)
    END TRY
END
```

### 6.3 URL Validation Test

```
TEST ALGORITHM: TestUrlValidation

TEST CASES:
    1. Valid HTTP URL
    2. Valid HTTPS URL
    3. Invalid URL format (should fail)
    4. Empty string URL (should fail)
    5. Null URL for text post (should pass)
    6. Null URL for URL post (should fail)

BEGIN
    // Test Case 1: Valid HTTP URL
    url1 ← "http://example.com/article"
    ASSERT_TRUE(IsValidUrl(url1), "Test 1: Valid HTTP URL")

    // Test Case 2: Valid HTTPS URL
    url2 ← "https://example.com/article?id=123"
    ASSERT_TRUE(IsValidUrl(url2), "Test 2: Valid HTTPS URL")

    // Test Case 3: Invalid URL format
    url3 ← "not-a-valid-url"
    ASSERT_FALSE(IsValidUrl(url3), "Test 3: Invalid URL format")

    // Test Case 4: Empty string
    url4 ← ""
    ASSERT_FALSE(IsValidUrl(url4), "Test 4: Empty string")

    // Test Case 5: Null URL for text post
    ticket5 ← {
        id: 'url-test-5',
        agent_id: 'agent-123',
        post_id: 456,
        content: 'Text post',
        url: null,
        metadata: { type: 'text' }
    }

    TRY
        ValidateTicketFields(ticket5)
        ASSERT_SUCCESS("Test 5: Null URL valid for text post")
    CATCH error
        ASSERT_FAIL("Test 5 failed: " + error.message)
    END TRY

    // Test Case 6: Null URL for URL post (should fail)
    ticket6 ← {
        id: 'url-test-6',
        agent_id: 'agent-123',
        post_id: 456,
        content: 'URL post without URL',
        url: null,
        metadata: { type: 'url' }
    }

    TRY
        ValidateTicketFields(ticket6)
        ASSERT_FAIL("Test 6 should have failed")
    CATCH error
        ASSERT_SUCCESS("Test 6 correctly failed: " + error.message)
    END TRY
END
```

---

## 7. Complexity Analysis

### 7.1 Validation Algorithm Complexity

```
ANALYSIS: ValidateTicketFields

Time Complexity:
    - Basic field check: O(n) where n = number of basic fields (3)
    - Type determination: O(1) - constant field checks
    - Type-specific validation: O(m) where m = number of required fields per type
        - Comment: 5 fields
        - Reply: 7 fields (3 base + 4 metadata)
        - URL post: 5 fields
        - Text post: 4 fields
    - Total: O(n + m) = O(1) since n and m are bounded constants

Space Complexity:
    - missingFields array: O(m) where m = max required fields
    - Temporary variables: O(1)
    - Total: O(1) since m is bounded by max 7 fields

Optimization Notes:
    - Early termination on null/undefined ticket
    - Fail-fast on missing basic fields
    - Type determination uses priority order for efficiency
    - No recursive calls or nested loops
```

### 7.2 Reply Posting Complexity

```
ANALYSIS: CreateReply + ExtractTargetPostId

Time Complexity:
    - Type validation: O(1)
    - Extract post ID: O(1) - direct field access
    - Build payload: O(1) - object creation with fixed fields
    - HTTP request: O(network) - depends on network latency
    - JSON parsing: O(r) where r = response size
    - Total: O(network + r)

Space Complexity:
    - Payload object: O(1) - fixed size structure
    - Response data: O(r) where r = response size
    - Total: O(r)

Network Considerations:
    - Single HTTP request per reply
    - No retry logic (delegated to caller)
    - Timeout handling required for production
```

### 7.3 Helper Function Complexity

```
ANALYSIS: IsValidInteger

Time Complexity:
    - Type checks: O(1)
    - Number validation: O(1)
    - String parsing: O(d) where d = number of digits
    - String comparison: O(d)
    - Total: O(d) where d is typically small (<20 digits)
    - Practical: O(1)

Space Complexity:
    - Parsed integer: O(1)
    - String representation: O(d)
    - Total: O(d) ≈ O(1)

ANALYSIS: IsValidUrl

Time Complexity:
    - String checks: O(1)
    - URL parsing: O(u) where u = URL length
    - Protocol/hostname validation: O(1)
    - Total: O(u)

Space Complexity:
    - URL object: O(u) where u = URL length
    - Total: O(u)

Optimization Notes:
    - URL validation could cache results if same URLs validated repeatedly
    - Consider URL length limits (e.g., 2048 chars) for security
```

---

## 8. Edge Cases & Special Considerations

### 8.1 Edge Case Handling

```
EDGE CASES MATRIX:

1. Null/Undefined Fields
   - ticket IS null → FAIL with "Ticket is null"
   - ticket.content IS null → FAIL with "Missing required field: content"
   - ticket.url IS null (text post) → PASS (URL not required)
   - ticket.url IS undefined (text post) → PASS (URL not required)

2. Empty/Whitespace Values
   - ticket.content = "" → FAIL with "Content cannot be empty"
   - ticket.content = "   " → FAIL with "Content cannot be empty"
   - ticket.url = "" (URL post) → FAIL with "URL cannot be empty"
   - ticket.url = "   " (URL post) → FAIL with "Invalid URL format"

3. Type Coercion
   - post_id = "123" (string) → PASS if valid integer string
   - post_id = "123.45" (decimal string) → FAIL with "Invalid integer"
   - post_id = "abc" (non-numeric) → FAIL with "Invalid integer"
   - post_id = 123.0 (number) → PASS if equals floor value

4. Metadata Edge Cases
   - metadata = {} (empty object) → INFER type from other fields
   - metadata.type = "unknown" → FAIL with "Unknown ticket type"
   - metadata.type = null → INFER type from other fields
   - metadata = null (text post) → CREATE default metadata

5. Reply Edge Cases
   - parent_post_id = comment_id → VALID (but logically incorrect, allow)
   - parent_post_id = post_id → VALID (self-reply, allow)
   - parent_post_id missing → FAIL immediately
   - comment_id missing (reply) → FAIL with "Missing comment_id"

6. URL Edge Cases
   - URL with spaces → FAIL (invalid URL format)
   - URL without protocol → FAIL (requires http:// or https://)
   - URL with special chars → PASS if valid URL encoding
   - Data URLs (data:...) → FAIL (only http/https allowed)
   - File URLs (file://...) → FAIL (only http/https allowed)
```

### 8.2 Race Condition Considerations

```
ALGORITHM: HandleConcurrentValidation

SCENARIO: Multiple workers validating same ticket simultaneously

BEGIN
    // Problem: ticket could be modified between validation and processing

    // Solution 1: Optimistic Locking
    IF ticket.version_number EXISTS THEN
        expectedVersion ← ticket.version_number

        // After validation, check version before processing
        currentTicket ← FetchTicket(ticket.id)
        IF currentTicket.version_number !== expectedVersion THEN
            THROW Error("Ticket modified during validation - retry")
        END IF
    END IF

    // Solution 2: Snapshot Validation
    validationSnapshot ← {
        ticket_id: ticket.id,
        validated_at: getCurrentTimestamp(),
        validation_hash: ComputeHash(ticket)
    }

    // Store validation result with snapshot
    StoreValidationResult(validationSnapshot)

    // Before processing, verify snapshot matches
    IF NOT VerifySnapshot(ticket, validationSnapshot) THEN
        THROW Error("Ticket changed after validation")
    END IF
END
```

### 8.3 Security Considerations

```
SECURITY CHECKLIST:

1. Input Sanitization
   ✓ Validate all string lengths (prevent DoS via large strings)
   ✓ Check URL format (prevent SSRF attacks)
   ✓ Validate integer ranges (prevent overflow)
   ✓ Escape special characters in error messages

2. SQL Injection Prevention
   ✓ Use parameterized queries for ID lookups
   ✓ Validate integer IDs before database queries
   ✓ Never concatenate user input into SQL

3. XSS Prevention
   ✓ Sanitize content before display
   ✓ Escape HTML in error messages
   ✓ Validate metadata structure

4. SSRF Prevention
   ✓ Whitelist allowed URL protocols (http, https only)
   ✓ Blacklist internal IP ranges (127.0.0.1, 192.168.x.x, etc.)
   ✓ Validate domain names
   ✓ Set request timeouts

5. Rate Limiting
   ✓ Limit validation attempts per second
   ✓ Track failed validations per ticket
   ✓ Implement exponential backoff

ALGORITHM: ValidateUrlForSsrf
INPUT: url (string)
OUTPUT: isSafe (boolean)

BEGIN
    // Parse URL
    urlObj ← new URL(url)

    // Check protocol
    IF urlObj.protocol NOT IN ['http:', 'https:'] THEN
        RETURN false
    END IF

    // Extract hostname
    hostname ← urlObj.hostname

    // Block localhost
    IF hostname IN ['localhost', '127.0.0.1', '::1'] THEN
        RETURN false
    END IF

    // Block private IP ranges
    IF IsPrivateIpRange(hostname) THEN
        RETURN false
    END IF

    // Block metadata endpoints (cloud providers)
    IF hostname IN ['169.254.169.254', 'metadata.google.internal'] THEN
        RETURN false
    END IF

    RETURN true
END
```

---

## 9. Performance Optimization Strategies

### 9.1 Validation Caching

```
ALGORITHM: CachedValidation
INPUT: ticket (Object)
OUTPUT: validationResult (Object)

PURPOSE:
    Cache validation results to avoid redundant checks for
    identical tickets (e.g., retry scenarios).

DATA STRUCTURE:
    validationCache ← LRU Cache
    Capacity: 1000 entries
    TTL: 5 minutes
    Key: Hash of ticket fields
    Value: { isValid: boolean, errors: array, timestamp: number }

BEGIN
    // Step 1: Compute cache key
    cacheKey ← ComputeTicketHash(ticket)

    // Step 2: Check cache
    cachedResult ← validationCache.get(cacheKey)

    IF cachedResult IS NOT null THEN
        // Cache hit - return cached result
        Log("Validation cache hit for ticket " + ticket.id)
        RETURN cachedResult
    END IF

    // Step 3: Cache miss - perform validation
    TRY
        ValidateTicketFields(ticket)
        result ← {
            isValid: true,
            errors: [],
            timestamp: getCurrentTimestamp()
        }
    CATCH error
        result ← {
            isValid: false,
            errors: [error.message],
            timestamp: getCurrentTimestamp()
        }
    END TRY

    // Step 4: Store in cache
    validationCache.set(cacheKey, result)

    RETURN result
END

ALGORITHM: ComputeTicketHash
INPUT: ticket (Object)
OUTPUT: hash (string)

BEGIN
    // Include only validation-relevant fields
    relevantFields ← {
        id: ticket.id,
        agent_id: ticket.agent_id,
        post_id: ticket.post_id,
        content_length: ticket.content?.length || 0,
        url: ticket.url,
        metadata_type: ticket.metadata?.type,
        metadata_parent_post_id: ticket.metadata?.parent_post_id,
        metadata_comment_id: ticket.metadata?.comment_id
    }

    // Compute SHA-256 hash
    hash ← SHA256(JSON.stringify(relevantFields))

    RETURN hash
END
```

### 9.2 Batch Validation

```
ALGORITHM: BatchValidateTickets
INPUT: tickets (Array of Objects)
OUTPUT: results (Array of ValidationResults)

PURPOSE:
    Validate multiple tickets in parallel to improve throughput.

BEGIN
    results ← []
    validationPromises ← []

    // Step 1: Create validation tasks
    FOR EACH ticket IN tickets DO
        promise ← ASYNC_TASK {
            TRY
                ValidateTicketFields(ticket)
                RETURN {
                    ticket_id: ticket.id,
                    isValid: true,
                    errors: []
                }
            CATCH error
                RETURN {
                    ticket_id: ticket.id,
                    isValid: false,
                    errors: [error.message]
                }
            END TRY
        }
        validationPromises.append(promise)
    END FOR

    // Step 2: Execute in parallel
    results ← AWAIT Promise.all(validationPromises)

    // Step 3: Aggregate results
    summary ← {
        total: results.length,
        valid: results.filter(r => r.isValid).length,
        invalid: results.filter(r => NOT r.isValid).length,
        results: results
    }

    RETURN summary
END
```

---

## 10. Implementation Checklist

### Phase 1: Core Validation Logic
- [ ] Implement DetermineTicketType algorithm
- [ ] Implement ValidateCommentTicket algorithm
- [ ] Implement ValidateReplyTicket algorithm
- [ ] Implement ValidateUrlPostTicket algorithm
- [ ] Implement ValidateTextPostTicket algorithm
- [ ] Implement ValidateTicketFields main flow

### Phase 2: Reply Posting Logic
- [ ] Implement ExtractTargetPostId algorithm
- [ ] Implement BuildCommentPayload algorithm
- [ ] Implement PostCommentToApi algorithm
- [ ] Implement CreateReply main flow

### Phase 3: Helper Functions
- [ ] Implement IsValidInteger algorithm
- [ ] Implement IsValidUrl algorithm
- [ ] Implement error builders

### Phase 4: Backward Compatibility
- [ ] Implement EnsureBackwardCompatibility algorithm
- [ ] Implement MigrateTicketFormat algorithm
- [ ] Test with legacy ticket formats

### Phase 5: Testing
- [ ] Implement unit tests for text post validation
- [ ] Implement unit tests for reply posting
- [ ] Implement unit tests for URL validation
- [ ] Implement integration tests
- [ ] Implement edge case tests
- [ ] Implement security tests

### Phase 6: Performance
- [ ] Implement validation caching
- [ ] Implement batch validation
- [ ] Performance benchmarking
- [ ] Load testing

### Phase 7: Documentation
- [ ] Update API documentation
- [ ] Create migration guide
- [ ] Update error message catalog
- [ ] Create troubleshooting guide

---

## 11. Success Metrics

```
METRICS TO TRACK:

1. Validation Accuracy
   - False positive rate: < 0.1%
   - False negative rate: < 0.01%
   - Edge case coverage: > 95%

2. Performance
   - Validation time: < 10ms per ticket
   - Cache hit rate: > 80%
   - Batch throughput: > 1000 tickets/second

3. Reliability
   - Validation failures: < 1% of total
   - Type detection accuracy: > 99.9%
   - Backward compatibility: 100% legacy tickets supported

4. Security
   - SSRF attempts blocked: 100%
   - Invalid URL formats rejected: 100%
   - SQL injection attempts: 0 successful

5. Developer Experience
   - Error message clarity: > 90% developer satisfaction
   - Debugging time reduction: > 50%
   - False alarm rate: < 5%
```

---

## Appendix A: Data Flow Diagrams

```
TEXT POST FLOW:
┌─────────────┐
│ User Posts  │
│ (No URL)    │
└──────┬──────┘
       │
       v
┌─────────────────┐
│ Create Ticket   │
│ url: null       │
│ metadata: null  │
└──────┬──────────┘
       │
       v
┌─────────────────┐
│ Validate Ticket │
│ DetermineType() │ → 'text'
└──────┬──────────┘
       │
       v
┌─────────────────────┐
│ ValidateTextPost()  │
│ ✓ id, agent_id     │
│ ✓ post_id, content │
│ ✗ url (optional)   │
└──────┬──────────────┘
       │
       v
   ┌───────┐
   │ PASS  │
   └───────┘

REPLY FLOW:
┌──────────────┐
│ User Replies │
│ to Comment   │
└──────┬───────┘
       │
       v
┌────────────────────────┐
│ Create Reply Ticket    │
│ post_id: 999 (comment) │
│ metadata:              │
│   type: 'reply'        │
│   parent_post_id: 456  │
│   comment_id: 789      │
└──────┬─────────────────┘
       │
       v
┌─────────────────────┐
│ ExtractTargetPostId │
│ Returns: 456        │ ← Uses parent_post_id
│ NOT 999             │   (NOT post_id)
└──────┬──────────────┘
       │
       v
┌──────────────────────┐
│ POST to API          │
│ /api/agent-posts/456 │
│ /comments            │
└──────┬───────────────┘
       │
       v
   ┌─────────┐
   │ Success │
   └─────────┘
```

---

## Appendix B: Error Message Catalog

```
ERROR CATALOG:

1. VALIDATION_MISSING_FIELDS
   Message: "Missing required fields: {fields}"
   Example: "Missing required fields: agent_id, content"
   Resolution: Ensure all required fields are present in ticket

2. VALIDATION_INVALID_TYPE
   Message: "Invalid ticket type: {type}"
   Example: "Invalid ticket type: unknown"
   Resolution: Use valid types: text, url, comment, reply

3. VALIDATION_INVALID_URL
   Message: "Invalid URL format: {url}"
   Example: "Invalid URL format: not-a-url"
   Resolution: Provide valid HTTP/HTTPS URL

4. VALIDATION_INVALID_ID
   Message: "Invalid ID field {field}: must be integer"
   Example: "Invalid ID field parent_post_id: must be integer"
   Resolution: Ensure ID fields contain valid integers

5. VALIDATION_EMPTY_CONTENT
   Message: "Content cannot be empty"
   Resolution: Provide non-empty content string

6. VALIDATION_MISSING_METADATA
   Message: "Reply ticket missing metadata: {fields}"
   Example: "Reply ticket missing metadata: parent_post_id"
   Resolution: Include required metadata fields for reply tickets

7. API_REQUEST_FAILED
   Message: "Failed to create comment on post {postId}: {status} {error}"
   Example: "Failed to create comment on post 456: 404 Not Found"
   Resolution: Verify post exists and API is accessible
```

---

## Document Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-27 | 1.0 | Initial pseudocode creation | SPARC Pseudocode Agent |

## Related Documents

- **Specification**: (To be created) `/workspaces/agent-feed/docs/SPARC-TEXT-POST-FIX-SPEC.md`
- **Architecture**: (To be created) `/workspaces/agent-feed/docs/SPARC-TEXT-POST-FIX-ARCHITECTURE.md`
- **Implementation**: `/workspaces/agent-feed/api-server/worker/agent-worker.js`
- **Tests**: (To be created) `/workspaces/agent-feed/tests/integration/text-post-validation.test.js`

---

**End of Pseudocode Document**
