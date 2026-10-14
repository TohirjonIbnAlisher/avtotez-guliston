import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { TicketsApiService } from '../../../core/services/tickets-api.service';
import { QuestionsApiService } from '../../../core/services/questions-api.service';
import { TopicsApiService } from '../../../core/services/topics-api.service';
import { Question, Topic } from '../../../core/models/question.model';
import { TICKET_SIZE } from '../admin-tickets/admin-tickets';

/** Qidiruv natijasida bir vaqtda ko'rsatiladigan savollar soni. */
const RESULTS_LIMIT = 60;
const NO_TOPIC = '__none__';

@Component({
  selector: 'app-admin-ticket-form',
  imports: [RouterLink],
  templateUrl: './admin-ticket-form.html',
})
export class AdminTicketForm {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ticketsApi = inject(TicketsApiService);
  private readonly questionsApi = inject(QuestionsApiService);
  private readonly topicsApi = inject(TopicsApiService);

  private readonly ticketId = this.route.snapshot.paramMap.get('id');
  protected readonly isEdit = !!this.ticketId;
  protected readonly ticketSize = TICKET_SIZE;
  protected readonly noTopic = NO_TOPIC;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly number = signal('');
  readonly selected = signal<Question[]>([]);
  private readonly allQuestions = signal<Question[]>([]);
  readonly topics = signal<Topic[]>([]);

  // ---- filtrlar
  readonly topicFilter = signal('');
  readonly search = signal('');

  private readonly selectedIds = computed(() => new Set(this.selected().map((q) => q.id)));
  /** Qo'shish mumkin bo'lgan savollar: biletda yo'qlari, mavzu va matn filtri bo'yicha (savol bir nechta biletda bo'lishi mumkin). */
  private readonly candidates = computed(() => {
    const topicId = this.topicFilter();
    const query = this.search().trim().toLowerCase();
    const taken = this.selectedIds();
    return this.allQuestions().filter((q) => {
      if (taken.has(q.id)) return false;
      if (topicId === NO_TOPIC ? q.topic : topicId && q.topic?.id !== topicId) return false;
      if (query && !q.text.toLowerCase().includes(query) && !q.options.some((o) => o.toLowerCase().includes(query))) {
        return false;
      }
      return true;
    });
  });
  readonly results = computed(() => this.candidates().slice(0, RESULTS_LIMIT));
  readonly hiddenResults = computed(() => Math.max(0, this.candidates().length - RESULTS_LIMIT));
  readonly isFull = computed(() => this.selected().length >= TICKET_SIZE);

  constructor() {
    forkJoin({
      questions: this.questionsApi.findAll(),
      topics: this.topicsApi.findAll(),
      tickets: this.ticketsApi.adminList(),
      ...(this.ticketId ? { ticket: this.ticketsApi.adminFindOne(this.ticketId) } : {}),
    }).subscribe({
      next: (res) => {
        this.allQuestions.set(res.questions);
        this.topics.set(res.topics);
        const ticket = 'ticket' in res ? res.ticket : null;
        if (ticket) {
          this.number.set(String(ticket.number));
          this.selected.set(ticket.questions);
        } else {
          // yangi bilet — keyingi bo'sh raqam
          this.number.set(String(Math.max(0, ...res.tickets.map((t) => t.number)) + 1));
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set("Ma'lumotlarni yuklab bo'lmadi.");
        this.loading.set(false);
      },
    });
  }

  add(question: Question): void {
    if (!this.isFull()) {
      this.selected.update((list) => [...list, question]);
    }
  }

  remove(index: number): void {
    this.selected.update((list) => list.filter((_, i) => i !== index));
  }

  move(index: number, delta: -1 | 1): void {
    const target = index + delta;
    this.selected.update((list) => {
      if (target < 0 || target >= list.length) return list;
      const next = [...list];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  save(): void {
    const number = Number(this.number());
    if (!Number.isInteger(number) || number < 1) {
      this.error.set("Bilet raqami 1 dan katta butun son bo'lishi kerak.");
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const payload = { number, questionIds: this.selected().map((q) => q.id) };
    const request = this.ticketId ? this.ticketsApi.update(this.ticketId, payload) : this.ticketsApi.create(payload);
    request.subscribe({
      next: () => this.router.navigateByUrl('/admin/tickets'),
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const message = err.error?.message;
        this.error.set(Array.isArray(message) ? message[0] : (message ?? 'Saqlashda xatolik yuz berdi.'));
      },
    });
  }
}
