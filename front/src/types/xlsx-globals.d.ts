declare global {
  interface Window {
    XLSX?: {
      read: (data: ArrayBuffer | Uint8Array | string, opts?: Record<string, unknown>) => any;
      utils: {
        sheet_to_json: (sheet: any, opts?: Record<string, unknown>) => any[];
      };
    };
  }
}

export {};
