// Minimal, safe Markdown to HTML for study material (headings, lists, tables, quotes, bold, code, links, images).
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s: string) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<em>$2</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/!\[([^\]]*)\]\(((?:https?:\/\/|\/)[^\s)"]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)"]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\[(.+?)\]\((\/[^\s)"]*)\)/g, '<a href="$2">$1</a>');

export const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "section";

/** Headings (## and ###) for a table of contents. */
export function headings(src: string) {
  return src.replace(/\r/g, "").split("\n").flatMap((l) => {
    const h = l.match(/^(#{2,3})\s+(.*)/);
    return h ? [{ level: h[1].length, text: h[2].replace(/[*`]/g, ""), id: slugify(h[2]) }] : [];
  });
}

/** Rough reading time in minutes at 200 words a minute. */
export const readingMinutes = (src: string) => Math.max(1, Math.round(src.split(/\s+/).filter(Boolean).length / 200));

export function markdown(src: string) {
  const lines = src.replace(/\r/g, "").split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    const h = l.match(/^(#{1,3})\s+(.*)/);
    if (h) { out.push(`<h${h[1].length} id="${slugify(h[2])}">${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (/^---+$/.test(l.trim())) { out.push("<hr />"); i++; continue; }
    if (l.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) buf.push(lines[i++].replace(/^>\s?/, ""));
      out.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`); continue;
    }
    if (l.trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const r = lines[i++].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!r.every((c) => /^:?-+:?$/.test(c))) rows.push(r);
      }
      const [head, ...body] = rows;
      out.push(`<div style="overflow-x:auto"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${body
        .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(l) || /^\s*\d+\.\s+/.test(l)) {
      const ordered = /^\s*\d+\./.test(l);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/).test(lines[i]))
        items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ""));
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>${items.map((x) => `<li>${inline(x)}</li>`).join("")}</${tag}>`);
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#|>|\||\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])) buf.push(lines[i++]);
    out.push(`<p>${inline(buf.join(" "))}</p>`);
  }
  return out.join("\n");
}
