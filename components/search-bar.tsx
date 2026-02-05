"use client";

import { useState, useEffect, useRef } from "react";
import { useAction, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SearchIcon } from "lucide-react";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    Array<{
      _id: string;
      type: "issue" | "pr";
      title: string;
      number: number;
      owner: string;
      repo: string;
    }>
  >([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchSimilar = useAction(api.ai.searchSimilar);
  const repos = useQuery(api.repositories.listRepos);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || !repos || repos.length === 0) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Search across all repos
        const allResults: typeof results = [];
        for (const repo of repos) {
          const res = await searchSimilar({
            repositoryId: repo._id,
            query: query.trim(),
          });
          for (const issue of res.issues) {
            allResults.push({
              _id: issue._id,
              type: "issue",
              title: "",
              number: 0,
              owner: repo.owner,
              repo: repo.repo,
            });
          }
          for (const pr of res.pullRequests) {
            allResults.push({
              _id: pr._id,
              type: "pr",
              title: "",
              number: 0,
              owner: repo.owner,
              repo: repo.repo,
            });
          }
        }
        setResults(allResults);
        setIsOpen(allResults.length > 0);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, repos, searchSimilar]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <SearchIcon className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search issues & PRs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          className="pl-7"
        />
      </div>
      {isSearching && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full border border-border bg-popover ring-1 ring-foreground/10 rounded-none shadow-md p-3">
          <p className="text-muted-foreground text-xs">Searching...</p>
        </div>
      )}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full border border-border bg-popover ring-1 ring-foreground/10 rounded-none shadow-md">
          {results.map((result) => (
            <button
              key={result._id}
              onClick={() => {
                setIsOpen(false);
                setQuery("");
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/50 transition-colors"
            >
              <Badge variant="outline" className="shrink-0">
                {result.type === "issue" ? "Issue" : "PR"}
              </Badge>
              <span className="text-muted-foreground">
                {result.owner}/{result.repo}
              </span>
              <span className="truncate">{result._id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
