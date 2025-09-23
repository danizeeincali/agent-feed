import React, { useState } from 'react';
import { Bookmark, Trash2, Check, X } from 'lucide-react';

interface PostActionsProps {
  postId: string;
  isSaved?: boolean;
  onSave?: (postId: string, saved: boolean) => Promise<void>;
  onDelete?: (postId: string) => Promise<void>;
  className?: string;
}

const PostActions: React.FC<PostActionsProps> = ({
  postId,
  isSaved = false,
  onSave,
  onDelete,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [saved, setSaved] = useState(isSaved);


  const handleSave = async () => {
    if (!onSave || isLoading) return;
    
    setIsLoading(true);
    try {
      const newSavedState = !saved;
      await onSave(postId, newSavedState);
      setSaved(newSavedState);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to save/unsave post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || isLoading) return;
    
    setIsLoading(true);
    try {
      await onDelete(postId);
      setShowDeleteDialog(false);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to delete post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClickOutside = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      setIsOpen(false);
      setShowDeleteDialog(false);
    }
  };

  if (showDeleteDialog) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={handleClickOutside}>
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Delete Post</h3>
            <button
              onClick={() => setShowDeleteDialog(false)}
              className="text-gray-400 hover:text-gray-600 p-1"
              disabled={isLoading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mb-4">
            <p className="text-sm text-gray-700 mb-4">
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDeleteDialog(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isLoading && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>}
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>

      <button
        onClick={handleSave}
        disabled={isLoading}
        className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
        title={saved ? 'Unsave Post' : 'Save Post'}
      >
        <Bookmark className={`w-4 h-4 ${saved ? 'fill-blue-500 text-blue-500' : ''}`} />
        <span className="text-xs">{saved ? 'Saved' : 'Save'}</span>
        {isLoading && (
          <div className="ml-1 animate-spin w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        )}
      </button>
      
      {onDelete && (
        <button
          onClick={() => setShowDeleteDialog(true)}
          disabled={isLoading}
          className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          title="Delete Post"
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-xs">Delete</span>
        </button>
      )}
    </div>
  );
};

export default PostActions;