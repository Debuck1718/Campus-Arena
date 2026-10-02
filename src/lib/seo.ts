/**
 * Central SEO configuration and structured-data builders.
 *
 * The canonical origin is driven by VITE_SITE_URL so previews and production
 * never advertise the wrong host. It is read once here rather than in every
 * page, and every canonical/OG/sitemap URL in the app derives from it.
 */

/** Public origin of the deployed site, without a trailing slash. */
export const SITE_URL: string = (
  import.meta.env.VITE_SITE_URL || 'https://campus-arena.vercel.app'
).replace(/\/+$/, '');

export const SITE_NAME = 'CampusArena';

/**
 * The studio that designed and built CampusArena. Credited in the footer, the
 * structured data (as creator/publisher) and the legal pages, so the
 * attribution is visible to users and machine-readable for search engines.
 */
export const CREATOR_NAME = 'Evantra DeBuckman Ventures';
export const CREATOR_URL = 'https://evantradebuckman.com';
export const CREATOR_ID = `${CREATOR_URL}/#organization`;

export const DEFAULT_TITLE = 'CampusArena — Campus Tournaments, Matches & Leaderboards';

export const DEFAULT_DESCRIPTION =
  'CampusArena is the competitive platform for students: create tournaments, challenge rivals 1v1, chat in match rooms, and climb the campus leaderboard.';

/** Absolute URL helper — safe with or without a leading slash on `path`. */
export function absoluteUrl(path = '/'): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

const IMAGE_PATH = '/icons/icon-512.png';

export type SeoProps = {
  title?: string;
  description?: string;
  /** Route path used for the canonical link, e.g. `/leaderboard`. */
  path?: string;
  /** Absolute or root-relative image URL for social cards. */
  image?: string;
  /** JSON-LD blocks (one object or an @graph array) for this page. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Ask search engines to drop the page: private and transactional routes. */
  noindex?: boolean;
  type?: 'website' | 'article' | 'profile';
};

export function socialImageUrl(image?: string): string {
  return absoluteUrl(image || IMAGE_PATH);
}

/**
 * The creator node, emitted site-wide so Google can connect CampusArena to the
 * studio that built it (sameAs + url build the entity relationship).
 */
export function creatorJsonLd() {
  return {
    '@type': 'Organization',
    '@id': CREATOR_ID,
    name: CREATOR_NAME,
    url: CREATOR_URL,
    description:
      'Evantra DeBuckman Ventures is a software studio building competitive gaming and campus community platforms.',
  };
}

/** Organization + WebSite nodes shared by every page. */
export function organizationJsonLd() {
  return {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl(IMAGE_PATH),
    description: DEFAULT_DESCRIPTION,
    creator: { '@id': CREATOR_ID },
    publisher: { '@id': CREATOR_ID },
  };
}

export function websiteJsonLd() {
  return {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    publisher: { '@id': `${SITE_URL}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/leaderboard?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** Homepage graph: the creator, the site, and the app itself. */
export function homeJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      creatorJsonLd(),
      organizationJsonLd(),
      websiteJsonLd(),
      {
        '@type': 'WebApplication',
        name: SITE_NAME,
        url: SITE_URL,
        applicationCategory: 'GameApplication',
        operatingSystem: 'Web',
        description: DEFAULT_DESCRIPTION,
        creator: { '@id': CREATOR_ID },
        publisher: { '@id': CREATOR_ID },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
    ],
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
