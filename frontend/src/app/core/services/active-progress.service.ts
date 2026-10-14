import { Injectable, computed, inject, signal } from '@angular/core';
import { ProgressService } from './progress.service';
import { QuestionsStore } from './questions-store.service';
import { TicketsApiService } from './tickets-api.service';
import { TicketSummary } from '../models/question.model';

/**
 * Statistika faqat faol savollar (va ko'rinadigan biletlar) bo'yicha.
 *
 * Foydalanuvchi progressida keyinchalik nofaol qilingan savollarga berilgan javoblar ham saqlanib qoladi —
 * ular hisobga olinsa foizlar 100 dan oshib ketadi. Shu sabab bosh sahifa va progress sahifasi
 * ProgressService o'rniga shu servisdan foydalanadi.
 */
@Injectable({ providedIn: 'root' })
export class ActiveProgressService {
  private readonly progress = inject(ProgressService);
  private readonly store = inject(QuestionsStore);
  private readonly ticketsApi = inject(TicketsApiService);

  private readonly ticketsSignal = signal<TicketSummary[]>([]);
  /** Ko'rinadigan biletlar (kamida bitta faol savoli bor). */
  readonly tickets = this.ticketsSignal.asReadonly();

  constructor() {
    this.ticketsApi.summary().subscribe({ next: (tickets) => this.ticketsSignal.set(tickets) });
  }

  private readonly activeIds = computed(() => new Set(this.store.questions().map((q) => q.id)));

  readonly correctIds = computed(() => {
    const active = this.activeIds();
    return new Set([...this.progress.correctIds()].filter((id) => active.has(id)));
  });

  readonly mistakes = computed(() => {
    const active = this.activeIds();
    return Object.fromEntries(Object.entries(this.progress.mistakes()).filter(([id]) => active.has(id)));
  });

  readonly history = computed(() => {
    const active = this.activeIds();
    return this.progress.history().filter((e) => active.has(e.questionId));
  });

  readonly ticketStats = computed(() => {
    const visible = new Set(this.ticketsSignal().map((t) => t.number));
    return Object.fromEntries(
      Object.entries(this.progress.ticketStats()).filter(([number]) => visible.has(Number(number))),
    ) as ReturnType<ProgressService['ticketStats']>;
  });
}
