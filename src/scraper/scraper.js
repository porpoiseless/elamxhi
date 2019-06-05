const puppeteer = require('puppeteer');
const fs = require('fs');
// extract major roots
const scrapePage = async (url) => {
    // visit the page
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    // collect & process tabled roots
    const majorRoots = await page.$$eval('table', (tables) => tables.map(
        // extract rows
        (tbl) => [...tbl.querySelectorAll('tr')].map(
            // extract cells from all rows 
            (row) => [...row.querySelectorAll('td')].map(
                // extract text from each cell
                (td) => td.textContent
                    // clean up entries: capitalization, extra spaces, newlines
                    .toLowerCase()
                    .replace(/\s+/g, " ")
                    .replace(/\n/g, ""))
                .filter(Boolean))
            .filter((row) => row.some(
                (cell) => !/\s*(?:(?:(?:in)?formal)|(?:compleme.tary))\s*(?:stems?)?\s*$/i.test(cell)))

    ));
    // collect candidates for derived roots
    const derivedRoots = await page.$$eval('strong', (strongs) => {
        // gather text from subsequent nodes
        const slurpWhile = (condition) => (elt) => {
            let output = '', next = elt.nextSibling || false;
            while (next && condition(elt)) {
                output += next.textContent;
                next = next.nextSibling;
            }
            return output;
        };
        return strongs.filter((elt) => !elt.closest('table'))
            .map((strong) => ({
                root: strong.innerText,
                gloss: slurpWhile((elt) =>
                    elt.nodeType == Node.TEXT_NODE ||
                    elt.nodeName == "EM" ||
                    elt.nodeName == "STRONG" ||
                    elt.nodeName == "SPAN" ||
                    elt.nodeName == "A")(strong)
            }));
    });
    // 
    return {
        major: majorRoots,
        derived: derivedRoots
    };

};
//
const LEXICON_URL = 'http://ithkuil.net/lexicon.htm';
const derived = scrapePage(LEXICON_URL).then(
    (results) => fs.writeFileSync('derived.json', JSON.stringify(results)))
    .catch(err => console.log(err)); 
