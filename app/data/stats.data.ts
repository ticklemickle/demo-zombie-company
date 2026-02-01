// app/dashboard/data/stats.data.ts
import { TopStat } from "./types";

export const TOP_STATS: TopStat[] = [
  {
    label: "총 분석 기업 수",
    value: "18,728",
    description: "전수 모니터링 대상",
    icon: "🏢",
  },
  {
    label: "우선 검토 알림",
    value: "TOP 30",
    description: "즉시 점검이 필요한 기업",
    icon: "🔥",
  },
  {
    label: "리스크 모니터링 범위",
    value: "2,637",
    description: "모니터링 중인 고유 기업 수",
    icon: "🧭",
  },
  {
    label: "경보 대응 목표(SLA)",
    value: "24h",
    description: "심각 발생 시 즉시 알림",
    icon: "⏱️",
  },
];
