import type { Locale, pillars, services } from '@amc/shared';

export type DisciplineId = (typeof pillars)[number]['id'];
type ServiceSlug = (typeof services)[number]['slug'];
export interface Discipline { id: DisciplineId; scene: string; name: string; tagline: string; body: string; tag: string; services: Partial<Record<ServiceSlug, {name: string; description: string}>>; process?: {step: string; detail: string}[]; processLabel?: string; }
// Reviewed adaptation of supplied docs/assets content. No delivery or ranking guarantees.
const content = {
  "en": {
    "language": "en",
    "direction": "ltr",
    "section": {
      "eyebrow": "Our disciplines",
      "title": "Four disciplines, one team behind your brand",
      "lede": "Strategy, identity, campaigns and code under one roof, so the message you write is the one people see, click and remember."
    },
    "ui": {
      "deliverablesLabel": "You receive",
      "hint": "Move your pointer over the image",
      "switchTo": "العربية"
    },
    "disciplines": {
      "marketing": {
        "id": "marketing",
        "scene": "marketing",
        "tag": "Voice · audience in orbit",
        "name": "Marketing",
        "tagline": "Find your voice. Build a presence that belongs to you.",
        "body": "We work out who you are talking to, what they already believe, and what only you can say. Then we turn that into a steady presence people recognise in a feed, a pitch deck and a shop window.",
        "services": {
          "social-media-management": {
            "name": "Social media management",
            "description": "Content planning, publishing and community communication shaped around your brand."
          },
          "personal-branding": {
            "name": "Personal branding",
            "description": "Positioning, visual identity and a content rhythm for founders and specialists who are the face of their business."
          },
          "market-research-analysis": {
            "name": "Market research & analysis",
            "description": "Audience interviews, competitor audits and demand data, summarised into decisions you can act on."
          },
          "branding": {
            "name": "Branding",
            "description": "Name, logo, colour, type and tone of voice, delivered as a guide your whole team can use."
          }
        },
        "deliverables": []
      },
      "advertising": {
        "id": "advertising",
        "scene": "advertising",
        "tag": "Reach · the street at dusk",
        "name": "Advertising",
        "tagline": "Turn attention into a meaningful connection.",
        "body": "Reach is easy to buy and hard to make count. We plan where your message appears, design it to be read in three seconds, and measure what it brought back.",
        "services": {
          "media-buying": {
            "name": "Media buying",
            "description": "Audience and channel planning, placement coordination and campaign performance review."
          },
          "outdoor-advertising": {
            "name": "Billboards & outdoor ads",
            "description": "Site planning, outdoor creative and production coordination suited to distance and context."
          },
          "corporate-events": {
            "name": "Corporate events",
            "description": "Concept, staging, branding and run-of-show for launches, conferences and activations."
          }
        },
        "deliverables": []
      },
      "consulting": {
        "id": "consulting",
        "scene": "consulting",
        "tag": "Structure · connected decisions",
        "name": "Consulting",
        "tagline": "Make your next decision with a clearer perspective.",
        "body": "Clarity before complexity. We map how the business actually runs, find where money and time leak, and hand you a short list of moves in the order to make them.",
        "services": {
          "ecommerce-consulting": {
            "name": "E-commerce consulting",
            "description": "Catalogue, pricing, fulfilment and checkout review for stores that want to grow without adding chaos."
          },
          "management-consulting": {
            "name": "Management consulting",
            "description": "Operating model, roles and reporting rhythm for teams that have outgrown informal habits."
          }
        },
        "deliverables": []
      },
      "web-development": {
        "id": "web-development",
        "scene": "web",
        "tag": "Experience · one build, every screen",
        "name": "Web Development",
        "tagline": "Bring your brand to life, one interaction at a time.",
        "body": "Fast sites built for Arabic and English from the first line of code, with layouts that mirror properly in right-to-left and load quickly on mid-range phones.",
        "services": {
          "ecommerce-website-development": {
            "name": "E-commerce websites",
            "description": "Product pages, cart, payments and order management, built to convert and easy for your team to update."
          },
          "company-websites-landing-pages": {
            "name": "Company websites & landing pages",
            "description": "Clear structure, useful content and technical SEO foundations on an extensible design system."
          }
        },
        "deliverables": [],
        "processLabel": "How we build it",
        "process": [
          {
            "step": "Discover",
            "detail": "Goals, audience and a content audit."
          },
          {
            "step": "Design system",
            "detail": "Colours, type and components in Arabic and English."
          },
          {
            "step": "Build",
            "detail": "Fast, accessible pages tested on mid-range phones."
          },
          {
            "step": "Handover",
            "detail": "Documentation and guidance for maintaining the website."
          }
        ]
      }
    },
    "closing": [
      {
        "label": "Strategy",
        "line": "A brand finding its voice"
      },
      {
        "label": "Campaigns",
        "line": "A business opening new doors"
      },
      {
        "label": "Experience",
        "line": "A digital experience, reimagined"
      }
    ]
  },
  "ar": {
    "language": "ar",
    "direction": "rtl",
    "section": {
      "eyebrow": "مجالات عملنا",
      "title": "أربعة مجالات وفريق واحد خلف علامتك",
      "lede": "الاستراتيجية والهوية والحملات والبرمجة تحت سقف واحد، لتكون الرسالة التي تكتبها هي ما يراه الناس وينقرون عليه ويتذكرونه."
    },
    "ui": {
      "deliverablesLabel": "ما ستحصل عليه",
      "hint": "حرّك المؤشر فوق الصورة",
      "switchTo": "English"
    },
    "disciplines": {
      "marketing": {
        "id": "marketing",
        "scene": "marketing",
        "tag": "الصوت · جمهور في المدار",
        "name": "التسويق",
        "tagline": "اعثر على صوتك. وابنِ حضورًا يشبهك.",
        "body": "نحدد من تخاطب، وما الذي يؤمن به بالفعل، وما الذي لا يستطيع أحد غيرك قوله. ثم نحوّله إلى حضور ثابت يتعرّف عليه الناس في المنصات والعروض وواجهة المحل.",
        "services": {
          "social-media-management": {
            "name": "إدارة وسائل التواصل الاجتماعي",
            "description": "تخطيط المحتوى والنشر والتواصل مع الجمهور بما يعبر عن علامتك."
          },
          "personal-branding": {
            "name": "العلامة الشخصية",
            "description": "تموضع وهوية بصرية وإيقاع محتوى للمؤسسين والمتخصصين الذين يمثلون واجهة أعمالهم."
          },
          "market-research-analysis": {
            "name": "أبحاث السوق وتحليله",
            "description": "مقابلات مع الجمهور وتدقيق للمنافسين وبيانات الطلب، تُلخَّص في قرارات يمكنك تنفيذها."
          },
          "branding": {
            "name": "بناء العلامة التجارية",
            "description": "الاسم والشعار والألوان والخطوط ونبرة الصوت، في دليل يستخدمه فريقك بالكامل."
          }
        },
        "deliverables": []
      },
      "advertising": {
        "id": "advertising",
        "scene": "advertising",
        "tag": "الوصول · الشارع عند الغروب",
        "name": "الإعلان",
        "tagline": "حوّل الانتباه إلى علاقة ذات معنى.",
        "body": "الوصول سهل الشراء وصعب التأثير. نخطط أين تظهر رسالتك، ونصممها لتُقرأ في ثلاث ثوانٍ، ونقيس ما عاد عليك منها.",
        "services": {
          "media-buying": {
            "name": "شراء الوسائط",
            "description": "تخطيط الجمهور والقنوات وتنسيق المساحات ومراجعة أداء الحملات."
          },
          "outdoor-advertising": {
            "name": "اللوحات والإعلانات الخارجية",
            "description": "تخطيط المواقع وتصميم الإعلانات الخارجية وتنسيق الإنتاج بما يناسب المسافة والسياق."
          },
          "corporate-events": {
            "name": "فعاليات الشركات",
            "description": "فكرة وتجهيز وهوية بصرية وجدول تشغيل للإطلاقات والمؤتمرات والأنشطة الميدانية."
          }
        },
        "deliverables": []
      },
      "consulting": {
        "id": "consulting",
        "scene": "consulting",
        "tag": "البنية · قرارات مترابطة",
        "name": "الاستشارات",
        "tagline": "اتخذ قرارك القادم برؤية أوضح.",
        "body": "الوضوح قبل التعقيد. نرسم كيف تعمل الأعمال فعليًا، ونحدد أين يضيع المال والوقت، ونسلّمك قائمة قصيرة بالخطوات مرتبة بحسب أولويتها.",
        "services": {
          "ecommerce-consulting": {
            "name": "استشارات التجارة الإلكترونية",
            "description": "مراجعة للكتالوج والتسعير والتجهيز والدفع للمتاجر التي تريد النمو دون فوضى."
          },
          "management-consulting": {
            "name": "الاستشارات الإدارية",
            "description": "نموذج تشغيل وأدوار وإيقاع تقارير للفرق التي تجاوزت العمل غير الرسمي."
          }
        },
        "deliverables": []
      },
      "web-development": {
        "id": "web-development",
        "scene": "web",
        "tag": "التجربة · بناء واحد لكل الشاشات",
        "name": "تطوير المواقع",
        "tagline": "اجعل علامتك تنبض بالحياة، تفاعلًا بعد تفاعل.",
        "body": "مواقع سريعة تُبنى للعربية والإنجليزية منذ أول سطر برمجي، بتخطيطات تنعكس بشكل صحيح من اليمين إلى اليسار وتعمل بسرعة على الهواتف المتوسطة.",
        "services": {
          "ecommerce-website-development": {
            "name": "مواقع التجارة الإلكترونية",
            "description": "صفحات منتجات وسلة ودفع وإدارة طلبات، مصممة للتحويل وسهلة التحديث على فريقك."
          },
          "company-websites-landing-pages": {
            "name": "مواقع الشركات وصفحات الهبوط",
            "description": "هيكل واضح ومحتوى مفيد وأسس تقنية للظهور في البحث ضمن نظام تصميم قابل للتوسع."
          }
        },
        "deliverables": [],
        "processLabel": "كيف نبنيه",
        "process": [
          {
            "step": "الاكتشاف",
            "detail": "الأهداف والجمهور وتدقيق المحتوى."
          },
          {
            "step": "نظام التصميم",
            "detail": "الألوان والخطوط والمكوّنات بالعربية والإنجليزية."
          },
          {
            "step": "البناء",
            "detail": "صفحات سريعة وسهلة الوصول تُختبر على هواتف متوسطة."
          },
          {
            "step": "التسليم",
            "detail": "توثيق وإرشادات للمحافظة على الموقع وتحديثه."
          }
        ]
      }
    },
    "closing": [
      {
        "label": "الاستراتيجية",
        "line": "علامة تجد صوتها"
      },
      {
        "label": "الحملات",
        "line": "عمل يفتح أبوابًا جديدة"
      },
      {
        "label": "التجربة",
        "line": "تجربة رقمية بصورة جديدة"
      }
    ]
  }
};

export function disciplineCopy(locale: Locale) { return content[locale]; }
export function disciplineFor(id: DisciplineId, locale: Locale): Discipline { return {...content[locale].disciplines[id],id}; }
export function serviceDescription(slug: string, locale: Locale): string | undefined {
  for (const discipline of Object.values(content[locale].disciplines)) {
    const descriptions: Record<string, {description: string}> = discipline.services;
    if (descriptions[slug]) return descriptions[slug].description;
  }
}
