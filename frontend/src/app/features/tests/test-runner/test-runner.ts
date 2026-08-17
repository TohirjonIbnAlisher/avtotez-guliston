import { Component, inject, signal } from '@angular/core';
import { QuestionsApiService } from '../../../core/services/questions-api.service';
import { Question } from '../../../core/models/question.model';
import { TranslateService } from '../../../core/services/translate.service';
import { TestSession } from '../test-session/test-session';

const RANDOM_COUNT = 20;

@Component({
  selector: 'app-test-runner',
  imports: [TestSession],
  templateUrl: './test-runner.html',
})
export class TestRunner {
  private readonly questionsApi = inject(QuestionsApiService);
  protected readonly translate = inject(TranslateService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly questions = signal<Question[] | null>(null);

  startExam(): void {
    this.loading.set(true);
    this.error.set(null);
    this.questionsApi.findRandom(RANDOM_COUNT).subscribe({
      next: (questions) => {
        if (questions.length === 0) {
          this.error.set(this.translate.t('testRunner.errorEmptyBank'));
          this.loading.set(false);
          return;
        }
        this.questions.set(questions);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(this.translate.t('testRunner.errorLoadFailed'));
        this.loading.set(false);
      },
    });
  }
}
