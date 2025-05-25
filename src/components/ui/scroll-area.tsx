import { Component, JSX } from "solid-js";

interface ScrollAreaProps {
  ref?: HTMLDivElement;
  class?: string;
  style?: JSX.CSSProperties;
  children?: JSX.Element;
}

export const ScrollArea: Component<ScrollAreaProps> = props => {
  return (
    <div
      ref={props.ref}
      class={`overflow-auto ${props.class || ""}`}
      style={{
        "scrollbar-width": "thin",
        "scrollbar-color": "var(--scroll-thumb) var(--scroll-track)",
        ...props.style,
      }}
    >
      {props.children}
    </div>
  );
};
