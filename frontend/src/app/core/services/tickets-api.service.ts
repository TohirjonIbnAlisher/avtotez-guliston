import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Ticket } from '../models/question.model';
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

  private withAbsoluteImageUrls(ticket: Ticket): Ticket {
    return {
      ...ticket,
      questions: ticket.questions.map((q) =>
        q.imageUrl && !/^https?:\/\//.test(q.imageUrl)
          ? { ...q, imageUrl: `${environment.apiUrl}${q.imageUrl}` }
          : q,
      ),
    };
  }
}
