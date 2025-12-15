#!/usr/bin/env node

const http = require('http');

class DetailedContentValidator {
  constructor(baseUrl = 'http://127.0.0.1:3001') {
    this.baseUrl = baseUrl;
  }

  async fetchRoute(path) {
    return new Promise((resolve, reject) => {
      http.get(`${this.baseUrl}${path}`, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
      }).on('error', reject);
    });
  }

  async validateContent() {
    console.log('🔍 DETAILED CONTENT VALIDATION');
    console.log('=' .repeat(50));

    const routes = ['/', '/workflows', '/activity'];
    
    for (const route of routes) {
      console.log(`\n📄 Analyzing route: ${route}`);
      console.log('-' .repeat(30));
      
      try {
        const response = await this.fetchRoute(route);
        const html = response.body;
        
        // Check for Vite development setup
        const hasViteClient = html.includes('@vite/client');
        const hasReactRefresh = html.includes('/@react-refresh');
        const hasMainScript = html.includes('/src/main.tsx');
        const hasRootDiv = html.includes('id="root"');
        const hasDoctype = html.startsWith('<!DOCTYPE html>');
        const hasTitle = /<title[^>]*>([^<]*)<\/title>/.exec(html);
        
        console.log(`✓ Status Code: ${response.statusCode}`);
        console.log(`✓ Content Length: ${html.length} chars`);
        console.log(`✓ Has DOCTYPE: ${hasDoctype ? '✅' : '❌'}`);
        console.log(`✓ Has Root Div: ${hasRootDiv ? '✅' : '❌'}`);
        console.log(`✓ Has Vite Client: ${hasViteClient ? '✅' : '❌'}`);
        console.log(`✓ Has React Refresh: ${hasReactRefresh ? '✅' : '❌'}`);
        console.log(`✓ Has Main Script: ${hasMainScript ? '✅' : '❌'}`);
        console.log(`✓ Page Title: ${hasTitle ? hasTitle[1] : 'Not found'}`);
        
        // Check for React SPA characteristics
        const isReactSPA = hasViteClient && hasRootDiv && hasMainScript && hasDoctype;
        console.log(`✓ React SPA Valid: ${isReactSPA ? '✅ YES' : '❌ NO'}`);
        
        // Show first 300 chars of content
        console.log(`\n📝 Content Preview:`);
        console.log(html.substring(0, 300) + '...');
        
      } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
      }
    }
  }
}

const validator = new DetailedContentValidator();
validator.validateContent().catch(console.error);