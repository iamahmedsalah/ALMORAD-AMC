import Image from 'next/image';

export function BrandSignature({ locale, onOrange = false }: { locale: string; onOrange?: boolean }) {
  return <span className="brand-signature">
    <span className="brand-symbol" aria-hidden="true">
      <Image src="/brand/amc-mark.svg" alt="" width={80} height={30} className="brand-lockup-light" />
      <Image src={onOrange ? '/brand/amc-mark-on-orange.svg' : '/brand/amc-mark-on-dark.svg'} alt="" width={80} height={30} className="brand-lockup-dark" />
    </span>
    <span className="brand-wording">
      <strong><span>{locale === 'ar' ? 'المراد' : 'almorad'}</span><i aria-hidden="true" /><bdi>AMC</bdi></strong>
      <small>{locale === 'ar' ? 'استوديو النمو وبناء العلامات' : 'Growth & Brand Studio'}</small>
    </span>
  </span>;
}
