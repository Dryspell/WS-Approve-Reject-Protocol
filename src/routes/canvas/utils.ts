export function getMousePosition(
  canvas: HTMLCanvasElement,
  event: MouseEvent,
  callback?: (x: number, y: number) => void,
) {
  let rect = canvas.getBoundingClientRect();
  let x = event.clientX - rect.left;
  let y = event.clientY - rect.top;

  if (callback) {
    callback(x, y);
  }

  return [x, y] as [x: number, y: number];
}
