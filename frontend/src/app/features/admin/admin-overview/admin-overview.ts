import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface AdminSection {
  icon: string;
  title: string;
  description: string;
  route: string;
}

const STAFF_SECTIONS: AdminSection[] = [
  {
    icon: '✉️',
    title: 'Xabarlar',
    description: "Saytdan kelgan murojaatlarni ko'rish va statuslash",
    route: '/admin/messages',
  },
];

const SUPERADMIN_SECTIONS: AdminSection[] = [
  {
    icon: '👥',
    title: 'Foydalanuvchilar',
    description: "Foydalanuvchilarni qo'shish, tahrirlash va o'chirish",
    route: '/admin/users',
  },
  {
    icon: '📂',
    title: 'Mavzular',
    description: "Mavzularni qo'shish, tahrirlash va o'chirish",
    route: '/admin/topics',
  },
  {
    icon: '❓',
    title: 'Savollar',
    description: "Savollarni qo'shish, tahrirlash va o'chirish",
    route: '/admin/questions',
  },
];

@Component({
  selector: 'app-admin-overview',
  imports: [RouterLink],
  templateUrl: './admin-overview.html',
})
export class AdminOverview {
  private readonly auth = inject(AuthService);

  readonly isSuperAdmin = computed(() => this.auth.currentUser()?.role === 'superadmin');

  readonly sections = computed<AdminSection[]>(() =>
    this.isSuperAdmin() ? [...STAFF_SECTIONS, ...SUPERADMIN_SECTIONS] : STAFF_SECTIONS,
  );
}
