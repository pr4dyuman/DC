const fs = require('fs');
let code = fs.readFileSync('lib/actions/super-admin.ts', 'utf8');

code = code.replace(/const processFeatureConfig = \(newConf, oldConf\) => \{/g,
                    'const processFeatureConfig = (newConf: any, oldConf: any) => {');

code = code.replace(/    if \(\!config\) \{\r?\n        \/\/ Remove default AI config[\s\S]*?\{ upsert: true \}\r?\n        \);/, 
`    if (!config) {
        // Remove default AI config
        await SystemSettingsModel.updateOne(
            { key: 'global' },
            { $unset: { defaultAiConfig: '' } },
            { upsert: true }
        );`);

code = code.replace('        const existing = await SystemSettingsModel.findOne({ key: \'global\' }).lean() as SystemSettingsRecord | null;',
`        const existingGlobal = await SystemSettingsModel.findOne({ key: 'global' }).lean() as SystemSettingsRecord | null;
        
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
        };`);

code = code.replace(/const existingKey = existing\?\.defaultAiConfig\?\.apiKey;/g, 'const existingKey = existingGlobal?.defaultAiConfig?.apiKey;');

fs.writeFileSync('lib/actions/super-admin.ts', code);
