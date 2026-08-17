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

  readonly filteredQuestions = computed(() => {
    const query = this.search().trim().toLowerCase();
    const topicId = this.topicFilter();
    return this.questions().filter((q) => {
      const matchesQuery = !query || q.text.toLowerCase().includes(query);
      const matchesTopic = !topicId || q.topic?.id === topicId;
      return matchesQuery && matchesTopic;
    });
  });

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
