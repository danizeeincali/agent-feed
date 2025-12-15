const WebSocket = require('ws');
const pty = require('node-pty');
const os = require('os');

// Clean terminal server without Claude-specific handling
const wss = new WebSocket.Server({ 
  port: 3002,
  host: 'localhost',
  path: '/terminal'
});

const terminals = new Map();

class TerminalSession {
  constructor(ws, id, cols = 80, rows = 24) {
    this.ws = ws;
    this.id = id;
    this.cols = cols;
    this.rows = rows;
    this.initPty();
  }

  initPty() {
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    
    this.ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: this.cols,
      rows: this.rows,
      cwd: process.env.WORKSPACE_ROOT || process.cwd(),
      env: process.env
    });

    console.log(`Terminal ${this.id}: PTY spawned with PID ${this.ptyProcess.pid}`);

    // Direct passthrough of PTY output to WebSocket
    this.ptyProcess.onData((data) => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'data',
          data: data
        }));
      }
    });

    this.ptyProcess.onExit((exitCode, signal) => {
      console.log(`Terminal ${this.id} process exited with code ${exitCode}, signal ${signal}`);
      this.cleanup();
    });
  }

  write(data) {
    if (this.ptyProcess) {
      this.ptyProcess.write(data);
    }
  }

  resize(cols, rows) {
    if (this.ptyProcess) {
      this.cols = cols;
      this.rows = rows;
      this.ptyProcess.resize(cols, rows);
      console.log(`Terminal ${this.id} resized to ${cols}x${rows}`);
    }
  }

  cleanup() {
    console.log(`Cleaning up terminal session ${this.id}`);
    
    if (this.ptyProcess) {
      try {
        this.ptyProcess.kill();
      } catch (error) {
        console.error(`Error killing process for terminal ${this.id}:`, error);
      }
    }

    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, 'Terminal session ended');
    }

    terminals.delete(this.id);
  }
}

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  const terminalId = `term_${terminals.size + 1}_${Date.now()}`;
  
  console.log(`New terminal connection: ${terminalId} from ${clientIp}`);
  
  ws.send(JSON.stringify({
    type: 'connect',
    terminalId: terminalId,
    timestamp: Date.now()
  }));

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message.toString());
      
      switch (msg.type) {
        case 'init':
          const terminal = new TerminalSession(ws, terminalId, msg.cols || 80, msg.rows || 24);
          terminals.set(terminalId, terminal);
          
          ws.send(JSON.stringify({
            type: 'init_ack',
            terminalId: terminalId,
            pid: terminal.ptyProcess.pid,
            cols: terminal.cols,
            rows: terminal.rows
          }));
          
          console.log(`Terminal session ${terminalId} created`);
          break;
          
        case 'input':
          const term = terminals.get(terminalId);
          if (term) {
            // Direct passthrough without any Claude-specific handling
            term.write(msg.data);
          }
          break;
          
        case 'resize':
          const resizeTerm = terminals.get(terminalId);
          if (resizeTerm) {
            resizeTerm.resize(msg.cols, msg.rows);
          }
          break;
      }
    } catch (error) {
      console.error(`Error processing message for terminal ${terminalId}:`, error);
    }
  });

  ws.on('close', () => {
    console.log(`WebSocket closed for terminal ${terminalId}`);
    const terminal = terminals.get(terminalId);
    if (terminal) {
      terminal.cleanup();
    }
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for terminal ${terminalId}:`, error);
  });
});

console.log('🚀 Clean Terminal Server running on ws://localhost:3002/terminal');
console.log('📊 Direct PTY passthrough - no Claude-specific handling');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down terminal server...');
  terminals.forEach(terminal => terminal.cleanup());
  wss.close(() => {
    console.log('Terminal server shut down');
    process.exit(0);
  });
});