// Timeline.tsx
import { Accessor, createSignal } from "solid-js";

interface TimelineProps {
  transformations: number; // Number of transformations
  currentIndex: Accessor<number>; // Current transformation index
  interpolationFactor: Accessor<number>; // Current interpolation progress (0 to 1)
  onScrub: (index: number, factor: number) => void; // Handler for scrubbing to a point
}

export default function Timeline({
  transformations,
  currentIndex,
  interpolationFactor,
  onScrub,
}: TimelineProps) {
  const segmentWidth = 100 / transformations; // Percentage width for each segment
  const [hoveredIndex, setHoveredIndex] = createSignal<number | null>(null);
  const [isDragging, setIsDragging] = createSignal(false);
  let timelineRef: HTMLDivElement | null = null;

  const handleMouseDown = (e: MouseEvent) => {
    setIsDragging(true);
    updateScrubPosition(e);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging()) updateScrubPosition(e);
  };

  const handleMouseUp = () => setIsDragging(false);

  const updateScrubPosition = (e: MouseEvent) => {
    if (!timelineRef) return;

    const segmentRect = (e.target as HTMLElement).getBoundingClientRect();
    const segmentRelativeX = e.clientX - segmentRect.left;
    const segmentWidth = segmentRect.width;

    const timelineRect = timelineRef.getBoundingClientRect();
    const timelineRelativeX = e.clientX - timelineRect.left;

    console.log(e.clientX, segmentRect.left, timelineRelativeX, timelineRect.width);

    // Calculate total progress across the entire timeline
    const totalProgress = Math.max(0, Math.min(1, timelineRelativeX / timelineRect.width)); // Clamped between 0 and 1

    // Determine the transformation index and interpolation factor
    const index = Math.floor(totalProgress * transformations);
    const factor = segmentRelativeX / segmentWidth;

    onScrub(index, factor);
  };

  return (
    <div
      ref={el => (timelineRef = el)}
      style={{
        position: "relative",
        width: "100%",
        height: "40px",
        background: "#ddd",
        margin: "10px 0",
        "user-select": "none",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {Array.from({ length: transformations }).map((_, index) => (
        <div
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          style={{
            display: "inline-block",
            width: `${segmentWidth}%`,
            height: "100%",
            background: index % 2 === 0 ? "#bbb" : "#ccc",
            cursor: "pointer",
            position: "relative",
          }}
        >
          {/* Highlight current transformation segment */}
          {index === currentIndex() && (
            <div
              style={{
                position: "absolute",
                left: `${interpolationFactor() * 100}%`,
                top: 0,
                height: "100%",
                width: "2px",
                background: "red",
              }}
            />
          )}

          {/* Show transformation label on hover */}
          {hoveredIndex() === index && (
            <div
              style={{
                position: "absolute",
                top: "-20px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "#444",
                color: "#fff",
                padding: "2px 5px",
                "border-radius": "3px",
                "font-size": "12px",
              }}
            >
              Transformation {index + 1}
            </div>
          )}
        </div>
      ))}
      <div>
        {/* Show scrubber position */}
        {`${(currentIndex() + interpolationFactor()) * segmentWidth}%: ${currentIndex()}/${transformations} Segment + ${(interpolationFactor() * 100).toFixed(2).toLocaleString()} Seg %`}
      </div>
    </div>
  );
}
