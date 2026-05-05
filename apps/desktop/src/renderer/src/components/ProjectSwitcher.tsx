import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProjectRecord } from "@inkforge/shared";
import { projectApi } from "../lib/api";
import { useAppStore } from "../stores/app-store";

interface ProjectSwitcherProps {
  variant?: "titlebar" | "inline";
}

export function ProjectSwitcher({ variant = "titlebar" }: ProjectSwitcherProps): JSX.Element | null {
  const queryClient = useQueryClient();
  const currentProjectId = useAppStore((s) => s.currentProjectId);
  const setProject = useAppStore((s) => s.setProject);

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectApi.list(),
  });

  const switchProject = useMutation({
    mutationFn: async (id: string) => projectApi.open({ id }),
    onSuccess: async (project: ProjectRecord) => {
      setProject(project.id);
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      await queryClient.invalidateQueries({ queryKey: ["chapters", project.id] });
      await queryClient.invalidateQueries({ queryKey: ["world-entries", project.id] });
      await queryClient.invalidateQueries({ queryKey: ["outline-cards", project.id] });
    },
  });

  const projects = projectsQuery.data ?? [];
  if (projects.length === 0) return null;

  const baseStyle =
    variant === "titlebar"
      ? "max-w-[180px] rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[12px] text-ink-200 hover:bg-white/[0.08] focus:border-amber-500/50 focus:outline-none"
      : "max-w-xs rounded-md border border-ink-600 bg-ink-800 px-2 py-1 text-sm text-ink-200 focus:border-amber-500 focus:outline-none";

  return (
    <select
      className={baseStyle}
      value={currentProjectId ?? ""}
      onChange={(e) => switchProject.mutate(e.target.value)}
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
      title="切换项目"
    >
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
