import { Component, JSX, createSignal, onError, Show } from "solid-js";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Button } from "./button";

interface ErrorBoundaryProps {
  children: JSX.Element;
  fallback?: (error: Error, reset: () => void) => JSX.Element;
  onError?: (error: Error) => void;
}

export const ErrorBoundary: Component<ErrorBoundaryProps> = (props) => {
  const [error, setError] = createSignal<Error | null>(null);

  onError((err) => {
    console.error("Error caught by boundary:", err);
    setError(err as Error);
    props.onError?.(err as Error);
  });

  const reset = () => {
    setError(null);
  };

  return (
    <Show
      when={!error()}
      fallback={
        props.fallback ? (
          props.fallback(error()!, reset)
        ) : (
          <DefaultErrorFallback error={error()!} reset={reset} />
        )
      }
    >
      {props.children}
    </Show>
  );
};

const DefaultErrorFallback: Component<{ error: Error; reset: () => void }> = (
  props
) => {
  return (
    <div class="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card class="w-full max-w-lg">
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-red-600">
            <span class="text-2xl">⚠️</span>
            Something went wrong
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="rounded-lg bg-red-50 border border-red-200 p-4">
            <p class="text-sm font-semibold text-red-900">Error Details:</p>
            <p class="mt-2 text-sm text-red-800 font-mono">
              {props.error.message}
            </p>
          </div>

          <div class="space-y-2">
            <p class="text-sm text-gray-600">
              We apologize for the inconvenience. You can try:
            </p>
            <ul class="ml-6 list-disc space-y-1 text-sm text-gray-600">
              <li>Refreshing the page</li>
              <li>Clearing your browser cache</li>
              <li>Checking your internet connection</li>
              <li>Contacting support if the problem persists</li>
            </ul>
          </div>

          <div class="flex gap-2">
            <Button onClick={props.reset} class="flex-1">
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              class="flex-1"
            >
              Reload Page
            </Button>
          </div>

          <details class="text-xs text-gray-500">
            <summary class="cursor-pointer font-semibold">
              Technical Details
            </summary>
            <pre class="mt-2 overflow-auto rounded bg-gray-100 p-2">
              {props.error.stack}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorBoundary;

