/**
 * Icon swapper. Lets the user pick a whole-set preset or override any single
 * state's icon from its 3-5 options. Demonstrates the "designer picks the
 * icon language" requirement directly in the product.
 */

import { useState } from "react";

import {
  ICON_OPTIONS,
  ICON_PRESETS,
  resolveIcon,
  useIconSet,
  type IconSlot,
} from "../../agentmatrix";

const SLOT_GROUPS: { title: string; slots: IconSlot[] }[] = [
  {
    title: "Session lifecycle",
    slots: [
      "session.running",
      "session.idle",
      "session.requires_action",
      "session.rescheduling",
      "session.terminated",
    ],
  },
  {
    title: "Tool lifecycle",
    slots: [
      "tool.pending_approval",
      "tool.in_progress",
      "tool.file_read",
      "tool.file_modified",
      "tool.file_edit",
      "tool.validate",
      "tool.search",
      "tool.completed",
      "tool.failed",
      "tool.cancelled",
    ],
  },
  {
    title: "Permission",
    slots: ["permission.allow", "permission.deny", "permission.cancel", "permission.pending"],
  },
  {
    title: "Runtime",
    slots: ["runtime.booting", "runtime.ready", "runtime.degraded", "runtime.error"],
  },
  {
    title: "Severity & incidents",
    slots: [
      "severity.info",
      "severity.warning",
      "severity.error",
      "incident.retrying",
      "incident.terminal",
    ],
  },
  {
    title: "Authors & content",
    slots: ["author.user", "author.agent", "content.thinking", "content.mcp", "content.terminal"],
  },
];

export function IconSwapper() {
  const { iconSet, setSlot, applyPreset, reset } = useIconSet();
  const [openGroup, setOpenGroup] = useState<string | null>(SLOT_GROUPS[0].title);

  return (
    <div className="am-iconswap">
      <div className="am-iconswap-presets">
        <span className="am-iconswap-label">Icon set</span>
        {ICON_PRESETS.map((preset) => (
          <button key={preset.id} type="button" onClick={() => applyPreset(preset.id)}>
            {preset.name}
          </button>
        ))}
        <button type="button" className="am-iconswap-reset" onClick={reset}>
          Reset
        </button>
      </div>

      {SLOT_GROUPS.map((group) => (
        <div className="am-iconswap-group" key={group.title}>
          <button
            type="button"
            className="am-iconswap-group-head"
            onClick={() => setOpenGroup((v) => (v === group.title ? null : group.title))}
            aria-expanded={openGroup === group.title}
          >
            {group.title}
          </button>
          {openGroup === group.title ? (
            <div className="am-iconswap-rows">
              {group.slots.map((slot) => (
                <SlotRow
                  key={slot}
                  slot={slot}
                  chosen={iconSet[slot]}
                  onChoose={(id) => setSlot(slot, id)}
                />
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/**
 * Contextual, per-module icon picker. Renders swap rows only for the given
 * slots — dropped inline into the preset group whose components use those
 * icons, so replacement lives next to the module it affects (not a global
 * panel).
 */
export function InlineIconPicker({ slots }: { slots: IconSlot[] }) {
  const { iconSet, setSlot } = useIconSet();
  return (
    <div className="am-iconswap-rows">
      {slots.map((slot) => (
        <SlotRow key={slot} slot={slot} chosen={iconSet[slot]} onChoose={(id) => setSlot(slot, id)} />
      ))}
    </div>
  );
}

function SlotRow({
  slot,
  chosen,
  onChoose,
}: {
  slot: IconSlot;
  chosen?: string;
  onChoose: (id: string) => void;
}) {
  const options = ICON_OPTIONS[slot];
  return (
    <div className="am-iconswap-row">
      <span className="am-iconswap-slot">{slot.split(".")[1]?.replace(/_/g, " ")}</span>
      <div className="am-iconswap-options">
        {options.map((option) => {
          const Icon = option.Icon;
          const active = (chosen ?? options[0].id) === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className="am-iconswap-option"
              data-active={active}
              title={option.label}
              onClick={() => onChoose(option.id)}
            >
              <Icon size={15} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Referenced for type-completeness of resolveIcon in downstream tooling.
export { resolveIcon };
