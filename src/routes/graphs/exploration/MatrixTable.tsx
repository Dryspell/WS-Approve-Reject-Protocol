// MatrixTable.tsx
import { type JSX } from "solid-js";

interface MatrixTableProps {
  title: string;
  rowLabels: string[];
  colLabels: string[];
  matrix: number[][];
}

export default function MatrixTable({
  title,
  rowLabels,
  colLabels,
  matrix,
}: MatrixTableProps): JSX.Element {
  return (
    <div class="m-2 rounded border border-gray-400 p-2 shadow">
      <h2 class="mb-2 text-center text-lg font-bold">{title}</h2>
      <table class="w-full table-auto border-collapse">
        <thead>
          <tr>
            <th></th>
            {colLabels.map(label => (
              <th class="border border-gray-300 px-2 py-1 text-center">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, rowIndex) => (
            <tr>
              <td class="border border-gray-300 px-2 py-1 text-center font-bold">
                {rowLabels[rowIndex]}
              </td>
              {row.map(cell => (
                <td class="border border-gray-300 px-2 py-1 text-center">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
