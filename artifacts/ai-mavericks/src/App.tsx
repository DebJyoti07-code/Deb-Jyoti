import { useEffect, useState } from "react";
import type { CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Router as WouterRouter } from "wouter";
import {
  AlarmClock, Archive, ArrowRight, Award, BarChart3, BadgeCheck, Bell, CalendarDays, CalendarCheck2, Check,
  CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock3, Coffee, Copy,
  Edit3, FileText, Flame, Gift, Headphones, Image, LayoutDashboard, Lightbulb, ListTodo,
  LockKeyhole, Menu, Moon, Music2, NotebookPen, Palette, Phone, Pin, PinOff, Play, Plus,
  RefreshCw, RotateCcw, SearchCheck, Settings2, Sparkles, Star, Sun, Target,
  Trash2, TrendingUp, Trophy, Users, Volume2, VolumeX, X, Zap,
} from "lucide-react";
import { useCreateAiSummary } from "@workspace/api-client-react";

const queryClient = new QueryClient();

type Section = "dashboard" | "planner" | "todos" | "notes" | "contacts" | "focus" | "summary" | "insights" | "rewards" | "settings";
type StudyTask = { id: number; subject: string; topic: string; date: string; priority: "High" | "Medium" | "Low"; minutes: number; done: boolean };
type Todo = { id: number; text: string; done: boolean; created: string };
type Note = { id: number; title: string; content: string; color: string; pinned: boolean; updated: string };
type Contact = { id: number; name: string; role: string; phone: string };
type Performance = { id: number; subject: string; topic: string; score: number; maxScore: number; recorded: string };
type LearningDay = { date: string; minutes: number; tasksCompleted: number; activities: number };
type RewardHistoryItem = { rewardId: string; claimedAt: string };
type RewardState = { currentStreak: number; lastActivity: string | null; activeRewardId: string | null; unlockedIds: string[]; claimedIds: string[]; history: RewardHistoryItem[]; days: LearningDay[] };
type RewardDefinition = { id: string; threshold: number; label: string; title: string; description: string; kind: "streak" | "goal"; icon: "wallpaper" | "icons" | "theme" | "badge" | "goal" };

const todayISO = new Date().toISOString().slice(0, 10);
const WEEKLY_GOAL_MINUTES = 300;
const seedTasks: StudyTask[] = [
  { id: 1, subject: "Biology", topic: "Cellular respiration", date: todayISO, priority: "High", minutes: 45, done: false },
  { id: 2, subject: "Mathematics", topic: "Integration practice set", date: todayISO, priority: "Medium", minutes: 35, done: true },
  { id: 3, subject: "History", topic: "Cold War timeline", date: todayISO, priority: "Low", minutes: 25, done: false },
  { id: 4, subject: "Literature", topic: "Read The Waste Land notes", date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), priority: "Medium", minutes: 30, done: false },
];
const seedTodos: Todo[] = [
  { id: 1, text: "Submit lab report before 5pm", done: false, created: todayISO },
  { id: 2, text: "Pack calculator for tomorrow", done: true, created: todayISO },
  { id: 3, text: "Email study group about Sunday", done: false, created: todayISO },
];
const seedNotes: Note[] = [
  { id: 1, title: "Remember the why", content: "Small, honest sessions compound. Start with the next page, not the whole mountain.", color: "yellow", pinned: true, updated: "Just now" },
  { id: 2, title: "Essay sparks", content: "Compare the idea of home in both poems. Find the image that keeps returning.", color: "lilac", pinned: false, updated: "Yesterday" },
];
const seedContacts: Contact[] = [
  { id: 1, name: "Dr. Maya Chen", role: "Biology tutor", phone: "+1 (415) 555-0182" },
  { id: 2, name: "Sam Okafor", role: "Study partner", phone: "+1 (415) 555-0136" },
];
const seedPerformance: Performance[] = [];
const initialRewardState: RewardState = { currentStreak: 0, lastActivity: null, activeRewardId: null, unlockedIds: [], claimedIds: [], history: [], days: [] };
const rewardCatalog: RewardDefinition[] = [
  { id: "streak-wallpaper", threshold: 3, label: "3 days", title: "Focus wallpaper", description: "A calm new backdrop for your next study sprint.", kind: "streak", icon: "wallpaper" },
  { id: "streak-icons", threshold: 7, label: "7 days", title: "Colourful icons", description: "A brighter icon treatment for your study studio.", kind: "streak", icon: "icons" },
  { id: "streak-theme", threshold: 14, label: "14 days", title: "Momentum theme", description: "A fresh dashboard accent for your growing rhythm.", kind: "streak", icon: "theme" },
  { id: "streak-badge", threshold: 30, label: "30 days", title: "Maverick badge", description: "A special achievement badge for serious consistency.", kind: "streak", icon: "badge" },
  { id: "weekly-goal", threshold: 100, label: "weekly goal", title: "Week well spent", description: "A small celebration for reaching your 300-minute weekly goal.", kind: "goal", icon: "goal" },
];

function getDateISO(offset = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function getWeeklyMetrics(days: LearningDay[]) {
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = getDateISO(index - 6);
    const recorded = days.find(day => day.date === date);
    return {
      date,
      label: new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" }),
      minutes: recorded?.minutes ?? 0,
      tasksCompleted: recorded?.tasksCompleted ?? 0,
      activities: recorded?.activities ?? 0,
    };
  });
  const totalMinutes = week.reduce((sum, day) => sum + day.minutes, 0);
  const tasksCompleted = week.reduce((sum, day) => sum + day.tasksCompleted, 0);
  return { week, totalMinutes, tasksCompleted, progressPercent: Math.min(100, Math.round(totalMinutes / WEEKLY_GOAL_MINUTES * 100)) };
}

function rewardIcon(kind: RewardDefinition["icon"], size = 18) {
  if (kind === "wallpaper") return <Image size={size} />;
  if (kind === "icons") return <Palette size={size} />;
  if (kind === "theme") return <Sparkles size={size} />;
  if (kind === "badge") return <BadgeCheck size={size} />;
  return <Trophy size={size} />;
}

function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* local persistence unavailable */ } }, [key, value]);
  return [value, setValue] as const;
}

const navItems: { id: Section; label: string; icon: typeof LayoutDashboard; group?: string }[] = [
  { id: "dashboard", label: "Today", icon: LayoutDashboard },
  { id: "planner", label: "Study planner", icon: CalendarDays, group: "Plan" },
  { id: "todos", label: "To-do list", icon: ListTodo },
  { id: "notes", label: "Sticky notes", icon: NotebookPen, group: "Study" },
  { id: "summary", label: "AI summary", icon: FileText },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "focus", label: "Focus timer", icon: AlarmClock, group: "Focus" },
  { id: "insights", label: "Weak topics", icon: SearchCheck, group: "Analyze" },
  { id: "rewards", label: "My rewards", icon: Trophy, group: "Analyze" },
  { id: "settings", label: "Settings", icon: Settings2, group: "Workspace" },
];

function App() {
  const [section, setSection] = useState<Section>("dashboard");
  const [dark, setDark] = useStored("mavericks-theme", false);
  const [tasks, setTasks] = useStored<StudyTask[]>("mavericks-tasks", seedTasks);
  const [todos, setTodos] = useStored<Todo[]>("mavericks-todos", seedTodos);
  const [notes, setNotes] = useStored<Note[]>("mavericks-notes", seedNotes);
  const [contacts, setContacts] = useStored<Contact[]>("mavericks-contacts", seedContacts);
  const [performance, setPerformance] = useStored<Performance[]>("mavericks-performance", seedPerformance);
  const [rewardState, setRewardState] = useStored<RewardState>("mavericks-rewards", initialRewardState);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [motivationIndex, setMotivationIndex] = useStored("mavericks-motivation", 0);
  const [celebratingReward, setCelebratingReward] = useState<string | null>(null);

  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  useEffect(() => {
    const completedTasks = tasks.filter(task => task.date === todayISO && task.done);
    const completedTodos = todos.filter(todo => todo.done && todo.created === todayISO);
    const practiceResults = performance.filter(result => result.recorded === todayISO);
    const activities = completedTasks.length + completedTodos.length + practiceResults.length;
    if (!activities) return;
    const minutes = completedTasks.reduce((sum, task) => sum + task.minutes, 0);
    setRewardState(previous => {
      const existing = previous.days.find(day => day.date === todayISO);
      if (existing && existing.minutes === minutes && existing.tasksCompleted === completedTasks.length && existing.activities === activities) return previous;
      const days = [...previous.days.filter(day => day.date !== todayISO), { date: todayISO, minutes, tasksCompleted: completedTasks.length, activities }];
      const streak = previous.lastActivity === todayISO ? previous.currentStreak : previous.lastActivity === getDateISO(-1) ? previous.currentStreak + 1 : 1;
      const weekly = getWeeklyMetrics(days);
      const unlockedIds = [...new Set([
        ...previous.unlockedIds,
        ...rewardCatalog.filter(reward => reward.kind === "streak" ? streak >= reward.threshold : weekly.progressPercent >= reward.threshold).map(reward => reward.id),
      ])];
      return { ...previous, currentStreak: streak, lastActivity: todayISO, unlockedIds, days };
    });
  }, [tasks, todos, performance, setRewardState]);

  const progress = tasks.length ? Math.round(tasks.filter(t => t.done).length / tasks.length * 100) : 0;
  const go = (next: Section) => { setSection(next); setMobileOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const claimReward = (rewardId: string) => {
    const reward = rewardCatalog.find(item => item.id === rewardId);
    if (!reward || !rewardState.unlockedIds.includes(rewardId)) return;
    setRewardState(previous => ({
      ...previous,
      activeRewardId: rewardId,
      claimedIds: previous.claimedIds.includes(rewardId) ? previous.claimedIds : [...previous.claimedIds, rewardId],
      history: previous.claimedIds.includes(rewardId) ? previous.history : [{ rewardId, claimedAt: todayISO }, ...previous.history],
    }));
    setCelebratingReward(rewardId);
    window.setTimeout(() => setCelebratingReward(null), 1600);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter>
          <ErrorBoundary resetKey={section}>
            <div className={`app-frame ${rewardState.activeRewardId ? `reward-active-${rewardState.activeRewardId}` : ""}`}>
              <Sidebar section={section} go={go} mobileOpen={mobileOpen} close={() => setMobileOpen(false)} rewardState={rewardState} />
              {celebratingReward && <CelebrationBurst rewardId={celebratingReward} />}
              <main className="main-content">
                <Topbar section={section} dark={dark} toggleTheme={() => setDark(!dark)} openMenu={() => setMobileOpen(true)} />
                <div className="page-wrap">
                  {section === "dashboard" && <Dashboard tasks={tasks} todos={todos} notes={notes} performance={performance} progress={progress} rewardState={rewardState} go={go} motivationIndex={motivationIndex} refreshMotivation={() => setMotivationIndex((motivationIndex + 1) % 7)} />}
                  {section === "planner" && <Planner tasks={tasks} setTasks={setTasks} />}
                  {section === "todos" && <TodoPage todos={todos} setTodos={setTodos} />}
                  {section === "notes" && <NotesPage notes={notes} setNotes={setNotes} />}
                  {section === "contacts" && <ContactsPage contacts={contacts} setContacts={setContacts} />}
                  {section === "focus" && <FocusPage />}
                  {section === "summary" && <StudySummaryPage />}
                  {section === "insights" && <InsightsPage tasks={tasks} performance={performance} setPerformance={setPerformance} />}
                  {section === "rewards" && <RewardsPage rewardState={rewardState} claimReward={claimReward} />}
                  {section === "settings" && <SettingsPage dark={dark} toggleTheme={() => setDark(!dark)} />}
                </div>
              </main>
            </div>
          </ErrorBoundary>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function Sidebar({ section, go, mobileOpen, close, rewardState }: { section: Section; go: (s: Section) => void; mobileOpen: boolean; close: () => void; rewardState: RewardState }) {
  return <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
    <div className="brand-row"><div className="brand-mark">A</div><div><div className="brand-name">AI<span>·</span>Mavericks</div><div className="brand-caption">your study studio</div></div><button className="icon-btn mobile-close" onClick={close} data-testid="button-close-menu"><X size={18} /></button></div>
    <div className="sidebar-rule" />
    <p className="nav-kicker">Your rhythm</p>
    <nav className="nav-list">
      {navItems.map((item, i) => <div key={item.id}>
        {item.group && <p className="nav-group">{item.group}</p>}
        <button className={`nav-item ${section === item.id ? "nav-active" : ""}`} onClick={() => go(item.id)} data-testid={`button-nav-${item.id}`}>
          <item.icon size={17} strokeWidth={section === item.id ? 2.5 : 1.8} /><span>{item.label}</span>{item.id === "focus" && <span className="nav-dot" />}
        </button>
      </div>)}
    </nav>
    <div className="sidebar-bottom">
      <div className="streak-card"><div className="streak-icon"><Flame size={17} /></div><div><strong>{rewardState.currentStreak || 0} day streak</strong><small>{rewardState.currentStreak >= 3 ? "Keep the spark going" : "Start your rhythm today"}</small></div><ArrowRight size={14} /></div>
      <div className="profile-mini"><div className="avatar">JR</div><div><strong>Jordan Rivera</strong><small>Undergrad · Year 2</small></div><ChevronRight size={15} /></div>
    </div>
  </aside>;
}

function Topbar({ section, dark, toggleTheme, openMenu }: { section: Section; dark: boolean; toggleTheme: () => void; openMenu: () => void }) {
  const title = navItems.find(n => n.id === section)?.label ?? "Today";
  const currentDate = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  return <header className="topbar"><button className="icon-btn menu-btn" onClick={openMenu} data-testid="button-open-menu"><Menu size={20} /></button><div className="crumb"><span>Workspace</span><ChevronRight size={14} /><strong>{title}</strong></div><div className="top-actions"><div className="today-chip"><span className="pulse-dot" /> {currentDate}</div><button className="icon-btn" aria-label="Toggle theme" onClick={toggleTheme} data-testid="button-toggle-theme">{dark ? <Sun size={18} /> : <Moon size={18} />}</button><button className="icon-btn has-badge" data-testid="button-notifications"><Bell size={18} /><i>2</i></button><div className="avatar avatar-top">JR</div></div></header>;
}

function Dashboard({ tasks, todos, notes, performance, progress, rewardState, go, motivationIndex, refreshMotivation }: { tasks: StudyTask[]; todos: Todo[]; notes: Note[]; performance: Performance[]; progress: number; rewardState: RewardState; go: (s: Section) => void; motivationIndex: number; refreshMotivation: () => void }) {
  const messages = ["You do not need a perfect plan. You need a first honest step.", "Make it small enough to begin, then stay for one more page.", "The work is becoming easier because you are becoming stronger.", "A focused hour today buys a calmer version of tomorrow.", "Curiosity is a better fuel than pressure. Follow the thread.", "Progress can be quiet and still count.", "Put the phone down. Your future self is already grateful."];
  const todayTasks = tasks.filter(t => t.date === todayISO);
  const done = todayTasks.filter(t => t.done).length;
  const todayProgress = todayTasks.length ? Math.round(done / todayTasks.length * 100) : 0;
  const weakTopics = getWeakTopics(performance);
  const nextRecommendation = getNextRecommendation(tasks, performance);
  return <div className="animate-page">
     <div className="welcome-row"><div><p className="eyebrow">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toUpperCase()}</p><h1>Good morning, Debjyoti<span className="title-period">.</span></h1><p className="subhead">A clear mind starts with a clear next step.</p></div><button className="primary-btn" onClick={() => go("focus")} data-testid="button-start-focus"><Play size={16} fill="currentColor" /> Start a focus session</button></div>
    <section className="hero-grid">
      <div className="progress-card"><div className="card-label"><span>Today's momentum</span><span className="mono">{done}/{todayTasks.length || 0} complete</span></div><div className="progress-main"><div><strong>{todayProgress}<sup>%</sup></strong><p>of today's plan is on track</p></div><ProgressRing value={todayProgress} /></div><div className="progress-track"><span style={{ width: `${Math.max(todayProgress, 3)}%` }} /></div><div className="progress-foot"><span><CheckCircle2 size={14} /> {todayTasks.filter(t => t.done).length} finished</span><span><Clock3 size={14} /> {todayTasks.filter(t => !t.done).reduce((a, t) => a + t.minutes, 0)} min left</span></div></div>
      <div className="motivation-card"><div className="motif"><Sparkles size={17} /></div><p className="eyebrow">A NOTE FOR YOU</p><blockquote>“{messages[motivationIndex]}”</blockquote><button className="text-btn" onClick={refreshMotivation} data-testid="button-new-motivation"><RefreshCw size={14} /> New motivation</button></div>
    </section>
    <section className="reward-dashboard-grid">
      <WeeklyProgressPanel rewardState={rewardState} />
      <RewardStatusPanel rewardState={rewardState} go={go} />
    </section>
    <section className="dashboard-grid">
      <div className="panel task-panel"><PanelHeader title="Today's study plan" icon={<Target size={17} />} action="View planner" onAction={() => go("planner")} /><div className="section-intro">The work waiting for your attention.</div>{todayTasks.length === 0 ? <EmptyState icon={<CalendarDays size={21} />} title="Your day is open" body="Add a session to give today some shape." action="Plan a session" onClick={() => go("planner")} /> : <div className="task-list">{todayTasks.slice(0, 4).map(task => <TaskRow key={task.id} task={task} compact />)}</div>}</div>
      <div className="panel quick-panel"><PanelHeader title="Quick access" icon={<Zap size={17} />} /><div className="quick-grid"><QuickAction icon={<CalendarDays />} label="Plan a session" color="teal" onClick={() => go("planner")} /><QuickAction icon={<ListTodo />} label="Clear your to-do" color="orange" onClick={() => go("todos")} /><QuickAction icon={<NotebookPen />} label="Capture a thought" color="lilac" onClick={() => go("notes")} /><QuickAction icon={<Headphones />} label="Set the atmosphere" color="blue" onClick={() => go("focus")} /><QuickAction icon={<FileText />} label="Summarize material" color="gold" onClick={() => go("summary")} /></div></div>
      <div className="panel todo-preview"><PanelHeader title="Loose ends" icon={<ListTodo size={17} />} action="See all" onAction={() => go("todos")} /><div className="section-intro">Small things, out of your head.</div>{todos.filter(t => !t.done).slice(0, 3).map(todo => <div className="mini-todo" key={todo.id}><Circle size={15} /><span>{todo.text}</span></div>)}{todos.filter(t => !t.done).length === 0 && <EmptyState icon={<Check size={20} />} title="All clear" body="Nothing tugging at your attention." />}</div>
      <div className="panel notes-preview"><PanelHeader title="Pinned thoughts" icon={<Pin size={16} />} action="Open notes" onAction={() => go("notes")} /><div className="notes-stack">{notes.filter(n => n.pinned).slice(0, 2).map(note => <div className={`note-slice note-${note.color}`} key={note.id}><Pin size={13} fill="currentColor" /><div><strong>{note.title}</strong><p>{note.content}</p></div></div>)}{notes.filter(n => n.pinned).length === 0 && <EmptyState icon={<PinOff size={20} />} title="No pinned notes" body="Pin the thoughts you want close." />}</div></div>
      <div className="panel insight-preview"><PanelHeader title="Weak topics" icon={<SearchCheck size={17} />} action="See insights" onAction={() => go("insights")} /><div className="section-intro">Use real practice results to focus your revision.</div>{weakTopics.length === 0 ? <EmptyState icon={<BarChart3 size={20} />} title="Not enough data" body="Add a practice result to reveal topics that need more revision." action="Add result" onClick={() => go("insights")} /> : <div className="weak-list">{weakTopics.slice(0, 3).map(topic => <WeakTopicRow key={`${topic.subject}-${topic.topic}`} topic={topic} />)}</div>}</div>
       <div className="panel recommendation-preview"><PanelHeader title="Recommended next" icon={<Lightbulb size={17} />} /><div className="recommendation-content">{nextRecommendation ? <><span className="recommendation-kicker">A useful next step</span><h3>{nextRecommendation.title}</h3><p>{nextRecommendation.reason}</p><button className="text-btn" onClick={() => nextRecommendation.kind === "summary" ? go("summary") : nextRecommendation.kind === "insight" ? go("insights") : go("planner")} data-testid="button-follow-recommendation">{nextRecommendation.action}<ArrowRight size={14} /></button></> : <EmptyState icon={<CheckCircle2 size={20} />} title="You are all caught up" body="Add a study session or practice result to get a personalized recommendation." />}</div></div>
    </section>
  </div>;
}

function WeeklyProgressPanel({ rewardState }: { rewardState: RewardState }) {
  const metrics = getWeeklyMetrics(rewardState.days);
  return <section className="panel weekly-progress-panel">
    <div className="panel-header"><h2><TrendingUp size={17} /> Weekly progress</h2><span className="panel-kicker">last 7 days</span></div>
    <div className="progress-stat-row">
      <div><span>Weekly progress</span><strong>{metrics.progressPercent}%</strong></div>
      <div><span>Total study time</span><strong>{metrics.totalMinutes}<small> min</small></strong></div>
      <div><span>Tasks completed</span><strong>{metrics.tasksCompleted}</strong></div>
      <div><span>Current streak</span><strong>{rewardState.currentStreak}<small> days</small></strong></div>
    </div>
    <WeeklyProgressGraph days={metrics.week} />
    <div className="weekly-goal-row"><div><span>Weekly goal</span><strong>{metrics.totalMinutes} / {WEEKLY_GOAL_MINUTES} minutes</strong></div><div className="weekly-goal-track"><span style={{ width: `${Math.max(metrics.progressPercent, metrics.totalMinutes ? 4 : 0)}%` }} /></div><span className="goal-percent">{metrics.progressPercent}%</span></div>
  </section>;
}

function WeeklyProgressGraph({ days }: { days: ReturnType<typeof getWeeklyMetrics>["week"] }) {
  const [activeDay, setActiveDay] = useState(days.length - 1);
  const [visible, setVisible] = useState(false);
  const maxMinutes = Math.max(60, ...days.map(day => day.minutes));
  useEffect(() => {
    setVisible(false);
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [days.map(day => `${day.date}-${day.minutes}`).join("|")]);
  const selected = days[activeDay] ?? days[days.length - 1];
  return <div className="weekly-graph" aria-label="Weekly study time graph">
    <div className="graph-scale"><span>{maxMinutes}m</span><span>{Math.round(maxMinutes / 2)}m</span><span>0m</span></div>
    <div className="graph-bars">
      <div className="graph-grid-line graph-grid-top" /><div className="graph-grid-line graph-grid-middle" /><div className="graph-grid-line graph-grid-bottom" />
      {days.map((day, index) => <button key={day.date} className={`graph-bar-button ${activeDay === index ? "graph-bar-active" : ""}`} onMouseEnter={() => setActiveDay(index)} onFocus={() => setActiveDay(index)} aria-label={`${day.label}: ${day.minutes} minutes, ${day.tasksCompleted} tasks completed`} data-testid={`button-progress-day-${day.date}`}>
        <span className="graph-bar-fill" style={{ height: visible ? `${day.minutes ? Math.max(8, day.minutes / maxMinutes * 100) : 3}%` : "3%" }} />
        <span className="graph-bar-dot" />
      </button>)}
    </div>
    <div className="graph-labels">{days.map((day, index) => <span className={activeDay === index ? "graph-label-active" : ""} key={day.date}>{day.label}</span>)}</div>
    <div className="graph-tooltip"><strong>{selected?.label}</strong><span>{selected?.minutes ?? 0} min study time</span><span>{selected?.tasksCompleted ?? 0} task{selected?.tasksCompleted === 1 ? "" : "s"} completed</span></div>
  </div>;
}

function RewardStatusPanel({ rewardState, go }: { rewardState: RewardState; go: (s: Section) => void }) {
  const nextReward = rewardCatalog.find(reward => !rewardState.unlockedIds.includes(reward.id) && reward.kind === "streak");
  const progressToNext = nextReward ? Math.min(100, Math.round(rewardState.currentStreak / nextReward.threshold * 100)) : 100;
  const daysLeft = nextReward ? Math.max(0, nextReward.threshold - rewardState.currentStreak) : 0;
  return <section className="panel reward-status-panel">
    <div className="panel-header"><h2><Flame size={17} /> Consistency rewards</h2><button className="link-btn" onClick={() => go("rewards")} data-testid="button-open-rewards">My rewards <ArrowRight size={14} /></button></div>
    <div className="streak-hero"><div className="streak-badge"><Flame size={25} /></div><div><span className="eyebrow">CURRENT STREAK</span><strong>{rewardState.currentStreak} <small>day{rewardState.currentStreak === 1 ? "" : "s"}</small></strong><p>{rewardState.currentStreak ? "A steady rhythm is a real advantage." : "Complete one small study action to begin."}</p></div></div>
    <div className="reward-next"><div className="reward-next-heading"><span>Next unlock</span><strong>{nextReward ? nextReward.title : "Every milestone unlocked"}</strong></div><div className="reward-progress-track"><span style={{ width: `${progressToNext}%` }} /></div><div className="reward-next-foot"><span>{nextReward ? `${daysLeft} more day${daysLeft === 1 ? "" : "s"} to unlock` : "You have built a remarkable rhythm."}</span><span>{nextReward ? `${rewardState.currentStreak}/${nextReward.threshold}` : "✓"}</span></div></div>
  </section>;
}

function RewardsPage({ rewardState, claimReward }: { rewardState: RewardState; claimReward: (id: string) => void }) {
  const nextReward = rewardCatalog.find(reward => !rewardState.unlockedIds.includes(reward.id) && reward.kind === "streak");
  return <div className="animate-page"><PageTitle eyebrow="ANALYZE / KEEP GOING" title="My rewards" description="A quiet record of the consistency you are building." /><div className="rewards-overview"><div className="reward-overview-main"><div className="reward-overview-icon"><Flame size={22} /></div><div><span className="eyebrow">CURRENT STREAK</span><h2>{rewardState.currentStreak} days</h2><p>{nextReward ? `${Math.max(0, nextReward.threshold - rewardState.currentStreak)} more day${nextReward.threshold - rewardState.currentStreak === 1 ? "" : "s"} until ${nextReward.title}.` : "All consistency milestones are unlocked."}</p></div></div><div className="reward-overview-metric"><span>Unlocked</span><strong>{rewardState.unlockedIds.length}</strong><small>of {rewardCatalog.length} rewards</small></div><div className="reward-overview-metric"><span>Claimed</span><strong>{rewardState.claimedIds.length}</strong><small>kept in your studio</small></div></div><section className="panel rewards-panel"><div className="panel-header"><h2><Award size={17} /> Milestones</h2><span className="panel-kicker">keep showing up</span></div><div className="reward-card-grid">{rewardCatalog.map(reward => <RewardCard key={reward.id} reward={reward} unlocked={rewardState.unlockedIds.includes(reward.id)} claimed={rewardState.claimedIds.includes(reward.id)} active={rewardState.activeRewardId === reward.id} onClaim={() => claimReward(reward.id)} />)}</div></section><section className="panel reward-history-panel"><div className="panel-header"><h2><CalendarCheck2 size={17} /> Reward history</h2><span className="panel-kicker">{rewardState.history.length} claimed</span></div>{rewardState.history.length === 0 ? <EmptyState icon={<Gift size={21} />} title="Your first reward is waiting" body="Keep a small study action moving each day and your history will appear here." /> : <div className="reward-history-list">{rewardState.history.map(item => { const reward = rewardCatalog.find(candidate => candidate.id === item.rewardId); return reward ? <div className="reward-history-row" key={`${item.rewardId}-${item.claimedAt}`}><span className="history-icon">{rewardIcon(reward.icon, 16)}</span><div><strong>{reward.title}</strong><span>{reward.label} · claimed {item.claimedAt}</span></div><span className="history-check"><Check size={14} /></span></div> : null; })}</div>}</section></div>;
}

function RewardCard({ reward, unlocked, claimed, active, onClaim }: { reward: RewardDefinition; unlocked: boolean; claimed: boolean; active: boolean; onClaim: () => void }) {
  return <article className={`reward-card ${unlocked ? "reward-unlocked" : "reward-locked"} ${active ? "reward-selected" : ""}`}><div className="reward-card-top"><span className="reward-card-icon">{unlocked ? rewardIcon(reward.icon, 21) : <LockKeyhole size={18} />}</span><span className="reward-threshold">{reward.label}</span></div><h3>{reward.title}</h3><p>{reward.description}</p>{unlocked ? <button className={`secondary-btn small-btn reward-action ${active ? "reward-action-active" : ""}`} onClick={onClaim} data-testid={`button-claim-reward-${reward.id}`}>{active ? <><Check size={14} /> Active</> : claimed ? <><Star size={14} /> Use this reward</> : <><Gift size={14} /> Claim reward</>}</button> : <span className="reward-locked-copy"><LockKeyhole size={12} /> {reward.kind === "goal" ? "Reach 100% weekly goal" : `Reach ${reward.threshold} day streak`}</span>}</article>;
}

function CelebrationBurst({ rewardId }: { rewardId: string }) {
  return <div className="celebration-burst" role="status" aria-live="polite"><div className="celebration-card"><span className="celebration-spark"><Sparkles size={17} /></span><div><strong>Reward unlocked</strong><span>{rewardCatalog.find(reward => reward.id === rewardId)?.title}</span></div></div><span className="confetti confetti-one" /><span className="confetti confetti-two" /><span className="confetti confetti-three" /><span className="confetti confetti-four" /></div>;
}

type WeakTopic = Performance & { percentage: number; priority: "High" | "Medium"; action: string };
type Recommendation = { title: string; reason: string; action: string; kind: "planner" | "insight" | "summary" };

function getWeakTopics(performance: Performance[]): WeakTopic[] {
  return performance
    .map(result => {
      const percentage = result.maxScore ? Math.round(result.score / result.maxScore * 100) : 0;
      const priority: WeakTopic["priority"] = percentage < 60 ? "High" : "Medium";
      return {
        ...result,
        percentage,
        priority,
        action: percentage < 60 ? "Relearn the core idea, then try 3 guided questions." : "Review your errors and complete a short mixed practice set.",
      };
    })
    .filter(result => result.percentage < 80)
    .sort((a, b) => a.percentage - b.percentage);
}

function getNextRecommendation(tasks: StudyTask[], performance: Performance[]): Recommendation | null {
  const weak = getWeakTopics(performance)[0];
  if (weak) {
    return {
      title: `${weak.subject}: ${weak.topic}`,
      reason: `${weak.percentage}% on your latest result. ${weak.action}`,
      action: "Open weak topics",
      kind: "insight",
    };
  }
  const unfinished = [...tasks]
    .filter(task => !task.done)
    .sort((a, b) => (a.priority === "High" ? -1 : b.priority === "High" ? 1 : a.date.localeCompare(b.date)))[0];
  if (unfinished) {
    return {
      title: unfinished.topic,
      reason: `${unfinished.subject} is still open and marked ${unfinished.priority.toLowerCase()} priority.`,
      action: "View study plan",
      kind: "planner",
    };
  }
  if (tasks.length > 0) {
    return {
      title: "Reflect on your last practice",
      reason: "Add a quiz or test result so AI·Mavericks can identify the next topic worth your attention.",
      action: "Add practice result",
      kind: "insight",
    };
  }
  return null;
}

function WeakTopicRow({ topic }: { topic: WeakTopic }) {
  return <div className="weak-topic-row"><div><strong>{topic.topic}</strong><span>{topic.subject}</span></div><div className="weak-topic-score"><strong>{topic.percentage}%</strong><span className={`priority priority-${topic.priority.toLowerCase()}`}>{topic.priority}</span></div></div>;
}

function apiErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data?: unknown }).data;
    if (typeof data === "object" && data !== null && "error" in data) {
      const message = (data as { error?: unknown }).error;
      if (typeof message === "string") return message;
    }
  }
  return "The summary could not be generated. Try again shortly.";
}

function StudySummaryPage() {
  const [material, setMaterial] = useState("");
  const [copied, setCopied] = useState(false);
  const mutation = useCreateAiSummary();
  const summary = mutation.data;
  const copySummary = async () => {
    if (!summary) return;
    const text = [
      "SHORT SUMMARY",
      summary.shortSummary,
      "",
      "KEY POINTS",
      ...summary.keyPoints.map(point => `• ${point}`),
      "",
      "IMPORTANT TERMS",
      ...summary.importantTerms.map(item => `• ${item.term}: ${item.explanation}`),
      "",
      "QUICK REVISION",
      ...summary.quickRevisionPoints.map(point => `• ${point}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  const clear = () => { setMaterial(""); mutation.reset(); setCopied(false); };
  return <div className="animate-page"><PageTitle eyebrow="AI / STUDY SMARTER" title="AI study summary" description="Turn dense material into a revision guide you can actually use." /><div className="summary-layout"><section className="panel summary-input-panel"><div className="panel-header"><h2><FileText size={17} /> Paste study material</h2><span className="mono">{material.length.toLocaleString()} / 30,000</span></div><p className="section-intro">Your material is sent to the secure server only when you choose Generate. Nothing is generated until an AI provider is configured.</p><textarea className="summary-textarea" value={material} onChange={e => setMaterial(e.target.value.slice(0, 30000))} placeholder="Paste lecture notes, textbook excerpts, or a topic explanation here..." data-testid="input-summary-material" /><div className="summary-actions"><button className="secondary-btn" onClick={clear} disabled={!material && !summary} data-testid="button-clear-summary"><RotateCcw size={15} /> Clear</button><button className="primary-btn" onClick={() => mutation.mutate({ data: { material } })} disabled={material.trim().length < 40 || mutation.isPending} data-testid="button-generate-summary">{mutation.isPending ? <><span className="button-spinner" /> Generating...</> : <><Sparkles size={15} /> Generate summary</>}</button></div>{material.trim().length > 0 && material.trim().length < 40 && <p className="field-error">Add at least 40 characters so the summary has enough context.</p>}{mutation.isError && <div className="error-state"><strong>Summary unavailable</strong><span>{apiErrorMessage(mutation.error)}</span></div>}</section><section className="panel summary-output-panel"><div className="panel-header"><h2><Sparkles size={17} /> Your revision guide</h2>{summary && <button className="text-btn" onClick={copySummary} data-testid="button-copy-summary"><Copy size={14} /> {copied ? "Copied" : "Copy"}</button>}</div>{mutation.isPending ? <div className="summary-loading"><div className="loading-orb"><Sparkles size={18} /></div><strong>Reading your material...</strong><p>Pulling out the ideas worth remembering.</p></div> : summary ? <div className="summary-result"><div className="summary-block summary-short"><span className="summary-label">Short summary</span><p>{summary.shortSummary}</p></div><div className="summary-block"><span className="summary-label">Key points</span><ul>{summary.keyPoints.map((point, i) => <li key={i}>{point}</li>)}</ul></div><div className="summary-block"><span className="summary-label">Important terms</span><div className="term-list">{summary.importantTerms.map(item => <div className="term-item" key={item.term}><strong>{item.term}</strong><span>{item.explanation}</span></div>)}</div></div><div className="summary-block revision-block"><span className="summary-label">Quick revision points</span><ul>{summary.quickRevisionPoints.map((point, i) => <li key={i}>{point}</li>)}</ul></div></div> : <EmptyState icon={<FileText size={22} />} title="Your guide will appear here" body="Paste your material, then generate a concise summary with key points, terms, and quick revision prompts." />}</section></div></div>;
}

function InsightsPage({ tasks, performance, setPerformance }: { tasks: StudyTask[]; performance: Performance[]; setPerformance: Dispatch<SetStateAction<Performance[]>> }) {
  const [showForm, setShowForm] = useState(false);
  const weakTopics = getWeakTopics(performance);
  const recommendation = getNextRecommendation(tasks, performance);
  return <div className="animate-page"><PageTitle eyebrow="ANALYZE / IMPROVE" title="Weak topics" description="Use real practice results to choose what deserves another look." action="Add practice result" onAction={() => setShowForm(true)} />{showForm && <PerformanceForm onSave={result => { setPerformance(old => [{ ...result, id: Date.now(), recorded: todayISO }, ...old]); setShowForm(false); }} onCancel={() => setShowForm(false)} />}{recommendation && <div className="recommendation-banner"><div className="recommendation-icon"><Lightbulb size={19} /></div><div><span className="summary-label">Recommended next study topic</span><h2>{recommendation.title}</h2><p>{recommendation.reason}</p></div><button className="secondary-btn small-btn" onClick={() => recommendation.kind === "summary" ? undefined : setShowForm(recommendation.kind === "insight")} data-testid="button-insight-recommendation">{recommendation.action}</button></div>}<div className="insight-layout"><section className="panel weak-topics-panel"><div className="panel-header"><h2><SearchCheck size={17} /> Revision priorities</h2><span className="mono">{weakTopics.length} topic{weakTopics.length === 1 ? "" : "s"}</span></div>{weakTopics.length === 0 ? <EmptyState icon={<BarChart3 size={22} />} title="Not enough data" body="No quiz or test performance has been added yet. Add a result to see honest, data-backed revision priorities." action="Add practice result" onClick={() => setShowForm(true)} /> : <div className="weak-topic-table"><div className="weak-topic-head"><span>Topic</span><span>Performance</span></div>{weakTopics.map(topic => <div className="weak-topic-detail" key={`${topic.id}-${topic.topic}`}><div><strong>{topic.topic}</strong><span>{topic.subject}</span><p>{topic.action}</p></div><div className="detail-score"><strong>{topic.percentage}%</strong><span className={`priority priority-${topic.priority.toLowerCase()}`}>{topic.priority}</span></div></div>)}</div>}</section><section className="panel performance-panel"><div className="panel-header"><h2><BarChart3 size={17} /> Recent practice</h2></div>{performance.length === 0 ? <EmptyState icon={<ClipboardIcon />} title="No results recorded" body="Your insights stay empty rather than guessing. Add a quiz or test score when you have one." /> : <div className="performance-list">{performance.slice(0, 6).map(result => <div className="performance-row" key={result.id}><div><strong>{result.topic}</strong><span>{result.subject} · {result.recorded}</span></div><strong>{Math.round(result.score / result.maxScore * 100)}%</strong><button className="icon-btn" onClick={() => setPerformance(old => old.filter(item => item.id !== result.id))} aria-label={`Delete ${result.topic}`} data-testid={`button-delete-performance-${result.id}`}><Trash2 size={14} /></button></div>)}</div>}</section></div></div>;
}

function ClipboardIcon() {
  return <FileText size={22} />;
}

function PerformanceForm({ onSave, onCancel }: { onSave: (result: Omit<Performance, "id" | "recorded">) => void; onCancel: () => void }) {
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [score, setScore] = useState("0");
  const [maxScore, setMaxScore] = useState("100");
  const scoreNumber = Number(score);
  const maxNumber = Number(maxScore);
  return <div className="form-card"><div className="form-heading"><div><p className="eyebrow">NEW PRACTICE RESULT</p><h2>Give your insights something real</h2></div><button className="icon-btn" onClick={onCancel} data-testid="button-cancel-performance"><X size={17} /></button></div><div className="form-grid"><label>Subject<input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Biology" data-testid="input-performance-subject" /></label><label>Topic<input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Cellular respiration" data-testid="input-performance-topic" /></label><label>Score<input type="number" min="0" value={score} onChange={e => setScore(e.target.value)} data-testid="input-performance-score" /></label><label>Out of<input type="number" min="1" value={maxScore} onChange={e => setMaxScore(e.target.value)} data-testid="input-performance-max" /></label></div><p className="hint">Scores are stored locally on this device and used only to calculate revision priorities.</p><div className="form-actions"><button className="secondary-btn" onClick={onCancel} data-testid="button-cancel-performance-form">Cancel</button><button className="primary-btn" disabled={!subject.trim() || !topic.trim() || !Number.isFinite(scoreNumber) || !Number.isFinite(maxNumber) || maxNumber <= 0 || scoreNumber < 0 || scoreNumber > maxNumber} onClick={() => onSave({ subject: subject.trim(), topic: topic.trim(), score: scoreNumber, maxScore: maxNumber })} data-testid="button-save-performance"><Check size={15} /> Save result</button></div></div>;
}

function ProgressRing({ value }: { value: number }) { return <div className="ring" style={{ "--progress": `${value * 3.6}deg` } as CSSProperties}><div><strong>{value}%</strong><small>today</small></div></div>; }
function PanelHeader({ title, icon, action, onAction }: { title: string; icon: ReactNode; action?: string; onAction?: () => void }) { return <div className="panel-header"><h2>{icon}{title}</h2>{action && <button className="link-btn" onClick={onAction} data-testid={`button-${action.toLowerCase().replaceAll(" ", "-")}`}>{action}<ArrowRight size={14} /></button>}</div>; }
function QuickAction({ icon, label, color, onClick }: { icon: ReactNode; label: string; color: string; onClick: () => void }) { return <button className={`quick-action quick-${color}`} onClick={onClick} data-testid={`button-quick-${label.toLowerCase().replaceAll(" ", "-")}`}><span>{icon}</span><strong>{label}</strong><ArrowRight size={14} /></button>; }
function TaskRow({ task, compact, onToggle, onEdit, onDelete }: { task: StudyTask; compact?: boolean; onToggle?: () => void; onEdit?: () => void; onDelete?: () => void }) { return <div className={`task-row ${task.done ? "task-done" : ""}`} data-testid={`row-study-task-${task.id}`}><button className="check-button" onClick={onToggle} data-testid={`button-complete-task-${task.id}`}>{task.done ? <Check size={14} /> : <span />}</button><div className="task-copy"><strong>{task.topic}</strong><span>{task.subject} <em>·</em> {task.minutes} min</span></div><span className={`priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span>{!compact && <div className="row-actions"><button onClick={onEdit} data-testid={`button-edit-task-${task.id}`}><Edit3 size={14} /></button><button onClick={onDelete} data-testid={`button-delete-task-${task.id}`}><Trash2 size={14} /></button></div>}</div>; }
function EmptyState({ icon, title, body, action, onClick }: { icon: ReactNode; title: string; body: string; action?: string; onClick?: () => void }) { return <div className="empty-state"><div className="empty-icon">{icon}</div><strong>{title}</strong><p>{body}</p>{action && <button className="secondary-btn small-btn" onClick={onClick} data-testid="button-empty-action">{action}</button>}</div>; }

function Planner({ tasks, setTasks }: { tasks: StudyTask[]; setTasks: Dispatch<SetStateAction<StudyTask[]>> }) {
  const [view, setView] = useState<"daily" | "weekly">("daily"); const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<StudyTask | null>(null); const [date, setDate] = useState(todayISO);
  const visible = view === "daily" ? tasks.filter(t => t.date === date) : tasks;
  const openAdd = () => { setEditing(null); setShowForm(true); };
  const save = (data: Omit<StudyTask, "id" | "done">) => { editing ? setTasks(old => old.map(t => t.id === editing.id ? { ...t, ...data } : t)) : setTasks(old => [...old, { ...data, id: Date.now(), done: false }]); setShowForm(false); };
  return <div className="animate-page"><PageTitle eyebrow="PLAN" title="Study planner" description="Turn the blur of everything into one doable day." action="Add study session" onAction={openAdd} /><div className="planner-toolbar"><div className="segmented"><button className={view === "daily" ? "selected" : ""} onClick={() => setView("daily")} data-testid="button-view-daily">Daily view</button><button className={view === "weekly" ? "selected" : ""} onClick={() => setView("weekly")} data-testid="button-view-weekly">Weekly view</button></div>{view === "daily" && <div className="date-nav"><button onClick={() => setDate(new Date(new Date(date).getTime() - 86400000).toISOString().slice(0, 10))} data-testid="button-previous-day"><ChevronLeft size={16} /></button><span>{date === todayISO ? "Today" : new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span><button onClick={() => setDate(new Date(new Date(date).getTime() + 86400000).toISOString().slice(0, 10))} data-testid="button-next-day"><ChevronRight size={16} /></button></div>}</div>{showForm && <TaskForm initial={editing ?? undefined} onSave={save} onCancel={() => setShowForm(false)} />}{visible.length === 0 ? <EmptyState icon={<CalendarDays size={22} />} title={view === "daily" ? "A blank page for today" : "No sessions planned yet"} body="Give your future self something specific to show up for." action="Add a study session" onClick={openAdd} /> : <div className="planner-list">{visible.map(t => <TaskRow task={t} key={t.id} onToggle={() => setTasks(old => old.map(x => x.id === t.id ? { ...x, done: !x.done } : x))} onEdit={() => { setEditing(t); setShowForm(true); }} onDelete={() => setTasks(old => old.filter(x => x.id !== t.id))} />)}</div>}<div className="summary-strip"><span><CheckCircle2 size={16} /> {tasks.filter(t => t.done).length} completed</span><span><Clock3 size={16} /> {tasks.filter(t => !t.done).reduce((a, t) => a + t.minutes, 0)} minutes remaining</span><span><BarChart3 size={16} /> {tasks.length ? Math.round(tasks.filter(t => t.done).length / tasks.length * 100) : 0}% progress</span></div></div>;
}
function PageTitle({ eyebrow, title, description, action, onAction }: { eyebrow: string; title: string; description: string; action?: string; onAction?: () => void }) { return <div className="page-title"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="subhead">{description}</p></div>{action && <button className="primary-btn" onClick={onAction} data-testid={`button-${action.toLowerCase().replaceAll(" ", "-")}`}><Plus size={16} />{action}</button>}</div>; }
function TaskForm({ initial, onSave, onCancel }: { initial?: StudyTask; onSave: (d: Omit<StudyTask, "id" | "done">) => void; onCancel: () => void }) {
  const [subject, setSubject] = useState(initial?.subject ?? ""); const [topic, setTopic] = useState(initial?.topic ?? ""); const [date, setDate] = useState(initial?.date ?? todayISO); const [priority, setPriority] = useState<StudyTask["priority"]>(initial?.priority ?? "Medium"); const [minutes, setMinutes] = useState(String(initial?.minutes ?? 25));
  return <div className="form-card"><div className="form-heading"><div><p className="eyebrow">{initial ? "EDIT SESSION" : "NEW SESSION"}</p><h2>{initial ? "Shape the session" : "What will you work on?"}</h2></div><button className="icon-btn" onClick={onCancel} data-testid="button-cancel-task-form"><X size={17} /></button></div><div className="form-grid"><label>Subject<input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Biology" data-testid="input-task-subject" /></label><label>Topic<input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Cell membranes" data-testid="input-task-topic" /></label><label>Date<input type="date" value={date} onChange={e => setDate(e.target.value)} data-testid="input-task-date" /></label><label>Estimated minutes<input type="number" min="5" value={minutes} onChange={e => setMinutes(e.target.value)} data-testid="input-task-minutes" /></label><label>Priority<select value={priority} onChange={e => setPriority(e.target.value as StudyTask["priority"])} data-testid="select-task-priority"><option>High</option><option>Medium</option><option>Low</option></select></label></div><div className="form-actions"><button className="secondary-btn" onClick={onCancel} data-testid="button-cancel-task">Cancel</button><button className="primary-btn" disabled={!subject.trim() || !topic.trim()} onClick={() => onSave({ subject, topic, date, priority, minutes: Number(minutes) || 25 })} data-testid="button-save-task"><Check size={15} /> Save session</button></div></div>;
}

function TodoPage({ todos, setTodos }: { todos: Todo[]; setTodos: Dispatch<SetStateAction<Todo[]>> }) { const [text, setText] = useState(""); const [editing, setEditing] = useState<number | null>(null); const [editText, setEditText] = useState("");
  const add = () => { if (text.trim()) { setTodos(old => [...old, { id: Date.now(), text: text.trim(), done: false, created: todayISO }]); setText(""); } }; const pending = todos.filter(t => !t.done); const completed = todos.filter(t => t.done);
  return <div className="animate-page"><PageTitle eyebrow="PLAN / SMALL WINS" title="To-do list" description="The little things deserve a home too." /><div className="todo-layout"><div className="panel add-todo"><div className="panel-header"><h2><ListTodo size={17} /> Add something</h2></div><div className="add-input"><input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="What needs doing?" data-testid="input-new-todo" /><button className="primary-btn" onClick={add} data-testid="button-add-todo"><Plus size={16} /> Add</button></div><p className="hint">Press Enter to add quickly</p></div><div className="panel todo-board"><div className="board-heading"><div><p className="eyebrow">IN MOTION</p><h2>{pending.length} open task{pending.length === 1 ? "" : "s"}</h2></div><span className="board-mark"><Target size={19} /></span></div>{pending.length === 0 ? <EmptyState icon={<CheckCircle2 size={22} />} title="A beautifully empty list" body="Enjoy the clear space, or add the next small win." /> : pending.map(todo => <TodoRow key={todo.id} todo={todo} editing={editing === todo.id} editText={editText} setEditText={setEditText} onToggle={() => setTodos(old => old.map(t => t.id === todo.id ? { ...t, done: true } : t))} onEdit={() => { setEditing(todo.id); setEditText(todo.text); }} onSave={() => { setTodos(old => old.map(t => t.id === todo.id ? { ...t, text: editText } : t)); setEditing(null); }} onDelete={() => setTodos(old => old.filter(t => t.id !== todo.id))} />)}{completed.length > 0 && <div className="completed-heading"><Archive size={14} /> Completed · {completed.length}</div>}{completed.map(todo => <TodoRow key={todo.id} todo={todo} onToggle={() => setTodos(old => old.map(t => t.id === todo.id ? { ...t, done: false } : t))} onDelete={() => setTodos(old => old.filter(t => t.id !== todo.id))} />)}</div></div></div>;
}
function TodoRow({ todo, onToggle, onEdit, onDelete, editing, editText, setEditText, onSave }: { todo: Todo; onToggle: () => void; onEdit?: () => void; onDelete: () => void; editing?: boolean; editText?: string; setEditText?: (v: string) => void; onSave?: () => void }) { return <div className={`todo-row ${todo.done ? "todo-complete" : ""}`}>{editing ? <><input autoFocus value={editText} onChange={e => setEditText?.(e.target.value)} data-testid={`input-edit-todo-${todo.id}`} /><button onClick={onSave} data-testid={`button-save-todo-${todo.id}`}><Check size={15} /></button></> : <><button className="check-button" onClick={onToggle} data-testid={`button-complete-todo-${todo.id}`}>{todo.done ? <Check size={14} /> : <span />}</button><span>{todo.text}</span><div className="row-actions"><button onClick={onEdit} disabled={todo.done} data-testid={`button-edit-todo-${todo.id}`}><Edit3 size={14} /></button><button onClick={onDelete} data-testid={`button-delete-todo-${todo.id}`}><Trash2 size={14} /></button></div></>}</div>; }

function NotesPage({ notes, setNotes }: { notes: Note[]; setNotes: Dispatch<SetStateAction<Note[]>> }) { const [editing, setEditing] = useState<Note | null>(null); const [showForm, setShowForm] = useState(false);
  const save = (data: Omit<Note, "id" | "updated">) => { setNotes(old => editing ? old.map(n => n.id === editing.id ? { ...n, ...data, updated: "Just now" } : n) : [{ ...data, id: Date.now(), updated: "Just now" }, ...old]); setShowForm(false); };
  return <div className="animate-page"><PageTitle eyebrow="STUDY / REMEMBER" title="Sticky notes" description="Keep the useful fragments close." action="New note" onAction={() => { setEditing(null); setShowForm(true); }} />{showForm && <NoteForm initial={editing ?? undefined} onSave={save} onCancel={() => setShowForm(false)} />}{notes.length === 0 ? <EmptyState icon={<NotebookPen size={22} />} title="Your wall is waiting" body="Capture a definition, a question, or a thought worth returning to." action="Create a note" onClick={() => setShowForm(true)} /> : <div className="notes-grid">{notes.map(note => <article className={`sticky-note note-${note.color}`} key={note.id} data-testid={`card-note-${note.id}`}><div className="sticky-top"><span className="note-date">{note.updated}</span><div><button onClick={() => setNotes(old => old.map(n => n.id === note.id ? { ...n, pinned: !n.pinned } : n))} data-testid={`button-pin-note-${note.id}`}>{note.pinned ? <Pin size={15} fill="currentColor" /> : <PinOff size={15} />}</button><button onClick={() => { setEditing(note); setShowForm(true); }} data-testid={`button-edit-note-${note.id}`}><Edit3 size={15} /></button><button onClick={() => setNotes(old => old.filter(n => n.id !== note.id))} data-testid={`button-delete-note-${note.id}`}><Trash2 size={15} /></button></div></div><h2>{note.title}</h2><p>{note.content}</p>{note.pinned && <span className="pinned-label"><Pin size={11} fill="currentColor" /> Pinned</span>}</article>)}</div>}</div>; }
function NoteForm({ initial, onSave, onCancel }: { initial?: Note; onSave: (d: Omit<Note, "id" | "updated">) => void; onCancel: () => void }) { const [title, setTitle] = useState(initial?.title ?? ""); const [content, setContent] = useState(initial?.content ?? ""); const [color, setColor] = useState(initial?.color ?? "yellow"); const [pinned, setPinned] = useState(initial?.pinned ?? false); return <div className="form-card note-form"><div className="form-heading"><div><p className="eyebrow">{initial ? "EDIT NOTE" : "NEW NOTE"}</p><h2>Leave a useful trace</h2></div><button className="icon-btn" onClick={onCancel} data-testid="button-cancel-note"><X size={17} /></button></div><label>Title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="A thought worth keeping" data-testid="input-note-title" /></label><label>Content<textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write it down before it floats away..." rows={4} data-testid="input-note-content" /></label><div className="note-form-bottom"><div className="color-picker">{["yellow", "lilac", "mint", "coral"].map(c => <button key={c} className={`color-dot dot-${c} ${color === c ? "color-selected" : ""}`} onClick={() => setColor(c)} aria-label={`Choose ${c}`} data-testid={`button-note-color-${c}`} />)}</div><button className={`pin-toggle ${pinned ? "pin-on" : ""}`} onClick={() => setPinned(!pinned)} data-testid="button-toggle-note-pin">{pinned ? <Pin size={14} fill="currentColor" /> : <PinOff size={14} />} {pinned ? "Pinned" : "Pin note"}</button><div className="form-actions"><button className="secondary-btn" onClick={onCancel} data-testid="button-cancel-note-form">Cancel</button><button className="primary-btn" disabled={!title.trim() || !content.trim()} onClick={() => onSave({ title, content, color, pinned })} data-testid="button-save-note"><Check size={15} /> Save note</button></div></div></div>; }

function ContactsPage({ contacts, setContacts }: { contacts: Contact[]; setContacts: Dispatch<SetStateAction<Contact[]>> }) { const [show, setShow] = useState(false); const [editing, setEditing] = useState<Contact | null>(null); const save = (data: Omit<Contact, "id">) => { setContacts(old => editing ? old.map(c => c.id === editing.id ? { ...c, ...data } : c) : [...old, { ...data, id: Date.now() }]); setShow(false); }; return <div className="animate-page"><PageTitle eyebrow="YOUR PEOPLE" title="Important contacts" description="The right person, one tap away." action="Add contact" onAction={() => { setEditing(null); setShow(true); }} /><div className="private-note"><Users size={16} /><span>Private by design. Your contacts stay in this browser.</span></div>{show && <ContactForm initial={editing ?? undefined} onSave={save} onCancel={() => setShow(false)} />}{contacts.length === 0 ? <EmptyState icon={<Users size={22} />} title="No contacts yet" body="Save a tutor, study partner, or someone who keeps you accountable." action="Add a contact" onClick={() => setShow(true)} /> : <div className="contacts-grid">{contacts.map((contact, i) => <div className="contact-card" key={contact.id} data-testid={`card-contact-${contact.id}`}><div className={`contact-avatar avatar-color-${i % 4}`}>{contact.name.split(" ").map(x => x[0]).join("").slice(0, 2)}</div><div className="contact-info"><h2>{contact.name}</h2><p>{contact.role}</p><span>{contact.phone}</span></div><div className="contact-actions"><a href={`tel:${contact.phone}`} className="call-btn" data-testid={`link-call-contact-${contact.id}`}><Phone size={15} /> Call</a><button onClick={() => { setEditing(contact); setShow(true); }} data-testid={`button-edit-contact-${contact.id}`}><Edit3 size={15} /></button><button onClick={() => setContacts(old => old.filter(c => c.id !== contact.id))} data-testid={`button-delete-contact-${contact.id}`}><Trash2 size={15} /></button></div></div>)}</div>}</div>; }
function ContactForm({ initial, onSave, onCancel }: { initial?: Contact; onSave: (d: Omit<Contact, "id">) => void; onCancel: () => void }) { const [name, setName] = useState(initial?.name ?? ""); const [role, setRole] = useState(initial?.role ?? ""); const [phone, setPhone] = useState(initial?.phone ?? ""); return <div className="form-card"><div className="form-heading"><div><p className="eyebrow">{initial ? "EDIT CONTACT" : "NEW CONTACT"}</p><h2>Keep the good people close</h2></div><button className="icon-btn" onClick={onCancel} data-testid="button-cancel-contact"><X size={17} /></button></div><div className="form-grid"><label>Name<input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" data-testid="input-contact-name" /></label><label>Role<input value={role} onChange={e => setRole(e.target.value)} placeholder="Tutor, study partner..." data-testid="input-contact-role" /></label><label>Phone number<input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" data-testid="input-contact-phone" /></label></div><div className="form-actions"><button className="secondary-btn" onClick={onCancel} data-testid="button-cancel-contact-form">Cancel</button><button className="primary-btn" disabled={!name.trim() || !phone.trim()} onClick={() => onSave({ name, role, phone })} data-testid="button-save-contact"><Check size={15} /> Save contact</button></div></div>; }

function FocusPage() { const [mode, setMode] = useState<"focus" | "break">("focus"); const [focusDuration, setFocusDuration] = useStored("mavericks-focus-duration", 25); const [breakDuration, setBreakDuration] = useStored("mavericks-break-duration", 5); const [seconds, setSeconds] = useState(focusDuration * 60); const [running, setRunning] = useState(false); const [sessions, setSessions] = useStored("mavericks-sessions", 3); const [music, setMusic] = useState(false); const [volume, setVolume] = useState(55);
  useEffect(() => { if (!running) return; const tick = window.setInterval(() => setSeconds(s => { if (s <= 1) { setRunning(false); if (mode === "focus") setSessions(sessions + 1); return (mode === "focus" ? breakDuration : focusDuration) * 60; } return s - 1; }), 1000); return () => window.clearInterval(tick); }, [running, mode, focusDuration, breakDuration, sessions, setSessions]);
  const switchMode = (next: "focus" | "break") => { setMode(next); setRunning(false); setSeconds((next === "focus" ? focusDuration : breakDuration) * 60); };
  const reset = () => { setRunning(false); setSeconds((mode === "focus" ? focusDuration : breakDuration) * 60); };
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0"); const secs = (seconds % 60).toString().padStart(2, "0"); const total = (mode === "focus" ? focusDuration : breakDuration) * 60; const ring = Math.max(0, Math.min(360, (1 - seconds / total) * 360));
  return <div className="animate-page"><PageTitle eyebrow="FOCUS / DEEP WORK" title="Focus timer" description="Protect a little time for the work that matters." /><div className="focus-layout"><div className="timer-card"><div className="timer-tabs"><button className={mode === "focus" ? "active" : ""} onClick={() => switchMode("focus")} data-testid="button-timer-focus"><Target size={15} /> Focus</button><button className={mode === "break" ? "active" : ""} onClick={() => switchMode("break")} data-testid="button-timer-break"><Coffee size={15} /> Break</button></div><div className="timer-ring" style={{ "--timer-progress": `${ring}deg` } as CSSProperties}><div><span className="timer-mode">{mode === "focus" ? "FOCUS SESSION" : "TAKE A BREATH"}</span><strong>{mins}:{secs}</strong><span className="timer-status">{running ? "In the zone" : "Ready when you are"}</span></div></div><div className="timer-controls"><button className="reset-btn" onClick={reset} data-testid="button-reset-timer"><RotateCcw size={16} /></button><button className="timer-play" onClick={() => setRunning(!running)} data-testid="button-toggle-timer">{running ? <span className="pause-bars" /> : <Play size={23} fill="currentColor" />}</button><div className="session-count"><span>{sessions}</span><small>sessions<br />today</small></div></div></div><div className="focus-side"><div className="panel focus-note"><p className="eyebrow">A GENTLE SETUP</p><h2>Make the room<br />a little quieter.</h2><p>Put your phone just out of reach. Choose one task. When the timer ends, you can decide what is next.</p><div className="focus-line"><span /><span /><span /><span /><span /></div></div><div className="panel music-card"><div className="panel-header"><h2><Music2 size={17} /> Mindful music</h2><span className="not-autoplay">never autoplay</span></div><div className="music-control"><button className={`music-play ${music ? "playing" : ""}`} onClick={() => setMusic(!music)} data-testid="button-toggle-music">{music ? <span className="pause-bars small" /> : <Play size={16} fill="currentColor" />}</button><div><strong>{music ? "Rain room is playing" : "Rain room"}</strong><small>soft ambience · 42 min</small></div><div className="volume-control"><button onClick={() => setVolume(volume ? 0 : 55)} data-testid="button-toggle-volume">{volume ? <Volume2 size={16} /> : <VolumeX size={16} />}</button><input type="range" min="0" max="100" value={volume} onChange={e => setVolume(Number(e.target.value))} aria-label="Music volume" data-testid="input-music-volume" /></div></div></div><div className="panel duration-card"><div className="panel-header"><h2><Clock3 size={17} /> Session length</h2></div><div className="duration-grid"><label>Focus <div><input type="number" min="1" max="90" value={focusDuration} onChange={e => { const v = Number(e.target.value) || 25; setFocusDuration(v); if (mode === "focus" && !running) setSeconds(v * 60); }} data-testid="input-focus-duration" /><span>min</span></div></label><label>Break <div><input type="number" min="1" max="30" value={breakDuration} onChange={e => { const v = Number(e.target.value) || 5; setBreakDuration(v); if (mode === "break" && !running) setSeconds(v * 60); }} data-testid="input-break-duration" /><span>min</span></div></label></div></div></div></div></div>;
}

function SettingsPage({ dark, toggleTheme }: { dark: boolean; toggleTheme: () => void }) { return <div className="animate-page"><PageTitle eyebrow="WORKSPACE" title="Settings" description="Make the studio feel like yours." /><div className="settings-list"><div className="setting-row"><div className="setting-icon"><Sun size={18} /></div><div><h2>Appearance</h2><p>Choose the light that helps you think.</p></div><button className={`theme-switch ${dark ? "on" : ""}`} onClick={toggleTheme} data-testid="button-settings-theme"><span />{dark ? "Dark" : "Light"}</button></div><div className="setting-row"><div className="setting-icon"><Archive size={18} /></div><div><h2>Local workspace</h2><p>Your plans, notes, and preferences are stored on this device.</p></div><span className="saved-badge"><CheckCircle2 size={14} /> Saved automatically</span></div><div className="setting-row"><div className="setting-icon"><Sparkles size={18} /></div><div><h2>About AI·Mavericks</h2><p>A quiet place to plan, study, focus, analyze, and improve.</p></div><span className="version">v1.0</span></div></div></div>; }

export default App;