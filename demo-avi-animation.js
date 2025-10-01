#!/usr/bin/env node

/**
 * Avi Typing Animation - Terminal Demo
 * Demonstrates the ROYGBIV wave animation in terminal
 */

const ANIMATION_FRAMES = [
  'A v i', // Frame 0
  'Λ v i', // Frame 1
  'Λ V i', // Frame 2
  'Λ V !', // Frame 3
  'A v !', // Frame 4
  'A V !', // Frame 5
  'A V i', // Frame 6
  'A v i', // Frame 7
  'Λ v i', // Frame 8
  'Λ V i', // Frame 9
];

// ANSI color codes for ROYGBIV
const ROYGBIV_COLORS = [
  '\x1b[91m', // Bright Red
  '\x1b[38;5;208m', // Orange
  '\x1b[93m', // Bright Yellow
  '\x1b[92m', // Bright Green
  '\x1b[94m', // Bright Blue
  '\x1b[38;5;54m', // Indigo
  '\x1b[95m', // Bright Magenta (Violet)
];

const RESET = '\x1b[0m';
const FRAME_DURATION_MS = 200;

console.clear();
console.log('\n🎨 AVI TYPING ANIMATION - ROYGBIV DEMO\n');
console.log('Demonstrating the wave animation with color cycling...\n');

let frameIndex = 0;
let colorIndex = 0;

function displayFrame() {
  const frame = ANIMATION_FRAMES[frameIndex];
  const color = ROYGBIV_COLORS[colorIndex];
  const colorName = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'INDIGO', 'VIOLET'][colorIndex];

  // Clear previous line and display current frame
  process.stdout.write(`\r${color}${frame}${RESET} is typing...  [Frame ${frameIndex}, Color: ${colorName}]`);

  // Increment indices
  frameIndex = (frameIndex + 1) % ANIMATION_FRAMES.length;
  colorIndex = (colorIndex + 1) % ROYGBIV_COLORS.length;
}

// Display first frame
displayFrame();

// Start animation loop
const interval = setInterval(displayFrame, FRAME_DURATION_MS);

// Run for 6 seconds (3 complete loops)
setTimeout(() => {
  clearInterval(interval);
  console.log('\n\n✅ Animation complete! All ROYGBIV colors and frames displayed.\n');

  console.log('📊 VALIDATION SUMMARY:');
  console.log('   ✓ 10 frames × 200ms = 2-second loop');
  console.log('   ✓ 7 ROYGBIV colors cycling');
  console.log('   ✓ Wave animation: A↔Λ, v↔V, i↔!');
  console.log('   ✓ Always starts at Frame 0: "A v i" RED\n');

  console.log('🎯 In browser, colors are exact hex values:');
  console.log('   #FF0000 (Red)');
  console.log('   #FF7F00 (Orange)');
  console.log('   #FFFF00 (Yellow)');
  console.log('   #00FF00 (Green)');
  console.log('   #0000FF (Blue)');
  console.log('   #4B0082 (Indigo)');
  console.log('   #9400D3 (Violet)\n');
}, 6000);

// Handle Ctrl+C
process.on('SIGINT', () => {
  clearInterval(interval);
  console.log('\n\n👋 Demo stopped.\n');
  process.exit(0);
});
