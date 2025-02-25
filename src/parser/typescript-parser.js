var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { exportJSON } from "./json-parser";
export const exportTypescript = (_) => __awaiter(void 0, void 0, void 0, function* () {
    const flatJson = yield exportJSON({ type: "json", structure: "flat", colors: "hex" });
    const colors = flatJson.values.filter(value => value.type === "COLOR");
    const numbers = flatJson.values.filter(value => value.type === "FLOAT");
    const booleans = flatJson.values.filter(value => value.type === "BOOLEAN");
    const strings = flatJson.values.filter(value => value.type === "STRING");
    const template = `
export const colors = [%c]

export const numbers = [%n]

export const booleans = [%b]

export const strings = [%s]

export { colors, numbers, booleans, strings }
`;
    return template
        .replace("[%c]", colors.join(",\n "))
        .replace("[%n]", numbers.join(",\n "))
        .replace("[%b]", booleans.join(",\n "))
        .replace("[%s]", strings.join(",\n "));
});
