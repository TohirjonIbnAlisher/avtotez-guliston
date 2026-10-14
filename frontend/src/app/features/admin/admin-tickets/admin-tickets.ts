import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TicketsApiService } from '../../../core/services/tickets-api.service';
import { TicketSummary } from '../../../core/models/question.model';

/** Biletdagi odatiy savollar soni (imtihondagidek). */
export const TICKET_SIZE = 20;

@Component({
  selector: 'app-admin-tickets',
  imports: [RouterLink],
  templateUrl: './admin-tickets.html',
})
export class AdminTickets {
  private readonly ticketsApi = inject(TicketsApiService);

  protected readonly ticketSize = TICKET_SIZE;
  readonly tickets = signal<TicketSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly search = signal('');

  readonly filtered = computed(() => {
    const q = this.search().trim();
    return q ? this.tickets().filter((t) => String(t.number).includes(q)) : this.tickets();
  });
  readonly incompleteCount = computed(() => this.tickets().filter((t) => t.questionCount !== TICKET_SIZE).length);

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.ticketsApi.adminList().subscribe({
      next: (tickets) => {
        this.tickets.set(tickets);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("Biletlarni yuklab bo'lmadi.");
        this.loading.set(false);
      },
    });
  }

  remove(ticket: TicketSummary): void {
    if (!confirm(`${ticket.number}-biletni o'chirasizmi? Savollar o'chmaydi, faqat bilet o'chadi.`)) {
      return;
    }
    this.error.set(null);
    this.ticketsApi.remove(ticket.id).subscribe({
      next: () => this.tickets.update((list) => list.filter((t) => t.id !== ticket.id)),
      error: () => this.error.set("Biletni o'chirib bo'lmadi."),
    });
  }
}
