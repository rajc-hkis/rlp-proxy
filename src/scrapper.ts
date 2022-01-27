const puppeteer = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth');
const util = require('util');
const request = util.promisify(require('request'));

const getImg = async (page: any, uri: string) => {
  const img = await page.evaluate(() => {
    const ogImg: any = document.querySelector('meta[property="og:image"]');
    if (ogImg != null && ogImg.content.length > 0) {
      return ogImg.content;
    }
    const imgRelLink: any = document.querySelector('link[rel="image_src"]');
    if (imgRelLink != null && imgRelLink.href.length > 0) {
      return imgRelLink.href;
    }
    const twitterImg: any = document.querySelector(
      'meta[name="twitter:image"]'
    );
    if (twitterImg != null && twitterImg.content.length > 0) {
      return twitterImg.content;
    }

    let imgs = Array.from(document.getElementsByTagName('img'));
    if (imgs.length > 0) {
      imgs = imgs.filter((img) => {
        let addImg = true;
        if (img.naturalWidth > img.naturalHeight) {
          if (img.naturalWidth / img.naturalHeight > 3) {
            addImg = false;
          }
        } else {
          if (img.naturalHeight / img.naturalWidth > 3) {
            addImg = false;
          }
        }
        if (img.naturalHeight <= 50 || img.naturalWidth <= 50) {
          addImg = false;
        }
        return addImg;
      });
      if (imgs.length > 0) {
        imgs.forEach((img) =>
          img.src.indexOf('//') === -1
            ? (img.src = `${new URL(uri).origin}/${img.src}`)
            : img.src
        );
        return imgs[0].src;
      }
    }
    return null;
  });
  return img;
};

const getTitle = async (page: any) => {
  const title = await page.evaluate(() => {
    const ogTitle: any = document.querySelector('meta[property="og:title"]');
    if (ogTitle != null && ogTitle.content.length > 0) {
      return ogTitle.content;
    }
    const twitterTitle: any = document.querySelector(
      'meta[name="twitter:title"]'
    );
    if (twitterTitle != null && twitterTitle.content.length > 0) {
      return twitterTitle.content;
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
};

const getDescription = async (page: any) => {
  const description = await page.evaluate(() => {
    const ogDescription: any = document.querySelector(
      'meta[property="og:description"]'
    );
    if (ogDescription != null && ogDescription.content.length > 0) {
      return ogDescription.content;
    }
    const twitterDescription: any = document.querySelector(
      'meta[name="twitter:description"]'
    );
    if (twitterDescription != null && twitterDescription.content.length > 0) {
      return twitterDescription.content;
    }
    const metaDescription: any = document.querySelector(
      'meta[name="description"]'
    );
    if (metaDescription != null && metaDescription.content.length > 0) {
      return metaDescription.content;
    }
    let paragraphs = document.querySelectorAll('p');
    let fstVisibleParagraph = null;
    for (let i = 0; i < paragraphs.length; i++) {
      if (
        // if object is visible in dom
        paragraphs[i].offsetParent !== null &&
        !(paragraphs[i].childElementCount != 0)
      ) {
        fstVisibleParagraph = paragraphs[i].textContent;
        break;
      }
    }
    return fstVisibleParagraph;
  });
  return description;
};

const getDomainName = async (page: any, uri: string) => {
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
};

const scrapper = async (url: string) => {
  try {
    puppeteer.use(pluginStealth());
    const browser = await puppeteer.launch({
      headless: true,
      args: [],
    });
    console.debug('Puppeteer is created');

    const page = await browser.newPage();
    console.debug('Page is created');

    const puppeteerAgent =
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
    page.setUserAgent(puppeteerAgent);

    await page.goto(url);
    console.debug('Page is opened');

    await page.exposeFunction('request', request);
    //   await page.exposeFunction('urlImageIsAccessible', urlImageIsAccessible);

    const title = await getTitle(page);
    console.log('title', title);
    const description = await getDescription(page);
    console.log('description', description);
    const domain = await getDomainName(page, url);
    console.log('domain', domain);
    const img = await getImg(page, url);
    console.log('img', img);

    const obj = {
      title,
      description,
      domain,
      img,
    };

    await browser.close();
    return obj;
  } catch (error) {
    console.log('err', error);
    throw error;
  }
};

export default scrapper;
