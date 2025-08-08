import { Component, createSignal, Show } from 'solid-js';
import { Card } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Badge } from '~/components/ui/badge';
import { useSpacetimeDB } from '~/hooks/useSpacetimeDB';

interface QueryResult {
  columns?: string[];
  rows?: any[];
  error?: string;
}

const DbInspector: Component = () => {
  const [query, setQuery] = createSignal("SELECT name FROM sqlite_master WHERE type='table';");
  const [queryResult, setQueryResult] = createSignal<QueryResult>({});
  // useSpacetimeDB exposes { conn, connected }
  const { conn, connected } = useSpacetimeDB();

  // Execute SQL query
  const executeQuery = async (sql: string): Promise<QueryResult> => {
    const connection = conn();
    if (!connection || !connected()) {
      return { error: 'SpacetimeDB client not initialized or not connected' };
    }

    try {
      // Hit HTTP SQL endpoint directly for ad-hoc queries
      const data = await fetch(
        `http://${import.meta.env.VITE_SPACETIME_HOST || 'localhost:3000'}/query/${import.meta.env.VITE_SPACETIME_DATABASE || 'game'}/${encodeURIComponent(sql)}`
      ).then(r => r.json());
      
      // Extract column names from the first row
      const columns = data.length > 0 ? Object.keys(data[0]) : [];
      
      return {
        columns,
        rows: data,
      };
    } catch (error: unknown) {
      console.error('Query execution failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      return { 
        error: `Query failed: ${errorMessage}. Make sure SpacetimeDB is running and the query is valid.`
      };
    }
  };

  const handleExecute = async () => {
    const result = await executeQuery(query());
    setQueryResult(result);
  };

  const renderTable = (result: QueryResult) => {
    if (result.error) {
      return (
        <div class="text-red-500 p-4 whitespace-pre-wrap">
          Error: {result.error}
        </div>
      );
    }

    if (!result.columns || !result.rows) {
      return <div class="text-gray-500 p-4">No results</div>;
    }

    return (
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              {result.columns.map((column) => (
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {result.rows.map((row) => (
              <tr>
                {result.columns!.map((column) => (
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {JSON.stringify(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Example queries that users can try
  const exampleQueries = [
    {
      name: "List Tables",
      sql: "SELECT name FROM sqlite_master WHERE type='table';"
    },
    {
      name: "Table Schemas",
      sql: "SELECT name, sql FROM sqlite_master WHERE type='table';"
    }
  ];

  return (
    <div class="container mx-auto p-4">
      <Card class="mb-4">
        <div class="p-4">
          <h2 class="text-2xl font-bold mb-4">SpacetimeDB Inspector</h2>
          
          <Show when={connected()}>
            <Badge class="mb-4" variant="default">Connected to SpacetimeDB</Badge>
          </Show>
          <Show when={!connected()}>
            <Badge class="mb-4" variant="destructive">Not connected to SpacetimeDB</Badge>
          </Show>

          <div class="mb-4">
            <h3 class="text-lg font-semibold mb-2">Example Queries</h3>
            <div class="flex gap-2 flex-wrap">
              {exampleQueries.map(example => (
                <Button
                  variant="outline"
                  onClick={() => setQuery(example.sql)}
                  class="text-sm"
                >
                  {example.name}
                </Button>
              ))}
            </div>
          </div>

          <div class="mb-4">
            <textarea
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
              class="w-full font-mono p-2 border rounded"
              rows={4}
              placeholder="Enter your SQL query here..."
            />
          </div>

          <Button onClick={handleExecute} class="w-full" disabled={!connected()}>
            Execute Query
          </Button>
        </div>
      </Card>

      <Card>
        <div class="p-4">
          <h3 class="text-xl font-semibold mb-4">Results</h3>
          <ScrollArea class="h-[400px]">
            {renderTable(queryResult())}
          </ScrollArea>
        </div>
      </Card>
    </div>
  );
};

export default DbInspector; 