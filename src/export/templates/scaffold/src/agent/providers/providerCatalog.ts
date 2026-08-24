export type ProviderProtocol = "openai-compatible" | "anthropic" | "gemini" | "ollama-native";
export type ProviderAuth = { mode: "env"; envVar: string } | { mode: "session"; envVar?: string } | { mode: "none"; envVar?: string };
export type ProviderConnection = {
  id: string;
  kind: "builtin" | "custom";
  label: string;
  description: string;
  protocol: ProviderProtocol;
  baseUrl: string;
  auth: ProviderAuth;
  defaultModel: string;
  models: string[];
  enabled: boolean;
};

export const providerConnections = /*#CONN_BEGIN*/[
  {
    "id": "openai",
    "kind": "builtin",
    "label": "OpenAI",
    "description": "Default GPT-family hosted provider for general coding agents.",
    "protocol": "openai-compatible",
    "baseUrl": "https://api.openai.com/v1",
    "auth": {
      "mode": "env",
      "envVar": "OPENAI_API_KEY"
    },
    "defaultModel": "gpt-4o",
    "models": [
      "gpt-4o",
      "gpt-4o-mini"
    ],
    "enabled": true
  },
  {
    "id": "anthropic",
    "kind": "builtin",
    "label": "Anthropic",
    "description": "Claude-family provider for long-context coding and review workflows.",
    "protocol": "anthropic",
    "baseUrl": "https://api.anthropic.com/v1",
    "auth": {
      "mode": "env",
      "envVar": "ANTHROPIC_API_KEY"
    },
    "defaultModel": "claude-sonnet-4",
    "models": [
      "claude-sonnet-4",
      "claude-haiku"
    ],
    "enabled": false
  },
  {
    "id": "gemini",
    "kind": "builtin",
    "label": "Gemini",
    "description": "Google Gemini provider for multimodal and broad-context agent flows.",
    "protocol": "openai-compatible",
    "baseUrl": "https://generativelanguage.googleapis.com/v1beta/openai/",
    "auth": {
      "mode": "env",
      "envVar": "GEMINI_API_KEY"
    },
    "defaultModel": "gemini-2.5-pro",
    "models": [
      "gemini-2.5-pro",
      "gemini-2.5-flash"
    ],
    "enabled": false
  },
  {
    "id": "openrouter",
    "kind": "builtin",
    "label": "OpenRouter",
    "description": "Router provider for switching across hosted model families.",
    "protocol": "openai-compatible",
    "baseUrl": "https://openrouter.ai/api/v1",
    "auth": {
      "mode": "env",
      "envVar": "OPENROUTER_API_KEY"
    },
    "defaultModel": "anthropic/claude-sonnet-4",
    "models": [
      "anthropic/claude-sonnet-4",
      "openai/gpt-4o"
    ],
    "enabled": false
  },
  {
    "id": "deepseek",
    "kind": "builtin",
    "label": "DeepSeek",
    "description": "DeepSeek chat and reasoning provider presets.",
    "protocol": "openai-compatible",
    "baseUrl": "https://api.deepseek.com",
    "auth": {
      "mode": "env",
      "envVar": "DEEPSEEK_API_KEY"
    },
    "defaultModel": "deepseek-chat",
    "models": [
      "deepseek-chat",
      "deepseek-reasoner"
    ],
    "enabled": false
  },
  {
    "id": "z-ai",
    "kind": "builtin",
    "label": "Z.ai",
    "description": "GLM-family provider presets for Z.ai compatible adapters.",
    "protocol": "openai-compatible",
    "baseUrl": "https://api.z.ai/api/paas/v4/",
    "auth": {
      "mode": "env",
      "envVar": "ZAI_API_KEY"
    },
    "defaultModel": "glm-5.1",
    "models": [
      "glm-5.1",
      "glm-4.5",
      "glm-4.5-air"
    ],
    "enabled": false
  },
  {
    "id": "moonshot",
    "kind": "builtin",
    "label": "MoonShot",
    "description": "Kimi and Moonshot provider presets for Chinese and long-context agents.",
    "protocol": "openai-compatible",
    "baseUrl": "https://api.moonshot.cn/v1",
    "auth": {
      "mode": "env",
      "envVar": "MOONSHOT_API_KEY"
    },
    "defaultModel": "kimi-k2",
    "models": [
      "kimi-k2",
      "moonshot-v1-128k"
    ],
    "enabled": false
  },
  {
    "id": "local",
    "kind": "builtin",
    "label": "Local models",
    "description": "OpenAI-compatible local runtime presets for Ollama, LM Studio, and similar tools.",
    "protocol": "openai-compatible",
    "baseUrl": "http://localhost:11434/v1",
    "auth": {
      "mode": "none"
    },
    "defaultModel": "ollama/qwen3-coder",
    "models": [
      "ollama/qwen3-coder",
      "lmstudio/local-model",
      "local-model"
    ],
    "enabled": false
  },
  {
    "id": "custom-provider",
    "kind": "custom",
    "label": "Custom provider",
    "description": "Bring any OpenAI-compatible gateway, private endpoint, or hosted model proxy.",
    "protocol": "openai-compatible",
    "baseUrl": "https://api.example.com/v1",
    "auth": {
      "mode": "env",
      "envVar": "CUSTOM_PROVIDER_API_KEY"
    },
    "defaultModel": "custom-model",
    "models": [
      "custom-model"
    ],
    "enabled": false
  }
]/*#CONN_END*/ satisfies ProviderConnection[];
