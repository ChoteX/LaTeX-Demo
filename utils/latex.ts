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

  // Remove AtBeginDocument hooks which sometimes rely on unsupported macros
  result = result.replace(/^\\AtBeginDocument\{[\s\S]*?\}\s*/gmi, '');

  return result;
};
