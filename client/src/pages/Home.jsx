import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const HOME_COPY = {
  en: {
    eyebrow: "Storage Marketplace",
    title: "Find, book, and manage storage without the usual friction.",
    subtitle: "VaultX connects businesses, farmers, and space owners through one shared platform. Start with your role and the right dashboard opens after sign-in.",
    cta: "Login / Sign Up",
    continue: "Continue",
    cards: {
      business: {
        title: "For Businesses",
        text: "Book nearby storage for inventory, overflow stock, and short-term space needs.",
      },
      farmer: {
        title: "For Farmers",
        text: "Use FarmVault for produce storage, optional grading, and receipt-linked records.",
      },
      owner: {
        title: "For Space Owners",
        text: "List a room, garage, godown, or warehouse bay and manage all incoming bookings.",
      },
    },
  },
  hi: {
    eyebrow: "स्टोरेज मार्केटप्लेस",
    title: "बिना झंझट स्टोरेज खोजें, बुक करें और मैनेज करें।",
    subtitle: "VaultX व्यवसायों, किसानों और स्पेस ओनर्स को एक साझा प्लेटफॉर्म पर जोड़ता है। अपनी भूमिका चुनें और साइन-इन के बाद सही डैशबोर्ड खुल जाएगा।",
    cta: "लॉगिन / साइन अप",
    continue: "आगे बढ़ें",
    cards: {
      business: {
        title: "व्यवसायों के लिए",
        text: "इन्वेंटरी, ओवरफ्लो स्टॉक और शॉर्ट-टर्म स्पेस की जरूरतों के लिए नजदीकी स्टोरेज बुक करें।",
      },
      farmer: {
        title: "किसानों के लिए",
        text: "उत्पाद भंडारण, वैकल्पिक ग्रेडिंग और रसीद-लिंक्ड रिकॉर्ड के लिए FarmVault का उपयोग करें।",
      },
      owner: {
        title: "स्पेस ओनर्स के लिए",
        text: "कमरा, गैरेज, गोदाम या वेयरहाउस बे लिस्ट करें और सभी आने वाली बुकिंग्स मैनेज करें।",
      },
    },
  },
  bn: {
    eyebrow: "স্টোরেজ মার্কেটপ্লেস",
    title: "ঝামেলা ছাড়া স্টোরেজ খুঁজুন, বুক করুন এবং ম্যানেজ করুন।",
    subtitle: "VaultX ব্যবসা, কৃষক এবং স্পেস ওনারদের এক প্ল্যাটফর্মে যুক্ত করে। নিজের ভূমিকা বেছে নিন, সাইন-ইন করার পরে সঠিক ড্যাশবোর্ড খুলে যাবে।",
    cta: "লগইন / সাইন আপ",
    continue: "এগিয়ে যান",
    cards: {
      business: {
        title: "ব্যবসার জন্য",
        text: "ইনভেন্টরি, ওভারফ্লো স্টক এবং স্বল্পমেয়াদি জায়গার জন্য কাছাকাছি স্টোরেজ বুক করুন।",
      },
      farmer: {
        title: "কৃষকদের জন্য",
        text: "ফসল সংরক্ষণ, ঐচ্ছিক গ্রেডিং এবং রসিদ-সংযুক্ত রেকর্ডের জন্য FarmVault ব্যবহার করুন।",
      },
      owner: {
        title: "স্পেস ওনারদের জন্য",
        text: "ঘর, গ্যারেজ, গোডাউন বা ওয়্যারহাউস বে লিস্ট করুন এবং সব বুকিং ম্যানেজ করুন।",
      },
    },
  },
};

const roleCards = [
  { key: "business", link: "/auth?role=business", tone: "role-panel-business" },
  { key: "farmer", link: "/auth?role=farmer", tone: "role-panel-farmer" },
  { key: "owner", link: "/auth?role=owner", tone: "role-panel-owner" },
];

export default function Home() {
  const { i18n } = useTranslation();
  const copy = useMemo(() => HOME_COPY[i18n.language] || HOME_COPY.en, [i18n.language]);

  return (
    <main className="page fade-up home-minimal">
      <section className="card home-hero-compact">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1 className="hero-title">{copy.title}</h1>
        <p className="hero-sub home-copy-compact">{copy.subtitle}</p>
        <div className="actions">
          <Link className="button" to="/auth?role=business">
            {copy.cta}
          </Link>
        </div>
      </section>

      <section className="role-panel-grid">
        {roleCards.map((card) => (
          <article className={`card role-panel ${card.tone}`} key={card.key}>
            <p className="eyebrow">{copy.cards[card.key].title}</p>
            <h3>{copy.cards[card.key].title}</h3>
            <p>{copy.cards[card.key].text}</p>
            <Link className="button-secondary" to={card.link}>
              {copy.continue}
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
