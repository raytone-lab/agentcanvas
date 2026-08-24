import {
  createDefaultAgentCanvasExperienceV2,
  type AgentCanvasExperienceV2,
} from "@agentmatrix/agentcanvas-contract";
import { ProductInterfaceStudio } from "@agentmatrix/agentcanvas-react";
import "@agentmatrix/agentcanvas-react/styles.css";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

function ProductInterfaceExample() {
  const [value, setValue] = useState<AgentCanvasExperienceV2>(() =>
    createDefaultAgentCanvasExperienceV2({
      displayName: "Signal Desk",
      welcomeHeadline: "How can Signal Desk help?",
      welcomeSupportingText: "Ask about tickets, exports, or billing.",
    }),
  );

  return (
    <ProductInterfaceStudio
      value={value}
      onChange={setValue}
      capabilities={{
        provider: false,
        liveRun: false,
        git: false,
        debug: false,
      }}
      previewFixture={{
        sessions: [
          "Support issues dashboard",
          "Billing queue review",
          "Weekly support pulse",
        ],
        messages: [
          {
            id: "task",
            role: "user",
            text: "Turn this ticket export into a weekly operations dashboard.",
          },
          {
            id: "result",
            role: "agent",
            text: "I grouped 428 tickets, compared queue volume, and prepared the support pulse.",
          },
        ],
        toolCall: {
          name: "Analyze ticket export",
          summary: "428 rows · 6 themes",
          status: "succeeded",
        },
        artifact: {
          name: "Weekly support pulse",
          kind: "data",
          content: "428 tickets\n18m median wait\n6 recurring themes",
        },
        suggestedPrompts: ["Compare with last week", "Draft owner actions"],
      }}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ProductInterfaceExample />
  </StrictMode>,
);
