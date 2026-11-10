import Image from 'next/image';

export function AmcMarkVectorFallback() {
  return <div className="amc-static-artwork">
    <Image unoptimized src="/brand/amc-mark.svg" width={600} height={224} alt="" loading="eager" fetchPriority="high" decoding="async" className="amc-mark-static brand-lockup-light" />
    <Image unoptimized src="/brand/amc-mark-on-dark.svg" width={600} height={224} alt="" loading="eager" fetchPriority="high" decoding="async" className="amc-mark-static brand-lockup-dark" />
  </div>;
}
