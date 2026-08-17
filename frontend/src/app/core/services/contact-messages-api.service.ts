import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ContactMessage,
  ContactMessageStatus,
  CreateContactMessagePayload,
} from '../models/contact-message.model';

@Injectable({ providedIn: 'root' })
export class ContactMessagesApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/contact-messages`;

  submit(payload: CreateContactMessagePayload): Observable<ContactMessage> {
    return this.http.post<ContactMessage>(this.baseUrl, payload);
  }

  findAll(): Observable<ContactMessage[]> {
    return this.http.get<ContactMessage[]>(this.baseUrl);
  }

  updateStatus(id: string, status: ContactMessageStatus): Observable<ContactMessage> {
    return this.http.patch<ContactMessage>(`${this.baseUrl}/${id}/status`, { status });
  }
}
