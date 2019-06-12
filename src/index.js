import { html, render } from 'lit-html';
import './base.css';
import dictionary from './data/dictionary.json';

// create link to original source
const srcTemplate = (src) => html`<cite><a href="${src}">Source: ${
    /supplement/i.test(src) ?
        "Supplement to Ithkuil Lexicon (2015)" :
        "The Lexicon (2011)"
    }</a></cite>`;

// create a heading for a root
const rootTemplate = (root) => html`
<h1 id="${encodeURI(root + '_root')}" class="glossary-item--root">
${root}
</h1>
`;

// create a heading for a root gloss
const glossTemplate = (root, gloss) => html`
<h2 id="${encodeURI(root + '_gloss')}" class="glossary-item--gloss">
${gloss}
</h2>
`;

const headerTemplate = (root, gloss) => html`
<header class="glossary-item--header">
  ${rootTemplate(root)}
  ${glossTemplate(root, gloss)}
</header>
`;

const noteTemplate = (note) => html`
<details>
  <summary>Note:</summary>
  ${note}
</details>`;

//
const derivedRootTemplate = ({ root, gloss, src }) => {
    const encodedRoot = encodeURI(root);
    return html`
<div class="derived-roots-list" id="${encodedRoot}">
<dt id="${encodedRoot + '_root'}">${root}</dt>
<dd id="${encodedRoot + '_gloss'}">
${gloss}
${srcTemplate(src)}
</dt>
</div>
`};
const derivedRootListTemplate = (roots) => html`
<h3>Derived roots:</h3>
<dl>
${roots.map(derivedRootTemplate)}
<dl>
`;
// unique, safe ID string for each stem
const stemId = ({ root, designation, pattern, stem }) => encodeURI(
    `${root}_${designation}p${pattern}s${stem}`);
// ------------------------------------------------------------
// TRANSFORMERS
// ------------------------------------------------------------
// 
// These functions take a props object and return a reducer function.
//
//
//
const cellTransformer = (props) => (cell, colIndex) => html`
<td id="${stemId(Object.assign({}, props, { stem: colIndex + 1 }))}">
${cell}
</td>
`;

//
const rowTransformer = (props) => (row, rowIndex) => {
    const pattern = rowIndex + 1;
    return html`
<tr>
<th>
${pattern}
</th>
${row.map(
        cellTransformer(Object.assign(
            {},
            props,
            { pattern: pattern })))}
</tr>
`;
};
const longestRowLength = (table) => Math.max(...table.map(row => row.length));
// 
const tableHeadTemplate = (table) => {
    let header = [html`<th scope="col">Ptn ↓</th>`];
    for (let i = 0; i < longestRowLength(table); i++) {
        header.push(html`<th scope="col">Stem ${i + 1}</th>`);
    }
    return html`<thead>${header}</thead>`;
};

//
const designationTransformer = (props) => (table, designationIndex) => {
    const designationLabel = ["Informal", "Formal"][designationIndex];
    return html`
<table>
<caption>
${designationLabel} stems
</caption>
${tableHeadTemplate(table)}
<tbody>
${table.map(rowTransformer(Object.assign(
        {},
        props,
        { designation: designationLabel.slice(0, 1).toLowerCase() })))}
<tbody>
</table>
`;
};
//
const majorRootTemplate = ({ root, gloss, stems, src, derived, note }) => html`
<section id="${encodeURI(root)}" class="${derived ? 'has-derived' : ''}">
  ${headerTemplate(root, gloss)}
  ${note ? noteTemplate(note) : ''}
  ${stems.map(designationTransformer({ root: root }))}
  ${srcTemplate(src)}
  ${derived ? derivedRootListTemplate(derived) : ''}
</section>

`;

//
const glossary = (items) => html`
<main>
${items.map(majorRootTemplate)}
</main>
`;

// create a glossary item
// render it!
const renderGlossary = (e) =>
    render(glossary(dictionary),
        document.body);
// 
window.addEventListener('load', renderGlossary);
