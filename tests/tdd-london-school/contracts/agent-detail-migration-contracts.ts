/**
 * TDD London School: Component Migration Contracts
 * 
 * COMPONENT CONTRACTS FOR PHASE 2 MIGRATION:
 * 
 * These contracts define the expected behaviors and interactions for each
 * component being migrated from AgentDetail to UnifiedAgentPage pattern.
 * 
 * LONDON SCHOOL PRINCIPLES:
 * 1. Define contracts BEFORE implementation
 * 2. Focus on BEHAVIOR over state
 * 3. Mock collaborations to isolate units
 * 4. Verify interactions between objects
 */

import { UnifiedAgentData } from '../../../frontend/src/components/UnifiedAgentPage';

// Base Contract Interface
export interface ComponentContract {
  name: string;
  version: string;
  migratedFrom: string;
  description: string;
  responsibilities: string[];
  collaborators: string[];
  behaviors: BehaviorContract[];
}

export interface BehaviorContract {
  name: string;
  description: string;
  input: any;
  output: any;
  sideEffects: string[];
  preconditions: string[];
  postconditions: string[];
  errorConditions: ErrorCondition[];
}

export interface ErrorCondition {
  condition: string;
  expectedBehavior: string;
  recoveryStrategy: string;
}

// Mock Interaction Patterns
export interface MockInteraction {
  method: string;
  input: any;
  expectedOutput: any;
  sideEffects: string[];
  callCount?: number;
  callOrder?: number;
}

// AgentDefinition Component Contract
export const AGENT_DEFINITION_CONTRACT: ComponentContract = {
  name: 'AgentDefinitionComponent',
  version: '2.0.0',
  migratedFrom: 'AgentDetail.jsx',
  description: 'Renders agent markdown definition with interactive features',
  responsibilities: [
    'Parse markdown content into structured sections',
    'Generate table of contents from headers',
    'Render markdown with syntax highlighting',
    'Provide copy-to-clipboard functionality',
    'Enable markdown file download',
    'Switch between rendered and source views',
    'Handle empty or malformed markdown gracefully'
  ],
  collaborators: [
    'MarkdownParser',
    'ContentRenderer', 
    'ClipboardManager',
    'FileDownloader',
    'TableOfContentsGenerator',
    'SyntaxHighlighter'
  ],
  behaviors: [
    {
      name: 'parseMarkdownContent',
      description: 'Parses raw markdown into structured sections with metadata',
      input: { definition: 'string' },
      output: {
        sections: 'Section[]',
        toc: 'TocItem[]', 
        metadata: 'object'
      },
      sideEffects: ['toc_generation', 'section_extraction', 'header_indexing'],
      preconditions: ['definition_exists', 'definition_is_string'],
      postconditions: ['sections_array_created', 'toc_array_created'],
      errorConditions: [
        {
          condition: 'empty_definition',
          expectedBehavior: 'return_empty_structure',
          recoveryStrategy: 'show_no_content_message'
        },
        {
          condition: 'malformed_markdown',
          expectedBehavior: 'parse_best_effort',
          recoveryStrategy: 'display_warning_and_content'
        }
      ]
    },
    {
      name: 'copyContentToClipboard',
      description: 'Copies markdown content to system clipboard',
      input: { content: 'string' },
      output: { success: 'boolean' },
      sideEffects: ['clipboard_write', 'success_notification_display'],
      preconditions: ['clipboard_api_available', 'content_not_empty'],
      postconditions: ['content_in_clipboard', 'notification_shown'],
      errorConditions: [
        {
          condition: 'clipboard_api_unavailable',
          expectedBehavior: 'show_fallback_message',
          recoveryStrategy: 'provide_manual_copy_instructions'
        },
        {
          condition: 'clipboard_write_failed',
          expectedBehavior: 'show_error_message',
          recoveryStrategy: 'offer_download_alternative'
        }
      ]
    },
    {
      name: 'downloadMarkdownFile',
      description: 'Initiates download of markdown content as file',
      input: { content: 'string', filename: 'string' },
      output: { initiated: 'boolean' },
      sideEffects: ['blob_creation', 'download_trigger', 'temp_link_creation'],
      preconditions: ['content_exists', 'filename_valid'],
      postconditions: ['download_started', 'temp_elements_cleaned'],
      errorConditions: [
        {
          condition: 'download_blocked',
          expectedBehavior: 'show_blocked_message',
          recoveryStrategy: 'provide_alternative_access_method'
        }
      ]
    },
    {
      name: 'toggleViewMode',
      description: 'Switches between rendered and source view modes',
      input: { mode: '"rendered" | "source"' },
      output: { currentMode: '"rendered" | "source"' },
      sideEffects: ['view_re_render', 'mode_button_update'],
      preconditions: ['valid_mode_provided'],
      postconditions: ['view_updated', 'mode_persisted'],
      errorConditions: [
        {
          condition: 'invalid_mode',
          expectedBehavior: 'default_to_rendered',
          recoveryStrategy: 'log_error_and_continue'
        }
      ]
    }
  ]
};

// AgentProfile Component Contract
export const AGENT_PROFILE_CONTRACT: ComponentContract = {
  name: 'AgentProfileComponent',
  version: '2.0.0',
  migratedFrom: 'AgentDetail.jsx',
  description: 'Displays human-oriented agent information and capabilities',
  responsibilities: [
    'Display agent purpose and mission statement',
    'Calculate and show agent statistics',
    'Render core strengths and capabilities',
    'Show common use cases with examples',
    'Display technical capabilities as badges',
    'Format programming language support',
    'Show limitations and considerations',
    'Provide external resource links',
    'Display metadata in readable format'
  ],
  collaborators: [
    'StatisticsCalculator',
    'CapabilityRenderer',
    'MetadataFormatter',
    'BadgeGenerator',
    'LinkValidator',
    'DateFormatter'
  ],
  behaviors: [
    {
      name: 'calculateAgentStatistics',
      description: 'Computes display metrics from agent data',
      input: { agent: 'UnifiedAgentData' },
      output: {
        capabilityCount: 'number',
        version: 'string',
        fileCount: 'number',
        languageCount: 'number'
      },
      sideEffects: ['metric_computation', 'badge_color_assignment'],
      preconditions: ['agent_data_exists'],
      postconditions: ['statistics_calculated', 'display_ready'],
      errorConditions: [
        {
          condition: 'missing_agent_data',
          expectedBehavior: 'return_zero_metrics',
          recoveryStrategy: 'show_no_data_available_message'
        }
      ]
    },
    {
      name: 'renderCapabilityBadges',
      description: 'Creates visual representation of agent capabilities',
      input: { capabilities: 'string[]', strengths: 'string[]' },
      output: { badges: 'BadgeElement[]' },
      sideEffects: ['badge_creation', 'color_categorization'],
      preconditions: ['arrays_provided'],
      postconditions: ['badges_rendered', 'categories_assigned'],
      errorConditions: [
        {
          condition: 'empty_capabilities',
          expectedBehavior: 'show_no_capabilities_message',
          recoveryStrategy: 'display_fallback_content'
        }
      ]
    },
    {
      name: 'formatExternalLinks',
      description: 'Validates and formats external resource links',
      input: { metadata: 'object' },
      output: { validLinks: 'LinkElement[]' },
      sideEffects: ['link_validation', 'icon_assignment'],
      preconditions: ['metadata_object_exists'],
      postconditions: ['links_validated', 'security_attributes_added'],
      errorConditions: [
        {
          condition: 'invalid_url',
          expectedBehavior: 'skip_invalid_link',
          recoveryStrategy: 'continue_with_valid_links'
        }
      ]
    },
    {
      name: 'displayUseCaseExamples',
      description: 'Shows practical examples of agent usage',
      input: { useCases: 'string[]' },
      output: { exampleCards: 'ExampleElement[]' },
      sideEffects: ['example_generation', 'scenario_description_creation'],
      preconditions: ['use_cases_array_exists'],
      postconditions: ['examples_displayed', 'scenarios_described'],
      errorConditions: [
        {
          condition: 'no_use_cases',
          expectedBehavior: 'show_general_purpose_message',
          recoveryStrategy: 'provide_generic_examples'
        }
      ]
    }
  ]
};

// AgentPages Component Contract
export const AGENT_PAGES_CONTRACT: ComponentContract = {
  name: 'AgentPagesComponent',
  version: '2.0.0',
  migratedFrom: 'AgentDetail.jsx',
  description: 'Manages and displays agent documentation pages and links',
  responsibilities: [
    'Display grid of available documentation pages',
    'Provide search functionality across pages',
    'Classify pages by type and importance',
    'Handle external link navigation',
    'Show quick access to common page types',
    'Display page metadata (read time, last modified)',
    'Provide download links for downloadable pages',
    'Show external resources and links',
    'Handle page preview and bookmarking'
  ],
  collaborators: [
    'SearchEngine',
    'PageClassifier',
    'NavigationHandler',
    'MetadataFormatter',
    'IconProvider',
    'LinkHandler'
  ],
  behaviors: [
    {
      name: 'filterPagesBySearch',
      description: 'Filters page list based on search criteria',
      input: { pages: 'Page[]', searchTerm: 'string' },
      output: { filteredPages: 'Page[]' },
      sideEffects: ['search_highlighting', 'result_count_update'],
      preconditions: ['pages_array_exists', 'search_term_string'],
      postconditions: ['filtered_results_available', 'highlights_applied'],
      errorConditions: [
        {
          condition: 'empty_search_result',
          expectedBehavior: 'show_no_results_message',
          recoveryStrategy: 'suggest_search_alternatives'
        }
      ]
    },
    {
      name: 'classifyPageType',
      description: 'Determines page category and assigns appropriate styling',
      input: { page: 'Page' },
      output: { 
        type: 'PageType',
        icon: 'IconElement',
        badge: 'BadgeElement'
      },
      sideEffects: ['icon_assignment', 'color_classification', 'priority_setting'],
      preconditions: ['page_object_valid'],
      postconditions: ['type_assigned', 'visual_elements_ready'],
      errorConditions: [
        {
          condition: 'unknown_page_type',
          expectedBehavior: 'default_to_documentation',
          recoveryStrategy: 'use_generic_styling'
        }
      ]
    },
    {
      name: 'handlePageNavigation',
      description: 'Manages navigation to internal and external pages',
      input: { page: 'Page', target: '"_blank" | "_self"' },
      output: { navigationResult: 'NavigationResult' },
      sideEffects: ['page_opening', 'tracking_event', 'history_update'],
      preconditions: ['page_has_valid_path', 'user_has_permission'],
      postconditions: ['navigation_completed', 'event_logged'],
      errorConditions: [
        {
          condition: 'blocked_popup',
          expectedBehavior: 'show_popup_blocked_message',
          recoveryStrategy: 'provide_direct_link'
        },
        {
          condition: 'invalid_url',
          expectedBehavior: 'show_error_message',
          recoveryStrategy: 'prevent_navigation'
        }
      ]
    },
    {
      name: 'generateQuickAccessCards',
      description: 'Creates quick access interface for common page types',
      input: { pages: 'Page[]' },
      output: { quickCards: 'QuickCardElement[]' },
      sideEffects: ['card_generation', 'availability_checking'],
      preconditions: ['pages_array_provided'],
      postconditions: ['quick_cards_available', 'status_indicators_set'],
      errorConditions: [
        {
          condition: 'no_common_pages',
          expectedBehavior: 'show_unavailable_cards',
          recoveryStrategy: 'provide_alternative_navigation'
        }
      ]
    }
  ]
};

// AgentFileSystem Component Contract
export const AGENT_FILE_SYSTEM_CONTRACT: ComponentContract = {
  name: 'AgentFileSystemComponent',
  version: '2.0.0',
  migratedFrom: 'AgentDetail.jsx',
  description: 'Provides file system browser and content preview functionality',
  responsibilities: [
    'Render interactive file tree structure',
    'Handle folder expansion and collapse',
    'Provide file content preview',
    'Enable file search across workspace',
    'Support file downloading',
    'Display file type icons and metadata',
    'Handle large directory structures efficiently',
    'Show workspace statistics and summaries',
    'Provide syntax highlighting for code files',
    'Handle file system errors gracefully'
  ],
  collaborators: [
    'FileTreeRenderer',
    'ContentPreview',
    'SearchEngine',
    'DownloadManager',
    'SyntaxHighlighter',
    'IconProvider',
    'StatisticsCalculator'
  ],
  behaviors: [
    {
      name: 'renderFileTreeStructure',
      description: 'Creates interactive hierarchical file browser',
      input: { 
        structure: 'FileSystemItem[]',
        expandedFolders: 'Set<string>',
        selectedPath: 'string'
      },
      output: { treeElements: 'TreeElement[]' },
      sideEffects: ['expansion_state_tracking', 'selection_highlighting'],
      preconditions: ['structure_array_valid', 'expansion_set_exists'],
      postconditions: ['tree_rendered', 'interactions_enabled'],
      errorConditions: [
        {
          condition: 'empty_structure',
          expectedBehavior: 'show_empty_workspace_message',
          recoveryStrategy: 'provide_refresh_option'
        },
        {
          condition: 'corrupted_structure_data',
          expectedBehavior: 'filter_invalid_items',
          recoveryStrategy: 'log_error_and_continue'
        }
      ]
    },
    {
      name: 'previewFileContent',
      description: 'Loads and displays file content with appropriate formatting',
      input: { file: 'FileSystemItem' },
      output: { 
        content: 'string',
        contentType: 'string',
        syntaxHighlighted: 'boolean'
      },
      sideEffects: ['api_request', 'syntax_highlighting', 'content_caching'],
      preconditions: ['file_is_valid', 'file_is_readable'],
      postconditions: ['content_displayed', 'formatting_applied'],
      errorConditions: [
        {
          condition: 'file_too_large',
          expectedBehavior: 'show_size_warning',
          recoveryStrategy: 'offer_download_instead'
        },
        {
          condition: 'binary_file',
          expectedBehavior: 'show_binary_message',
          recoveryStrategy: 'provide_download_option'
        },
        {
          condition: 'api_error',
          expectedBehavior: 'show_mock_content',
          recoveryStrategy: 'indicate_content_is_mocked'
        }
      ]
    },
    {
      name: 'searchFileSystem',
      description: 'Searches through file names and paths',
      input: { searchTerm: 'string', structure: 'FileSystemItem[]' },
      output: { matches: 'FileSystemItem[]' },
      sideEffects: ['search_result_highlighting', 'result_count_update'],
      preconditions: ['search_term_provided', 'structure_available'],
      postconditions: ['results_filtered', 'matches_highlighted'],
      errorConditions: [
        {
          condition: 'no_search_results',
          expectedBehavior: 'show_no_results_message',
          recoveryStrategy: 'suggest_broader_search'
        }
      ]
    },
    {
      name: 'downloadFileContent',
      description: 'Initiates file download with proper file handling',
      input: { file: 'FileSystemItem', content: 'string' },
      output: { downloadInitiated: 'boolean' },
      sideEffects: ['blob_creation', 'download_trigger', 'cleanup'],
      preconditions: ['file_selected', 'content_available'],
      postconditions: ['download_started', 'resources_cleaned'],
      errorConditions: [
        {
          condition: 'download_blocked',
          expectedBehavior: 'show_download_blocked_message',
          recoveryStrategy: 'provide_copy_alternative'
        }
      ]
    },
    {
      name: 'calculateWorkspaceStatistics',
      description: 'Computes workspace metrics and summaries',
      input: { structure: 'FileSystemItem[]' },
      output: {
        totalItems: 'number',
        folderCount: 'number',
        fileCount: 'number',
        totalSize: 'string'
      },
      sideEffects: ['metric_calculation', 'size_formatting'],
      preconditions: ['structure_available'],
      postconditions: ['statistics_calculated', 'display_ready'],
      errorConditions: [
        {
          condition: 'invalid_size_data',
          expectedBehavior: 'estimate_sizes',
          recoveryStrategy: 'show_approximate_values'
        }
      ]
    }
  ]
};

// Integration Contract
export const UNIFIED_INTEGRATION_CONTRACT: ComponentContract = {
  name: 'UnifiedAgentPageIntegration',
  version: '2.0.0',
  migratedFrom: 'AgentDetail.jsx',
  description: 'Coordinates all migrated components within unified interface',
  responsibilities: [
    'Orchestrate data flow between components',
    'Manage tab navigation and state',
    'Handle component loading and error states',
    'Coordinate API data fetching',
    'Ensure consistent user experience',
    'Manage component lifecycle',
    'Handle cross-component interactions',
    'Maintain performance optimization'
  ],
  collaborators: [
    'UnifiedAgentPage',
    'AgentDefinitionComponent',
    'AgentProfileComponent', 
    'AgentPagesComponent',
    'AgentFileSystemComponent',
    'APIClient',
    'StateManager'
  ],
  behaviors: [
    {
      name: 'coordinateComponentRendering',
      description: 'Manages rendering of all migrated components',
      input: { agentData: 'UnifiedAgentData', activeTab: 'string' },
      output: { renderResult: 'ComponentRenderResult' },
      sideEffects: ['component_mounting', 'data_distribution', 'state_synchronization'],
      preconditions: ['agent_data_loaded', 'components_available'],
      postconditions: ['all_components_rendered', 'state_synchronized'],
      errorConditions: [
        {
          condition: 'component_render_failure',
          expectedBehavior: 'isolate_error_to_component',
          recoveryStrategy: 'show_error_boundary_and_continue'
        }
      ]
    },
    {
      name: 'manageTabNavigation',
      description: 'Handles switching between different component views',
      input: { targetTab: 'string', currentState: 'object' },
      output: { navigationResult: 'NavigationResult' },
      sideEffects: ['tab_activation', 'url_update', 'component_focus'],
      preconditions: ['valid_tab_specified', 'user_has_permission'],
      postconditions: ['tab_switched', 'state_preserved'],
      errorConditions: [
        {
          condition: 'invalid_tab',
          expectedBehavior: 'default_to_overview',
          recoveryStrategy: 'log_error_and_redirect'
        }
      ]
    },
    {
      name: 'handleDataFlowCoordination',
      description: 'Ensures consistent data distribution across components',
      input: { sourceData: 'any', targetComponents: 'string[]' },
      output: { distributionResult: 'DataDistributionResult' },
      sideEffects: ['data_transformation', 'component_updates', 'cache_updates'],
      preconditions: ['source_data_valid', 'target_components_available'],
      postconditions: ['data_distributed', 'components_updated'],
      errorConditions: [
        {
          condition: 'data_transformation_failure',
          expectedBehavior: 'use_fallback_data',
          recoveryStrategy: 'show_warning_and_continue'
        }
      ]
    }
  ]
};

// Mock Contracts for Testing
export const MOCK_CONTRACTS = {
  agentDefinition: {
    parseMarkdown: {
      input: { definition: 'string' },
      output: { sections: 'array', toc: 'array', metadata: 'object' },
      defaultMock: {
        sections: [
          { id: 'test', title: 'Test Section', level: 1, content: ['# Test'] }
        ],
        toc: [
          { id: 'test', title: 'Test Section', level: 1 }
        ],
        metadata: {}
      }
    },
    copyContent: {
      input: { content: 'string' },
      output: { success: 'boolean' },
      defaultMock: true
    },
    downloadFile: {
      input: { content: 'string', filename: 'string' },
      output: { initiated: 'boolean' },
      defaultMock: true
    }
  },
  agentProfile: {
    calculateStatistics: {
      input: { agent: 'object' },
      output: { stats: 'object' },
      defaultMock: {
        capabilities: 4,
        version: '1.0.0',
        fileCount: 10,
        languages: 2
      }
    },
    renderCapabilities: {
      input: { capabilities: 'array', strengths: 'array' },
      output: { badges: 'array' },
      defaultMock: ['Capability 1', 'Capability 2']
    }
  },
  agentPages: {
    filterPages: {
      input: { pages: 'array', searchTerm: 'string' },
      output: { filteredPages: 'array' },
      defaultMock: []
    },
    classifyPageType: {
      input: { page: 'object' },
      output: { type: 'string', icon: 'string', color: 'string' },
      defaultMock: { type: 'documentation', icon: 'document', color: 'blue' }
    }
  },
  agentFileSystem: {
    renderFileTree: {
      input: { structure: 'array', expandedFolders: 'set' },
      output: { treeElements: 'array' },
      defaultMock: []
    },
    previewFile: {
      input: { file: 'object' },
      output: { content: 'string', type: 'string' },
      defaultMock: { content: 'Mock content', type: 'text/plain' }
    }
  }
} as const;

// Export all contracts for use in tests
export const ALL_MIGRATION_CONTRACTS = [
  AGENT_DEFINITION_CONTRACT,
  AGENT_PROFILE_CONTRACT,
  AGENT_PAGES_CONTRACT,
  AGENT_FILE_SYSTEM_CONTRACT,
  UNIFIED_INTEGRATION_CONTRACT
] as const;