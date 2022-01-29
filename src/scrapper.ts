const puppeteer = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth');
const util = require('util');
const request = util.promisify(require('request'));

const urlImageIsAccessible = async (url: string) => {
  try {
    const urlResponse = await request({
      rejectUnauthorized: false,
      url,
      method: 'GET',
    });
    const contentType = urlResponse.headers['content-type'];
    console.log('contentType', contentType);
    return new RegExp('image/*').test(contentType);
  } catch (error) {
    console.log('urlResponse', error);
    return false;
  }
};

const getImg = async (page: any, uri: string) => {
  try {
    const img = await page.evaluate(() => {
      const ogSecureImg: any = document.querySelector(
        'meta[property="og:image:secure_url"]'
      );
      if (ogSecureImg != null && ogSecureImg.content.length > 0) {
        if (
          /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi.test(
            ogSecureImg.content
          )
        )
          return ogSecureImg.content;
      }

      const ogImg: any = document.querySelector('meta[property="og:image"]');
      if (ogImg != null && ogImg.content.length > 0) {
        if (
          /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi.test(
            ogImg.content
          )
        )
          return ogImg.content;
      }

      let imgs = Array.from(document.getElementsByTagName('img'));
      if (imgs.length > 0) {
        imgs.forEach((img) =>
          img.src.indexOf('//') === -1
            ? (img.src = `${new URL(uri).origin}/${img.src}`)
            : img.src
        );
        if (
          /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi.test(
            imgs[0].src
          )
        )
          return imgs[0].src;
      }
      return null;
    });

    // const isImageThere = await urlImageIsAccessible(img);
    // console.log('Found Image', img);
    // if (isImageThere) return img;
    // else return '';
    return img;
  } catch {
    return '';
  }
};

const getTitle = async (page: any) => {
  try {
    const title = await page.evaluate(() => {
      const ogTitle: any = document.querySelector('meta[property="og:title"]');
      if (ogTitle != null && ogTitle.content.length > 0) {
        return ogTitle.content;
      }
      const docTitle = document.title;
      if (docTitle != null && docTitle.length > 0) {
        return docTitle;
      }
      const h1 = document.querySelector('h1')?.innerHTML;
      if (h1 != null && h1.length > 0) {
        return h1;
      }
      const h2 = document.querySelector('h2')?.innerHTML;
      if (h2 != null && h2.length > 0) {
        return h2;
      }
      return null;
    });
    return title;
  } catch {
    return '';
  }
};

const getDescription = async (page: any) => {
  try {
    const description = await page.evaluate(() => {
      const ogDescription: any = document.querySelector(
        'meta[property="og:description"]'
      );
      if (ogDescription != null && ogDescription.content.length > 0) {
        return ogDescription.content;
      }
      const metaDescription: any = document.querySelector(
        'meta[name="description"]'
      );
      if (metaDescription != null && metaDescription.content.length > 0) {
        return metaDescription.content;
      }
    });
    return description;
  } catch {
    return '';
  }
};

const getDomainName = async (page: any, uri: string) => {
  try {
    const domainName = await page.evaluate(() => {
      const canonicalLink: any = document.querySelector('link[rel=canonical]');
      if (canonicalLink != null && canonicalLink.href.length > 0) {
        return canonicalLink.href;
      }
      const ogUrlMeta: any = document.querySelector('meta[property="og:url"]');
      if (ogUrlMeta != null && ogUrlMeta.content.length > 0) {
        return ogUrlMeta.content;
      }
      return null;
    });
    return domainName != null
      ? new URL(domainName).hostname.replace('www.', '')
      : new URL(uri).hostname.replace('www.', '');
  } catch {
    return '';
  }
};

const getFavicon = async (page: any) => {
  try {
    const favicon = await page.evaluate(() => {
      const shortcutIcon: any = document.querySelector(
        'link[rel="shortcut icon"]'
      );

      if (shortcutIcon) {
        return shortcutIcon.href;
      }

      const favicon: any = document.querySelector('link[rel="icon"]');

      if (favicon) {
        return favicon.href;
      }
    });
    return favicon;
  } catch {
    return '';
  }
};

const getSiteName = async (page: any) => {
  try {
    const siteName = await page.evaluate(() => {
      const name: any = document.querySelector('meta[property="og:site_name"]');
      if (name?.content) {
        return name?.content;
      }
      return '';
    });

    return siteName;
  } catch {
    return '';
  }
};

const scrapAllData = async (page: any, uri: string) => {
  const data = await page.evaluate(() => {
    let title, description, domain, img, favicon, siteName;

    // --------------------------------------------------------------------------------------

    const ogTitle: any = document.querySelector('meta[property="og:title"]');
    const docTitle = document.title;
    const h1 = document.querySelector('h1')?.innerHTML;
    const h2 = document.querySelector('h2')?.innerHTML;

    if (ogTitle != null && ogTitle.content.length > 0) {
      title = ogTitle.content;
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

    const canonicalLink: any = document.querySelector('link[rel=canonical]');
    const ogUrlMeta: any = document.querySelector('meta[property="og:url"]');

    if (canonicalLink != null && canonicalLink.href.length > 0) {
      domain = canonicalLink.href;
    } else if (ogUrlMeta != null && ogUrlMeta.content.length > 0) {
      domain = ogUrlMeta.content;
    } else {
      domain = null;
    }
    domain =
      domain != null
        ? new URL(domain).hostname.replace('www.', '')
        : new URL(uri).hostname.replace('www.', '');

    // --------------------------------------------------------------------------------------

    const ogDescription: any = document.querySelector(
      'meta[property="og:description"]'
    );
    const metaDescription: any = document.querySelector(
      'meta[name="description"]'
    );

    if (ogDescription != null && ogDescription.content.length > 0) {
      description = ogDescription.content;
    } else if (metaDescription != null && metaDescription.content.length > 0) {
      description = metaDescription.content;
    }

    // --------------------------------------------------------------------------------------

    const ogSecureImg: any = document.querySelector(
      'meta[property="og:image:secure_url"]'
    );
    const ogImg: any = document.querySelector('meta[property="og:image"]');
    let imgs = Array.from(document.getElementsByTagName('img'));

    if (ogSecureImg != null && ogSecureImg.content.length > 0) {
      if (
        /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi.test(
          ogSecureImg.content
        )
      )
        img = ogSecureImg.content;
    } else if (ogImg != null && ogImg.content.length > 0) {
      if (
        /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi.test(
          ogImg.content
        )
      )
        img = ogImg.content;
    } else if (imgs.length > 0) {
      imgs.forEach((img) =>
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

    const shortcutIcon: any = document.querySelector(
      'link[rel="shortcut icon"]'
    );
    const fav: any = document.querySelector('link[rel="icon"]');

    if (shortcutIcon) {
      favicon = shortcutIcon.href;
    } else if (fav) {
      favicon = fav.href;
    }

    // --------------------------------------------------------------------------------------

    const name: any = document.querySelector('meta[property="og:site_name"]');
    if (name?.content) {
      siteName = name?.content;
    }

    return {
      title,
      description,
      domain,
      img,
      favicon,
      siteName,
    };
  });

  return data;
};

const scrapper = async (url: string, page: any) => {
  try {
    // puppeteer.use(pluginStealth());
    // const browser = await puppeteer.launch({
    //   headless: true,
    //   args: ['--no-sandbox', '--disable-setuid-sandbox'],
    // });
    // console.debug('Puppeteer is created');

    // const page = await browser.newPage();
    // console.debug('Page is created');

    // const puppeteerAgent =
    //   'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
    // page.setUserAgent(puppeteerAgent);

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    console.debug('Page is opened');

    await page.exposeFunction('request', request);
    await page.exposeFunction('urlImageIsAccessible', urlImageIsAccessible);

    await page.setRequestInterception(true);

    page.on('request', (req: any) => {
      console.log('req.resourceType()', req.resourceType());
      if (req.resourceType() === 'image' || req.resourceType() === 'font') {
        req.abort();
      } else {
        req.continue();
      }
    });

    // console.group();
    // const title = await getTitle(page);
    // console.log('title', title);

    // const description = await getDescription(page);
    // console.log('description', description);

    // const domain = await getDomainName(page, url);
    // console.log('domain', domain);

    // const img = await getImg(page, url);
    // console.log('img', img);

    // const favicon = await getFavicon(page);
    // console.log('favicon', favicon);

    // const siteName = await getSiteName(page);
    // console.log('siteName', siteName);
    // console.groupEnd();

    const finalData = await scrapAllData(page, url);
    // console.log('finalData', finalData);

    // const obj = {
    //   title,
    //   description,
    //   domain,
    //   img,
    //   favicon,
    //   siteName,
    // };

    await page.close();
    // return obj;
    // cache.set(url, JSON.stringify(finalData));
    return finalData;
  } catch (error) {
    console.log('err', error);
    throw error;
  }
};

export default scrapper;
