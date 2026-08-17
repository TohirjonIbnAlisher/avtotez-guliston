import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { QuestionsApiService } from '../../../core/services/questions-api.service';
import { TopicsApiService } from '../../../core/services/topics-api.service';
import { Topic } from '../../../core/models/question.model';
import { AdminQuestionPayload } from '../../../core/models/admin.model';

interface OptionRow {
  uz: string;
  uzk: string;
  ru: string;
}

type LangKey = 'uz' | 'uzk' | 'ru';
const LANG_LABELS: Record<LangKey, string> = { uz: "O'zbek (lotin)", uzk: "Ўзбек (кирилл)", ru: 'Русский' };

@Component({
  selector: 'app-admin-question-form',
  imports: [RouterLink],
  templateUrl: './admin-question-form.html',
})
export class AdminQuestionForm {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly questionsApi = inject(QuestionsApiService);
  private readonly topicsApi = inject(TopicsApiService);

  protected readonly langKeys: LangKey[] = ['uz', 'uzk', 'ru'];
  protected readonly langLabels = LANG_LABELS;

  private readonly questionId = this.route.snapshot.paramMap.get('id');
  protected readonly isEdit = !!this.questionId;

  readonly topics = signal<Topic[]>([]);
  readonly topicId = signal('');
  readonly text = signal<Record<LangKey, string>>({ uz: '', uzk: '', ru: '' });
  readonly options = signal<OptionRow[]>([
    { uz: '', uzk: '', ru: '' },
    { uz: '', uzk: '', ru: '' },
  ]);
  readonly correctIndex = signal(0);
  readonly existingImageUrl = signal<string | null>(null);
  readonly imageFile = signal<File | null>(null);
  readonly imagePreview = computed(() =>
    this.imageFile() ? URL.createObjectURL(this.imageFile()!) : this.existingImageUrl(),
  );

  readonly loading = signal(!!this.questionId);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.topicsApi.findAll().subscribe({ next: (topics) => this.topics.set(topics) });
    if (this.questionId) {
      this.loadExisting(this.questionId);
    }
  }

  private loadExisting(id: string): void {
    forkJoin({
      uz: this.questionsApi.findOne(id, 'uz'),
      uzk: this.questionsApi.findOne(id, 'uzk'),
      ru: this.questionsApi.findOne(id, 'ru'),
    }).subscribe({
      next: ({ uz, uzk, ru }) => {
        this.text.set({ uz: uz.text, uzk: uzk.text, ru: ru.text });
        this.options.set(
          uz.options.map((_, i) => ({
            uz: uz.options[i] ?? '',
            uzk: uzk.options[i] ?? '',
            ru: ru.options[i] ?? '',
          })),
        );
        this.correctIndex.set(uz.correctOptionIndex);
        this.topicId.set(uz.topic?.id ?? '');
        this.existingImageUrl.set(uz.imageUrl);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("Savolni yuklab bo'lmadi.");
        this.loading.set(false);
      },
    });
  }

  updateText(lang: LangKey, value: string): void {
    this.text.update((t) => ({ ...t, [lang]: value }));
  }

  updateOption(index: number, lang: LangKey, value: string): void {
    this.options.update((rows) => rows.map((row, i) => (i === index ? { ...row, [lang]: value } : row)));
  }

  addOption(): void {
    this.options.update((rows) => [...rows, { uz: '', uzk: '', ru: '' }]);
  }

  removeOption(index: number): void {
    if (this.options().length <= 2) {
      return;
    }
    this.options.update((rows) => rows.filter((_, i) => i !== index));
    if (this.correctIndex() >= this.options().length) {
      this.correctIndex.set(this.options().length - 1);
    }
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.imageFile.set(file);
    }
  }

  removeImage(): void {
    this.imageFile.set(null);
    this.existingImageUrl.set(null);
  }

  submit(): void {
    const missingLang = this.langKeys.find((lang) => !this.text()[lang].trim());
    if (missingLang) {
      this.error.set(`Savol matni "${LANG_LABELS[missingLang]}" tilida to'ldirilishi shart.`);
      return;
    }
    const incompleteOption = this.options().find(
      (row) => !row.uz.trim() || !row.uzk.trim() || !row.ru.trim(),
    );
    if (incompleteOption) {
      this.error.set("Barcha variantlar uchta tilda ham to'ldirilishi shart.");
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    if (this.imageFile()) {
      this.questionsApi.uploadImage(this.imageFile()!).subscribe({
        next: (res) => this.save(res.imageUrl),
        error: () => {
          this.saving.set(false);
          this.error.set("Rasmni yuklab bo'lmadi.");
        },
      });
    } else {
      this.save(this.relativeImageUrl(this.existingImageUrl()));
    }
  }

  private save(imageUrl: string | null): void {
    const payload: AdminQuestionPayload = {
      text: this.text(),
      options: {
        uz: this.options().map((r) => r.uz),
        uzk: this.options().map((r) => r.uzk),
        ru: this.options().map((r) => r.ru),
      },
      correctOptionIndex: this.correctIndex(),
      imageUrl,
      topicId: this.topicId() || null,
    };

    const request = this.questionId
      ? this.questionsApi.update(this.questionId, payload)
      : this.questionsApi.create(payload);

    request.subscribe({
      next: () => this.router.navigateByUrl('/admin/questions'),
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Saqlashda xatolik yuz berdi.');
      },
    });
  }

  private relativeImageUrl(url: string | null): string | null {
    if (!url) {
      return null;
    }
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }
}
