"use client";

import { Component, type ReactNode } from "react";

// GLB の読み込み失敗時に fallback（現行の手書きジオメトリ等）へ退避するためのエラーバウンダリ。
// CLAUDE.md の「外部依存は必ずフォールバックを入れる」方針に沿い、モデルが無くてもゲームが止まらないようにする。
export class ModelErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("GLBモデルの読み込みに失敗しました。フォールバックを表示します:", error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
