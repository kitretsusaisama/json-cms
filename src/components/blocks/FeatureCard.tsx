import React from "react";
import { z } from "zod";

export const FeatureCardPropsSchema = z.object({
  icon: z.string().optional(),
  title: z.string(),
  description: z.string(),
  className: z.string().optional(),
});
export type FeatureCardProps = z.infer<typeof FeatureCardPropsSchema>;

export default function FeatureCard({ icon, title, description, className }: FeatureCardProps): JSX.Element {
  return (
    <div className={["rounded border p-4 bg-white dark:bg-gray-900", className].filter(Boolean).join(" ")}> 
      {icon && <div className="text-2xl mb-2" aria-hidden>{icon}</div>}
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}
