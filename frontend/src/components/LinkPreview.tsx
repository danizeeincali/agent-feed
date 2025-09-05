import React, { useState, useEffect } from 'react';
import { ExternalLink, ImageIcon, PlayCircle } from 'lucide-react';

interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  site_name?: string;
  type?: 'website' | 'image' | 'video' | 'article';
}

interface LinkPreviewProps {
  url: string;
  className?: string;
}

const LinkPreview: React.FC<LinkPreviewProps> = ({ url, className = '' }) => {
  const [previewData, setPreviewData] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchPreviewData(url);
  }, [url]);

  const fetchPreviewData = async (targetUrl: string) => {
    try {
      setLoading(true);
      setError(false);
      
      // Simple preview data extraction - in a real app this would use a backend service
      // For now, we'll extract basic info from the URL and create a preview
      const preview = await generateSimplePreview(targetUrl);
      setPreviewData(preview);
    } catch (err) {
      console.error('Failed to fetch link preview:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const generateSimplePreview = async (targetUrl: string): Promise<LinkPreviewData> => {
    // Extract domain and path for basic preview
    const urlObj = new URL(targetUrl);
    const domain = urlObj.hostname.replace('www.', '');
    
    // Determine content type based on URL patterns
    let type: LinkPreviewData['type'] = 'website';
    let title = domain;
    let description = targetUrl;
    
    // Check for common patterns
    if (/(github\.com|gitlab\.com)/.test(domain)) {
      type = 'website';
      title = `${domain} Repository`;
      description = 'Code repository and version control';
    } else if (/youtube\.com|youtu\.be/.test(domain)) {
      type = 'video';
      title = 'YouTube Video';
      description = 'Video content on YouTube';
    } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(urlObj.pathname)) {
      type = 'image';
      title = 'Image';
      description = 'Image file';
    } else if (/(docs\.google\.com|notion\.so|medium\.com)/.test(domain)) {
      type = 'article';
      title = `Document on ${domain}`;
      description = 'Article or document';
    }

    return {
      url: targetUrl,
      title,
      description,
      site_name: domain,
      type
    };
  };

  const handleClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className={`border border-gray-200 rounded-lg p-3 bg-gray-50 animate-pulse ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-300 rounded"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !previewData) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`
          inline-flex items-center text-blue-600 hover:text-blue-800 hover:underline
          transition-colors text-sm
          ${className}
        `}
      >
        <ExternalLink className="w-4 h-4 mr-1" />
        {url}
      </a>
    );
  }

  const getTypeIcon = () => {
    switch (previewData.type) {
      case 'video':
        return <PlayCircle className="w-8 h-8 text-red-500" />;
      case 'image':
        return <ImageIcon className="w-8 h-8 text-green-500" />;
      default:
        return <ExternalLink className="w-8 h-8 text-blue-500" />;
    }
  };

  return (
    <div 
      className={`
        border border-gray-200 rounded-lg overflow-hidden hover:shadow-md
        transition-shadow cursor-pointer bg-white
        ${className}
      `}
      onClick={handleClick}
    >
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {previewData.image ? (
              <img
                src={previewData.image}
                alt={previewData.title}
                className="w-16 h-16 object-cover rounded"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                {getTypeIcon()}
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {previewData.title}
              </h4>
              <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </div>
            
            {previewData.description && (
              <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                {previewData.description}
              </p>
            )}
            
            <div className="flex items-center text-xs text-gray-500">
              <span className="truncate">{previewData.site_name || new URL(url).hostname}</span>
              {previewData.type && (
                <>
                  <span className="mx-1">•</span>
                  <span className="capitalize">{previewData.type}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinkPreview;