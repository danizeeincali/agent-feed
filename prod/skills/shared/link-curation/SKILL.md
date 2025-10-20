---
name: Link Curation
description: Comprehensive link management, categorization, and knowledge organization frameworks for building searchable knowledge bases
version: "1.0.0"
category: shared
_protected: false
_allowed_agents: ["link-logger-agent", "research-agent", "meta-agent"]
_last_updated: "2025-10-18"
---

# Link Curation Skill

## Purpose

Provides systematic frameworks for collecting, organizing, categorizing, and maintaining curated collections of web resources. Enables effective knowledge management through structured link curation, metadata extraction, and intelligent tagging systems.

## When to Use This Skill

- Capturing and organizing web resources
- Building searchable knowledge repositories
- Creating curated resource collections
- Managing research link libraries
- Tracking competitive intelligence sources
- Organizing documentation and references
- Building learning resource collections

## Core Frameworks

### 1. Link Capture Framework

**Immediate Capture Protocol**:
```
ESSENTIAL METADATA:
  - URL (canonical, with parameters if meaningful)
  - Title (page title or custom descriptive title)
  - Timestamp (when captured)
  - Capture context (why saved, what for)
  - Source (where found, who shared)

ENRICHMENT DATA:
  - Author/Publisher
  - Publication date
  - Content type (article, video, tool, reference)
  - Domain/Website
  - Access status (public, paywalled, login-required)
  - Language
  - Reading/watch time estimate
```

**Structured Link Entry**:
```json
{
  "link_id": "LINK-YYYY-MM-DD-###",
  "url": "https://example.com/resource",
  "canonical_url": "https://example.com/resource",
  "title": "Descriptive Resource Title",
  "description": "One-sentence summary of content",
  "author": "Author Name or Organization",
  "published_date": "YYYY-MM-DD",
  "captured_date": "YYYY-MM-DD HH:MM",
  "captured_by": "user|agent|automation",
  "capture_context": "Why this was saved",
  "content_type": "article|video|tool|documentation|research",
  "domain": "example.com",
  "tags": ["tag1", "tag2", "tag3"],
  "categories": ["primary-category", "secondary-category"],
  "access": "public|paywalled|login-required",
  "status": "unread|reading|read|archived",
  "priority": "high|medium|low",
  "related_projects": ["project-1", "project-2"],
  "estimated_time": "5 min read",
  "language": "en",
  "notes": "Personal annotations or highlights"
}
```

### 2. URL Normalization and Validation

**URL Cleaning Process**:
```
REMOVE TRACKING PARAMETERS:
  - utm_source, utm_medium, utm_campaign
  - fbclid, gclid, msclkid
  - ref, referrer tracking codes
  - Session IDs and temporary tokens

PRESERVE MEANINGFUL PARAMETERS:
  - ?v= for YouTube videos
  - ?p= or ?id= for article identifiers
  - Query parameters essential for content access
  - Anchor links (#section) if meaningful

CANONICAL URL RESOLUTION:
  - Check for <link rel="canonical"> tags
  - Resolve URL shorteners (bit.ly, tinyurl)
  - Handle redirects to get final destination
  - Normalize protocol (prefer https://)
  - Remove trailing slashes consistently
```

**URL Validation Rules**:
```
VALID URL CRITERIA:
  ✓ Proper protocol (http:// or https://)
  ✓ Valid domain structure
  ✓ Accessible (returns 200 OK or reasonable status)
  ✓ Not dead link (404, 410)
  ✓ Not malicious (phishing, malware)

VALIDATION CHECKS:
  - HTTP status code verification
  - Domain reputation check
  - SSL certificate validation
  - Malware/phishing screening
  - Content-type verification
```

**Duplicate Detection**:
```
PRIMARY KEY: Canonical URL
  - Exact URL match (post-normalization)

FUZZY MATCHING:
  - Similar titles (>90% similarity)
  - Same domain + similar path
  - Multiple shortlinks to same destination
  - Different parameters, same content

MERGE STRATEGY:
  - Keep earliest capture date
  - Merge all tags and categories
  - Combine notes and annotations
  - Preserve all capture contexts
  - Update metadata to most complete version
```

### 3. Categorization System

**Primary Category Hierarchy**:
```
KNOWLEDGE DOMAINS:
├─ Technology
│  ├─ Software Development
│  │  ├─ Frontend Development
│  │  ├─ Backend Development
│  │  ├─ DevOps & Infrastructure
│  │  └─ Testing & QA
│  ├─ AI & Machine Learning
│  ├─ Data Science & Analytics
│  └─ Cybersecurity
├─ Business
│  ├─ Strategy & Planning
│  ├─ Marketing & Sales
│  ├─ Product Management
│  └─ Operations & Finance
├─ Design
│  ├─ UI/UX Design
│  ├─ Visual Design
│  └─ Design Systems
├─ Research
│  ├─ Academic Papers
│  ├─ Industry Reports
│  └─ Case Studies
├─ Learning
│  ├─ Tutorials & Courses
│  ├─ Documentation
│  └─ Reference Materials
└─ Tools & Resources
   ├─ Software Tools
   ├─ Templates & Frameworks
   └─ Datasets & APIs
```

**Content Type Classification**:
```
CONTENT TYPES:
  - Article: Written content, blog posts, essays
  - Video: YouTube, Vimeo, instructional videos
  - Tutorial: Step-by-step instructional content
  - Documentation: Technical docs, API references
  - Tool: Software, web apps, utilities
  - Research: Academic papers, studies, reports
  - Reference: Cheat sheets, quick references
  - Dataset: Data sources, APIs, databases
  - News: Current events, industry news
  - Opinion: Editorials, thought leadership
  - Course: Structured learning programs
  - Podcast: Audio content, interviews
  - Repository: Code repos, open source projects
```

**Quality Indicators**:
```
HIGH QUALITY SIGNALS:
  - Authoritative source (known expert/org)
  - Well-researched and cited
  - Comprehensive coverage
  - Recent and up-to-date
  - Clear, well-written
  - Practical and actionable

QUALITY ASSESSMENT:
  - Authority: 1-5 stars
  - Depth: 1-5 stars
  - Currency: 1-5 stars
  - Clarity: 1-5 stars
  - Utility: 1-5 stars

OVERALL QUALITY = Average of indicators
```

### 4. Tagging Taxonomy

**Tag Structure Principles**:
```
HIERARCHICAL TAGS:
  parent-tag/child-tag/grandchild-tag

  Examples:
  - programming/javascript/react
  - design/ui/components
  - business/marketing/content-marketing

FLAT TAGS (for cross-cutting concerns):
  - #beginner, #intermediate, #advanced
  - #tutorial, #reference, #inspiration
  - #must-read, #quick-read, #deep-dive
```

**Tag Categories**:

**Topic Tags** (What it's about):
```
SPECIFIC TECHNOLOGIES:
  - Languages: #python, #javascript, #rust
  - Frameworks: #react, #django, #nextjs
  - Tools: #git, #docker, #kubernetes
  - Concepts: #authentication, #caching, #api-design

BUSINESS TOPICS:
  - #product-management
  - #growth-hacking
  - #user-research
  - #competitive-analysis
```

**Skill Level Tags**:
```
  - #beginner
  - #intermediate
  - #advanced
  - #expert
```

**Content Format Tags**:
```
  - #tutorial
  - #reference
  - #overview
  - #deep-dive
  - #cheat-sheet
  - #video-tutorial
  - #interactive
```

**Use Case Tags**:
```
  - #troubleshooting
  - #best-practices
  - #getting-started
  - #optimization
  - #migration
  - #comparison
```

**Project Association Tags**:
```
  - #project:website-redesign
  - #project:mobile-app
  - #initiative:performance-improvement
```

**Time-Based Tags**:
```
  - #read-later
  - #read-this-week
  - #weekend-project
  - #ongoing-reference
```

**Priority Tags**:
```
  - #must-read
  - #high-priority
  - #nice-to-have
  - #explore-if-time
```

### 5. Metadata Extraction Framework

**Automatic Extraction**:
```
FROM HTML META TAGS:
  - <title> for page title
  - <meta name="description"> for description
  - <meta name="author"> for author
  - <meta property="og:*"> for Open Graph data
  - <meta name="twitter:*"> for Twitter Card data
  - <meta name="keywords"> for suggested tags
  - <link rel="canonical"> for canonical URL

FROM PAGE STRUCTURE:
  - <h1> for primary heading
  - <time> or <published> for dates
  - <article> content extraction
  - <img> for featured images
  - Reading time estimation from word count

FROM DOMAIN:
  - Domain reputation score
  - Publisher identification
  - Content type patterns (e.g., github.com → code repository)
```

**Enrichment Sources**:
```
WEB APIs:
  - Link preview APIs (microlink.io, opengraph.io)
  - Archive.org for backup/version tracking
  - URLscan.io for security screening
  - Google Safe Browsing API

CONTENT ANALYSIS:
  - Extract main content vs. boilerplate
  - Identify key topics via NLP
  - Suggest tags based on content
  - Estimate reading/watching time
  - Detect content language
```

### 6. Organization Patterns

**Collection Structures**:

**By Project**:
```
PROJECT: Website Redesign
├─ Research
│  ├─ Competitor Analysis Links
│  ├─ Design Inspiration
│  └─ UX Research Studies
├─ Technical Resources
│  ├─ Framework Documentation
│  ├─ Component Libraries
│  └─ Performance Optimization
└─ Assets & Tools
   ├─ Design Tools
   ├─ Stock Photos
   └─ Icon Libraries
```

**By Learning Path**:
```
LEARNING PATH: React Mastery
├─ Fundamentals
│  ├─ Getting Started
│  ├─ Core Concepts
│  └─ Hooks Deep Dive
├─ Intermediate
│  ├─ State Management
│  ├─ Routing
│  └─ Testing
└─ Advanced
   ├─ Performance Optimization
   ├─ Server Components
   └─ Build Tools
```

**By Time/Status**:
```
READING QUEUE:
├─ Read Next (High Priority)
├─ Reading Now
├─ Read This Week
├─ Read This Month
├─ Someday/Maybe
└─ Completed (Archived)
```

**By Content Type**:
```
RESOURCE LIBRARY:
├─ Quick References
├─ In-Depth Guides
├─ Video Tutorials
├─ Interactive Tools
├─ Courses & Curricula
└─ Research Papers
```

### 7. Search and Retrieval Patterns

**Multi-Faceted Search**:
```
SEARCH DIMENSIONS:
  - Full-text search (title, description, notes)
  - Tag filtering (AND/OR logic)
  - Category filtering
  - Date range filtering
  - Domain/source filtering
  - Content type filtering
  - Status filtering (read/unread)
  - Priority filtering

RANKING CRITERIA:
  - Relevance score (text matching)
  - Recency (recently added weighted higher)
  - Quality score (stars/ratings)
  - User engagement (times accessed)
  - Priority level
```

**Smart Suggestions**:
```
"RELATED LINKS" ALGORITHM:
  - Shared tags (weighted by tag specificity)
  - Same category/subcategory
  - Same project association
  - Same author/publisher
  - Temporal proximity (saved around same time)
  - User access patterns (frequently accessed together)
```

**Quick Access Patterns**:
```
SAVED SEARCHES:
  - "Unread high-priority articles"
  - "React tutorials saved last month"
  - "Must-read items tagged #project:current"

SMART COLLECTIONS:
  - Recently added (last 7 days)
  - Most accessed (last 30 days)
  - Flagged for review
  - Shared by specific person
  - Related to active projects
```

### 8. Maintenance and Hygiene

**Link Health Monitoring**:
```
REGULAR CHECKS:
  - Dead link detection (404, 410 errors)
  - Redirect verification (301, 302)
  - SSL certificate expiration
  - Domain expiration warnings
  - Content changes (page hash monitoring)

HEALTH STATUS:
  - ✓ Healthy: Accessible, unchanged
  - ⚠ Warning: Redirected, slow, minor issues
  - ✗ Dead: 404, domain expired
  - 🔒 Access Changed: Now paywalled/login-required
  - 📝 Content Changed: Significant updates detected
```

**Archive Strategy**:
```
ARCHIVAL TRIGGERS:
  - Link is dead but historically valuable
  - Paywalled content you previously accessed
  - Time-sensitive content (capture snapshot)
  - High-value content at risk of deletion

ARCHIVAL METHODS:
  - Save to Wayback Machine (archive.org)
  - Export to PDF/HTML
  - Store in personal archive system
  - Screenshot key content
  - Extract and save core text
```

**Cleanup Protocols**:
```
REGULAR MAINTENANCE (Monthly):
  - Remove truly dead links with no value
  - Merge duplicate entries
  - Update stale metadata
  - Prune unused tags
  - Consolidate categories
  - Review "read later" backlog

QUALITY REVIEW (Quarterly):
  - Remove outdated resources
  - Update descriptions and notes
  - Reassess priorities
  - Validate tag taxonomy
  - Audit collection completeness
```

### 9. Sharing and Collaboration

**Shareable Collections**:
```
COLLECTION FORMATS:
  - Public link collection (curated list)
  - Markdown file with categorized links
  - JSON export for programmatic access
  - RSS feed for new additions
  - Embedded widget for websites

SHARING OPTIONS:
  - Public (anyone can view)
  - Unlisted (only with link)
  - Team (shared with team members)
  - Private (personal only)
```

**Collaborative Curation**:
```
MULTI-CURATOR PATTERNS:
  - Shared tagging taxonomy
  - Curator attribution per link
  - Voting/rating system
  - Comment threads on links
  - Suggested additions queue
  - Editorial review process
```

## Best Practices

### For Link Capture:
1. **Capture Immediately**: Don't trust "I'll remember to save this later"
2. **Add Context**: Why you saved it, what you'll use it for
3. **Clean URLs**: Remove tracking parameters before saving
4. **Enrich Metadata**: Add tags and categories at capture time
5. **Note Source**: Record who shared it or where you found it

### For Categorization:
1. **Be Consistent**: Use established category structure
2. **Be Specific**: Use most specific applicable category
3. **Use Multiple Tags**: Don't limit to single tag
4. **Follow Taxonomy**: Respect hierarchical tag structure
5. **Review Periodically**: Refine categories as collection grows

### For Maintenance:
1. **Check Health Regularly**: Monthly link validation
2. **Archive Valuable Content**: Don't lose important resources
3. **Prune Aggressively**: Remove genuinely useless links
4. **Update Metadata**: Keep descriptions and tags current
5. **Review Read Status**: Don't let "read later" pile grow indefinitely

### For Retrieval:
1. **Use Descriptive Titles**: Make searching easier
2. **Tag Generously**: More access paths = better retrieval
3. **Save Searches**: Create shortcuts for common queries
4. **Review Collections**: Periodic review surfaces forgotten gems
5. **Follow Trails**: Use related links to discover connections

## Integration with Other Skills

- **research-frameworks**: Organize research source materials
- **task-management**: Convert saved resources to learning tasks
- **project-memory**: Link resources to project documentation
- **productivity-patterns**: Build learning resource libraries
- **documentation-standards**: Reference links in documentation

## Success Metrics

- **Capture Completeness**: 100% of valuable resources saved with metadata
- **Retrieval Efficiency**: Find needed resource within 2 minutes
- **Link Health**: >95% of links remain accessible
- **Tagging Consistency**: <5% of links need tag corrections
- **Collection Utility**: Regular access to saved resources (weekly+)
- **Duplicate Rate**: <2% duplicate entries after normalization

## References

- [tagging-taxonomies.md](tagging-taxonomies.md) - Comprehensive tag structures
- [metadata-schemas.md](metadata-schemas.md) - Link metadata standards
- [curation-workflows.md](curation-workflows.md) - End-to-end curation processes
- [tool-integrations.md](tool-integrations.md) - Integration with link management tools
- [archive-strategies.md](archive-strategies.md) - Content preservation approaches

---

**Remember**: A well-curated link collection is a second brain for knowledge work. Capture systematically, organize thoughtfully, maintain consistently, and retrieve effortlessly. Your future self will thank your present self for the discipline.
