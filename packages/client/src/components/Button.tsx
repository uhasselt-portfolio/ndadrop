import { h } from 'preact';
import clsx from "clsx";

interface Props {
  size: "sm" | "md" | "inp";
  type: "primary" | "primary-dark" | "primary-dark-2" | "secondary" | "glow" | "danger";
  width?: "full" | "min",
  onClick?: (e: MouseEvent) => void;
  children?: any;
  class?: string;
}


const Button = (props: Props) => {

  const cls_size = clsx(
    props.size === "sm" && "px-2.5 py-1 gap-1.5",
    props.size === "md" && "px-4 py-2 gap-2",
    props.size === "inp" && "px-3 py-1.5 gap-2",
  );

  const cls_text = clsx(
    props.size === "sm" && "text-sm font-medium",
    props.size === "md" && "text-md font-semibold",
    props.size === "inp" && "text-sm font-medium",
  );

  const cls_btn = clsx(
    props.class,
    cls_size,
    cls_text,
    "border h-min whitespace-nowrap",
    props.size === "inp" ? "rounded-md" : "rounded-lg",
    "flex flex-row items-center justify-center",
    props.type === "primary" && "border-[#8b64ff] bg-[#8b64ff] text-[#ffffff]",
    props.type === "primary-dark" && "border-[#0a0a0a] bg-[#0a0a0a] text-[#ffffff]",
    props.type === "primary-dark-2" && "border-[#000823] bg-[#000823] text-[#ffffff]",
    props.type === "glow" && "border-[#F6F3FF] bg-[#F6F3FF] text-[#8B64FF] shadow",
    props.type === "secondary" && "bg-[#ffffff] text-[#0a0a0a] shadow-sm",
    props.type === "danger" && "border-red-50 bg-red-50 text-red-600",
    (props.width && props.width === "full") ? "w-full" : "w-min",
  );

  // Render
  const render = () => {
    return (
        <button class={cls_btn} onClick={props.onClick}>
      {props.children}
    </button>
    );
  }

  return render();
};

export default Button;