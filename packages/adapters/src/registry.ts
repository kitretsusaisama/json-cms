import { astroAdapterDescriptor } from "./frameworks/astro";
import { gatsbyAdapterDescriptor } from "./frameworks/gatsby";
import { nextjsAdapterDescriptor } from "./frameworks/nextjs";
import { remixAdapterDescriptor } from "./frameworks/remix";
import type { AdapterCapability, AdapterDescriptor, ResolveAdapterRequest } from "./types";

const parseSemver = (version: string): [number, number, number] | null => {
  const match = /^(?:[v^~])?(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
  if (!match) {
    return null;
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

const compareSemver = (left: string, right: string): number | null => {
  const parsedLeft = parseSemver(left);
  const parsedRight = parseSemver(right);

  if (!parsedLeft || !parsedRight) {
    return null;
  }

  for (let index = 0; index < 3; index += 1) {
    if (parsedLeft[index] > parsedRight[index]) {
      return 1;
    }

    if (parsedLeft[index] < parsedRight[index]) {
      return -1;
    }
  }

  return 0;
};

/**
 * Supported range formats:
 * - exact: 1.2.3
 * - >=: >=1.2.3
 * - caret: ^1.2.3
 * - tilde: ~1.2.3
 *
 * Invalid or unsupported versions/ranges return false.
 */
export const satisfiesVersion = (version: string, range: string): boolean => {
  if (!parseSemver(version)) {
    return false;
  }

  if (range.startsWith(">=")) {
    const compared = compareSemver(version, range.slice(2));
    return compared !== null && compared >= 0;
  }

  if (range.startsWith("^")) {
    const base = parseSemver(range.slice(1));
    const target = parseSemver(version);
    if (!base || !target) {
      return false;
    }

    const compared = compareSemver(version, range.slice(1));
    return compared !== null && target[0] === base[0] && compared >= 0;
  }

  if (range.startsWith("~")) {
    const base = parseSemver(range.slice(1));
    const target = parseSemver(version);
    if (!base || !target) {
      return false;
    }

    const compared = compareSemver(version, range.slice(1));
    return (
      compared !== null &&
      target[0] === base[0] &&
      target[1] === base[1] &&
      compared >= 0
    );
  }

  const compared = compareSemver(version, range);
  return compared !== null && compared === 0;
};

export class AdapterRegistry {
  private readonly descriptors: AdapterDescriptor[];

  constructor(descriptors: AdapterDescriptor[] = [nextjsAdapterDescriptor, astroAdapterDescriptor, remixAdapterDescriptor, gatsbyAdapterDescriptor]) {
    this.descriptors = descriptors;
  }

  list(): AdapterDescriptor[] {
    return [...this.descriptors];
  }

  resolve(request: ResolveAdapterRequest): AdapterDescriptor | undefined {
    const requiredCapabilities = request.requiredCapabilities ?? [];

    return this.descriptors.find((descriptor) => {
      if (descriptor.framework !== request.framework) {
        return false;
      }

      if (!satisfiesVersion(request.version, descriptor.versionRange)) {
        return false;
      }

      return hasCapabilities(descriptor.capabilities, requiredCapabilities);
    });
  }

  capabilityMatrix(): Record<string, AdapterCapability[]> {
    return this.descriptors.reduce<Record<string, AdapterCapability[]>>((matrix, descriptor) => {
      matrix[descriptor.id] = [...descriptor.capabilities];
      return matrix;
    }, {});
  }

  capabilityMatrixByFramework(): Record<string, AdapterCapability[][]> {
    return this.descriptors.reduce<Record<string, AdapterCapability[][]>>((matrix, descriptor) => {
      if (!matrix[descriptor.framework]) {
        matrix[descriptor.framework] = [];
      }

      matrix[descriptor.framework].push([...descriptor.capabilities]);
      return matrix;
    }, {});
  }
}

export const hasCapabilities = (
  availableCapabilities: AdapterCapability[],
  requiredCapabilities: AdapterCapability[],
): boolean => requiredCapabilities.every((capability) => availableCapabilities.includes(capability));

export const adapterRegistry = new AdapterRegistry();
