import { Canvas } from '@/components/Canvas';
import { Sidebar } from '@/components/Sidebar';
import { Toolbar } from '@/components/Toolbar';
import { NodeEditor } from '@/components/NodeEditor';

export default function Home() {
  return (
    <main className="flex h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 font-sans flex-col">
      <div className="bg-red-600 text-white text-center py-1 text-xs font-bold uppercase tracking-widest z-50">
        Debug Mode: Changes Reflected
      </div>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 relative">
          <Toolbar />
          <Canvas />
        </div>
        <NodeEditor />
      </div>
    </main>
  );
}
