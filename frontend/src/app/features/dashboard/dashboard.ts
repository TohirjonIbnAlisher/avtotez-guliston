import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LogoMark } from '../../shared/logo-mark/logo-mark';
import { LanguageService, LOCALE_OPTIONS } from '../../core/services/language.service';
import { TranslateService } from '../../core/services/translate.service';
import { AuthService } from '../../core/services/auth.service';
import { ProgressService } from '../../core/services/progress.service';
import { QuestionsStore } from '../../core/services/questions-store.service';
import { ThemeService } from '../../core/services/theme.service';
import { StreakService } from '../../core/services/streak.service';

interface NavPill {
  labelKey: string;
  route: string;
  active?: boolean;
}

interface QuickAction {
  icon: string;
  labelKey: string;
  route: string;
  iconBg: string;
}

interface MenuTile {
  icon: string;
  labelKey: string;
  iconBg: string;
  route?: string;
  progress?: number;
  hasBadge?: boolean;
}

const PRIMARY_CARD_ICONS = ['📖', '▶️', '🎫'];
const PRIMARY_CARD_GRADIENTS = ['from-blue-600 to-blue-700', 'from-brand-500 to-brand-700', 'from-amber-500 to-orange-600'];
const PRIMARY_CARD_ROUTES = ['/tests/topics', '/tests', '/tests/tickets'];

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, LogoMark],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly router = inject(Router);
  protected readonly languageService = inject(LanguageService);
  protected readonly translate = inject(TranslateService);
  protected readonly auth = inject(AuthService);
  protected readonly progress = inject(ProgressService);
  protected readonly questionsStore = inject(QuestionsStore);
  protected readonly theme = inject(ThemeService);
  private readonly streak = inject(StreakService);
  protected readonly localeOptions = LOCALE_OPTIONS;

  constructor() {
    this.streak.recordToday();
  }

  protected readonly userName = computed(
    () => this.auth.currentUser()?.fullName || this.auth.currentUser()?.phone || this.translate.t('dashboard.userNamePlaceholder'),
  );
  protected readonly userInitial = computed(() => this.userName().charAt(0).toUpperCase() || 'F');
  protected readonly userRole = computed(() => this.auth.currentUser()?.role ?? 'user');
  protected readonly roleLabel = computed(() => this.translate.t(`dashboard.role.${this.userRole()}`));

  readonly navPills: NavPill[] = [
    { labelKey: 'dashboard.nav.home', route: '/dashboard', active: true },
    { labelKey: 'dashboard.nav.topics', route: '/tests/topics' },
    { labelKey: 'dashboard.nav.tickets', route: '/tests/tickets' },
    { labelKey: 'dashboard.nav.tests', route: '/tests/all' },
  ];

  protected readonly totalQuestions = computed(() => this.questionsStore.questions().length);
  protected readonly correctCount = computed(() => this.progress.correctIds().size);
  protected readonly wrongCount = computed(() => Object.keys(this.progress.mistakes()).length);
  protected readonly skippedCount = computed(() =>
    Math.max(0, this.totalQuestions() - this.correctCount() - this.wrongCount()),
  );
  protected readonly progressPercent = computed(() =>
    this.totalQuestions() ? Math.round((this.correctCount() / this.totalQuestions()) * 100) : 0,
  );

  protected readonly streakDays = this.streak.streakDays;

  readonly quickActions: QuickAction[] = [
    { icon: '📋', labelKey: 'dashboard.quickActions.allTests', route: '/tests/all', iconBg: 'bg-brand-500/15 text-brand-400' },
    { icon: '🔁', labelKey: 'dashboard.quickActions.reviewMistakes', route: '/tests/mistakes', iconBg: 'bg-rose-500/15 text-rose-400' },
  ];

  protected readonly primaryCards = computed(() =>
    this.translate
      .array<{ title: string; subtitle: string }>('dashboard.primaryCards')
      .map((card, i) => ({
        ...card,
        icon: PRIMARY_CARD_ICONS[i],
        gradient: PRIMARY_CARD_GRADIENTS[i],
        route: PRIMARY_CARD_ROUTES[i],
      })),
  );

  readonly menuTiles: MenuTile[] = [
    { icon: '📖', labelKey: 'dashboard.nav.topics', iconBg: 'bg-purple-500/15 text-purple-400', route: '/tests/topics' },
    { icon: '🎫', labelKey: 'dashboard.nav.tickets', iconBg: 'bg-amber-500/15 text-amber-400', route: '/tests/tickets' },
    { icon: '🔀', labelKey: 'dashboard.menu.randomTests', iconBg: 'bg-blue-500/15 text-blue-400', route: '/tests/random' },
    { icon: '⚠️', labelKey: 'dashboard.menu.errorAnalysis', iconBg: 'bg-red-500/15 text-red-400', route: '/tests/mistakes' },
    { icon: '📊', labelKey: 'dashboard.menu.progressTracking', iconBg: 'bg-emerald-500/15 text-emerald-400', route: '/progress' },
    { icon: '🎯', labelKey: 'dashboard.menu.trickyQuestions', iconBg: 'bg-rose-500/15 text-rose-400' },
    { icon: '🔢', labelKey: 'dashboard.menu.numberQuestions', iconBg: 'bg-indigo-500/15 text-indigo-400' },
    { icon: '📝', labelKey: 'dashboard.menu.cheatSheets', iconBg: 'bg-orange-500/15 text-orange-400' },
    { icon: '📘', labelKey: 'dashboard.menu.trafficRules', iconBg: 'bg-brand-500/15 text-brand-400' },
    { icon: '🔖', labelKey: 'dashboard.menu.savedQuestions', iconBg: 'bg-yellow-500/15 text-yellow-400', route: '/tests/saved' },
    { icon: '🎥', labelKey: 'landing.footer.videoLessons', iconBg: 'bg-teal-500/15 text-teal-400', hasBadge: true },
    { icon: '🏆', labelKey: 'dashboard.menu.competition', iconBg: 'bg-pink-500/15 text-pink-400', hasBadge: true },
  ];

  resetProgress(): void {
    if (confirm(this.translate.t('dashboard.progress.resetConfirm'))) {
      this.progress.resetProgress();
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
