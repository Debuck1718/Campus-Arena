import React from 'react';
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, absoluteUrl, socialImageUrl, type SeoProps } from '../lib/seo';

/**
 * Declarative head manager for a client-rendered SPA.
 *
 * Every tag it owns is created with a `data-seo` marker and removed on cleanup,
 * so navigating between routes never leaves a stale canonical or og:title
 * behind — a real hazard in a SPA, where Google would otherwise index the
 * previous page's canonical on the next one.
 */
export function SEO({
  title,
  description,
  path,
  image,
  jsonLd,
  noindex = false,
  type = 'website',
}: SeoProps): null {
  React.useEffect(() => {
    const created: HTMLElement[] = [];

    const make = <K extends keyof HTMLElementTagNameMap>(
      tag: K,
      attrs: Record<string, string>,
      content?: string
    ) => {
      const el = document.createElement(tag);
      el.setAttribute('data-seo', '');
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      if (content !== undefined) el.textContent = content;
      document.head.appendChild(el);
      created.push(el);
      return el;
    };

    const resolvedTitle = title || DEFAULT_TITLE;
    const resolvedDescription = description || DEFAULT_DESCRIPTION;
    const canonical = absoluteUrl(path || window.location.pathname);
    const ogImage = socialImageUrl(image);

    document.title = resolvedTitle;
    document.documentElement.lang = 'en';

    const meta = (key: 'name' | 'property', value: string, content: string) =>
      make('meta', { [key]: value, content });

    meta('name', 'description', resolvedDescription);
    meta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    meta('name', 'author', 'CampusArena');

    make('link', { rel: 'canonical', href: canonical });

    // Open Graph — the preview card for WhatsApp, Discord, Slack, Facebook.
    meta('property', 'og:type', type);
    meta('property', 'og:site_name', 'CampusArena');
    meta('property', 'og:title', resolvedTitle);
    meta('property', 'og:description', resolvedDescription);
    meta('property', 'og:url', canonical);
    meta('property', 'og:image', ogImage);
    meta('property', 'og:image:alt', resolvedTitle);

    // Twitter/X falls back to og:* but these make the large card explicit.
    meta('name', 'twitter:card', 'summary_large_image');
    meta('name', 'twitter:title', resolvedTitle);
    meta('name', 'twitter:description', resolvedDescription);
    meta('name', 'twitter:image', ogImage);

    make('script', { type: 'application/ld+json' }, JSON.stringify(jsonLd ?? {}));

    return () => {
      created.forEach((el) => el.remove());
    };
  }, [title, description, path, image, jsonLd, noindex, type]);

  return null;
}