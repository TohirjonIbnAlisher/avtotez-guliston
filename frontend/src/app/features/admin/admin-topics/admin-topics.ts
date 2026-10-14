import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TopicPayload, TopicsApiService } from '../../../core/services/topics-api.service';
import { Topic, TopicTexts } from '../../../core/models/question.model';

type TrLang = 'uzk' | 'ru';
type TrField = 'name' | 'category' | 'description';
type TrState = Record<TrLang, Record<TrField, string>>;

interface TopicFormState {
  id: string | null;
  name: string;
  description: string;
  category: string;
  /** Kirillcha va ruscha ko'rinishlar (tahrirlashda — bazadagilari). */
  tr: TrState;
}

const emptyTr = (): TrState => ({
  uzk: { name: '', category: '', description: '' },
  ru: { name: '', category: '', description: '' },
});
const EMPTY_FORM: TopicFormState = { id: null, name: '', description: '', category: '', tr: emptyTr() };

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
  readonly form = signal<TopicFormState>({ ...EMPTY_FORM, tr: emptyTr() });
  readonly showTranslations = signal(false);
  protected readonly trLangs: { key: TrLang; label: string }[] = [
    { key: 'uzk', label: 'Ўзбек (кирилл)' },
    { key: 'ru', label: 'Русский' },
  ];
  protected readonly trFields: { key: TrField; label: string }[] = [
    { key: 'name', label: 'Nomi' },
    { key: 'category', label: 'Kategoriya' },
    { key: 'description', label: 'Tavsif' },
  ];
  /** Admin qo'lda o'zgartirgan tarjima maydonlari — faqat shular serverga yuboriladi. */
  private readonly touched = new Set<string>();

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
    this.form.set({ ...EMPTY_FORM, tr: emptyTr() });
    this.touched.clear();
    this.showTranslations.set(false);
    this.formOpen.set(true);
  }

  openEdit(topic: Topic): void {
    this.form.set({
      id: topic.id,
      name: topic.name,
      description: topic.description ?? '',
      category: topic.category ?? '',
      tr: {
        uzk: textsOf(topic.translations?.uzk),
        ru: textsOf(topic.translations?.ru),
      },
    });
    this.touched.clear();
    this.showTranslations.set(false);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.error.set(null);
  }

  updateField<K extends keyof TopicFormState>(key: K, value: TopicFormState[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  updateTranslation(lang: TrLang, field: TrField, value: string): void {
    this.touched.add(`${lang}.${field}`);
    this.form.update((f) => ({ ...f, tr: { ...f.tr, [lang]: { ...f.tr[lang], [field]: value } } }));
  }

  submit(): void {
    const f = this.form();
    if (f.name.trim().length < 2) {
      this.error.set("Mavzu nomi kamida 2 ta belgidan iborat bo'lishi kerak.");
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    // faqat qo'lda tuzatilgan tarjimalar yuboriladi; qolganlari o'zbekchasidan avtomatik yaratiladi
    const translations: NonNullable<TopicPayload['translations']> = {};
    for (const key of this.touched) {
      const [lang, field] = key.split('.') as [TrLang, TrField];
      (translations[lang] ??= {})[field] = f.tr[lang][field];
    }
    const payload: TopicPayload = {
      name: f.name,
      description: f.description || undefined,
      category: f.category || undefined,
      translations,
    };
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

function textsOf(t: TopicTexts | undefined): Record<TrField, string> {
  return { name: t?.name ?? '', category: t?.category ?? '', description: t?.description ?? '' };
}
