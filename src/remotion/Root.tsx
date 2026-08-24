import { Composition, Folder } from "remotion";

import { AgentCanvasProductIntro, productIntroMeta } from "./ProductIntro";

export function RemotionRoot() {
  return (
    <Folder name="AgentCanvas">
      <Composition
        id={productIntroMeta.id}
        component={AgentCanvasProductIntro}
        durationInFrames={productIntroMeta.durationInFrames}
        fps={productIntroMeta.fps}
        width={productIntroMeta.width}
        height={productIntroMeta.height}
      />
    </Folder>
  );
}
