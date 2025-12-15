# SPARC Universal Workspace File Extraction Algorithm

## Algorithm Specification

This document provides detailed pseudocode for a universal workspace file extraction algorithm that dynamically discovers directories, tries multiple patterns, and intelligently selects content.

---

## 1. Main Algorithm: Universal Workspace Extraction

```
ALGORITHM: ExtractFromWorkspace
INPUT:
    workspaceDir (string) - Root directory to search
    patterns (array of FilePattern) - File patterns to match
    extractors (array of SectionExtractor) - Content extraction patterns
    options (ExtractionOptions) - Configuration
OUTPUT:
    ExtractedContent or null

DATA STRUCTURES:
    FilePattern {
        glob: string              // e.g., "*.md", "**/*.txt"
        priority: integer         // Higher = try first
        directoryHint: string     // e.g., "docs", "src"
    }

    SectionExtractor {
        regex: string            // Pattern to extract content
        sectionName: string      // Name of section being extracted
        priority: integer        // Order to try patterns
        minLength: integer       // Minimum content length
    }

    ExtractionOptions {
        maxDepth: integer        // Max directory depth
        maxFiles: integer        // Max files to examine
        parallelReads: integer   // Concurrent file reads
        preferRecent: boolean    // Prioritize recent files
        cacheEnabled: boolean    // Cache file metadata
    }

    ExtractedContent {
        content: string
        filePath: string
        sectionName: string
        matchedPattern: string
        timestamp: datetime
        confidence: float
    }

    DirectoryNode {
        path: string
        priority: integer
        depth: integer
        children: array of DirectoryNode
    }

BEGIN
    // Initialize logging and metrics
    metrics ← CreateMetricsCollector()
    logger ← CreateLogger("ExtractFromWorkspace")

    logger.info("Starting extraction from: " + workspaceDir)
    logger.info("Patterns: " + patterns.length)
    logger.info("Extractors: " + extractors.length)

    // Phase 1: Directory Discovery
    logger.info("Phase 1: Discovering directories")
    startTime ← GetCurrentTime()

    directoryTree ← DiscoverDirectories(
        workspaceDir,
        options.maxDepth,
        patterns
    )

    discoveryTime ← GetCurrentTime() - startTime
    metrics.recordDiscovery(directoryTree.totalNodes, discoveryTime)
    logger.info("Discovered " + directoryTree.totalNodes + " directories in " + discoveryTime + "ms")

    // Phase 2: Prioritize Directories
    logger.info("Phase 2: Prioritizing directories")
    prioritizedDirs ← PrioritizeDirectories(directoryTree, patterns)

    FOR EACH dir IN prioritizedDirs DO
        logger.debug("Priority " + dir.priority + ": " + dir.path)
    END FOR

    // Phase 3: File Discovery and Extraction
    logger.info("Phase 3: Searching for matching files")

    FOR EACH directory IN prioritizedDirs DO
        logger.debug("Searching directory: " + directory.path)

        // Find matching files in this directory
        matchedFiles ← FindMatchingFiles(
            directory.path,
            patterns,
            options
        )

        IF matchedFiles.isEmpty() THEN
            logger.debug("No matching files in: " + directory.path)
            CONTINUE
        END IF

        logger.info("Found " + matchedFiles.length + " files in: " + directory.path)

        // Sort files by relevance
        rankedFiles ← RankFiles(matchedFiles, options)

        // Try extraction from each file
        FOR EACH file IN rankedFiles DO
            logger.debug("Attempting extraction from: " + file.path)
            metrics.incrementFilesAttempted()

            result ← ExtractFromFile(file, extractors, metrics, logger)

            IF result IS NOT NULL THEN
                logger.info("SUCCESS: Extracted from " + file.path)
                logger.info("Section: " + result.sectionName)
                logger.info("Length: " + result.content.length + " chars")

                metrics.recordSuccess(result)
                RETURN result
            END IF

            // Early exit if max files examined
            IF metrics.filesAttempted >= options.maxFiles THEN
                logger.warn("Max files limit reached: " + options.maxFiles)
                BREAK
            END IF
        END FOR
    END FOR

    // Phase 4: Fallback Strategies
    logger.warn("Phase 4: No matches found, trying fallback")

    fallbackResult ← TryFallbackStrategies(
        workspaceDir,
        patterns,
        extractors,
        options,
        metrics,
        logger
    )

    IF fallbackResult IS NOT NULL THEN
        logger.info("Fallback strategy succeeded")
        RETURN fallbackResult
    END IF

    // No content found
    logger.error("Extraction failed: No matching content found")
    metrics.recordFailure()

    RETURN null
END

COMPLEXITY ANALYSIS:
    Time: O(D * F * P * E)
        D = number of directories
        F = average files per directory
        P = number of file patterns
        E = number of extractors

    Space: O(D + F * C)
        D = directory tree storage
        F = files examined
        C = average content size

    Optimizations reduce to O(D + F_examined) in practice
```

---

## 2. Directory Discovery Algorithm

```
ALGORITHM: DiscoverDirectories
INPUT:
    rootDir (string) - Starting directory
    maxDepth (integer) - Maximum recursion depth
    patterns (array of FilePattern) - Hints for prioritization
OUTPUT:
    DirectoryTree

DATA STRUCTURES:
    DirectoryTree {
        root: DirectoryNode
        totalNodes: integer
        maxDepth: integer
        index: Map<string, DirectoryNode>
    }

BEGIN
    tree ← CreateDirectoryTree()
    tree.root ← CreateDirectoryNode(rootDir, 0, 0)
    tree.index.set(rootDir, tree.root)

    queue ← Queue()
    queue.enqueue(tree.root)

    visited ← Set()

    // Breadth-First Search for directory discovery
    WHILE NOT queue.isEmpty() DO
        current ← queue.dequeue()

        // Skip if already visited (handle symlinks)
        IF visited.contains(current.path) THEN
            CONTINUE
        END IF

        visited.add(current.path)

        // Check depth limit
        IF current.depth >= maxDepth THEN
            CONTINUE
        END IF

        // Read directory contents
        TRY
            entries ← ReadDirectory(current.path)
        CATCH error
            // Log and skip inaccessible directories
            CONTINUE
        END TRY

        // Process subdirectories
        FOR EACH entry IN entries DO
            IF entry.isDirectory() THEN
                childPath ← JoinPath(current.path, entry.name)

                // Calculate priority based on naming hints
                priority ← CalculateDirectoryPriority(
                    entry.name,
                    patterns
                )

                childNode ← CreateDirectoryNode(
                    childPath,
                    priority,
                    current.depth + 1
                )

                current.children.append(childNode)
                tree.index.set(childPath, childNode)
                tree.totalNodes ← tree.totalNodes + 1

                queue.enqueue(childNode)
            END IF
        END FOR
    END WHILE

    tree.maxDepth ← CalculateActualDepth(tree.root)

    RETURN tree
END

SUBROUTINE: CalculateDirectoryPriority
INPUT: dirName (string), patterns (array of FilePattern)
OUTPUT: priority (integer)

BEGIN
    priority ← 0
    dirNameLower ← ToLowerCase(dirName)

    // Priority boost for common important directories
    importantDirs ← Map {
        "docs": 100,
        "documentation": 90,
        "src": 80,
        "lib": 70,
        "api": 60,
        "core": 60,
        "config": 50,
        "scripts": 40,
        "tests": 30,
        "test": 30
    }

    IF importantDirs.has(dirNameLower) THEN
        priority ← priority + importantDirs.get(dirNameLower)
    END IF

    // Priority boost if matches pattern hints
    FOR EACH pattern IN patterns DO
        IF pattern.directoryHint IS NOT NULL THEN
            IF dirNameLower CONTAINS pattern.directoryHint THEN
                priority ← priority + pattern.priority
            END IF
        END IF
    END FOR

    // Penalty for hidden directories
    IF dirName STARTS_WITH "." THEN
        priority ← priority - 50
    END IF

    // Penalty for common noise directories
    noiseDirs ← ["node_modules", "vendor", "dist", "build", ".git"]
    IF dirNameLower IN noiseDirs THEN
        priority ← priority - 100
    END IF

    RETURN priority
END

COMPLEXITY ANALYSIS:
    Time: O(D) where D = total directories in tree
        - BFS visits each directory once
        - Priority calculation is O(1) per directory

    Space: O(D)
        - Queue holds O(W) nodes (width of tree)
        - Tree structure stores all D nodes
        - Visited set tracks D paths
```

---

## 3. Directory Prioritization Algorithm

```
ALGORITHM: PrioritizeDirectories
INPUT:
    tree (DirectoryTree) - Discovered directory tree
    patterns (array of FilePattern) - For additional context
OUTPUT:
    prioritizedList (array of DirectoryNode)

BEGIN
    allNodes ← []

    // Flatten tree using DFS
    SUBROUTINE: Flatten(node)
        allNodes.append(node)
        FOR EACH child IN node.children DO
            Flatten(child)
        END FOR
    END SUBROUTINE

    Flatten(tree.root)

    // Multi-criteria sorting
    SORT allNodes BY:
        1. priority (descending)
        2. depth (ascending - prefer shallow)
        3. name (alphabetical)

    RETURN allNodes
END

COMPLEXITY ANALYSIS:
    Time: O(D log D)
        - Flatten: O(D)
        - Sort: O(D log D)

    Space: O(D) for flattened list
```

---

## 4. File Matching Algorithm

```
ALGORITHM: FindMatchingFiles
INPUT:
    directoryPath (string)
    patterns (array of FilePattern)
    options (ExtractionOptions)
OUTPUT:
    matchedFiles (array of FileMetadata)

DATA STRUCTURES:
    FileMetadata {
        path: string
        name: string
        size: integer
        modified: datetime
        pattern: FilePattern
        score: float
    }

BEGIN
    matchedFiles ← []
    patternsSorted ← SORT patterns BY priority DESCENDING

    // Try each pattern in priority order
    FOR EACH pattern IN patternsSorted DO
        TRY
            matches ← GlobMatch(directoryPath, pattern.glob)

            FOR EACH filePath IN matches DO
                // Get file metadata
                metadata ← GetFileMetadata(filePath)

                // Skip if too large or too small
                IF metadata.size > MAX_FILE_SIZE THEN
                    CONTINUE
                END IF

                IF metadata.size < MIN_FILE_SIZE THEN
                    CONTINUE
                END IF

                fileMetadata ← CreateFileMetadata(
                    filePath,
                    metadata,
                    pattern
                )

                matchedFiles.append(fileMetadata)
            END FOR

        CATCH error
            // Log pattern matching error, continue
            CONTINUE
        END TRY
    END FOR

    // Remove duplicates (same file matched by multiple patterns)
    matchedFiles ← DeduplicateFiles(matchedFiles)

    RETURN matchedFiles
END

SUBROUTINE: GlobMatch
INPUT: basePath (string), globPattern (string)
OUTPUT: matchedPaths (array of string)

BEGIN
    // Handle both simple and recursive patterns
    IF globPattern CONTAINS "**" THEN
        // Recursive glob
        RETURN RecursiveGlob(basePath, globPattern)
    ELSE
        // Simple glob in current directory only
        RETURN SimpleGlob(basePath, globPattern)
    END IF
END

COMPLEXITY ANALYSIS:
    Time: O(P * F)
        P = number of patterns
        F = files per directory

    Space: O(M) where M = matched files

    Optimization: Cache glob results if same directory searched multiple times
```

---

## 5. File Ranking Algorithm

```
ALGORITHM: RankFiles
INPUT:
    files (array of FileMetadata)
    options (ExtractionOptions)
OUTPUT:
    rankedFiles (array of FileMetadata)

BEGIN
    // Calculate composite score for each file
    FOR EACH file IN files DO
        score ← 0.0

        // Pattern priority (40% weight)
        score ← score + (file.pattern.priority * 0.4)

        // Recency score (30% weight)
        IF options.preferRecent THEN
            daysSinceModified ← (CurrentDate - file.modified).days
            recencyScore ← 100 / (1 + daysSinceModified * 0.1)
            score ← score + (recencyScore * 0.3)
        END IF

        // File size heuristic (20% weight)
        // Prefer medium-sized files (likely to have content)
        IF file.size > 1000 AND file.size < 100000 THEN
            sizeScore ← 100
        ELSE IF file.size >= 100000 THEN
            sizeScore ← 50
        ELSE
            sizeScore ← 30
        END IF
        score ← score + (sizeScore * 0.2)

        // Name matching heuristic (10% weight)
        nameScore ← CalculateNameScore(file.name)
        score ← score + (nameScore * 0.1)

        file.score ← score
    END FOR

    // Sort by composite score
    SORT files BY score DESCENDING

    RETURN files
END

SUBROUTINE: CalculateNameScore
INPUT: fileName (string)
OUTPUT: score (float)

BEGIN
    score ← 50.0  // Base score
    nameLower ← ToLowerCase(fileName)

    // Boost for informative names
    goodKeywords ← ["spec", "doc", "readme", "plan", "design", "arch"]
    FOR EACH keyword IN goodKeywords DO
        IF nameLower CONTAINS keyword THEN
            score ← score + 20
        END IF
    END FOR

    // Penalty for test/example files
    badKeywords ← ["test", "example", "sample", "demo", "tmp"]
    FOR EACH keyword IN badKeywords DO
        IF nameLower CONTAINS keyword THEN
            score ← score - 30
        END IF
    END FOR

    RETURN MAX(0, MIN(100, score))
END

COMPLEXITY ANALYSIS:
    Time: O(F log F)
        - Scoring: O(F)
        - Sorting: O(F log F)

    Space: O(1) - in-place scoring
```

---

## 6. Content Extraction Algorithm

```
ALGORITHM: ExtractFromFile
INPUT:
    file (FileMetadata)
    extractors (array of SectionExtractor)
    metrics (MetricsCollector)
    logger (Logger)
OUTPUT:
    ExtractedContent or null

BEGIN
    logger.debug("Reading file: " + file.path)

    // Read file content
    TRY
        content ← ReadFileContent(file.path)
    CATCH error
        logger.error("Failed to read file: " + error.message)
        RETURN null
    END TRY

    // Normalize line endings
    content ← NormalizeLineEndings(content)

    // Sort extractors by priority
    extractorsSorted ← SORT extractors BY priority DESCENDING

    // Try each extraction pattern
    FOR EACH extractor IN extractorsSorted DO
        logger.debug("Trying extractor: " + extractor.sectionName)
        metrics.incrementExtractorAttempts(extractor.sectionName)

        result ← ApplyExtractor(
            content,
            extractor,
            file,
            logger
        )

        IF result IS NOT NULL THEN
            // Validate extracted content
            IF ValidateExtractedContent(result, extractor) THEN
                logger.info("Extracted section: " + extractor.sectionName)
                metrics.recordExtractorSuccess(extractor.sectionName)

                // Calculate confidence score
                result.confidence ← CalculateConfidence(
                    result,
                    extractor,
                    file
                )

                RETURN result
            ELSE
                logger.debug("Validation failed for: " + extractor.sectionName)
            END IF
        END IF
    END FOR

    logger.debug("No extractors matched for: " + file.path)
    RETURN null
END

SUBROUTINE: ApplyExtractor
INPUT:
    content (string)
    extractor (SectionExtractor)
    file (FileMetadata)
    logger (Logger)
OUTPUT:
    ExtractedContent or null

BEGIN
    // Compile regex pattern
    TRY
        pattern ← CompileRegex(extractor.regex, MULTILINE | DOTALL)
    CATCH error
        logger.error("Invalid regex: " + extractor.regex)
        RETURN null
    END TRY

    // Execute pattern matching
    match ← pattern.exec(content)

    IF match IS NULL THEN
        RETURN null
    END IF

    // Extract content from capture group
    extractedText ← null

    // Try named capture group first
    IF match.groups.has("content") THEN
        extractedText ← match.groups["content"]
    // Try first capture group
    ELSE IF match.length > 1 THEN
        extractedText ← match[1]
    // Use entire match
    ELSE
        extractedText ← match[0]
    END IF

    // Trim whitespace
    extractedText ← Trim(extractedText)

    // Create result object
    result ← CreateExtractedContent(
        content: extractedText,
        filePath: file.path,
        sectionName: extractor.sectionName,
        matchedPattern: extractor.regex,
        timestamp: GetCurrentTime(),
        confidence: 0.0  // Calculated later
    )

    RETURN result
END

SUBROUTINE: ValidateExtractedContent
INPUT:
    result (ExtractedContent)
    extractor (SectionExtractor)
OUTPUT:
    isValid (boolean)

BEGIN
    // Check minimum length
    IF result.content.length < extractor.minLength THEN
        RETURN false
    END IF

    // Check for empty or whitespace-only content
    IF IsWhitespaceOnly(result.content) THEN
        RETURN false
    END IF

    // Check for placeholder text
    placeholders ← ["TODO", "TBD", "PLACEHOLDER", "..."]
    FOR EACH placeholder IN placeholders DO
        IF result.content = placeholder THEN
            RETURN false
        END IF
    END FOR

    // Content must have some substance (words, not just punctuation)
    wordCount ← CountWords(result.content)
    IF wordCount < 5 THEN
        RETURN false
    END IF

    RETURN true
END

SUBROUTINE: CalculateConfidence
INPUT:
    result (ExtractedContent)
    extractor (SectionExtractor)
    file (FileMetadata)
OUTPUT:
    confidence (float)

BEGIN
    confidence ← 0.0

    // Base confidence from extractor priority
    confidence ← confidence + (extractor.priority * 0.3)

    // Length confidence (longer is better, up to a point)
    lengthScore ← MIN(100, result.content.length / 10)
    confidence ← confidence + (lengthScore * 0.3)

    // File score contribution
    confidence ← confidence + (file.score * 0.2)

    // Recency contribution
    daysSinceModified ← (CurrentDate - file.modified).days
    recencyScore ← 100 / (1 + daysSinceModified * 0.1)
    confidence ← confidence + (recencyScore * 0.2)

    // Normalize to 0-1 range
    RETURN confidence / 100.0
END

COMPLEXITY ANALYSIS:
    Time: O(E * C)
        E = number of extractors
        C = content length
        - Each regex match is O(C) in worst case

    Space: O(C) for file content storage

    Optimization:
        - Early exit on first match
        - Regex compilation caching
        - Content streaming for large files
```

---

## 7. Parallel File Reading Optimization

```
ALGORITHM: ExtractFromFilesParallel
INPUT:
    files (array of FileMetadata)
    extractors (array of SectionExtractor)
    maxParallel (integer)
    metrics (MetricsCollector)
    logger (Logger)
OUTPUT:
    ExtractedContent or null

DATA STRUCTURES:
    ExtractionTask {
        file: FileMetadata
        status: enum(PENDING, RUNNING, SUCCESS, FAILED)
        result: ExtractedContent or null
        error: Error or null
    }

BEGIN
    tasks ← []

    // Create tasks for each file
    FOR EACH file IN files DO
        task ← CreateExtractionTask(file, PENDING)
        tasks.append(task)
    END FOR

    // Semaphore to limit concurrent operations
    semaphore ← CreateSemaphore(maxParallel)
    completedCount ← 0
    successResult ← null
    mutex ← CreateMutex()

    // Process tasks in parallel
    PARALLEL_FOR_EACH task IN tasks DO
        // Acquire semaphore slot
        semaphore.acquire()

        TRY
            task.status ← RUNNING
            logger.debug("Processing (parallel): " + task.file.path)

            // Extract from file
            result ← ExtractFromFile(
                task.file,
                extractors,
                metrics,
                logger
            )

            // Thread-safe result handling
            mutex.lock()

            IF result IS NOT NULL THEN
                task.status ← SUCCESS
                task.result ← result

                // First success wins
                IF successResult IS NULL THEN
                    successResult ← result
                    logger.info("Parallel extraction succeeded: " + task.file.path)
                END IF
            ELSE
                task.status ← FAILED
            END IF

            completedCount ← completedCount + 1

            mutex.unlock()

            // Early termination if we have a result
            IF successResult IS NOT NULL THEN
                // Signal other threads to stop
                BREAK_PARALLEL
            END IF

        CATCH error
            mutex.lock()
            task.status ← FAILED
            task.error ← error
            logger.error("Parallel extraction error: " + error.message)
            completedCount ← completedCount + 1
            mutex.unlock()

        FINALLY
            semaphore.release()
        END TRY
    END PARALLEL_FOR_EACH

    logger.info("Parallel extraction complete: " + completedCount + "/" + tasks.length)

    RETURN successResult
END

COMPLEXITY ANALYSIS:
    Time: O((F/P) * E * C)
        F = number of files
        P = parallel workers
        E = extractors per file
        C = content length

        Speedup: ~P times faster than sequential

    Space: O(P * C)
        P concurrent file buffers
        C = content size per file

    Trade-offs:
        - CPU: Higher utilization with parallel processing
        - Memory: P times more memory usage
        - I/O: May saturate disk I/O if P too large

    Optimal P value:
        - For SSD: P = 4-8
        - For HDD: P = 2-4
        - For network storage: P = 8-16
```

---

## 8. Fallback Strategies Algorithm

```
ALGORITHM: TryFallbackStrategies
INPUT:
    workspaceDir (string)
    patterns (array of FilePattern)
    extractors (array of SectionExtractor)
    options (ExtractionOptions)
    metrics (MetricsCollector)
    logger (Logger)
OUTPUT:
    ExtractedContent or null

BEGIN
    logger.info("Attempting fallback strategies")

    // Strategy 1: Relaxed pattern matching
    logger.info("Fallback 1: Relaxed pattern matching")
    relaxedPatterns ← CreateRelaxedPatterns(patterns)

    result ← QuickExtraction(
        workspaceDir,
        relaxedPatterns,
        extractors,
        options,
        logger
    )

    IF result IS NOT NULL THEN
        result.confidence ← result.confidence * 0.8  // Lower confidence
        RETURN result
    END IF

    // Strategy 2: Search entire workspace (ignore directories)
    logger.info("Fallback 2: Global workspace search")
    allFiles ← FindAllMatchingFilesRecursive(
        workspaceDir,
        relaxedPatterns,
        options.maxDepth
    )

    IF NOT allFiles.isEmpty() THEN
        rankedFiles ← RankFiles(allFiles, options)
        topFiles ← rankedFiles.slice(0, 10)  // Limit to top 10

        FOR EACH file IN topFiles DO
            result ← ExtractFromFile(file, extractors, metrics, logger)
            IF result IS NOT NULL THEN
                result.confidence ← result.confidence * 0.6
                RETURN result
            END IF
        END FOR
    END IF

    // Strategy 3: Partial content extraction
    logger.info("Fallback 3: Partial content matching")
    partialExtractors ← CreatePartialExtractors(extractors)

    FOR EACH file IN allFiles DO
        result ← ExtractFromFile(file, partialExtractors, metrics, logger)
        IF result IS NOT NULL THEN
            result.confidence ← result.confidence * 0.4
            RETURN result
        END IF
    END FOR

    // Strategy 4: Best-effort content from any file
    logger.info("Fallback 4: Best-effort extraction")

    IF NOT allFiles.isEmpty() THEN
        bestFile ← allFiles[0]  // Highest ranked
        content ← ReadFileContent(bestFile.path)

        // Return first meaningful chunk
        firstParagraph ← ExtractFirstMeaningfulParagraph(content)

        IF firstParagraph.length > 50 THEN
            result ← CreateExtractedContent(
                content: firstParagraph,
                filePath: bestFile.path,
                sectionName: "fallback-content",
                matchedPattern: "best-effort",
                timestamp: GetCurrentTime(),
                confidence: 0.2
            )
            RETURN result
        END IF
    END IF

    logger.warn("All fallback strategies failed")
    RETURN null
END

SUBROUTINE: CreateRelaxedPatterns
INPUT: patterns (array of FilePattern)
OUTPUT: relaxedPatterns (array of FilePattern)

BEGIN
    relaxedPatterns ← []

    FOR EACH pattern IN patterns DO
        // Original pattern with lower priority
        relaxedPatterns.append(pattern)

        // Add case-insensitive variant
        caseInsensitive ← CreateFilePattern(
            glob: MakeCaseInsensitive(pattern.glob),
            priority: pattern.priority - 10,
            directoryHint: pattern.directoryHint
        )
        relaxedPatterns.append(caseInsensitive)

        // Add extension-agnostic variant
        IF pattern.glob CONTAINS "." THEN
            noExtension ← RemoveExtension(pattern.glob) + ".*"
            anyExtension ← CreateFilePattern(
                glob: noExtension,
                priority: pattern.priority - 20,
                directoryHint: pattern.directoryHint
            )
            relaxedPatterns.append(anyExtension)
        END IF
    END FOR

    RETURN relaxedPatterns
END

SUBROUTINE: CreatePartialExtractors
INPUT: extractors (array of SectionExtractor)
OUTPUT: partialExtractors (array of SectionExtractor)

BEGIN
    partialExtractors ← []

    FOR EACH extractor IN extractors DO
        // Create looser version of each extractor
        partial ← CreateSectionExtractor(
            regex: RelaxRegexPattern(extractor.regex),
            sectionName: extractor.sectionName + "-partial",
            priority: extractor.priority - 20,
            minLength: extractor.minLength / 2
        )
        partialExtractors.append(partial)
    END FOR

    RETURN partialExtractors
END

COMPLEXITY ANALYSIS:
    Time: O(F * E * C)
        - Fallbacks are expensive
        - Only executed when primary strategies fail

    Space: O(F * C)
        - May load many files into memory

    Strategy Priority:
        1. Relaxed patterns: Fast, maintains structure
        2. Global search: Moderate cost, comprehensive
        3. Partial matching: Higher false positives
        4. Best effort: Last resort, low confidence
```

---

## 9. Caching and Performance Optimization

```
ALGORITHM: CachedExtraction
INPUT:
    workspaceDir (string)
    patterns (array of FilePattern)
    extractors (array of SectionExtractor)
    options (ExtractionOptions)
OUTPUT:
    ExtractedContent or null

DATA STRUCTURES:
    CacheEntry {
        key: string
        result: ExtractedContent
        timestamp: datetime
        workspaceMtime: datetime
        hits: integer
    }

    ExtractionCache {
        entries: Map<string, CacheEntry>
        maxSize: integer
        ttl: duration
    }

GLOBAL:
    cache ← CreateExtractionCache(
        maxSize: 1000,
        ttl: 5 * MINUTES
    )

BEGIN
    // Generate cache key from inputs
    cacheKey ← GenerateCacheKey(
        workspaceDir,
        patterns,
        extractors
    )

    // Check cache
    IF options.cacheEnabled THEN
        cachedEntry ← cache.get(cacheKey)

        IF cachedEntry IS NOT NULL THEN
            // Validate cache freshness
            workspaceMtime ← GetWorkspaceModificationTime(workspaceDir)

            IF workspaceMtime <= cachedEntry.workspaceMtime THEN
                // Cache hit - return cached result
                cachedEntry.hits ← cachedEntry.hits + 1
                RETURN cachedEntry.result
            ELSE
                // Cache stale - invalidate
                cache.remove(cacheKey)
            END IF
        END IF
    END IF

    // Cache miss - perform extraction
    result ← ExtractFromWorkspace(
        workspaceDir,
        patterns,
        extractors,
        options
    )

    // Store in cache
    IF options.cacheEnabled AND result IS NOT NULL THEN
        entry ← CreateCacheEntry(
            key: cacheKey,
            result: result,
            timestamp: GetCurrentTime(),
            workspaceMtime: GetWorkspaceModificationTime(workspaceDir),
            hits: 0
        )

        cache.set(cacheKey, entry)

        // Evict old entries if cache full
        IF cache.size > cache.maxSize THEN
            EvictLRUEntries(cache)
        END IF
    END IF

    RETURN result
END

SUBROUTINE: GenerateCacheKey
INPUT:
    workspaceDir (string)
    patterns (array of FilePattern)
    extractors (array of SectionExtractor)
OUTPUT:
    key (string)

BEGIN
    components ← [
        workspaceDir,
        SerializePatterns(patterns),
        SerializeExtractors(extractors)
    ]

    concatenated ← Join(components, "|")
    hash ← SHA256(concatenated)

    RETURN hash
END

SUBROUTINE: EvictLRUEntries
INPUT: cache (ExtractionCache)
OUTPUT: none

BEGIN
    // Sort by last access time (LRU)
    entries ← cache.entries.values()
    SORT entries BY timestamp ASCENDING

    // Remove oldest 20% of entries
    toRemove ← entries.length * 0.2

    FOR i ← 0 TO toRemove DO
        cache.remove(entries[i].key)
    END FOR
END

COMPLEXITY ANALYSIS:
    Cache hit: O(1)
    Cache miss: O(D * F * P * E) - same as uncached
    Cache eviction: O(N log N) where N = cache size

    Performance improvement:
        - 100x faster for cache hits
        - Negligible overhead for cache misses

    Memory usage:
        - O(cache.maxSize * avgResultSize)
        - Typical: ~10MB for 1000 entries
```

---

## 10. Example Execution Traces

### Example 1: Successful Extraction

```
INPUT:
    workspaceDir: "/workspace/my-project"
    patterns: [
        { glob: "**/*SPEC*.md", priority: 100, directoryHint: "docs" },
        { glob: "**/*.md", priority: 50, directoryHint: null }
    ]
    extractors: [
        {
            regex: "## Specification\n(.*?)(?=\n##|\z)",
            sectionName: "specification",
            priority: 100,
            minLength: 50
        }
    ]
    options: {
        maxDepth: 5,
        maxFiles: 100,
        parallelReads: 4,
        preferRecent: true,
        cacheEnabled: true
    }

EXECUTION TRACE:

[00:00.000] Starting extraction from: /workspace/my-project
[00:00.001] Patterns: 2
[00:00.001] Extractors: 1

[00:00.002] Phase 1: Discovering directories
[00:00.045] Discovered 23 directories in 43ms
    - /workspace/my-project (priority: 0, depth: 0)
    - /workspace/my-project/docs (priority: 100, depth: 1)
    - /workspace/my-project/src (priority: 80, depth: 1)
    - /workspace/my-project/tests (priority: 30, depth: 1)
    - /workspace/my-project/node_modules (priority: -100, depth: 1)
    - ... (18 more directories)

[00:00.046] Phase 2: Prioritizing directories
    Sorted order:
    1. /workspace/my-project/docs (priority: 200)
    2. /workspace/my-project/src (priority: 80)
    3. /workspace/my-project/tests (priority: 30)
    ...

[00:00.047] Phase 3: Searching for matching files

[00:00.048] Searching directory: /workspace/my-project/docs
[00:00.055] Found 5 files in: /workspace/my-project/docs
    Files ranked:
    1. /workspace/my-project/docs/ARCHITECTURE-SPEC.md (score: 95.3)
    2. /workspace/my-project/docs/API-SPEC.md (score: 92.1)
    3. /workspace/my-project/docs/README.md (score: 78.5)
    4. /workspace/my-project/docs/CHANGELOG.md (score: 45.2)
    5. /workspace/my-project/docs/TODO.md (score: 30.1)

[00:00.056] Attempting extraction from: /workspace/my-project/docs/ARCHITECTURE-SPEC.md
[00:00.058] Reading file: /workspace/my-project/docs/ARCHITECTURE-SPEC.md
[00:00.062] Trying extractor: specification
[00:00.065] Extracted section: specification
    - Length: 1,247 characters
    - Confidence: 0.92

[00:00.066] SUCCESS: Extracted from /workspace/my-project/docs/ARCHITECTURE-SPEC.md
[00:00.066] Section: specification

RESULT:
    ExtractedContent {
        content: "This system is designed to...", (1,247 chars)
        filePath: "/workspace/my-project/docs/ARCHITECTURE-SPEC.md",
        sectionName: "specification",
        matchedPattern: "## Specification\n(.*?)(?=\n##|\z)",
        timestamp: "2025-10-24T10:30:00Z",
        confidence: 0.92
    }

METRICS:
    - Total time: 66ms
    - Directories discovered: 23
    - Directories searched: 1
    - Files found: 5
    - Files examined: 1
    - Extractors attempted: 1
    - Cache hit: false
```

### Example 2: Fallback Strategy Success

```
INPUT:
    workspaceDir: "/workspace/legacy-project"
    patterns: [
        { glob: "**/DESIGN.md", priority: 100, directoryHint: "docs" }
    ]
    extractors: [
        {
            regex: "# Design\n(.*?)(?=\n#|\z)",
            sectionName: "design",
            priority: 100,
            minLength: 100
        }
    ]
    options: { maxDepth: 5, maxFiles: 50, cacheEnabled: false }

EXECUTION TRACE:

[00:00.000] Starting extraction from: /workspace/legacy-project
[00:00.035] Discovered 45 directories in 35ms

[00:00.040] Phase 3: Searching for matching files
[00:00.042] Searching directory: /workspace/legacy-project/docs
[00:00.044] No matching files in: /workspace/legacy-project/docs

[00:00.045] Searching directory: /workspace/legacy-project/documentation
[00:00.047] No matching files in: /workspace/legacy-project/documentation

... (all primary strategies fail)

[00:00.230] Phase 4: No matches found, trying fallback

[00:00.231] Fallback 1: Relaxed pattern matching
[00:00.232] Created relaxed patterns:
    - **/DESIGN.md (original)
    - **/design.md (case-insensitive)
    - **/DESIGN.* (extension-agnostic)

[00:00.245] Found 2 files with relaxed patterns:
    1. /workspace/legacy-project/old-docs/design.txt (score: 67.3)
    2. /workspace/legacy-project/archive/DESIGN.backup.md (score: 54.2)

[00:00.246] Attempting extraction from: /workspace/legacy-project/old-docs/design.txt
[00:00.250] Trying extractor: design
[00:00.255] Extracted section: design
    - Length: 543 characters
    - Confidence: 0.48 (reduced from 0.60 due to fallback)

[00:00.256] SUCCESS: Extracted from /workspace/legacy-project/old-docs/design.txt

RESULT:
    ExtractedContent {
        content: "Legacy design notes...", (543 chars)
        filePath: "/workspace/legacy-project/old-docs/design.txt",
        sectionName: "design",
        matchedPattern: "# Design\n(.*?)(?=\n#|\z)",
        timestamp: "2025-10-24T10:31:00Z",
        confidence: 0.48
    }

METRICS:
    - Total time: 256ms
    - Primary strategies failed
    - Fallback strategy: 1 (relaxed patterns)
    - Files examined: 2
```

### Example 3: Complete Failure

```
INPUT:
    workspaceDir: "/workspace/empty-project"
    patterns: [{ glob: "**/*.spec", priority: 100 }]
    extractors: [{ regex: "SPEC:(.*)", sectionName: "spec", priority: 100, minLength: 10 }]
    options: { maxDepth: 3, maxFiles: 20 }

EXECUTION TRACE:

[00:00.000] Starting extraction from: /workspace/empty-project
[00:00.012] Discovered 3 directories in 12ms

[00:00.015] Phase 3: Searching for matching files
[00:00.020] No matching files found in any directory

[00:00.021] Phase 4: No matches found, trying fallback

[00:00.022] Fallback 1: Relaxed pattern matching
[00:00.025] No files found with relaxed patterns

[00:00.026] Fallback 2: Global workspace search
[00:00.030] Found 0 files matching any pattern

[00:00.031] Fallback 3: Partial content matching
[00:00.032] No files available for partial matching

[00:00.033] Fallback 4: Best-effort extraction
[00:00.034] No files available for best-effort extraction

[00:00.035] All fallback strategies failed
[00:00.036] Extraction failed: No matching content found

RESULT: null

METRICS:
    - Total time: 36ms
    - Directories searched: 3
    - Files found: 0
    - All strategies failed
```

---

## 11. Edge Cases and Error Handling

### Edge Case 1: Circular Symlinks

```
ALGORITHM: HandleCircularSymlinks
INPUT: path (string), visited (Set)
OUTPUT: shouldProcess (boolean)

BEGIN
    // Resolve to real path
    TRY
        realPath ← ResolveSymlink(path)
    CATCH error
        // Broken symlink
        RETURN false
    END TRY

    // Check if already visited
    IF visited.contains(realPath) THEN
        // Circular reference detected
        RETURN false
    END IF

    // Add to visited set
    visited.add(realPath)

    RETURN true
END
```

### Edge Case 2: Permission Denied

```
ALGORITHM: HandlePermissionError
INPUT: path (string), operation (string)
OUTPUT: shouldContinue (boolean)

BEGIN
    TRY
        // Attempt operation
        PERFORM operation ON path
        RETURN true

    CATCH PermissionError AS error
        // Log warning but continue
        logger.warn("Permission denied: " + path)
        metrics.recordPermissionError(path)

        // Continue processing other paths
        RETURN false

    CATCH error
        // Other errors - log and continue
        logger.error("Error accessing " + path + ": " + error.message)
        RETURN false
    END TRY
END
```

### Edge Case 3: Very Large Files

```
ALGORITHM: HandleLargeFile
INPUT: filePath (string), maxSize (integer)
OUTPUT: content (string) or null

BEGIN
    fileSize ← GetFileSize(filePath)

    IF fileSize > maxSize THEN
        logger.warn("File too large: " + filePath + " (" + fileSize + " bytes)")

        // Option 1: Skip file
        RETURN null

        // Option 2: Read first chunk only (streaming)
        // content ← ReadFileChunk(filePath, 0, maxSize)
        // RETURN content
    END IF

    // Normal file read
    RETURN ReadFile(filePath)
END

CONSTANTS:
    MAX_FILE_SIZE = 10 * 1024 * 1024  // 10 MB
```

### Edge Case 4: Binary Files

```
ALGORITHM: IsBinaryFile
INPUT: filePath (string)
OUTPUT: isBinary (boolean)

BEGIN
    // Read first 8KB
    sample ← ReadFileChunk(filePath, 0, 8192)

    // Check for null bytes (indicator of binary)
    FOR EACH byte IN sample DO
        IF byte = 0x00 THEN
            RETURN true
        END IF
    END FOR

    // Count non-text characters
    nonTextCount ← 0
    FOR EACH byte IN sample DO
        IF byte < 0x20 AND byte NOT IN [0x09, 0x0A, 0x0D] THEN
            nonTextCount ← nonTextCount + 1
        END IF
    END FOR

    // If more than 30% non-text, consider binary
    IF nonTextCount / sample.length > 0.3 THEN
        RETURN true
    END IF

    RETURN false
END
```

### Edge Case 5: Unicode and Encoding Issues

```
ALGORITHM: ReadFileWithEncodingDetection
INPUT: filePath (string)
OUTPUT: content (string) or null

BEGIN
    // Try UTF-8 first (most common)
    TRY
        content ← ReadFile(filePath, encoding: "UTF-8")
        RETURN content
    CATCH EncodingError
        // UTF-8 failed, try detection
    END TRY

    // Detect encoding from BOM or content analysis
    encoding ← DetectFileEncoding(filePath)

    IF encoding IS NOT NULL THEN
        TRY
            content ← ReadFile(filePath, encoding: encoding)
            RETURN content
        CATCH error
            logger.warn("Failed to read with detected encoding: " + encoding)
        END TRY
    END IF

    // Fallback: read as Latin-1 (never fails)
    TRY
        content ← ReadFile(filePath, encoding: "Latin-1")
        RETURN content
    CATCH error
        logger.error("Failed to read file with any encoding: " + filePath)
        RETURN null
    END TRY
END
```

---

## 12. Performance Characteristics Summary

### Time Complexity

| Operation | Best Case | Average Case | Worst Case |
|-----------|-----------|--------------|------------|
| Directory Discovery | O(D) | O(D) | O(D) |
| Directory Prioritization | O(D log D) | O(D log D) | O(D log D) |
| File Matching | O(F) | O(P * F) | O(P * F) |
| File Ranking | O(F) | O(F log F) | O(F log F) |
| Content Extraction | O(1) | O(E * C) | O(E * C) |
| Full Pipeline | O(D) | O(D * F * E * C) | O(D * F * E * C) |
| With Parallel (P workers) | O(D) | O(D * F/P * E * C) | O(D * F/P * E * C) |
| With Cache Hit | O(1) | O(1) | O(1) |

Legend:
- D = directories
- F = files per directory
- P = number of patterns OR parallel workers
- E = extractors
- C = content length

### Space Complexity

| Component | Space Usage |
|-----------|-------------|
| Directory Tree | O(D) |
| File List | O(F) |
| File Content | O(C) |
| Parallel Processing | O(P * C) |
| Cache | O(cache_size * C) |
| Total (worst case) | O(D + F + P * C + cache_size * C) |

### Optimization Impact

| Optimization | Speedup | Memory Impact |
|--------------|---------|---------------|
| Early Exit | 10-100x | None |
| Caching | 100x (on hit) | +10MB typical |
| Parallel (4 workers) | 3-4x | +4x per file |
| Directory Prioritization | 2-10x | None |
| File Ranking | 2-5x | None |

### Recommended Settings

```
For Small Projects (<1000 files):
    maxDepth: 10
    maxFiles: 100
    parallelReads: 2
    cacheEnabled: false

For Medium Projects (1000-10000 files):
    maxDepth: 8
    maxFiles: 200
    parallelReads: 4
    cacheEnabled: true

For Large Projects (>10000 files):
    maxDepth: 6
    maxFiles: 500
    parallelReads: 8
    cacheEnabled: true
```

---

## 13. Implementation Notes

### Language-Specific Considerations

**JavaScript/Node.js:**
```
- Use fs.promises for async file operations
- Use p-limit for concurrency control
- Use minimatch or glob for pattern matching
- Use regex with 's' flag for multiline
```

**Python:**
```
- Use pathlib for path operations
- Use asyncio for async operations
- Use glob.glob with recursive=True
- Use re.DOTALL for multiline regex
```

**Go:**
```
- Use filepath.Walk for directory traversal
- Use goroutines with sync.WaitGroup
- Use filepath.Match or doublestar for glob
- Use regexp with (?s) flag for multiline
```

### Testing Strategy

```
Unit Tests:
    - CalculateDirectoryPriority with various inputs
    - GlobMatch with edge cases
    - RankFiles scoring logic
    - ValidateExtractedContent edge cases
    - Cache key generation uniqueness

Integration Tests:
    - Full extraction pipeline with mock filesystem
    - Parallel extraction with race condition checks
    - Fallback strategy execution order
    - Cache invalidation scenarios

Performance Tests:
    - Large directory tree (10k+ dirs)
    - Many files per directory (1k+ files)
    - Large file handling (100MB+ files)
    - Cache hit/miss ratios
    - Parallel speedup measurements
```

### Monitoring and Metrics

```
Key Metrics to Track:
    - Extraction success rate
    - Average extraction time
    - Cache hit rate
    - Files examined per extraction
    - Directories searched per extraction
    - Fallback strategy usage frequency
    - Error rates by type
    - Confidence score distribution

Logging Levels:
    ERROR: Extraction failures, critical errors
    WARN: Fallbacks, permission issues, large files skipped
    INFO: Extraction success, phase transitions
    DEBUG: File attempts, extractor attempts, rankings
```

---

## Conclusion

This universal extraction algorithm provides:

1. **Robustness**: Multiple fallback strategies ensure best-effort extraction
2. **Performance**: Parallel processing and caching for speed
3. **Flexibility**: Configurable patterns and extractors
4. **Intelligence**: Smart prioritization and ranking
5. **Observability**: Comprehensive logging and metrics

The algorithm is designed to handle real-world complexity including permission issues, large files, symlinks, and missing content while maintaining optimal performance through caching and parallel processing.

**Key Design Principles:**
- Fail gracefully with fallbacks
- Log extensively for debugging
- Optimize for common cases
- Handle edge cases robustly
- Provide confidence scoring

**Estimated Performance:**
- Small projects: <100ms
- Medium projects: 100-500ms
- Large projects: 500ms-2s
- Cache hits: <1ms
