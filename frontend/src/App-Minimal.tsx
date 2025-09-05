// Absolute minimal React app to test if React itself is working
console.log('App-Minimal: Starting...');

function App() {
  console.log('App-Minimal: Component rendering...');
  return <div style={{background: 'red', color: 'white', padding: '20px'}}>MINIMAL APP WORKING</div>;
}

console.log('App-Minimal: Component defined');
export default App;