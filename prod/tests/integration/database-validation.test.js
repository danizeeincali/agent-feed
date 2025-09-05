/**
 * Database Integration Validation Tests
 * Production-ready database migration and integrity testing
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

describe('Database Integration Validation', () => {
    let dbPool;
    let testDbName;
    
    beforeAll(async () => {
        // Create test database connection
        testDbName = `agent_feed_integration_test_${Date.now()}`;
        
        // Connect to default database to create test database
        const adminPool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: 'postgres',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres'
        });
        
        try {
            await adminPool.query(`CREATE DATABASE "${testDbName}"`);
        } catch (error) {
            console.log('Test database already exists or creation failed:', error.message);
        }
        
        await adminPool.end();
        
        // Connect to test database
        dbPool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: testDbName,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres'
        });
        
        // Wait for connection
        await dbPool.connect();
    });
    
    afterAll(async () => {
        if (dbPool) {
            await dbPool.end();
        }
        
        // Cleanup test database
        const adminPool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: 'postgres',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres'
        });
        
        try {
            await adminPool.query(`DROP DATABASE IF EXISTS "${testDbName}"`);
        } catch (error) {
            console.log('Test database cleanup failed:', error.message);
        }
        
        await adminPool.end();
    });
    
    describe('Migration Validation', () => {
        it('should execute all migrations successfully', async () => {
            const migrationsDir = path.join(__dirname, '../../database/migrations');
            const migrationFiles = await fs.readdir(migrationsDir);
            const sqlFiles = migrationFiles
                .filter(file => file.endsWith('.sql') && !file.includes('rollback'))
                .sort();
                
            expect(sqlFiles.length).toBeGreaterThan(0);
            
            for (const file of sqlFiles) {
                const migrationPath = path.join(migrationsDir, file);
                const migrationSQL = await fs.readFile(migrationPath, 'utf8');
                
                try {
                    await dbPool.query(migrationSQL);
                } catch (error) {
                    throw new Error(`Migration ${file} failed: ${error.message}`);
                }
            }
        }, 60000);
        
        it('should have all required tables', async () => {
            const expectedTables = [
                'agent_posts',
                'post_quality_metrics',
                'feed_analytics',
                'posting_templates'
            ];
            
            for (const tableName of expectedTables) {
                const result = await dbPool.query(
                    `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
                    [tableName]
                );
                
                expect(result.rows[0].exists).toBe(true);
            }
        });
        
        it('should have all required indexes', async () => {
            const result = await dbPool.query(`
                SELECT indexname 
                FROM pg_indexes 
                WHERE tablename IN ('agent_posts', 'post_quality_metrics', 'feed_analytics')
                ORDER BY indexname
            `);
            
            const indexes = result.rows.map(row => row.indexname);
            const requiredIndexes = [
                'idx_agent_posts_agent_status',
                'idx_agent_posts_user_published',
                'idx_agent_posts_quality_engagement',
                'idx_post_quality_post_overall',
                'idx_feed_analytics_date_granularity'
            ];
            
            requiredIndexes.forEach(index => {
                expect(indexes).toContain(index);
            });
        });
        
        it('should have proper constraints and triggers', async () => {
            // Check triggers
            const triggerResult = await dbPool.query(`
                SELECT trigger_name 
                FROM information_schema.triggers 
                WHERE event_object_table = 'agent_posts'
            `);
            
            const triggers = triggerResult.rows.map(row => row.trigger_name);
            expect(triggers).toContain('tr_agent_posts_content_hash');
            expect(triggers).toContain('tr_agent_posts_updated_at');
            expect(triggers).toContain('tr_agent_posts_engagement_metrics');
        });
    });
    
    describe('Database Operations', () => {
        beforeEach(async () => {
            // Clean up test data
            await dbPool.query('DELETE FROM post_quality_metrics');
            await dbPool.query('DELETE FROM agent_posts');
        });
        
        it('should insert and retrieve agent posts correctly', async () => {
            const testPost = {
                agent_id: '123e4567-e89b-12d3-a456-426614174000',
                user_id: '123e4567-e89b-12d3-a456-426614174001',
                title: 'Test Post Title',
                content: 'This is a test post content for validation',
                content_type: 'text',
                category: 'test',
                post_type: 'standard',
                status: 'published',
                visibility: 'public'
            };
            
            const insertResult = await dbPool.query(`
                INSERT INTO agent_posts (
                    agent_id, user_id, title, content, content_type, 
                    category, post_type, status, visibility, published_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                RETURNING id, content_hash, created_at
            `, [
                testPost.agent_id, testPost.user_id, testPost.title,
                testPost.content, testPost.content_type, testPost.category,
                testPost.post_type, testPost.status, testPost.visibility
            ]);
            
            expect(insertResult.rows).toHaveLength(1);
            expect(insertResult.rows[0].id).toBeDefined();
            expect(insertResult.rows[0].content_hash).toBeDefined();
            expect(insertResult.rows[0].created_at).toBeDefined();
            
            // Verify retrieval
            const selectResult = await dbPool.query(
                'SELECT * FROM agent_posts WHERE id = $1',
                [insertResult.rows[0].id]
            );
            
            expect(selectResult.rows).toHaveLength(1);
            expect(selectResult.rows[0].title).toBe(testPost.title);
            expect(selectResult.rows[0].content).toBe(testPost.content);
        });
        
        it('should enforce data integrity constraints', async () => {
            // Test duplicate content hash prevention
            const postData = {
                agent_id: '123e4567-e89b-12d3-a456-426614174000',
                user_id: '123e4567-e89b-12d3-a456-426614174001',
                title: 'Duplicate Test',
                content: 'Duplicate content for testing'
            };
            
            await dbPool.query(`
                INSERT INTO agent_posts (agent_id, user_id, title, content) 
                VALUES ($1, $2, $3, $4)
            `, [postData.agent_id, postData.user_id, postData.title, postData.content]);
            
            // Attempt duplicate insert - should fail
            await expect(dbPool.query(`
                INSERT INTO agent_posts (agent_id, user_id, title, content) 
                VALUES ($1, $2, $3, $4)
            `, [postData.agent_id, postData.user_id, postData.title, postData.content]))
                .rejects.toThrow();
        });
        
        it('should handle quality metrics correctly', async () => {
            // First create a post
            const postResult = await dbPool.query(`
                INSERT INTO agent_posts (agent_id, user_id, title, content)
                VALUES ($1, $2, $3, $4) RETURNING id
            `, [
                '123e4567-e89b-12d3-a456-426614174000',
                '123e4567-e89b-12d3-a456-426614174001',
                'Quality Test Post',
                'Content for quality metrics testing'
            ]);
            
            const postId = postResult.rows[0].id;
            
            // Insert quality metrics
            const qualityMetrics = {
                content_quality_score: 0.85,
                readability_score: 0.90,
                originality_score: 0.75,
                relevance_score: 0.80,
                accuracy_score: 0.95,
                completeness_score: 0.88
            };
            
            const metricsResult = await dbPool.query(`
                INSERT INTO post_quality_metrics (
                    post_id, content_quality_score, readability_score,
                    originality_score, relevance_score, accuracy_score, completeness_score
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING overall_quality_score
            `, [
                postId, qualityMetrics.content_quality_score,
                qualityMetrics.readability_score, qualityMetrics.originality_score,
                qualityMetrics.relevance_score, qualityMetrics.accuracy_score,
                qualityMetrics.completeness_score
            ]);
            
            expect(metricsResult.rows).toHaveLength(1);
            expect(metricsResult.rows[0].overall_quality_score).toBeCloseTo(0.855, 2);
        });
        
        it('should handle concurrent operations safely', async () => {
            const concurrentOps = [];
            
            // Create 10 concurrent insert operations
            for (let i = 0; i < 10; i++) {
                concurrentOps.push(
                    dbPool.query(`
                        INSERT INTO agent_posts (agent_id, user_id, title, content)
                        VALUES ($1, $2, $3, $4)
                    `, [
                        '123e4567-e89b-12d3-a456-426614174000',
                        '123e4567-e89b-12d3-a456-426614174001',
                        `Concurrent Test Post ${i}`,
                        `Content for concurrent test ${i} - ${Date.now()}`
                    ])
                );
            }
            
            const results = await Promise.allSettled(concurrentOps);
            const successful = results.filter(result => result.status === 'fulfilled');
            
            expect(successful.length).toBe(10);
            
            // Verify all posts were inserted
            const countResult = await dbPool.query(
                'SELECT COUNT(*) FROM agent_posts WHERE title LIKE $1',
                ['Concurrent Test Post%']
            );
            
            expect(parseInt(countResult.rows[0].count)).toBe(10);
        });
    });
    
    describe('Performance Validation', () => {
        it('should handle bulk operations efficiently', async () => {
            const startTime = Date.now();
            const batchSize = 100;
            
            // Prepare bulk insert data
            const insertPromises = [];
            for (let i = 0; i < batchSize; i++) {
                insertPromises.push(
                    dbPool.query(`
                        INSERT INTO agent_posts (agent_id, user_id, title, content)
                        VALUES ($1, $2, $3, $4)
                    `, [
                        '123e4567-e89b-12d3-a456-426614174000',
                        '123e4567-e89b-12d3-a456-426614174001',
                        `Bulk Test Post ${i}`,
                        `Bulk insert content ${i} - ${Date.now()}`
                    ])
                );
            }
            
            await Promise.all(insertPromises);
            
            const endTime = Date.now();
            const duration = endTime - startTime;
            const postsPerSecond = (batchSize / duration) * 1000;
            
            // Should handle at least 50 posts per second
            expect(postsPerSecond).toBeGreaterThan(50);
            
            // Cleanup
            await dbPool.query('DELETE FROM agent_posts WHERE title LIKE $1', ['Bulk Test Post%']);
        });
        
        it('should execute complex queries efficiently', async () => {
            // Create test data
            for (let i = 0; i < 50; i++) {
                await dbPool.query(`
                    INSERT INTO agent_posts (
                        agent_id, user_id, title, content, status, 
                        view_count, like_count, quality_score
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [
                    '123e4567-e89b-12d3-a456-426614174000',
                    '123e4567-e89b-12d3-a456-426614174001',
                    `Performance Test Post ${i}`,
                    `Content for performance testing ${i}`,
                    'published',
                    Math.floor(Math.random() * 1000),
                    Math.floor(Math.random() * 100),
                    Math.random()
                ]);
            }
            
            const startTime = Date.now();
            
            // Complex analytical query
            const result = await dbPool.query(`
                SELECT 
                    agent_id,
                    COUNT(*) as post_count,
                    AVG(quality_score) as avg_quality,
                    SUM(view_count) as total_views,
                    AVG(engagement_rate) as avg_engagement
                FROM agent_posts
                WHERE status = 'published'
                GROUP BY agent_id
                HAVING COUNT(*) > 5
                ORDER BY avg_quality DESC
            `);
            
            const endTime = Date.now();
            const queryDuration = endTime - startTime;
            
            // Complex query should execute in under 100ms
            expect(queryDuration).toBeLessThan(100);
            expect(result.rows.length).toBeGreaterThan(0);
            
            // Cleanup
            await dbPool.query('DELETE FROM agent_posts WHERE title LIKE $1', ['Performance Test Post%']);
        });
    });
});
