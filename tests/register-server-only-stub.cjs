const Module = require("module");

const originalResolveFilename = Module._resolveFilename;
const originalLoad = Module._load;
const STUB_ID = "__codex_server_only_stub__";

Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
    if (request === "server-only") {
        return STUB_ID;
    }

    return originalResolveFilename.call(this, request, parent, isMain, options);
};

Module._load = function load(request, parent, isMain) {
    if (request === STUB_ID || request === "server-only") {
        return {};
    }

    return originalLoad.call(this, request, parent, isMain);
};
