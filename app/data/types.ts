// app/dashboard/data/types.ts

export type RiskLevel = "심각" | "위험" | "주의";

export type TopStat = {
  label: string;
  value: string | number;
  description: string;
  icon: string;
};

export const COLORS = [
  "#4E79A7", // blue
  "#F28E2B", // orange
  "#E15759", // red
  "#76B7B2", // teal
  "#59A14F", // green
  "#EDC948", // yellow
  "#B07AA1", // purple
  "#FF9DA7", // pink
  "#9C755F", // brown
  "#BAB0AC", // gray
];
