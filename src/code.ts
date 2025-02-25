import {exportJSON} from "./parser/json-parser";
import {exportTypescript} from "./parser/typescript-parser";

figma.showUI(__html__, {width: 300, height: 480});

export type JSONOptions = {
  language: "json",
  structure: "flat" | "nested",
  colors: "rgba" | "hex"
}
export type TypescriptOptions = { language: "typescript" }
export type DartOptions = { language: "dart" }
export type CSSOptions = { language: "css" }
export type ExportOptions = JSONOptions | TypescriptOptions | DartOptions | CSSOptions

async function exportVariables(options: ExportOptions) {
  console.info("Export options selected:", options);
  if(options.language === "json") {
    const json = await exportJSON(options)
    figma.ui.postMessage({
      type: "export-file",
      filename: "figma-variables.json",
      fileType: "application/json",
      data: JSON.stringify(json, null, 2)
    });
  } else if (options.language === "typescript") {
    const typescript = await exportTypescript(options)
    figma.ui.postMessage({
      type: "export-file",
      filename: "style-variables.ts",
      fileType: "text/typescript",
      data: typescript
    });
  }
}

// Listen for UI messages
figma.ui.onmessage = (msg) => {
  if (msg.type === "export") {
    exportVariables(msg.options).catch(console.error);
  }
};
