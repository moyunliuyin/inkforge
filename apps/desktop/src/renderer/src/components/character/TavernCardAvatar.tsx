import { useQuery } from "@tanstack/react-query";
import type { TavernCardRecord } from "@inkforge/shared";
import { tavernCardApi } from "../../lib/api";

interface TavernCardAvatarProps {
  card: TavernCardRecord;
  /** Tailwind size classes, e.g. "h-10 w-10". */
  sizeClassName: string;
  fallbackClassName?: string;
}

export function TavernCardAvatar({
  card,
  sizeClassName,
  fallbackClassName = "text-lg",
}: TavernCardAvatarProps): JSX.Element {
  const avatarQuery = useQuery({
    queryKey: ["tavernCardAvatar", card.id, card.avatarPath],
    queryFn: () => tavernCardApi.getAvatar({ id: card.id }),
    enabled: !!card.avatarPath,
    staleTime: 5 * 60 * 1000,
  });

  const base64 = avatarQuery.data?.base64;
  return (
    <div
      className={`${sizeClassName} flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-700`}
    >
      {base64 ? (
        <img
          src={`data:image/png;base64,${base64}`}
          alt={card.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className={fallbackClassName}>🎭</span>
      )}
    </div>
  );
}
