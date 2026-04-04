export type InteractionMode =
  | 'idle'
  | 'click'
  | 'double-click'
  | 'drag'
  | 'port-drag'
  | 'route-connect'
  | 'box-select'
  | 'group-scale'
  | 'alignment-drag';

// Conflict matrix: modes that block each other
const CONFLICTS: Record<InteractionMode, InteractionMode[]> = {
  'idle': [],
  'click': ['double-click', 'drag', 'port-drag'],
  'double-click': ['click', 'drag', 'port-drag'],
  'drag': ['click', 'double-click', 'port-drag', 'box-select'],
  'port-drag': ['click', 'double-click', 'drag', 'route-connect'],
  'route-connect': ['port-drag', 'drag'],
  'box-select': ['drag', 'group-scale'],
  'group-scale': ['box-select', 'drag', 'alignment-drag'],
  'alignment-drag': ['group-scale', 'drag'],
};

class EventCoordinator {
  private currentMode: InteractionMode = 'idle';

  /**
   * Attempts to enter a new interaction mode.
   * Will be rejected if a conflicting mode is already active.
   *
   * @param mode The mode to request
   * @returns true if the mode was granted, false if rejected due to conflict
   */
  requestMode(mode: InteractionMode): boolean {
    if (this.currentMode === mode) {
      return true; // Already in this mode
    }

    if (this.currentMode !== 'idle') {
      const conflicts = CONFLICTS[mode] || [];
      if (conflicts.includes(this.currentMode)) {
        console.warn(`EventCoordinator: Rejected mode '${mode}' because conflicting mode '${this.currentMode}' is active.`);
        return false; // Conflicting mode active
      }
      
      const currentConflicts = CONFLICTS[this.currentMode] || [];
      if (currentConflicts.includes(mode)) {
        console.warn(`EventCoordinator: Rejected mode '${mode}' because conflicting mode '${this.currentMode}' is active.`);
        return false;
      }
    }

    this.currentMode = mode;
    return true;
  }

  /**
   * Releases an active mode, returning to 'idle'.
   * 
   * @param mode The mode to release. Must match the current mode.
   */
  releaseMode(mode: InteractionMode): void {
    if (this.currentMode === mode) {
      this.currentMode = 'idle';
    }
  }

  /**
   * Returns the currently active interaction mode.
   */
  getCurrentMode(): InteractionMode {
    return this.currentMode;
  }

  /**
   * Convenience method to check if no interaction is currently active.
   */
  isIdle(): boolean {
    return this.currentMode === 'idle';
  }
}

export const eventCoordinator = new EventCoordinator();
