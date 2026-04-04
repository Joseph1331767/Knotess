import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './viewer.css';

const dataEl = document.getElementById('graph-data');
let graphData = { nodes: {}, rootNodeId: null, editorSettings: null };

try {
  if (dataEl && dataEl.textContent) {
    graphData = JSON.parse(dataEl.textContent);
  }
} catch (err) {
  console.error("Failed to parse graph data", err);
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App data={graphData} />
  </React.StrictMode>
);
