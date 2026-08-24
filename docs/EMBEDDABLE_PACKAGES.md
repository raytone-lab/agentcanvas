# AgentCanvas embeddable package contract

AgentCanvas publishes two supported integration boundaries for the authenticated AgentMatrix Workspace. The standalone `App` is not a package API.

## Supported entrypoints

| Package                             | Supported entrypoint                      | Responsibility                                                                                |
| ----------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| `@agentmatrix/agentcanvas-contract` | `.`                                       | Experience v1/v2 types, defaults, strict codecs, migration, preset registry, and pure helpers |
| `@agentmatrix/agentcanvas-contract` | `./schema/agentcanvas-experience-v1.json` | Platform-compatible persisted JSON schema                                                     |
| `@agentmatrix/agentcanvas-contract` | `./schema/agentcanvas-experience-v2.json` | Product-interface v2 persisted JSON schema                                                    |
| `@agentmatrix/agentcanvas-react`    | `.`                                       | Controlled React 19 configurator, preview, and capability-approved option preview             |
| `@agentmatrix/agentcanvas-react`    | `./styles.css`                            | Component-scoped styles                                                                       |

Workspace must install exact versions, for example:

```json
{
  "dependencies": {
    "@agentmatrix/agentcanvas-contract": "0.2.0",
    "@agentmatrix/agentcanvas-react": "0.2.0"
  }
}
```

Do not import from this repository's `src/`, sibling checkouts, unpublished monorepo paths, or package internals.

## Ownership boundary

Workspace owns authentication, tenant and Namespace context, selected API-key identifier, routing, persistence, App Template revisions, loading/error behavior, and application-shell theme. Canvas components receive decoded Experience values and report edits through `onChange`.

The packages do not receive or request raw AgentMatrix keys, UserJWTs, Provider/model credentials, browser session keys, private origins, arbitrary downstream URLs, or Git mutation authority. They do not perform network requests. Capability flags affect presentation only and are not an authorization boundary.

Provider connections, live transport, builder selection state, standalone export state, and Git commit/push actions remain private to the standalone Canvas application.

## Contract window and migration

The package supports frozen `agentcanvas-experience-v1` and
`agentcanvas-experience-v2`. Decode persisted values with
`decodeSupportedAgentCanvasExperience`; unknown versions, fields, or registry
identifiers fail closed. Migration is deterministic and only moves v1 to v2;
historical v1 records are not rewritten until the host explicitly creates a
new revision.

The v1 and v2 JSON schemas must remain structurally identical to Platform's
frozen schemas under `internal/services/workspaceapi/schema/`. Platform v2
persistence is a separately deployed companion rollout; Canvas support alone
does not prove that an environment accepts v2 writes. Run:

```bash
AGENTMATRIX_PLATFORM_REPO=/path/to/agentmatrix-platform npm run packages:verify
```

## Theme integration

The React package writes semantic token overrides only on `.agentcanvas-embed`. It does not reset `html`, `body`, or `:root`, and it does not use portals. The preview consumes the same six `themeTokens` presets as standalone Canvas; host values supplied through `semanticTokens` override that preset locally. The package uses container queries for narrow host surfaces and includes focus-visible, reduced-motion, and forced-colors behavior.

Import `@agentmatrix/agentcanvas-react/styles.css` explicitly in the host client entry. The JavaScript package entry has no stylesheet side effect and is safe to import from Node ESM/SSR.

v2 preserves the existing Canvas component structure, visual defaults, and
motion. Brand and Welcome are product configuration. Colors, typography,
base-size, heading, spacing, border, radius, and color mode are bounded opt-in
overrides. Stable styling hooks are limited to documented
`data-agentcanvas-*` attributes.

The standalone AgentCanvas application remains Canvas-owned and retains its
existing product shell, configuration rails, themes, component styling, and
motion. An embedding product owns its own outer route and authoring chrome in
that product's repository. `ProductInterfaceContractAdapter` and
`ProductInterfacePreview` are the supported composition boundary; an embedding
host must not require Canvas to carry host-specific navigation, persistence, or
visual shell decisions.

Custom stylesheet entries contain only a logical asset ID and cascade layer.
Canvas does not resolve or execute them. The host must authorize the binding,
validate media/content policy, reject remote or executable material, map the
layer, and load CSS inside an isolated application or preview document. User
CSS must never be applied to the Workspace shell.

## Export status

The existing standalone scaffold generator is not a supported Workspace export package in `0.2.x`. Its current output can include standalone Provider and harness assumptions. A pure export entrypoint will be released only after the AgentMatrix Session adapter and server-side credential boundary are implemented and clean-consumer tested. Until then, Workspace must not describe exported output as a connected AgentMatrix application.

## Release, upgrade, and rollback

1. Run `npm ci`, `npm run packages:verify`, `npm test`, and `npm run build` from the repository root.
2. Inspect the deterministic tarballs produced in `out/packages/` and publish both packages with the same exact version.
3. Workspace upgrades both exact versions in one PR and verifies lazy route chunks, base paths, host light/dark themes, accessibility, and rollback.
4. Roll back by restoring both prior exact package versions and the prior persisted-contract support window. Never roll back code below the oldest contract version already accepted for persistence.

AgentCanvas maintainers own package publication. Workspace maintainers own consumer integration. Platform maintainers own the persisted App Template schema.
