import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TicketsApiService } from '../../../core/services/tickets-api.service';
import { ProgressService } from '../../../core/services/progress.service';
import { TranslateService } from '../../../core/services/translate.service';
import { Ticket } from '../../../core/models/question.model';
import { SessionResult, TestSession } from '../test-session/test-session';

@Component({
  selector: 'app-ticket-session',
  imports: [TestSession, RouterLink],
  templateUrl: './ticket-session.html',
})
export class TicketSession {
  private readonly route = inject(ActivatedRoute);
  private readonly ticketsApi = inject(TicketsApiService);
  private readonly progress = inject(ProgressService);
  protected readonly translate = inject(TranslateService);

  readonly loading = signal(true);
  readonly ticket = signal<Ticket | null>(null);
  private readonly ticketNumber = Number(this.route.snapshot.paramMap.get('number'));

  constructor() {
    this.ticketsApi.findAll().subscribe({
      next: (tickets) => {
        this.ticket.set(tickets.find((t) => t.number === this.ticketNumber) ?? null);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onCompleted(result: SessionResult): void {
    this.progress.recordTicketResult(this.ticketNumber, result.correct, result.wrong);
  }
}
