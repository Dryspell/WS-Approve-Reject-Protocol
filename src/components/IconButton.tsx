import { Component, mergeProps, splitProps } from "solid-js";
import { Button, ButtonProps } from "./ui/button";
import { cn } from "~/lib/utils";

const IconButton: Component<ButtonProps> = rawProps => {
  const props = mergeProps<ButtonProps[]>({ variant: "outline", size: "icon" }, rawProps);
  const [local, others] = splitProps(props, ["class", "variant", "size"]);

  return (
    <Button
      variant={local.variant}
      size={local.size}
      class={cn("size-8 touch-manipulation rounded-full", local.class)}
      {...others}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="size-4"
      >
        <path d="M5 12l14 0" />
        <path d="M13 18l6 -6" />
        <path d="M13 6l6 6" />
      </svg>
      <span class="sr-only">Next slide</span>
    </Button>
  );
};

export default IconButton;
