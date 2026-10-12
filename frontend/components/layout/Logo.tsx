import Image from 'next/image';
import Link from 'next/link';

/** Main's logo treatment: the colour mark on light surfaces, the white mark on navy (footer). */
export function Logo({ tone = 'color', className = '' }: { tone?: 'color' | 'white'; className?: string }) {
  return (
    <Link href="/" className={`inline-flex shrink-0 items-center ${className}`} aria-label="ASPR Global Tech, home">
      <Image src={tone === 'white' ? '/assets/aspr-logo-white.png' : '/assets/aspr-logo.png'} alt="" width={421} height={195} priority={tone === 'color'}
        className={tone === 'white' ? 'h-12 w-auto sm:h-13' : 'h-10 w-auto sm:h-12'} sizes="112px" />
    </Link>
  );
}
