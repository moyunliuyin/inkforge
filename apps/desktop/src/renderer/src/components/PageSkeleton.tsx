type PageSkeletonProps = {
  label?: string;
};

function SkeletonBlock({ className }: { className: string }): JSX.Element {
  return <div className={`skeleton-shimmer ${className}`} aria-hidden="true" />;
}

/**
 * 路由级懒加载的 Suspense fallback。列无关的通用骨架（标题块 + 内容行堆叠），
 * 避免对单栏/多栏页造成布局跳变。纯 Tailwind，强调色用基线已有的 amber。
 */
export function PageSkeleton({ label = "Loading" }: PageSkeletonProps): JSX.Element {
  return (
    <div
      className="flex h-full min-h-0 w-full flex-col gap-4 p-6"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      <header className="flex shrink-0 items-center justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <SkeletonBlock className="h-6 w-44 rounded-md bg-ink-700/60" />
          <SkeletonBlock className="h-3.5 w-72 max-w-[70vw] rounded bg-ink-700/35" />
        </div>
        <SkeletonBlock className="h-8 w-20 shrink-0 rounded-md bg-amber-500/20" />
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden">
        {["w-full", "w-11/12", "w-10/12", "w-full", "w-9/12", "w-11/12", "w-8/12", "w-full"].map(
          (w, i) => (
            <SkeletonBlock key={`row-${i}`} className={`h-12 ${w} shrink-0 rounded-lg bg-ink-700/30`} />
          ),
        )}
      </div>
    </div>
  );
}
