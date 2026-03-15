import React from "react";
import { z } from "zod";

export const NewsletterPropsSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  placeholder: z.string().optional(),
});

export type NewsletterProps = z.infer<typeof NewsletterPropsSchema>;

export default function Newsletter({ title, description, placeholder }: NewsletterProps): JSX.Element {
  return (
    <section className="newsletter container mx-auto py-10">
      <h3 className="text-2xl font-semibold text-center">{title}</h3>
      {description && (
        <p className="mt-2 text-center text-gray-600 dark:text-gray-300">{description}</p>
      )}
      <form className="mt-6 flex items-center justify-center gap-3">
        <input
          type="email"
          placeholder={placeholder}
          className="w-64 rounded border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800"
        />
        <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Subscribe
        </button>
      </form>
    </section>
  );
}
