import { Slider } from "../ui/slider";
import { useLocale } from "../../i18n/LocaleContext";
import type { AgentFrontendProject } from "../../schema/agentuxConfig";

type WritingParams = AgentFrontendProject["theme"]["motion"]["writingParams"];
type ParamKey = keyof WritingParams;

type ParamSpec = { key: ParamKey; min: number; max: number; step: number; unit: string; label: { en: string; zh: string } };

const WRITING_PARAM_SPECS: Record<string, ParamSpec[]> = {
  "writing-smooth": [
    { key: "streamWps", min: 10, max: 120, step: 1, unit: "wps", label: { en: "Stream speed", zh: "流速" } },
  ],
  "writing-typewriter": [
    { key: "typeCps", min: 5, max: 60, step: 1, unit: "cps", label: { en: "Typing speed", zh: "打字速度" } },
  ],
  "writing-chunked": [
    { key: "chunkSize", min: 2, max: 12, step: 1, unit: "w", label: { en: "Chunk size", zh: "块大小" } },
    { key: "chunkIntervalMs", min: 80, max: 600, step: 10, unit: "ms", label: { en: "Chunk interval", zh: "块间隔" } },
  ],
};

export function hasWritingParams(optionId: string): boolean {
  return optionId in WRITING_PARAM_SPECS;
}

export function WritingParamControls({
  optionId,
  params,
  onChange,
}: {
  optionId: string;
  params: WritingParams;
  onChange: (key: ParamKey, value: number) => void;
}) {
  const { locale } = useLocale();
  const specs = WRITING_PARAM_SPECS[optionId];
  if (!specs) {
    return null;
  }

  return (
    <div className="writing-params" data-preview-anchor="writing-params">
      {specs.map((spec) => (
        <label className="writing-param" key={spec.key}>
          <span className="writing-param-label">{spec.label[locale]}</span>
          <Slider
            min={spec.min}
            max={spec.max}
            step={spec.step}
            value={[params[spec.key]]}
            onValueChange={([value]) => onChange(spec.key, value)}
            aria-label={spec.label[locale]}
          />
          <span className="writing-param-value">{params[spec.key]}{spec.unit}</span>
        </label>
      ))}
    </div>
  );
}
