import { html, render } from 'lit-html';
import dictionary from './lexicon.json';

const glossaryItem = ({ root, gloss, src }) => html`
<dt id="${encodeURI(root)}">${root}</dt>
<dd>
<p>${gloss}</p>
<a href="${src}">Source</a>
</dd>
`;
const glossaryList = (items) => html`
<dl>
${items.map(glossaryItem)}
</dl>
`;
//
const renderGlossary = (e) =>
    render(glossaryList(dictionary.major),
        document.querySelector('main'));
// 
window.addEventListener('load', renderGlossary);
