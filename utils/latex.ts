const BODY_TRIGGER_REGEX =
  /\\(section|subsection|chapter|part|paragraph|subparagraph|begin|maketitle|title|author|date|item|frame|textbf|textit)\b/;

const stripBomAndTrimStart = (latex: string) =>
  latex.replace(/^\ufeff/, '').replace(/\r/g, '').trimStart();

const findBodyInsertionIndex = (latex: string) => {
  const match = BODY_TRIGGER_REGEX.exec(latex);
  if (match && typeof match.index === 'number') {
    return match.index;
  }
  return latex.length;
};

export const ensureLatexDocument = (input: string): string => {
  let result = stripBomAndTrimStart(input);

  if (!result.trim()) {
    return '';
  }

  const hasDocumentClass = /\\documentclass/.test(result);
  const hasBeginDocument = /\\begin{document}/.test(result);
  const hasEndDocument = /\\end{document}/.test(result);

  if (!hasBeginDocument) {
    const insertAt = findBodyInsertionIndex(result);
    const before = result.slice(0, insertAt);
    const after = result.slice(insertAt);
    const prefix = before && !before.endsWith('\n') ? `${before}\n` : before;
    result = `${prefix}\\begin{document}\n${after}`;
  }

  if (!hasEndDocument) {
    result = `${result.trimEnd()}\n\\end{document}\n`;
  }

  if (!hasDocumentClass) {
    result = `\\documentclass{article}\n${result}`;
  }

  return result;
};

/**
 * Prepares LaTeX for in-browser preview by removing packages and macros
 * that latex.js can't handle (e.g. fontspec, tikz), while preserving
 * structure and math content.
 */
export const prepareForPreview = (input: string): string => {
  let result = ensureLatexDocument(input);

  // Strip ALL usepackage lines for preview to avoid loader errors in browser
  // (latex.js + KaTeX can render basic math without them)
  const PKG_BLOCK = /\n?\\usepackage(\[[^\]]*\])?\{[^}]+\}.*$/gmi;
  result = result.replace(PKG_BLOCK, '');

  // Render choices inline with Georgian letters (preview-only)
  {
    const GEO = [
      'ა','ბ','გ','დ','ე','ვ','ზ','თ','ი','კ','ლ','მ','ნ','ო','პ','ჟ','რ','ს','ტ','უ','ფ','ქ','ღ','ყ','შ','ჩ','ც','ძ','წ','ჭ','ხ','ჯ','ჰ'
    ];
    result = result.replace(/\\begin\{choices\}([\\s\\S]*?)\\end\{choices\}/gmi, (_m, body) => {
      const items = body
        .split(/\\item\s*/g)
        .slice(1)
        .map((s: string) => s.trim())
        .filter(Boolean);
      if (!items.length) return '';
      const line = items
        .map((content: string, i: number) => `${GEO[i] || String.fromCharCode(97 + i)}) ${content}`)
        .join(' \\quad ');
      return `\\noindent ${line}`;
    });
  }

  // Render choices inline with Georgian letters (preview-only)
  {
    const GEO = [
      'ა','ბ','გ','დ','ე','ვ','ზ','თ','ი','კ','ლ','მ','ნ','ო','პ','ჟ','რ','ს','ტ','უ','ფ','ქ','ღ','ყ','შ','ჩ','ც','ძ','წ','ჭ','ხ','ჯ','ჰ'
    ];
    result = result.replace(/\\begin\{choices\}([\\s\\S]*?)\\end\{choices\}/gmi, (_m, body) => {
      const items = body
        .split(/\\item\s*/g)
        .slice(1)
        .map((s: string) => s.trim())
        .filter(Boolean);
      if (!items.length) return '';
      const line = items
        .map((content: string, i: number) => `${GEO[i] || String.fromCharCode(97 + i)}) ${content}`)
        .join(' \\quad ');
      return `\\noindent ${line}`;
    });
  }

  // Drop enumitem customizations (we will map choices -> enumerate)
  result = result.replace(/^\\newlist\{choices\}[\s\S]*?$/gmi, '');
  result = result.replace(/^\\setlist\[[^\]]*\]\{[^}]*\}.*$/gmi, '');

  // Map \begin{choices} ... to regular enumerate for preview
  result = result.replace(/\\begin\{choices\}/g, '\\begin{enumerate}');
  result = result.replace(/\\end\{choices\}/g, '\\end{enumerate}');

  // Remove fontspec and related font commands
  result = result.replace(/^\\setmainfont\{[^}]+\}.*$/gmi, '');
  result = result.replace(/^\\setsansfont\{[^}]+\}.*$/gmi, '');
  result = result.replace(/^\\setmonofont\{[^}]+\}.*$/gmi, '');

  // Keep AtBeginDocument hooks to avoid unbalanced braces; most simple macros parse fine.

  // Ensure common list environments are balanced (best-effort): enumerate/itemize
  const balanceEnv = (tex: string, env: string) => {
    const open = (tex.match(new RegExp(`\\\\begin\\{${env}\\}`, 'g')) || []).length;
    const close = (tex.match(new RegExp(`\\\\end\\{${env}\\}`, 'g')) || []).length;
    const missing = open - close;
    if (missing > 0) {
      const patch = Array(missing).fill(`\n\\end{${env}}`).join('');
      tex = tex.replace(/\\end\{document\}/, `${patch}\n\\end{document}`);
    }
    return tex;
  };

  result = balanceEnv(result, 'enumerate');
  result = balanceEnv(result, 'itemize');

  return result;
};
