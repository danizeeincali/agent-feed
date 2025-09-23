import React, { useState } from 'react';
import { Flag, AlertTriangle, X, Check, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/utils/cn';

interface CommentModerationPanelProps {
  commentId: string;
  isReported?: boolean;
  reportedCount?: number;
  isModerated?: boolean;
  moderatorNotes?: string;
  onReport: (commentId: string, reason: string, description?: string) => Promise<void>;
  onClose: () => void;
  className?: string;
}

const reportReasons = [
  { id: 'spam', label: 'Spam', description: 'Repetitive or promotional content' },
  { id: 'harassment', label: 'Harassment', description: 'Bullying or personal attacks' },
  { id: 'inappropriate', label: 'Inappropriate Content', description: 'Offensive or explicit material' },
  { id: 'misinformation', label: 'Misinformation', description: 'False or misleading information' },
  { id: 'offtopic', label: 'Off-topic', description: 'Not relevant to the discussion' },
  { id: 'copyright', label: 'Copyright', description: 'Unauthorized use of copyrighted material' },
  { id: 'other', label: 'Other', description: 'Other policy violation' }
];

export const CommentModerationPanel: React.FC<CommentModerationPanelProps> = ({
  commentId,
  isReported = false,
  reportedCount = 0,
  isModerated = false,
  moderatorNotes,
  onReport,
  onClose,
  className
}) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReason) {
      setError('Please select a reason for reporting');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onReport(commentId, selectedReason, description.trim() || undefined);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      setError('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className={cn(
        'bg-white border border-gray-200 rounded-lg shadow-lg p-4 space-y-3',
        className
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-green-600">
            <Check className="w-5 h-5" />
            <h3 className="font-medium">Report Submitted</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Thank you for helping keep our community safe. We'll review your report shortly.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(
      'bg-white border border-gray-200 rounded-lg shadow-lg p-4 space-y-4',
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Flag className="w-5 h-5 text-red-500" />
          <h3 className="font-medium text-gray-900">Report Comment</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Status indicators */}
      {(isReported || reportedCount > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <p className="text-sm text-yellow-800">
              This comment has been reported {reportedCount} time{reportedCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {isModerated && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex items-center space-x-2">
            <EyeOff className="w-4 h-4 text-red-600" />
            <p className="text-sm text-red-800">This comment is under moderation</p>
          </div>
          {moderatorNotes && (
            <p className="text-xs text-red-700 mt-1 italic">
              Note: {moderatorNotes}
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Reason selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Reason for reporting *
          </label>
          <div className="space-y-2">
            {reportReasons.map((reason) => (
              <label
                key={reason.id}
                className={cn(
                  'flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-colors',
                  'border hover:bg-gray-50',
                  selectedReason === reason.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                )}
              >
                <input
                  type="radio"
                  name="reason"
                  value={reason.id}
                  checked={selectedReason === reason.id}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {reason.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {reason.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Additional description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Additional details (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide any additional context..."
            className="w-full p-3 text-sm border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            maxLength={500}
          />
          <div className="text-xs text-gray-500 text-right">
            {description.length}/500 characters
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
            {error}
          </div>
        )}

        {/* Submit buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !selectedReason}
            className={cn(
              'flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-red-500',
              isSubmitting || !selectedReason
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            )}
          >
            <Flag className="w-4 h-4" />
            <span>{isSubmitting ? 'Submitting...' : 'Submit Report'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};