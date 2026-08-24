import * as RadixSlider from "@radix-ui/react-slider";
import "./slider.css";

export type SliderProps = RadixSlider.SliderProps & {
  /** Render the current value in a mono-font span beside the track. @default false */
  showValue?: boolean;
};

export function Slider({ showValue = false, className, ...props }: SliderProps) {
  const values = props.value ?? props.defaultValue ?? [props.min ?? 0];

  const slider = (
    <RadixSlider.Root
      className={["ui-slider", className].filter(Boolean).join(" ")}
      {...props}
    >
      <RadixSlider.Track className="ui-slider-track">
        <RadixSlider.Range className="ui-slider-range" />
      </RadixSlider.Track>
      {values.map((_, index) => (
        <RadixSlider.Thumb key={index} className="ui-slider-thumb" />
      ))}
    </RadixSlider.Root>
  );

  if (!showValue) {
    return slider;
  }

  return (
    <span className="ui-slider-field">
      {slider}
      <span className="ui-slider-value">{values.join(" – ")}</span>
    </span>
  );
}
