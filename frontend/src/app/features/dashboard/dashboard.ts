import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoMark } from '../../shared/logo-mark/logo-mark';
import { LanguageService, LOCALE_OPTIONS } from '../../core/services/language.service';

interface NavPill {
  label: string;
  route: string;
  active?: boolean;
}

interface QuickAction {
  icon: string;
  label: string;
  route: string;
  iconBg: string;
}

interface PrimaryCard {
  icon: string;
  title: string;
  subtitle: string;
  gradient: string;
  route: string;
}

interface MenuTile {
  icon: string;
  label: string;
  iconBg: string;
  progress?: number;
  badge?: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, LogoMark],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  protected readonly languageService = inject(LanguageService);
  protected readonly localeOptions = LOCALE_OPTIONS;

  // TODO: backend'da /auth va /users tayyor bo'lgach haqiqiy foydalanuvchi ma'lumotlari bilan almashtiriladi
  readonly userName = 'Foydalanuvchi';
  readonly userInitial = 'F';

  readonly navPills: NavPill[] = [
    { label: 'Bosh sahifa', route: '/dashboard', active: true },
    { label: 'Mavzular', route: '/tests' },
    { label: 'Biletlar', route: '/tests' },
    { label: 'Testlar', route: '/tests' },
  ];

  // TODO: haqiqiy progress /users statistikasi bilan almashtiriladi
  readonly progressPercent = 63;
  readonly correctCount = 412;
  readonly wrongCount = 28;
  readonly skippedCount = 96;
  readonly streakDays = 5;

  readonly quickActions: QuickAction[] = [
    { icon: '📋', label: 'Barcha testlar', route: '/tests', iconBg: 'bg-brand-500/15 text-brand-400' },
    { icon: '🔁', label: 'Xatolarni ko\'rib chiqish', route: '/tests', iconBg: 'bg-rose-500/15 text-rose-400' },
  ];

  readonly primaryCards: PrimaryCard[] = [
    {
      icon: '📖',
      title: 'Mavzu bo\'yicha mashq',
      subtitle: 'Har bir mavzuni alohida mustahkamlang',
      gradient: 'from-blue-600 to-blue-700',
      route: '/tests',
    },
    {
      icon: '▶️',
      title: 'Test yechish',
      subtitle: '20 ta tasodifiy savol bilan sinab ko\'ring',
      gradient: 'from-brand-500 to-brand-700',
      route: '/tests',
    },
    {
      icon: '🎫',
      title: 'Bilet bo\'yicha',
      subtitle: 'Rasmiy 61 bilet tartibida mashq qiling',
      gradient: 'from-amber-500 to-orange-600',
      route: '/tests',
    },
  ];

  readonly menuTiles: MenuTile[] = [
    { icon: '📖', label: 'Mavzular', iconBg: 'bg-purple-500/15 text-purple-400', progress: 40 },
    { icon: '🎫', label: 'Biletlar', iconBg: 'bg-amber-500/15 text-amber-400', progress: 56 },
    { icon: '🔀', label: 'Random testlar', iconBg: 'bg-blue-500/15 text-blue-400' },
    { icon: '⚠️', label: 'Xatolarni tahlil qilish', iconBg: 'bg-red-500/15 text-red-400' },
    { icon: '📊', label: 'Progress kuzatuvi', iconBg: 'bg-emerald-500/15 text-emerald-400' },
    { icon: '🎯', label: "Chalg'ituvchi savollar", iconBg: 'bg-rose-500/15 text-rose-400' },
    { icon: '🔢', label: 'Raqamli savollar', iconBg: 'bg-indigo-500/15 text-indigo-400' },
    { icon: '📝', label: 'Shpargalkalar', iconBg: 'bg-orange-500/15 text-orange-400' },
    { icon: '📘', label: "Yo'l harakati qoidalari", iconBg: 'bg-brand-500/15 text-brand-400' },
    { icon: '🔖', label: 'Saqlangan savollar', iconBg: 'bg-yellow-500/15 text-yellow-400' },
    { icon: '🎥', label: 'Video darslar', iconBg: 'bg-teal-500/15 text-teal-400', badge: 'Tez orada' },
    { icon: '🏆', label: "O'quvchilar musobaqasi", iconBg: 'bg-pink-500/15 text-pink-400', badge: 'Tez orada' },
  ];
}
