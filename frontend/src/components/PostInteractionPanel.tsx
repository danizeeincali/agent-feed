import React, { useState } from 'react';
import { MessageCircle, Share2, Bookmark, Flag, MoreHorizontal } from 'lucide-react';
import { useWebSocketContext } from '@/context/WebSocketContext';
import { TypingIndicator } from './TypingIndicator';
import { cn } from '@/utils/cn';

interface PostInteractionPanelProps {
  postId: string;
  comments: number;
  shares: number;
  isBookmarked?: boolean;
  className?: string;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onBookmark?: (postId: string) => void;
}

export const PostInteractionPanel: React.FC<PostInteractionPanelProps> = ({
  postId,
  comments,
  shares,
  isBookmarked = false,
  className,
  onComment,
  onShare,
  onBookmark,
}) => {
  const [showMore, setShowMore] = useState(false);
  const { subscribePost, connectionState } = useWebSocketContext();


  const handleComment = () => {
    subscribePost(postId);
    onComment?.(postId);
  };

  const handleShare = () => {
    // Copy post URL to clipboard
    const postUrl = `${window.location.origin}/posts/${postId}`;
    navigator.clipboard.writeText(postUrl).then(() => {
      // Could show a toast notification here
      console.log('Post URL copied to clipboard');
    });
    onShare?.(postId);
  };

  const handleBookmark = () => {
    onBookmark?.(postId);
  };

  const handleReport = () => {
    // Implement reporting functionality
    console.log('Report post:', postId);
  };

  return (
    <div className={cn('border-t border-gray-100', className)}>
      {/* Typing Indicator */}
      <TypingIndicator postId={postId} className="mx-4 mt-3" />
      
      {/* Main Actions */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            
            <button 
              onClick={handleComment}
              className="flex items-center space-x-2 text-gray-500 hover:text-blue-500 transition-colors"
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-sm font-medium">{comments || 0}</span>
            </button>
            
            <button 
              onClick={handleShare}
              className="flex items-center space-x-2 text-gray-500 hover:text-green-500 transition-colors"
            >
              <Share2 className="h-5 w-5" />
              <span className="text-sm font-medium">{shares || 0}</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBookmark}
              className={cn(
                'p-2 rounded-full transition-colors',
                isBookmarked
                  ? 'text-blue-500 hover:text-blue-600 bg-blue-50'
                  : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
              )}
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
            >
              <Bookmark className={cn('h-4 w-4', isBookmarked && 'fill-current')} />
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowMore(!showMore)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                title="More options"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              
              {showMore && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 w-40">
                  <button
                    onClick={() => {
                      handleReport();
                      setShowMore(false);
                    }}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Flag className="w-4 h-4" />
                    <span>Report post</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      const postUrl = `${window.location.origin}/posts/${postId}`;
                      navigator.clipboard.writeText(postUrl);
                      setShowMore(false);
                    }}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Copy link</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      // Hide post functionality
                      setShowMore(false);
                    }}
                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span>Hide post</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Connection Status Indicator */}
        {!connectionState.isConnected && (
          <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
            Offline - interactions will sync when reconnected
          </div>
        )}
      </div>
    </div>
  );
};

export default PostInteractionPanel;