import { Textarea, Switch } from "./ui";
import type { AgentFrontendProject } from "../schema/agentuxConfig";

export function ProductWelcomeSettingsPanel({
  project,
  locale,
  onChange,
}: {
  project: AgentFrontendProject;
  locale: "en" | "zh";
  onChange: (product: AgentFrontendProject["product"]) => void;
}) {
  const product = project.product;
  const welcome = product.welcome;
  const copy = locale === "zh" ? zh : en;
  const updateWelcome = (patch: Partial<typeof welcome>) =>
    onChange({ ...product, welcome: { ...welcome, ...patch } });

  return (
    <div className="product-settings" data-preview-anchor="welcome">
      <section className="product-settings-section">
        <h3>{copy.copy}</h3>
        <label className="product-field">
          <span>{copy.headline}</span>
          <Textarea
            rows={2}
            value={welcome.headline}
            maxLength={160}
            onChange={(event) => updateWelcome({ headline: event.target.value })}
          />
        </label>
        <label className="product-field">
          <span>{copy.supporting}</span>
          <Textarea
            rows={4}
            value={welcome.supportingText}
            maxLength={512}
            onChange={(event) => updateWelcome({ supportingText: event.target.value })}
          />
        </label>
      </section>

      <section className="product-settings-section">
        <h3>{copy.suggestions}</h3>
        <Switch
          checked={welcome.showSuggestedPrompts}
          label={copy.showSuggestions}
          onCheckedChange={(showSuggestedPrompts) => updateWelcome({ showSuggestedPrompts })}
        />
        <label className="product-field">
          <span>{copy.prompts}</span>
          <Textarea
            rows={7}
            disabled={!welcome.showSuggestedPrompts}
            value={welcome.suggestedPrompts.join("\n")}
            aria-describedby="product-welcome-prompts-help"
            onChange={(event) =>
              updateWelcome({
                suggestedPrompts: event.target.value
                  .split("\n")
                  .map((prompt) => prompt.trim().slice(0, 280))
                  .filter(Boolean)
                  .slice(0, 6),
              })
            }
          />
          <small id="product-welcome-prompts-help">{copy.promptHelp}</small>
        </label>
      </section>
    </div>
  );
}

const en: Record<string, string> = {
  copy: "Welcome copy",
  headline: "Headline",
  supporting: "Supporting text",
  suggestions: "Suggested tasks",
  showSuggestions: "Show suggested prompts",
  prompts: "Prompts",
  promptHelp: "One prompt per line, up to 6. Selecting a prompt only fills the composer in exported products.",
};

const zh: Record<keyof typeof en, string> = {
  copy: "欢迎文案",
  headline: "标题",
  supporting: "辅助说明",
  suggestions: "建议任务",
  showSuggestions: "显示建议提示词",
  prompts: "提示词",
  promptHelp: "每行一个，最多 6 条。导出产品中选择建议只会填入输入框，不会自动发送。",
};
