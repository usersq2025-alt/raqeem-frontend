export function startViewTransition(navigate: () => void) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => void;
  };
  if (doc.startViewTransition) {
    doc.startViewTransition(navigate);
    return;
  }
  navigate();
}
