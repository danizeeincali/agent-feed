/**
 * Image Upload Zone Component
 * Drag-and-drop image upload with preview and validation
 * Integrates with useImageUpload hook and follows existing UI patterns
 */

import React, { useCallback, useRef, useState, DragEvent } from 'react';
import { Upload, X, Image, AlertCircle, FileImage, Eye } from 'lucide-react';
import { cn } from '../../utils/cn';
import { ImageUploadZoneProps, ImageAttachment } from '../../types/claude-instances';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const ImagePreview: React.FC<{
  image: ImageAttachment;
  onRemove: (imageId: string) => void;
  onView?: (image: ImageAttachment) => void;
}> = ({ image, onRemove, onView }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <div className="relative group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Image Display */}
      <div className="aspect-square relative">
        {!imageError ? (
          <img
            src={image.dataUrl || image.url}
            alt={image.name}
            className={cn(
              'w-full h-full object-cover transition-opacity',
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true);
              setImageLoaded(true);
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
            <AlertCircle className="w-8 h-8 text-gray-400" />
          </div>
        )}

        {/* Loading Indicator */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Upload Progress */}
        {image.uploadProgress !== undefined && image.uploadProgress < 100 && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-white text-sm font-medium">
              {image.uploadProgress}%
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600">
              <div 
                className="h-1 bg-blue-500 transition-all duration-300"
                style={{ width: `${image.uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {image.error && (
          <div className="absolute inset-0 bg-red-500 bg-opacity-75 flex items-center justify-center">
            <div className="text-white text-center p-2">
              <AlertCircle className="w-6 h-6 mx-auto mb-1" />
              <div className="text-xs">Upload Failed</div>
            </div>
          </div>
        )}

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
            {onView && !image.error && (
              <button
                onClick={() => onView(image)}
                className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
                title="View full size"
              >
                <Eye className="w-4 h-4 text-gray-700" />
              </button>
            )}
            <button
              onClick={() => onRemove(image.id)}
              className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all"
              title="Remove image"
            >
              <X className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Image Info */}
      <div className="p-2">
        <div className="text-xs font-medium text-gray-900 dark:text-white truncate" title={image.name}>
          {image.name}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
          <span>{formatFileSize(image.size)}</span>
          {image.error && (
            <span className="text-red-500" title={image.error}>
              Error
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const ImageUploadZone: React.FC<ImageUploadZoneProps> = ({
  images = [],
  onAddImages,
  onRemoveImage,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  className,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [viewingImage, setViewingImage] = useState<ImageAttachment | null>(null);

  const handleFileSelect = useCallback((files: FileList | File[]) => {
    if (disabled) return;
    onAddImages(files);
  }, [disabled, onAddImages]);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => 
      allowedTypes.includes(file.type)
    );

    if (imageFiles.length > 0) {
      handleFileSelect(imageFiles);
    }
  }, [disabled, allowedTypes, handleFileSelect]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [handleFileSelect]);

  const openFileSelector = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const canAddMore = images.length < maxFiles;
  const remainingSlots = maxFiles - images.length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative border-2 border-dashed rounded-lg transition-all duration-200',
          'flex flex-col items-center justify-center p-6 min-h-32',
          !disabled && canAddMore && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800',
          isDragOver && !disabled 
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={canAddMore && !disabled ? openFileSelector : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        {isDragOver && !disabled ? (
          <>
            <Upload className="w-8 h-8 text-blue-500 mb-2" />
            <p className="text-blue-600 dark:text-blue-400 font-medium">
              Drop images here
            </p>
          </>
        ) : (
          <>
            <FileImage className="w-8 h-8 text-gray-400 mb-2" />
            {canAddMore && !disabled ? (
              <>
                <p className="text-gray-600 dark:text-gray-400 text-center">
                  <span className="font-medium">Click to upload</span> or drag and drop
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  {allowedTypes.map(type => type.split('/')[1]).join(', ').toUpperCase()} up to {formatFileSize(maxFileSize)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {remainingSlots} of {maxFiles} slots remaining
                </p>
              </>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                {disabled ? 'Upload disabled' : 'Maximum files reached'}
              </p>
            )}
          </>
        )}
      </div>

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((image) => (
            <ImagePreview
              key={image.id}
              image={image}
              onRemove={onRemoveImage}
              onView={setViewingImage}
            />
          ))}
        </div>
      )}

      {/* Full Size Image Modal */}
      {viewingImage && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setViewingImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
            
            <img
              src={viewingImage.dataUrl || viewingImage.url}
              alt={viewingImage.name}
              className="max-w-full max-h-full object-contain"
            />
            
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
              <div className="font-medium">{viewingImage.name}</div>
              <div className="text-sm opacity-75">{formatFileSize(viewingImage.size)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploadZone;