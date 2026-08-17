import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TopicsApiService } from '../../../core/services/topics-api.service';
import { Topic } from '../../../core/models/question.model';

interface TopicFormState {
  id: string | null;
  name: string;
  description: string;
}

const EMPTY_FORM: TopicFormState = { id: null, name: '', description: '' };

@Component({
  selector: 'app-admin-topics',
  imports: [RouterLink],
  templateUrl: './admin-topics.html',
})
export class AdminTopics {
  private readonly topicsApi = inject(TopicsApiService);

  readonly topics = signal<Topic[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly formOpen = signal(false);
  readonly saving = signal(false);
  readonly form = signal<TopicFormState>({ ...EMPTY_FORM });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.topicsApi.findAll().subscribe({
      next: (topics) => {
        this.topics.set(topics);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("Mavzularni yuklab bo'lmadi.");
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.form.set({ ...EMPTY_FORM });
    this.formOpen.set(true);
  }

  openEdit(topic: Topic): void {
    this.form.set({ id: topic.id, name: topic.name, description: topic.description ?? '' });
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.error.set(null);
  }

  updateField<K extends keyof TopicFormState>(key: K, value: TopicFormState[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  submit(): void {
    const f = this.form();
    if (f.name.trim().length < 2) {
      this.error.set("Mavzu nomi kamida 2 ta belgidan iborat bo'lishi kerak.");
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const payload = { name: f.name, description: f.description || undefined };
    const request = f.id ? this.topicsApi.update(f.id, payload) : this.topicsApi.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Saqlashda xatolik yuz berdi.');
      },
    });
  }

  remove(topic: Topic): void {
    if (!confirm(`"${topic.name}" mavzusi o'chirilsinmi? Unga bog'liq savollar mavzusiz qoladi.`)) {
      return;
    }
    this.topicsApi.remove(topic.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set("Mavzuni o'chirib bo'lmadi."),
    });
  }
}
