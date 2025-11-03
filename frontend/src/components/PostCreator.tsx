import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Bold,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Code,
  Image,
  Paperclip,
  Send,
  Save,
  Eye,
  EyeOff,
  Tag,
  Users,
  AtSign,
  Smile,
  MoreHorizontal,
  X,
  Plus,
  Globe,
  Lock,
  Bot,
  Hash,
  FileText,
  AlertCircle,
  Check,
  HelpCircle,
  Smartphone,
  Heart
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../utils/cn';
import { EmojiPicker } from './EmojiPicker';
import { MentionInput, MentionInputRef, MentionSuggestion } from './MentionInput';
import { useKeyboardShortcuts, useShortcutsHelp } from '../hooks/useKeyboardShortcuts';
import { TemplateLibrary } from './post-creation/TemplateLibrary';
import { useTemplates } from '../hooks/useTemplates';
import { useDraftManager } from '../hooks/useDraftManager';
import { Template } from '../types/templates';
import { Draft } from '../types/drafts';

// PostTemplate now imported from types

interface AgentMention {
  id: string;
  name: string;
  displayName: string;
  description: string;
  avatar?: string;
}

interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image?: string;
  domain: string;
}

// PostDraft interface removed - now using proper Draft type from DraftService

interface PostCreatorProps {
  className?: string;
  onPostCreated?: (post: any) => void;
  replyToPostId?: string;
  initialContent?: string;
  mode?: 'create' | 'reply' | 'edit';
  editDraft?: Draft | null;
}

// Mock data for development
const mockAgents: AgentMention[] = [
  { id: 'chief-of-staff', name: 'chief-of-staff-agent', displayName: 'Chief of Staff', description: 'Strategic coordination and planning' },
  { id: 'personal-todos', name: 'personal-todos-agent', displayName: 'Personal Todos', description: 'Task and project management' },
  { id: 'meeting-prep', name: 'meeting-prep-agent', displayName: 'Meeting Prep', description: 'Meeting preparation and coordination' },
  { id: 'impact-filter', name: 'impact-filter-agent', displayName: 'Impact Filter', description: 'Business impact analysis' },
  { id: 'goal-analyst', name: 'goal-analyst-agent', displayName: 'Goal Analyst', description: 'Goal tracking and analysis' },
  { id: 'opportunity-scout', name: 'opportunity-scout-agent', displayName: 'Opportunity Scout', description: 'Market opportunity identification' },
];

const mockTemplates: PostTemplate[] = [
  {
    id: 'status-update',
    name: 'Status Update',
    title: 'Weekly Progress Report',
    hook: 'Key achievements and upcoming priorities',
    content: '## Completed This Week\\n- \\n\\n## Upcoming Priorities\\n- \\n\\n## Blockers & Support Needed\\n- ',
    tags: ['status', 'weekly'],
    category: 'update'
  },
  {
    id: 'insight-share',
    name: 'Insight Share',
    title: 'Key Insight: ',
    hook: 'Important finding that could impact our strategy',
    content: '## The Insight\\n\\n## Why It Matters\\n\\n## Recommended Actions\\n',
    tags: ['insight', 'strategy'],
    category: 'insight'
  },
  {
    id: 'question-ask',
    name: 'Question/Ask',
    title: 'Need Input: ',
    hook: 'Looking for team input on an important decision',
    content: '## The Question\\n\\n## Background Context\\n\\n## Options Being Considered\\n\\n## Timeline for Decision\\n',
    tags: ['question', 'input-needed'],
    category: 'question'
  },
  {
    id: 'announcement',
    name: 'Announcement',
    title: 'Important Update: ',
    hook: 'Significant change or update that affects the team',
    content: '## What\'s Changing\\n\\n## Why This Change\\n\\n## Impact on You\\n\\n## Next Steps\\n',
    tags: ['announcement', 'update'],
    category: 'announcement'
  }
];

const commonTags = [
  'strategy', 'productivity', 'update', 'insight', 'question', 'urgent', 'meeting',
  'planning', 'analysis', 'opportunity', 'feedback', 'coordination', 'goals',
  'weekly', 'monthly', 'project', 'team', 'performance', 'metrics'
];

export const PostCreator: React.FC<PostCreatorProps> = ({
  className,
  onPostCreated,
  replyToPostId,
  initialContent = '',
  mode = 'create',
  editDraft = null
}) => {
  // Form state
  const [title, setTitle] = useState('');
  const [hook, setHook] = useState('');
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState<string[]>([]);
  const [agentMentions, setAgentMentions] = useState<string[]>([]);

  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Rich editor state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Refs
  const contentRef = useRef<MentionInputRef>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Character limits
  const TITLE_LIMIT = 200;
  const HOOK_LIMIT = 300;
  const CONTENT_LIMIT = 5000;

  // Get shortcuts help data
  const shortcutsHelp = useShortcutsHelp();
  
  // Draft management
  const { createDraft, updateDraft, deleteDraft } = useDraftManager();
  
  // Navigation and location state
  const location = useLocation();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle draft editing from both navigation state and editDraft prop
  useEffect(() => {
    let draftToEdit: Draft | null = null;
    
    // Check for editDraft prop first (from modal)
    if (editDraft) {
      draftToEdit = editDraft;
    } else {
      // Fallback to navigation state (from direct navigation)
      const navState = location.state as any;
      if (navState?.editDraft && navState?.mode === 'edit') {
        draftToEdit = navState.editDraft as Draft;
        // Clear the navigation state to prevent re-loading on re-renders
        window.history.replaceState({}, document.title);
      }
    }
    
    if (draftToEdit) {
      // Parse the draft content - it was combined as title + hook + content
      const contentLines = draftToEdit.content.split('\n\n');
      const draftTitle = draftToEdit.title;
      
      // Set form fields from draft
      setTitle(draftTitle);
      if (contentLines.length > 1) {
        setHook(contentLines[1] || '');
        setContent(contentLines.slice(2).join('\n\n') || contentLines[0] || '');
      } else {
        setContent(draftToEdit.content);
      }
      setTags(draftToEdit.tags || []);
      setIsDraft(true);
      
      console.log('Draft loaded for editing:', draftToEdit.title);
    }
  }, [location, editDraft]);

  // Define saveDraft with proper edit mode handling
  const saveDraft = useCallback(async () => {
    if (!title && !hook && !content) return;

    try {
      // Create draft content combining title, hook, and content
      const draftContent = [title, hook, content].filter(Boolean).join('\n\n');
      const draftTitle = title || 'Untitled Draft';
      
      // CRITICAL FIX: Check if we're editing an existing draft
      if ((mode === 'edit' || editDraft) && editDraft?.id) {
        // Update existing draft
        await updateDraft(editDraft.id, {
          title: draftTitle,
          content: draftContent,
          tags
        });
        console.log('Draft updated successfully:', editDraft.id);
      } else {
        // Create new draft
        await createDraft(draftTitle, draftContent, tags);
        console.log('New draft created successfully');
      }
      
      setLastSaved(new Date());
      setIsDraft(true);
      
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }, [title, hook, content, tags, mode, editDraft, createDraft, updateDraft]);

  // Define handleSubmit after saveDraft
  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      const postData = {
        title: title.trim(),
        content: content.trim(),
        author_agent: 'demo-user-123', // FIXED: Use correct user ID for display name "Nerd"
        metadata: {
          businessImpact: 5, // Default impact
          tags,
          isAgentResponse: false,
          hook: hook.trim() || undefined,
          postType: 'insight',
          agentMentions,
          replyToPostId,
          wordCount: content.trim().split(/\s+/).length,
          readingTime: Math.ceil(content.trim().split(/\s+/).length / 200)
        }
      };

      // Submit to AgentLink API
      const response = await fetch('/api/v1/agent-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create post');
      }

      const result = await response.json();
      
      // CRITICAL: Delete draft if we published from an existing draft
      if ((mode === 'edit' || editDraft) && editDraft?.id) {
        try {
          await deleteDraft(editDraft.id);
          console.log('Draft deleted after publishing:', editDraft.id);
        } catch (deleteError) {
          console.error('Failed to delete draft after publishing:', deleteError);
          // Don't fail the entire operation if draft deletion fails
        }
      }
      
      onPostCreated?.(result.data);
      
      // Reset form
      setTitle('');
      setHook('');
      setContent('');
      setTags([]);
      setAgentMentions([]);
      clearDraft();
      
    } catch (error) {
      console.error('Failed to create post:', error);
      // TODO: Show error message to user
    } finally {
      setIsSubmitting(false);
    }
  }, [title, hook, content, tags, agentMentions, replyToPostId, onPostCreated, mode, editDraft, deleteDraft]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: {
      'cmd+enter': handleSubmit,
      'cmd+s': saveDraft,
      'cmd+b': () => insertFormatting('bold'),
      'cmd+i': () => insertFormatting('italic'),
      'cmd+k': () => insertFormatting('link'),
      'cmd+shift+p': () => setShowPreview(!showPreview),
      'escape': () => {
        setShowEmojiPicker(false);
        setShowAgentPicker(false);
        setShowTagSuggestions(false);
        setShowShortcutsHelp(false);
      },
      'cmd+/': () => setShowShortcutsHelp(!showShortcutsHelp)
    },
    enabled: true
  });

  // Auto-save functionality
  useEffect(() => {
    if (title || hook || content || tags.length > 0) {
      const timer = setTimeout(() => {
        saveDraft();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [title, hook, content, tags]);

  // Link preview detection
  useEffect(() => {
    const urls = content.match(/https?:\/\/[^\s]+/g);
    if (urls && urls.length > 0) {
      detectLinkPreview(urls[0]);
    } else {
      setLinkPreview(null);
    }
  }, [content]);

  const detectLinkPreview = async (url: string) => {
    try {
      // In a real app, this would call a backend service
      // For now, simulate link preview
      const domain = new URL(url).hostname;
      setLinkPreview({
        url,
        title: `Sample Title from ${domain}`,
        description: 'This is a simulated link preview description.',
        domain,
        image: undefined
      });
    } catch (error) {
      console.error('Failed to generate link preview:', error);
    }
  };

  // Note: Draft loading/management now handled by DraftManager component
  // Individual drafts should be managed through the /drafts page
  const loadDraft = useCallback(() => {
    // Draft loading is now handled by the DraftManager component
    // This maintains the existing interface but doesn't conflict with DraftService
    console.log('Draft loading now handled by DraftManager - visit /drafts page');
  }, []);

  const clearDraft = () => {
    // Clear form state instead of conflicting with DraftService
    setTitle('');
    setHook('');  
    setContent('');
    setTags([]);
    setAgentMentions([]);
    setIsDraft(false);
    setLastSaved(null);
    console.log('Form cleared - drafts are managed via DraftService');
  };

  const applyTemplate = (template: PostTemplate) => {
    setTitle(template.title);
    setHook(template.hook);
    setContent(template.content);
    setTags(template.tags);
    setShowTemplates(false);
  };

  // CRITICAL FIX: Simplified formatting for MentionInput compatibility
  const insertFormatting = (format: string) => {
    if (!contentRef.current) return;

    const start = contentRef.current.selectionStart;
    const end = contentRef.current.selectionEnd;
    const selectedText = content.substring(start, end);

    let newText = '';
    switch (format) {
      case 'bold':
        newText = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        newText = `*${selectedText || 'italic text'}*`;
        break;
      case 'code':
        newText = `\`${selectedText || 'code'}\``;
        break;
      case 'link':
        newText = `[${selectedText || 'link text'}](url)`;
        break;
      case 'list':
        newText = `\n- ${selectedText || 'list item'}`;
        break;
      case 'numbered-list':
        newText = `\n1. ${selectedText || 'list item'}`;
        break;
    }

    const newContent = content.substring(0, start) + newText + content.substring(end);
    setContent(newContent);
  };

  const addTag = (tag: string) => {
    const cleanTag = tag.toLowerCase().trim();
    if (cleanTag && !tags.includes(cleanTag)) {
      setTags([...tags, cleanTag]);
    }
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleMentionSelect = useCallback((mention: MentionSuggestion) => {
    console.log('🎯 PostCreator: Mention selected', mention);
    // Track mentioned agents for form submission (avoid duplicates)
    setAgentMentions(prev => {
      if (!prev.includes(mention.name)) {
        return [...prev, mention.name];
      }
      return prev;
    });
    // Note: MentionInput handles text insertion automatically
    setShowAgentPicker(false);
    setAgentSearchQuery('');
  }, []);

  const addAgentMention = (agentId: string) => {
    if (!agentMentions.includes(agentId)) {
      setAgentMentions([...agentMentions, agentId]);
    }
    setShowAgentPicker(false);
    setAgentSearchQuery('');
  };

  const addEmoji = (emoji: string) => {
    const newContent = content + emoji;
    setContent(newContent);
    setShowEmojiPicker(false);
    
    // Restore focus to mention input
    setTimeout(() => {
      contentRef.current?.focus();
    }, 0);
  };


  const filteredAgents = mockAgents.filter(agent =>
    agent.displayName.toLowerCase().includes(agentSearchQuery.toLowerCase()) ||
    agent.name.toLowerCase().includes(agentSearchQuery.toLowerCase())
  );

  const suggestedTags = commonTags.filter(tag =>
    tag.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(tag)
  );

  const isValid = title.trim().length > 0 && content.trim().length > 0;
  const wordCount = content.trim().split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 shadow-sm', className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                {mode === 'reply' ? 'Reply to Post' : 'Create New Post'}
              </h3>
              <p className={cn(
                "text-sm text-gray-500",
                isMobile && "hidden"
              )}>
                Share insights with your agent network
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isDraft && lastSaved && !isMobile && (
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                <Save className="w-4 h-4" />
                <span>Saved {lastSaved.toLocaleTimeString()}</span>
              </div>
            )}
            
            <button
              data-testid="toggle-template-library"
              onClick={() => setShowTemplates(!showTemplates)}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title="Use Template"
            >
              <FileText className={cn("w-5 h-5", isMobile && "w-4 h-4")} />
            </button>
            
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              title="Toggle Preview"
            >
              {showPreview ? <EyeOff className={cn("w-5 h-5", isMobile && "w-4 h-4")} /> : <Eye className={cn("w-5 h-5", isMobile && "w-4 h-4")} />}
            </button>
            
            {!isMobile && (
              <button
                onClick={() => setShowShortcutsHelp(!showShortcutsHelp)}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                title="Keyboard Shortcuts"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            )}
            
            {isMobile && (
              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                <Smartphone className="w-3 h-3 text-gray-500" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Templates Dropdown */}
      {showTemplates && (
        <div data-testid="template-library-container" className="p-4 border-b border-gray-100 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-3">Choose a Template</h4>
          <div className={cn(
            "grid gap-3",
            isMobile ? "grid-cols-1" : "grid-cols-2"
          )}>
            {mockTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => applyTemplate(template)}
                className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="font-medium text-gray-900">{template.name}</div>
                <div className={cn(
                  "text-sm text-gray-500 mt-1",
                  isMobile && "line-clamp-2"
                )}>{template.hook}</div>
                <div className="flex items-center space-x-1 mt-2">
                  {template.tags.slice(0, isMobile ? 2 : 3).map(tag => (
                    <span key={tag} className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">
                      #{tag}
                    </span>
                  ))}
                  {template.tags.length > (isMobile ? 2 : 3) && (
                    <span className="text-xs text-gray-400">+{template.tags.length - (isMobile ? 2 : 3)}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Title Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a compelling title..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={TITLE_LIMIT}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Make it clear and engaging</span>
            <span>{title.length}/{TITLE_LIMIT}</span>
          </div>
        </div>

        {/* Hook Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hook
          </label>
          <input
            type="text"
            value={hook}
            onChange={(e) => setHook(e.target.value)}
            placeholder="A compelling one-liner to grab attention..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={HOOK_LIMIT}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Optional but recommended for engagement</span>
            <span>{hook.length}/{HOOK_LIMIT}</span>
          </div>
        </div>

        {/* Rich Editor Toolbar */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content <span className="text-red-500">*</span>
          </label>
          
          {/* CRITICAL FIX: Flatten layout hierarchy to match QuickPost success pattern */}
          <div className="space-y-3">
            {/* CRITICAL FIX: Move toolbar to separate section to avoid dropdown interference */}
            {showPreview ? (
              <div className="p-4 min-h-[200px] bg-gray-50 border border-gray-300 rounded-lg">
                <div className="prose max-w-none">
                  {hook && (
                    <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r">
                      <p className="text-blue-700 font-medium">{hook}</p>
                    </div>
                  )}
                  <h2 className="text-xl font-semibold mb-3">{title || 'Post Title'}</h2>
                  <div className="whitespace-pre-wrap">
                    {content || 'Content will appear here...'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                {/* CRITICAL FIX: Direct MentionInput usage like QuickPost - no complex wrappers */}
                <MentionInput
                  ref={contentRef}
                  value={content}
                  onChange={setContent}
                  onMentionSelect={handleMentionSelect}
                  placeholder="Share your insights, updates, or questions with the agent network..."
                  className="w-full p-4 min-h-[200px] border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={CONTENT_LIMIT}
                  rows={8}
                  autoFocus={false}
                  mentionContext="post"
                />
                
                {/* CRITICAL FIX: Remove overlapping overlays that interfere with mention dropdown */}
              </div>
            )}
            
            {/* CRITICAL FIX: Move formatting toolbar below input to prevent z-index conflicts */}
            {!showPreview && (
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                <div className={cn(
                  "flex items-center",
                  isMobile ? "space-x-1 overflow-x-auto" : "space-x-1"
                )}>
                  <button
                    onClick={() => insertFormatting('bold')}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                    title="Bold (⌘+B)"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => insertFormatting('italic')}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                    title="Italic (⌘+I)"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  
                  {!isMobile && (
                    <button
                      onClick={() => insertFormatting('code')}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
                      title="Code"
                    >
                      <Code className="w-4 h-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => insertFormatting('link')}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                    title="Link (⌘+K)"
                  >
                    <LinkIcon className="w-4 h-4" />
                  </button>
                  
                  {!isMobile && <div className="w-px h-6 bg-gray-300 mx-1" />}
                  
                  <button
                    onClick={() => insertFormatting('list')}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                    title="Bullet List"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  
                  {!isMobile && (
                    <button
                      onClick={() => insertFormatting('numbered-list')}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
                      title="Numbered List"
                    >
                      <ListOrdered className="w-4 h-4" />
                    </button>
                  )}
                  
                  {!isMobile && <div className="w-px h-6 bg-gray-300 mx-1" />}
                  
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                    title="Add Emoji"
                  >
                    <Smile className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                    title="Attach File"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                </div>
                
                {!isMobile && (
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>{wordCount} words</span>
                    <span>•</span>
                    <span>{readingTime} min read</span>
                  </div>
                )}
              </div>
            )}
            
            {/* CRITICAL FIX: Move emoji picker to avoid dropdown conflicts */}
            {showEmojiPicker && (
              <div className="mt-2">
                <EmojiPicker
                  onEmojiSelect={addEmoji}
                  onClose={() => setShowEmojiPicker(false)}
                  className={isMobile ? "w-full" : ""}
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Supports markdown formatting</span>
            <span>{content.length}/{CONTENT_LIMIT}</span>
          </div>
        </div>

        {/* Link Preview */}
        {linkPreview && (
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Link Preview</span>
              <button
                onClick={() => setLinkPreview(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex space-x-3">
              {linkPreview.image && (
                <img
                  src={linkPreview.image}
                  alt={linkPreview.title}
                  className="w-16 h-16 object-cover rounded"
                />
              )}
              <div>
                <h4 className="font-medium text-gray-900 text-sm">{linkPreview.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{linkPreview.description}</p>
                <p className="text-xs text-gray-500 mt-1">{linkPreview.domain}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
              >
                #{tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-1 text-blue-500 hover:text-blue-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          
          <div className="relative">
            <input
              ref={tagInputRef}
              type="text"
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value);
                setShowTagSuggestions(e.target.value.length > 0);
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  if (tagInput.trim()) {
                    addTag(tagInput);
                  }
                }
              }}
              placeholder="Add tags (press Enter or comma to add)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            {/* Tag Suggestions */}
            {showTagSuggestions && suggestedTags.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                {suggestedTags.slice(0, 6).map(tag => (
                  <button
                    key={tag}
                    onClick={() => addTag(tag)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 text-sm"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>


        {/* Mentioned Agents */}
        {agentMentions.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mentioned Agents
            </label>
            <div className="flex flex-wrap gap-2">
              {agentMentions.map(agentId => {
                const agent = mockAgents.find(a => a.id === agentId);
                return agent ? (
                  <span
                    key={agentId}
                    className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-sm rounded-full"
                  >
                    <Bot className="w-3 h-3 mr-1" />
                    {agent.displayName}
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {!isValid && (
              <div className="flex items-center space-x-1 text-sm text-orange-600">
                <AlertCircle className="w-4 h-4" />
                <span>Title and content are required</span>
              </div>
            )}
            
            {isDraft && (
              <div className="flex items-center space-x-1 text-sm text-green-600">
                <Check className="w-4 h-4" />
                <span>Draft saved</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <Link
              to="/drafts"
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>View Drafts</span>
            </Link>
            
            <button
              onClick={saveDraft}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Draft</span>
            </button>
            
            <button
              data-testid="submit-post"
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              className={cn(
                'px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2',
                isValid && !isSubmitting
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Publish Post</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt"
        onChange={(e) => {
          // Handle file uploads
          console.log('Files selected:', e.target.files);
        }}
      />

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h3>
                <button
                  onClick={() => setShowShortcutsHelp(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <div className="space-y-3">
                {shortcutsHelp.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-gray-700">{shortcut.description}</span>
                    <kbd className="px-2 py-1 bg-gray-100 text-gray-800 text-sm rounded border border-gray-300 font-mono">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">💡</span>
                  </div>
                  <div>
                    <p className="text-sm text-blue-800 font-medium">Pro Tip</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Use keyboard shortcuts to create posts faster and more efficiently. These work across all modern browsers.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};