// get rid of typographic noise
const cleanString = (str) => str.toLowerCase() // downcase
    .replace(/\s+/g, " ")		       // single spaces only
    // eliminate newlines
    .replace(/\n/g, "")
    // eliminate leading dashes + space
    .replace(/^\s*-?\s*/g, "")
    // eliminate trailing dashes + space
    .replace(/\s*-?\s*$/g, "")
    // eliminate leading digits
    .replace(/^\d+\.?\s*/g, "");
// extract text of following nodes while some condition is met
const slurpWhile = (condition) => (elt) => {
    let output = '', next = elt.nextSibling || false;
    while (next && condition(elt)) {
        output += next.textContent;
        next = next.nextSibling;
    }
    return output;
};
// guess major roots on the basis of a gloss string
const guessMajorRoot = (elt, gloss) => {
    const results = /[\-–]([SŠPTŢKBDGQMNŇJXRŘFVZŻŽLĻÇCČ][WY’hʰHSŠPTŢKBDGQMNŇJXRŘFVZŻŽLĻÇCČ]{0,4})[\-–]/i.exec(gloss);
    return results && results.length > 1
        ? cleanString(results[1]) :
        false;
};
