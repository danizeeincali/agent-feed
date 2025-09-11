# SPARC Phase 2: Component Migration Pseudocode Algorithms

## Overview
This document contains the detailed pseudocode algorithms for migrating the 4 critical components from AgentDetail to UnifiedAgentPage using TDD London School methodology.

## Algorithm 1: AgentDefinitionTab Migration

### Core Algorithm
```typescript
ALGORITHM: MigrateAgentDefinitionTab
INPUT: agent.definition (markdown string), agentId (string)
OUTPUT: AgentDefinitionTab component with full functionality

FUNCTION createAgentDefinitionTab(agent: UnifiedAgentData): ReactComponent {
    // Step 1: Initialize component state
    STATE = {
        viewMode: 'rendered',
        parsedContent: null,
        copySuccess: false,
        loading: false
    }
    
    // Step 2: Parse markdown content with TOC generation
    parsedContent = parseMarkdownWithTOC(agent.definition)
    
    // Step 3: Create tab content structure
    RETURN TabContent {
        header: {
            badge: "Markdown Definition",
            sectionCount: parsedContent.sections.length,
            viewToggle: createViewToggle(viewMode),
            actions: [copyButton, downloadButton]
        },
        
        layout: IF parsedContent.toc.length > 0 THEN {
            leftColumn: TableOfContents(parsedContent.toc),
            rightColumn: ContentDisplay(parsedContent, viewMode)
        } ELSE {
            singleColumn: ContentDisplay(parsedContent, viewMode)
        },
        
        footer: DefinitionMetadata(agent.definition)
    }
}

FUNCTION parseMarkdownWithTOC(markdownContent: string): ParsedContent {
    sections = []
    toc = []
    
    FOR EACH line IN markdownContent.split('\n') {
        IF line matches HEADER_REGEX {
            level = countHashSymbols(line)
            title = extractTitle(line)
            id = generateId(title)
            
            // Add to table of contents
            toc.push({ id, title, level })
            
            // Create section
            sections.push({
                id, title, level, 
                content: [], 
                lineStart: currentLineIndex
            })
        } ELSE IF currentSection exists {
            currentSection.content.push(line)
        }
    }
    
    RETURN { sections, toc, metadata: extractMetadata(markdownContent) }
}

FUNCTION renderMarkdownContent(content: string[]): ReactElement[] {
    RETURN content.map(line => {
        IF line matches HEADER_PATTERN THEN
            RETURN createHeaderElement(line)
        ELSE IF line matches CODE_BLOCK_PATTERN THEN
            RETURN createCodeBlock(line)
        ELSE IF line matches INLINE_CODE_PATTERN THEN
            RETURN createInlineCode(line)
        ELSE IF line matches LINK_PATTERN THEN
            RETURN createLinkElement(line)
        ELSE IF line matches LIST_PATTERN THEN
            RETURN createListItem(line)
        ELSE
            RETURN createParagraph(line)
    })
}
```

### TDD Test Algorithm
```typescript
ALGORITHM: TestAgentDefinitionTab
PURPOSE: Comprehensive test coverage for definition tab

TEST_SUITE AgentDefinitionTab {
    // Red Phase: Failing tests
    TEST "should render markdown content with proper structure" {
        // Arrange
        agent = createMockAgent({ definition: SAMPLE_MARKDOWN })
        
        // Act
        component = render(AgentDefinitionTab({ agent }))
        
        // Assert
        EXPECT(component).toContain("h2", "h3", "p", "code")
        EXPECT(component).toHaveTestId("definition-content")
    }
    
    TEST "should generate table of contents from headers" {
        // Arrange
        markdownWithHeaders = "# Title\n## Section 1\n### Subsection"
        agent = createMockAgent({ definition: markdownWithHeaders })
        
        // Act
        component = render(AgentDefinitionTab({ agent }))
        
        // Assert
        EXPECT(component).toHaveTestId("table-of-contents")
        EXPECT(getTOCItems(component)).toHaveLength(3)
    }
    
    TEST "should toggle between rendered and source view" {
        // Arrange
        agent = createMockAgent({ definition: SAMPLE_MARKDOWN })
        component = render(AgentDefinitionTab({ agent }))
        
        // Act
        sourceButton = getByText("Source")
        fireEvent.click(sourceButton)
        
        // Assert
        EXPECT(component).toHaveTestId("markdown-source")
        EXPECT(component).not.toHaveTestId("markdown-rendered")
    }
    
    TEST "should copy content to clipboard" {
        // Arrange
        agent = createMockAgent({ definition: SAMPLE_MARKDOWN })
        component = render(AgentDefinitionTab({ agent }))
        
        // Act
        copyButton = getByText("Copy")
        fireEvent.click(copyButton)
        
        // Assert
        EXPECT(navigator.clipboard.writeText).toHaveBeenCalledWith(SAMPLE_MARKDOWN)
        EXPECT(getByText("Copied!")).toBeInTheDocument()
    }
}
```

## Algorithm 2: AgentProfileTab Migration

### Core Algorithm
```typescript
ALGORITHM: MigrateAgentProfileTab
INPUT: agent.profile (object), agent.metadata (object)
OUTPUT: AgentProfileTab component with enhanced profile display

FUNCTION createAgentProfileTab(agent: UnifiedAgentData): ReactComponent {
    profile = agent.profile || {}
    metadata = agent.metadata || {}
    
    RETURN TabContent {
        overview: {
            purposeSection: createPurposeSection(profile.purpose || agent.description),
            statisticsSection: createStatisticsCards(agent)
        },
        
        capabilities: {
            strengthsSection: IF profile.strengths THEN createStrengthsGrid(profile.strengths),
            useCasesSection: IF profile.useCases THEN createUseCasesGrid(profile.useCases),
            technicalCapabilities: IF agent.capabilities THEN createCapabilitiesBadges(agent.capabilities),
            programmingLanguages: IF metadata.languages THEN createLanguageBadges(metadata.languages)
        },
        
        limitations: IF profile.limitations THEN {
            limitationsSection: createLimitationsSection(profile.limitations)
        },
        
        externalResources: IF hasExternalLinks(metadata) THEN {
            resourcesSection: createExternalResourcesSection(metadata)
        },
        
        metadata: createMetadataSection(agent, metadata)
    }
}

FUNCTION createStatisticsCards(agent: UnifiedAgentData): ReactElement {
    statistics = [
        { label: "Capabilities", value: agent.capabilities?.length || 0, color: "blue" },
        { label: "Version", value: `v${agent.version}`, color: "green" },
        { label: "Files", value: agent.metadata?.fileCount || 0, color: "purple" },
        { label: "Languages", value: agent.metadata?.languages?.length || 0, color: "orange" }
    ]
    
    RETURN createGrid(statistics.map(stat => 
        createStatCard(stat.value, stat.label, stat.color)
    ))
}

FUNCTION createStrengthsGrid(strengths: string[]): ReactElement {
    RETURN createGrid(strengths.map(strength => 
        createStrengthCard(strength, "green")
    ))
}

FUNCTION createUseCasesGrid(useCases: string[]): ReactElement {
    RETURN createGrid(useCases.map(useCase => 
        createUseCaseCard(useCase, "blue")
    ))
}
```

### TDD Test Algorithm
```typescript
TEST_SUITE AgentProfileTab {
    TEST "should display agent purpose and statistics" {
        // Arrange
        agent = createMockAgent({
            profile: { purpose: "Test purpose" },
            capabilities: ["test1", "test2"],
            version: "1.0.0"
        })
        
        // Act
        component = render(AgentProfileTab({ agent }))
        
        // Assert
        EXPECT(component).toHaveTestId("agent-purpose")
        EXPECT(component).toHaveTestId("agent-statistics")
        EXPECT(getByText("Test purpose")).toBeInTheDocument()
    }
    
    TEST "should render core strengths when available" {
        // Arrange
        agent = createMockAgent({
            profile: { 
                strengths: ["Pattern Recognition", "Process Optimization"] 
            }
        })
        
        // Act
        component = render(AgentProfileTab({ agent }))
        
        // Assert
        EXPECT(component).toHaveTestId("agent-strengths")
        EXPECT(getByText("Pattern Recognition")).toBeInTheDocument()
        EXPECT(getByText("Process Optimization")).toBeInTheDocument()
    }
    
    TEST "should handle missing profile data gracefully" {
        // Arrange
        agent = createMockAgent({ profile: undefined })
        
        // Act
        component = render(AgentProfileTab({ agent }))
        
        // Assert
        EXPECT(component).not.toThrow()
        EXPECT(component).toHaveTestId("agent-purpose")
        EXPECT(getByText(agent.description)).toBeInTheDocument()
    }
}
```

## Algorithm 3: AgentPagesTab Migration

### Core Algorithm
```typescript
ALGORITHM: MigrateAgentPagesTab
INPUT: agent.pages (array), agent.metadata (object)
OUTPUT: AgentPagesTab component with documentation management

FUNCTION createAgentPagesTab(agent: UnifiedAgentData): ReactComponent {
    pages = agent.pages || []
    
    STATE = {
        searchTerm: '',
        selectedCategory: 'all',
        filteredPages: pages
    }
    
    RETURN TabContent {
        header: {
            title: "Agent Pages & Documentation",
            subtitle: `${filteredPages.length} of ${pages.length} pages available`,
            searchInput: createSearchInput(searchTerm, onSearchChange)
        },
        
        quickAccess: createQuickAccessCards([
            'Getting Started', 'API Reference', 'Examples', 'Changelog'
        ], pages),
        
        pagesGrid: IF filteredPages.length > 0 THEN {
            createPagesGrid(filteredPages)
        } ELSE {
            createEmptyState("No pages found")
        },
        
        additionalResources: createAdditionalResourcesSection(agent.metadata)
    }
}

FUNCTION createQuickAccessCards(quickTypes: string[], pages: AgentPage[]): ReactElement {
    RETURN createGrid(quickTypes.map(type => {
        page = findPageByType(pages, type)
        RETURN createQuickAccessCard(type, page, page ? "Available" : "Not available")
    }))
}

FUNCTION createPagesGrid(pages: AgentPage[]): ReactElement {
    RETURN createGrid(pages.map(page => 
        createPageCard({
            icon: getPageIcon(page),
            title: page.title,
            badge: getPageTypeBadge(page),
            description: page.description,
            metadata: {
                path: page.path,
                lastModified: page.lastModified,
                readTime: page.readTime
            },
            actions: [
                createViewButton(page),
                createDownloadButton(page),
                createBookmarkButton(page)
            ]
        })
    ))
}

FUNCTION filterPages(pages: AgentPage[], searchTerm: string, category: string): AgentPage[] {
    RETURN pages.filter(page => {
        matchesSearch = !searchTerm || 
            page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            page.id.toLowerCase().includes(searchTerm.toLowerCase())
        
        matchesCategory = category === 'all' || page.category === category
        
        RETURN matchesSearch AND matchesCategory
    })
}
```

### TDD Test Algorithm
```typescript
TEST_SUITE AgentPagesTab {
    TEST "should list all pages with search functionality" {
        // Arrange
        pages = [
            { id: "getting-started", title: "Getting Started", path: "/docs/start" },
            { id: "api-reference", title: "API Reference", path: "/docs/api" }
        ]
        agent = createMockAgent({ pages })
        
        // Act
        component = render(AgentPagesTab({ agent }))
        
        // Assert
        EXPECT(component).toHaveTestId("pages-grid")
        EXPECT(getAllByTestId("page-card")).toHaveLength(2)
        EXPECT(getByText("Getting Started")).toBeInTheDocument()
    }
    
    TEST "should filter pages based on search term" {
        // Arrange
        pages = [
            { id: "getting-started", title: "Getting Started" },
            { id: "api-reference", title: "API Reference" }
        ]
        agent = createMockAgent({ pages })
        component = render(AgentPagesTab({ agent }))
        
        // Act
        searchInput = getByPlaceholderText("Search pages...")
        fireEvent.change(searchInput, { target: { value: "API" } })
        
        // Assert
        EXPECT(getAllByTestId("page-card")).toHaveLength(1)
        EXPECT(getByText("API Reference")).toBeInTheDocument()
        EXPECT(queryByText("Getting Started")).not.toBeInTheDocument()
    }
    
    TEST "should handle external link navigation" {
        // Arrange
        page = { id: "test", title: "Test Page", path: "https://example.com" }
        agent = createMockAgent({ pages: [page] })
        component = render(AgentPagesTab({ agent }))
        
        // Act
        pageCard = getByTestId("page-card")
        fireEvent.click(pageCard)
        
        // Assert
        EXPECT(window.open).toHaveBeenCalledWith("https://example.com", "_blank", "noopener,noreferrer")
    }
}
```

## Algorithm 4: AgentFileSystemTab Migration

### Core Algorithm
```typescript
ALGORITHM: MigrateAgentFileSystemTab
INPUT: agent.workspace (object), agentId (string)
OUTPUT: AgentFileSystemTab component with workspace browser

FUNCTION createAgentFileSystemTab(agent: UnifiedAgentData): ReactComponent {
    workspace = agent.workspace || {}
    
    STATE = {
        searchTerm: '',
        selectedPath: '',
        expandedFolders: new Set(['/']),
        fileContent: null,
        loading: false
    }
    
    RETURN TabContent {
        header: {
            title: "Agent Workspace",
            subtitle: `Browse and explore ${agent.name} workspace files`,
            breadcrumb: workspace.rootPath || `/agents/${agent.id}`,
            searchInput: createSearchInput(searchTerm, onSearchChange),
            refreshButton: createRefreshButton()
        },
        
        layout: createTwoColumnLayout({
            leftColumn: {
                fileTree: createFileTree(workspace.structure, expandedFolders, onItemClick)
            },
            rightColumn: IF fileContent THEN {
                contentPreview: createFileContentPreview(fileContent)
            } ELSE {
                emptyState: createFileSelectionPrompt()
            }
        }),
        
        footer: createWorkspaceStatistics(workspace)
    }
}

FUNCTION createFileTree(structure: FileSystemItem[], expandedFolders: Set<string>, onItemClick: Function): ReactElement {
    filteredStructure = filterStructure(structure, searchTerm)
    
    RETURN createTreeView(filteredStructure.map(item => 
        createFileTreeItem({
            icon: getFileIcon(item),
            name: item.name,
            badge: getFileTypeBadge(item),
            isSelected: selectedPath === item.path,
            isExpanded: item.type === 'folder' AND expandedFolders.has(item.path),
            onClick: () => onItemClick(item)
        })
    ))
}

FUNCTION loadFileContent(file: FileSystemItem, agentId: string): Promise<FileContentState> {
    TRY {
        // Attempt real API call
        response = await fetch(`/api/agents/${agentId}/files?path=${encodeURIComponent(file.path)}`)
        
        IF response.ok THEN {
            content = await response.text()
            RETURN { file, content, isMock: false }
        } ELSE {
            // Fallback to mock content
            mockContent = generateMockContent(file)
            RETURN { file, content: mockContent, isMock: true }
        }
    } CATCH error {
        RETURN { file, content: `Error: ${error.message}`, isError: true }
    }
}

FUNCTION generateMockContent(file: FileSystemItem): string {
    extension = file.name.split('.').pop()?.toLowerCase()
    
    SWITCH extension {
        CASE 'md':
            RETURN `# ${file.name}\n\nMarkdown content for ${file.name}`
        CASE 'json':
            RETURN JSON.stringify({ name: file.name, type: "mock" }, null, 2)
        CASE 'js', 'ts':
            RETURN `// ${file.name}\nconst config = { mock: true };`
        DEFAULT:
            RETURN `File: ${file.name}\nMock content preview`
    }
}

FUNCTION createWorkspaceStatistics(workspace: Workspace): ReactElement {
    statistics = calculateWorkspaceStats(workspace.structure)
    
    RETURN createStatisticsGrid([
        { label: "Total Items", value: statistics.totalItems, color: "blue" },
        { label: "Folders", value: statistics.folderCount, color: "green" },
        { label: "Files", value: statistics.fileCount, color: "purple" },
        { label: "Total Size", value: formatFileSize(statistics.totalSize), color: "orange" }
    ])
}
```

### TDD Test Algorithm
```typescript
TEST_SUITE AgentFileSystemTab {
    TEST "should display file tree from workspace data" {
        // Arrange
        workspace = {
            structure: [
                { type: 'folder', name: 'src', path: 'src/', children: 5 },
                { type: 'file', name: 'README.md', path: 'README.md', size: 1024 }
            ]
        }
        agent = createMockAgent({ workspace })
        
        // Act
        component = render(AgentFileSystemTab({ agent }))
        
        // Assert
        EXPECT(component).toHaveTestId("file-item")
        EXPECT(getByText("src")).toBeInTheDocument()
        EXPECT(getByText("README.md")).toBeInTheDocument()
    }
    
    TEST "should preview file content when selected" {
        // Arrange
        workspace = { structure: [{ type: 'file', name: 'test.md', path: 'test.md' }] }
        agent = createMockAgent({ workspace })
        component = render(AgentFileSystemTab({ agent }))
        
        // Act
        fileItem = getByText("test.md")
        fireEvent.click(fileItem)
        
        // Assert
        EXPECT(getByText("# test.md")).toBeInTheDocument()
        EXPECT(getByText("Mock Content")).toBeInTheDocument()
    }
    
    TEST "should handle file download functionality" {
        // Arrange
        workspace = { structure: [{ type: 'file', name: 'test.txt', path: 'test.txt' }] }
        agent = createMockAgent({ workspace })
        component = render(AgentFileSystemTab({ agent }))
        
        // Act
        fileItem = getByText("test.txt")
        fireEvent.click(fileItem)
        downloadButton = getByText("Download")
        fireEvent.click(downloadButton)
        
        // Assert
        EXPECT(URL.createObjectURL).toHaveBeenCalled()
        EXPECT(document.createElement).toHaveBeenCalledWith('a')
    }
    
    TEST "should search within file structure" {
        // Arrange
        workspace = {
            structure: [
                { type: 'file', name: 'component.tsx', path: 'component.tsx' },
                { type: 'file', name: 'utils.js', path: 'utils.js' }
            ]
        }
        agent = createMockAgent({ workspace })
        component = render(AgentFileSystemTab({ agent }))
        
        // Act
        searchInput = getByPlaceholderText("Search files...")
        fireEvent.change(searchInput, { target: { value: "component" } })
        
        // Assert
        EXPECT(getByText("component.tsx")).toBeInTheDocument()
        EXPECT(queryByText("utils.js")).not.toBeInTheDocument()
    }
}
```

## Integration Algorithm

### UnifiedAgentPage Tab Integration
```typescript
ALGORITHM: IntegrateTabsIntoUnifiedAgentPage
PURPOSE: Seamlessly integrate all 4 new tabs into existing UnifiedAgentPage

FUNCTION enhanceUnifiedAgentPageWithNewTabs(existingComponent: ReactComponent): ReactComponent {
    // Step 1: Extend tab navigation
    enhancedTabNavigation = [
        ...existingTabs, // overview, details, activity, configuration
        { id: 'definition', label: 'Definition', icon: FileText, component: AgentDefinitionTab },
        { id: 'profile', label: 'Profile', icon: User, component: AgentProfileTab },
        { id: 'pages', label: 'Pages', icon: Globe, component: AgentPagesTab },
        { id: 'filesystem', label: 'Workspace', icon: FolderOpen, component: AgentFileSystemTab }
    ]
    
    // Step 2: Enhance tab content rendering
    FUNCTION renderTabContent(activeTab: string, agent: UnifiedAgentData): ReactElement {
        SWITCH activeTab {
            CASE 'overview': RETURN <OverviewTab agent={agent} />
            CASE 'details': RETURN <DetailsTab agent={agent} />
            CASE 'activity': RETURN <ActivityTab agent={agent} />
            CASE 'configuration': RETURN <ConfigurationTab agent={agent} />
            CASE 'definition': RETURN <AgentDefinitionTab agent={agent} />
            CASE 'profile': RETURN <AgentProfileTab agent={agent} />
            CASE 'pages': RETURN <AgentPagesTab agent={agent} />
            CASE 'filesystem': RETURN <AgentFileSystemTab agent={agent} />
            DEFAULT: RETURN <OverviewTab agent={agent} />
        }
    }
    
    // Step 3: Maintain existing state management
    RETURN enhancedComponent {
        state: existingState, // Preserve all existing state
        navigation: enhancedTabNavigation,
        content: renderTabContent(activeTab, agent)
    }
}
```

## Performance Optimization Algorithms

### Lazy Loading Algorithm
```typescript
ALGORITHM: OptimizeTabPerformance
PURPOSE: Ensure optimal performance for enhanced tab system

FUNCTION createLazyLoadedTab(component: ReactComponent): ReactComponent {
    RETURN React.lazy(() => {
        RETURN new Promise((resolve) => {
            // Only load component when tab is first activated
            setTimeout(() => resolve({ default: component }), 0)
        })
    })
}

FUNCTION optimizeMarkdownRendering(content: string): OptimizedContent {
    // Cache parsed content to avoid re-parsing
    IF cachedContent.has(contentHash(content)) THEN {
        RETURN cachedContent.get(contentHash(content))
    }
    
    parsedContent = parseMarkdown(content)
    cachedContent.set(contentHash(content), parsedContent)
    
    RETURN parsedContent
}

FUNCTION optimizeFileTreeRendering(structure: FileSystemItem[]): VirtualizedTree {
    // Use virtualization for large file trees
    IF structure.length > 100 THEN {
        RETURN createVirtualizedTree(structure, { itemHeight: 32, visibleItems: 20 })
    } ELSE {
        RETURN createStandardTree(structure)
    }
}
```

This pseudocode provides the complete algorithmic foundation for implementing all 4 missing components with proper TDD methodology and performance optimization.