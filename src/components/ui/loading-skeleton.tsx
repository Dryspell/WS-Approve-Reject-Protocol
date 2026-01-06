import { Component } from "solid-js";

interface SkeletonProps {
  class?: string;
  width?: string;
  height?: string;
  circle?: boolean;
}

export const Skeleton: Component<SkeletonProps> = (props) => {
  return (
    <div
      class={`animate-pulse bg-gray-200 ${props.circle ? 'rounded-full' : 'rounded'} ${props.class || ''}`}
      style={{
        width: props.width || '100%',
        height: props.height || '1rem',
      }}
    />
  );
};

export const VoteCardSkeleton: Component = () => {
  return (
    <div class="rounded-lg border-2 border-gray-200 bg-gray-50 p-3">
      <div class="flex items-center gap-2">
        <Skeleton circle width="2rem" height="2rem" />
        <div class="flex-1 space-y-2">
          <Skeleton width="60%" height="1rem" />
          <Skeleton width="40%" height="0.75rem" />
        </div>
      </div>
    </div>
  );
};

export const PlayerCardSkeleton: Component = () => {
  return (
    <div class="rounded border p-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 flex-1">
          <Skeleton circle width="1.5rem" height="1.5rem" />
          <div class="flex-1 space-y-2">
            <Skeleton width="50%" height="1rem" />
            <Skeleton width="30%" height="0.75rem" />
          </div>
        </div>
        <Skeleton width="3rem" height="1.5rem" />
      </div>
    </div>
  );
};

export const MarketListingSkeleton: Component = () => {
  return (
    <div class="rounded-lg border p-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 flex-1">
          <Skeleton circle width="2rem" height="2rem" />
          <div class="flex-1 space-y-2">
            <Skeleton width="40%" height="1rem" />
            <Skeleton width="60%" height="0.75rem" />
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Skeleton width="4rem" height="2rem" />
          <Skeleton width="3rem" height="2rem" />
        </div>
      </div>
    </div>
  );
};

export const LoadingSpinner: Component<{ size?: 'sm' | 'md' | 'lg' }> = (props) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div class="flex items-center justify-center">
      <div
        class={`animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 ${
          sizeClasses[props.size || 'md']
        }`}
      />
    </div>
  );
};

export const LoadingOverlay: Component<{ message?: string }> = (props) => {
  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div class="rounded-lg bg-white p-8 shadow-xl">
        <LoadingSpinner size="lg" />
        {props.message && (
          <p class="mt-4 text-center text-gray-700">{props.message}</p>
        )}
      </div>
    </div>
  );
};

