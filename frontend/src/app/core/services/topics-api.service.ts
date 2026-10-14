import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Topic, TopicTexts } from '../models/question.model';
import { LanguageService, Locale } from './language.service';

export interface TopicPayload {
  name: string;
  description?: string;
  category?: string;
  /** Qo'lda tuzatilgan tarjimalar — berilmagan/bo'sh maydonlar server tomonida avtomatik to'ldiriladi. */
  translations?: Partial<Record<'uzk' | 'ru', Partial<TopicTexts>>>;
}

@Injectable({ providedIn: 'root' })
export class TopicsApiService {
  private readonly http = inject(HttpClient);
  private readonly language = inject(LanguageService);
  private readonly baseUrl = `${environment.apiUrl}/topics`;

  /** Mavzular o'zbekcha (admin panel uchun) yoki berilgan tilda. */
  findAll(lang?: Locale): Observable<Topic[]> {
    return this.http.get<Topic[]>(this.baseUrl, { params: lang ? { lang } : {} });
  }

  /** Foydalanuvchi tanlagan tildagi mavzular — til almashsa qayta yuklanadi. */
  readonly localized$: Observable<Topic[]> = toObservable(this.language.locale).pipe(
    switchMap((lang) => this.findAll(lang)),
  );

  create(payload: TopicPayload): Observable<Topic> {
    return this.http.post<Topic>(this.baseUrl, payload);
  }

  update(id: string, payload: Partial<TopicPayload>): Observable<Topic> {
    return this.http.patch<Topic>(`${this.baseUrl}/${id}`, payload);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
