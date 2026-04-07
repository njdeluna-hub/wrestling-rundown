"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Download, GripVertical, Mic2, Plus, Printer, Save, Swords, Users } from "lucide-react";

/*
Manual test cases:
1. Create a new show and switch to it.
2. Add a match and change Match Type; side groups should update.
3. Set Finish to Interference; Interference Talent should appear only then.
4. Drag segments to reorder; Print tab should match the new order.
5. Print tab Notes column should include Type and Ref.
6. Last segment should be highlighted as Main Event.
7. Talent music link should open or download depending on link type.
*/

// GROUP 1: TYPES + CONSTANTS
const STORAGE_KEY = "wrestling-rundown-builder-v10";
const SEGMENT_TYPES = ["Match", "Promo", "Backstage"] as const;
const MATCH_TYPES = [
  "Singles",
  "Tag Team",
  "Trios",
  "Triple Threat",
  "Fatal 4 Way",
  "Battle Royale",
  "Tag Team Scramble",
  "3 Way Tag",
  "4 Way Tag",
  "Scramble",
] as const;
const FINISHES = ["Pinfall", "Submission", "DQ", "Interference", "No Contest"] as const;
const STORIES = ["Feud", "Title", "#1 Contender", "Tournament", "Debut"] as const;
const TALENT_ROLES = ["Wrestler", "Manager", "Interviewer", "GM", "Announcer", "Commentator", "Referee"] as const;

type SegmentType = (typeof SEGMENT_TYPES)[number];
type MatchType = (typeof MATCH_TYPES)[number];
type FinishType = (typeof FINISHES)[number];
type StoryType = (typeof STORIES)[number];
type TalentRole = (typeof TALENT_ROLES)[number];

type Talent = {
  id: string;
  name: string;
  realName: string;
  role: TalentRole;
  email: string;
  phone: string;
  musicUrl: string;
};

type Segment = {
  id: string;
  title: string;
  type: SegmentType;
  duration: number;
  matchType: MatchType;
  finish: FinishType;
  story: StoryType;
  ref: string;
  sides: string[][];
  winners: string[];
  interferenceTalentIds: string[];
  participants: string[];
  notes: string;
};

type ShowRecord = {
  id: string;
  title: string;
  venue: string;
  callTime: string;
  announcerId: string;
  commentatorIds: string[];
  segments: Segment[];
};

type RundownDb = {
  talentPool: Talent[];
  shows: ShowRecord[];
};

// GROUP 2: DEFAULT DATA
const EMPTY_SEGMENT: Segment = {
  id: "",
  title: "",
  type: "Match",
  duration: 10,
  matchType: "Singles",
  finish: "Pinfall",
  story: "Feud",
  ref: "",
  sides: [[], []],
  winners: [],
  interferenceTalentIds: [],
  participants: [],
  notes: "",
};

const EMPTY_TALENT: Talent = {
  id: "",
  name: "",
  realName: "",
  role: "Wrestler",
  email: "",
  phone: "",
  musicUrl: "",
};

const STARTER_TALENT: Talent[] = [
  { id: "t1", name: "Ace Atlas", realName: "James Carter", role: "Wrestler", email: "ace@example.com", phone: "", musicUrl: "" },
  { id: "t2", name: "Rosa Riot", realName: "Maria Flores", role: "Wrestler", email: "rosa@example.com", phone: "", musicUrl: "" },
  { id: "t3", name: "Mr. Vale", realName: "Victor Vale", role: "GM", email: "vale@example.com", phone: "", musicUrl: "" },
  { id: "t4", name: "Kelly Cross", realName: "Kelly Cross", role: "Announcer", email: "kelly@example.com", phone: "", musicUrl: "" },
  { id: "t5", name: "Dean Harper", realName: "Dean Harper", role: "Commentator", email: "dean@example.com", phone: "", musicUrl: "" },
  { id: "t6", name: "Ref A", realName: "Alex Reed", role: "Referee", email: "refa@example.com", phone: "", musicUrl: "" },
  { id: "t7", name: "Titan King", realName: "Derrick King", role: "Wrestler", email: "titan@example.com", phone: "", musicUrl: "" },
  { id: "t8", name: "Nova Blaze", realName: "Sara Blaze", role: "Wrestler", email: "nova@example.com", phone: "", musicUrl: "" },
  { id: "t9", name: "Crimson Wolf", realName: "Luis Vega", role: "Wrestler", email: "crimson@example.com", phone: "", musicUrl: "" },
  { id: "t10", name: "Static Prince", realName: "Owen Price", role: "Wrestler", email: "static@example.com", phone: "", musicUrl: "" },
  { id: "t11", name: "Mara Quinn", realName: "Mara Quinn", role: "Commentator", email: "mara@example.com", phone: "", musicUrl: "" },
  { id: "t12", name: "Paul Ember", realName: "Paul Ember", role: "Commentator", email: "paul@example.com", phone: "", musicUrl: "" },
];

function createStarterShow(): ShowRecord {
  return {
    id: "show-1",
    title: "My Show",
    venue: "",
    callTime: "",
    announcerId: "t4",
    commentatorIds: ["t5"],
    segments: [
      {
        id: "s1",
        title: "Opening Promo",
        type: "Promo",
        duration: 10,
        matchType: "Singles",
        finish: "Pinfall",
        story: "Feud",
        ref: "",
        sides: [[], []],
        winners: [],
        interferenceTalentIds: [],
        participants: ["t3", "t1"],
        notes: "GM and top babyface open the show.",
      },
      {
        id: "s2",
        title: "Ace Atlas vs Rosa Riot vs Titan King vs Nova Blaze",
        type: "Match",
        duration: 12,
        matchType: "Fatal 4 Way",
        finish: "Pinfall",
        story: "#1 Contender",
        ref: "t6",
        sides: [["t1"], ["t2"], ["t7"], ["t8"]],
        winners: ["t1"],
        interferenceTalentIds: [],
        participants: [],
        notes: "Strong opener.",
      },
    ],
  };
}

function createInitialDb(): RundownDb {
  return { talentPool: STARTER_TALENT, shows: [createStarterShow()] };
}

// GROUP 3: HELPERS
function makeId(prefix = "id") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function moveItem<T>(list: T[], from: number, to: number) {
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function toggleInArray(arr: string[], value: string, maxItems?: number) {
  const next = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
  return typeof maxItems === "number" ? next.slice(0, maxItems) : next;
}

function uniqueArray(arr: string[]) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getMatchTypeConfig(matchType: MatchType) {
  switch (matchType) {
    case "Singles": return { sideCount: 2, perSide: 1, label: "2 Singles Competitors", sideBaseLabel: "Side" };
    case "Tag Team": return { sideCount: 2, perSide: 2, label: "2 Teams Of 2", sideBaseLabel: "Side" };
    case "Trios": return { sideCount: 2, perSide: 3, label: "2 Teams Of 3", sideBaseLabel: "Side" };
    case "Triple Threat": return { sideCount: 3, perSide: 1, label: "3 Singles Competitors", sideBaseLabel: "Side" };
    case "Fatal 4 Way": return { sideCount: 4, perSide: 1, label: "4 Singles Competitors", sideBaseLabel: "Side" };
    case "Battle Royale": return { sideCount: 1, perSide: 20, label: "1 Large Field", sideBaseLabel: "Entrants" };
    case "Tag Team Scramble": return { sideCount: 5, perSide: 2, label: "5 Teams Of 2", sideBaseLabel: "Side" };
    case "3 Way Tag": return { sideCount: 3, perSide: 2, label: "3 Teams Of 2", sideBaseLabel: "Side" };
    case "4 Way Tag": return { sideCount: 4, perSide: 2, label: "4 Teams Of 2", sideBaseLabel: "Side" };
    case "Scramble": return { sideCount: 6, perSide: 1, label: "6 Singles Competitors", sideBaseLabel: "Side" };
  }
}

function normalizeSides(sides: string[][], matchType: MatchType) {
  const config = getMatchTypeConfig(matchType);
  return Array.from({ length: config.sideCount }, (_, index) => {
    const existing = Array.isArray(sides[index]) ? sides[index] : [];
    return existing.filter(Boolean).slice(0, config.perSide);
  });
}

function formatClockMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

function getSegmentAccentClasses(type: SegmentType) {
  switch (type) {
    case "Match":
      return { card: "border-l-4 border-l-red-600 bg-red-50/50", badge: "bg-red-100 text-red-900 border-red-200", row: "bg-red-50/40" };
    case "Promo":
      return { card: "border-l-4 border-l-blue-600 bg-blue-50/50", badge: "bg-blue-100 text-blue-900 border-blue-200", row: "bg-blue-50/40" };
    case "Backstage":
      return { card: "border-l-4 border-l-amber-600 bg-amber-50/50", badge: "bg-amber-100 text-amber-900 border-amber-200", row: "bg-amber-50/40" };
  }
}

function getGoogleDriveFileId(url: string) {
  const match = url.match(/\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
  return match?.[1] || "";
}

function getMusicAction(url: string) {
  if (!url) return null as null | { href: string; label: string; download: boolean };
  if (/drive\.google\.com/i.test(url)) {
    const fileId = getGoogleDriveFileId(url);
    return { href: fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : url, label: fileId ? "Download Music" : "Open Music", download: Boolean(fileId) };
  }
  if (/youtube\.com|youtu\.be/i.test(url)) return { href: url, label: "Open Music", download: false };
  return { href: url, label: "Open Music", download: false };
}

// GROUP 4: UI HELPERS
function SectionCard({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{title}</CardTitle>
        {actions}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function MultiSelect({ label, values, options, onToggle, getLabel, placeholder }: { label: string; values: string[]; options: { id: string }[]; onToggle: (id: string) => void; getLabel: (option: any) => string; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      <Select onValueChange={onToggle}>
        <SelectTrigger className="h-11 text-base"><SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {values.includes(option.id) ? "✓ " : ""}
              {getLabel(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex flex-wrap gap-2">
        {values.length > 0 ? values.map((id) => {
          const option = options.find((o) => o.id === id);
          return <button key={id} type="button" className="rounded bg-gray-200 px-2 py-1 text-sm" onClick={() => onToggle(id)}>{option ? getLabel(option) : id} ✕</button>;
        }) : <span className="text-sm text-gray-500">None</span>}
      </div>
    </div>
  );
}

function MatchSidesEditor({ segment, wrestlers, onChange }: { segment: Segment; wrestlers: Talent[]; onChange: (segment: Segment) => void }) {
  const config = getMatchTypeConfig(segment.matchType);
  const baseLabel = config.sideBaseLabel;
  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">Layout: {config.label}. Limit {config.perSide} Per {config.sideCount === 1 ? "Group" : "Side"}.</div>
      <div className="grid gap-4 md:grid-cols-2">
        {segment.sides.map((side, sideIndex) => {
          const otherIds = uniqueArray(segment.sides.flatMap((group, i) => (i === sideIndex ? [] : group)));
          const availableOptions = wrestlers.filter((w) => !otherIds.includes(w.id) || side.includes(w.id));
          return (
            <MultiSelect
              key={`${segment.matchType}-${sideIndex}`}
              label={`${baseLabel} ${sideIndex + 1}`}
              values={side}
              options={availableOptions}
              onToggle={(id) => {
                const nextSides = segment.sides.map((group, i) => (i !== sideIndex ? group : toggleInArray(group, id, config.perSide)));
                const validWinnerIds = uniqueArray(nextSides.flat());
                onChange({ ...segment, sides: nextSides, winners: segment.winners.filter((winnerId) => validWinnerIds.includes(winnerId)) });
              }}
              getLabel={(option) => option.name}
              placeholder={`Select ${baseLabel.toLowerCase()} ${sideIndex + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function PrintRundownTable({ show, participantText, winnerText, interferenceText, nameOf, totalRuntime }: { show: ShowRecord; participantText: (seg: Segment) => string; winnerText: (seg: Segment) => string; interferenceText: (seg: Segment) => string; nameOf: (id: string) => string; totalRuntime: number }) {
  let runningMinute = 0;
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <div className="text-2xl font-bold tracking-tight">{show.title}</div>
        <div className="mt-2 grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-5">
          <div><span className="font-semibold">Venue:</span> {show.venue || "TBD"}</div>
          <div><span className="font-semibold">Call Time:</span> {show.callTime || "TBD"}</div>
          <div><span className="font-semibold">Announcer:</span> {nameOf(show.announcerId) || "TBD"}</div>
          <div><span className="font-semibold">Commentators:</span> {show.commentatorIds.map(nameOf).filter(Boolean).join(", ") || "TBD"}</div>
          <div><span className="font-semibold">Runtime:</span> {totalRuntime} Min</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[1100px] border-collapse text-sm print:min-w-0">
          <thead>
            <tr className="border-b bg-gray-100 text-left">
              <th className="px-3 py-3 font-semibold">#</th>
              <th className="px-3 py-3 font-semibold">Clock</th>
              <th className="px-3 py-3 font-semibold">Length</th>
              <th className="px-3 py-3 font-semibold">Segment</th>
              <th className="px-3 py-3 font-semibold">Type</th>
              <th className="px-3 py-3 font-semibold">Talent</th>
              <th className="px-3 py-3 font-semibold">Finish / Winner</th>
              <th className="px-3 py-3 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody>
            {show.segments.map((seg, index) => {
              const startClock = formatClockMinutes(runningMinute);
              const duration = Number(seg.duration) || 0;
              runningMinute += duration;
              const isMainEvent = index === show.segments.length - 1;
              const accent = getSegmentAccentClasses(seg.type);
              const finishSummary = seg.type === "Match" ? `${seg.finish}${seg.finish === "Interference" ? ` | Interference: ${interferenceText(seg)}` : ""} | Winner: ${winnerText(seg)}` : "—";
              const notesCombined = [`Type: ${seg.type}${seg.type === "Match" ? ` (${seg.matchType})` : ""}`, seg.ref ? `Ref: ${nameOf(seg.ref)}` : null, seg.notes || null].filter(Boolean).join(" | ");
              return (
                <tr key={seg.id} className={`border-b align-top ${accent.row} ${isMainEvent ? "ring-2 ring-black/70" : ""}`}>
                  <td className="px-3 py-3 font-medium">{index + 1}</td>
                  <td className="px-3 py-3">{startClock}</td>
                  <td className="px-3 py-3">{duration} Min</td>
                  <td className="px-3 py-3 font-medium">{seg.title}{isMainEvent ? <div className="mt-1 text-xs font-bold uppercase tracking-wide">Main Event</div> : null}</td>
                  <td className="px-3 py-3">{seg.type === "Match" ? `${seg.type} - ${seg.matchType}` : seg.type}</td>
                  <td className="px-3 py-3">{participantText(seg)}</td>
                  <td className="px-3 py-3">{finishSummary}</td>
                  <td className="px-3 py-3 whitespace-pre-wrap">{notesCombined || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// GROUP 5: APP
export default function WrestlingRundownBuilderApp() {
  const [db, setDb] = useState<RundownDb>(createInitialDb());
  const [currentShowId, setCurrentShowId] = useState("show-1");
  const [draft, setDraft] = useState<Segment>({ ...EMPTY_SEGMENT, ref: "t6", sides: normalizeSides(EMPTY_SEGMENT.sides, EMPTY_SEGMENT.matchType) });
  const [talentDraft, setTalentDraft] = useState<Talent>({ ...EMPTY_TALENT });
  const [newShowTitle, setNewShowTitle] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.shows?.length && parsed?.talentPool?.length) {
        setDb(parsed);
        setCurrentShowId(parsed.shows[0].id);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch {}
  }, [db]);

  const talentPool = db.talentPool;
  const currentShow = db.shows.find((show) => show.id === currentShowId) || db.shows[0];
  const wrestlers = useMemo(() => talentPool.filter((t) => t.role === "Wrestler"), [talentPool]);
  const referees = useMemo(() => talentPool.filter((t) => t.role === "Referee"), [talentPool]);
  const announcers = useMemo(() => talentPool.filter((t) => t.role === "Announcer"), [talentPool]);
  const commentators = useMemo(() => talentPool.filter((t) => t.role === "Commentator"), [talentPool]);
  const nameOf = (id: string) => talentPool.find((t) => t.id === id)?.name || "";
  const labelOf = (talent: Talent) => `${talent.name}${talent.role ? ` (${talent.role})` : ""}`;
  const totalRuntime = useMemo(() => currentShow.segments.reduce((sum, seg) => sum + (Number(seg.duration) || 0), 0), [currentShow.segments]);
  const eligibleWinnerOptions = (seg: Segment) => seg.type !== "Match" ? [] as Talent[] : wrestlers.filter((w) => uniqueArray(seg.sides.flat()).includes(w.id));
  const eligibleInterferenceOptions = talentPool.filter((t) => t.role !== "Referee");
  const participantText = (seg: Segment) => seg.type === "Match" ? seg.sides.map((side) => side.map(nameOf).filter(Boolean).join(" / ") || "TBD").join(" Vs ") : seg.participants.map(nameOf).filter(Boolean).join(", ") || "TBD";
  const winnerText = (seg: Segment) => seg.winners.map(nameOf).filter(Boolean).join(" / ") || "TBD";
  const interferenceText = (seg: Segment) => (seg.interferenceTalentIds || []).map(nameOf).filter(Boolean).join(", ") || "TBD";

  const updateCurrentShow = (patch: Partial<ShowRecord>) => setDb((prev) => ({ ...prev, shows: prev.shows.map((show) => (show.id === currentShow.id ? { ...show, ...patch } : show)) }));
  const updateSegments = (updater: Segment[] | ((prev: Segment[]) => Segment[])) => setDb((prev) => ({ ...prev, shows: prev.shows.map((show) => show.id !== currentShow.id ? show : { ...show, segments: typeof updater === "function" ? updater(show.segments) : updater }) }));

  const addSegment = () => {
    if (!draft.title.trim()) return;
    updateSegments((prev) => [...prev, { ...draft, id: makeId("segment"), sides: normalizeSides(draft.sides, draft.matchType), interferenceTalentIds: draft.finish === "Interference" ? draft.interferenceTalentIds : [] }]);
    setDraft({ ...EMPTY_SEGMENT, ref: referees[0]?.id || "", sides: normalizeSides(EMPTY_SEGMENT.sides, EMPTY_SEGMENT.matchType) });
  };

  const updateSegment = (id: string, patch: Partial<Segment>) => {
    updateSegments((prev) => prev.map((seg) => {
      if (seg.id !== id) return seg;
      const next = { ...seg, ...patch } as Segment;
      if (next.type === "Match") {
        next.sides = normalizeSides(next.sides || [], next.matchType);
        const validWinnerIds = uniqueArray(next.sides.flat());
        next.winners = (next.winners || []).filter((winnerId) => validWinnerIds.includes(winnerId));
        if (next.finish !== "Interference") next.interferenceTalentIds = [];
      }
      return next;
    }));
  };

  const addTalent = () => {
    if (!talentDraft.name.trim()) return;
    setDb((prev) => ({ ...prev, talentPool: [...prev.talentPool, { ...talentDraft, id: makeId("talent") }] }));
    setTalentDraft({ ...EMPTY_TALENT });
  };

  const updateTalent = (id: string, patch: Partial<Talent>) => setDb((prev) => ({ ...prev, talentPool: prev.talentPool.map((talent) => (talent.id === id ? { ...talent, ...patch } : talent)) }));

  const createShow = () => {
    const title = newShowTitle.trim() || `New Show ${db.shows.length + 1}`;
    const newShow: ShowRecord = { id: makeId("show"), title, venue: "", callTime: "", announcerId: announcers[0]?.id || "", commentatorIds: commentators.slice(0, 1).map((c) => c.id), segments: [] };
    setDb((prev) => ({ ...prev, shows: [...prev.shows, newShow] }));
    setCurrentShowId(newShow.id);
    setNewShowTitle("");
  };

  const saveDb = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch {} };

  const exportRundown = () => {
    const commentatorNames = currentShow.commentatorIds.map(nameOf).filter(Boolean).join(", ") || "TBD";
    const text = [
      currentShow.title,
      `Venue: ${currentShow.venue || "TBD"}`,
      `Call Time: ${currentShow.callTime || "TBD"}`,
      `Announcer: ${nameOf(currentShow.announcerId) || "TBD"}`,
      `Commentators: ${commentatorNames}`,
      `Runtime: ${totalRuntime} Min`,
      "",
      ...currentShow.segments.map((seg, index) => {
        const matchMeta = seg.type === "Match" ? ` | ${seg.matchType}` : "";
        const refLine = seg.ref ? `\nReferee: ${nameOf(seg.ref)}` : "";
        const matchLines = seg.type === "Match" ? `\nWinner: ${winnerText(seg)}\nFinish: ${seg.finish}` : "";
        const interferenceLine = seg.type === "Match" && seg.finish === "Interference" ? `\nInterference Talent: ${interferenceText(seg)}` : "";
        return `${index + 1}. ${seg.title} | ${seg.type}${matchMeta} | ${seg.story}\nTalent: ${participantText(seg)}${refLine}${matchLines}${interferenceLine}\nNotes: ${seg.notes || ""}`;
      }),
    ].join("\n\n");
    downloadText(`${currentShow.title.toLowerCase().replace(/\s+/g, "-")}-rundown.txt`, text);
  };

  return (
    <div className="min-h-screen bg-white p-6 text-black">
      <div className="mx-auto max-w-7xl space-y-6">
        <SectionCard title="Shows" actions={<Button variant="outline" onClick={saveDb}><Save className="mr-2 h-4 w-4" />Save Database</Button>}>
          <div className="grid gap-4 md:grid-cols-[1fr_220px_160px]">
            <Input value={newShowTitle} onChange={(e) => setNewShowTitle(e.target.value)} placeholder="New Show Title" />
            <Select value={currentShowId} onValueChange={setCurrentShowId}>
              <SelectTrigger className="h-11 text-base"><SelectValue placeholder="Select Show" /></SelectTrigger>
              <SelectContent>{db.shows.map((show) => <SelectItem key={show.id} value={show.id}>{show.title}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={createShow}><Plus className="mr-2 h-4 w-4" />Add Show</Button>
          </div>
        </SectionCard>

        <SectionCard title="Show Setup">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2"><label className="block text-sm font-medium">Show Title</label><Input value={currentShow.title} onChange={(e) => updateCurrentShow({ title: e.target.value })} placeholder="Show Title" className="text-lg" /></div>
            <div className="space-y-2"><label className="block text-sm font-medium">Venue</label><Input value={currentShow.venue} onChange={(e) => updateCurrentShow({ venue: e.target.value })} placeholder="Venue" className="text-lg" /></div>
            <div className="space-y-2"><label className="block text-sm font-medium">Call Time</label><Input value={currentShow.callTime || ""} onChange={(e) => updateCurrentShow({ callTime: e.target.value })} placeholder="Call Time" className="text-lg" /></div>
            <div className="space-y-2"><label className="block text-sm font-medium">Announcer</label><Select value={currentShow.announcerId} onValueChange={(value) => updateCurrentShow({ announcerId: value })}><SelectTrigger className="h-11 text-base"><SelectValue placeholder="Announcer" /></SelectTrigger><SelectContent>{announcers.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <MultiSelect label="Commentators" values={currentShow.commentatorIds} options={commentators} onToggle={(id) => updateCurrentShow({ commentatorIds: toggleInArray(currentShow.commentatorIds, id, 3) })} getLabel={(option) => option.name} placeholder="Select Commentators" />
          <div className="flex items-center justify-between gap-4 flex-wrap"><div className="text-lg font-semibold">Total Runtime: {totalRuntime} Min</div><Button onClick={exportRundown}><Download className="mr-2 h-4 w-4" />Download Rundown</Button></div>
        </SectionCard>

        <Tabs defaultValue="rundown" className="space-y-6">
          <TabsList><TabsTrigger value="rundown">Rundown</TabsTrigger><TabsTrigger value="talent">Talent Pool</TabsTrigger><TabsTrigger value="print">Print</TabsTrigger></TabsList>

          <TabsContent value="rundown" className="space-y-6">
            <SectionCard title="Add Segment">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><label className="block text-sm font-medium">Segment Title</label><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Segment Title" /></div>
                <div className="space-y-2"><label className="block text-sm font-medium">Segment Type</label><Select value={draft.type} onValueChange={(value: SegmentType) => setDraft((prev) => ({ ...prev, type: value, participants: value === "Promo" ? ["t3", "t1"] : prev.participants }))}><SelectTrigger className="h-11 text-base"><SelectValue /></SelectTrigger><SelectContent>{SEGMENT_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><label className="block text-sm font-medium">Duration</label><Input type="number" value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: Number(e.target.value) || 0 })} placeholder="Duration" /></div>
                <div className="space-y-2"><label className="block text-sm font-medium">Storyline Tag</label><Select value={draft.story} onValueChange={(value: StoryType) => setDraft({ ...draft, story: value })}><SelectTrigger className="h-11 text-base"><SelectValue /></SelectTrigger><SelectContent>{STORIES.map((story) => <SelectItem key={story} value={story}>{story}</SelectItem>)}</SelectContent></Select></div>
              </div>
              {draft.type === "Match" ? (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2"><label className="block text-sm font-medium">Match Type</label><Select value={draft.matchType} onValueChange={(value: MatchType) => setDraft((prev) => ({ ...prev, matchType: value, sides: normalizeSides(prev.sides || [], value), winners: [], interferenceTalentIds: [] }))}><SelectTrigger className="h-11 text-base"><SelectValue /></SelectTrigger><SelectContent>{MATCH_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><label className="block text-sm font-medium">Referee</label><Select value={draft.ref} onValueChange={(value) => setDraft({ ...draft, ref: value })}><SelectTrigger className="h-11 text-base"><SelectValue placeholder="Referee" /></SelectTrigger><SelectContent>{referees.map((ref) => <SelectItem key={ref.id} value={ref.id}>{ref.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><label className="block text-sm font-medium">Finish</label><Select value={draft.finish} onValueChange={(value: FinishType) => setDraft((prev) => ({ ...prev, finish: value, interferenceTalentIds: value === "Interference" ? prev.interferenceTalentIds : [] }))}><SelectTrigger className="h-11 text-base"><SelectValue /></SelectTrigger><SelectContent>{FINISHES.map((finish) => <SelectItem key={finish} value={finish}>{finish}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  <MatchSidesEditor segment={draft} wrestlers={wrestlers} onChange={setDraft} />
                  <MultiSelect label="Winner" values={draft.winners} options={eligibleWinnerOptions(draft)} onToggle={(id) => setDraft((prev) => ({ ...prev, winners: toggleInArray(prev.winners, id) }))} getLabel={(option) => option.name} />
                  {draft.finish === "Interference" ? <MultiSelect label="Interference Talent" values={draft.interferenceTalentIds} options={eligibleInterferenceOptions} onToggle={(id) => setDraft((prev) => ({ ...prev, interferenceTalentIds: toggleInArray(prev.interferenceTalentIds, id) }))} getLabel={labelOf} /> : null}
                </>
              ) : <MultiSelect label="Talent" values={draft.participants} options={talentPool} onToggle={(id) => setDraft((prev) => ({ ...prev, participants: toggleInArray(prev.participants, id) }))} getLabel={labelOf} />}
              <div className="text-base font-medium">Talent: {participantText(draft)}</div>
              <Textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Notes" />
              <Button onClick={addSegment}><Plus className="mr-2 h-4 w-4" />Add Segment</Button>
            </SectionCard>

            <div className="text-sm text-gray-600">Drag Cards To Reorder.</div>
            {currentShow.segments.map((seg, index) => {
              const accent = getSegmentAccentClasses(seg.type);
              const isMainEvent = index === currentShow.segments.length - 1;
              return (
                <Card key={seg.id} className={`${accent.card}${isMainEvent ? " ring-2 ring-black/70" : ""}`} draggable onDragStart={() => setDragIndex(index)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragIndex === null) return; updateSegments((prev) => moveItem(prev, dragIndex, index)); setDragIndex(null); }}>
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-2 text-xl font-bold">
                        <GripVertical className="h-4 w-4 text-gray-500" />
                        {seg.type === "Match" ? <Swords className="h-5 w-5" /> : seg.type === "Promo" ? <Mic2 className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                        {index + 1}. {seg.title}
                        <Badge variant="outline" className={accent.badge}>{seg.story}</Badge>
                        {isMainEvent ? <Badge className="bg-black text-white">Main Event</Badge> : null}
                      </div>
                      <div>{seg.duration} Min</div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2"><label className="block text-sm font-medium">Segment Title</label><Input value={seg.title} onChange={(e) => updateSegment(seg.id, { title: e.target.value })} /></div>
                      <div className="space-y-2"><label className="block text-sm font-medium">Duration</label><Input type="number" value={seg.duration} onChange={(e) => updateSegment(seg.id, { duration: Number(e.target.value) || 0 })} /></div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-1">
                      <div className="space-y-2"><label className="block text-sm font-medium">Storyline Tag</label><Select value={seg.story} onValueChange={(value: StoryType) => updateSegment(seg.id, { story: value })}><SelectTrigger className="h-11 text-base"><SelectValue /></SelectTrigger><SelectContent>{STORIES.map((story) => <SelectItem key={story} value={story}>{story}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                    {seg.type === "Match" ? (
                      <>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2"><label className="block text-sm font-medium">Match Type</label><Select value={seg.matchType} onValueChange={(value: MatchType) => updateSegment(seg.id, { matchType: value, sides: normalizeSides(seg.sides, value), winners: [], interferenceTalentIds: [] })}><SelectTrigger className="h-11 text-base"><SelectValue /></SelectTrigger><SelectContent>{MATCH_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></div>
                          <div className="space-y-2"><label className="block text-sm font-medium">Referee</label><Select value={seg.ref} onValueChange={(value) => updateSegment(seg.id, { ref: value })}><SelectTrigger className="h-11 text-base"><SelectValue placeholder="Referee" /></SelectTrigger><SelectContent>{referees.map((ref) => <SelectItem key={ref.id} value={ref.id}>{ref.name}</SelectItem>)}</SelectContent></Select></div>
                          <div className="space-y-2"><label className="block text-sm font-medium">Finish</label><Select value={seg.finish} onValueChange={(value: FinishType) => updateSegment(seg.id, { finish: value, interferenceTalentIds: value === "Interference" ? seg.interferenceTalentIds || [] : [] })}><SelectTrigger className="h-11 text-base"><SelectValue /></SelectTrigger><SelectContent>{FINISHES.map((finish) => <SelectItem key={finish} value={finish}>{finish}</SelectItem>)}</SelectContent></Select></div>
                        </div>
                        <MatchSidesEditor segment={seg} wrestlers={wrestlers} onChange={(nextSegment) => updateSegment(seg.id, nextSegment)} />
                        <MultiSelect label="Winner" values={seg.winners} options={eligibleWinnerOptions(seg)} onToggle={(id) => updateSegment(seg.id, { winners: toggleInArray(seg.winners, id) })} getLabel={(option) => option.name} />
                        {seg.finish === "Interference" ? <MultiSelect label="Interference Talent" values={seg.interferenceTalentIds || []} options={eligibleInterferenceOptions} onToggle={(id) => updateSegment(seg.id, { interferenceTalentIds: toggleInArray(seg.interferenceTalentIds || [], id) })} getLabel={labelOf} /> : null}
                        <div className="text-sm text-gray-700">Winner: {winnerText(seg)}</div>
                        {seg.finish === "Interference" ? <div className="text-sm text-gray-700">Interference Talent: {interferenceText(seg)}</div> : null}
                      </>
                    ) : <MultiSelect label="Talent" values={seg.participants} options={talentPool} onToggle={(id) => updateSegment(seg.id, { participants: toggleInArray(seg.participants, id) })} getLabel={labelOf} />}
                    <div className="text-base font-medium">Talent: {participantText(seg)}</div>
                    <Textarea value={seg.notes} onChange={(e) => updateSegment(seg.id, { notes: e.target.value })} placeholder="Notes" />
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="talent" className="space-y-6">
            <SectionCard title="Add Talent">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                <Input value={talentDraft.name} onChange={(e) => setTalentDraft({ ...talentDraft, name: e.target.value })} placeholder="Display Name" />
                <Input value={talentDraft.realName} onChange={(e) => setTalentDraft({ ...talentDraft, realName: e.target.value })} placeholder="Real Name" />
                <Select value={talentDraft.role} onValueChange={(value: TalentRole) => setTalentDraft({ ...talentDraft, role: value })}><SelectTrigger className="h-11 text-base"><SelectValue /></SelectTrigger><SelectContent>{TALENT_ROLES.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent></Select>
                <Input value={talentDraft.email} onChange={(e) => setTalentDraft({ ...talentDraft, email: e.target.value })} placeholder="Email" />
                <Input value={talentDraft.phone} onChange={(e) => setTalentDraft({ ...talentDraft, phone: e.target.value })} placeholder="Phone Number" />
                <Input value={talentDraft.musicUrl} onChange={(e) => setTalentDraft({ ...talentDraft, musicUrl: e.target.value })} placeholder="Music Link (YouTube or Drive)" />
              </div>
              <Button onClick={addTalent}><Plus className="mr-2 h-4 w-4" />Add Talent</Button>
            </SectionCard>

            <SectionCard title="Current Talent Pool">
              <div className="space-y-4">
                {talentPool.map((talent) => {
                  const musicAction = getMusicAction(talent.musicUrl);
                  return (
                    <div key={talent.id} className="grid gap-3 rounded border p-4 md:grid-cols-6">
                      <Input value={talent.name} onChange={(e) => updateTalent(talent.id, { name: e.target.value })} />
                      <Input value={talent.realName} onChange={(e) => updateTalent(talent.id, { realName: e.target.value })} />
                      <Select value={talent.role} onValueChange={(value: TalentRole) => updateTalent(talent.id, { role: value })}><SelectTrigger className="h-11 text-base"><SelectValue /></SelectTrigger><SelectContent>{TALENT_ROLES.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent></Select>
                      <Input value={talent.email} onChange={(e) => updateTalent(talent.id, { email: e.target.value })} />
                      <Input value={talent.phone} onChange={(e) => updateTalent(talent.id, { phone: e.target.value })} />
                      <div className="flex items-center gap-2">
                        <Input value={talent.musicUrl} onChange={(e) => updateTalent(talent.id, { musicUrl: e.target.value })} placeholder="Music Link" />
                        {musicAction ? <a href={musicAction.href} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm font-medium whitespace-nowrap" download={musicAction.download ? "music" : undefined}>{musicAction.label}</a> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="print" className="space-y-6">
            <SectionCard
              title="Printable TV Rundown Sheet"
              actions={<div className="flex items-center gap-3"><div className="hidden md:flex items-center gap-2 text-xs text-gray-600 mr-2"><span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-200 border border-red-300" /> Match</span><span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-blue-200 border border-blue-300" /> Promo</span><span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-200 border border-amber-300" /> Backstage</span></div><Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print / Save PDF</Button></div>}
            >
              <PrintRundownTable show={currentShow} participantText={participantText} winnerText={winnerText} interferenceText={interferenceText} nameOf={nameOf} totalRuntime={totalRuntime} />
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
