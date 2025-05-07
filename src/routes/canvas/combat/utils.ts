
export const getPagePosition = (canvas: HTMLCanvasElement | undefined, posX: number, posY: number) => {
  if (!canvas) {
    return [0, 0] as [x: number, y: number];
  }

  const canvasRect = canvas.getBoundingClientRect();
  const x = posX - canvasRect.x / canvasRect.left + canvas.offsetLeft;
  const y = posY - canvasRect.y / canvasRect.top + canvas.offsetTop;
  return [x, y] as [x: number, y: number];
};