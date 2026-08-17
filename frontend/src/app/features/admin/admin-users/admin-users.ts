import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UsersApiService } from '../../../core/services/users-api.service';
import { AuthService } from '../../../core/services/auth.service';
import { AdminUser } from '../../../core/models/admin.model';
import { UserRole } from '../../../core/models/user.model';
import { normalizePhone } from '../../../core/utils/phone.util';

interface UserFormState {
  id: string | null;
  phone: string;
  password: string;
  fullName: string;
  role: UserRole;
}

const EMPTY_FORM: UserFormState = { id: null, phone: '', password: '', fullName: '', role: 'user' };

@Component({
  selector: 'app-admin-users',
  imports: [RouterLink],
  templateUrl: './admin-users.html',
})
export class AdminUsers {
  private readonly usersApi = inject(UsersApiService);
  protected readonly auth = inject(AuthService);

  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly formOpen = signal(false);
  readonly saving = signal(false);
  readonly showPassword = signal(false);
  readonly form = signal<UserFormState>({ ...EMPTY_FORM });

  readonly roles: UserRole[] = ['user', 'admin', 'superadmin'];

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.usersApi.findAll().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("Foydalanuvchilarni yuklab bo'lmadi.");
        this.loading.set(false);
      },
    });
  }

  openCreate(): void {
    this.form.set({ ...EMPTY_FORM });
    this.showPassword.set(false);
    this.formOpen.set(true);
  }

  openEdit(user: AdminUser): void {
    this.form.set({
      id: user.id,
      phone: user.phone,
      password: '',
      fullName: user.fullName ?? '',
      role: user.role,
    });
    this.showPassword.set(false);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.error.set(null);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }

  updateField<K extends keyof UserFormState>(key: K, value: UserFormState[K]): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  submit(): void {
    const f = this.form();
    if (!f.phone || (!f.id && f.password.length < 6)) {
      this.error.set(
        !f.phone ? 'Telefon raqam kiritilishi shart.' : "Parol kamida 6 belgidan iborat bo'lishi kerak.",
      );
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const payload = {
      phone: normalizePhone(f.phone),
      fullName: f.fullName || undefined,
      role: f.role,
      ...(f.password ? { password: f.password } : {}),
    };

    const request = f.id
      ? this.usersApi.update(f.id, payload)
      : this.usersApi.create({ ...payload, password: f.password });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Saqlashda xatolik yuz berdi.');
      },
    });
  }

  remove(user: AdminUser): void {
    if (user.id === this.auth.currentUser()?.id) {
      alert("O'zingizni o'chira olmaysiz.");
      return;
    }
    if (!confirm(`${user.phone} o'chirilsinmi?`)) {
      return;
    }
    this.usersApi.remove(user.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set("Foydalanuvchini o'chirib bo'lmadi."),
    });
  }
}
