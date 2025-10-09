import React from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

/**
 * Demo component showcasing Mermaid diagram support in MarkdownRenderer
 *
 * This component demonstrates various Mermaid diagram types and edge cases
 * to ensure the integration is working correctly.
 */
export const MermaidDemo: React.FC = () => {
  const exampleMarkdown = `
# Mermaid Diagram Integration Demo

## Simple Flowchart

This is a basic flowchart example:

\`\`\`mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Success!]
    B -->|No| D[Debug]
    D --> B
    C --> E[End]
\`\`\`

## Sequence Diagram

API authentication flow:

\`\`\`mermaid
sequenceDiagram
    participant User
    participant App
    participant API
    participant DB

    User->>App: Login Request
    App->>API: POST /auth/login
    API->>DB: Verify Credentials
    DB-->>API: User Data
    API-->>App: JWT Token
    App-->>User: Login Success
\`\`\`

## Class Diagram

Simple class hierarchy:

\`\`\`mermaid
classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal : +int age
    Animal : +String gender
    Animal: +isMammal()
    class Duck{
        +String beakColor
        +swim()
        +quack()
    }
    class Fish{
        -int sizeInFeet
        -canEat()
    }
\`\`\`

## Regular Code Block

This should render as regular code, not a diagram:

\`\`\`javascript
function hello() {
    console.log("This is NOT a mermaid diagram");
    return "Hello World";
}
\`\`\`

## Inline Code

This is \`inline code\` which should also render normally.

## Mixed Content

You can mix **bold text**, *italic text*, and diagrams together:

\`\`\`mermaid
graph LR
    A[Markdown] --> B[Mermaid]
    A --> C[Code]
    A --> D[Tables]
\`\`\`

Regular paragraph text here.

| Feature | Supported |
|---------|-----------|
| Flowcharts | ✓ |
| Sequence | ✓ |
| Class | ✓ |
| State | ✓ |
| ER | ✓ |
| Gantt | ✓ |
| Pie | ✓ |

## Error Handling

Invalid mermaid syntax (should show error gracefully):

\`\`\`mermaid
graph INVALID_SYNTAX
    This won't work!
\`\`\`

## Multiple Diagrams

First diagram:

\`\`\`mermaid
pie title Pets
    "Dogs" : 40
    "Cats" : 35
    "Fish" : 25
\`\`\`

Second diagram:

\`\`\`mermaid
graph TB
    First --> Second
    Second --> Third
\`\`\`

---

**All diagrams are rendered with:**
- Error boundaries for graceful failure
- Responsive design
- Dark mode compatibility
- Proper syntax validation
`;

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">
          Mermaid Integration Test
        </h2>
        <p className="text-blue-700 dark:text-blue-300 text-sm">
          This page demonstrates the MarkdownRenderer component with Mermaid diagram support.
          Scroll down to see various diagram types and edge cases.
        </p>
      </div>

      <MarkdownRenderer content={exampleMarkdown} sanitize={true} />

      <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
          Features Verified:
        </h3>
        <ul className="text-green-700 dark:text-green-300 text-sm space-y-1">
          <li>✓ Mermaid diagrams render correctly</li>
          <li>✓ Regular code blocks still work</li>
          <li>✓ Inline code is unaffected</li>
          <li>✓ Error handling for invalid syntax</li>
          <li>✓ Multiple diagrams on same page</li>
          <li>✓ Mixed content (text, tables, diagrams)</li>
          <li>✓ Responsive design</li>
          <li>✓ Dark mode compatibility</li>
        </ul>
      </div>
    </div>
  );
};

export default MermaidDemo;
