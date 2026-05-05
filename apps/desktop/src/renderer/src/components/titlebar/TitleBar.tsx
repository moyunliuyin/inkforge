import { useEffect, useState } from "react";
import { useAppStore } from "../../stores/app-store";
import { ProjectSwitcher } from "../ProjectSwitcher";

/**
 * 自定义无边框 titlebar。
 *
 * 设计灵感汲取自十余款现代桌面应用：
 *   - VS Code / Cursor —— 36 px 高度、Windows 风格 46×32 控件、close 按钮 hover 红
 *   - Linear / Vercel —— 渐变 LOGO + 极简强调字
 *   - Figma / Notion —— 顶部细线分隔 + 几乎透明背景
 *   - Arc / Slack —— 暗色玻璃感 + 工作区上下文胶囊
 *   - Raycast —— 居中胶囊状状态指示
 *   - Spotify / Discord —— 工作区/角色按钮置左 + 三段渐变
 *
 * 平台差异：
 *   - macOS：保留交通灯，本组件只渲染左侧 LOGO + 拖拽区，不画窗口控件；
 *     LOGO 起点向右偏 76 px 给交通灯让位
 *   - Windows / Linux：完全自画三个控件
 */

const PLATFORM = (() => {
  if (typeof navigator === "undefined") return "win";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "mac";
  if (ua.includes("linux")) return "linux";
  return "win";
})();

const VIEW_LABEL: Record<string, { icon: string; label: string }> = {
  writing: { icon: "✍", label: "写作" },
  skill: { icon: "🧩", label: "Skill" },
  character: { icon: "👥", label: "人物" },
  tavern: { icon: "🎭", label: "酒馆" },
  world: { icon: "🌍", label: "世界观" },
  research: { icon: "📚", label: "资料" },
  review: { icon: "📊", label: "审查" },
  bookshelf: { icon: "📖", label: "书房" },
};

export function TitleBar(): JSX.Element {
  const mainView = useAppStore((s) => s.mainView);
  const [isMaximized, setIsMaximized] = useState(false);
  const isMac = PLATFORM === "mac";

  // 初次加载与窗口最大化状态变化时同步图标
  useEffect(() => {
    let alive = true;
    void window.inkforge?.window.isMaximized().then((res) => {
      if (alive) setIsMaximized(res.isMaximized);
    });
    const off = window.inkforge?.window.onMaximizedChanged((evt) => {
      setIsMaximized(evt.isMaximized);
    });
    return () => {
      alive = false;
      off?.();
    };
  }, []);

  const handleMinimize = (): void => {
    void window.inkforge?.window.minimize();
  };
  const handleToggleMaximize = (): void => {
    void window.inkforge?.window.toggleMaximize();
  };
  const handleClose = (): void => {
    void window.inkforge?.window.close();
  };

  const viewMeta = VIEW_LABEL[mainView] ?? VIEW_LABEL.writing;

  return (
    <div
      className="relative flex h-9 shrink-0 select-none items-center justify-between border-b border-white/[0.06] bg-gradient-to-b from-[#0e1626] via-[#0b1322] to-[#0a0e1a] text-[12px] text-ink-200"
      style={
        // 整条作为拖拽区
        { WebkitAppRegion: "drag" } as React.CSSProperties
      }
    >
      {/* 顶部一根极淡的高光，模拟 Linear/Notion 的玻璃质感 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />

      {/* ===== 左：LOGO 区 ===== */}
      <div
        className={`flex h-full items-center gap-2 ${isMac ? "pl-[80px]" : "pl-3"}`}
      >
        <BrandMark />
        <span className="hidden font-semibold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-300 to-fuchsia-300 sm:inline">
          InkForge
        </span>
        <span className="ml-1 hidden h-3.5 w-px bg-white/10 sm:inline" />
        <span className="hidden items-center gap-1 rounded-full bg-white/[0.04] px-2 py-0.5 text-[11px] text-ink-300 ring-1 ring-white/5 sm:inline-flex">
          <span aria-hidden>{viewMeta.icon}</span>
          <span>{viewMeta.label}</span>
        </span>
        <span className="ml-1 hidden h-3.5 w-px bg-white/10 sm:inline" />
        <ProjectSwitcher variant="titlebar" />
      </div>

      {/* ===== 中：留白拖拽区（保持极简） ===== */}
      <div className="pointer-events-none flex-1" />

      {/* ===== 右：状态 + 窗口控件 ===== */}
      <div
        className="flex h-full items-center"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      >
        <ActiveStatusPill />
        {!isMac && (
          <div className="flex h-full items-center pl-2">
            <WindowButton
              kind="min"
              onClick={handleMinimize}
              ariaLabel="最小化"
            />
            <WindowButton
              kind={isMaximized ? "restore" : "max"}
              onClick={handleToggleMaximize}
              ariaLabel={isMaximized ? "向下还原" : "最大化"}
            />
            <WindowButton
              kind="close"
              onClick={handleClose}
              ariaLabel="关闭"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * 子组件
 * ============================================================ */

/** 多色渐变笔尖 LOGO（向 Vercel/Linear 借鉴） */
function BrandMark(): JSX.Element {
  return (
    <span
      aria-hidden
      className="relative flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-amber-400 via-orange-500 to-fuchsia-500 shadow-[0_0_12px_rgba(245,158,11,0.35)]"
    >
      <span className="absolute inset-[1px] rounded-[5px] bg-[#0a0e1a]/40" />
      <svg
        viewBox="0 0 24 24"
        className="relative h-3 w-3 text-amber-200"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* 简化的羽毛笔图形 */}
        <path d="M4 20l5-1 11-11a2 2 0 0 0 0-2.8l-.2-.2a2 2 0 0 0-2.8 0L6 16l-1 5z" />
        <path d="M14 6l4 4" />
      </svg>
    </span>
  );
}

/**
 * 右侧状态胶囊 —— 写作时显示「自动保存中」，其他视图显示版本，
 * 模仿 Raycast / Linear 顶部状态指示。
 */
function ActiveStatusPill(): JSX.Element {
  const mainView = useAppStore((s) => s.mainView);
  if (mainView === "writing" || mainView === "bookshelf") {
    return (
      <div className="mr-2 hidden items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10.5px] text-emerald-300 sm:inline-flex">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        <span>自动保存中</span>
      </div>
    );
  }
  return (
    <div className="mr-2 hidden items-center gap-1 rounded-full border border-white/5 bg-white/[0.03] px-2 py-0.5 text-[10.5px] text-ink-400 sm:inline-flex">
      <span>InkForge</span>
      <span className="text-ink-500">·</span>
      <span className="text-ink-300">beta</span>
    </div>
  );
}

interface WindowButtonProps {
  kind: "min" | "max" | "restore" | "close";
  onClick: () => void;
  ariaLabel: string;
}

/**
 * Windows 11 风格窗口按钮：
 * - 46 × 36 命中区域
 * - hover 时灰色覆盖；close 红色
 * - SVG 线条图，颜色随 currentColor
 */
function WindowButton({
  kind,
  onClick,
  ariaLabel,
}: WindowButtonProps): JSX.Element {
  const isClose = kind === "close";
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={onClick}
      className={`group flex h-9 w-[46px] items-center justify-center text-ink-200 transition-colors ${
        isClose
          ? "hover:bg-[#e81123] hover:text-white"
          : "hover:bg-white/10 hover:text-white"
      }`}
    >
      <ButtonIcon kind={kind} />
    </button>
  );
}

function ButtonIcon({ kind }: { kind: WindowButtonProps["kind"] }): JSX.Element {
  const common = {
    width: 10,
    height: 10,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1,
  };
  switch (kind) {
    case "min":
      return (
        <svg viewBox="0 0 10 10" {...common}>
          <line x1="0" y1="5" x2="10" y2="5" />
        </svg>
      );
    case "max":
      return (
        <svg viewBox="0 0 10 10" {...common}>
          <rect x="0.5" y="0.5" width="9" height="9" />
        </svg>
      );
    case "restore":
      return (
        <svg viewBox="0 0 10 10" {...common}>
          {/* 后置矩形 */}
          <rect x="2" y="0.5" width="7.5" height="7.5" />
          {/* 前置矩形 */}
          <rect x="0.5" y="2" width="7.5" height="7.5" fill="currentColor" fillOpacity="0" />
        </svg>
      );
    case "close":
      return (
        <svg viewBox="0 0 10 10" {...common}>
          <line x1="0" y1="0" x2="10" y2="10" />
          <line x1="10" y1="0" x2="0" y2="10" />
        </svg>
      );
  }
}
