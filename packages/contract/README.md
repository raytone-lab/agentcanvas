# @agentmatrix/agentcanvas-contract

Framework-independent, versioned contract for the Workspace-safe AgentCanvas Experience configuration.

The package contains no React, DOM, browser globals, network client, credentials, Provider endpoints, or Workspace persistence. Decode untrusted persisted values before use:

```ts
import {
  decodeSupportedAgentCanvasExperience,
  encodeSupportedAgentCanvasExperience,
} from "@agentmatrix/agentcanvas-contract";

const experience = decodeSupportedAgentCanvasExperience(input);
const canonicalJSON = encodeSupportedAgentCanvasExperience(experience);
```

This release supports the frozen `agentcanvas-experience-v1` contract and the
product-level `agentcanvas-experience-v2` contract. v2 adds the standard or
custom surface mode, persisted Brand and Welcome configuration, the complete
v1 Canvas recipe, bounded design tokens, and logical asset references.

The schemas are exported at
`@agentmatrix/agentcanvas-contract/schema/agentcanvas-experience-v1.json` and
`@agentmatrix/agentcanvas-contract/schema/agentcanvas-experience-v2.json`.
Unknown versions, fields, and registry identifiers fail closed.

Use `migrateAgentCanvasExperience(value, AGENTCANVAS_EXPERIENCE_V2)` for an
explicit, non-mutating in-memory v1-to-v2 migration. The reverse migration is
not supported. v2 preset helpers apply the authoritative Canvas rules to its
nested `canvas` value so hosts do not need to duplicate them.

Stylesheet entries are logical references only. This package never resolves
asset IDs, downloads or injects CSS, accepts arbitrary URLs, or claims that
referenced CSS is safe. The host owns authorization, content validation, CSP,
cascade-layer mapping, and isolated loading.

The six approved visual presets are exported as `themeTokens`. Standalone Canvas and embeddable previews consume this same map, so their values cannot drift independently.
