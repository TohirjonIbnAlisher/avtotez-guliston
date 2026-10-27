import { Component, DestroyRef, HostListener, computed, effect, inject, input, output, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Question } from '../../../core/models/question.model';
import { ProgressService } from '../../../core/services/progress.service';
import { TestHistoryService } from '../../../core/services/test-history.service';
import { TestPreferencesService } from '../../../core/services/test-preferences.service';
import { TranslateService } from '../../../core/services/translate.service';

export type SessionMode = 'exam' | 'practice';
export type OptionState = 'correct' | 'wrong' | 'neutral';

export interface SessionResult {
  correct: number;
  wrong: number;
  total: number;
}

const PASS_RATIO = 0.9;
// Avtomatik o'tish faqat to'g'ri javobda: belgilangan javob yashil bo'lib ko'rinishi uchun qisqa pauza.
const AUTO_ADVANCE_DELAY_MS = 400;
const SECONDS_PER_QUESTION = 90;
// Rasmi yo'q savollarda ko'rsatiladigan umumiy rasm (frontend/public/images).
const DEFAULT_QUESTION_IMAGE = '/images/default-question.webp';

@Component({
  selector: 'app-test-session',
  imports: [],
  templateUrl: './test-session.html',
})
export class TestSession {
  private readonly progress = inject(ProgressService);
  private readonly testHistory = inject(TestHistoryService);
  protected readonly translate = inject(TranslateService);
  protected readonly prefs = inject(TestPreferencesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly location = inject(Location);

  readonly questions = input.required<Question[]>();
  readonly title = input('');
  readonly scored = input(false);
  readonly countdown = input(false);
  readonly allowSave = input(true);
  /** Sarlavhada "Yakunlash" tugmasi va yakunda natijalar oynasi (mavzu va bilet testlari). */
  readonly finishButton = input(false);
  /**
   * Avval berilgan javoblarni (progress) tiklab, birinchi javobsiz savoldan davom ettirish (mavzu testlari).
   * Foydalanuvchi shu sessiyada javob bergach yoki "Qayta" bosgach, qayta tiklanmaydi.
   */
  readonly resume = input(false);
  private resumeDone = false;

  readonly completed = output<SessionResult>();

  readonly currentIndex = signal(0);
  readonly answers = signal<Record<string, number>>({});
  readonly elapsedSeconds = signal(0);
  readonly sessionEnded = signal(false);
  readonly imageOpen = signal(false);
  readonly resultsOpen = signal(false);
  readonly isFullscreen = signal(false);

  private advanceTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly intervalId: ReturnType<typeof setInterval>;

  readonly timerLimitSeconds = computed(() =>
    this.countdown() ? this.questions().length * SECONDS_PER_QUESTION : null,
  );

  readonly currentQuestion = computed<Question | null>(
    () => this.questions()[this.currentIndex()] ?? null,
  );

  readonly selectedOption = computed(() => {
    const q = this.currentQuestion();
    return q ? (this.answers()[q.id] ?? null) : null;
  });

  readonly isAnswered = computed(() => this.selectedOption() !== null);

  readonly isLastQuestion = computed(
    () => this.currentIndex() === this.questions().length - 1,
  );

  readonly correctCount = computed(() =>
    this.questions().reduce(
      (total, q) => (this.answers()[q.id] === q.correctOptionIndex ? total + 1 : total),
      0,
    ),
  );

  readonly answeredCount = computed(() => Object.keys(this.answers()).length);

  readonly wrongCount = computed(() => this.questions().length - this.correctCount());

  readonly correctPercent = computed(() =>
    this.questions().length
      ? Math.round((this.correctCount() / this.questions().length) * 100)
      : 0,
  );

  readonly displaySeconds = computed(() => {
    const limit = this.timerLimitSeconds();
    return limit !== null ? Math.max(0, limit - this.elapsedSeconds()) : this.elapsedSeconds();
  });

  readonly timeDisplay = computed(() => {
    const secs = this.displaySeconds();
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    // Katta testlarda (masalan, 1000 ta savol) vaqt soatlarda o'lchanadi
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  });

  readonly passThreshold = computed(() => Math.ceil(this.questions().length * PASS_RATIO));
  readonly passed = computed(() => this.correctCount() >= this.passThreshold());

  /** Haqiqiy noto'g'ri javoblar (javobsizlar kirmaydi) — natijalar oynasi uchun. */
  readonly answeredWrongCount = computed(() => this.answeredCount() - this.correctCount());
  readonly unansweredCount = computed(() => this.questions().length - this.answeredCount());

  questionResult(question: Question): 'correct' | 'wrong' | 'none' {
    const answer = this.answers()[question.id];
    if (answer === undefined) {
      return 'none';
    }
    return answer === question.correctOptionIndex ? 'correct' : 'wrong';
  }

  constructor() {
    // Progress server'dan keyinroq kelishi mumkin — kelganda ham tiklanadi (foydalanuvchi hali javob bermagan bo'lsa).
    effect(() => {
      if (!this.resume() || this.resumeDone) {
        return;
      }
      const questions = this.questions();
      const correct = this.progress.correctIds();
      const mistakes = this.progress.mistakes();
      const restored: Record<string, number> = {};
      for (const q of questions) {
        if (correct.has(q.id)) {
          restored[q.id] = q.correctOptionIndex;
        } else if (q.id in mistakes) {
          restored[q.id] = mistakes[q.id];
        }
      }
      this.answers.set(restored);
      const firstOpen = questions.findIndex((q) => restored[q.id] === undefined);
      this.currentIndex.set(firstOpen === -1 ? Math.max(0, questions.length - 1) : firstOpen);
    });

    this.intervalId = setInterval(() => {
      if (this.sessionEnded()) {
        return;
      }
      this.elapsedSeconds.update((s) => s + 1);
      const limit = this.timerLimitSeconds();
      if (limit !== null && this.elapsedSeconds() >= limit) {
        this.finish();
      }
    }, 1000);

    const onFullscreenChange = () => this.isFullscreen.set(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    this.destroyRef.onDestroy(() => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      }
      clearInterval(this.intervalId);
      if (this.advanceTimeoutId) {
        clearTimeout(this.advanceTimeoutId);
      }
    });
  }

  goTo(index: number): void {
    this.cancelAutoAdvance();
    this.imageOpen.set(false);
    this.currentIndex.set(index);
  }

  openImage(): void {
    this.imageOpen.set(true);
  }

  closeImage(): void {
    this.imageOpen.set(false);
  }

  selectOption(optionIndex: number): void {
    const q = this.currentQuestion();
    if (!q || this.isAnswered() || this.sessionEnded()) {
      return;
    }

    const isCorrect = optionIndex === q.correctOptionIndex;
    this.resumeDone = true;
    this.answers.update((a) => ({ ...a, [q.id]: optionIndex }));
    this.progress.recordAnswer(q.id, isCorrect, optionIndex);

    // Xato javobda o'tmaydi — foydalanuvchi to'g'ri javob va izohni ko'rib, o'zi davom ettiradi.
    // Izoh-videosi bor savolda ham o'tmaydi — video oxirigacha ko'rilsin.
    if (isCorrect && !q.videoUrl && this.prefs.autoAdvance() && !this.isLastQuestion()) {
      this.advanceTimeoutId = setTimeout(() => this.next(), AUTO_ADVANCE_DELAY_MS);
    }
  }

  setAutoAdvance(value: boolean): void {
    this.prefs.setAutoAdvance(value);
    if (!value) {
      this.cancelAutoAdvance();
    }
  }

  navClass(question: Question, index: number): string {
    const answer = this.answers()[question.id];
    const current = index === this.currentIndex();
    const ring = current ? ' ring-2 ring-sky-400 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : '';
    if (answer === undefined) {
      return current
        ? 'bg-brand-600 text-white'
        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
    }
    return (answer === question.correctOptionIndex ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white') + ring;
  }

  toggleFullscreen(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
  }

  // F1–F9 yoki 1–9 — variantni tanlash, → / ← — keyingi / oldingi savol (javob berilmagan bo'lsa ham),
  // Enter — javobdan keyin keyingi savol, Esc — rasmni yopish.
  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.sessionEnded() || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) {
      return;
    }
    if (event.key === 'Escape' && this.imageOpen()) {
      this.closeImage();
      return;
    }

    const match = /^(?:F([1-9])|([1-9]))$/.exec(event.key);
    if (match) {
      const index = Number(match[1] ?? match[2]) - 1;
      const q = this.currentQuestion();
      if (q && index < q.options.length) {
        event.preventDefault(); // F1 brauzer yordamini ochmasin
        this.selectOption(index);
      }
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const index = this.currentIndex() + (event.key === 'ArrowRight' ? 1 : -1);
      if (index >= 0 && index < this.questions().length) {
        this.goTo(index);
      }
    } else if (event.key === 'Enter' && this.isAnswered()) {
      event.preventDefault();
      this.next();
    }
  }

  imageOf(question: Question): string {
    return question.imageUrl || DEFAULT_QUESTION_IMAGE;
  }

  replayVideo(video: HTMLVideoElement): void {
    video.currentTime = 0;
    void video.play();
  }

  optionState(optionIndex: number): OptionState {
    const q = this.currentQuestion();
    const selected = this.selectedOption();
    if (!q || selected === null) {
      return 'neutral';
    }
    if (optionIndex === q.correctOptionIndex) {
      return 'correct';
    }
    if (optionIndex === selected) {
      return 'wrong';
    }
    return 'neutral';
  }

  toggleSave(): void {
    const q = this.currentQuestion();
    if (q) {
      this.progress.toggleSaved(q.id);
    }
  }

  isCurrentSaved(): boolean {
    const q = this.currentQuestion();
    return q ? this.progress.isSaved(q.id) : false;
  }

  next(): void {
    this.cancelAutoAdvance();
    this.imageOpen.set(false);
    if (this.isLastQuestion()) {
      if (this.scored()) {
        this.finish();
      }
      return;
    }
    this.currentIndex.update((i) => i + 1);
  }

  /** "Yakunlash" tugmasi — test istalgan paytda yakunlanadi va natija hisoblanadi. */
  finishNow(): void {
    this.cancelAutoAdvance();
    this.finish();
  }

  /** Natijalar oynasidagi savol raqami — oynani yopib, o'sha savolni ko'rsatadi (javoblar qulflangan). */
  reviewQuestion(index: number): void {
    this.resultsOpen.set(false);
    this.goTo(index);
  }

  exit(): void {
    this.resultsOpen.set(false);
    this.location.back();
  }

  restart(): void {
    this.resumeDone = true;
    this.cancelAutoAdvance();
    this.resultsOpen.set(false);
    this.currentIndex.set(0);
    this.answers.set({});
    this.elapsedSeconds.set(0);
    this.sessionEnded.set(false);
    this.imageOpen.set(false);
  }

  private cancelAutoAdvance(): void {
    if (this.advanceTimeoutId) {
      clearTimeout(this.advanceTimeoutId);
      this.advanceTimeoutId = null;
    }
  }

  private finish(): void {
    if (this.sessionEnded()) {
      return;
    }
    this.sessionEnded.set(true);
    if (this.finishButton()) {
      this.resultsOpen.set(true);
    }
    const wrong = this.answeredCount() - this.correctCount();
    if (this.scored()) {
      this.testHistory.recordSession(this.title(), this.correctCount(), wrong, this.questions().length);
    }
    this.completed.emit({
      correct: this.correctCount(),
      wrong,
      total: this.questions().length,
    });
  }
}
