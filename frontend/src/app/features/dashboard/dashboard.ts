import { Component, HostListener, afterNextRender, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LanguageService, LOCALE_OPTIONS } from '../../core/services/language.service';
import { TranslateService } from '../../core/services/translate.service';
import { AuthService } from '../../core/services/auth.service';
import { ProgressService } from '../../core/services/progress.service';
import { QuestionsStore } from '../../core/services/questions-store.service';
import { ThemeService } from '../../core/services/theme.service';
import { StreakService } from '../../core/services/streak.service';
import { TestPreferencesService } from '../../core/services/test-preferences.service';

interface ListItem {
  icon: string;
  labelKey: string;
  route: string;
  iconColor: string;
}

interface RoadStage {
  labelKey: string;
  route: string;
  /** Yo'l ustidagi o'rni (SVG koordinatasi, 0–1000). */
  x: number;
  kind: 'blue' | 'ticket' | 'warning' | 'finish';
  value: string;
  done: boolean;
}

/** Rasmiy biletlar soni (ptest.uz bilan bir xil). */
const TOTAL_TICKETS = 66;

// Spidometr: markazi (130, 140), radiusi 100 bo'lgan yarim aylana.
const GAUGE_LENGTH = Math.PI * 100;

// "Imtihongacha yo'l" egri chizig'i — ikkita kubik Bezye bo'lagi (SVG'dagi path bilan bir xil).
type Pt = [number, number];
const ROAD_SEGMENTS: [Pt, Pt, Pt, Pt][] = [
  [[0, 70], [190, 70], [250, 40], [500, 40]],
  [[500, 40], [750, 40], [810, 75], [1000, 60]],
];
const ROAD_PATH = 'M0 70 C190 70 250 40 500 40 C750 40 810 75 1000 60';

function bezier([a, b, c, d]: [Pt, Pt, Pt, Pt], t: number): Pt {
  const u = 1 - t;
  return [
    u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
    u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
  ];
}

/** Yo'l bo'ylab nuqtalar: [x, y, boshidan masofa]. */
const ROAD_SAMPLES: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  let length = 0;
  let prev: Pt | null = null;
  for (const segment of ROAD_SEGMENTS) {
    for (let i = 0; i <= 100; i++) {
      const p = bezier(segment, i / 100);
      if (prev) length += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      out.push([p[0], p[1], length]);
      prev = p;
    }
  }
  return out;
})();

/** x bo'yicha yo'ldagi nuqta, burilish burchagi va boshidan masofa. */
function roadPointAtX(x: number): { x: number; y: number; angle: number; length: number } {
  const i = Math.max(1, ROAD_SAMPLES.findIndex((p) => p[0] >= x));
  const [x1, y1, l1] = ROAD_SAMPLES[i - 1];
  const [x2, y2, l2] = ROAD_SAMPLES[i] ?? ROAD_SAMPLES[ROAD_SAMPLES.length - 1];
  const k = x2 === x1 ? 0 : (x - x1) / (x2 - x1);
  return {
    x,
    y: y1 + (y2 - y1) * k,
    angle: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI,
    length: l1 + (l2 - l1) * k,
  };
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  protected readonly router = inject(Router);
  protected readonly languageService = inject(LanguageService);
  protected readonly translate = inject(TranslateService);
  protected readonly auth = inject(AuthService);
  protected readonly progress = inject(ProgressService);
  protected readonly questionsStore = inject(QuestionsStore);
  protected readonly theme = inject(ThemeService);
  private readonly streak = inject(StreakService);
  private readonly prefs = inject(TestPreferencesService);
  protected readonly localeOptions = LOCALE_OPTIONS;

  protected readonly roadPath = ROAD_PATH;
  protected readonly gaugeLength = GAUGE_LENGTH;
  protected readonly dailyGoal = this.prefs.dailyGoal;
  /** Birinchi chizishdan keyin true — spidometr strelkasi va yo'ldagi mashina 0 dan siljib keladi. */
  protected readonly mounted = signal(false);

  constructor() {
    this.streak.recordToday();
    afterNextRender(() => setTimeout(() => this.mounted.set(true), 50));
  }

  protected readonly userName = computed(
    () => this.auth.currentUser()?.fullName || this.auth.currentUser()?.phone || this.translate.t('dashboard.userNamePlaceholder'),
  );
  protected readonly userInitial = computed(() => this.userName().charAt(0).toUpperCase() || 'F');
  protected readonly userRole = computed(() => this.auth.currentUser()?.role ?? 'user');
  protected readonly roleLabel = computed(() => this.translate.t(`dashboard.role.${this.userRole()}`));

  protected readonly totalQuestions = computed(() => this.questionsStore.questions().length);
  protected readonly correctCount = computed(() => this.progress.correctIds().size);
  protected readonly wrongCount = computed(() => Object.keys(this.progress.mistakes()).length);
  protected readonly skippedCount = computed(() =>
    Math.max(0, this.totalQuestions() - this.correctCount() - this.wrongCount()),
  );
  // Progress — belgilangan (to'g'ri yoki noto'g'ri javob berilgan) savollarning umumiy savollarga nisbati.
  protected readonly progressPercent = computed(() =>
    this.totalQuestions()
      ? Math.round(((this.correctCount() + this.wrongCount()) / this.totalQuestions()) * 100)
      : 0,
  );

  protected readonly streakDays = this.streak.streakDays;

  // ---- Spidometr
  private readonly shownPercent = computed(() => (this.mounted() ? this.progressPercent() : 0));
  protected readonly gaugeOffset = computed(() => GAUGE_LENGTH * (1 - this.shownPercent() / 100));
  /** Strelka: 0% — chapga (-90°), 100% — o'ngga (+90°). */
  protected readonly needleAngle = computed(() => -90 + (this.shownPercent() / 100) * 180);
  protected readonly gaugeTicks = [0, 25, 50, 75, 100].map((p) => {
    const a = Math.PI * (1 - p / 100);
    return { x1: 130 + 100 * Math.cos(a) * 0.86, y1: 140 - 100 * Math.sin(a) * 0.86, x2: 130 + 100 * Math.cos(a) * 0.74, y2: 140 - 100 * Math.sin(a) * 0.74 };
  });

  // ---- Bosqichlar
  private readonly topicQuestions = computed(() => this.questionsStore.questions().filter((q) => q.topic));
  protected readonly topicCount = computed(() => new Set(this.topicQuestions().map((q) => q.topic!.id)).size);
  protected readonly topicsPercent = computed(() => {
    const questions = this.topicQuestions();
    if (!questions.length) return 0;
    const correct = this.progress.correctIds();
    const mistakes = this.progress.mistakes();
    const answered = questions.filter((q) => correct.has(q.id) || q.id in mistakes).length;
    return Math.round((answered / questions.length) * 100);
  });
  protected readonly ticketsAttempted = computed(() => Object.keys(this.progress.ticketStats()).length);
  protected readonly ticketsPercent = computed(() =>
    Math.min(100, Math.round((this.ticketsAttempted() / TOTAL_TICKETS) * 100)),
  );
  protected readonly totalTickets = TOTAL_TICKETS;

  private readonly todayEvents = computed(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return this.progress.history().filter((e) => e.timestamp >= start.getTime());
  });
  protected readonly todayCount = computed(() => this.todayEvents().length);

  // ---- "Bugungi maqsad" oynasi
  protected readonly goalOpen = signal(false);
  protected readonly todayCorrect = computed(() => this.todayEvents().filter((e) => e.isCorrect).length);
  protected readonly todayWrong = computed(() => this.todayCount() - this.todayCorrect());
  protected readonly goalPercent = computed(() => Math.min(100, Math.round((this.todayCount() / this.prefs.dailyGoal()) * 100)));
  protected readonly goalLeft = computed(() => Math.max(0, this.prefs.dailyGoal() - this.todayCount()));
  /** Halqa: r=52 aylana uzunligi. */
  protected readonly ringLength = 2 * Math.PI * 52;
  protected readonly Math = Math;
  /** So'nggi 7 kun: har kuni yechilgan savollar soni. */
  protected readonly weekBars = computed(() => {
    const days: { label: string; count: number; today: boolean; reached: boolean }[] = [];
    const history = this.progress.history();
    for (let i = 6; i >= 0; i--) {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - i);
      const end = start.getTime() + 24 * 60 * 60 * 1000;
      const count = history.filter((e) => e.timestamp >= start.getTime() && e.timestamp < end).length;
      const label = `${String(start.getDate()).padStart(2, '0')}.${String(start.getMonth() + 1).padStart(2, '0')}`;
      days.push({ label, count, today: i === 0, reached: count >= this.prefs.dailyGoal() });
    }
    return days;
  });
  protected readonly weekMax = computed(() => Math.max(this.prefs.dailyGoal(), ...this.weekBars().map((d) => d.count)));

  @HostListener('document:keydown.escape')
  closeGoal(): void {
    this.goalOpen.set(false);
  }

  protected readonly stages = computed<RoadStage[]>(() => {
    const topicsDone = this.topicsPercent() >= 100;
    const ticketsDone = this.ticketsPercent() >= 100;
    const answered = this.correctCount() + this.wrongCount();
    return [
      { labelKey: 'dashboard.road.topics', route: '/tests/topics', x: 110, kind: 'blue', value: `${this.topicsPercent()}%`, done: topicsDone },
      { labelKey: 'dashboard.road.tickets', route: '/tests/tickets', x: 390, kind: 'ticket', value: `${this.ticketsPercent()}%`, done: ticketsDone },
      {
        labelKey: 'dashboard.road.mistakes',
        route: '/tests/mistakes',
        x: 670,
        kind: 'warning',
        value: this.translate.t('dashboard.road.mistakesValue', { count: this.wrongCount() }),
        done: answered > 0 && this.wrongCount() === 0,
      },
      { labelKey: 'dashboard.road.exam', route: '/tests', x: 920, kind: 'finish', value: '', done: false },
    ];
  });
  protected readonly stagesDone = computed(() => this.stages().filter((s) => s.done).length);

  /** Mashina qayerda: mavzular → biletlar → xatolar bosqichlari bo'ylab. */
  private readonly carProgress = computed(() => {
    const t = this.topicsPercent() / 100;
    const b = this.ticketsPercent() / 100;
    const m = t >= 1 && b >= 1 ? (this.wrongCount() === 0 ? 1 : 0.5) : 0;
    return t + b + m; // 0..3
  });
  protected readonly car = computed(() => {
    const stops = [18, 110, 390, 670, 920];
    const s = this.mounted() ? this.carProgress() : 0;
    const i = Math.min(3, Math.floor(s));
    const x = stops[i] + (stops[i + 1] - stops[i]) * (s - i);
    return roadPointAtX(x);
  });
  protected readonly roadTotal = ROAD_SAMPLES[ROAD_SAMPLES.length - 1][2];

  /** "Davom ettirish": birinchi yechilmagan bilet, hammasi yechilgan bo'lsa — xatolar yoki imtihon. */
  protected readonly continueTarget = computed(() => {
    const stats = this.progress.ticketStats();
    for (let n = 1; n <= TOTAL_TICKETS; n++) {
      if (!stats[n]) {
        return { route: `/tests/tickets/${n}`, label: this.translate.t('dashboard.continue.ticket', { n }) };
      }
    }
    return this.wrongCount() > 0
      ? { route: '/tests/mistakes', label: this.translate.t('dashboard.continue.mistakes') }
      : { route: '/tests', label: this.translate.t('dashboard.continue.exam') };
  });

  readonly listItems: ListItem[] = [
    { icon: 'list', labelKey: 'dashboard.quickActions.allTests', route: '/tests/all', iconColor: 'text-sky-500' },
    { icon: 'shuffle', labelKey: 'dashboard.menu.randomTests', route: '/tests/random', iconColor: 'text-violet-500' },
    { icon: 'bookmark', labelKey: 'dashboard.menu.savedQuestions', route: '/tests/saved', iconColor: 'text-road-500' },
    { icon: 'chart', labelKey: 'dashboard.menu.progressTracking', route: '/progress', iconColor: 'text-emerald-500' },
  ];

  resetProgress(): void {
    if (confirm(this.translate.t('dashboard.progress.resetConfirm'))) {
      this.progress.resetProgress();
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
