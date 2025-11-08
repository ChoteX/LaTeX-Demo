declare module 'latex.js' {
  export interface ParseOptions {
    generator?: HtmlGenerator;
  }

  export class HtmlGenerator {
    constructor(options?: Record<string, unknown>);
    domFragment(): DocumentFragment;
    htmlDocument(url?: string): Document;
  }

  export function parse(latex: string, options?: ParseOptions): HtmlGenerator;
}
