import { AfterViewInit, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../../shared/reveal.directive';
import { LogoMark } from '../../../shared/logo-mark/logo-mark';
import { TranslateService } from '../../../core/services/translate.service';
import { AuthService } from '../../../core/services/auth.service';
import { ContactMessagesApiService } from '../../../core/services/contact-messages-api.service';
import { normalizePhone } from '../../../core/utils/phone.util';

interface HeroStat {
  icon: string;
  value: string;
  labelKey: string;
}

const TRUST_ICONS = ['✅', '📈', '🛡️', '✔️'];
const WHY_US_ICONS = ['🎯', '🏅', '⏱️', '🎓'];
const WHY_US_BG = ['bg-blue-500', 'bg-brand-500', 'bg-purple-500', 'bg-rose-500'];
const PLATFORM_ICONS = ['📖', '🔀', '🎥', '⚠️', '📊', '📱'];
const PLATFORM_HAS_BADGE = [false, false, false, false, false, true];
const STEP_NUMBERS = ['01', '02', '03', '04'];
const STEP_ICONS = ['🔑', '📚', '🎯', '🏆'];
const TESTIMONIAL_INITIALS = ['NK', 'JQ', 'MS'];

interface SocialLink {
  label: string;
  icon: string;
  href: string;
}

@Component({
  selector: 'app-landing',
  imports: [RouterLink, RevealDirective, LogoMark],
  templateUrl: './landing.html',
})
export class Landing implements AfterViewInit {
  protected readonly translate = inject(TranslateService);
  protected readonly auth = inject(AuthService);
  private readonly contactMessagesApi = inject(ContactMessagesApiService);

  readonly heroImage = '/images/main-landing.jpg';
  readonly heroVideo = '/videos/hero-intro.mov';
  readonly videoOpen = signal(false);
  readonly currentYear = new Date().getFullYear();

  private readonly heroVideoRef = viewChild<ElementRef<HTMLVideoElement>>('heroVideoEl');

  ngAfterViewInit(): void {
    const video = this.heroVideoRef()?.nativeElement;
    if (video) {
      video.muted = true;
      video.play().catch(() => {
        // Autoplay bloklangan bo'lsa jim o'tkazib yuboramiz — poster rasm ko'rinib turadi
      });
    }
  }

  openVideo(): void {
    this.videoOpen.set(true);
  }

  closeVideo(): void {
    this.videoOpen.set(false);
  }

  readonly heroStats: HeroStat[] = [
    { icon: '👥', value: '5000+', labelKey: 'landing.hero.statsStudents' },
    { icon: '✅', value: '95%', labelKey: 'landing.hero.statsSuccessRate' },
  ];

  protected readonly trustBar = computed(() =>
    this.translate.array<string>('landing.trust').map((text, i) => ({ icon: TRUST_ICONS[i], text })),
  );

  protected readonly whyUs = computed(() =>
    this.translate
      .array<{ title: string; description: string }>('landing.whyUs.items')
      .map((item, i) => ({ ...item, icon: WHY_US_ICONS[i], iconBg: WHY_US_BG[i] })),
  );

  protected readonly platformFeatures = computed(() =>
    this.translate
      .array<{ title: string; description: string }>('landing.platform.features')
      .map((item, i) => ({
        ...item,
        icon: PLATFORM_ICONS[i],
        badge: PLATFORM_HAS_BADGE[i] ? this.translate.t('common.comingSoon') : undefined,
      })),
  );

  protected readonly steps = computed(() =>
    this.translate
      .array<{ title: string; description: string }>('landing.steps.items')
      .map((item, i) => ({ ...item, number: STEP_NUMBERS[i], icon: STEP_ICONS[i] })),
  );

  protected readonly testimonials = computed(() =>
    this.translate
      .array<{ name: string; role: string; quote: string }>('landing.testimonials.items')
      .map((item, i) => ({ ...item, initials: TESTIMONIAL_INITIALS[i] })),
  );

  readonly currentTestimonial = signal(0);

  nextTestimonial(): void {
    this.currentTestimonial.update((i) => (i + 1) % this.testimonials().length);
  }

  prevTestimonial(): void {
    this.currentTestimonial.update(
      (i) => (i - 1 + this.testimonials().length) % this.testimonials().length,
    );
  }

  goToTestimonial(index: number): void {
    this.currentTestimonial.set(index);
  }

  protected readonly contactAddress = computed(() => this.translate.t('landing.contact.address'));
  // TODO: haqiqiy aloqa ma'lumotlari bilan almashtirish kerak
  readonly contactPhones = ['+998 90 236 19 90'];
  readonly contactEmails = ['info@avtotezguliston.uz', 'support@avtotezguliston.uz'];

  readonly socialLinks: SocialLink[] = [
    { label: 'Instagram', icon: '📷', href: '#' },
    { label: 'Facebook', icon: '📘', href: '#' },
    { label: 'Telegram', icon: '✈️', href: '#' },
  ];

  readonly contactFormName = signal('');
  readonly contactFormPhone = signal('');
  readonly contactFormMessage = signal('');
  readonly contactFormSubmitting = signal(false);
  readonly contactFormError = signal<string | null>(null);
  readonly contactFormSent = signal(false);

  submitContactForm(): void {
    if (!this.contactFormName().trim() || !this.contactFormPhone().trim() || !this.contactFormMessage().trim()) {
      this.contactFormError.set("Barcha maydonlarni to'ldiring.");
      return;
    }

    this.contactFormSubmitting.set(true);
    this.contactFormError.set(null);

    this.contactMessagesApi
      .submit({
        fullName: this.contactFormName().trim(),
        phone: normalizePhone(this.contactFormPhone()),
        message: this.contactFormMessage().trim(),
      })
      .subscribe({
        next: () => {
          this.contactFormSubmitting.set(false);
          this.contactFormSent.set(true);
          this.contactFormName.set('');
          this.contactFormPhone.set('');
          this.contactFormMessage.set('');
        },
        error: (err) => {
          this.contactFormSubmitting.set(false);
          this.contactFormError.set(
            err?.error?.message ?? "Xabarni yuborib bo'lmadi. Qaytadan urinib ko'ring.",
          );
        },
      });
  }

  protected readonly ctaChecklist = computed(() => this.translate.array<string>('landing.cta.checklist'));

  protected readonly footerColumns = computed(() => [
    {
      title: this.translate.t('landing.footer.columns.quickLinks'),
      links: [
        { label: this.translate.t('nav.home'), route: '/', fragment: 'home' },
        { label: this.translate.t('nav.tests'), route: '/tests' },
        { label: this.translate.t('landing.footer.videoLessons'), route: '/', fragment: 'platform' },
      ],
    },
    {
      title: this.translate.t('landing.footer.columns.company'),
      links: [
        { label: this.translate.t('nav.aboutUs'), route: '/', fragment: 'why-us' },
        { label: this.translate.t('nav.results'), route: '/', fragment: 'testimonials' },
      ],
    },
    {
      title: this.translate.t('landing.footer.columns.support'),
      links: [
        { label: this.translate.t('nav.contact'), route: '/', fragment: 'contact' },
        { label: this.translate.t('common.login'), route: '/login' },
      ],
    },
  ]);
}
