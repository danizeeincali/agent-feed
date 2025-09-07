import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { PostCreator } from './PostCreator';
import { Draft } from '@/types/drafts';
import { cn } from '@/utils/cn';

interface PostCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: (post: any) => void;
  editDraft?: Draft | null;
  className?: string;
}

export const PostCreatorModal: React.FC<PostCreatorModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
  editDraft,
  className
}) => {
  const [modalKey, setModalKey] = useState(0);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent background scrolling
      document.body.style.overflow = 'hidden';
      // Force PostCreator re-render when modal opens with new draft
      setModalKey(prev => prev + 1);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, editDraft?.id]);

  // Handle post creation and close modal
  const handlePostCreated = (post: any) => {
    onPostCreated?.(post);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex items-start justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* This element is to trick the browser into centering the modal contents. */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        
        <div 
          className={cn(
            "inline-block w-full max-w-4xl my-8 text-left align-middle transition-all transform bg-white shadow-xl rounded-lg",
            className
          )}
          data-testid="post-creator-modal"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {editDraft ? 'Edit Draft' : 'Create New Post'}
              </h2>
              {editDraft && (
                <p className="text-sm text-gray-600 mt-1">
                  Editing: {editDraft.title || 'Untitled Draft'}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Modal Content */}
          <div className="max-h-[calc(90vh-8rem)] overflow-y-auto">
            <PostCreatorModalContent
              key={modalKey}
              editDraft={editDraft}
              onPostCreated={handlePostCreated}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced PostCreator wrapper that handles draft data initialization
interface PostCreatorModalContentProps {
  editDraft?: Draft | null;
  onPostCreated?: (post: any) => void;
}

const PostCreatorModalContent: React.FC<PostCreatorModalContentProps> = ({
  editDraft,
  onPostCreated
}) => {
  const [title, setTitle] = useState('');
  const [hook, setHook] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize form with draft data
  useEffect(() => {
    if (editDraft && !isInitialized) {
      // Parse the draft content - it was combined as title + hook + content
      const contentLines = editDraft.content.split('\n\n');
      
      setTitle(editDraft.title || '');
      if (contentLines.length > 1) {
        setHook(contentLines[1] || '');
        setContent(contentLines.slice(2).join('\n\n') || contentLines[0] || '');
      } else {
        setContent(editDraft.content || '');
      }
      setTags(editDraft.tags || []);
      setIsInitialized(true);
    } else if (!editDraft) {
      // Reset form for new post
      setTitle('');
      setHook('');
      setContent('');
      setTags([]);
      setIsInitialized(true);
    }
  }, [editDraft, isInitialized]);

  // Create enhanced PostCreator with pre-populated values
  const PostCreatorWithDraftData: React.FC<any> = (props) => {
    return (
      <PostCreator
        {...props}
        // We'll enhance PostCreator to accept initial values as props
        initialTitle={title}
        initialHook={hook}
        initialContent={content}
        initialTags={tags}
      />
    );
  };

  if (!isInitialized) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    );
  }

  return (
    <PostCreator
      className="border-0 shadow-none rounded-none"
      onPostCreated={onPostCreated}
      initialContent={content}
      mode={editDraft ? 'edit' : 'create'}
      editDraft={editDraft}
    />
  );
};

export default PostCreatorModal;