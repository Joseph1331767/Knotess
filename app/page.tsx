import { Canvas } from '@/components/Canvas';
import { Sidebar } from '@/components/Sidebar';
import { Toolbar } from '@/components/Toolbar';
import { NodeEditor } from '@/components/NodeEditor';
import { AlignmentToolbar } from '@/components/AlignmentToolbar';
import { DictationBubble } from '@/components/DictationBubble';

import { SettingsDrawer } from '@/components/SettingsDrawer';

import { ActivityBar } from '@/components/ActivityBar';

export default function Home() {
  return (
    <main className="flex h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100 font-sans flex-col">
      <div className="flex flex-1 overflow-hidden">
        <ActivityBar />
        <Sidebar />
        <div className="flex flex-col flex-1 relative">
          <Toolbar />
          <Canvas />
          <AlignmentToolbar />
          <DictationBubble />
          <SettingsDrawer />
        </div>
        <NodeEditor />
      </div>
    </main>
  );
}
