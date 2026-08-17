import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TicketsApiService } from '../../../core/services/tickets-api.service';
import { ProgressService } from '../../../core/services/progress.service';
import { TranslateService } from '../../../core/services/translate.service';
import { Ticket } from '../../../core/models/question.model';

type TicketFilter = 'all' | 'new' | 'mistakes';
type TicketColor = 'none' | 'green' | 'yellow' | 'red';

interface TicketTile {
  number: number;
  total: number;
  correct: number;
  wrong: number;
  attempted: boolean;
  color: TicketColor;
}

@Component({
  selector: 'app-tickets-list',
  imports: [RouterLink],
  templateUrl: './tickets-list.html',
})
export class TicketsList {
  private readonly ticketsApi = inject(TicketsApiService);
  protected readonly progress = inject(ProgressService);
  protected readonly translate = inject(TranslateService);

  readonly loading = signal(true);
  private readonly tickets = signal<Ticket[]>([]);
  readonly filter = signal<TicketFilter>('all');

  constructor() {
    this.ticketsApi.findAll().subscribe({
      next: (tickets) => {
        this.tickets.set(tickets);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private readonly tiles = computed<TicketTile[]>(() =>
    this.tickets().map((ticket) => {
      const stat = this.progress.ticketStats()[ticket.number];
      const attempted = !!stat;
      const wrong = stat?.wrong ?? 0;
      const color: TicketColor = !attempted
        ? 'none'
        : wrong <= 1
          ? 'green'
          : wrong === 2
            ? 'yellow'
            : 'red';
      return {
        number: ticket.number,
        total: ticket.questions.length,
        correct: stat?.correct ?? ticket.questions.length,
        wrong,
        attempted,
        color,
      };
    }),
  );

  readonly filteredTiles = computed(() => {
    const filter = this.filter();
    return this.tiles().filter((t) => {
      if (filter === 'new') return !t.attempted;
      if (filter === 'mistakes') return t.attempted && t.wrong > 0;
      return true;
    });
  });

  readonly progressPercent = computed(() => {
    const total = this.tiles().length;
    if (total === 0) return 0;
    const attempted = this.tiles().filter((t) => t.attempted).length;
    return Math.round((attempted / total) * 100);
  });

  setFilter(filter: TicketFilter): void {
    this.filter.set(filter);
  }
}
