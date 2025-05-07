import * as d3 from "d3";

function LinePlot({
  data,
  width = 640,
  height = 400,
  marginTop = 20,
  marginRight = 20,
  marginBottom = 20,
  marginLeft = 20,
}: {
  data: number[];
  width?: number;
  height?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
}) {
  const x = d3
    .scaleLinear()
    .domain([0, data.length - 1])
    .range([marginLeft, width - marginRight]);
  const y = d3
    .scaleLinear()
    .domain(d3.extent(data) as [number, number])
    .range([height - marginBottom, marginTop]);
  const line = d3
    .line<number>()
    .x((_, i) => x(i))
    .y(d => y(d));
  return (
    <svg width={width} height={height}>
      <path
        fill="none"
        stroke="currentColor"
        style={{ "stroke-width": "1.5" }}
        d={line(data) ?? undefined}
      />
      <g fill="white" stroke="currentColor" style={{ "stroke-width": "1.5" }}>
        {data.map((d, i) => (
          <circle cx={x(i)} cy={y(d)} r="2.5" />
        ))}
      </g>
    </svg>
  );
}

export default function LinePlotPage() {
  return (
    <div>
      <LinePlot
        data={d3.ticks(-2, 2, 200).map(Math.sin)}
        width={640}
        height={400}
        marginTop={20}
        marginRight={20}
        marginBottom={20}
        marginLeft={20}
      />
    </div>
  );
}