import Image from 'next/image'

interface BlogHeroProps {
  src: string
  alt: string
}

export function BlogHero({ src, alt }: BlogHeroProps) {
  return (
    <div data-testid="blog-hero" className="mb-8 overflow-hidden rounded-lg">
      <Image
        src={src}
        alt={alt}
        width={1200}
        height={630}
        priority
        className="w-full object-cover"
      />
    </div>
  )
}
