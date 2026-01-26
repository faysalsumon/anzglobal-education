declare module 'pdf-poppler' {
  interface ConvertOptions {
    format?: 'jpeg' | 'png' | 'ppm' | 'tiff';
    out_dir?: string;
    out_prefix?: string;
    page?: number;
    scale?: number;
    density?: number;
  }

  export function convert(pdfPath: string, options: ConvertOptions): Promise<void>;
  export function info(pdfPath: string): Promise<{
    pages: number;
    title?: string;
    author?: string;
  }>;
}
