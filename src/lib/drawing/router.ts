// Decide which extraction tier handles an uploaded drawing file.
//
// Routing rules:
//   .dxf              → tier 2 (exact geometry — always best when available)
//   .dwg              → rejected with advice: "export as DXF" (proprietary
//                       format; parsing it server-side isn't worth the pain)
//   .pdf              → tier 1 first (AI vision reads annotations). If the
//                       result has too few dimensioned items, the route offers
//                       tier 3 (calibrate + measure) as the fallback. That
//                       decision lives in the API route, not here — this
//                       module only classifies the file.
//   anything else     → rejected

export type DrawingRoute =
  | { tier: 1; kind: "pdf" }
  | { tier: 2; kind: "dxf" }
  | { tier: 0; kind: "unsupported"; reason: string; advice: string };

const PDF_MAGIC = "%PDF";

export function routeDrawingFile(
  filename: string,
  bytes: ArrayBuffer
): DrawingRoute {
  const ext = (filename.split(".").pop() ?? "").toLowerCase();
  const head = new TextDecoder("ascii", { fatal: false }).decode(
    bytes.slice(0, 128)
  );

  if (ext === "dxf") {
    // DXF is plain text (or binary starting "AutoCAD Binary DXF").
    // Cheap sniff: text DXF group codes start with "0" then "SECTION".
    return { tier: 2, kind: "dxf" };
  }

  if (ext === "dwg") {
    return {
      tier: 0,
      kind: "unsupported",
      reason: "DWG is a proprietary format we can't parse directly.",
      advice:
        "In your CAD package use Save As → DXF (any release, R2010+ preferred) " +
        "and upload that instead. Dimensions will be exact.",
    };
  }

  if (ext === "pdf" || head.startsWith(PDF_MAGIC)) {
    return { tier: 1, kind: "pdf" };
  }

  return {
    tier: 0,
    kind: "unsupported",
    reason: `Unsupported file type ".${ext}".`,
    advice: "Upload a PDF drawing or a DXF export from CAD.",
  };
}
