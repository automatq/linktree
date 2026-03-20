"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { ReactionBar, useReactions } from "@/components/ReactionBar";

type PollOption = {
  id: string;
  text: string;
  votes: number;
};

type Poll = {
  id: string;
  question: string;
  multipleChoice: boolean;
  endsAt: string | null;
  createdAt: string;
  totalVoters: number;
  userVotes: string[];
  options: PollOption[];
};

function timeLeft(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return `${Math.ceil(diff / 60000)}m left`;
  if (hrs < 24) return `${hrs}h left`;
  const days = Math.floor(hrs / 24);
  return `${days}d left`;
}

function PollItem({ poll, username, accentColor }: { poll: Poll; username: string; accentColor?: string }) {
  const { isSignedIn } = useUser();
  const [options, setOptions] = useState(poll.options);
  const [userVotes, setUserVotes] = useState<string[]>(poll.userVotes);
  const [totalVoters, setTotalVoters] = useState(poll.totalVoters);
  const [voting, setVoting] = useState(false);

  const hasVoted = userVotes.length > 0;
  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);
  const ended = poll.endsAt ? new Date(poll.endsAt).getTime() <= Date.now() : false;
  const showResults = hasVoted || ended;

  async function vote(optionId: string) {
    if (voting || ended) return;
    setVoting(true);
    try {
      const res = await fetch(`/api/polls/${username}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: poll.id, optionId }),
      });
      const d = await res.json();
      if (!res.ok) return;

      if (d.action === "voted") {
        // Add vote
        setOptions((prev) => prev.map((o) => o.id === optionId ? { ...o, votes: o.votes + 1 } : o));
        if (!poll.multipleChoice) {
          // Replace previous vote
          const prevVote = userVotes[0];
          if (prevVote) {
            setOptions((prev) => prev.map((o) => o.id === prevVote ? { ...o, votes: Math.max(0, o.votes - 1) } : o));
          }
          setUserVotes([optionId]);
        } else {
          setUserVotes((prev) => [...prev, optionId]);
        }
        if (!hasVoted) setTotalVoters((v) => v + 1);
      } else if (d.action === "removed") {
        // Remove vote
        setOptions((prev) => prev.map((o) => o.id === optionId ? { ...o, votes: Math.max(0, o.votes - 1) } : o));
        const newVotes = userVotes.filter((v) => v !== optionId);
        setUserVotes(newVotes);
        if (newVotes.length === 0) setTotalVoters((v) => Math.max(0, v - 1));
      }
    } finally {
      setVoting(false);
    }
  }

  return (
    <div className="rounded-xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-4 flex flex-col gap-3">
      {/* Question */}
      <p className="text-sm font-medium text-black dark:text-white leading-relaxed">
        {poll.question}
      </p>

      {/* Options */}
      <div className="flex flex-col gap-1.5">
        {options.map((option) => {
          const isSelected = userVotes.includes(option.id);
          const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;

          return showResults ? (
            /* Results view */
            <button
              key={option.id}
              onClick={() => !ended && isSignedIn && vote(option.id)}
              disabled={voting || ended || !isSignedIn}
              className="relative w-full rounded-lg overflow-hidden text-left transition-all group disabled:cursor-default"
            >
              {/* Background bar */}
              <div
                className="absolute inset-0 rounded-lg transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: isSelected
                    ? (accentColor || "#000") + "20"
                    : "rgba(0,0,0,0.04)",
                }}
              />
              <div className="relative flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  {isSelected && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentColor || "#000"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  <span className={`text-sm ${isSelected ? "font-medium" : ""} text-black dark:text-white truncate`}>
                    {option.text}
                  </span>
                </div>
                <span className="text-xs text-black/40 dark:text-white/40 shrink-0 ml-2 tabular-nums">
                  {pct}%
                </span>
              </div>
            </button>
          ) : (
            /* Voting view */
            <button
              key={option.id}
              onClick={() => isSignedIn && vote(option.id)}
              disabled={voting || !isSignedIn}
              className="w-full rounded-lg border border-black/8 dark:border-white/8 px-3 py-2.5 text-left text-sm text-black dark:text-white transition-all hover:border-black/20 dark:hover:border-white/20 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] disabled:opacity-50 disabled:cursor-default"
            >
              {option.text}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-black/30 dark:text-white/30">
          {totalVoters} {totalVoters === 1 ? "vote" : "votes"}
          {poll.multipleChoice && " · select multiple"}
        </span>
        <div className="flex items-center gap-2">
          {poll.endsAt && (
            <span className="text-[10px] text-black/30 dark:text-white/30">
              {timeLeft(poll.endsAt)}
            </span>
          )}
          {!isSignedIn && !hasVoted && !ended && (
            <Link
              href="/sign-in"
              className="text-[11px] font-medium text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white transition-colors"
            >
              Sign in to vote
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function PollSection({
  username,
  accentColor,
}: {
  username: string;
  accentColor?: string;
}) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/polls/${username}`)
      .then((r) => r.json())
      .then((d) => { setPolls(d.polls || []); setLoaded(true); });
  }, [username]);

  const reactionData = useReactions(username, "poll", polls.map((p) => p.id));

  if (!loaded || polls.length === 0) return null;

  return (
    <section className="w-full flex flex-col gap-3">
      <div className="flex items-center gap-3 py-1">
        <div className="flex items-center gap-2 shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black/30 dark:text-white/30">
            <path d="M18 20V10" />
            <path d="M12 20V4" />
            <path d="M6 20v-6" />
          </svg>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30">
            Polls
          </span>
        </div>
        <div className="h-px flex-1 bg-black/8 dark:bg-white/8" />
      </div>

      {polls.map((poll) => (
        <div key={poll.id} className="flex flex-col gap-1">
          <PollItem poll={poll} username={username} accentColor={accentColor} />
          <div className="pl-2">
            <ReactionBar
              username={username}
              targetType="poll"
              targetId={poll.id}
              initialData={reactionData[poll.id]}
              accentColor={accentColor}
            />
          </div>
        </div>
      ))}
    </section>
  );
}
