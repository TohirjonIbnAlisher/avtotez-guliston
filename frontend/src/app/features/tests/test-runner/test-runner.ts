import { Component, computed, inject, signal } from '@angular/core';
import { QuestionsApiService } from '../../../core/services/questions-api.service';
import { Question } from '../../../core/models/question.model';

type ExamState = 'idle' | 'loading' | 'running' | 'finished';

const PASS_RATIO = 0.9; // 20 savoldan 18 to'g'ri = 90%

@Component({
  selector: 'app-test-runner',
  imports: [],
  templateUrl: './test-runner.html',
})
export class TestRunner {
  private readonly questionsApi = inject(QuestionsApiService);

  readonly state = signal<ExamState>('idle');
  readonly error = signal<string | null>(null);
  readonly questions = signal<Question[]>([]);
  readonly currentIndex = signal(0);
  readonly answers = signal<(number | null)[]>([]);

  readonly currentQuestion = computed<Question | null>(
    () => this.questions()[this.currentIndex()] ?? null,
  );

  readonly progressText = computed(
    () => `${this.currentIndex() + 1} / ${this.questions().length}`,
  );

  readonly progressPercent = computed(() =>
    this.questions().length
      ? ((this.currentIndex() + 1) / this.questions().length) * 100
      : 0,
  );

  readonly selectedOption = computed(
    () => this.answers()[this.currentIndex()] ?? null,
  );

  readonly isLastQuestion = computed(
    () => this.currentIndex() === this.questions().length - 1,
  );

  readonly correctCount = computed(() =>
    this.questions().reduce(
      (total, question, index) =>
        this.answers()[index] === question.correctOptionIndex ? total + 1 : total,
      0,
    ),
  );

  readonly passThreshold = computed(() =>
    Math.ceil(this.questions().length * PASS_RATIO),
  );

  readonly passed = computed(() => this.correctCount() >= this.passThreshold());

  startExam(): void {
    this.state.set('loading');
    this.error.set(null);
    this.questionsApi.findRandom(20).subscribe({
      next: (questions) => {
        if (questions.length === 0) {
          this.error.set(
            "Savollar bazasi hali bo'sh. Avval backend'da savollarni import qiling.",
          );
          this.state.set('idle');
          return;
        }
        this.questions.set(questions);
        this.answers.set(questions.map(() => null));
        this.currentIndex.set(0);
        this.state.set('running');
      },
      error: () => {
        this.error.set(
          "Savollarni yuklab bo'lmadi. Backend ishga tushirilganini tekshiring.",
        );
        this.state.set('idle');
      },
    });
  }

  selectOption(optionIndex: number): void {
    const updated = [...this.answers()];
    updated[this.currentIndex()] = optionIndex;
    this.answers.set(updated);
  }

  nextQuestion(): void {
    if (this.isLastQuestion()) {
      this.state.set('finished');
      return;
    }
    this.currentIndex.update((index) => index + 1);
  }

  restart(): void {
    this.state.set('idle');
    this.questions.set([]);
    this.answers.set([]);
    this.currentIndex.set(0);
  }
}
