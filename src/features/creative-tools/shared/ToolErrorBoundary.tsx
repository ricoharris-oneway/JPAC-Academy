import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ToolErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Creator tool error', error, info); }

  render() {
    if (this.state.failed) return <section className="premium-tool-error" role="alert">
      <h1>This creator tool needs a quick reset.</h1>
      <p>No work was submitted or saved. Return to Creative Studio and try opening it again.</p>
      <a className="button button-primary" href="/studio">Return to Creative Studio</a>
    </section>;
    return this.props.children;
  }
}
