import { Component, inject } from '@angular/core';
import { QuestionsStore } from '../../../core/services/questions-store.service';
import { TranslateService } from '../../../core/services/translate.service';
import { TestSession } from '../test-session/test-session';

@Component({
  selector: 'app-all-tests',
  imports: [TestSession],
  templateUrl: './all-tests.html',
})
export class AllTests {
  protected readonly store = inject(QuestionsStore);
  protected readonly translate = inject(TranslateService);
}
