import { Component, computed, inject } from '@angular/core';
import { QuestionsStore } from '../../../core/services/questions-store.service';
import { ProgressService } from '../../../core/services/progress.service';
import { TranslateService } from '../../../core/services/translate.service';
import { TestSession } from '../test-session/test-session';

@Component({
  selector: 'app-mistakes',
  imports: [TestSession],
  templateUrl: './mistakes.html',
})
export class Mistakes {
  protected readonly store = inject(QuestionsStore);
  private readonly progress = inject(ProgressService);
  protected readonly translate = inject(TranslateService);

  readonly questions = computed(() => this.store.byIds(Object.keys(this.progress.mistakes())));
}
