import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Question } from '../models/question.model';
import { LanguageService } from './language.service';

@Injectable({ providedIn: 'root' })
export class QuestionsApiService {
  private readonly http = inject(HttpClient);
  private readonly languageService = inject(LanguageService);
  private readonly baseUrl = `${environment.apiUrl}/questions`;

  findAll(): Observable<Question[]> {
    return this.http
      .get<Question[]>(this.baseUrl, { params: { lang: this.languageService.locale() } })
      .pipe(map((questions) => questions.map((q) => this.withAbsoluteImageUrl(q))));
  }

  findRandom(count = 20): Observable<Question[]> {
    return this.http
      .get<Question[]>(`${this.baseUrl}/random`, {
        params: { count, lang: this.languageService.locale() },
      })
      .pipe(map((questions) => questions.map((q) => this.withAbsoluteImageUrl(q))));
  }

  private withAbsoluteImageUrl(question: Question): Question {
    if (!question.imageUrl || /^https?:\/\//.test(question.imageUrl)) {
      return question;
    }
    return { ...question, imageUrl: `${environment.apiUrl}${question.imageUrl}` };
  }
}
