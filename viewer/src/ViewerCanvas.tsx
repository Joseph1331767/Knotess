
import { ViewerNode } from './ViewerNode';

/**
 * ViewerCanvas — renders the root-level nodes.
 * Each ViewerNode recursively renders its own children
 * using the exact same DOM-nesting approach as the editor.
 */
export function ViewerCanvas({ nodes, editorSettings, setActiveNodeId, camera, setCamera }: { nodes: Record<string, any>, editorSettings: any, setActiveNodeId: (id: string | null) => void, camera: any, setCamera: any }) {
  // Find root nodes (parentId === null)
  const rootNodes = Object.values(nodes).filter((n: any) => n.parentId === null);

  return (
    <div className="relative w-full h-full">
      {rootNodes.map((node: any) => (
        <ViewerNode
          key={node.id}
          id={node.id}
          nodes={nodes}
          editorSettings={editorSettings}
          setActiveNodeId={setActiveNodeId}
          camera={camera}
          setCamera={setCamera}
        />
      ))}
    </div>
  );
}
