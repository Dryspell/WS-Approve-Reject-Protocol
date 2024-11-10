// MatrixTable.tsx
import { type JSX } from "solid-js";

interface MatrixTableProps {
  title: string;
  rowLabels: string[];
  colLabels: string[];
  matrix: number[][];
  rounding?: number;
}

export default function MatrixTable(props: MatrixTableProps): JSX.Element {
  return (
    <div class="m-2 rounded border border-gray-400 p-2 shadow">
      <h2 class="mb-2 text-center text-lg font-bold">{props.title}</h2>
      <table class="w-full table-auto border-collapse">
        <thead>
          <tr>
            <th></th>
            {props.colLabels.map(label => (
              <th class="border border-gray-300 px-2 py-1 text-center">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.matrix.map((row, rowIndex) => (
            <tr>
              <td class="border border-gray-300 px-2 py-1 text-center font-bold">
                {props.rowLabels[rowIndex]}
              </td>
              {row.map(cell => (
                <td class="border border-gray-300 px-2 py-1 text-center">
                  {cell.toFixed(props.rounding).toLocaleString()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
