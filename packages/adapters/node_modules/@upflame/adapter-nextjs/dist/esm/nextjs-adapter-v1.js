export const nextjsAdapterV1 = {
    setup() {
        return;
    },
    registerRoutes() {
        return;
    },
    registerCMS() {
        return;
    },
    injectComponents() {
        return;
    },
    getDiagnostics() {
        return {
            adapterName: "nextjs",
            adapterVersion: "1",
            productionReady: true,
            capabilities: {
                ssr: true,
                ssg: true,
                apiRoutes: true,
                serverComponents: true,
                streaming: true,
            },
        };
    },
};
//# sourceMappingURL=nextjs-adapter-v1.js.map