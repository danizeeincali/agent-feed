/**
 * NLD UI Capture Utility
 * Placeholder implementation to resolve missing import errors
 */

export interface UICapture {
  timestamp: number;
  componentName: string;
  state: Record<string, any>;
  props: Record<string, any>;
}

export class NLDUICapture {
  private static captures: UICapture[] = [];

  static capture(componentName: string, state: Record<string, any>, props: Record<string, any> = {}): void {
    this.captures.push({
      timestamp: Date.now(),
      componentName,
      state,
      props
    });
  }

  static getCaptures(): UICapture[] {
    return [...this.captures];
  }

  static clearCaptures(): void {
    this.captures = [];
  }

  static exportCaptures(): string {
    return JSON.stringify(this.captures, null, 2);
  }
}

export default NLDUICapture;
export const nldCapture = NLDUICapture;