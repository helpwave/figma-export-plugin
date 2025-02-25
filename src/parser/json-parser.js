var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { padLeft } from "../util/string-util";
// Convert RGBA to HEX (Figma stores colors as RGBA 0-1 values)
const rgbaToHex = (rgba) => {
    const { a, r, g, b } = rgba;
    const rHex = padLeft(Math.round(r * 255).toString(16).toUpperCase(), 2, "0");
    const gHex = padLeft(Math.round(g * 255).toString(16).toUpperCase(), 2, "0");
    const bHex = padLeft(Math.round(b * 255).toString(16).toUpperCase(), 2, "0");
    const aHex = padLeft(Math.round(a * 255).toString(16).toUpperCase(), 2, "0");
    return `#${rHex}${gHex}${bHex}${aHex}`;
};
const resolveAlias = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const maxDepth = 100;
    let currentId = id;
    for (let i = 0; i < maxDepth; i++) {
        const value = yield figma.variables.getVariableByIdAsync(currentId);
        if (!value) {
            throw new Error(`Variable ${id} not found`);
        }
        const collection = yield figma.variables.getVariableCollectionByIdAsync(value.variableCollectionId);
        if (!collection) {
            throw new Error(`Collection ${id} not found`);
        }
        if (collection.modes.length > 1) {
            console.warn(`Collection for a referenced variable has more than one mode. This might lead to wrong values for references.`);
        }
        const modeValue = value.valuesByMode[collection.modes[0].modeId];
        // Check if its another reference
        if (typeof modeValue === "object" && "id" in modeValue) {
            currentId = modeValue.id;
        }
        else {
            return modeValue;
        }
    }
    throw new Error("Maximum Alias Depth reached and did not find a value");
});
const putIntoJSONFlat = (json, data) => {
    if (!json["values"]) {
        json["values"] = [];
    }
    json["values"].push(data);
};
const putIntoJSONNested = (json, data, collectionName, modeName, fullPath) => {
    const nameElements = [collectionName, modeName, ...fullPath].slice(0, -1);
    let currentFolder = json;
    for (const name of nameElements) {
        if (!currentFolder[name]) {
            currentFolder[name] = {};
        }
        currentFolder = currentFolder[name];
    }
    currentFolder[data.name] = data;
};
export const exportJSON = (options) => __awaiter(void 0, void 0, void 0, function* () {
    if (!figma.variables) {
        figma.notify("Variables API is not supported.");
        throw new Error("Variables API is not supported.");
    }
    const collections = yield figma.variables.getLocalVariableCollectionsAsync();
    const jsonFlat = { values: [] };
    const jsonNested = {};
    for (const collection of collections) {
        const modes = collection.modes;
        for (const mode of modes) {
            for (const id of collection.variableIds) {
                const variable = yield figma.variables.getVariableByIdAsync(id);
                if (!variable) {
                    continue;
                }
                const splitName = variable.name.split("/");
                const varName = splitName[splitName.length - 1];
                const modeValue = variable.valuesByMode[mode.modeId];
                const aliasForId = typeof modeValue === "object" && "id" in modeValue ? modeValue.id : undefined;
                const aliasValue = aliasForId ? yield resolveAlias(aliasForId) : undefined;
                let value = aliasValue !== null && aliasValue !== void 0 ? aliasValue : modeValue;
                // Determine type and export format
                if (variable.resolvedType === "COLOR") {
                    // TODO ensure RGBA and not RGB
                    if (options.colors === "hex") {
                        value = rgbaToHex(value);
                    }
                }
                const exportValue = {
                    id: variable.id,
                    name: varName,
                    value: value,
                    aliasForId: aliasForId,
                    type: variable.resolvedType
                };
                // Add to export json
                if (options.structure === "flat") {
                    putIntoJSONFlat(jsonFlat, exportValue);
                }
                else {
                    putIntoJSONNested(jsonNested, exportValue, collection.name, mode.name, splitName);
                }
            }
        }
    }
    const json = options.structure === "flat" ? jsonFlat : jsonNested;
    console.info(json);
    return json;
});
