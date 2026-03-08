"use client";
import { useEffect, useState } from "react";
import { settingsApi } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Key, Cpu, Trash2, Check, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const PROVIDERS = [
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude models — recommended",
    placeholder: "sk-ant-...",
    docs: "https://console.anthropic.com/",
    recommended: true,
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o and GPT-4o Mini",
    placeholder: "sk-...",
    docs: "https://platform.openai.com/",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Access all models via one API",
    placeholder: "sk-or-...",
    docs: "https://openrouter.ai/",
  },
  {
    id: "tavily",
    name: "Tavily Search",
    description: "Enable web search for lead research",
    placeholder: "tvly-...",
    docs: "https://tavily.com/",
  },
];

interface ApiKeyEntry {
  provider: string;
  key_preview: string;
  is_active: string;
}

interface ModelOption {
  id: string;
  name: string;
}

export default function SettingsPage() {
  const [savedKeys, setSavedKeys] = useState<ApiKeyEntry[]>([]);
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [models, setModels] = useState<Record<string, ModelOption[]>>({});
  const [llmConfig, setLlmConfig] = useState({ provider: "anthropic", model: "claude-sonnet-4-6" });
  const [savingModel, setSavingModel] = useState(false);

  useEffect(() => {
    settingsApi.getApiKeys().then(setSavedKeys);
    settingsApi.getModels().then(setModels);
    settingsApi.getLLMConfig().then(setLlmConfig);
  }, []);

  function isSaved(provider: string) {
    return savedKeys.some((k) => k.provider === provider && k.is_active === "true");
  }

  function getPreview(provider: string) {
    return savedKeys.find((k) => k.provider === provider)?.key_preview || "";
  }

  async function handleSave(provider: string) {
    const key = keyInputs[provider];
    if (!key) return;
    setSaving(provider);
    try {
      await settingsApi.upsertApiKey({ provider, api_key: key });
      setSavedKeys(await settingsApi.getApiKeys());
      setKeyInputs({ ...keyInputs, [provider]: "" });
    } finally {
      setSaving(null);
    }
  }

  async function handleDelete(provider: string) {
    if (!confirm(`Remove ${provider} API key?`)) return;
    await settingsApi.deleteApiKey(provider);
    setSavedKeys(await settingsApi.getApiKeys());
  }

  async function handleModelSave() {
    setSavingModel(true);
    try {
      await settingsApi.setLLMConfig(llmConfig);
    } finally {
      setSavingModel(false);
    }
  }

  const availableModels: ModelOption[] = models[llmConfig.provider] || [];

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Configure API keys and AI model preferences</p>
      </div>

      {/* Ethical Note */}
      <div className="flex gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 mb-8">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-medium mb-0.5">Important: LinkedIn & Email Compliance</p>
          <p>
            Automated LinkedIn outreach may violate their Terms of Service. Use generated messages
            manually or via approved APIs only. This tool is designed for legitimate, authorized
            sales outreach. Always respect opt-out requests and applicable laws (CAN-SPAM, GDPR).
          </p>
        </div>
      </div>

      {/* API Keys */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key size={17} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-700">API Keys</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {PROVIDERS.map((provider) => {
            const saved = isSaved(provider.id);
            const preview = getPreview(provider.id);
            return (
              <div key={provider.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800 text-sm">{provider.name}</p>
                      {provider.recommended && (
                        <Badge className="bg-violet-50 text-violet-600 border-violet-100 text-xs">
                          Recommended
                        </Badge>
                      )}
                      {saved && (
                        <Badge className="bg-green-50 text-green-600 border-green-100 text-xs gap-1">
                          <Check size={10} /> Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{provider.description}</p>
                  </div>
                  {saved && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">{preview}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(provider.id)}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKeys[provider.id] ? "text" : "password"}
                      placeholder={saved ? `Update key (current: ${preview})` : provider.placeholder}
                      value={keyInputs[provider.id] || ""}
                      onChange={(e) => setKeyInputs({ ...keyInputs, [provider.id]: e.target.value })}
                      className="w-full px-3 py-2 pr-9 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeys({ ...showKeys, [provider.id]: !showKeys[provider.id] })}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showKeys[provider.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <Button
                    onClick={() => handleSave(provider.id)}
                    loading={saving === provider.id}
                    disabled={!keyInputs[provider.id]}
                    size="sm"
                  >
                    Save
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* LLM Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cpu size={17} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-700">Default LLM Configuration</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Provider</label>
              <select
                value={llmConfig.provider}
                onChange={(e) =>
                  setLlmConfig({
                    provider: e.target.value,
                    model: models[e.target.value]?.[0]?.id || "",
                  })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Model</label>
              <select
                value={llmConfig.model}
                onChange={(e) => setLlmConfig({ ...llmConfig, model: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
                {availableModels.length === 0 && (
                  <option value={llmConfig.model}>{llmConfig.model}</option>
                )}
              </select>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
            <p className="text-xs text-slate-500 font-medium mb-2">Cost Guide</p>
            <div className="grid grid-cols-2 gap-y-1 text-xs text-slate-600">
              <span>Claude Haiku 4.5</span><span className="text-green-600 font-medium">~$0.0003/1K tokens</span>
              <span>Claude Sonnet 4.6</span><span className="text-yellow-600 font-medium">~$0.003/1K tokens</span>
              <span>GPT-4o Mini</span><span className="text-green-600 font-medium">~$0.0002/1K tokens</span>
              <span>GPT-4o</span><span className="text-orange-600 font-medium">~$0.005/1K tokens</span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleModelSave} loading={savingModel}>
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
