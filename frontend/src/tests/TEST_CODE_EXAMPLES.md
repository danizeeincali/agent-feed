# Header ID Generation - TDD Code Examples

Selected examples demonstrating London School TDD patterns from the test suite.

---

## Example 1: Basic ID Generation with Mock Verification

```typescript
it('should convert "Text & Content" to "text-content"', () => {
  // Arrange - Set up mock expectation (London School contract)
  const expectedId = 'text-content';
  mockGenerateId.mockReturnValue(expectedId);

  // Act - Execute the behavior
  render(<Header level={2} title="Text & Content" />);

  // Assert - Verify interactions and state
  expect(mockGenerateId).toHaveBeenCalledWith('Text & Content');
  expect(mockGenerateId).toHaveBeenCalledTimes(1);

  const header = screen.getByRole('heading', { level: 2 });
  expect(header).toHaveAttribute('id', expectedId);
});
```

**London School Principles:**
- Mock defines the contract: `generateHeaderId(string) → string`
- Verify interaction: mock was called with correct arguments
- Verify result: DOM reflects the collaboration

---

## Example 2: Explicit ID - Negative Interaction Testing

```typescript
it('should use explicit id when provided', () => {
  // Arrange
  const explicitId = 'custom-section-id';

  // Act
  render(<Header level={2} title="Some Title" id={explicitId} />);

  // Assert - Verify generation was NOT called (important interaction test)
  expect(mockGenerateId).not.toHaveBeenCalled();

  const header = screen.getByRole('heading', { level: 2 });
  expect(header).toHaveAttribute('id', explicitId);
});
```

**London School Focus:**
- Negative interaction: verify function NOT called when ID provided
- Tests the component's decision-making (which path to take)
- Contract: explicit ID bypasses generation

---

## Example 3: Edge Case with Collaborator Chain

```typescript
it('should handle very long titles (truncate)', () => {
  // Arrange
  const longTitle = 'This is a very long title that should be truncated to a reasonable length for use as an HTML ID attribute';
  const truncatedId = 'this-is-a-very-long-title-that-should-be-truncated';

  mockGenerateId.mockImplementation((title) => {
    mockTruncateTitle(title, 50);
    return truncatedId;
  });

  // Act
  render(<Header level={2} title={longTitle} />);

  // Assert - Verify truncation collaboration
  expect(mockGenerateId).toHaveBeenCalledWith(longTitle);
  expect(mockTruncateTitle).toHaveBeenCalled();

  const header = screen.getByRole('heading', { level: 2 });
  expect(header).toHaveAttribute('id', truncatedId);
});
```

**Collaboration Pattern:**
- Tests multi-step interaction: generateId → truncateTitle
- Mock implementation simulates collaboration
- Verifies both collaborators were engaged

---

## Example 4: Multiple Headers - Sequence Verification

```typescript
it('should work with multiple headers on page', () => {
  // Arrange
  mockGenerateId
    .mockReturnValueOnce('introduction')
    .mockReturnValueOnce('features')
    .mockReturnValueOnce('conclusion');

  const components: ComponentConfig[] = [
    { type: 'header', props: { level: 1, title: 'Introduction' } },
    { type: 'header', props: { level: 2, title: 'Features' } },
    { type: 'header', props: { level: 2, title: 'Conclusion' } }
  ];

  // Act
  render(<DynamicPageRenderer components={components} />);

  // Assert - Verify multiple header collaboration
  expect(mockGenerateId).toHaveBeenCalledTimes(3);
  expect(mockGenerateId).toHaveBeenNthCalledWith(1, 'Introduction');
  expect(mockGenerateId).toHaveBeenNthCalledWith(2, 'Features');
  expect(mockGenerateId).toHaveBeenNthCalledWith(3, 'Conclusion');

  const headers = screen.getAllByRole('heading');
  expect(headers).toHaveLength(3);
  expect(headers[0]).toHaveAttribute('id', 'introduction');
  expect(headers[1]).toHaveAttribute('id', 'features');
  expect(headers[2]).toHaveAttribute('id', 'conclusion');
});
```

**Call Sequence Testing:**
- Verify exact call order with `toHaveBeenNthCalledWith`
- Sequential mock returns for different calls
- Tests collaboration across multiple component instances

---

## Example 5: Contract Definition Test

```typescript
it('should define clear generateHeaderId contract', () => {
  // Arrange - Define expected contract
  const mockImplementation = vi.fn((title: string, existingIds?: Set<string>) => {
    // Contract: takes string and optional Set, returns string
    expect(typeof title).toBe('string');
    if (existingIds) {
      expect(existingIds).toBeInstanceOf(Set);
    }
    return 'test-id';
  });

  mockGenerateId.mockImplementation(mockImplementation);

  // Act
  render(<Header level={2} title="Test" />);

  // Assert - Verify contract was followed
  expect(mockImplementation).toHaveBeenCalled();
  expect(mockGenerateId).toHaveReturnedWith('test-id');
});
```

**Contract Testing:**
- Explicitly defines function signature expectations
- Type checking in test (London School practice)
- Verifies return value contract

---

## Example 6: Integration with Navigation

```typescript
it('should work with sidebar navigation', () => {
  // Arrange - Simulate navigation component using header IDs
  mockGenerateId
    .mockReturnValueOnce('overview')
    .mockReturnValueOnce('getting-started');

  const components: ComponentConfig[] = [
    { type: 'header', props: { level: 2, title: 'Overview' } },
    { type: 'header', props: { level: 2, title: 'Getting Started' } }
  ];

  const mockNavigationLinks = vi.fn();

  // Act
  render(
    <MemoryRouter>
      <div>
        <nav data-testid="sidebar">
          <a href="#overview" onClick={() => mockNavigationLinks('overview')}>
            Overview
          </a>
          <a href="#getting-started" onClick={() => mockNavigationLinks('getting-started')}>
            Getting Started
          </a>
        </nav>
        <DynamicPageRenderer components={components} />
      </div>
    </MemoryRouter>
  );

  // Assert - Verify IDs are available for navigation
  expect(mockGenerateId).toHaveBeenCalledTimes(2);

  const headers = screen.getAllByRole('heading');
  expect(headers[0]).toHaveAttribute('id', 'overview');
  expect(headers[1]).toHaveAttribute('id', 'getting-started');

  // Verify navigation links exist
  const navLinks = screen.getAllByRole('link');
  expect(navLinks[0]).toHaveAttribute('href', '#overview');
  expect(navLinks[1]).toHaveAttribute('href', '#getting-started');
});
```

**Integration Testing:**
- Tests cross-component collaboration
- Verifies navigation contract with headers
- Outside-in approach: test user scenario

---

## Mock Setup Patterns

### Simple Mock Return
```typescript
mockGenerateId.mockReturnValue('expected-id');
```

### Sequential Returns
```typescript
mockGenerateId
  .mockReturnValueOnce('first-id')
  .mockReturnValueOnce('second-id')
  .mockReturnValueOnce('third-id');
```

### Conditional Logic Mock
```typescript
mockGenerateId.mockImplementation((title, existingIds) => {
  if (existingIds && existingIds.has('features')) {
    mockHandleDuplicates('features', existingIds);
    return 'features-2';
  }
  return 'features';
});
```

### Collaborator Triggering
```typescript
mockGenerateId.mockImplementation((title) => {
  if (title.length > 50) {
    mockTruncateTitle(title, 50);
  }
  return sanitizedId;
});
```

---

## Assertion Patterns

### Positive Interaction
```typescript
expect(mockGenerateId).toHaveBeenCalled();
expect(mockGenerateId).toHaveBeenCalledWith('expected-arg');
expect(mockGenerateId).toHaveBeenCalledTimes(3);
```

### Negative Interaction (Key London School Pattern)
```typescript
expect(mockGenerateId).not.toHaveBeenCalled();
```

### Call Order
```typescript
expect(mockServiceA.prepare).toHaveBeenCalledBefore(mockServiceB.process);
expect(mockGenerateId).toHaveBeenNthCalledWith(2, 'second-call-arg');
```

### Return Value
```typescript
expect(mockGenerateId).toHaveReturnedWith('test-id');
```

### DOM State
```typescript
const header = screen.getByRole('heading', { level: 2 });
expect(header).toHaveAttribute('id', 'expected-id');
expect(header).toHaveTextContent('Expected Text');
expect(header.tagName).toBe('H2');
```

---

## London School vs Classical TDD

### London School (Our Approach)
```typescript
// Focus: Verify INTERACTIONS
it('should collaborate with ID generator', () => {
  mockGenerateId.mockReturnValue('test-id');
  
  render(<Header level={2} title="Test" />);
  
  // Verify the conversation happened
  expect(mockGenerateId).toHaveBeenCalledWith('Test');
  expect(screen.getByRole('heading')).toHaveAttribute('id', 'test-id');
});
```

### Classical TDD (Alternative)
```typescript
// Focus: Verify STATE
it('should have correct ID', () => {
  // No mocks - use real implementation
  render(<Header level={2} title="Test" />);
  
  // Just verify final state
  expect(screen.getByRole('heading')).toHaveAttribute('id', 'test');
});
```

**Why London School for This Feature:**
- Header component depends on external utility
- Want to verify component uses utility correctly
- Design feedback: mocks reveal interface needs
- Tests stay fast: no real file system or complex logic

---

## Test Structure Template

```typescript
describe('Feature Category', () => {
  beforeEach(() => {
    // Reset mocks - isolation between tests
    vi.clearAllMocks();
  });

  it('should [expected behavior]', () => {
    // Arrange - Set up mocks and data
    const expectedValue = 'expected-result';
    mockCollaborator.mockReturnValue(expectedValue);
    
    // Act - Execute the behavior
    render(<Component prop="value" />);
    
    // Assert - Verify interactions
    expect(mockCollaborator).toHaveBeenCalledWith('value');
    
    // Assert - Verify state
    const element = screen.getByRole('role');
    expect(element).toHaveAttribute('attr', expectedValue);
  });
});
```

---

## Key Takeaways

1. **Mock First** - Define collaborator contracts before implementation
2. **Verify Interactions** - Test HOW objects work together, not just final state
3. **Negative Tests** - Verify when things should NOT happen
4. **Clear Arrange-Act-Assert** - Maintain structure for readability
5. **One Behavior Per Test** - Focus on single collaboration/scenario
6. **Isolation** - Each test independent with `beforeEach` cleanup

These patterns ensure:
- Fast test execution
- Clear component responsibilities  
- Design feedback during development
- Regression protection
- Living documentation of behavior
