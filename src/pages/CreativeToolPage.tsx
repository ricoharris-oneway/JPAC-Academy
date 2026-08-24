import { Link, useParams } from 'react-router-dom';
import { getPremiumCreatorTool } from '../features/creative-tools/creativeToolRegistry';
import { ToolErrorBoundary } from '../features/creative-tools/shared/ToolErrorBoundary';

export function CreativeToolPage() {
  const { toolSlug } = useParams(); const tool = getPremiumCreatorTool(toolSlug);
  if (!tool) return <main className="premium-tool-page"><section className="premium-tool-error"><h1>Creator tool not found</h1><p>Choose one of the available JPAC Creator Tools.</p><Link className="button button-primary" to="/studio">Return to Creative Studio</Link></section></main>;
  const Tool = tool.component;
  return <ToolErrorBoundary><Tool /></ToolErrorBoundary>;
}
