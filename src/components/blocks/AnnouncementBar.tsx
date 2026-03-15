import React from "react";
import { z } from "zod";

export const AnnouncementBarPropsSchema = z.object({
  text: z.string(),
  variant: z.enum(["info", "success", "warning", "error"]).default("info"),
  dismissible: z.boolean().default(false),
});
export type AnnouncementBarProps = z.infer<typeof AnnouncementBarPropsSchema>;

export default function AnnouncementBar({ text, variant, dismissible }: AnnouncementBarProps): JSX.Element {
  const variants: Record<string, string> = {
    info: "bg-blue-50 text-blue-900 border-blue-200",
    success: "bg-green-50 text-green-900 border-green-200",
    warning: "bg-yellow-50 text-yellow-900 border-yellow-200",
    error: "bg-red-50 text-red-900 border-red-200",
  };
  return (
    <div className={["w-full border py-2 px-4 text-sm", variants[variant]].join(" ")}
         role="status">
      <div className="container mx-auto flex items-center justify-between">
        <span>{text}</span>
        {dismissible && (
          <button className="ml-4 text-xs opacity-70 hover:opacity-100" aria-label="Dismiss announcement"
            onClick={() => { /* no-op in RSC; client-side can hydrate if needed */ }}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
