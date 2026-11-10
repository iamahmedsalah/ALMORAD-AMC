import Image from 'next/image';

export function AmcMarkVectorFallback() {
  return <div className="amc-static-artwork">
    <Image unoptimized src="/brand/amc-mark.svg" width={568} height={258} alt="" loading="eager" fetchPriority="high" decoding="async" className="amc-mark-static brand-lockup-light" />
    <Image unoptimized src="/brand/amc-mark-on-dark.svg" width={568} height={258} alt="" loading="eager" fetchPriority="high" decoding="async" className="amc-mark-static brand-lockup-dark" />
  </div>;
}
