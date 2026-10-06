import Image from 'next/image';
import Link from 'next/link';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex shrink-0 items-center ${className}`} aria-label="ASPR Global Tech, home">
      <Image src="/assets/aspr-logo-white.png" alt="" width={421} height={195} priority className="h-9 w-auto sm:h-10" sizes="96px" />
    </Link>
  );
}
