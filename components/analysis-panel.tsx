"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LoaderIcon } from "lucide-react";

interface Analysis {
  summary: string;
  category: string;
  priority: number;
  sentiment: string;
  duplicateIds?: string[];
}

interface AnalysisPanelProps {
  analysis: Analysis | null;
  onRunAnalysis?: () => void;
  isAnalyzing?: boolean;
}

function PriorityIndicator({ priority }: { priority: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 w-3 ${
            i < priority ? "bg-primary" : "bg-muted"
          }`}
        />
      ))}
      <span className="text-muted-foreground text-xs ml-1">
        {priority}/5
      </span>
    </div>
  );
}

export function AnalysisPanel({
  analysis,
  onRunAnalysis,
  isAnalyzing,
}: AnalysisPanelProps) {
  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {isAnalyzing ? (
            <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
              <LoaderIcon className="size-3 animate-spin" />
              Analyzing with Claude...
            </div>
          ) : (
            <>
              <p className="text-muted-foreground text-xs mb-3">
                No analysis available yet.
              </p>
              {onRunAnalysis && (
                <Button size="sm" onClick={onRunAnalysis}>
                  Run Analysis
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-muted-foreground text-xs mb-1">Summary</p>
          <p className="text-xs">{analysis.summary}</p>
        </div>
        <Separator />
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-xs">Category</p>
          <Badge variant="outline">{analysis.category}</Badge>
        </div>
        <div>
          <p className="text-muted-foreground text-xs mb-1">Priority</p>
          <PriorityIndicator priority={analysis.priority} />
        </div>
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-xs">Sentiment</p>
          <Badge variant="secondary">{analysis.sentiment}</Badge>
        </div>
        {analysis.duplicateIds && analysis.duplicateIds.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-muted-foreground text-xs mb-1">
                Potential duplicates
              </p>
              <div className="flex flex-wrap gap-1">
                {analysis.duplicateIds.map((id) => (
                  <Badge key={id} variant="outline">
                    {id}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
