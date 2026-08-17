import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { QuestionsStore } from '../../core/services/questions-store.service';
import { ProgressService } from '../../core/services/progress.service';
import { StreakService } from '../../core/services/streak.service';
import { TopicsApiService } from '../../core/services/topics-api.service';
import { TicketsApiService } from '../../core/services/tickets-api.service';
import { TestHistoryService, TestSessionRecord } from '../../core/services/test-history.service';
import { Topic, Ticket } from '../../core/models/question.model';

type RangeKey = 'today' | '7d' | '30d' | 'all';

interface TopicStat {
  id: string;
  name: string;
  total: number;
  correct: number;
  percent: number;
}

interface TicketSummary {
  green: number;
  yellow: number;
  red: number;
  none: number;
  total: number;
}

interface DayBucket {
  key: string;
  date: Date;
  correct: number;
  wrong: number;
}

interface HeatmapCell {
  key: string;
  date: Date;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

const DAY_MS = 86_400_000;
const DAILY_GOAL = 20;
const HEATMAP_WEEKS = 12;

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

@Component({
  selector: 'app-progress-page',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './progress.html',
})
export class ProgressPage {
  protected readonly store = inject(QuestionsStore);
  protected readonly progress = inject(ProgressService);
  protected readonly streak = inject(StreakService);
  protected readonly testHistory = inject(TestHistoryService);
  private readonly topicsApi = inject(TopicsApiService);
  private readonly ticketsApi = inject(TicketsApiService);

  private readonly topics = signal<Topic[]>([]);
  private readonly tickets = signal<Ticket[]>([]);

  readonly range = signal<RangeKey>('30d');
  readonly hoveredDayIndex = signal<number | null>(null);

  constructor() {
    this.topicsApi.findAll().subscribe({ next: (topics) => this.topics.set(topics) });
    this.ticketsApi.findAll().subscribe({ next: (tickets) => this.tickets.set(tickets) });
  }

  setRange(range: RangeKey): void {
    this.range.set(range);
    this.hoveredDayIndex.set(null);
  }

  // ---------- All-time state (hero, donut, topics, radials) ----------

  readonly totalQuestions = computed(() => this.store.questions().length);
  readonly correctCount = computed(() => this.progress.correctIds().size);
  readonly wrongCount = computed(() => Object.keys(this.progress.mistakes()).length);
  readonly skippedCount = computed(() =>
    Math.max(0, this.totalQuestions() - this.correctCount() - this.wrongCount()),
  );
  readonly overallPercent = computed(() =>
    this.totalQuestions() ? Math.round((this.correctCount() / this.totalQuestions()) * 100) : 0,
  );
  readonly savedCount = computed(() => this.progress.savedIds().size);

  readonly correctPercentOfTotal = computed(() =>
    this.totalQuestions() ? (this.correctCount() / this.totalQuestions()) * 100 : 0,
  );
  readonly wrongPercentOfTotal = computed(() =>
    this.totalQuestions() ? (this.wrongCount() / this.totalQuestions()) * 100 : 0,
  );
  readonly skippedPercentOfTotal = computed(() =>
    this.totalQuestions() ? (this.skippedCount() / this.totalQuestions()) * 100 : 0,
  );

  readonly topicStats = computed<TopicStat[]>(() => {
    const correctIds = this.progress.correctIds();
    return this.topics()
      .map((topic) => {
        const questions = this.store.byTopic(topic.id);
        const total = questions.length;
        const correct = questions.filter((q) => correctIds.has(q.id)).length;
        return {
          id: topic.id,
          name: topic.name,
          total,
          correct,
          percent: total ? Math.round((correct / total) * 100) : 0,
        };
      })
      .filter((stat) => stat.total > 0)
      .sort((a, b) => b.percent - a.percent);
  });

  /** Topics with at least one answered question, weakest first. */
  readonly weakTopics = computed(() =>
    [...this.topicStats()]
      .filter((t) => t.correct > 0 || this.hasAnyAttempt(t.id))
      .sort((a, b) => a.percent - b.percent)
      .slice(0, 3),
  );

  readonly strongTopics = computed(() =>
    this.topicStats()
      .filter((t) => t.correct > 0)
      .slice(0, 3),
  );

  private hasAnyAttempt(topicId: string): boolean {
    const mistakeIds = new Set(Object.keys(this.progress.mistakes()));
    return this.store.byTopic(topicId).some((q) => mistakeIds.has(q.id));
  }

  readonly knowledgeLevel = computed(() => {
    const attempted = this.topicStats().filter((t) => t.correct > 0 || this.hasAnyAttempt(t.id));
    if (!attempted.length) {
      return 0;
    }
    return Math.round(attempted.reduce((sum, t) => sum + t.percent, 0) / attempted.length);
  });

  readonly ticketSummary = computed<TicketSummary>(() => {
    const stats = this.progress.ticketStats();
    let green = 0;
    let yellow = 0;
    let red = 0;
    let none = 0;

    for (const ticket of this.tickets()) {
      const stat = stats[ticket.number];
      if (!stat) {
        none += 1;
      } else if (stat.wrong <= 1) {
        green += 1;
      } else if (stat.wrong === 2) {
        yellow += 1;
      } else {
        red += 1;
      }
    }

    return { green, yellow, red, none, total: this.tickets().length };
  });

  // ---------- Range-scoped state (KPIs, line chart, recent tests) ----------

  readonly rangeDays = computed(() => {
    switch (this.range()) {
      case 'today':
        return 1;
      case '7d':
        return 7;
      case '30d':
        return 30;
      case 'all': {
        const history = this.progress.history();
        if (!history.length) {
          return 7;
        }
        const earliest = Math.min(...history.map((e) => e.timestamp));
        const days = Math.ceil((Date.now() - earliest) / DAY_MS) + 1;
        return Math.min(Math.max(days, 7), 120);
      }
    }
  });

  readonly rangeStartMs = computed(() => startOfDay(new Date()).getTime() - (this.rangeDays() - 1) * DAY_MS);

  readonly filteredHistory = computed(() =>
    this.progress.history().filter((e) => e.timestamp >= this.rangeStartMs()),
  );

  readonly periodCorrect = computed(() => this.filteredHistory().filter((e) => e.isCorrect).length);
  readonly periodWrong = computed(() => this.filteredHistory().filter((e) => !e.isCorrect).length);

  private readonly previousPeriod = computed(() => {
    const days = this.rangeDays();
    const start = this.rangeStartMs() - days * DAY_MS;
    const end = this.rangeStartMs();
    return this.progress.history().filter((e) => e.timestamp >= start && e.timestamp < end);
  });

  readonly previousPeriodCorrect = computed(() => this.previousPeriod().filter((e) => e.isCorrect).length);
  readonly previousPeriodWrong = computed(() => this.previousPeriod().filter((e) => !e.isCorrect).length);

  readonly correctTrend = computed(() => this.trendPercent(this.periodCorrect(), this.previousPeriodCorrect()));
  readonly wrongTrend = computed(() => this.trendPercent(this.periodWrong(), this.previousPeriodWrong()));

  private trendPercent(current: number, previous: number): number | null {
    if (this.progress.history().length === 0) {
      return null;
    }
    if (previous === 0) {
      return current > 0 ? 100 : null;
    }
    return Math.round(((current - previous) / previous) * 100);
  }

  readonly testsInRange = computed<TestSessionRecord[]>(() =>
    this.testHistory.sessions().filter((s) => s.timestamp >= this.rangeStartMs()),
  );

  readonly averageScore = computed(() => {
    const sessions = this.testsInRange();
    if (!sessions.length) {
      return null;
    }
    const sum = sessions.reduce((acc, s) => acc + (s.total ? (s.correct / s.total) * 100 : 0), 0);
    return Math.round(sum / sessions.length);
  });

  readonly recentTests = computed(() => this.testsInRange().slice(0, 8));

  /** Overall mastery % as of a point in time, derived from the answer log's earliest-correct timestamps. */
  private overallPercentAt(sinceMs: number): number {
    const total = this.totalQuestions();
    if (!total) {
      return 0;
    }
    const firstCorrect = new Map<string, number>();
    for (const e of this.progress.history()) {
      if (!e.isCorrect) continue;
      const existing = firstCorrect.get(e.questionId);
      if (existing === undefined || e.timestamp < existing) {
        firstCorrect.set(e.questionId, e.timestamp);
      }
    }
    // Correct questions with no logged event predate this feature — treat as "already known".
    let countBefore = 0;
    for (const id of this.progress.correctIds()) {
      const ts = firstCorrect.get(id) ?? 0;
      if (ts < sinceMs) {
        countBefore += 1;
      }
    }
    return Math.round((countBefore / total) * 100);
  }

  readonly hasHistory = computed(() => this.progress.history().length > 0);

  readonly heroDelta = computed(() => {
    if (!this.hasHistory()) {
      return null;
    }
    return this.overallPercent() - this.overallPercentAt(this.rangeStartMs());
  });

  readonly dailySeries = computed<DayBucket[]>(() => {
    const days = Math.min(this.rangeDays(), 30);
    const buckets = new Map<string, DayBucket>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dateKey(d);
      buckets.set(key, { key, date: d, correct: 0, wrong: 0 });
    }
    for (const e of this.filteredHistory()) {
      const key = dateKey(new Date(e.timestamp));
      const bucket = buckets.get(key);
      if (!bucket) continue;
      if (e.isCorrect) bucket.correct += 1;
      else bucket.wrong += 1;
    }
    return [...buckets.values()];
  });

  readonly hoveredDay = computed(() => {
    const series = this.dailySeries();
    const idx = this.hoveredDayIndex();
    if (idx !== null && series[idx]) {
      return series[idx];
    }
    return series[series.length - 1] ?? null;
  });

  // ---------- Daily goal ----------

  readonly answeredToday = computed(() => {
    const start = startOfDay(new Date()).getTime();
    return this.progress.history().filter((e) => e.timestamp >= start).length;
  });

  readonly goalTarget = DAILY_GOAL;
  readonly goalPercent = computed(() =>
    Math.min(100, Math.round((this.answeredToday() / DAILY_GOAL) * 100)),
  );
  readonly goalRemaining = computed(() => Math.max(0, DAILY_GOAL - this.answeredToday()));

  // ---------- Activity heatmap ----------

  readonly heatmapWeeks = computed<HeatmapCell[][]>(() => {
    const totalDays = HEATMAP_WEEKS * 7;
    const counts = new Map<string, number>();
    for (const e of this.progress.history()) {
      const key = dateKey(new Date(e.timestamp));
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const maxCount = Math.max(1, ...counts.values());
    const cells: HeatmapCell[] = [];
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dateKey(d);
      const count = counts.get(key) ?? 0;
      const level = this.intensityLevel(count, maxCount);
      cells.push({ key, date: d, count, level });
    }

    const weeks: HeatmapCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  });

  private intensityLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
    if (count === 0) return 0;
    const ratio = count / max;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  }

  // ---------- Achievements ----------

  readonly achievements = computed(() => [
    {
      icon: '🔥',
      label: `${this.streak.streakDays()} kunlik streak`,
      unlocked: this.streak.streakDays() >= 3,
    },
    {
      icon: '🏆',
      label: '50 ta test yakunlandi',
      unlocked: this.testHistory.sessions().length >= 50,
    },
    {
      icon: '🎯',
      label: "90%+ umumiy natija",
      unlocked: this.overallPercent() >= 90,
    },
    {
      icon: '📚',
      label: "5 ta mavzu 80%+ o'zlashtirildi",
      unlocked: this.topicStats().filter((t) => t.percent >= 80).length >= 5,
    },
  ]);

  // ---------- Insights ----------

  readonly insights = computed(() => {
    const lines: string[] = [];
    const delta = this.heroDelta();
    if (delta !== null && delta !== 0) {
      lines.push(
        `Oxirgi ${this.rangeLabel().toLowerCase()}da natijangiz ${delta > 0 ? "yaxshilandi" : "pasaydi"}: ${delta > 0 ? '+' : ''}${delta}%.`,
      );
    }
    const strongest = this.strongTopics()[0];
    if (strongest) {
      lines.push(`Eng kuchli mavzuingiz — ${strongest.name} (${strongest.percent}%).`);
    }
    const weakest = this.weakTopics()[0];
    if (weakest && weakest.percent < 70) {
      lines.push(`Eng ko'p e'tibor talab qiladigan mavzu — ${weakest.name} (${weakest.percent}%).`);
    }
    if (this.goalRemaining() > 0) {
      lines.push(`Bugungi maqsadga yetish uchun yana ${this.goalRemaining()} ta savol ishlang.`);
    } else if (this.answeredToday() > 0) {
      lines.push("Bugungi maqsadingizga yetdingiz — ajoyib!");
    }
    return lines;
  });

  rangeLabel(): string {
    switch (this.range()) {
      case 'today':
        return 'Bugun';
      case '7d':
        return '7 kun';
      case '30d':
        return '30 kun';
      case 'all':
        return 'Barcha vaqt';
    }
  }

  dayLabel(date: Date): string {
    return date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
  }

  timeLabel(timestamp: number): string {
    const d = new Date(timestamp);
    return `${this.dayLabel(d)}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  // ---------- Line chart geometry ----------

  private readonly chartWidth = 600;
  private readonly chartHeight = 160;

  readonly chartMaxValue = computed(() =>
    Math.max(1, ...this.dailySeries().map((d) => Math.max(d.correct, d.wrong))),
  );

  private chartX(index: number): number {
    const series = this.dailySeries();
    if (series.length <= 1) return 0;
    return (index / (series.length - 1)) * this.chartWidth;
  }

  private chartY(value: number): number {
    return this.chartHeight - (value / this.chartMaxValue()) * this.chartHeight;
  }

  readonly correctLinePoints = computed(() =>
    this.dailySeries().map((d, i) => `${this.chartX(i)},${this.chartY(d.correct)}`).join(' '),
  );

  readonly wrongLinePoints = computed(() =>
    this.dailySeries().map((d, i) => `${this.chartX(i)},${this.chartY(d.wrong)}`).join(' '),
  );

  readonly correctAreaPath = computed(() => {
    const series = this.dailySeries();
    if (!series.length) return '';
    const top = series.map((d, i) => `${this.chartX(i)},${this.chartY(d.correct)}`).join(' L ');
    return `M ${top} L ${this.chartX(series.length - 1)},${this.chartHeight} L 0,${this.chartHeight} Z`;
  });

  readonly chartTicks = computed(() => {
    const series = this.dailySeries();
    if (series.length <= 1) return series.map((d, i) => ({ index: i, label: this.dayLabel(d.date) }));
    const tickCount = Math.min(6, series.length);
    const step = (series.length - 1) / (tickCount - 1);
    return Array.from({ length: tickCount }, (_, i) => {
      const index = Math.round(i * step);
      return { index, label: this.dayLabel(series[index].date) };
    });
  });

  hoverDay(index: number): void {
    this.hoveredDayIndex.set(index);
  }

  clearHover(): void {
    this.hoveredDayIndex.set(null);
  }

  chartXFor(index: number): number {
    return this.chartX(index);
  }
}
