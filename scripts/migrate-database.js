#!/usr/bin/env node

/**
 * Database Migration Script
 * Initializes PostgreSQL database with required schema
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const config = {
  user: process.env.DATABASE_USER || 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  database: process.env.DATABASE_NAME || 'agent_feed',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  port: process.env.DATABASE_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

async function runMigration() {
  let client;
  
  try {
    console.log('🔄 Connecting to PostgreSQL...');
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   User: ${config.user}`);
    
    client = new Client(config);
    await client.connect();
    
    console.log('✅ Connected to PostgreSQL');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'src', 'database', 'schema.sql');
    console.log(`📖 Reading schema from: ${schemaPath}`);
    
    const schemaSql = await fs.readFile(schemaPath, 'utf8');
    
    console.log('🏗️ Executing database schema...');
    await client.query(schemaSql);
    
    console.log('✅ Database schema created successfully');
    
    // Verify installation by checking tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Created tables:');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    console.log('🎉 Database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Tips:');
      console.log('   1. Make sure PostgreSQL is running');
      console.log('   2. Check DATABASE_HOST and DATABASE_PORT in .env');
      console.log('   3. Verify database exists and user has access');
    } else if (error.code === '3D000') {
      console.log('💡 Database does not exist. Create it with:');
      console.log(`   createdb ${config.database}`);
    } else if (error.code === '28P01') {
      console.log('💡 Authentication failed. Check DATABASE_USER and DATABASE_PASSWORD');
    }
    
    process.exit(1);
    
  } finally {
    if (client) {
      await client.end();
      console.log('🔒 Database connection closed');
    }
  }
}

// Command line usage
if (process.argv[2] === '--help' || process.argv[2] === '-h') {
  console.log(`
Database Migration Script

Usage:
  node scripts/migrate-database.js [options]

Options:
  --help, -h     Show this help message
  --force, -f    Force migration (drops existing tables)

Environment Variables:
  DATABASE_HOST     PostgreSQL host (default: localhost)
  DATABASE_PORT     PostgreSQL port (default: 5432)
  DATABASE_NAME     Database name (default: agent_feed)
  DATABASE_USER     Database user (default: postgres)
  DATABASE_PASSWORD Database password (default: postgres)

Examples:
  # Run migration with default settings
  node scripts/migrate-database.js
  
  # Run with custom database
  DATABASE_NAME=my_agent_feed node scripts/migrate-database.js
  `);
  process.exit(0);
}

runMigration();