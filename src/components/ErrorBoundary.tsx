import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught", error, info);
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="surface-card mx-auto my-10 max-w-md p-6 text-center">
          <h2 className="text-lg font-semibold">
            {this.props.fallbackTitle ?? "Something went wrong"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{this.state.error.message}</p>
          <Button className="mt-5" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
