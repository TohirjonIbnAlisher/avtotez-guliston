import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QuestionsApiService } from '../../../core/services/questions-api.service';
import { TopicsApiService } from '../../../core/services/topics-api.service';
import { Question, Topic } from '../../../core/models/question.model';

@Component({
  selector: 'app-admin-questions',
  imports: [RouterLink],
  templateUrl: './admin-questions.html',
})
export class AdminQuestions {
  private readonly questionsApi = inject(QuestionsApiService);
  private readonly topicsApi = inject(TopicsApiService);

  readonly questions = signal<Question[]>([]);
  readonly topics = signal<Topic[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly topicFilter = signal('');
  readonly reordering = signal(false);

  readonly filteredQuestions = computed(() => {
    const query = this.search().trim().toLowerCase();
    const topicId = this.topicFilter();
    const list = this.questions().filter((q) => {
      const matchesQuery = !query || q.text.toLowerCase().includes(query);
      const matchesTopic = !topicId || q.topic?.id === topicId;
      return matchesQuery && matchesTopic;
    });
    return topicId ? [...list].sort((a, b) => (a.topicOrder ?? Infinity) - (b.topicOrder ?? Infinity)) : list;
  });

  /** Tartibni faqat bitta mavzu tanlanganda va qidiruvsiz (to'liq ro'yxatda) o'zgartirish mumkin. */
  readonly canReorder = computed(() => !!this.topicFilter() && !this.search().trim());

  constructor() {
    this.load();
    this.topicsApi.findAll().subscribe({ next: (topics) => this.topics.set(topics) });
  }

  private load(): void {
    this.loading.set(true);
    this.questionsApi.findAll().subscribe({
      next: (questions) => {
        this.questions.set(questions);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("Savollarni yuklab bo'lmadi.");
        this.loading.set(false);
      },
    });
  }

  move(index: number, delta: -1 | 1): void {
    const topicId = this.topicFilter();
    const list = [...this.filteredQuestions()];
    const target = index + delta;
    if (!this.canReorder() || this.reordering() || target < 0 || target >= list.length) {
      return;
    }
    [list[index], list[target]] = [list[target], list[index]];

    // Ekranda darhol ko'rsatamiz, keyin serverga saqlaymiz; xato bo'lsa qayta yuklaymiz.
    const order = new Map(list.map((q, i) => [q.id, i + 1]));
    this.questions.update((all) => all.map((q) => (order.has(q.id) ? { ...q, topicOrder: order.get(q.id)! } : q)));
    this.reordering.set(true);
    this.questionsApi.reorder(topicId, list.map((q) => q.id)).subscribe({
      next: () => this.reordering.set(false),
      error: (err) => {
        this.reordering.set(false);
        this.error.set(err?.error?.message ?? "Tartibni saqlab bo'lmadi.");
        this.load();
      },
    });
  }

  remove(question: Question): void {
    if (!confirm("Savol o'chirilsinmi?")) {
      return;
    }
    this.questionsApi.remove(question.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set("Savolni o'chirib bo'lmadi."),
    });
  }
}
