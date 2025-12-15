/**
 * Mock for xterm WebLinksAddon
 */

export class WebLinksAddon {
  constructor() {
    this.terminal = null;
  }
  
  activate(terminal) {
    this.terminal = terminal;
  }
}