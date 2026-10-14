import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { withAbsoluteMedia } from '../utils/media-url';
import { Question } from '../models/question.model';
import { AdminQuestionPayload } from '../models/admin.model';
import { LanguageService, Locale } from './language.service';

@Injectable({ providedIn: 'root' })
export class QuestionsApiService {
  private readonly http = inject(HttpClient);
  private readonly languageService = inject(LanguageService);
  private readonly baseUrl = `${environment.apiUrl}/questions`;

  private readonly versionSignal = signal(0);
  /** Savollar o'zgargan sari (admin panelda yaratish/tahrirlash/o'chirish/tartib) oshadi — QuestionsStore qayta yuklanadi. */
  readonly version = this.versionSignal.asReadonly();
  private bump<T>() {
    return tap<T>({ next: () => this.versionSignal.update((v) => v + 1) });
  }

  findAll(topicId?: string): Observable<Question[]> {
    const params: Record<string, string> = { lang: this.languageService.locale() };
    if (topicId) {
      params['topicId'] = topicId;
    }
    return this.http
      .get<Question[]>(this.baseUrl, { params })
      .pipe(map((questions) => questions.map((q) => withAbsoluteMedia(q))));
  }

  findRandom(count = 20): Observable<Question[]> {
    return this.http
      .get<Question[]>(`${this.baseUrl}/random`, {
        params: { count, lang: this.languageService.locale() },
      })
      .pipe(map((questions) => questions.map((q) => withAbsoluteMedia(q))));
  }

  findOne(id: string, lang: Locale): Observable<Question> {
    return this.http
      .get<Question>(`${this.baseUrl}/${id}`, { params: { lang } })
      .pipe(map((q) => withAbsoluteMedia(q)));
  }

  create(payload: AdminQuestionPayload): Observable<unknown> {
    return this.http.post(this.baseUrl, payload).pipe(this.bump());
  }

  update(id: string, payload: Partial<AdminQuestionPayload>): Observable<unknown> {
    return this.http.patch(`${this.baseUrl}/${id}`, payload).pipe(this.bump());
  }

  /** Mavzudagi savollar tartibini saqlash — `questionIds` yangi tartibda, mavzudagi barcha savollar. */
  reorder(topicId: string, questionIds: string[]): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/order`, { topicId, questionIds }).pipe(this.bump());
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(this.bump());
  }

  uploadVideo(file: File): Observable<{ videoUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ videoUrl: string }>(`${this.baseUrl}/upload-video`, formData);
  }

  uploadImage(file: File): Observable<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ imageUrl: string }>(`${this.baseUrl}/upload-image`, formData);
  }
}
