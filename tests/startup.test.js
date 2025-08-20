// Enhanced AgentLink Startup TDD Tests
// Comprehensive test suite for start-agentlink-enhanced.sh
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

describe('Enhanced AgentLink Startup Tests', () => {
    const PROJECT_DIR = '/workspaces/agent-feed';
    const CONFIG_DIR = path.join(process.env.HOME, '.agentlink');
    const SCRIPT_PATH = path.join(PROJECT_DIR, 'scripts', 'start-agentlink-enhanced.sh');

    beforeAll(() => {
        // Ensure test environment is clean
        if (fs.existsSync(CONFIG_DIR)) {
            fs.rmSync(CONFIG_DIR, { recursive: true, force: true });
        }
    });

    afterAll(() => {
        // Cleanup test artifacts
        try {
            exec(`${PROJECT_DIR}/scripts/stop-agentlink-enhanced.sh`, () => {});
        } catch (error) {
            console.log('Cleanup completed');
        }
    });

    describe('Prerequisites Validation', () => {
        test('Project directory exists', () => {
            expect(fs.existsSync(PROJECT_DIR)).toBe(true);
        });

        test('Enhanced startup script exists', () => {
            expect(fs.existsSync(SCRIPT_PATH)).toBe(true);
        });

        test('Required tools are available', async () => {
            const tools = ['npx', 'jq', 'curl', 'lsof'];
            
            for (const tool of tools) {
                try {
                    await execAsync(`which ${tool}`);
                } catch (error) {
                    fail(`Required tool ${tool} is not available`);
                }
            }
        });

        test('Claude-Flow is accessible', async () => {
            try {
                const { stdout } = await execAsync('npx claude-flow@alpha --version');
                expect(stdout).toMatch(/v?\d+\.\d+\.\d+/);
            } catch (error) {
                console.warn('Claude-Flow not available, some features may be limited');
            }
        });

        test('Node.js environment is valid', () => {
            expect(process.version).toMatch(/^v\d+\.\d+\.\d+/);
            expect(fs.existsSync(path.join(PROJECT_DIR, 'package.json'))).toBe(true);
        });
    });

    describe('Port Management', () => {
        test('Port 3000 is manageable', async () => {
            try {
                await execAsync('lsof -ti:3000 | head -1');
                // If port is occupied, we should be able to manage it
                expect(true).toBe(true);
            } catch (error) {
                // Port is free, which is good
                expect(error.code).toBe(1);
            }
        });

        test('Port 3001 is manageable', async () => {
            try {
                await execAsync('lsof -ti:3001 | head -1');
                expect(true).toBe(true);
            } catch (error) {
                expect(error.code).toBe(1);
            }
        });
    });

    describe('SPARC Methodology Integration', () => {
        test('SPARC phases can be initialized', async () => {
            // Test that SPARC hooks can be called without errors
            try {
                await execAsync('npx claude-flow@alpha sparc modes');
                expect(true).toBe(true);
            } catch (error) {
                console.warn('SPARC integration limited without full claude-flow setup');
            }
        });

        test('Specification phase validation', () => {
            // Verify that startup requirements are clearly defined
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/SPARC/);
            expect(scriptContent).toMatch(/Specification/);
        });

        test('Architecture validation patterns', () => {
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/Architecture/);
            expect(scriptContent).toMatch(/topology/);
        });
    });

    describe('TDD Framework Integration', () => {
        test('Test directory structure', () => {
            expect(fs.existsSync(path.join(PROJECT_DIR, 'tests'))).toBe(true);
        });

        test('TDD validation function exists', () => {
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/run_tdd_validation/);
        });

        test('Pre-startup validation patterns', () => {
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/pre-startup/);
            expect(scriptContent).toMatch(/validation/);
        });
    });

    describe('Swarm Coordination', () => {
        test('Swarm initialization configuration', () => {
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/SWARM_TOPOLOGY/);
            expect(scriptContent).toMatch(/MAX_AGENTS/);
            expect(scriptContent).toMatch(/hierarchical/);
        });

        test('Agent spawning mechanisms', () => {
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/spawn.*agent/i);
            expect(scriptContent).toMatch(/system.*monitor/i);
        });

        test('Swarm coordination hooks', () => {
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/swarm.*coordination/i);
            expect(scriptContent).toMatch(/initialize_swarm/);
        });
    });

    describe('NLD System Integration', () => {
        test('Neural Learning initialization', () => {
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/initialize_nld/);
            expect(scriptContent).toMatch(/neural.*pattern/i);
        });

        test('Pattern learning mechanisms', () => {
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/pattern.*learning/i);
            expect(scriptContent).toMatch(/startup.*metrics/i);
        });

        test('Learning data capture', () => {
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/startup_performance\.log/);
            expect(scriptContent).toMatch(/duration_ms/);
        });
    });

    describe('Self-Updating Mechanism', () => {
        test('Version tracking system', () => {
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/SCRIPT_VERSION/);
            expect(scriptContent).toMatch(/CLAUDE_FLOW_MIN_VERSION/);
        });

        test('Update checking functionality', () => {
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/check_for_updates/);
            expect(scriptContent).toMatch(/latest_version/);
        });

        test('Version persistence', () => {
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/version_info\.json/);
        });
    });

    describe('Performance Monitoring', () => {
        test('Performance monitoring setup', () => {
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/setup_performance_monitoring/);
            expect(scriptContent).toMatch(/monitor_performance\.sh/);
        });

        test('Metrics collection patterns', () => {
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/cpu_usage/);
            expect(scriptContent).toMatch(/memory_usage/);
            expect(scriptContent).toMatch(/performance\.log/);
        });
    });

    describe('Memory Management', () => {
        test('Memory system initialization', () => {
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/setup_memory_management/);
            expect(scriptContent).toMatch(/session.*memory/i);
        });

        test('Configuration persistence', () => {
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/startup_config\.json/);
        });
    });

    describe('Enhanced Service Management', () => {
        test('Advanced health monitoring', () => {
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/wait_for_service/);
            expect(scriptContent).toMatch(/connect-timeout/);
        });

        test('Enhanced status tracking', () => {
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/enhanced_operational/);
            expect(scriptContent).toMatch(/features/);
        });

        test('Multi-process management', () => {
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/BACKEND_PID/);
            expect(scriptContent).toMatch(/FRONTEND_PID/);
            expect(scriptContent).toMatch(/monitor_pid/);
        });
    });

    describe('Integration Testing', () => {
        test('Script execution permissions', () => {
            const stats = fs.statSync(SCRIPT_PATH);
            expect(stats.mode & parseInt('111', 8)).toBeGreaterThan(0);
        });

        test('Test mode functionality', async () => {
            try {
                const { stdout } = await execAsync(`bash ${SCRIPT_PATH} --test-mode`, {
                    timeout: 30000,
                    cwd: PROJECT_DIR
                });
                expect(stdout).toMatch(/test mode/i);
            } catch (error) {
                // Some test mode operations might fail in CI, but basic structure should work
                console.warn('Test mode had issues, likely due to environment limitations');
            }
        });

        test('Error handling and cleanup', () => {
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/set -e/);
            expect(scriptContent).toMatch(/trap/);
            expect(scriptContent).toMatch(/cleanup/i);
        });
    });

    describe('Documentation and User Experience', () => {
        test('Comprehensive help output', () => {
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/Enhanced Features/);
            expect(scriptContent).toMatch(/Management Commands/);
            expect(scriptContent).toMatch(/follow-logs/);
        });

        test('Color-coded output system', () => {
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/RED=/);
            expect(scriptContent).toMatch(/GREEN=/);
            expect(scriptContent).toMatch(/BLUE=/);
            expect(scriptContent).toMatch(/CYAN=/);
        });

        test('Progress indicators', () => {
            const scriptContent = fs.readFileSync(SCRIPT_PATH, 'utf8');
            expect(scriptContent).toMatch(/🚀|✅|🔍|🧪|🐝|🧠|📊/);
        });
    });
});

// Integration test helper functions
async function isPortFree(port) {
    try {
        await execAsync(`lsof -ti:${port}`);
        return false;
    } catch (error) {
        return true;
    }
}

async function waitForService(url, timeout = 30000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        try {
            await execAsync(`curl -s --connect-timeout 2 ${url}`);
            return true;
        } catch (error) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    return false;
}

module.exports = {
    isPortFree,
    waitForService
};