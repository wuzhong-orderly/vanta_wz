import { Helmet } from "react-helmet-async";

type MetaTag =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

type LinkTag = {
  rel: string;
  href: string;
  hrefLang?: string;
};

export type SEOTag = MetaTag | LinkTag;

export function renderSEOTags(tags: SEOTag[], pageTitle?: string) {
  const metaTags: JSX.Element[] = [];
  const linkTags: JSX.Element[] = [];
  let titleElement: JSX.Element | null = null;

  tags.forEach((tag, index) => {
    if ('title' in tag) {
      if (!pageTitle) {
        titleElement = <title key="title">{tag.title}</title>;
      }
    } else if ('rel' in tag) {
      linkTags.push(
        <link
          key={`link-${index}`}
          rel={tag.rel}
          href={tag.href}
          {...(tag.hrefLang && { hrefLang: tag.hrefLang })}
        />
      );
    } else if ('name' in tag) {
      metaTags.push(
        <meta key={`meta-name-${index}`} name={tag.name} content={tag.content} />
      );
    } else if ('property' in tag) {
      metaTags.push(
        <meta key={`meta-property-${index}`} property={tag.property} content={tag.content} />
      );
    }
  });

  return (
    <Helmet>
      {pageTitle && <title>{pageTitle}</title>}
      {!pageTitle && titleElement}
      {metaTags}
      {linkTags}
    </Helmet>
  );
}

