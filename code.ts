figma.showUI(__html__, {width: 300, height: 377});

const resolveAlias = async (id: string): Promise<VariableValue> => {
  const maxDepth = 100;
  let currentId = id
  for(let i = 0; i<maxDepth; i++) {
    const value = await figma.variables.getVariableByIdAsync(currentId)
    if(!value){
      throw new Error(`Variable ${id} not found`)
    }
    const collection =  await figma.variables.getVariableCollectionByIdAsync(value.variableCollectionId)
    if(!collection){
      throw new Error(`Collection ${id} not found`)
    }
    if(collection.modes.length > 1){
      console.warn(`Collection for a referenced variable has more than one mode. This might lead to wrong values for references.`)
    }
    const modeValue = value.valuesByMode[collection.modes[0].modeId]
    // Check if its another reference
    if(typeof modeValue === "object" && "id" in modeValue) {
      currentId = modeValue.id
    } else {
      return modeValue
    }
  }
  throw  new Error("Maximum Alias Depth reached and did not find a value")
}

async function exportVariables(options: { structure: string; colors: string }) {
  console.log("Export options selected:", options);

  if (!figma.variables) {
    figma.notify("Variables API is not supported.");
    return;
  }

  const collections = await figma.variables.getLocalVariableCollectionsAsync();

  const exportData: Record<string, any> = {};
  for (const collection of collections) {
    const modes = collection.modes
    for (const mode of modes) {
      for (const id of collection.variableIds) {
        const variable = await figma.variables.getVariableByIdAsync(id)
        if(!variable){
          continue;
        }
        const splitName = variable.name.split("/");
        const varName = splitName[splitName.length - 1];
        /*
        // Naming transformations
        if (options.naming === "folderToCamelCasePrefix") {
          formattedVarName = formattedVarName.replace(/[-_](.)/g, (_, char) => char.toUpperCase()); // Convert to camelCase
        }
         */

        const modeValue = variable.valuesByMode[mode.modeId]
        const aliasForId = typeof modeValue === "object" && "id" in modeValue ? modeValue.id : undefined
        const aliasValue = aliasForId ? await resolveAlias(aliasForId) : undefined
        let value = aliasValue ?? modeValue;

        // Determine type and export format
        if(variable.resolvedType === "COLOR") {
          if(options.colors === "hex") {
            value = rgbaToHex(value as RGBA)
          } else {
            value = value as RGBA
          }
        }

        const exportValue: Record<string, any> = {
          id: variable.id,
          name: varName,
          value,
          aliasForId: aliasForId,
        }

        // Structure Export
        if (options.structure === "flattened") {
          if (!exportData["values"]) {
            exportData["values"] = [];
          }
          exportData["values"].push(exportValue);
        } else {
          const nameElements = [collection.name, mode.name, ...splitName].slice(0, -1)
          let currentFolder = exportData
          for (const name of nameElements) {
            if (!currentFolder[name]) {
              currentFolder[name] = {};
            }
            currentFolder = currentFolder[name];
          }
          currentFolder[varName] = exportValue;
        }
      }
    }
  }
  console.info(exportData)
  figma.ui.postMessage({
    type: "export-json",
    filename: "figma-variables.json",
    data: JSON.stringify(exportData, null, 2) // Pretty print JSON
  });
}

function padLeft(str: string, length: number, padding: string = ' '): string {
  if (str.length >= length) {
    return str;
  }
  const paddingLength = length - str.length;
  const paddingStr = padding.repeat(Math.ceil(paddingLength / padding.length)).slice(0, paddingLength);
  return paddingStr + str;
}

// Convert RGBA to HEX (Figma stores colors as RGBA 0-1 values)
function rgbaToHex(rgba: { a: number, r: number, g: number, b: number }): string {
  const {a, r, g, b} = rgba;
  const rHex = padLeft(Math.round(r * 255).toString(16).toUpperCase(), 2, "0")
  const gHex = padLeft(Math.round(g * 255).toString(16).toUpperCase(), 2, "0")
  const bHex = padLeft(Math.round(b * 255).toString(16).toUpperCase(), 2, "0")
  const aHex = padLeft(Math.round(a * 255).toString(16).toUpperCase(), 2, "0")
  return `#${rHex}${gHex}${bHex}${aHex}`;
}

// Listen for UI messages
figma.ui.onmessage = (msg) => {
  if (msg.type === "export") {
    exportVariables(msg.options).catch(console.error);
  }
};
