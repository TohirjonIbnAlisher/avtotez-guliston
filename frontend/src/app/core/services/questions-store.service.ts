import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { QuestionsApiService } from './questions-api.service';
import { LanguageService } from './language.service';
import { Question } from '../models/question.model';

@Injectable({ providedIn: 'root' })
export class QuestionsStore {
  private readonly api = inject(QuestionsApiService);
  private readonly languageService = inject(LanguageService);

  private readonly _questions = signal<Question[]>([]);
  private readonly _loading = signal(true);

  readonly questions = this._questions.asReadonly();
  readonly loading = this._loading.asReadonly();

  private readonly byIdMap = computed(() => new Map(this._questions().map((q) => [q.id, q])));

  constructor() {
    // til almashganda va admin panelda savollar o'zgarganda qayta yuklanadi
    effect(() => {
      this.languageService.locale();
      this.api.version();
      this._loading.set(true);
      this.api.findAll().subscribe({
        next: (questions) => {
          this._questions.set(questions);
          this._loading.set(false);
        },
        error: () => this._loading.set(false),
      });
    });
  }

  byId(id: string): Question | undefined {
    return this.byIdMap().get(id);
  }

  byIds(ids: string[]): Question[] {
    const map = this.byIdMap();
    return ids.map((id) => map.get(id)).filter((q): q is Question => !!q);
  }

  byTopic(topicId: string): Question[] {
    return this._questions()
      .filter((q) => q.topic?.id === topicId)
      .sort((a, b) => (a.topicOrder ?? Infinity) - (b.topicOrder ?? Infinity));
  }
}
