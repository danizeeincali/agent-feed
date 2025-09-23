/**
 * Mock for xterm SearchAddon
 */

export class SearchAddon {
  constructor() {
    this.searchCalls = [];
    this.terminal = null;
  }
  
  activate(terminal) {
    this.terminal = terminal;
  }
  
  findNext(term) {
    this.searchCalls.push({ term, direction: 'next', timestamp: Date.now() });
    return true;
  }
  
  findPrevious(term) {
    this.searchCalls.push({ term, direction: 'previous', timestamp: Date.now() });
    return true;
  }
}