const fs = require('fs');
let code = fs.readFileSync('lib/actions/super-admin.ts', 'utf8');

const badBlock = `        } else {
            // Preserve existing key from DB
            const existingGlobal = await SystemSettingsModel.findOne({ key: 'global' }).lean() as SystemSettingsRecord | null;
        
        const processFeatureConfigGlobal = (newConf: any, oldConf: any) => {
            if (!newConf) return undefined;
            let encKey = "";
            if (newConf.apiKey && !newConf.apiKey.startsWith('****')) {
                encKey = encryptApiKey(newConf.apiKey);
            } else if (newConf.apiKey?.startsWith('****') && oldConf?.apiKey) {
                encKey = oldConf.apiKey;
            }
            return {
                provider: newConf.provider,
                apiKey: encKey,
                model: sanitizeString(newConf.model, 200),
                ...(newConf.customModelId ? { customModelId: sanitizeString(newConf.customModelId, 200) } : {})
            };
        };
            const existingKey = existingGlobal?.defaultAiConfig?.apiKey;
            if (!existingKey) {
                throw new Error("API Key is required for initial configuration");
            }
            encryptedApiKey = existingKey;
        }`;

const goodBlock = `        const existingGlobal = await SystemSettingsModel.findOne({ key: 'global' }).lean() as SystemSettingsRecord | null;

        } else {
            // Preserve existing key from DB
            const existingKey = existingGlobal?.defaultAiConfig?.apiKey;
            if (!existingKey) {
                throw new Error("API Key is required for initial configuration");
            }
            encryptedApiKey = existingKey;
        }

        const processFeatureConfigGlobal = (newConf: any, oldConf: any) => {
            if (!newConf) return undefined;
            let encKey = "";
            if (newConf.apiKey && !newConf.apiKey.startsWith('****')) {
                encKey = encryptApiKey(newConf.apiKey);
            } else if (newConf.apiKey?.startsWith('****') && oldConf?.apiKey) {
                encKey = oldConf.apiKey;
            }
            return {
                provider: newConf.provider,
                apiKey: encKey,
                model: sanitizeString(newConf.model, 200),
                ...(newConf.customModelId ? { customModelId: sanitizeString(newConf.customModelId, 200) } : {})
            };
        };`;

// Also fix the fact that we moved existingGlobal above the else block, so we have to move it above the if(isNewKey)!
const fullBadBlock = `        const isNewKey = config.apiKey && !config.apiKey.startsWith('****');
        if (isNewKey) {
            encryptedApiKey = encryptApiKey(config.apiKey);
` + badBlock;

const fullGoodBlock = `        const isNewKey = config.apiKey && !config.apiKey.startsWith('****');
` + goodBlock.replace(`        } else {\n`, `        if (isNewKey) {
            encryptedApiKey = encryptApiKey(config.apiKey);
        } else {\n`);

if(code.includes(badBlock)) {
    code = code.replace(fullBadBlock, fullGoodBlock);
    fs.writeFileSync('lib/actions/super-admin.ts', code);
    console.log("Successfully replaced block.");
} else {
    // If exact match fails, fallback to regex
    console.log("Literal match failed, using regex fallback...");
    // Just find the processFeatureConfigGlobal string and move it down.
    code = code.replace(/        const processFeatureConfigGlobal = \([\s\S]*?        };\r?\n/, '');
    const insertAfter = `            encryptedApiKey = existingKey;\r?\n        }`;
    const toInsert = `\n        const processFeatureConfigGlobal = (newConf: any, oldConf: any) => {
            if (!newConf) return undefined;
            let encKey = "";
            if (newConf.apiKey && !newConf.apiKey.startsWith('****')) {
                encKey = encryptApiKey(newConf.apiKey);
            } else if (newConf.apiKey?.startsWith('****') && oldConf?.apiKey) {
                encKey = oldConf.apiKey;
            }
            return {
                provider: newConf.provider,
                apiKey: encKey,
                model: sanitizeString(newConf.model, 200),
                ...(newConf.customModelId ? { customModelId: sanitizeString(newConf.customModelId, 200) } : {})
            };
        };\n`;
    code = code.replace(new RegExp(insertAfter), "            encryptedApiKey = existingKey;\n        }\n" + toInsert);
    // Also move existingGlobal up
    code = code.replace(/            const existingGlobal =[\s\S]*?;/, "");
    code = code.replace("        if (isNewKey) {", "        const existingGlobal = await SystemSettingsModel.findOne({ key: 'global' }).lean() as SystemSettingsRecord | null;\n        if (isNewKey) {");
    fs.writeFileSync('lib/actions/super-admin.ts', code);
    console.log("Regex fallback complete.");
}
