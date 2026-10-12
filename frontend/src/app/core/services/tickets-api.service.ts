import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Ticket, TicketSummary } from '../models/question.model';
import { withAbsoluteMedia } from '../utils/media-url';
import { LanguageService } from './language.service';

@Injectable({ providedIn: 'root' })
export class TicketsApiService {
  private readonly http = inject(HttpClient);
  private readonly languageService = inject(LanguageService);
  private readonly baseUrl = `${environment.apiUrl}/tickets`;

  findAll(): Observable<Ticket[]> {
    return this.http
      .get<Ticket[]>(this.baseUrl, { params: { lang: this.languageService.locale() } })
      .pipe(map((tickets) => tickets.map((t) => this.withAbsoluteImageUrls(t))));
  }

  /** Ro'yxat uchun: faqat raqam va savollar soni — tez yuklanadi. */
  summary(): Observable<TicketSummary[]> {
    return this.http.get<TicketSummary[]>(`${this.baseUrl}/summary`);
  }

  /** Bitta bilet (savollari bilan) raqami bo'yicha. */
  findByNumber(number: number): Observable<Ticket> {
    return this.http
      .get<Ticket>(`${this.baseUrl}/number/${number}`, { params: { lang: this.languageService.locale() } })
      .pipe(map((t) => this.withAbsoluteImageUrls(t)));
  }

  private withAbsoluteImageUrls(ticket: Ticket): Ticket {
    return { ...ticket, questions: ticket.questions.map(withAbsoluteMedia) };
  }
}
