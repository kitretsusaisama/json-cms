import { astroAdapterDescriptor } from "./frameworks/astro";
import { gatsbyAdapterDescriptor } from "./frameworks/gatsby";
import { nextjsAdapterDescriptor } from "./frameworks/nextjs";
const parseSemver = (version) => {
    const match = /^(?:[v^~])?(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
    if (!match) {
        return null;
    }
    return [Number(match[1]), Number(match[2]), Number(match[3])];
};
const compareSemver = (left, right) => {
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
export const satisfiesVersion = (version, range) => {
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
        return (compared !== null &&
            target[0] === base[0] &&
            target[1] === base[1] &&
            compared >= 0);
    }
    const compared = compareSemver(version, range);
    return compared !== null && compared === 0;
};
export class AdapterRegistry {
    descriptors;
    constructor(descriptors = [nextjsAdapterDescriptor, astroAdapterDescriptor, gatsbyAdapterDescriptor]) {
        this.descriptors = descriptors;
    }
    list() {
        return [...this.descriptors];
    }
    resolve(request) {
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
    capabilityMatrix() {
        return this.descriptors.reduce((matrix, descriptor) => {
            matrix[descriptor.id] = [...descriptor.capabilities];
            return matrix;
        }, {});
    }
    capabilityMatrixByFramework() {
        return this.descriptors.reduce((matrix, descriptor) => {
            if (!matrix[descriptor.framework]) {
                matrix[descriptor.framework] = [];
            }
            matrix[descriptor.framework].push([...descriptor.capabilities]);
            return matrix;
        }, {});
    }
}
export const hasCapabilities = (availableCapabilities, requiredCapabilities) => requiredCapabilities.every((capability) => availableCapabilities.includes(capability));
export const adapterRegistry = new AdapterRegistry();
//# sourceMappingURL=registry.js.map