import { AfterViewInit, Component, ElementRef, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../../shared/reveal.directive';
import { LogoMark } from '../../../shared/logo-mark/logo-mark';

interface HeroStat {
  icon: string;
  value: string;
  label: string;
}

interface TrustItem {
  icon: string;
  text: string;
}

interface ColoredFeature {
  icon: string;
  iconBg: string;
  title: string;
  description: string;
}

interface Feature {
  icon: string;
  title: string;
  description: string;
  badge?: string;
}

interface Step {
  number: string;
  icon: string;
  title: string;
  description: string;
}

interface Testimonial {
  initials: string;
  name: string;
  role: string;
  quote: string;
}

interface SocialLink {
  label: string;
  icon: string;
  href: string;
}

interface FooterLink {
  label: string;
  route?: string;
  fragment?: string;
  href?: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

@Component({
  selector: 'app-landing',
  imports: [RouterLink, RevealDirective, LogoMark],
  templateUrl: './landing.html',
})
export class Landing implements AfterViewInit {
  readonly heroImage = '/images/main-landing.jpg';
  readonly heroVideo = '/videos/hero-intro.mov';
  readonly videoOpen = signal(false);

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
    { icon: '👥', value: '5000+', label: "O'quvchilar" },
    { icon: '✅', value: '95%', label: 'Muvaffaqiyat darajasi' },
  ];

  readonly trustBar: TrustItem[] = [
    { icon: '✅', text: "5000+ o'quvchi muvaffaqiyatli topshirdi" },
    { icon: '📈', text: '95% muvaffaqiyat darajasi' },
    { icon: '🛡️', text: 'Rasmiy testga 100% mos' },
    { icon: '✔️', text: 'Kafolatlangan natija' },
  ];

  readonly whyUs: ColoredFeature[] = [
    {
      icon: '🎯',
      iconBg: 'bg-blue-500',
      title: 'Aniq maqsad',
      description: "Har bir test rasmiy imtihon formatiga 100% mos holda tuzilgan. Hech qanday keraksiz materiallar yo'q.",
    },
    {
      icon: '🏅',
      iconBg: 'bg-brand-500',
      title: 'Kafolatlangan natija',
      description: "95% o'quvchilarimiz birinchi urinishda imtihondan o'tishadi. Siz ham ularga qo'shiling!",
    },
    {
      icon: '⏱️',
      iconBg: 'bg-purple-500',
      title: 'Vaqtni tejang',
      description: "Mavzulashtirilgan testlar va izohlar bilan o'rganish jarayonini 3 baravar tezlashtiring.",
    },
    {
      icon: '🎓',
      iconBg: 'bg-rose-500',
      title: 'Professional ustozlar',
      description: "Tajribali ustozlardan professional darslar oling — har bir mavzu chuqur va tushunarli tarzda tushuntiriladi.",
    },
  ];

  readonly platformFeatures: Feature[] = [
    {
      icon: '📖',
      title: 'Mavzulashtirilgan testlar',
      description: "Barcha mavzular bo'yicha tuzilgan testlar. Har bir mavzuni tajribali o'qituvchilar bilan alohida o'rganing va mustahkamlang.",
    },
    {
      icon: '🔀',
      title: 'Random testlar',
      description: "Haqiqiy imtihonga o'xshash random testlar. O'zingizni sinab ko'ring!",
    },
    {
      icon: '🎥',
      title: 'Video darslar',
      description: "Har bir mavzu bo'yicha professional video darslar va nazariy materiallar.",
    },
    {
      icon: '⚠️',
      title: 'Xatolarni tahlil qilish',
      description: "Har bir xato uchun batafsil izoh va to'g'ri javob. Xatolaringizdan o'rganing.",
    },
    {
      icon: '📊',
      title: 'Progress kuzatuvi',
      description: "Batafsil statistika va taraqqiyotingizni kuzatish. Qaysi mavzularda zaif ekanligingizni bilib oling.",
    },
    {
      icon: '📱',
      title: 'Mobil ilova',
      description: 'Istalgan joyda istalgan vaqtda o\'rganing. iOS va Android uchun.',
      badge: 'Tez orada',
    },
  ];

  readonly steps: Step[] = [
    { number: '01', icon: '🔑', title: 'Tizimga kiring', description: "Tezkor va oson tizimga kiring va platformadan foydalanishni boshlang." },
    { number: '02', icon: '📚', title: 'Mavzularni o\'rganing', description: "Tajribali o'qituvchilar va video darslar, nazariy materiallar orqali barcha mavzularni o'rganing." },
    { number: '03', icon: '🎯', title: 'Testlarni ishlang', description: "Mavzulashtirilgan va random testlarni ishlab, bilimingizni mustahkamlang." },
    { number: '04', icon: '🏆', title: 'Imtihonni topshiring', description: "Tayyorgarlik ko'rib, ishonch bilan rasmiy imtihondan muvaffaqqiyatli o'ting!" },
  ];

  readonly testimonials: Testimonial[] = [
    {
      initials: 'NK',
      name: 'Nodira Karimova',
      role: 'Talaba, 22 yosh',
      quote: "Avtotez Guliston platformasi juda qulay va tushunarli. Mavzulashtirilgan testlar orqali barcha mavzularni yaxshi o'rgandim. Birinchi urinishdayoq imtihondan o'tdim!",
    },
    {
      initials: 'JQ',
      name: 'Jasur Qodirov',
      role: 'Talaba, 24 yosh',
      quote: "Bilet-bilet mashq qilish imkoniyati eng foydalisi bo'ldi. Xatolarim bo'yicha izohlar juda tushunarli edi.",
    },
    {
      initials: 'MS',
      name: 'Malika Saidova',
      role: "O'quvchi, 19 yosh",
      quote: "Chalg'ituvchi savollar bo'limi ayni kerak bo'lgan narsa edi. Endi shunga o'xshash savollarga tayyorman.",
    },
  ];

  readonly currentTestimonial = signal(0);

  nextTestimonial(): void {
    this.currentTestimonial.update((i) => (i + 1) % this.testimonials.length);
  }

  prevTestimonial(): void {
    this.currentTestimonial.update(
      (i) => (i - 1 + this.testimonials.length) % this.testimonials.length,
    );
  }

  goToTestimonial(index: number): void {
    this.currentTestimonial.set(index);
  }

  // TODO: haqiqiy aloqa ma'lumotlari bilan almashtirish kerak
  readonly contactAddress = "Guliston shahri";
  readonly contactPhones = ['+998 90 236 19 90'];
  readonly contactEmails = ['info@avtotezguliston.uz', 'support@avtotezguliston.uz'];

  readonly socialLinks: SocialLink[] = [
    { label: 'Instagram', icon: '📷', href: '#' },
    { label: 'Facebook', icon: '📘', href: '#' },
    { label: 'Telegram', icon: '✈️', href: '#' },
  ];

  readonly footerColumns: FooterColumn[] = [
    {
      title: 'Tezkor havolalar',
      links: [
        { label: 'Asosiy', route: '/', fragment: 'home' },
        { label: 'Testlar', route: '/tests' },
        { label: 'Video darslar', route: '/', fragment: 'platform' },
      ],
    },
    {
      title: 'Kompaniya',
      links: [
        { label: 'Biz haqimizda', route: '/', fragment: 'why-us' },
        { label: 'Natijalar', route: '/', fragment: 'testimonials' },
      ],
    },
    {
      title: "Qo'llab-quvvatlash",
      links: [
        { label: 'Kontakt', route: '/', fragment: 'contact' },
        { label: 'Kirish', route: '/login' },
      ],
    },
  ];
}
