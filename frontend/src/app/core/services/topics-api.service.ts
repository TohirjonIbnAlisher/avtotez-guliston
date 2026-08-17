import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Topic } from '../models/question.model';

export interface TopicPayload {
  name: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class TopicsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/topics`;

  findAll(): Observable<Topic[]> {
    return this.http.get<Topic[]>(this.baseUrl);
  }

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
