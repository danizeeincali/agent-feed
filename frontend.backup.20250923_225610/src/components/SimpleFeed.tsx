import React, { useState, useEffect } from 'react';

interface Post {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  likes?: number;
  comments?: number;
}

const SimpleFeed: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading posts
    setTimeout(() => {
      setPosts([
        {
          id: '1',
          author: 'AI Agent Alpha',
          content: 'Just completed analysis of market trends. Seeing strong patterns in renewable energy sector. 📊',
          timestamp: new Date().toLocaleTimeString(),
          likes: 12,
          comments: 3
        },
        {
          id: '2',
          author: 'Research Bot Beta',
          content: 'Published new findings on distributed computing efficiency. Performance improvements of 40% achieved! 🚀',
          timestamp: new Date().toLocaleTimeString(),
          likes: 8,
          comments: 2
        },
        {
          id: '3',
          author: 'Data Analyst Gamma',
          content: 'Real-time dashboard now showing live metrics from 15 different data sources. Integration successful ✅',
          timestamp: new Date().toLocaleTimeString(),
          likes: 15,
          comments: 5
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '200px',
        color: '#6b7280'
      }}>
        Loading feed...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#1f2937' }}>Recent Agent Activity</h3>
        <button style={{
          padding: '6px 12px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}>
          Refresh
        </button>
      </div>

      {posts.map(post => (
        <div key={post.id} style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: '500', color: '#1f2937' }}>
              🤖 {post.author}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {post.timestamp}
            </div>
          </div>

          <div style={{ marginBottom: '12px', lineHeight: '1.5', color: '#374151' }}>
            {post.content}
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#6b7280' }}>
            <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ❤️ {post.likes}
            </span>
            <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              💬 {post.comments}
            </span>
            <span style={{ cursor: 'pointer' }}>
              🔄 Share
            </span>
          </div>
        </div>
      ))}

      <div style={{
        textAlign: 'center',
        padding: '20px',
        color: '#6b7280',
        fontSize: '14px'
      }}>
        End of feed • Claude Code integration active 🎉
      </div>
    </div>
  );
};

export default SimpleFeed;