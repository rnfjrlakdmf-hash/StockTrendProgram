const fs = require('fs');
const content = fs.readFileSync('temp_content.txt', 'utf-8');

const tocRegex = /<(h[23])([^>]*)>(.*?)<\/\1>/gi;
let match;
const toc = [];
let idCounter = 0;

let contentWithIds = content
    .replace(/href="\/market-report"/g, 'href="/discovery"')
    .replace(/href="\/market"/g, 'href="/discovery"')
    .replace(/<a href="[^"]*">오늘의 시장 분석 리포트 더 보기<\/a>/g, '<a href="/discovery">오늘의 시장 분석 리포트 더 보기</a>')
    .replace(/whitespace-nowrap/g, 'break-keep');
    
contentWithIds = contentWithIds.replace(/<(h[23])([^>]*)>(.*?)<\/\1>/gi, (fullMatch, tag, attrs, innerHtml) => {
    const id = `toc-${idCounter++}`;
    return `<${tag} id="${id}"${attrs} class="scroll-mt-32">${innerHtml}</${tag}>`;
});

while ((match = tocRegex.exec(content)) !== null) {
    const level = match[1] === 'h2' ? 2 : 3;
    const text = match[3].replace(/<[^>]*>?/gm, '').trim();
    if (text) {
        toc.push({ level, text, id: `toc-${toc.length}` });
    }
}

console.log("TOC found:", toc);
console.log("idCounter:", idCounter);
