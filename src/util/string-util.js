export const padLeft = (str, length, padding = ' ') => {
    if (str.length >= length) {
        return str;
    }
    const paddingLength = length - str.length;
    const paddingStr = padding.repeat(Math.ceil(paddingLength / padding.length)).slice(0, paddingLength);
    return paddingStr + str;
};
