export const svgGen = (svg: string) => {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const img = new Image();

  img.onload = () => {
    URL.revokeObjectURL(url);
  };
  img.src = url;
  return img;
};
