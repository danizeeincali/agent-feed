# Mermaid Diagram Examples

This document demonstrates all the different types of Mermaid diagrams supported by the MarkdownRenderer component.

## 1. Flowchart

A flowchart showing a simple decision tree:

```mermaid
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> E{Fixed?}
    E -->|Yes| C
    E -->|No| F[Ask for Help]
    F --> D
    C --> G[End]
```

## 2. Sequence Diagram

A sequence diagram showing API authentication flow:

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Database

    User->>Frontend: Enter credentials
    Frontend->>API: POST /login
    API->>Database: Verify credentials
    Database-->>API: User data
    API-->>Frontend: JWT Token
    Frontend-->>User: Login success

    Note over User,Database: User is now authenticated

    User->>Frontend: Request data
    Frontend->>API: GET /data (with token)
    API->>Database: Fetch data
    Database-->>API: Return data
    API-->>Frontend: JSON response
    Frontend-->>User: Display data
```

## 3. Class Diagram

A class diagram for a simple e-commerce system:

```mermaid
classDiagram
    class User {
        +String id
        +String email
        +String name
        +login()
        +logout()
    }

    class Product {
        +String id
        +String name
        +Float price
        +Int stock
        +updateStock()
    }

    class Order {
        +String id
        +Date createdAt
        +String status
        +calculateTotal()
        +updateStatus()
    }

    class OrderItem {
        +Int quantity
        +Float price
    }

    User "1" --> "*" Order : places
    Order "1" --> "*" OrderItem : contains
    Product "1" --> "*" OrderItem : referenced by
```

## 4. State Diagram

A state diagram for an order processing system:

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Submitted : submit()
    Submitted --> Processing : validate()
    Processing --> Shipped : ship()
    Processing --> Cancelled : cancel()
    Shipped --> Delivered : deliver()
    Delivered --> [*]
    Cancelled --> [*]

    Processing --> Draft : reject()

    note right of Processing
        Payment verification
        Inventory check
    end note
```

## 5. Entity Relationship Diagram

An ER diagram for a blog database:

```mermaid
erDiagram
    USER ||--o{ POST : writes
    USER ||--o{ COMMENT : makes
    POST ||--o{ COMMENT : has
    POST }o--|| CATEGORY : belongs_to
    POST }o--o{ TAG : has

    USER {
        uuid id PK
        string email UK
        string username
        datetime created_at
    }

    POST {
        uuid id PK
        uuid user_id FK
        uuid category_id FK
        string title
        text content
        datetime published_at
    }

    COMMENT {
        uuid id PK
        uuid user_id FK
        uuid post_id FK
        text content
        datetime created_at
    }

    CATEGORY {
        uuid id PK
        string name UK
        string slug
    }

    TAG {
        uuid id PK
        string name UK
    }
```

## 6. Gantt Chart

A project timeline using Gantt chart:

```mermaid
gantt
    title Web Application Development
    dateFormat YYYY-MM-DD
    section Planning
        Requirements gathering    :done, req, 2025-01-01, 2025-01-10
        Design mockups           :done, design, 2025-01-08, 2025-01-15
    section Development
        Frontend setup           :active, fe1, 2025-01-15, 10d
        Backend API             :active, be1, 2025-01-18, 15d
        Database design         :done, db, 2025-01-15, 5d
        Integration             :inte, after fe1 be1, 7d
    section Testing
        Unit tests              :test1, after inte, 5d
        Integration tests       :test2, after test1, 5d
        User acceptance testing :uat, after test2, 7d
    section Deployment
        Staging deployment      :stage, after uat, 2d
        Production deployment   :prod, after stage, 1d
```

## 7. Pie Chart

A pie chart showing technology stack distribution:

```mermaid
pie title Technology Stack Usage
    "React" : 35
    "TypeScript" : 25
    "Node.js" : 20
    "PostgreSQL" : 10
    "Redis" : 5
    "Docker" : 5
```

## 8. User Journey

A user journey diagram:

```mermaid
journey
    title User Registration Flow
    section Discovery
        Visit homepage: 5: User
        Browse features: 4: User
    section Sign Up
        Click sign up: 5: User
        Fill form: 3: User
        Submit form: 4: User
        Verify email: 2: User, System
    section Onboarding
        Complete profile: 4: User
        Take tutorial: 3: User
        First action: 5: User
```

## 9. Git Graph

A git workflow diagram:

```mermaid
gitGraph
    commit id: "Initial commit"
    commit id: "Add basic structure"
    branch develop
    checkout develop
    commit id: "Add feature A"
    commit id: "Add feature B"
    branch feature-x
    checkout feature-x
    commit id: "Start feature X"
    commit id: "Complete feature X"
    checkout develop
    merge feature-x
    commit id: "Update docs"
    checkout main
    merge develop tag: "v1.0.0"
    checkout develop
    commit id: "Hotfix preparation"
```

## 10. Mindmap

A mindmap for project planning:

```mermaid
mindmap
  root((Web App))
    Frontend
      React
        Components
        Hooks
        Context
      Styling
        Tailwind CSS
        CSS Modules
      State Management
        Redux
        Zustand
    Backend
      Node.js
        Express
        Fastify
      Database
        PostgreSQL
        Redis
      Authentication
        JWT
        OAuth2
    DevOps
      CI/CD
        GitHub Actions
        Jenkins
      Hosting
        AWS
        Vercel
      Monitoring
        Datadog
        Sentry
```

## 11. Timeline

A simple timeline:

```mermaid
timeline
    title Product Development Timeline
    2024 Q1 : Planning Phase
           : Market Research
    2024 Q2 : Development Phase
           : Alpha Release
    2024 Q3 : Testing Phase
           : Beta Release
    2024 Q4 : Launch Phase
           : Production Release
```

## Complex Example: System Architecture

Here's a complex flowchart showing a microservices architecture:

```mermaid
graph TB
    subgraph "Client Layer"
        Web[Web App]
        Mobile[Mobile App]
    end

    subgraph "API Gateway"
        Gateway[API Gateway]
        Auth[Auth Service]
    end

    subgraph "Microservices"
        UserService[User Service]
        OrderService[Order Service]
        ProductService[Product Service]
        PaymentService[Payment Service]
    end

    subgraph "Data Layer"
        UserDB[(User DB)]
        OrderDB[(Order DB)]
        ProductDB[(Product DB)]
    end

    subgraph "External Services"
        PaymentGateway[Payment Gateway]
        EmailService[Email Service]
        Analytics[Analytics]
    end

    Web --> Gateway
    Mobile --> Gateway
    Gateway --> Auth
    Auth --> UserService

    Gateway --> UserService
    Gateway --> OrderService
    Gateway --> ProductService

    UserService --> UserDB
    OrderService --> OrderDB
    ProductService --> ProductDB

    OrderService --> PaymentService
    PaymentService --> PaymentGateway

    UserService --> EmailService
    OrderService --> Analytics
    ProductService --> Analytics

    style Web fill:#e1f5ff
    style Mobile fill:#e1f5ff
    style Gateway fill:#fff4e1
    style Auth fill:#fff4e1
    style PaymentGateway fill:#ffe1e1
    style EmailService fill:#ffe1e1
    style Analytics fill:#ffe1e1
```

## Testing Edge Cases

### Empty Diagram (Will Show Error)

```mermaid

```

### Very Simple Diagram

```mermaid
graph LR
    A --> B
```

### Diagram with Special Characters

```mermaid
graph TD
    A["User Input: 'Hello World'"] --> B{"Valid?"}
    B -->|Yes| C["Success! ✓"]
    B -->|No| D["Error ✗"]
```

---

**Note:** All diagrams are rendered client-side using Mermaid.js with proper error handling and responsive design.
