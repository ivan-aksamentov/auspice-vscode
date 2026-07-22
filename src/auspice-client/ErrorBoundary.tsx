import React from "react"

// A render error in an Auspice panel would otherwise unmount the whole tree and
// leave a black screen. This boundary keeps the toolbar usable and shows the
// error text so the failure is diagnosable instead of silent.
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: undefined }
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(error, info.componentStack)
  }

  override render(): React.ReactNode {
    const { error } = this.state
    if (error === undefined) return this.props.children
    return (
      <div className="auspice-vscode-error" role="alert">
        <h2>The viewer failed to render this dataset.</h2>
        <pre>{error.message}</pre>
      </div>
    )
  }
}

interface ErrorBoundaryProps {
  readonly children: React.ReactNode
}

interface ErrorBoundaryState {
  readonly error: Error | undefined
}
