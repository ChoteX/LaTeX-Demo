const BODY_TRIGGER_REGEX =
  /\\(section|subsection|chapter|part|paragraph|subparagraph|begin|maketitle|title|author|date|item|frame|textbf|textit|documentclass)\b/;

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

  // Strip known unsupported packages/macros for browser preview
  const PKG_BLOCK = /\\usepackage(\[[^\]]*\])?\{([^}]+)\}/g;
  result = result.replace(PKG_BLOCK, (full, _opts, names) => {
    const unsupported = new Set([
      'fontspec',
      'tikz',
      'polyglossia',
      // inputenc/fontenc are not needed for preview
      'inputenc',
      'fontenc',
      // graphics/xcolor rarely needed for simple preview
      'pgf',
      'pgffor',
      'pgfplots',
    ]);
    const filtered = names
      .split(',')
      .map((n: string) => n.trim())
      .filter((n: string) => n && !unsupported.has(n));
    return filtered.length ? `\\usepackage{${filtered.join(',')}}` : '';
  });

  // Remove fontspec and related font commands
  result = result.replace(/^\\setmainfont\{[^}]+\}.*$/gmi, '');
  result = result.replace(/^\\setsansfont\{[^}]+\}.*$/gmi, '');
  result = result.replace(/^\\setmonofont\{[^}]+\}.*$/gmi, '');

  // Remove AtBeginDocument hooks which sometimes rely on unsupported macros
  result = result.replace(/^\\AtBeginDocument\{[\s\S]*?\}\s*/gmi, '');

  return result;
};
