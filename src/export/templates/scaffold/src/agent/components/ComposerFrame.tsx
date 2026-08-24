import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import agentuxConfig from "../../../agentux.config";
import { ContextChips } from "../context/ContextChips";
import { defaultProvider, enabledProviders } from "../providers/providerConfig";
import { ProviderSettings } from "../providers/ProviderSettings";
import { useCopy } from "../i18n";

export type ComposerFrameProps = {
  onSubmit?: (prompt: string) => void;
  running?: boolean;
};

export function ComposerFrame({ onSubmit, running = false }: ComposerFrameProps) {
  const copy = useCopy();
  const provider = defaultProvider();
  const providers = enabledProviders();
  const models = provider.models.length > 0 ? provider.models : [provider.defaultModel];
  const [prompt, setPrompt] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = prompt.trim();
    if (!value || running) {
      return;
    }
    onSubmit?.(value);
    setPrompt("");
  }

  return (
    <form data-agent-region="composer" onSubmit={submit}>
      <ContextChips />
      <textarea
        name="prompt"
        data-composer-input
        rows={2}
        placeholder={copy.composer.placeholder}
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
      />
      <div data-composer-tools>
        {agentuxConfig.providers.settingsLauncher ? <ProviderSettings /> : null}
        <label data-composer-field>
          <span>{copy.composer.provider}</span>
          <select name="provider" defaultValue={provider.id}>
            {providers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label data-composer-field>
          <span>{copy.composer.model}</span>
          <select name="model" defaultValue={provider.defaultModel}>
            {models.map((model) => <option key={model} value={model}>{model}</option>)}
          </select>
        </label>
        <button data-composer-send aria-label="Send prompt or stop generation" data-running={running} type="submit">
          <Send size={14} />
          Send / Stop
        </button>
      </div>
      <input name="defaultProvider" type="hidden" value={agentuxConfig.providers.defaultProviderId} />
    </form>
  );
}
