import React from "react";
import { z } from "zod";

export const GridPropsSchema = z.object({
  cols: z.record(z.string(), z.number()).or(
    z.object({ base: z.number().optional(), sm: z.number().optional(), md: z.number().optional(), lg: z.number().optional(), xl: z.number().optional() })
  ).default({ base: 1, md: 2, lg: 3 }),
  gap: z.string().optional(),
  className: z.string().optional(),
});
export type GridProps = z.infer<typeof GridPropsSchema>;

export default function Grid({ cols, gap, className, children }: React.PropsWithChildren<GridProps>): JSX.Element {
  // Map responsive cols to Tailwind classes if provided as object
  const colClass = typeof cols === 'object'
    ? [
        cols.base && `grid-cols-${cols.base}`,
        cols.sm && `sm:grid-cols-${cols.sm}`,
        cols.md && `md:grid-cols-${cols.md}`,
        cols.lg && `lg:grid-cols-${cols.lg}`,
        cols.xl && `xl:grid-cols-${cols.xl}`,
      ].filter(Boolean).join(' ')
    : `grid-cols-${cols}`;

  const gapClass = gap?.startsWith('token:') ? '' : gap ? `gap-${gap}` : '';

  return (
    <section className={['grid', colClass, gapClass, className].filter(Boolean).join(' ')}>
      {children}
    </section>
  );
}
