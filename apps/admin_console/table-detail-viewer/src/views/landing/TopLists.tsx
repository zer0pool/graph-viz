import React from "react";
import { TrendingUp, Activity } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { datasetsData } from "./data";

// Helper for Activity Score
const calculateActivityScore = (dataset: any) => {
  return dataset.delayed * 5 + dataset.expiring * 2 + dataset.schemaChanges * 1;
};

// Derived Data
const topCapacityDatasets = [...datasetsData]
  .sort((a, b) => b.sizeBytes - a.sizeBytes)
  .slice(0, 10);

const topActivityDatasets = [...datasetsData]
  .map((d) => ({ ...d, activityScore: calculateActivityScore(d) }))
  .sort((a, b) => b.activityScore - a.activityScore)
  .slice(0, 10);

export function TopLists() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Top Capacity */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Dataset (Capacity)</CardTitle>
          <CardDescription>Largest datasets by storage size</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topCapacityDatasets.map((dataset, index) => (
              <div key={dataset.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground w-6">
                      #{index + 1}
                    </span>
                    <span className="font-medium">{dataset.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {dataset.growth}
                    </Badge>
                    <span className="font-mono font-medium">
                      {dataset.size}
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{
                      width: `${
                        (dataset.sizeBytes / topCapacityDatasets[0].sizeBytes) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Active Datasets</CardTitle>
          <CardDescription>
            Most active datasets based on recent changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topActivityDatasets.map((dataset, index) => (
              <div
                key={dataset.name}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-muted-foreground w-6 text-sm">
                    #{index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{dataset.name}</p>
                    <div className="flex gap-2 mt-1">
                      {dataset.delayed > 0 && (
                        <span className="text-xs text-orange-600">
                          Delayed: {dataset.delayed} (×5)
                        </span>
                      )}
                      {dataset.expiring > 0 && (
                        <span className="text-xs text-yellow-600">
                          Expiring: {dataset.expiring} (×2)
                        </span>
                      )}
                      {dataset.schemaChanges > 0 && (
                        <span className="text-xs text-blue-600">
                          Schema: {dataset.schemaChanges} (×1)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="font-mono font-medium text-sm">
                      {dataset.activityScore}
                    </p>
                    <p className="text-xs text-muted-foreground">activity</p>
                  </div>
                  <Badge
                    variant={
                      dataset.activityScore > 50
                        ? "destructive"
                        : dataset.activityScore > 20
                          ? "default"
                          : "secondary"
                    }
                  >
                    <Activity className="h-3 w-3 mr-1" />
                    {dataset.activityScore > 50
                      ? "High"
                      : dataset.activityScore > 20
                        ? "Medium"
                        : "Low"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
