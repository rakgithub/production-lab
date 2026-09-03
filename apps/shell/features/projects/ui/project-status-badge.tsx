import { Badge } from "@repo/ui/components/badge";

import type { ProjectStatus } from "../model/project";

type ProjectStatusBadgeProps = {
  status: ProjectStatus;
};

const statusPresentation = {
  ACTIVE: { label: "Active", variant: "default" },
  PLANNED: { label: "Planned", variant: "secondary" },
  PAUSED: { label: "Paused", variant: "outline" },
} as const;

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const presentation = statusPresentation[status];

  return <Badge variant={presentation.variant}>{presentation.label}</Badge>;
}
