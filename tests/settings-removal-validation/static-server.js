/**
 * Simple Static Server for Settings Removal Validation
 * Serves a mock application to test Settings removal
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');

const PORT = 3000;

// Mock application pages
const mockPages = {
  '/': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agent Feed</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        nav { background: white; padding: 15px; margin-bottom: 20px; border-radius: 8px; }
        nav ul { list-style: none; padding: 0; margin: 0; display: flex; gap: 20px; }
        nav a { text-decoration: none; color: #333; padding: 10px 15px; border-radius: 4px; }
        nav a:hover { background: #f0f0f0; }
        .main-content { background: white; padding: 20px; border-radius: 8px; min-height: 400px; }
        .feed-item { border-bottom: 1px solid #eee; padding: 15px 0; }
        .sidebar { position: fixed; left: 0; top: 0; width: 200px; height: 100vh; background: #333; color: white; }
        .sidebar ul { list-style: none; padding: 20px 0; }
        .sidebar a { color: white; text-decoration: none; display: block; padding: 10px 20px; }
    </style>
</head>
<body>
    <!-- Navigation should NOT contain Settings -->
    <nav role="navigation" class="navigation">
        <ul>
            <li><a href="/">Feed</a></li>
            <li><a href="/agents">Agent Manager</a></li>
            <li><a href="/analytics">Analytics</a></li>
            <li><a href="/activity">Live Activity</a></li>
            <li><a href="/drafts">Draft Manager</a></li>
        </ul>
    </nav>

    <div class="container">
        <main role="main" class="main-content">
            <h1>Agent Feed</h1>
            <div class="feed-item">
                <h3>Recent Activity</h3>
                <p>Agent completed task successfully</p>
            </div>
            <div class="feed-item">
                <h3>System Update</h3>
                <p>Application running smoothly</p>
            </div>
        </main>
    </div>
</body>
</html>`,

  '/agents': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agent Manager</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        nav { background: white; padding: 15px; margin-bottom: 20px; border-radius: 8px; }
        nav ul { list-style: none; padding: 0; margin: 0; display: flex; gap: 20px; }
        nav a { text-decoration: none; color: #333; padding: 10px 15px; border-radius: 4px; }
        nav a:hover { background: #f0f0f0; }
        .main-content { background: white; padding: 20px; border-radius: 8px; min-height: 400px; }
        .agent-card { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 4px; }
    </style>
</head>
<body>
    <nav role="navigation" class="navigation">
        <ul>
            <li><a href="/">Feed</a></li>
            <li><a href="/agents">Agent Manager</a></li>
            <li><a href="/analytics">Analytics</a></li>
            <li><a href="/activity">Live Activity</a></li>
            <li><a href="/drafts">Draft Manager</a></li>
        </ul>
    </nav>

    <div class="container">
        <main role="main" class="main-content" data-testid="agents">
            <h1>Agent Manager</h1>
            <div class="agent-card">
                <h3>Research Agent</h3>
                <p>Status: Active</p>
            </div>
            <div class="agent-card">
                <h3>Analysis Agent</h3>
                <p>Status: Idle</p>
            </div>
        </main>
    </div>
</body>
</html>`,

  '/analytics': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analytics</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        nav { background: white; padding: 15px; margin-bottom: 20px; border-radius: 8px; }
        nav ul { list-style: none; padding: 0; margin: 0; display: flex; gap: 20px; }
        nav a { text-decoration: none; color: #333; padding: 10px 15px; border-radius: 4px; }
        nav a:hover { background: #f0f0f0; }
        .main-content { background: white; padding: 20px; border-radius: 8px; min-height: 400px; }
        .chart { height: 200px; background: #f0f0f0; margin: 20px 0; display: flex; align-items: center; justify-content: center; }
    </style>
</head>
<body>
    <nav role="navigation" class="navigation">
        <ul>
            <li><a href="/">Feed</a></li>
            <li><a href="/agents">Agent Manager</a></li>
            <li><a href="/analytics">Analytics</a></li>
            <li><a href="/activity">Live Activity</a></li>
            <li><a href="/drafts">Draft Manager</a></li>
        </ul>
    </nav>

    <div class="container">
        <main role="main" class="main-content" data-testid="analytics">
            <h1>Analytics Dashboard</h1>
            <div class="chart">Performance Chart</div>
            <div class="chart">Usage Statistics</div>
        </main>
    </div>
</body>
</html>`,

  '/activity': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Activity</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        nav { background: white; padding: 15px; margin-bottom: 20px; border-radius: 8px; }
        nav ul { list-style: none; padding: 0; margin: 0; display: flex; gap: 20px; }
        nav a { text-decoration: none; color: #333; padding: 10px 15px; border-radius: 4px; }
        nav a:hover { background: #f0f0f0; }
        .main-content { background: white; padding: 20px; border-radius: 8px; min-height: 400px; }
        .activity-item { padding: 10px; border-bottom: 1px solid #eee; }
        .activity-time { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <nav role="navigation" class="navigation">
        <ul>
            <li><a href="/">Feed</a></li>
            <li><a href="/agents">Agent Manager</a></li>
            <li><a href="/analytics">Analytics</a></li>
            <li><a href="/activity">Live Activity</a></li>
            <li><a href="/drafts">Draft Manager</a></li>
        </ul>
    </nav>

    <div class="container">
        <main role="main" class="main-content">
            <h1>Live Activity</h1>
            <div class="activity-item">
                <div class="activity-time">2 minutes ago</div>
                <div>Agent started new task</div>
            </div>
            <div class="activity-item">
                <div class="activity-time">5 minutes ago</div>
                <div>System health check completed</div>
            </div>
        </main>
    </div>
</body>
</html>`,

  '/drafts': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Draft Manager</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        nav { background: white; padding: 15px; margin-bottom: 20px; border-radius: 8px; }
        nav ul { list-style: none; padding: 0; margin: 0; display: flex; gap: 20px; }
        nav a { text-decoration: none; color: #333; padding: 10px 15px; border-radius: 4px; }
        nav a:hover { background: #f0f0f0; }
        .main-content { background: white; padding: 20px; border-radius: 8px; min-height: 400px; }
        .draft-item { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 4px; }
    </style>
</head>
<body>
    <nav role="navigation" class="navigation">
        <ul>
            <li><a href="/">Feed</a></li>
            <li><a href="/agents">Agent Manager</a></li>
            <li><a href="/analytics">Analytics</a></li>
            <li><a href="/activity">Live Activity</a></li>
            <li><a href="/drafts">Draft Manager</a></li>
        </ul>
    </nav>

    <div class="container">
        <main role="main" class="main-content">
            <h1>Draft Manager</h1>
            <div class="draft-item">
                <h3>Draft Document 1</h3>
                <p>Last modified: Today</p>
            </div>
            <div class="draft-item">
                <h3>Draft Document 2</h3>
                <p>Last modified: Yesterday</p>
            </div>
        </main>
    </div>
</body>
</html>`,

  // Settings routes should return 404
  '/settings': '404 Not Found',
  '/settings/': '404 Not Found',
  '/config': '404 Not Found',
  '/preferences': '404 Not Found'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  console.log(`${new Date().toISOString()} - ${req.method} ${pathname}`);

  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    if (mockPages[pathname]) {
      if (pathname.startsWith('/settings') || pathname === '/config' || pathname === '/preferences') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(mockPages[pathname]);
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<html><body><h1>404 - Page Not Found</h1></body></html>');
    }
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Static server running on http://localhost:${PORT}`);
  console.log('📋 Available routes:');
  console.log('   / - Feed');
  console.log('   /agents - Agent Manager');
  console.log('   /analytics - Analytics');
  console.log('   /activity - Live Activity');
  console.log('   /drafts - Draft Manager');
  console.log('   /settings - 404 (Settings removed)');
});

module.exports = server;