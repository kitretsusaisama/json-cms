import React, { ReactElement } from "react";
import { planPage } from "@/lib/compose/planner";
import { cachedLoadPage, generateCacheKey } from "@/lib/compose/resolve";
import { ComponentInstance, Constraint } from "@/types/composer";
import { getRegisteredComponent } from "@/components/registry";
import { renderRegistry } from "@/core/registry/render-registry";
import { logger } from "@/lib/logger";
import DebugInfo, {
  ErrorDisplay,
  PlanningErrorDisplay,
  FallbackRenderer,
} from "./JsonRendererComponents";

type JsonRendererV2Props = {
  slug: string;
  ctx: Record<string, unknown>;
  globalConstraints?: Constraint[];
  resolveContext?: {
    site?: string;
    env?: string;
    locale?: string;
    preview?: boolean;
  };
  debug?: boolean;
};

export default async function JsonRendererV2({
  slug,
  ctx,
  globalConstraints = [],
  resolveContext = {},
  debug = false,
}: JsonRendererV2Props): Promise<ReactElement> {
  try {
    const cacheKey = generateCacheKey(slug, ctx, resolveContext);
    const loadedData = await cachedLoadPage(slug, ctx, resolveContext);

    const planResult = planPage({
      page: loadedData.page,
      ctx,
      globalConstraints,
      blocks: loadedData.blocks,
      slotMap: {},
    });

    if (planResult.errors.length > 0) {
      logger.error({
        message: `Planning errors for page "${slug}"`,
        errors: planResult.errors,
      });

      if (debug) {
        return <PlanningErrorDisplay errors={planResult.errors} warnings={planResult.warnings} />;
      }

      return <FallbackRenderer slug={slug} />;
    }

    const renderedComponents = planResult.components.map((component, index) => (
      <ComponentRenderer
        key={component.id || `component-${index}`}
        component={component}
        componentIndex={index}
        debug={debug}
      />
    ));

    return (
      <>
        {debug ? (
          <DebugInfo
            planResult={planResult}
            loadWarnings={loadedData.warnings}
            cacheKey={cacheKey}
          />
        ) : null}
        <main
          data-page-slug={slug}
          {...(debug ? { "data-plan-metrics": JSON.stringify(planResult.metrics) } : {})}
        >
          {renderedComponents}
        </main>
      </>
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({
      message: `Failed to render page "${slug}": ${errorMessage}`,
    });

    if (debug) {
      return <ErrorDisplay error={error as Error} slug={slug} />;
    }

    return <FallbackRenderer slug={slug} />;
  }
}

function ComponentRenderer({
  component,
  componentIndex,
  debug,
}: {
  component: ComponentInstance & Record<string, unknown>;
  componentIndex: number;
  debug: boolean;
}) {
  const resolved = renderRegistry.resolve(component.key);
  const resolvedKey = resolved?.componentKey ?? component.key;
  const resolvedRenderer = typeof resolved?.renderer === "function" ? resolved.renderer : null;
  const ComponentClass = (resolvedRenderer as React.ComponentType<Record<string, unknown>> | null) ?? getRegisteredComponent(resolvedKey);

  if (!ComponentClass) {
    if (debug) {
      return (
        <div
          className="border-2 border-red-500 bg-red-50 p-4"
          data-testid={`missing-component-${component.id}`}
        >
          <h3 className="font-bold text-red-700">Missing Component</h3>
          <p>Key: {component.key}</p>
          <p>ID: {component.id}</p>
        </div>
      );
    }
    return null;
  }

  const slots: Record<string, React.ReactNode[]> = {};
  if (component.slotIds) {
    for (const slotName of component.slotIds) {
      const slotItems = component[`${slotName}Items`] as ComponentInstance[] | undefined;
      if (slotItems) {
        slots[slotName] = slotItems.map((item, slotIndex) => (
          <ComponentRenderer
            key={item.id || `${slotName}-slot-${slotIndex}`}
            component={item as ComponentInstance & Record<string, unknown>}
            componentIndex={slotIndex}
            debug={debug}
          />
        ));
      }
    }
  }

  try {
    const finalProps: Record<string, unknown> = {
      ...component.props,
      ...(Object.keys(slots).length > 0 ? { slots } : {}),
      "data-testid": component.id || `component-${component.key}-${componentIndex}`,
      "data-component-key": resolvedKey,
      ...(component.variant ? { "data-variant": component.variant } : {}),
      ...(debug && component.weight ? { "data-weight": component.weight } : {}),
      ...(component.analytics ? { "data-analytics": JSON.stringify(component.analytics) } : {}),
    };

    const Component = ComponentClass as React.ComponentType<Record<string, unknown>>;
    return <Component {...finalProps} />;
  } catch (renderError) {
    if (process.env.NODE_ENV !== "production") {
      console.error(`Failed to render component ${component.key} (${component.id}):`, renderError);
    }

    if (debug) {
      return (
        <div
          className="border-2 border-orange-500 bg-orange-50 p-4"
          data-testid={`error-component-${component.id}`}
        >
          <h3 className="font-bold text-orange-700">Render Error</h3>
          <p>
            Component: {component.key} ({component.id})
          </p>
          <p>Error: {(renderError as Error).message}</p>
        </div>
      );
    }

    return null;
  }
}

export async function renderJsonPage(
  slug: string,
  ctx: Record<string, unknown>,
  options: Omit<JsonRendererV2Props, "slug" | "ctx"> = {}
): Promise<ReactElement> {
  return JsonRendererV2({ slug, ctx, ...options });
}



