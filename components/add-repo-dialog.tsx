"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PlusIcon } from "lucide-react";

export function AddRepoDialog() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const addRepo = useMutation(api.repositories.addRepo);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    const parts = trimmed.split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      setError("Enter a valid owner/repo format");
      return;
    }
    const [owner, repo] = parts;
    try {
      await addRepo({ owner, repo });
      setValue("");
      setError("");
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add repository");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm">
          <PlusIcon />
          Add Repository
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Add Repository</AlertDialogTitle>
          <AlertDialogDescription>
            Enter a GitHub repository in owner/repo format.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 px-0">
          <Label htmlFor="repo-input" className="text-xs">
            Repository
          </Label>
          <Input
            id="repo-input"
            placeholder="owner/repo"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setValue(""); setError(""); }}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit}>Add</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
