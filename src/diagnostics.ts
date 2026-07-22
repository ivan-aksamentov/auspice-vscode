import type { DiagnosticCollection, Uri } from "vscode"
import { Diagnostic, DiagnosticSeverity, Range } from "vscode"

const DIAGNOSTIC_SEVERITIES = {
  error: DiagnosticSeverity.Error,
  warning: DiagnosticSeverity.Warning,
  information: DiagnosticSeverity.Information,
} satisfies Record<InputDiagnostic["severity"], DiagnosticSeverity>

export interface InputDiagnostic {
  readonly uri: Uri
  readonly severity: "error" | "warning" | "information"
  readonly message: string
}

export function replaceDiagnostics(
  collection: DiagnosticCollection,
  diagnostics: readonly InputDiagnostic[],
): void {
  collection.clear()
  const byUri = Map.groupBy(diagnostics, (diagnostic) => diagnostic.uri.toString())
  byUri.forEach((items) => {
    const first = items.at(0)
    if (first === undefined) return
    collection.set(
      first.uri,
      items.map(
        (item) =>
          new Diagnostic(new Range(0, 0, 0, 1), item.message, diagnosticSeverity(item.severity)),
      ),
    )
  })
}

function diagnosticSeverity(severity: InputDiagnostic["severity"]): DiagnosticSeverity {
  return DIAGNOSTIC_SEVERITIES[severity]
}
