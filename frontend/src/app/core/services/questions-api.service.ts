import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Question } from '../models/question.model';
import { AdminQuestionPayload } from '../models/admin.model';
import { LanguageService, Locale } from './language.service';

@Injectable({ providedIn: 'root' })
export class QuestionsApiService {
  private readonly http = inject(HttpClient);
  private readonly languageService = inject(LanguageService);
  private readonly baseUrl = `${environment.apiUrl}/questions`;

  findAll(topicId?: string): Observable<Question[]> {
    const params: Record<string, string> = { lang: this.languageService.locale() };
    if (topicId) {
      params['topicId'] = topicId;
    }
    return this.http
      .get<Question[]>(this.baseUrl, { params })
      .pipe(map((questions) => questions.map((q) => this.withAbsoluteImageUrl(q))));
  }

  findRandom(count = 20): Observable<Question[]> {
    return this.http
      .get<Question[]>(`${this.baseUrl}/random`, {
        params: { count, lang: this.languageService.locale() },
      })
      .pipe(map((questions) => questions.map((q) => this.withAbsoluteImageUrl(q))));
  }

  findOne(id: string, lang: Locale): Observable<Question> {
    return this.http
      .get<Question>(`${this.baseUrl}/${id}`, { params: { lang } })
      .pipe(map((q) => this.withAbsoluteImageUrl(q)));
  }

  create(payload: AdminQuestionPayload): Observable<unknown> {
    return this.http.post(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<AdminQuestionPayload>): Observable<unknown> {
    return this.http.patch(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  uploadImage(file: File): Observable<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ imageUrl: string }>(`${this.baseUrl}/upload-image`, formData);
  }

  private withAbsoluteImageUrl(question: Question): Question {
    if (!question.imageUrl || /^https?:\/\//.test(question.imageUrl)) {
      return question;
    }
    return { ...question, imageUrl: `${environment.apiUrl}${question.imageUrl}` };
  }
}
