import { getGroup } from "@/lib/groups";

interface Props {
  name: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export default function GroupBadge({ name, size = "md", showLabel = true }: Props) {
  const g    = getGroup(name);
  const Icon = g.Icon;

  const iconSize = size === "sm" ? 12 : size === "lg" ? 20 : 14;
  const px       = size === "sm" ? "px-2 py-0.5" : size === "lg" ? "px-3 py-1.5" : "px-2.5 py-1";
  const text     = size === "sm" ? "text-[10px]" : size === "lg" ? "text-sm" : "text-xs";

  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${px} ${text} ${g.color} ${g.bg} ${g.border}`}>
      <Icon size={iconSize} strokeWidth={2} className="flex-shrink-0" />
      {showLabel && <span>{name}</span>}
    </span>
  );
}
