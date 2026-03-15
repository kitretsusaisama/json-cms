"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gatsbyAdapterDescriptor = exports.astroAdapterDescriptor = exports.nextjsAdapterDescriptor = exports.satisfiesVersion = exports.hasCapabilities = exports.adapterRegistry = exports.AdapterRegistry = void 0;
var registry_1 = require("./registry");
Object.defineProperty(exports, "AdapterRegistry", { enumerable: true, get: function () { return registry_1.AdapterRegistry; } });
Object.defineProperty(exports, "adapterRegistry", { enumerable: true, get: function () { return registry_1.adapterRegistry; } });
Object.defineProperty(exports, "hasCapabilities", { enumerable: true, get: function () { return registry_1.hasCapabilities; } });
Object.defineProperty(exports, "satisfiesVersion", { enumerable: true, get: function () { return registry_1.satisfiesVersion; } });
var nextjs_1 = require("./frameworks/nextjs");
Object.defineProperty(exports, "nextjsAdapterDescriptor", { enumerable: true, get: function () { return nextjs_1.nextjsAdapterDescriptor; } });
var astro_1 = require("./frameworks/astro");
Object.defineProperty(exports, "astroAdapterDescriptor", { enumerable: true, get: function () { return astro_1.astroAdapterDescriptor; } });
var gatsby_1 = require("./frameworks/gatsby");
Object.defineProperty(exports, "gatsbyAdapterDescriptor", { enumerable: true, get: function () { return gatsby_1.gatsbyAdapterDescriptor; } });
//# sourceMappingURL=index.js.map