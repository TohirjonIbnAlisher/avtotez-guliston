import { Component, inject, signal } from '@angular/core';
import { QuestionsApiService } from '../../../core/services/questions-api.service';
import { Question } from '../../../core/models/question.model';
import { TranslateService } from '../../../core/services/translate.service';
import { TestSession } from '../test-session/test-session';

const COUNT_OPTIONS = [20, 30, 40, 50];

@Component({
  selector: 'app-random-test',
  imports: [TestSession],
  templateUrl: './random.html',
})
export class RandomTest {
  private readonly questionsApi = inject(QuestionsApiService);
  protected readonly translate = inject(TranslateService);
  protected readonly countOptions = COUNT_OPTIONS;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly questions = signal<Question[] | null>(null);

  start(count: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.questionsApi.findRandom(count).subscribe({
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
