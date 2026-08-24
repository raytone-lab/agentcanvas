import { Config } from "@remotion/cli/config";

Config.setEntryPoint("src/remotion/index.ts");
Config.setOverwriteOutput(true);
Config.setCodec("h264");
Config.setPixelFormat("yuv420p");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
Config.setConcurrency("50%");
