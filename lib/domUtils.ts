export function isEditableTextTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  
  const tagName = target.tagName.toLowerCase();
  
  if (tagName === 'textarea') return true;
  if (tagName === 'input') {
    const inputType = (target as HTMLInputElement).type.toLowerCase();
    const textTypes = ['text', 'search', 'url', 'tel', 'email', 'password', ''];
    return textTypes.includes(inputType);
  }
  if (target.isContentEditable) return true;
  
  return false;
}
