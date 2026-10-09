import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ProgressState {
  correctIds: string[];
  mistakes: Record<string, number>;
  savedIds: string[];
  ticketStats: Record<number, { correct: number; wrong: number }>;
  history: { questionId: string; isCorrect: boolean; timestamp: number }[];
}

export interface ProgressImport {
  correctIds: string[];
  mistakes: { questionId: string; selectedOption: number }[];
  savedIds: string[];
  ticketStats: { ticketNumber: number; correct: number; wrong: number }[];
  history: { questionId: string; isCorrect: boolean; timestamp: number }[];
}

export interface TestSessionPayload {
  title: string;
  correct: number;
  wrong: number;
  total: number;
}

export interface TestSessionResponse extends TestSessionPayload {
  id: string;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class ProgressApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/progress`;

  getState(): Observable<ProgressState> {
    return this.http.get<ProgressState>(this.baseUrl);
  }

  reset(): Observable<void> {
    return this.http.delete<void>(this.baseUrl);
  }

  recordAnswer(questionId: string, selectedOption: number): Observable<{ isCorrect: boolean }> {
    return this.http.post<{ isCorrect: boolean }>(`${this.baseUrl}/answers`, { questionId, selectedOption });
  }

  setSaved(questionId: string, saved: boolean): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/saved/${questionId}`, { saved });
  }

  setTicketResult(ticketNumber: number, correct: number, wrong: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/tickets/${ticketNumber}`, { correct, wrong });
  }

  clearTicketResults(): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/tickets`);
  }

  importProgress(payload: ProgressImport): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/import`, payload);
  }

  getSessions(): Observable<TestSessionResponse[]> {
    return this.http.get<TestSessionResponse[]>(`${this.baseUrl}/sessions`);
  }

  createSession(payload: TestSessionPayload): Observable<TestSessionResponse> {
    return this.http.post<TestSessionResponse>(`${this.baseUrl}/sessions`, payload);
  }

  importSessions(sessions: (TestSessionPayload & { timestamp: number })[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/sessions/import`, { sessions });
  }

  getActivityDays(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/activity`);
  }

  addActivityDay(day: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/activity/${day}`, {});
  }

  importActivityDays(days: string[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/activity/import`, { days });
  }
}
