/// <reference types="vite/client" />

declare module "*.jsonl?raw" {
  const content: string;
  export default content;
}
