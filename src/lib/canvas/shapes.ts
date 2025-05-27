interface CircleOptions {
  fillStyle?: string;
  strokeStyle?: string;
  lineWidth?: number;
}

interface RectOptions {
  fillStyle?: string;
  strokeStyle?: string;
  lineWidth?: number;
}

export const rect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  options: RectOptions = {}
) => {
  const { fillStyle, strokeStyle, lineWidth = 1 } = options;

  ctx.beginPath();
  ctx.rect(x, y, width, height);
  
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
};

export const circle = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  options: CircleOptions = {}
) => {
  const { fillStyle, strokeStyle, lineWidth = 1 } = options;

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
};

export const line = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options?: {
    strokeStyle?: CanvasRenderingContext2D["strokeStyle"];
    lineWidth?: number;
  },
) => {
  const { strokeStyle, lineWidth } = {
    strokeStyle: "black",
    lineWidth: 1,
    ...options,
  };

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);

  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = strokeStyle;
  ctx.stroke();
};

export const text = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  options?: {
    fillStyle?: CanvasRenderingContext2D["fillStyle"];
    font?: string;
  },
) => {
  const { fillStyle, font } = {
    fillStyle: "black",
    font: "16px Arial",
    ...options,
  };

  ctx.fillStyle = fillStyle;
  ctx.font = font;
  ctx.fillText(text, x, y);
};
