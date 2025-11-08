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
