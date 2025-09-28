// Mock agent data for development
const mockAgents = [
  { id: 1, name: "Code Assistant", status: "active", category: "Development" },
  { id: 2, name: "Data Analyzer", status: "active", category: "Analytics" },
  { id: 3, name: "Content Writer", status: "active", category: "Content" },
  { id: 4, name: "Image Generator", status: "active", category: "Creative" },
  { id: 5, name: "Task Manager", status: "active", category: "Productivity" }
];

export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    // Return mock agents data
    res.status(200).json(mockAgents);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}