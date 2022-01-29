export const scrapAllData = (document: HTMLElement, uri: string) => {
  let title, description, domain, img, favicon, siteName;

  // --------------------------------------------------------------------------------------

  const ogTitle: any = document
    .querySelector('meta[property="og:title"]')
    ?.getAttribute('content');
  const docTitle = document.title;
  const h1 = document.querySelector('h1')?.innerHTML;
  const h2 = document.querySelector('h2')?.innerHTML;

  if (ogTitle) {
    title = ogTitle;
  } else if (docTitle != null && docTitle.length > 0) {
    title = docTitle;
  } else if (h1 != null && h1.length > 0) {
    title = h1;
  } else if (h2 != null && h2.length > 0) {
    title = h2;
  } else {
    title = null;
  }

  // --------------------------------------------------------------------------------------

  const canonicalLink: any = document
    .querySelector('link[rel=canonical]')
    ?.getAttribute('href');
  const ogUrlMeta: any = document
    .querySelector('meta[property="og:url"]')
    ?.getAttribute('content');

  if (canonicalLink) {
    domain = canonicalLink;
  } else if (ogUrlMeta) {
    domain = ogUrlMeta;
  } else {
    domain = null;
  }
  domain =
    domain != null
      ? new URL(domain).hostname.replace('www.', '')
      : new URL(uri).hostname.replace('www.', '');

  // --------------------------------------------------------------------------------------

  const ogDescription: any = document
    .querySelector('meta[property="og:description"]')
    ?.getAttribute('content');
  const metaDescription: any = document
    .querySelector('meta[name="description"]')
    ?.getAttribute('content');

  if (ogDescription) {
    description = ogDescription;
  } else if (metaDescription) {
    description = metaDescription;
  }

  // --------------------------------------------------------------------------------------

  const ogSecureImg: any = document
    .querySelector('meta[property="og:image:secure_url"]')
    ?.getAttribute('content');
  const ogImg: any = document
    .querySelector('meta[property="og:image"]')
    ?.getAttribute('content');
  let imgs: any = Array.from(document.getElementsByTagName('img'));

  if (ogSecureImg) {
    if (
      /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi.test(
        ogSecureImg
      )
    )
      img = ogSecureImg;
  } else if (ogImg) {
    if (
      /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi.test(
        ogImg
      )
    )
      img = ogImg;
  } else if (imgs.length > 0) {
    imgs.forEach((img: any) =>
      img.src.indexOf('//') === -1
        ? (img.src = `${new URL(uri).origin}/${img.src}`)
        : img.src
    );
    if (
      /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi.test(
        imgs[0].src
      )
    )
      img = imgs[0].src;
  } else {
    img = null;
  }

  // --------------------------------------------------------------------------------------

  const shortcutIcon: any = document
    .querySelector('link[rel="shortcut icon"]')
    ?.getAttribute('href');
  const fav: any = document
    .querySelector('link[rel="icon"]')
    ?.getAttribute('href');

  if (shortcutIcon) {
    favicon = shortcutIcon;
  } else if (fav) {
    favicon = fav;
  }

  // --------------------------------------------------------------------------------------

  const name: any = document
    .querySelector('meta[property="og:site_name"]')
    ?.getAttribute('content');
  if (name) {
    siteName = name;
  }

  return {
    title,
    description,
    domain,
    img,
    favicon,
    siteName,
  };
};
