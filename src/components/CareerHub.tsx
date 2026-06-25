import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import { Loader2, Sparkles, Target, CalendarDays, Lightbulb } from "lucide-react";
import { z } from "zod";

type Profile = {
  present_role: string;
  target_role: string;
  education_level: string;
  skills: string[];
  interests: string[];
  weekly_hours: number;
  notes: string;
};

type Roadmap = {
  id?: string;
  title: string;
  summary: string;
  skill_gaps: { skill: string; level: string; why: string }[];
  milestones: { title: string; duration_weeks: number; resources: string[]; outcomes: string[] }[];
};

type WeeklyPlan = {
  id?: string;
  nudge: string;
  days: { day: string; focus: string; tasks: string[] }[];
  progress?: Record<string, boolean>;
};

const profileSchema = z.object({
  present_role: z.string().trim().max(120).optional().default(""),
  target_role: z.string().trim().min(2, "Tell us your target role").max(120),
  education_level: z.string().trim().max(80).optional().default(""),
  skills: z.array(z.string().trim().min(1).max(60)).max(40),
  interests: z.array(z.string().trim().min(1).max(60)).max(40),
  weekly_hours: z.number().int().min(1).max(80),
  notes: z.string().trim().max(1000).optional().default(""),
});

const emptyProfile: Profile = {
  present_role: "",
  target_role: "",
  education_level: "",
  skills: [],
  interests: [],
  weekly_hours: 5,
  notes: "",
};

function ChipInput({
  label, values, onChange, placeholder,
}: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (values.includes(v)) { setDraft(""); return; }
    onChange([...values, v].slice(0, 40));
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          maxLength={60}
        />
        <Button type="button" variant="secondary" onClick={add}>Add</Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <Badge key={v} variant="secondary" className="cursor-pointer"
            onClick={() => onChange(values.filter((x) => x !== v))}>
            {v} ✕
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default function CareerHub({ userId, isGuest }: { userId: string; isGuest: boolean }) {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [genRoadmap, setGenRoadmap] = useState(false);
  const [genPlan, setGenPlan] = useState(false);

  useEffect(() => {
    if (isGuest) return;
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: r }, { data: w }] = await Promise.all([
        supabase.from("career_profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("learning_roadmaps").select("*").eq("user_id", userId)
          .order("generated_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("weekly_action_plans").select("*").eq("user_id", userId)
          .order("generated_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (p) setProfile({
        present_role: p.present_role ?? "",
        target_role: p.target_role ?? "",
        education_level: p.education_level ?? "",
        skills: p.skills ?? [],
        interests: p.interests ?? [],
        weekly_hours: p.weekly_hours ?? 5,
        notes: p.notes ?? "",
      });
      if (r) setRoadmap({
        id: r.id, title: r.title, summary: r.summary ?? "",
        skill_gaps: (r.skill_gaps as any) ?? [], milestones: (r.milestones as any) ?? [],
      });
      if (w) {
        const pl = (w.plan as any) ?? {};
        setPlan({
          id: w.id, nudge: w.nudge ?? pl.nudge ?? "",
          days: pl.days ?? [],
          progress: (w.progress as any) ?? {},
        });
      }
      setLoading(false);
    })();
  }, [userId, isGuest]);

  if (isGuest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign in to unlock your Career Twin 🚀</CardTitle>
          <CardDescription>
            Save your profile, generate personalized learning roadmaps, and get a weekly action plan tailored to your goals.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const saveProfile = async () => {
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("career_profiles").upsert(
      { user_id: userId, ...parsed.data },
      { onConflict: "user_id" },
    );
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved ✨");
  };

  const generateRoadmap = async () => {
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) { toast.error("Fill in your profile first"); return; }
    setGenRoadmap(true);
    const { data, error } = await supabase.functions.invoke("generate-roadmap", { body: { profile: parsed.data } });
    if (error || !data?.roadmap) {
      setGenRoadmap(false); toast.error(error?.message ?? "Could not generate roadmap"); return;
    }
    const rm: Roadmap = data.roadmap;
    const { data: saved, error: insErr } = await supabase.from("learning_roadmaps").insert({
      user_id: userId, title: rm.title ?? "Your roadmap", summary: rm.summary ?? "",
      skill_gaps: rm.skill_gaps ?? [], milestones: rm.milestones ?? [],
    }).select().single();
    setGenRoadmap(false);
    if (insErr) { toast.error(insErr.message); return; }
    setRoadmap({ ...rm, id: saved.id });
    toast.success("Roadmap ready 🎯");
  };

  const generatePlan = async () => {
    if (!roadmap) { toast.error("Generate your roadmap first"); return; }
    setGenPlan(true);
    const { data: moodRows } = await supabase
      .from("mood_logs").select("mood,created_at").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(7);
    const { data, error } = await supabase.functions.invoke("generate-weekly-plan", {
      body: { profile, roadmap, recentMood: moodRows ?? [] },
    });
    if (error || !data?.plan) {
      setGenPlan(false); toast.error(error?.message ?? "Could not generate plan"); return;
    }
    const pl = data.plan;
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const { data: saved, error: insErr } = await supabase.from("weekly_action_plans").insert({
      user_id: userId, week_start: weekStart.toISOString().slice(0, 10),
      plan: pl, nudge: pl.nudge ?? "", progress: {},
    }).select().single();
    setGenPlan(false);
    if (insErr) { toast.error(insErr.message); return; }
    setPlan({ id: saved.id, nudge: pl.nudge ?? "", days: pl.days ?? [], progress: {} });
    toast.success("Weekly plan ready 📅");
  };

  const toggleTask = async (key: string) => {
    if (!plan?.id) return;
    const next = { ...(plan.progress ?? {}), [key]: !plan.progress?.[key] };
    setPlan({ ...plan, progress: next });
    await supabase.from("weekly_action_plans").update({ progress: next }).eq("id", plan.id);
  };

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-4">
        <TabsTrigger value="profile"><Target className="h-4 w-4 mr-1.5" /> Profile</TabsTrigger>
        <TabsTrigger value="roadmap"><Sparkles className="h-4 w-4 mr-1.5" /> Roadmap</TabsTrigger>
        <TabsTrigger value="week"><CalendarDays className="h-4 w-4 mr-1.5" /> This Week</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <Card>
          <CardHeader>
            <CardTitle>Career Profile</CardTitle>
            <CardDescription>Twinova uses this to personalize your roadmap and weekly plan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current role / status</Label>
                <Input value={profile.present_role} maxLength={120}
                  onChange={(e) => setProfile({ ...profile, present_role: e.target.value })}
                  placeholder="e.g. CS student, Junior Developer" />
              </div>
              <div className="space-y-2">
                <Label>Target role *</Label>
                <Input value={profile.target_role} maxLength={120}
                  onChange={(e) => setProfile({ ...profile, target_role: e.target.value })}
                  placeholder="e.g. Full-stack Engineer" />
              </div>
              <div className="space-y-2">
                <Label>Education level</Label>
                <Input value={profile.education_level} maxLength={80}
                  onChange={(e) => setProfile({ ...profile, education_level: e.target.value })}
                  placeholder="e.g. Bachelor's, Self-taught" />
              </div>
              <div className="space-y-2">
                <Label>Weekly hours available</Label>
                <Input type="number" min={1} max={80} value={profile.weekly_hours}
                  onChange={(e) => setProfile({ ...profile, weekly_hours: Math.max(1, Math.min(80, Number(e.target.value) || 0)) })} />
              </div>
            </div>
            <ChipInput label="Current skills" values={profile.skills}
              onChange={(v) => setProfile({ ...profile, skills: v })}
              placeholder="Type a skill and press Enter" />
            <ChipInput label="Interests" values={profile.interests}
              onChange={(v) => setProfile({ ...profile, interests: v })}
              placeholder="e.g. AI, Web3, Data" />
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea value={profile.notes} maxLength={1000}
                onChange={(e) => setProfile({ ...profile, notes: e.target.value })}
                placeholder="Goals, constraints, anything Twinova should know" />
            </div>
            <Button onClick={saveProfile} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save profile
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="roadmap">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Learning Roadmap</CardTitle>
              <CardDescription>Personalized milestones and skill gap analysis.</CardDescription>
            </div>
            <Button onClick={generateRoadmap} disabled={genRoadmap}>
              {genRoadmap ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {roadmap ? "Regenerate" : "Generate"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {!roadmap && <p className="text-sm text-muted-foreground">No roadmap yet — fill in your profile and generate one.</p>}
            {roadmap && (
              <>
                <div>
                  <h3 className="font-semibold text-lg">{roadmap.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{roadmap.summary}</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Skill gaps</h4>
                  <div className="space-y-2">
                    {roadmap.skill_gaps.map((g, i) => (
                      <div key={i} className="border border-border/50 rounded-lg p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{g.skill}</span>
                          <Badge variant="outline">{g.level}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{g.why}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Milestones</h4>
                  <ol className="space-y-3">
                    {roadmap.milestones.map((m, i) => (
                      <li key={i} className="border-l-2 border-primary/40 pl-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{i + 1}. {m.title}</span>
                          <Badge variant="secondary">{m.duration_weeks}w</Badge>
                        </div>
                        {m.outcomes?.length > 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Outcomes: {m.outcomes.join(", ")}
                          </p>
                        )}
                        {m.resources?.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Resources: {m.resources.join(" · ")}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="week">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>This Week's Action Plan</CardTitle>
              <CardDescription>7-day plan adapted to your goals and recent mood.</CardDescription>
            </div>
            <Button onClick={generatePlan} disabled={genPlan || !roadmap}>
              {genPlan ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CalendarDays className="h-4 w-4 mr-2" />}
              {plan ? "Regenerate" : "Generate"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {!roadmap && <p className="text-sm text-muted-foreground">Generate your roadmap first.</p>}
            {plan?.nudge && (
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-sm">
                <span className="font-medium">Twinova nudge:</span> {plan.nudge}
              </div>
            )}
            {plan?.days?.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {plan.days.map((d, di) => (
                  <div key={di} className="border border-border/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{d.day}</span>
                      <span className="text-xs text-muted-foreground">{d.focus}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {d.tasks.map((t, ti) => {
                        const key = `${di}-${ti}`;
                        const done = !!plan.progress?.[key];
                        return (
                          <li key={ti} className="flex items-start gap-2 text-sm">
                            <Checkbox checked={done} onCheckedChange={() => toggleTask(key)} className="mt-0.5" />
                            <span className={done ? "line-through text-muted-foreground" : ""}>{t}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            ) : roadmap && !plan ? (
              <p className="text-sm text-muted-foreground">No plan yet — generate this week's plan.</p>
            ) : null}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}