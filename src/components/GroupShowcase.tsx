import Link from "next/link";

export type GroupData = {
  id: string;
  name: string;
  members: {
    id: string;
    username: string;
    name: string;
    avatarUrl: string;
    avatarInitials: string;
  }[];
};

export function GroupShowcase({
  groups,
  accentColor,
}: {
  groups: GroupData[];
  accentColor?: string;
}) {
  if (groups.length === 0) return null;

  return (
    <>
      {groups.map((group) => (
        <section key={group.id} className="w-full flex flex-col gap-2.5">
          <div className="flex items-center gap-3 py-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30 shrink-0">
              {group.name}
            </span>
            <div className="h-px flex-1 bg-black/8 dark:bg-white/8" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {group.members.map((member) => (
              <Link
                key={member.id}
                href={`/${member.username}`}
                className="group flex flex-col items-center gap-2 rounded-xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-4 transition-all hover:border-black/15 dark:hover:border-white/15 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                style={accentColor ? { "--hover-color": accentColor } as React.CSSProperties : undefined}
              >
                <div className="h-14 w-14 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-transparent group-hover:ring-black/10 dark:group-hover:ring-white/10 transition-all"
                  style={accentColor ? { "--tw-ring-color": accentColor + "30" } as React.CSSProperties : undefined}
                >
                  {member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.avatarUrl}
                      alt={member.name || member.username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-black/30 dark:text-white/30">
                      {member.avatarInitials || member.username.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="text-center min-w-0 w-full">
                  <p className="text-sm font-medium text-black dark:text-white truncate">
                    {member.name || member.username}
                  </p>
                  <p className="text-[11px] text-black/40 dark:text-white/40 truncate">
                    @{member.username}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
