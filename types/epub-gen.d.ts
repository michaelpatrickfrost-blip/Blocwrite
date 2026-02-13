declare module "epub-gen" {
  export default class EPub {
    constructor(options: Record<string, unknown>, output: string);
    promise: Promise<void>;
  }
}
