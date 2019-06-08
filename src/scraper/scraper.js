const puppeteer = require('puppeteer');
const fs = require('fs');
// extract major roots
const scrapePage = async (url) => {
    // launch headless browser
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);	// navigate to url
    // add utilities
    await page.addScriptTag({ path: "src/scraper/scraper_utils.js" });
    // collect & process tabled roots
    const majorRoots = await page.$$eval('table', (tables) => tables.map(
        // extract rows
        (tbl) => {
            const header = tbl.querySelector('tr'); // header is first row in table
            const root = header.querySelector('strong') || false;
            let ret = {
                root: root ? cleanString(root.textContent) : false,
                gloss: cleanString(header.textContent)
            };
            // extract the table
            const table = [...tbl.querySelectorAll('tr')].map(
                // extract cells from all rows 
                (row) => [...row.querySelectorAll('td')].map(
                    // extract text from each cell
                    (td) => td.textContent)
                    .map(cleanString)
                    .filter(Boolean))	  // remove empty entries from each row
                .filter((row) => row.some( // keep rows with non-label contents
                    (cell) =>
                        !/\s*(?:(?:(?:in)?formal)|(?:compleme.tary))\s*(?:stems?)?\s*$/i
                            .test(cell)))
                .slice(1); 	// remove the already-scraped header row
            const firstLine = table[0];
            if (firstLine instanceof Array && /^\s*note:/i.test(firstLine[0])) {
                return Object.assign(ret, {
                    note: firstLine[0],
                    stems: table.slice(1)
                });
            } else {
                return Object.assign(ret, { stems: table });
            }
            return ret;
        }));
    // collect candidates for derived roots
    const derivedRoots = await page.$$eval('strong', (strongs) => {
        return strongs.filter((elt) => !elt.closest('table'))
            .map((strong) => {
                const root = cleanString(strong.innerText);
                const gloss = slurpWhile((elt) =>
                    elt.nodeType == Node.TEXT_NODE ||
                    elt.nodeName == "EM" ||
                    elt.nodeName == "STRONG" ||
                    elt.nodeName == "SPAN" ||
                    elt.nodeName == "A")(strong);
                return {
                    root: root,
                    major: guessMajorRoot(strong, gloss),
                    gloss: cleanString(gloss)
                };
            });
    });
    //
    console.log(`Roots scraped from ${url}
MAJOR: ${majorRoots.length}
DERIVED: ${derivedRoots.length}`);
    // close browser
    const tagWithURL = (obj) => Object.assign({}, obj, { src: url });
    await browser.close();
    //  
    return {
        major: majorRoots.map(tagWithURL),
        derived: derivedRoots.map(tagWithURL)
    };
};

// ------------------------------------------------------------
// ------------------------------------------------------------
const walkTable = (tbl, callback) => tbl.forEach(
    (row, rowIndex) => row.forEach(
        (col, colIndex) => callback(tbl[rowIndex][colIndex],
            rowIndex,
            colIndex,
            tbl)));
// create an empty stem table
class StemTable {
    constructor() {
        this.__stems =
            [[Array(3), Array(3), Array(3)],
            [Array(3), Array(3), Array(3)]];
    }
    stem({ gloss, designation, pattern, stem }) {
        const stems = this.__stems;
        if (stems.length >= designation &&
            stems[designation].length >= pattern // &&
            // stems[designation][pattern].length >= stem
        ) {
            this.__stems[designation][pattern][stem] = gloss;
        } else {
            throw `Coordinates exceed stemtable.
designation: ${designation},
pattern: ${pattern},
stem: ${stem},
gloss: ${gloss}
`;
        }
    }
    get stems() {
        return this.__stems;
    }
}
// 
const handleHolisticStems = (input, output) =>
    walkTable(input, (gloss, row, col, tbl) =>
        output.stem({
            gloss: gloss,
            stem: row,
            pattern: 0,
            designation: col % 2
        }));
// complementary stems for main lexicon
const handleComplementaryStemsLexicon = (input, output) =>
    walkTable(input, (gloss, row, col, tbl) => tbl[row].length > 2 ?
        output.stem({
            gloss: gloss,
            stem: row,
            pattern: col % 2 + 1,
            designation: col >= 2 ? 1 : 0
        }) :
        output.stem({
            gloss: gloss,
            stem: row,
            pattern: col % 2 + 1,
            designation: 0
        }));
// complementary stems for lexicon supplement
const handleComplementaryStemsSupplement = (input, output) =>
    walkTable(input, (gloss, row, col, tbl) => tbl[row].length > 2 ?
        output.stem({
            gloss: gloss,
            stem: row,
            pattern: col % 2 + 1,
            designation: col >= 2 ? 1 : 0
        }) :
        output.stem({
            gloss: gloss,
            stem: row,
            pattern: col % 2 + 1,
            designation: col
        }));
//
const formatStemTable = ({ root, gloss, stems, src }) => {
    let tbl = new StemTable();
    // first three lines of table are holistic stems
    const holistic = stems.slice(0, 3);
    // rest of table is complementary stems
    const complementary = stems.slice(3);
    //
    handleHolisticStems(holistic, tbl);
    if (/supplement/.test(src)) {
        handleComplementaryStemsSupplement(complementary, tbl);
    } else {
        handleComplementaryStemsLexicon(complementary, tbl);
    };
    return {
        root: root,
        gloss: gloss,
        stems: tbl.stems,
        src: src
    };
};

// ------------------------------------------------------------
// scrape and process
// ------------------------------------------------------------
const scrapeURLS = async (...urls) => {
    return await Promise.all(
        urls.map((url) => scrapePage(url))
    );
};

const rawData = scrapeURLS('http://localhost:8080/lexicon.html',
    'http://localhost:8080/lexicon_supplement_1.html');
// 
const joinLexicons = ({ major: m1, derived: d1 }, { major: m2, derived: d2 }) => ({
    major: [...m1, ...m2],
    derived: [...d1, ...d2]
});
//
const derivedRootReducer = (acc = { index: {}, orphans: [] }, item) => {
    const { index, orphans } = acc,
        { root, major } = item;
    if (root && major) {    // if we have a candidate for the derived and major roots 
        const newMajorIndex = index[major] instanceof Array ? // add it to the existing entry
            index[major].concat(item) : Array.of(item); // or create a new one
        const newIndex = { ...index, [major]: newMajorIndex };
        return { ...acc, index: newIndex };
    } else {
        const newOrphans = orphans.concat(item);
        return { ...acc, orphans: newOrphans };
    }
};
const data = rawData.then(
    (data) => data.map(({ major, derived }) => {
        return {
            major: major.map(formatStemTable),
            derived: derived
        };
    }))
    .then((collection) => joinLexicons(...collection))
    .then(({ major, derived }) => Object.assign(
        {},
        {
            major: major.filter(({ root }) => Boolean(root)),
            majorProblems: major.filter(({ root }) => !Boolean(root))
        },
        derived.reduce(derivedRootReducer, { index: {}, orphans: [] })
    ))
    .then((o) => fs.writeFileSync('dictionary.json', JSON.stringify(o)))
    .catch((err) => console.log(err));
