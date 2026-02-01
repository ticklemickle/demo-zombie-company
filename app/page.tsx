"use client";

import React, { useEffect, useMemo, useState } from "react";
import { COLORS, RiskLevel } from "./data/types";

function colorAt(index: number) {
  return COLORS[index % COLORS.length];
}

type SeriesItem = {
  ticker: string; // "032350"
  corp_name: string;
  years: number[];
  series: Record<
    | "자산총계"
    | "부채총계"
    | "자본총계"
    | "영업활동현금흐름"
    | "투자활동현금흐름"
    | "재무활동현금흐름",
    Array<number | null>
  >;
};

type SnapshotRow = {
  ticker: string; // 6자리
  corp_name: string;
  year: number;
  total_assets: number | null;
  total_liabilities: number | null;
  equity: number | null;
  operating_cf: number | null;
  investing_cf: number | null;
  financing_cf: number | null;

  proba: number | null;
  risk_level: RiskLevel | null;
};

function formatProba(p: number) {
  if (!Number.isFinite(p)) return "-";
  return `${(p * 100).toFixed(2)}%`;
}

function pad6(ticker: string) {
  const t = (ticker ?? "").toString().trim();
  const digits = t.replace(/[^\d]/g, "");
  return digits.length >= 6 ? digits.slice(-6) : digits.padStart(6, "0");
}

function toNumber(x: string | undefined): number | null {
  if (!x) return null;
  const s = x.trim();
  if (!s) return null;
  const n = Number(s.replaceAll(",", ""));
  return Number.isFinite(n) ? n : null;
}

function formatKRW(v: number | null): string {
  if (v === null) return "-";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  // 단위는 "원"일 가능성이 높아 보기 좋게 축약
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}조`;
  if (abs >= 1e8) return `${sign}${(abs / 1e8).toFixed(1)}억`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}백만`;
  return `${sign}${abs.toLocaleString()}`;
}

function safeMinMax(series: { values: Array<number | null> }[]) {
  const all: number[] = [];
  for (const s of series)
    for (const v of s.values) if (v !== null && Number.isFinite(v)) all.push(v);
  if (!all.length) return { min: 0, max: 1 };
  const min = Math.min(...all);
  let max = Math.max(...all);
  if (min === max) max = min + 1;
  return { min, max };
}

function riskLevelFromProba(p: number | null): RiskLevel {
  if (p == null) return "주의";
  if (p >= 0.99) return "심각";
  if (p >= 0.98) return "위험";
  return "주의";
}

function RiskBadge({ stage }: { stage: RiskLevel | null }) {
  if (stage === "심각") {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-200">
        심각
      </span>
    );
  }

  if (stage === "위험") {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
        위험
      </span>
    );
  }

  if (stage === "주의") {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-800 border border-green-200">
        주의
      </span>
    );
  }

  // null / undefined
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs text-slate-400 border border-slate-200">
      -
    </span>
  );
}

function LineChart({
  title,
  subtitle,
  years,
  series,
}: {
  title: string;
  subtitle?: string;
  years: number[];
  series: { name: string; values: Array<number | null> }[];
}) {
  const { min, max } = useMemo(() => safeMinMax(series), [series]);

  const W = 900;
  const H = 260;
  const P = 30;

  function xAt(i: number) {
    const n = Math.max(1, years.length - 1);
    return P + (i / n) * (W - P * 2);
  }
  function yAt(v: number) {
    const t = (v - min) / (max - min);
    return P + (1 - t) * (H - P * 2);
  }
  function buildPath(vals: Array<number | null>) {
    let d = "";
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      if (v === null || !Number.isFinite(v)) continue;
      const x = xAt(i);
      const y = yAt(v);
      d += d ? ` L ${x} ${y}` : `M ${x} ${y}`;
    }
    return d || "";
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-soft p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="font-extrabold text-brand-950">{title}</div>
          {subtitle ? (
            <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
          ) : null}
        </div>
        <div className="text-xs text-slate-500 shrink-0">
          <div>
            범위:{" "}
            {years.length ? `${years[0]}~${years[years.length - 1]}` : "-"}
          </div>
          <div className="mt-0.5">
            최소 {formatKRW(min)} · 최대 {formatKRW(max)}
          </div>
        </div>
      </div>

      <div className="mt-4 w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto text-slate-800 sm:min-w-[640px]"
          preserveAspectRatio="xMidYMid meet"
        >
          <g opacity="0.22">
            {[0, 1, 2, 3, 4].map((k) => {
              const y = P + (k / 4) * (H - P * 2);
              return (
                <line
                  key={k}
                  x1={P}
                  y1={y}
                  x2={W - P}
                  y2={y}
                  stroke="currentColor"
                />
              );
            })}
          </g>

          <g className="text-[10px]" fill="currentColor" opacity="0.70">
            {years.map((y, i) => {
              if (years.length > 10 && i % 2 === 1) return null;
              const x = xAt(i);
              return (
                <text key={`${y}-${i}`} x={x} y={H - 8} textAnchor="middle">
                  {y}
                </text>
              );
            })}
          </g>

          {series.map((s, idx) => (
            <path
              key={s.name}
              d={buildPath(s.values)}
              fill="none"
              stroke={colorAt(idx)}
              strokeWidth={2}
              // opacity={idx === 0 ? 0.92 : 0.55}
            />
          ))}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
        {series.map((s) => (
          <span
            key={s.name}
            className="px-3 py-1 rounded-full bg-slate-50 border border-slate-200"
          >
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  desc,
  icon,
}: {
  label: string;
  value: string;
  desc: string;
  icon: string;
}) {
  return (
    <div className="min-w-0 bg-white rounded-2xl border border-slate-200 shadow-soft p-5">
      <div className="flex items-start justify-between gap-4 min-w-0">
        <div className="min-w-0">
          <div className="text-xs text-slate-500">{label}</div>
          <div className="mt-2 text-xl sm:text-2xl font-extrabold text-brand-950 truncate">
            {value}
          </div>
        </div>
        <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-brand-950 text-white flex items-center justify-center flex-shrink-0">
          <span aria-hidden="true">{icon}</span>
        </div>
      </div>
      <div className="mt-4 text-xs text-slate-500">{desc}</div>
    </div>
  );
}

export default function Page() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [seriesData, setSeriesData] = useState<SeriesItem[]>([]);
  const [snapshotRows, setSnapshotRows] = useState<SnapshotRow[]>([]);
  const [selectedTicker, setSelectedTicker] = useState<string>("");

  // Load JSON series (그래프)
  useEffect(() => {
    (async () => {
      const res = await fetch("/zombie_top30_series.json", {
        cache: "no-store",
      });
      if (!res.ok)
        throw new Error("zombie_top30_series.json을 불러오지 못했습니다.");
      const json = (await res.json()) as SeriesItem[];
      setSeriesData(json);
      setSelectedTicker(json?.[0]?.ticker ?? "");
    })().catch((e) => console.error(e));
  }, []);

  // Load CSV snapshot (테이블)
  useEffect(() => {
    (async () => {
      const res = await fetch("/zombie_top30.csv", { cache: "no-store" });
      if (!res.ok) throw new Error("zombie_top30.csv을 불러오지 못했습니다.");
      const text = await res.text();

      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return;

      const header = lines[0].split(",").map((h) => h.trim());
      const idx = (name: string) => header.indexOf(name);

      const rows: SnapshotRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",");

        const tickerRaw = cols[idx("ticker")] ?? "";
        const ticker = pad6(tickerRaw);
        const corp_name = (cols[idx("corp_name")] ?? "").trim();
        const year = Number(cols[idx("year")] ?? "0");

        const proba = toNumber(cols[idx("proba")]);

        rows.push({
          ticker,
          corp_name,
          year,
          total_assets: toNumber(cols[idx("total_assets")]),
          total_liabilities: toNumber(cols[idx("total_liabilities")]),
          equity: toNumber(cols[idx("equity")]),
          operating_cf: toNumber(cols[idx("operating_cf")]),
          investing_cf: toNumber(cols[idx("investing_cf")]),
          financing_cf: toNumber(cols[idx("financing_cf")]),

          proba,
          risk_level: riskLevelFromProba(proba), // ✅ 여기만 핵심
        });
      }

      // (ticker, year) 중복 제거
      const seen = new Set<string>();
      const dedup: SnapshotRow[] = [];
      for (const r of rows) {
        const key = `${r.ticker}-${r.year}`;
        if (seen.has(key)) continue;
        seen.add(key);
        dedup.push(r);
      }

      // JSON에 있는 30개 ticker만 사용
      const allow = new Set(seriesData.map((x) => x.ticker));
      const filtered = dedup.filter((r) => allow.has(r.ticker));

      setSnapshotRows(filtered);
    })().catch((e) => console.error(e));
  }, [seriesData]);

  const selected = useMemo(
    () => seriesData.find((x) => x.ticker === selectedTicker) ?? null,
    [seriesData, selectedTicker],
  );

  const companies = useMemo(() => {
    return [...seriesData].sort((a, b) =>
      a.corp_name.localeCompare(b.corp_name, "ko"),
    );
  }, [seriesData]);

  const overallRange = useMemo(() => {
    const ys: number[] = [];
    for (const c of seriesData) ys.push(...(c.years ?? []));
    if (!ys.length) return { min: 0, max: 0 };
    return { min: Math.min(...ys), max: Math.max(...ys) };
  }, [seriesData]);

  const latestSnapshotByTicker = useMemo(() => {
    const map = new Map<string, SnapshotRow>();
    for (const r of snapshotRows) {
      const prev = map.get(r.ticker);
      if (!prev || r.year > prev.year) map.set(r.ticker, r);
    }
    return map;
  }, [snapshotRows]);

  const tableRows = useMemo(() => {
    const out: SnapshotRow[] = [];
    for (const c of seriesData) {
      const snap = latestSnapshotByTicker.get(c.ticker);
      out.push(
        snap ?? {
          ticker: c.ticker,
          corp_name: c.corp_name,
          year: c.years?.[c.years.length - 1] ?? 0,
          total_assets: null,
          total_liabilities: null,
          equity: null,
          operating_cf: null,
          investing_cf: null,
          financing_cf: null,
          proba: null,
          risk_level: null,
        },
      );
    }
    // 선택 기업 먼저
    // out.sort((a, b) => {
    //   const sa = a.ticker === selectedTicker ? -1 : 0;
    //   const sb = b.ticker === selectedTicker ? -1 : 0;
    //   if (sa !== sb) return sa - sb;
    //   return a.corp_name.localeCompare(b.corp_name, "ko");
    // });
    return out;
  }, [seriesData, latestSnapshotByTicker, selectedTicker]);

  const latestYear = useMemo(() => {
    let max = 0;
    for (const c of seriesData)
      if (c.years?.length) max = Math.max(max, c.years[c.years.length - 1]);
    return max || 0;
  }, [seriesData]);

  const selectedLatest = useMemo(() => {
    const r = latestSnapshotByTicker.get(selectedTicker);
    return r ?? null;
  }, [latestSnapshotByTicker, selectedTicker]);

  return (
    <div className="bg-slate-50 text-slate-900 antialiased min-h-screen overflow-x-hidden">
      <div className="min-h-screen flex">
        {/* Sidebar (desktop) */}
        <aside className="w-72 hidden lg:flex flex-col bg-brand-950 text-white">
          <div className="px-6 py-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                <span className="text-lg font-black tracking-tight">FR</span>
              </div>
              <div className="min-w-0">
                <div className="font-semibold leading-tight truncate">
                  FinRisk Demo
                </div>
                <div className="text-xs text-white/60 truncate">
                  Top30 좀비 기업 리스크 관리
                </div>
              </div>
            </div>
          </div>

          <nav className="px-4 py-5 space-y-1">
            <a
              href="#dashboard"
              className="flex items-center gap-3 rounded-xl px-4 py-3 bg-white/10 border border-white/10"
            >
              <span className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center">
                📊
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">대시보드</div>
                <div className="text-xs text-white/60 truncate">
                  요약 · 추세
                </div>
              </div>
            </a>

            <a
              href="#company"
              className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-white/5 border border-transparent hover:border-white/10 transition"
            >
              <span className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center">
                🏢
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">기업 선택</div>
                <div className="text-xs text-white/60 truncate">30개 기업</div>
              </div>
            </a>

            <a
              href="#table"
              className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-white/5 border border-transparent hover:border-white/10 transition"
            >
              <span className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center">
                📄
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">
                  최신 재무 흐름
                </div>
                <div className="text-xs text-white/60 truncate">표 · CSV</div>
              </div>
            </a>
          </nav>

          <div className="mt-auto px-6 py-6 border-t border-white/10">
            <div className="text-xs text-white/60 leading-relaxed">
              이 화면은{" "}
              <span className="text-white font-semibold">
                규모(자산·부채·자본)
              </span>
              와{" "}
              <span className="text-white font-semibold">흐름(현금흐름)</span>만
              보여주는 데모 UI입니다.
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1" id="dashboard">
          {/* Top bar */}
          <header className="sticky top-0 z-20 bg-white/70 backdrop-blur border-b border-slate-200">
            <div className="mx-auto max-w-7xl px-4 lg:px-8 py-4 flex items-center gap-4 justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white"
                  onClick={() => setMobileNavOpen((v) => !v)}
                  aria-label="메뉴"
                >
                  ☰
                </button>

                <div className="min-w-0">
                  <h1 className="text-lg md:text-xl font-extrabold text-brand-950 truncate">
                    AI 기반 좀비 기업 리스크 관리 대시보드
                  </h1>
                  <p className="text-xs md:text-sm text-slate-500 truncate">
                    리스크 담당자를 위한 조기경보(EWS) · 여신심사 보조 콘솔
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-full bg-brand-900 text-white">
                  ● 좀비 기업 Risk{" "}
                  <span className="font-normal text-white/70">
                    {seriesData.length
                      ? `${seriesData.length}개 기업 관리 중`
                      : "-"}
                  </span>
                </span>
              </div>
            </div>

            {/* Mobile nav */}
            {mobileNavOpen && (
              <div className="lg:hidden border-t border-slate-200 bg-white">
                <div className="px-4 py-4 space-y-2">
                  <a
                    className="block rounded-xl px-4 py-3 bg-slate-50 border border-slate-200"
                    href="#dashboard"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    📊 대시보드
                  </a>
                  <a
                    className="block rounded-xl px-4 py-3 hover:bg-slate-50 border border-transparent hover:border-slate-200"
                    href="#company"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    🏢 기업 선택
                  </a>
                  <a
                    className="block rounded-xl px-4 py-3 hover:bg-slate-50 border border-transparent hover:border-slate-200"
                    href="#table"
                    onClick={() => setMobileNavOpen(false)}
                  >
                    📄 최신 스냅샷
                  </a>
                </div>
              </div>
            )}
          </header>

          <div className="mx-auto max-w-7xl px-4 lg:px-8 py-6 space-y-6">
            {/* KPI cards (business view) */}
            <section className="sm:grid sm:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-6">
              <div className="lg:col-span-4">
                <div
                  className="
    flex flex-row gap-3 overflow-x-auto pb-2
    sm:pb-0 sm:grid sm:grid-cols-2 sm:gap-4
    lg:grid-cols-1
  "
                >
                  <div className="min-w-[240px] sm:min-w-0">
                    <KpiCard
                      label="관심 기업"
                      value={seriesData.length ? `${seriesData.length}개` : "-"}
                      desc="선별된 Top 30 기업을 모니터링"
                      icon="🏢"
                    />
                  </div>
                  <div className="min-w-[240px] sm:min-w-0">
                    <KpiCard
                      label="데이터 기간"
                      value={
                        overallRange.min
                          ? `${overallRange.min}~${overallRange.max}`
                          : "-"
                      }
                      desc="연도별 추세를 한 눈에"
                      icon="🗓️"
                    />
                  </div>
                  <div className="min-w-[240px] sm:min-w-0">
                    <KpiCard
                      label="선택 기업"
                      value={selected ? selected.corp_name : "-"}
                      desc={
                        selected
                          ? `기업번호: ${selected.ticker}`
                          : "기업을 선택해 주세요"
                      }
                      icon="✅"
                    />
                  </div>
                </div>
              </div>
              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-soft p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-extrabold text-brand-950 truncate">
                      기업 선택
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      선택 시 아래 그래프와 표가 변경됩니다.
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-semibold text-slate-600">
                    기업
                  </label>
                  <select
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-cyan-100"
                    value={selectedTicker}
                    onChange={(e) => setSelectedTicker(e.target.value)}
                  >
                    {companies.map((c) => (
                      <option key={c.ticker} value={c.ticker}>
                        {c.corp_name} ({c.ticker})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">자산(최신)</div>
                    <div className="mt-1 font-extrabold text-slate-800">
                      {formatKRW(selectedLatest?.total_assets ?? null)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">부채(최신)</div>
                    <div className="mt-1 font-extrabold text-slate-800">
                      {formatKRW(selectedLatest?.total_liabilities ?? null)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">자본(최신)</div>
                    <div className="mt-1 font-extrabold text-slate-800">
                      {formatKRW(selectedLatest?.equity ?? null)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">영업현금(최신)</div>
                    <div className="mt-1 font-extrabold text-slate-800">
                      {formatKRW(selectedLatest?.operating_cf ?? null)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-xs text-slate-500 leading-relaxed">
                  * 단위는 원(\)
                </div>
              </div>
            </section>

            {/* Charts */}
            <section className="grid lg:grid-cols-12 gap-4">
              <div className="lg:col-span-12">
                <LineChart
                  title="재무상태 추이"
                  subtitle="자산 · 부채 · 자본"
                  years={selected?.years ?? []}
                  series={
                    selected
                      ? [
                          {
                            name: "자산총계",
                            values: selected.series["자산총계"],
                          },
                          {
                            name: "부채총계",
                            values: selected.series["부채총계"],
                          },
                          {
                            name: "자본총계",
                            values: selected.series["자본총계"],
                          },
                        ]
                      : []
                  }
                />
              </div>
              <div className="lg:col-span-12">
                <LineChart
                  title="현금흐름 추이"
                  subtitle="영업 · 투자 · 재무"
                  years={selected?.years ?? []}
                  series={
                    selected
                      ? [
                          {
                            name: "영업활동현금흐름",
                            values: selected.series["영업활동현금흐름"],
                          },
                          {
                            name: "투자활동현금흐름",
                            values: selected.series["투자활동현금흐름"],
                          },
                          {
                            name: "재무활동현금흐름",
                            values: selected.series["재무활동현금흐름"],
                          },
                        ]
                      : []
                  }
                />
              </div>
            </section>

            {/* Table */}
            <section
              id="table"
              className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden"
            >
              <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="font-extrabold text-brand-950">
                    기업별 재무 흐름
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    최신 연도 기준 요약값을 표시합니다. (행 클릭 → 기업 선택)
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href="/zombie_top30.csv"
                    className="text-xs font-semibold px-4 py-2 rounded-xl bg-brand-950 text-white hover:bg-brand-900 transition"
                  >
                    CSV 다운로드
                  </a>
                </div>
              </div>
              {/* Mobile: cards */}
              <div className="md:hidden">
                <div className="divide-y divide-slate-200">
                  {tableRows.map((r) => {
                    const isSel = r.ticker === selectedTicker;

                    const probaClass =
                      r.proba == null
                        ? "text-slate-400"
                        : r.proba >= 0.99
                          ? "text-red-700"
                          : r.proba >= 0.98
                            ? "text-amber-700"
                            : "text-green-900";

                    return (
                      <button
                        key={`${r.ticker}-${r.year}`}
                        type="button"
                        className={`w-full text-left px-4 py-4 active:scale-[0.99] transition
            ${isSel ? "bg-cyan-50/60" : "bg-white"}
          `}
                        onClick={() => {
                          setSelectedTicker(r.ticker);

                          if (window.location.hash !== "#dashboard") {
                            window.location.hash = "dashboard";
                          }

                          document.getElementById("dashboard")?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        }}
                      >
                        {/* Top row: name + badge */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-extrabold text-brand-950 truncate">
                              {r.corp_name || "-"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              티커 {r.ticker} · {r.year || "-"}년
                            </div>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-2">
                            <RiskBadge stage={r.risk_level} />
                            <div
                              className={`text-sm font-extrabold ${probaClass}`}
                            >
                              {formatProba(r.proba ?? 0)}
                            </div>
                          </div>
                        </div>

                        {/* Key metrics */}
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-[11px] text-slate-500">
                              자산
                            </div>
                            <div className="mt-1 font-extrabold text-slate-800">
                              {formatKRW(r.total_assets)}
                            </div>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-[11px] text-slate-500">
                              부채
                            </div>
                            <div className="mt-1 font-extrabold text-slate-800">
                              {formatKRW(r.total_liabilities)}
                            </div>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-[11px] text-slate-500">
                              자본
                            </div>
                            <div className="mt-1 font-extrabold text-slate-800">
                              {formatKRW(r.equity)}
                            </div>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-[11px] text-slate-500">
                              영업현금
                            </div>
                            <div className="mt-1 font-extrabold text-slate-800">
                              {formatKRW(r.operating_cf)}
                            </div>
                          </div>
                        </div>

                        {/* Hint */}
                        <div className="mt-3 text-[11px] text-slate-500">
                          탭하면 상단 그래프/요약이 이 기업으로 변경됩니다.
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Desktop/Tablet: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 border-y border-slate-200">
                    <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3  sm:px-5">기업명</th>
                      <th>좀비 확률</th>
                      <th>위험 단계</th>
                      <th className="px-5 py-3  sm:px-5">연도</th>
                      <th className="px-5 py-3  sm:px-5">자산</th>
                      <th className="px-5 py-3  sm:px-5">부채</th>
                      <th className="px-5 py-3  sm:px-5">자본</th>
                      <th className="px-5 py-3  sm:px-5">영업현금</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {tableRows.map((r) => {
                      const isSel = r.ticker === selectedTicker;
                      return (
                        <tr
                          key={`${r.ticker}-${r.year}`}
                          className={`hover:bg-slate-50 cursor-pointer ${isSel ? "bg-cyan-50/40" : ""}`}
                          onClick={() => {
                            setSelectedTicker(r.ticker);

                            // URL은 #table로 (원하면 유지)
                            if (window.location.hash !== "#dashboard") {
                              window.location.hash = "dashboard";
                            }

                            // 스크롤은 매번 강제
                            document
                              .getElementById("dashboard")
                              ?.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              });
                          }}
                        >
                          <td className="px-4 py-4 font-semibold text-brand-950">
                            {r.corp_name || "-"}
                          </td>
                          <td
                            className={`px-5 py-4 font-extrabold ${
                              r.proba == null
                                ? "text-slate-400"
                                : r.proba >= 0.99
                                  ? "text-red-700"
                                  : r.proba >= 0.98
                                    ? "text-amber-700"
                                    : "text-green-900"
                            }`}
                          >
                            {formatProba(r.proba || 0)}
                          </td>

                          <td>
                            <RiskBadge stage={r.risk_level} />
                          </td>
                          <td className="px-5 py-4">{r.year || "-"}</td>
                          <td className="px-5 py-4">
                            {formatKRW(r.total_assets)}
                          </td>
                          <td className="px-5 py-4">
                            {formatKRW(r.total_liabilities)}
                          </td>
                          <td className="px-5 py-4">{formatKRW(r.equity)}</td>
                          <td className="px-5 py-4">
                            {formatKRW(r.operating_cf)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <footer className="py-6 text-center text-xs text-slate-500 break-all px-4">
              © Data-Reference:{" "}
              <a
                className="underline"
                href="https://opendart.fss.or.kr/disclosureinfo/fnltt/dwld/main.do"
                target="_blank"
                rel="noreferrer"
              >
                https://opendart.fss.or.kr/disclosureinfo/fnltt/dwld/main.do
              </a>
              <br />
              <b>Made by andylee09@kaist.ac.kr 2026</b>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
