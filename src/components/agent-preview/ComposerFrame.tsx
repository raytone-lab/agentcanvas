import { Brain, Bug, ChevronRight, FileText, Gauge, Image as ImageIcon, MessageSquareText, Mic, Paperclip, Plus, Rocket, Search, Send, ShieldCheck, ShieldHalf, ShieldOff, Sparkles, Square, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import {
  defaultProviderConnection,
  enabledProviderConnections,
  type AgentFrontendProject,
  type ProviderConnectionId,
} from "../../schema/agentuxConfig";

import { StateIcon } from "../../agentmatrix";
import { useCopy } from "../../i18n/LocaleContext";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, IconButton, SelectMenu, Textarea } from "../ui";

/**
 * Approval modes, least to most permissive.
 *
 * Three, not two. A binary "ask every time / never ask" forces a choice nobody wants to make:
 * confirm every file read, or hand over the machine. The middle mode is the one people
 * actually run — auto-approve the routine, stop on anything flagged risky — and it is what
 * every shipping agent client offers.
 *
 * `tone: "danger"` is on the unguarded mode only. It is the one choice with consequences the
 * user cannot take back, so it reads differently instead of sitting in the list as a peer.
 */
type PermissionMode = "request" | "auto" | "allow-all";

const PERMISSION_MODES: ReadonlyArray<{
  id: PermissionMode;
  Icon: typeof ShieldCheck;
  tone?: "danger";
}> = [
  { id: "request", Icon: ShieldCheck },
  { id: "auto", Icon: ShieldHalf },
  { id: "allow-all", Icon: ShieldOff, tone: "danger" },
];

/** Copy keys per mode, so the trigger and the menu rows can never drift apart. */
const permissionLabelKey = (mode: PermissionMode) =>
  mode === "request"
    ? "toolPermissionRequest" as const
    : mode === "auto"
      ? "toolPermissionAuto" as const
      : "toolPermissionAllowAll" as const;

const permissionHintKey = (mode: PermissionMode) =>
  mode === "request"
    ? "toolPermissionRequestHint" as const
    : mode === "auto"
      ? "toolPermissionAutoHint" as const
      : "toolPermissionAllowAllHint" as const;

export type ComposerSubmitAttachment = {
  name: string;
  isImage: boolean;
  imageSrc?: string;
};

export type ComposerSubmitContext = {
  attachments: readonly ComposerSubmitAttachment[];
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  abort: () => void;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export function ComposerFrame({
  project,
  modelOptions,
  onSubmit,
  onProviderChange,
  onModelChange,
  isRunning = false,
  onStop,
  providerSettingsControl,
  welcomeGreeting,
  isWelcome = false,
}: {
  project: AgentFrontendProject;
  modelOptions: readonly string[];
  onSubmit: (prompt: string, context?: ComposerSubmitContext) => void;
  onProviderChange: (providerId: ProviderConnectionId) => void;
  onModelChange: (model: string) => void;
  isRunning?: boolean;
  onStop?: () => void;
  providerSettingsControl?: ReactNode;
  welcomeGreeting?: string;
  isWelcome?: boolean;
}) {
  const copy = useCopy();
  const promptShortcuts = [
    { label: copy.composer.frame.shortcuts.inspectFiles, Icon: Search },
    { label: copy.composer.frame.shortcuts.fixTest, Icon: Bug },
    { label: copy.composer.frame.shortcuts.explainChange, Icon: MessageSquareText },
  ] as const;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<{ id: string; name: string; isImage: boolean; imageSrc?: string }[]>([]);
  const [permissionMode, setPermissionMode] = useState<PermissionMode>("request");
  const [budgetMode, setBudgetMode] = useState<"fast" | "medium" | "expert">("medium");
  const [isListening, setIsListening] = useState(false);
  const canSubmit = promptValue.trim().length > 0 || attachedFiles.length > 0;
  const isMinimalStyle = project.theme.stylePreset === "illustrated";
  const showCombinedModelBudget = isMinimalStyle && Boolean(project.composer.thinkingBudget || project.composer.modelSwitcher);
  const hasToolsAfterUpload = Boolean(project.composer.thinkingBudget || project.composer.modelSwitcher);
  const enabledProviders = enabledProviderConnections(project);
  const defaultProvider = defaultProviderConnection(project);
  const modelValues = modelOptions.includes(defaultProvider.defaultModel)
    ? modelOptions
    : [defaultProvider.defaultModel, ...modelOptions];
  const providerModelValue = `${defaultProvider.id}::${defaultProvider.defaultModel}`;
  const providerModelOptions = enabledProviders.flatMap((provider) => {
    const providerModels = provider.id === defaultProvider.id
      ? modelValues
      : (provider.models.length > 0 ? provider.models : [provider.defaultModel]);
    return providerModels.map((model) => ({
      value: `${provider.id}::${model}`,
      label: model,
    }));
  });
  const budgetOptions = [
    {
      value: "fast",
      label: copy.composer.frame.thinkingBudgetFast,
      hint: copy.composer.frame.thinkingBudgetFastHint,
      Icon: Rocket,
    },
    {
      value: "medium",
      label: copy.composer.frame.thinkingBudgetMedium,
      hint: copy.composer.frame.thinkingBudgetMediumHint,
      Icon: Gauge,
    },
    {
      value: "expert",
      label: copy.composer.frame.thinkingBudgetExpert,
      hint: copy.composer.frame.thinkingBudgetExpertHint,
      Icon: Brain,
    },
  ] as const;
  const selectedBudget = budgetOptions.find((option) => option.value === budgetMode) ?? budgetOptions[1];
  const SelectedBudgetIcon = selectedBudget.Icon;
  const PermissionModeIcon = PERMISSION_MODES.find((mode) => mode.id === permissionMode)?.Icon ?? ShieldCheck;
  const combinedModelBudgetLabel = [
    project.composer.modelSwitcher ? defaultProvider.defaultModel : undefined,
    project.composer.thinkingBudget ? selectedBudget.label : undefined,
  ].filter(Boolean).join(" ");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isRunning) {
      onStop?.();
      return;
    }
    const attachments = attachedFiles.map(({ name, isImage, imageSrc }) => ({ name, isImage, imageSrc }));
    const prompt = promptValue.trim() || attachments.map((file) => file.name).join(", ");
    if (prompt) {
      setAttachedFiles([]);
      setPromptValue("");
      onSubmit(prompt, { attachments });
    }
  }

  function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.nativeEvent.isComposing ||
      isRunning ||
      !canSubmit
    ) {
      return;
    }
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  function fillShortcut(prompt: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    setPromptValue(prompt);
    textarea.focus();
  }

  function selectProviderModel(value: string) {
    const [providerId, model] = value.split("::");
    if (!providerId || !model) {
      return;
    }
    if (providerId !== defaultProvider.id) {
      onProviderChange(providerId as ProviderConnectionId);
    }
    if (model !== defaultProvider.defaultModel) {
      onModelChange(model);
    }
  }

  function toggleVoiceInput() {
    if (isListening) {
      speechRecognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const speechWindow = window as SpeechRecognitionWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      textareaRef.current?.focus();
      return;
    }

    const recognition = new Recognition();
    speechRecognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "zh-CN";
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result?.isFinal) {
          finalTranscript += result[0]?.transcript ?? "";
        }
      }
      const text = finalTranscript.trim();
      if (!text) {
        return;
      }
      setPromptValue((current) => `${current}${current.trim().length > 0 ? " " : ""}${text}`);
      textareaRef.current?.focus();
    };

    try {
      recognition.start();
    } catch {
      setIsListening(false);
    }
  }

  useEffect(() => () => {
    speechRecognitionRef.current?.abort();
  }, []);

  return (
    <form
      className="composer-frame"
      data-preview-anchor="composer"
      data-welcome={isWelcome ? "true" : undefined}
      data-has-tools-after-upload={hasToolsAfterUpload ? "true" : "false"}
      onSubmit={submit}
    >
      {isWelcome && welcomeGreeting ? (
        <div className="composer-greeting">
          <span className="composer-greeting-avatar" aria-hidden="true">
            <StateIcon slot="author.agent" size={40} />
          </span>
          <h2 className="composer-greeting-text">{welcomeGreeting}</h2>
        </div>
      ) : null}
      {project.composer.promptShortcuts ? (
        <div className="prompt-shortcuts" aria-label={copy.composer.frame.promptShortcutsLabel}>
          {promptShortcuts.map(({ label, Icon }) => (
            <Button key={label} variant="ghost" type="button" onClick={() => fillShortcut(label)}>
              <Icon size={13} />
              {label}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="composer-shell">
        <div className="composer-prompt-row">
          {attachedFiles.length > 0 ? (
            <div className="prompt-context" data-preview-anchor="prompt-context" aria-label={copy.composer.frame.promptContextLabel}>
              <div className="context-chips">
                {attachedFiles.map((file) => (
                  <span className="context-chip" key={file.id}>
                    {file.isImage ? <ImageIcon size={13} /> : <FileText size={13} />}
                    <span>{file.name}</span>
                    <button
                      className="context-chip-remove"
                      type="button"
                      aria-label={`${file.name} ✕`}
                      onClick={() => setAttachedFiles((current) => current.filter((f) => f.id !== file.id))}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <Textarea
            ref={textareaRef}
            autoGrow
            name="prompt"
            placeholder={copy.composer.frame.placeholder}
            rows={2}
            value={promptValue}
            onChange={(event) => setPromptValue(event.currentTarget.value)}
            onKeyDown={submitOnEnter}
          />
        </div>
        <div className="composer-actions">
          <div className="composer-tools">
          {project.composer.fileUpload ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={async (event) => {
                  // Real upload interaction: add the picked files/images to the
                  // composer as attachment chips (by their real names).
                  const input = event.currentTarget;
                  const picked = Array.from(input.files ?? []);
                  if (picked.length > 0) {
                    const timestamp = Date.now();
                    const nextFiles = await Promise.all(picked.map(async (file, index) => ({
                      id: `${file.name}-${timestamp}-${index}`,
                      name: file.name,
                      isImage: file.type.startsWith("image/"),
                      imageSrc: await imagePreviewSource(file),
                    })));
                    setAttachedFiles((current) => [
                      ...current,
                      ...nextFiles,
                    ]);
                  }
                  input.value = "";
                }}
              />
              <IconButton
                className="icon-button composer-upload"
                label={copy.composer.frame.attachFiles}
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="composer-upload-icon composer-upload-icon-clip" aria-hidden="true">
                  <Paperclip size={16} />
                </span>
                <span className="composer-upload-icon composer-upload-icon-plus" aria-hidden="true">
                  <Plus size={20} />
                </span>
              </IconButton>
            </>
          ) : null}
          {project.composer.toolToggle ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="permission-mode-trigger"
                  type="button"
                  aria-label={copy.composer.frame.tools}
                >
                  <PermissionModeIcon size={15} />
                  <span>{copy.composer.frame[permissionLabelKey(permissionMode)]}</span>
                  {isMinimalStyle ? null : <ChevronRight className="composer-menu-chevron" size={14} aria-hidden="true" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className={["permission-mode-menu", isMinimalStyle ? "minimal-composer-menu" : undefined]
                  .filter(Boolean)
                  .join(" ")}
                align="start"
                sideOffset={10}
              >
                {PERMISSION_MODES.map(({ id, Icon, tone }) => (
                  <DropdownMenuItem
                    key={id}
                    className="permission-mode-item"
                    data-tone={tone}
                    onSelect={() => setPermissionMode(id)}
                  >
                    <Icon size={18} />
                    <span className="permission-mode-copy">
                      <strong>{copy.composer.frame[permissionLabelKey(id)]}</strong>
                      <span>{copy.composer.frame[permissionHintKey(id)]}</span>
                    </span>
                    {permissionMode === id ? <span className="permission-mode-check" aria-hidden="true">✓</span> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          {project.composer.thinkingBudget && !showCombinedModelBudget ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="budget-mode-trigger"
                  type="button"
                  aria-label={copy.composer.frame.thinkingBudget}
                >
                  <SelectedBudgetIcon size={15} />
                  <span>{selectedBudget.label}</span>
                  <ChevronRight className="composer-menu-chevron" size={14} aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="budget-mode-menu" align="start" sideOffset={10}>
                {budgetOptions.map(({ value, label, hint, Icon }) => (
                  <DropdownMenuItem
                    key={value}
                    className="budget-mode-item"
                    onSelect={() => setBudgetMode(value)}
                  >
                    <Icon size={18} />
                    <span className="budget-mode-copy">
                      <strong>{label}</strong>
                      <span>{hint}</span>
                    </span>
                    {budgetMode === value ? <span className="budget-mode-check" aria-hidden="true">✓</span> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          {project.composer.modelSwitcher && !showCombinedModelBudget ? (
            <SelectMenu
              size="sm"
              align="end"
              ariaLabel={`${copy.composer.frame.provider} / ${copy.composer.frame.model}`}
              className="provider-model-picker provider-model-menu"
              value={providerModelValue}
              onValueChange={selectProviderModel}
              options={providerModelOptions}
              triggerContent={(
                <>
                  <Sparkles className="provider-model-icon" size={15} aria-hidden="true" />
                  <span className="provider-model-summary">
                    <em>{defaultProvider.defaultModel}</em>
                  </span>
                  <ChevronRight className="composer-menu-chevron" size={14} aria-hidden="true" />
                </>
              )}
            />
          ) : null}
          {providerSettingsControl}
          </div>
          <div className="composer-submit-controls">
            {showCombinedModelBudget ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="combined-model-budget-trigger"
                    type="button"
                    aria-label={combinedModelBudgetLabel}
                  >
                    {project.composer.modelSwitcher ? (
                      <span className="combined-model-budget-model">{defaultProvider.defaultModel}</span>
                    ) : null}
                    {project.composer.thinkingBudget ? (
                      <span className="combined-model-budget-budget">{selectedBudget.label}</span>
                    ) : null}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="combined-model-budget-menu combined-model-budget-root-menu" align="end" sideOffset={10}>
                  {project.composer.modelSwitcher ? (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="combined-model-budget-summary-item">
                        <span className="combined-model-budget-row-label">{copy.composer.frame.model}</span>
                        <span className="combined-model-budget-row-value">{defaultProvider.defaultModel}</span>
                        <ChevronRight className="composer-menu-chevron" size={14} aria-hidden="true" />
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="combined-model-budget-menu combined-model-budget-submenu" sideOffset={8}>
                        <DropdownMenuLabel className="combined-model-budget-label">{copy.composer.frame.model}</DropdownMenuLabel>
                        {providerModelOptions.map(({ value, label }) => (
                          <DropdownMenuItem
                            key={value}
                            className="combined-model-budget-item"
                            onSelect={() => selectProviderModel(value)}
                          >
                            <span className="combined-model-budget-copy">
                              <strong>{label}</strong>
                            </span>
                            {providerModelValue === value ? <span className="combined-model-budget-check" aria-hidden="true">✓</span> : null}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  ) : null}
                  {project.composer.thinkingBudget ? (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="combined-model-budget-summary-item">
                        <span className="combined-model-budget-row-label">{copy.composer.frame.reasoningStrength}</span>
                        <span className="combined-model-budget-row-value">{selectedBudget.label}</span>
                        <ChevronRight className="composer-menu-chevron" size={14} aria-hidden="true" />
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="combined-model-budget-menu combined-model-budget-submenu" sideOffset={8}>
                        <DropdownMenuLabel className="combined-model-budget-label">{copy.composer.frame.reasoningStrength}</DropdownMenuLabel>
                        {budgetOptions.map(({ value, label, hint }) => (
                          <DropdownMenuItem
                            key={value}
                            className="combined-model-budget-item"
                            onSelect={() => setBudgetMode(value)}
                          >
                            <span className="combined-model-budget-copy">
                              <strong>{label}</strong>
                              <span>{hint}</span>
                            </span>
                            {budgetMode === value ? <span className="combined-model-budget-check" aria-hidden="true">✓</span> : null}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            {project.composer.mic ? (
              <IconButton
                className="icon-button composer-voice"
                data-listening={isListening ? "true" : undefined}
                label={copy.composer.frame.voiceInput}
                type="button"
                onClick={toggleVoiceInput}
              >
                <span className="composer-voice-idle" aria-hidden="true">
                  <Mic size={16} />
                </span>
                <span className="composer-voice-wave" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </IconButton>
            ) : null}
            <Button
              className="send-button"
              variant={isRunning ? "danger" : "primary"}
              disabled={!isRunning && !canSubmit}
              type={isRunning ? "button" : "submit"}
              onClick={isRunning ? onStop : undefined}
            >
              {isRunning ? <Square size={15} /> : <Send size={16} />}
              {isRunning ? copy.composer.frame.stop : copy.composer.frame.send}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function imagePreviewSource(file: File): Promise<string | undefined> {
  if (!file.type.startsWith("image/") || typeof FileReader === "undefined") {
    return Promise.resolve(undefined);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}
