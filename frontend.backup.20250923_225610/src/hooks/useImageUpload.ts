/**
 * useImageUpload Hook
 * Comprehensive hook for handling image uploads with drag-and-drop support
 */

import { useState, useCallback, useRef } from 'react';
import {
  ImageAttachment,
  UseImageUploadOptions,
  UseImageUploadReturn,
  ImageUploadError
} from '../types/claude-instances';

const DEFAULT_OPTIONS: UseImageUploadOptions = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxFiles: 10,
  autoUpload: false
};

export const useImageUpload = (
  options: UseImageUploadOptions = {}
): UseImageUploadReturn => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // State management
  const [images, setImages] = useState<ImageAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const uploadAbortController = useRef<AbortController | null>(null);

  // File validation
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // Check file type
    if (!opts.allowedTypes!.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed. Allowed types: ${opts.allowedTypes!.join(', ')}`
      };
    }

    // Check file size
    if (file.size > opts.maxFileSize!) {
      const maxSizeMB = opts.maxFileSize! / (1024 * 1024);
      return {
        valid: false,
        error: `File size ${(file.size / (1024 * 1024)).toFixed(1)}MB exceeds maximum allowed size of ${maxSizeMB}MB`
      };
    }

    // Check if file already exists
    const existingFile = images.find(img => img.name === file.name && img.size === file.size);
    if (existingFile) {
      return {
        valid: false,
        error: `File "${file.name}" is already uploaded`
      };
    }

    return { valid: true };
  }, [images, opts.allowedTypes, opts.maxFileSize]);

  // Create data URL for preview
  const createDataUrl = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  // Upload single file to server (mock implementation)
  const uploadFile = useCallback(async (file: File, onProgress?: (progress: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Mock upload with progress simulation
      const formData = new FormData();
      formData.append('image', file);

      // Create abort controller for this upload
      const controller = new AbortController();
      uploadAbortController.current = controller;

      // Simulate upload progress
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 95) progress = 95;
        onProgress?.(progress);
      }, 100);

      // Simulate upload completion
      setTimeout(() => {
        clearInterval(progressInterval);
        
        if (controller.signal.aborted) {
          reject(new ImageUploadError('Upload cancelled', file.name));
          return;
        }

        onProgress?.(100);
        
        // Mock successful upload - in real implementation, this would be an API call
        const mockUrl = `https://api.example.com/uploads/${Date.now()}-${file.name}`;
        resolve(mockUrl);
      }, 1000 + Math.random() * 2000); // 1-3 seconds upload time
    });
  }, []);

  // Add images to the list
  const addImages = useCallback(async (files: FileList | File[]): Promise<void> => {
    const fileArray = Array.from(files);
    setError(null);

    // Check total file limit
    if (images.length + fileArray.length > opts.maxFiles!) {
      const allowedCount = opts.maxFiles! - images.length;
      setError(`Cannot add ${fileArray.length} files. Maximum ${opts.maxFiles} files allowed. You can add ${allowedCount} more files.`);
      return;
    }

    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate all files first
    for (const file of fileArray) {
      const validation = validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    }

    // Show validation errors
    if (errors.length > 0) {
      setError(errors.join('\n'));
      if (validFiles.length === 0) return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const newImages: ImageAttachment[] = [];

      // Process each valid file
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        
        try {
          // Create data URL for preview
          const dataUrl = await createDataUrl(file);
          
          const imageAttachment: ImageAttachment = {
            id: `img-${Date.now()}-${i}`,
            name: file.name,
            size: file.size,
            type: file.type,
            url: '', // Will be set after upload
            dataUrl,
            uploadProgress: 0
          };

          newImages.push(imageAttachment);

          // Add to state immediately for preview
          setImages(prev => [...prev, imageAttachment]);

          // Auto-upload if enabled
          if (opts.autoUpload) {
            try {
              const url = await uploadFile(file, (progress) => {
                setImages(prev => 
                  prev.map(img => 
                    img.id === imageAttachment.id 
                      ? { ...img, uploadProgress: progress }
                      : img
                  )
                );
              });

              // Update with final URL
              setImages(prev => 
                prev.map(img => 
                  img.id === imageAttachment.id 
                    ? { ...img, url, uploadProgress: 100 }
                    : img
                )
              );
            } catch (uploadError) {
              // Mark as error but keep in list
              setImages(prev => 
                prev.map(img => 
                  img.id === imageAttachment.id 
                    ? { ...img, error: uploadError instanceof Error ? uploadError.message : 'Upload failed' }
                    : img
                )
              );
            }
          }
        } catch (fileError) {
          console.error(`Failed to process file ${file.name}:`, fileError);
          setError(prev => prev ? `${prev}\n${file.name}: Failed to process` : `${file.name}: Failed to process`);
        }

        // Update overall progress
        setUploadProgress(((i + 1) / validFiles.length) * 100);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to add images';
      setError(error);
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  }, [images, opts.maxFiles, opts.autoUpload, validateFile, createDataUrl, uploadFile]);

  // Remove image from list
  const removeImage = useCallback((imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
    setError(null);
  }, []);

  // Clear all images
  const clearImages = useCallback(() => {
    // Abort any ongoing uploads
    if (uploadAbortController.current) {
      uploadAbortController.current.abort();
    }

    setImages([]);
    setError(null);
    setUploadProgress(0);
    setIsUploading(false);
  }, []);

  // Manual upload for non-auto-upload mode
  const uploadImages = useCallback(async (): Promise<ImageAttachment[]> => {
    if (opts.autoUpload) {
      throw new Error('Manual upload not available when autoUpload is enabled');
    }

    const imagesToUpload = images.filter(img => !img.url && !img.error);
    if (imagesToUpload.length === 0) {
      return images.filter(img => img.url);
    }

    setIsUploading(true);
    setError(null);

    try {
      const uploadPromises = imagesToUpload.map(async (img, index) => {
        try {
          // Convert data URL back to file for upload
          const response = await fetch(img.dataUrl!);
          const blob = await response.blob();
          const file = new File([blob], img.name, { type: img.type });

          const url = await uploadFile(file, (progress) => {
            setImages(prev => 
              prev.map(image => 
                image.id === img.id 
                  ? { ...image, uploadProgress: progress }
                  : image
              )
            );
          });

          return { ...img, url, uploadProgress: 100 };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          return { ...img, error: errorMessage };
        }
      });

      const results = await Promise.all(uploadPromises);
      
      // Update images with results
      setImages(prev => 
        prev.map(img => {
          const result = results.find(r => r.id === img.id);
          return result || img;
        })
      );

      return results.filter(img => img.url) as ImageAttachment[];
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to upload images';
      setError(error);
      throw new ImageUploadError(error);
    } finally {
      setIsUploading(false);
    }
  }, [images, opts.autoUpload, uploadFile]);

  return {
    images,
    isUploading,
    uploadProgress,
    error,
    
    addImages,
    removeImage,
    clearImages,
    uploadImages,
    validateFile
  };
};

export default useImageUpload;