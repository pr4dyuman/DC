const fs = require('fs');
let content = fs.readFileSync('lib/actions/super-admin.ts', 'utf8');

const processFnAgency = `
    const agencyForOverrides = await AgencyModel.findOne({ id: agencyId }).lean();
    const processFeatureConfig = (newConf, oldConf) => {
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

    const result = await AgencyModel.updateOne`;
content = content.replace(/\s*const result = await AgencyModel\.updateOne/, '\n' + processFnAgency);

const oldAgencyKeys = /\/\/ Per-feature model overrides[\s\S]*?sanitizeString\(config\.modelTaskChatbot,\s*200\) } : {}\),/;
const newAgencyKeys = `// Per-feature object overrides
                    ...(config.chatConfig         ? { chatConfig:         processFeatureConfig(config.chatConfig,         agencyForOverrides?.aiConfig?.chatConfig) } : {}),
                    ...(config.agentConfig        ? { agentConfig:        processFeatureConfig(config.agentConfig,        agencyForOverrides?.aiConfig?.agentConfig) } : {}),
                    ...(config.taskExplainConfig  ? { taskExplainConfig:  processFeatureConfig(config.taskExplainConfig,  agencyForOverrides?.aiConfig?.taskExplainConfig) } : {}),
                    ...(config.hourEstimateConfig ? { hourEstimateConfig: processFeatureConfig(config.hourEstimateConfig, agencyForOverrides?.aiConfig?.hourEstimateConfig) } : {}),
                    ...(config.taskChatbotConfig  ? { taskChatbotConfig:  processFeatureConfig(config.taskChatbotConfig,  agencyForOverrides?.aiConfig?.taskChatbotConfig) } : {}),`;
content = content.replace(oldAgencyKeys, newAgencyKeys);

const processFnGlobal = `
        const existingGlobal = await SystemSettingsModel.findOne({ key: 'global' }).lean();
        const processFeatureConfigGlobal = (newConf, oldConf) => {
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

        await SystemSettingsModel.updateOne`;
content = content.replace(/\s*await SystemSettingsModel\.updateOne/, '\n' + processFnGlobal);

const oldGlobalKeys = /\/\/ Per-feature model overrides[\s\S]*?sanitizeString\(config\.modelTaskChatbot,\s*200\) } : {}\),/;
const newGlobalKeys = `// Per-feature object overrides
                        ...(config.chatConfig         ? { chatConfig:         processFeatureConfigGlobal(config.chatConfig,         existingGlobal?.defaultAiConfig?.chatConfig) } : {}),
                        ...(config.agentConfig        ? { agentConfig:        processFeatureConfigGlobal(config.agentConfig,        existingGlobal?.defaultAiConfig?.agentConfig) } : {}),
                        ...(config.taskExplainConfig  ? { taskExplainConfig:  processFeatureConfigGlobal(config.taskExplainConfig,  existingGlobal?.defaultAiConfig?.taskExplainConfig) } : {}),
                        ...(config.hourEstimateConfig ? { hourEstimateConfig: processFeatureConfigGlobal(config.hourEstimateConfig, existingGlobal?.defaultAiConfig?.hourEstimateConfig) } : {}),
                        ...(config.taskChatbotConfig  ? { taskChatbotConfig:  processFeatureConfigGlobal(config.taskChatbotConfig,  existingGlobal?.defaultAiConfig?.taskChatbotConfig) } : {}),`;
content = content.replace(oldGlobalKeys, newGlobalKeys);

fs.writeFileSync('lib/actions/super-admin.ts', content);
