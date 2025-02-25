import {padLeft} from "../util/string-util";
import {JSONOptions} from "../code";

type DataValue = {
  id: string,
  name: string,
  value: string | RGBA | boolean | number,
  type: VariableResolvedDataType,
  aliasForId?: string
}

export type ExportJsonFlat = {
  values: DataValue[]
}

export type ExportJsonNested = {
  [key: string]: ExportJsonNested | DataValue
}

export type ExportJson = ExportJsonNested | ExportJsonFlat

// Convert RGBA to HEX (Figma stores colors as RGBA 0-1 values)
const rgbaToHex = (rgba: { a: number, r: number, g: number, b: number }): string => {
  const {a, r, g, b} = rgba;
  const rHex = padLeft(Math.round(r * 255).toString(16).toUpperCase(), 2, "0")
  const gHex = padLeft(Math.round(g * 255).toString(16).toUpperCase(), 2, "0")
  const bHex = padLeft(Math.round(b * 255).toString(16).toUpperCase(), 2, "0")
  const aHex = padLeft(Math.round(a * 255).toString(16).toUpperCase(), 2, "0")
  return `#${rHex}${gHex}${bHex}${aHex}`;
}

const resolveAlias = async (id: string): Promise<VariableValue> => {
  const maxDepth = 100;
  let currentId = id
  for (let i = 0; i < maxDepth; i++) {
    const value = await figma.variables.getVariableByIdAsync(currentId)
    if (!value) {
      throw new Error(`Variable ${id} not found`)
    }
    const collection = await figma.variables.getVariableCollectionByIdAsync(value.variableCollectionId)
    if (!collection) {
      throw new Error(`Collection ${id} not found`)
    }
    if (collection.modes.length > 1) {
      console.warn(`Collection for a referenced variable has more than one mode. This might lead to wrong values for references.`)
    }
    const modeValue = value.valuesByMode[collection.modes[0].modeId]
    // Check if its another reference
    if (typeof modeValue === "object" && "id" in modeValue) {
      currentId = modeValue.id
    } else {
      return modeValue
    }
  }
  throw new Error("Maximum Alias Depth reached and did not find a value")
}

const putIntoJSONFlat = (json: ExportJsonFlat, data: DataValue) => {
  if (!json["values"]) {
    json["values"] = [];
  }
  json["values"].push(data);
}
const putIntoJSONNested = (json: ExportJsonNested, data: DataValue, collectionName: string, modeName: string, fullPath: string[]) => {
  const nameElements = [collectionName, modeName, ...fullPath].slice(0, -1)
  let currentFolder: ExportJsonNested = json
  for (const name of nameElements) {
    if (!currentFolder[name]) {
      currentFolder[name] = {};
    }
    currentFolder = currentFolder[name] as ExportJsonNested;
  }
  currentFolder[data.name] = data;
}

export const exportJSON = async (options: JSONOptions): Promise<ExportJson> => {
  if (!figma.variables) {
    figma.notify("Variables API is not supported.");
    throw new Error("Variables API is not supported.");
  }

  const collections = await figma.variables.getLocalVariableCollectionsAsync();

  const jsonFlat: ExportJsonFlat = {values: []};
  const jsonNested: ExportJsonNested = {};

  for (const collection of collections) {
    const modes = collection.modes
    for (const mode of modes) {
      for (const id of collection.variableIds) {
        const variable = await figma.variables.getVariableByIdAsync(id)
        if (!variable) {
          continue;
        }
        const splitName = variable.name.split("/");
        const varName = splitName[splitName.length - 1];

        const modeValue = variable.valuesByMode[mode.modeId]
        const aliasForId = typeof modeValue === "object" && "id" in modeValue ? modeValue.id : undefined
        const aliasValue = aliasForId ? await resolveAlias(aliasForId) : undefined
        let value = aliasValue ?? modeValue;

        // Determine type and export format
        if (variable.resolvedType === "COLOR") {
          // TODO ensure RGBA and not RGB
          if (options.colors === "hex") {
            value = rgbaToHex(value as RGBA)
          } else {
            value = value as RGBA
          }
        }

        const exportValue: DataValue = {
          id: variable.id,
          name: varName,
          value: value as VariableResolvedDataType,
          aliasForId: aliasForId,
          type: variable.resolvedType
        }

        // Add to export json
        if (options.structure === "flat") {
          putIntoJSONFlat(jsonFlat, exportValue)
        } else {
          putIntoJSONNested(jsonNested, exportValue, collection.name, mode.name, splitName)
        }
      }
    }
  }
  const json = options.structure === "flat" ? jsonFlat : jsonNested;
  console.info("JSON-parser result", json)
  return json;
}
