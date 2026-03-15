#!/usr/bin/env node
import { runCreateJsonCms } from "./index.js";
runCreateJsonCms().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
//# sourceMappingURL=cli.js.map