import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, forkJoin, map, of } from 'rxjs';
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
  /** Kiritilgan tartib raqami (matn ko'rinishida); bo'sh — mavzu oxiriga. */
  readonly topicOrder = signal('');
  /** Tanlangan mavzudagi savollar soni (null — yuklanmoqda). */
  readonly topicCount = signal<number | null>(null);
  private originalTopicId = '';
  private originalTopicOrder: number | null = null;
  /** Savol shu mavzuga yangi qo'shilsa, bitta qo'shimcha o'rin bo'ladi. */
  readonly maxPosition = computed(() => {
    const count = this.topicCount();
    if (count === null) {
      return null;
    }
    return this.isEdit && this.topicId() === this.originalTopicId ? count : count + 1;
  });
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

  readonly existingVideoUrl = signal<string | null>(null);
  readonly videoFile = signal<File | null>(null);
  readonly videoPreview = computed(() =>
    this.videoFile() ? URL.createObjectURL(this.videoFile()!) : this.existingVideoUrl(),
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
        this.originalTopicId = uz.topic?.id ?? '';
        this.originalTopicOrder = uz.topicOrder;
        this.topicId.set(this.originalTopicId);
        this.topicOrder.set(uz.topicOrder ? String(uz.topicOrder) : '');
        this.loadTopicCount(this.originalTopicId);
        this.existingImageUrl.set(uz.imageUrl);
        this.existingVideoUrl.set(uz.videoUrl ?? null);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("Savolni yuklab bo'lmadi.");
        this.loading.set(false);
      },
    });
  }

  selectTopic(topicId: string): void {
    this.topicId.set(topicId);
    // asl mavzuga qaytilsa — asl o'rni, boshqa mavzuda — oxiriga (bo'sh)
    this.topicOrder.set(
      this.isEdit && topicId === this.originalTopicId && this.originalTopicOrder
        ? String(this.originalTopicOrder)
        : '',
    );
    this.loadTopicCount(topicId);
  }

  private loadTopicCount(topicId: string): void {
    this.topicCount.set(null);
    if (!topicId) {
      return;
    }
    this.questionsApi.findAll(topicId).subscribe({
      next: (questions) => {
        if (this.topicId() === topicId) {
          this.topicCount.set(questions.length);
        }
      },
    });
  }

  private parsedTopicOrder(): number | null | 'invalid' {
    const raw = this.topicOrder().trim();
    if (!raw) {
      return null;
    }
    const value = Number(raw);
    const max = this.maxPosition();
    if (!Number.isInteger(value) || value < 1 || (max !== null && value > max)) {
      return 'invalid';
    }
    return value;
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

  onVideoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.videoFile.set(file);
    }
  }

  removeVideo(): void {
    this.videoFile.set(null);
    this.existingVideoUrl.set(null);
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

    if (this.topicId() && this.parsedTopicOrder() === 'invalid') {
      this.error.set(`Mavzudagi tartib raqami 1 dan ${this.maxPosition() ?? '…'} gacha bo'lishi kerak.`);
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    // Yangi tanlangan fayllar avval yuklanadi, so'ng savol saqlanadi.
    const image$: Observable<string | null> = this.imageFile()
      ? this.questionsApi.uploadImage(this.imageFile()!).pipe(map((res) => res.imageUrl))
      : of(this.relativeMediaUrl(this.existingImageUrl()));
    const video$: Observable<string | null> = this.videoFile()
      ? this.questionsApi.uploadVideo(this.videoFile()!).pipe(map((res) => res.videoUrl))
      : of(this.relativeMediaUrl(this.existingVideoUrl()));
    forkJoin({ imageUrl: image$, videoUrl: video$ }).subscribe({
      next: ({ imageUrl, videoUrl }) => this.save(imageUrl, videoUrl),
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? "Rasm yoki videoni yuklab bo'lmadi.");
      },
    });
  }

  private save(imageUrl: string | null, videoUrl: string | null): void {
    const payload: AdminQuestionPayload = {
      text: this.text(),
      options: {
        uz: this.options().map((r) => r.uz),
        uzk: this.options().map((r) => r.uzk),
        ru: this.options().map((r) => r.ru),
      },
      correctOptionIndex: this.correctIndex(),
      imageUrl,
      videoUrl,
      topicId: this.topicId() || null,
      topicOrder: this.topicId() ? (this.parsedTopicOrder() as number | null) : null,
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

  private relativeMediaUrl(url: string | null): string | null {
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
