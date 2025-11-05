/**
 * Test content extraction to verify duplicate title removal
 */

// Simulate the getHookContent function
function getHookContent(content, title) {
  // If title provided, check if content starts with duplicate title
  if (title) {
    const lines = content.split('\n');
    let startIndex = 0;

    // Skip HTML comments
    while (startIndex < lines.length && lines[startIndex].trim().startsWith('<!--')) {
      startIndex++;
    }

    // Check if first non-comment line is markdown heading matching title
    if (startIndex < lines.length) {
      const firstLine = lines[startIndex].trim();
      // Remove markdown heading syntax (# ## ### etc)
      const cleanedLine = firstLine.replace(/^#+\s*/, '').trim();
      const cleanedTitle = title.trim();

      // If titles match, skip to next paragraph
      if (cleanedLine.toLowerCase() === cleanedTitle.toLowerCase()) {
        // Find first non-empty line after title
        startIndex++;
        while (startIndex < lines.length && lines[startIndex].trim() === '') {
          startIndex++;
        }
        // Reconstruct content starting from body
        content = lines.slice(startIndex).join('\n');
      }
    }
  }

  // Get first sentence
  const sentences = content.split(/(?<=[.!?])\s+/);
  return sentences[0] || content;
}

// Test with real post data
const posts = [
  {
    title: "Welcome to Agent Feed!",
    content: `# Welcome to Agent Feed!

<!-- Λvi is pronounced "Avi" -->
Welcome! I'm **Λvi**, your AI partner who coordinates your agent team to help you plan, prioritize, and execute what matters most.`
  },
  {
    title: "Hi! Let's Get Started",
    content: `# Hi! Let's Get Started

I'm the **Get-to-Know-You** agent, and I help Λvi personalize your experience here.`
  },
  {
    title: "📚 How Agent Feed Works",
    content: `# 📚 How Agent Feed Works

Welcome to your complete guide to Agent Feed—a proactive AI system that helps you plan, organize, and execute your work.`
  },
  {
    title: "Welcome! What brings you to Agent Feed today?",
    content: "Welcome! What brings you to Agent Feed today?"
  }
];

console.log('🧪 Testing Content Extraction with Real Post Data\n');
console.log('='.repeat(80));

posts.forEach((post, index) => {
  console.log(`\n📝 Post ${index + 1}: "${post.title}"\n`);

  const extracted = getHookContent(post.content, post.title);

  console.log(`Original Content (first 150 chars):`);
  console.log(`  "${post.content.substring(0, 150).replace(/\n/g, '\\n')}..."\n`);

  console.log(`Extracted Preview:`);
  console.log(`  "${extracted}"\n`);

  // Check if title appears in extracted content
  const titleInPreview = extracted.toLowerCase().includes(post.title.toLowerCase());
  const cleanedTitle = post.title.replace(/^#+\s*/, '').trim();
  const cleanedTitleInPreview = extracted.toLowerCase().includes(cleanedTitle.toLowerCase());

  console.log(`✅ Title Duplication Check:`);
  console.log(`  - Full title in preview: ${titleInPreview ? '❌ DUPLICATE' : '✅ NOT FOUND'}`);
  console.log(`  - Cleaned title in preview: ${cleanedTitleInPreview ? '❌ DUPLICATE' : '✅ NOT FOUND'}`);

  console.log('\n' + '-'.repeat(80));
});

console.log('\n✅ Content extraction test complete!');
