import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContactMessagesApiService } from '../../../core/services/contact-messages-api.service';
import { ContactMessage } from '../../../core/models/contact-message.model';

type FilterKey = 'all' | 'new' | 'contacted';

@Component({
  selector: 'app-admin-messages',
  imports: [RouterLink],
  templateUrl: './admin-messages.html',
})
export class AdminMessages {
  private readonly api = inject(ContactMessagesApiService);

  readonly messages = signal<ContactMessage[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly filter = signal<FilterKey>('all');
  readonly updatingId = signal<string | null>(null);

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.api.findAll().subscribe({
      next: (messages) => {
        this.messages.set(messages);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("Xabarlarni yuklab bo'lmadi.");
        this.loading.set(false);
      },
    });
  }

  readonly newCount = computed(() => this.messages().filter((m) => m.status === 'new').length);

  readonly filteredMessages = computed(() => {
    const filter = this.filter();
    if (filter === 'all') return this.messages();
    return this.messages().filter((m) => m.status === filter);
  });

  setFilter(filter: FilterKey): void {
    this.filter.set(filter);
  }

  markContacted(message: ContactMessage): void {
    this.updatingId.set(message.id);
    this.api.updateStatus(message.id, 'contacted').subscribe({
      next: (updated) => {
        this.messages.update((list) => list.map((m) => (m.id === updated.id ? updated : m)));
        this.updatingId.set(null);
      },
      error: () => {
        this.error.set("Holatni yangilab bo'lmadi.");
        this.updatingId.set(null);
      },
    });
  }

  timeLabel(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ', ' + d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  }
}
