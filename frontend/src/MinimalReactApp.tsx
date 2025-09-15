// Simple React app with explicit imports and error handling

console.log('MinimalReactApp: Loading...');

// Try importing React
let React: any;
let ReactDOM: any;

try {
  console.log('MinimalReactApp: Importing React...');
  React = await import('react');
  console.log('MinimalReactApp: React imported successfully', React);

  console.log('MinimalReactApp: Importing ReactDOM...');
  ReactDOM = await import('react-dom/client');
  console.log('MinimalReactApp: ReactDOM imported successfully', ReactDOM);
} catch (error) {
  console.error('MinimalReactApp: Import error:', error);
  document.body.innerHTML = `
    <div style="padding: 20px; background: red; color: white;">
      <h1>Import Error</h1>
      <pre>${error}</pre>
    </div>
  `;
}

// Simple component
const App = () => {
  console.log('MinimalReactApp: App component rendering');

  return React.createElement('div', {
    style: {
      padding: '20px',
      background: '#10b981',
      color: 'white',
      fontFamily: 'system-ui'
    }
  }, [
    React.createElement('h1', { key: '1' }, '🎉 React is Working!'),
    React.createElement('p', { key: '2' }, 'Time: ' + new Date().toLocaleTimeString()),
    React.createElement('p', { key: '3' }, 'React Version: ' + React.version),
    React.createElement('button', {
      key: '4',
      onClick: () => alert('React click handler works!'),
      style: {
        padding: '10px 20px',
        background: 'white',
        color: '#10b981',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        marginTop: '10px'
      }
    }, 'Test Button')
  ]);
};

// Render function
const renderApp = async () => {
  try {
    console.log('MinimalReactApp: Starting render...');

    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error('Root element not found');
    }

    console.log('MinimalReactApp: Creating React root...');
    const root = ReactDOM.createRoot(rootElement);

    console.log('MinimalReactApp: Rendering app...');
    root.render(React.createElement(App));

    console.log('MinimalReactApp: ✅ Render complete!');
  } catch (error) {
    console.error('MinimalReactApp: Render error:', error);
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="padding: 20px; background: #ef4444; color: white;">
          <h1>Render Error</h1>
          <pre>${error}</pre>
        </div>
      `;
    }
  }
};

// Execute when module loads
renderApp();

export default App;