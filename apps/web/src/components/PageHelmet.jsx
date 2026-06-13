import { Helmet } from 'react-helmet-async';
import { SITE_URL } from '../constants/pageSeo';

export default function PageHelmet({ title, description, path = '/' }) {
  const canonicalPath = path === '/' ? '' : path;
  const url = `${SITE_URL}${canonicalPath}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
