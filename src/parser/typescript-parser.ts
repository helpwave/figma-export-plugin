import {TypescriptOptions} from "../code";
import {exportJSON, ExportJsonFlat} from "./json-parser";

export const exportTypescript = async (_: TypescriptOptions) => {
  const flatJson = await exportJSON({language: "json", structure: "flat", colors: "hex"}) as ExportJsonFlat
  const pad = (value: string) => {
    if(value) {
      return `\n  ${value}\n`
    }
    return value
  }

  const colors = flatJson.values.filter(value => value.type === "COLOR")
    .map(data => `{ name: "${data.name}", value: "${data.value.toString()}" }`).join(",\n  ")
  const numbers = flatJson.values.filter(value => value.type === "FLOAT")
    .map(data => `{ name: "${data.name}", value: ${data.value.toString()} }`).join(",\n  ");
  const booleans = flatJson.values.filter(value => value.type === "BOOLEAN")
    .map(data => `{ name: "${data.name}", value: ${data.value ? "true" : "false"} }`).join(",\n  ");
  const strings = flatJson.values.filter(value => value.type === "STRING")
    .map(data => `{ name: "${data.name}", value: "${data.value.toString()}" }`).join(",\n  ");

  const template = `const colors: { name: string, value: string }[] = [%c]

const numbers: { name: string, value: number }[] = [%n]

const booleans: { name: string, value: boolean }[] = [%b]

const strings: { name: string, value: string }[] = [%s]

export const StylingVariables = { colors, numbers, booleans, strings }
`;

  const result = template
    .replace("%c", pad(colors))
    .replace("%n", pad(numbers))
    .replace("%b", pad(booleans))
    .replace("%s", pad(strings))
  console.info("Typescript-parser result", result);
  return result
}
