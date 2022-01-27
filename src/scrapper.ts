// const puppeteer = require('puppeteer-extra');
// const pluginStealth = require('puppeteer-extra-plugin-stealth');
const util = require('util');
const request = util.promisify(require('request'));

const urlImageIsAccessible = async (url: string) => {
  try {
    const urlResponse = await request(url);
    const contentType = urlResponse.headers['content-type'];
    console.log('contentType', contentType);
    return new RegExp('image/*').test(contentType);
  } catch {
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

    const isImageThere = await urlImageIsAccessible(img);
    console.log('Found Image', img);
    if (isImageThere) return img;
    else return '';
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

const scrapper = async (url: string, browser: any) => {
  try {
    const page = await browser.newPage();

    const puppeteerAgent =
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
    page.setUserAgent(puppeteerAgent);

    await page.goto(url);
    console.debug('Page is opened');

    await page.exposeFunction('request', request);
    await page.exposeFunction('urlImageIsAccessible', urlImageIsAccessible);

    console.group();
    const title = await getTitle(page);
    console.log('title', title);

    const description = await getDescription(page);
    console.log('description', description);

    const domain = await getDomainName(page, url);
    console.log('domain', domain);

    const img = await getImg(page, url);
    console.log('img', img);

    const favicon = await getFavicon(page);
    console.log('favicon', favicon);

    const siteName = await getSiteName(page);
    console.log('siteName', siteName);
    console.groupEnd();

    const obj = {
      title,
      description,
      domain,
      img,
      favicon,
      siteName,
    };

    await browser.close();
    return obj;
  } catch (error) {
    console.log('err', error);
    throw error;
  }
};

export default scrapper;
