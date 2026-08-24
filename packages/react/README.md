# @agentmatrix/agentcanvas-react

Controlled React 19 components for configuring and reviewing the Workspace-safe AgentCanvas Experience subset. `ExperienceStudio` is the product-sized three-pane authoring surface; `ExperienceConfigurator` remains the compact embedding option. The package also exports v2 `ProductInterfaceStudio`, `ProductInterfacePreview`, `ProductInterfaceContractAdapter`, and the focused option preview.

```tsx
import { ExperienceConfigurator } from "@agentmatrix/agentcanvas-react";
import "@agentmatrix/agentcanvas-react/styles.css";

<ExperienceConfigurator
  value={experience}
  onChange={setExperience}
  locale="en"
  capabilities={{
    provider: false,
    liveRun: false,
    gitMutation: false,
    debug: false,
  }}
/>;
```

For a Build or Studio route, use the high-fidelity surface instead:

```tsx
import { ExperienceStudio } from "@agentmatrix/agentcanvas-react";

<ExperienceStudio
  value={experience}
  onChange={setExperience}
  capabilities={{ provider: false, liveRun: false, gitMutation: false }}
/>;
```

The Studio adds group navigation, a dedicated option rail, completed/welcome/
approval fixtures, and desktop/tablet/mobile preview framing. Those controls
remain local presentation state; the host persists only the controlled
Experience value.

Experience v2 keeps the established standalone AgentCanvas product and Studio
visual language intact. `ProductInterfaceStudio` is a Canvas-native reference
surface for Brand, Welcome, and Canvas controls; it is not a Workspace shell or
a prescribed embedded product page. Entering it means the host flow has already
chosen AgentCanvas, so it does not repeat a custom-UI mode decision.

An embedding host owns its surrounding route, navigation, headings, draft
actions, authority controls, and responsive composition. It should compose its
own Brand and Welcome controls around the adapter rather than restyling the
standalone AgentCanvas application. A host that chooses a custom frontend skips
the Studio and may render `ProductInterfacePreview` as a handoff state:

```tsx
<ProductInterfaceContractAdapter
  value={experienceV2}
  onChange={setExperienceV2}
>
  {({ canvasValue, onCanvasChange }) => (
    <ExperienceStudio value={canvasValue} onChange={onCanvasChange} />
  )}
</ProductInterfaceContractAdapter>

<ProductInterfaceStudio
  value={experienceV2}
  onChange={setExperienceV2}
  resolveBrandAsset={(assetId) => hostAuthorizedBrandAsset(assetId)}
/>
```

The adapter allows Workspace to own the Brand, Welcome, basic, and advanced
control layout in the Workspace repository. The Canvas repository continues to
own the standalone AgentCanvas component structure, styling, and motion. v2
design tokens alter only documented local CSS variables and preserve current
defaults when omitted.

Host `semanticTokens` style the Studio shell only. Live preview colors and
typography come from the persisted Canvas theme plus explicit v2 design-token
overrides, so a Workspace-themed editor can accurately preview Graphite,
Oxide, Paper Trail, Terminal Green, or another Canvas theme without the two
surfaces visually bleeding into each other.

Brand assets are logical IDs resolved by the host. Stylesheet asset resolution
and custom CSS execution are intentionally absent; the host must validate and
load them in an isolated document.

The stylesheet import is explicit by design. The JavaScript entrypoint remains CSS-free so the package can be imported by Node ESM and server-side renderers.

The package performs no network requests and owns no authentication, persistence, routes, or application shell. Semantic token overrides are written only to the component root. Provider credentials, live transport, Git mutations, and debug chrome are unavailable unless an explicit safe capability enables the corresponding presentation-only control.
