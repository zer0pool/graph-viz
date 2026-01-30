import React from "react";
import { useTrendsSection } from "./useTrendsSection";
import { TrendsSectionView } from "./TrendsSectionView";

export function TrendsSection() {
  const logic = useTrendsSection();

  return <TrendsSectionView {...logic} />;
}
