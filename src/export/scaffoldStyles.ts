import agentMatrixCss from "../styles/agentmatrix.css?raw";
import appCss from "../styles/app.css?raw";
import badgeCss from "../components/ui/badge.css?raw";
import buttonCss from "../components/ui/button.css?raw";
import dialogCss from "../components/ui/dialog.css?raw";
import dropdownMenuCss from "../components/ui/dropdown-menu.css?raw";
import iconButtonCss from "../components/ui/icon-button.css?raw";
import inputCss from "../components/ui/input.css?raw";
import kbdCss from "../components/ui/kbd.css?raw";
import popoverCss from "../components/ui/popover.css?raw";
import selectCss from "../components/ui/select.css?raw";
import separatorCss from "../components/ui/separator.css?raw";
import skeletonCss from "../components/ui/skeleton.css?raw";
import sliderCss from "../components/ui/slider.css?raw";
import switchCss from "../components/ui/switch.css?raw";
import tabsCss from "../components/ui/tabs.css?raw";
import textareaCss from "../components/ui/textarea.css?raw";

/** CSS needs explicit raw imports because Vitest's CSS transform deliberately
 * replaces stylesheet glob results with empty modules. */
export const scaffoldStyleModules: Record<string, string> = {
  "../components/ui/badge.css": badgeCss,
  "../components/ui/button.css": buttonCss,
  "../components/ui/dialog.css": dialogCss,
  "../components/ui/dropdown-menu.css": dropdownMenuCss,
  "../components/ui/icon-button.css": iconButtonCss,
  "../components/ui/input.css": inputCss,
  "../components/ui/kbd.css": kbdCss,
  "../components/ui/popover.css": popoverCss,
  "../components/ui/select.css": selectCss,
  "../components/ui/separator.css": separatorCss,
  "../components/ui/skeleton.css": skeletonCss,
  "../components/ui/slider.css": sliderCss,
  "../components/ui/switch.css": switchCss,
  "../components/ui/tabs.css": tabsCss,
  "../components/ui/textarea.css": textareaCss,
  "../styles/agentmatrix.css": agentMatrixCss,
  "../styles/app.css": appCss,
};
