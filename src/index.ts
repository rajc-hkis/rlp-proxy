require('dotenv').config();
import axios from 'axios';
import express, { Response } from 'express';
import { getMetadata } from './lib';
import { checkForCache, createCache } from './lib/cache';
import { APIOutput } from './types';
import scrapper from './scrapper';
import { scrapAllData } from './lib/helper';
import { parse } from 'node-html-parser';

const puppeteer = require('puppeteer-extra');
const pluginStealth = require('puppeteer-extra-plugin-stealth');

const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 7 * 60 * 60 * 24 });

const app = express();

const port = Number(process.env.PORT || 8080);

// if (process.env.REDISTOGO_URL) {
//   var rtg = require('url').parse(process.env.REDISTOGO_URL);
//   var redis = require('redis').createClient(rtg.port, rtg.hostname);

//   redis.auth(rtg.auth.split(':')[1]);
// } else {
// var redis = require('redis').createClient();
// }

// const limiter = require('express-limiter')(app);

// limiter({
//   path: '/v2',
//   method: 'get',
//   lookup: ['connection.remoteAddress'],
//   // 300 requests per minute
//   total: 300,
//   expire: 1000 * 60,
// });

const sendResponse = (
  res: Response,
  output: APIOutput | null,
  url?: string,
  fromCache?: boolean
) => {
  if (!output) {
    return res
      .set('Access-Control-Allow-Origin', '*')
      .status(404)
      .json({ metadata: null });
  }

  if (fromCache !== true) {
    cache.set(url, JSON.stringify(output));
  }
  return res
    .set('Access-Control-Allow-Origin', '*')
    .status(200)
    .json({ metadata: output });
};

let browser: any = undefined;

app.listen(port, async () => {
  console.log(`Server started on port ${port}`);
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  console.debug('Puppeteer is created');
});

app.use(express.static('public'));

app.get('/', async (req, res) => {
  const url = req.query.url as unknown as string;
  const metadata = await getMetadata(url);
  return res
    .set('Access-Control-Allow-Origin', '*')
    .status(200)
    .json({ metadata });
});

app.get('/v2', async (req, res) => {
  try {
    let url = req.query.url as unknown as string;

    if (!url) {
      return res
        .set('Access-Control-Allow-Origin', '*')
        .status(400)
        .json({ error: 'Invalid URL' });
    }

    url = url.indexOf('://') === -1 ? 'http://' + url : url;

    const isUrlValid =
      /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi.test(
        url
      );

    if (!url || !isUrlValid) {
      return res
        .set('Access-Control-Allow-Origin', '*')
        .status(400)
        .json({ error: 'Invalid URL' });
    }

    if (url && isUrlValid) {
      const { hostname } = new URL(url);

      let output: APIOutput;

      // optional - you'll need a supabase key if you want caching. highly recommended.
      //   const cached = await checkForCache(url);

      //   if (cached) {
      //     return res
      //       .set('Access-Control-Allow-Origin', '*')
      //       .status(200)
      //       .json({ metadata: cached });
      //   }

      const metadata = await getMetadata(url);
      console.log('metadata', metadata);
      if (!metadata) {
        return sendResponse(res, null);
      }
      const { images, og, meta } = metadata!;

      let image = og.image
        ? og.image
        : images.length > 0
        ? images[0].src
        : null;
      const description = og.description
        ? og.description
        : meta.description
        ? meta.description
        : null;
      const title = (og.title ? og.title : meta.title) || '';
      const siteName = og.site_name || '';

      output = {
        title,
        description,
        image,
        siteName,
        hostname,
      };

      sendResponse(res, output, url);

      //   if (output) {
      //     await createCache({
      //       url,
      //       title: output.title,
      //       description: output.description,
      //       image: output.image,
      //       siteName: output.siteName,
      //       hostname: output.hostname,
      //     });
      //   }
    }
  } catch (error) {
    console.log(error);
    return res.set('Access-Control-Allow-Origin', '*').status(500).json({
      error: 'Internal server error.',
    });
  }
});

let page: any = undefined;
app.get('/v3', async (req, res) => {
  // puppeteer.use(pluginStealth());

  try {
    let url = req.query.url as unknown as string;

    const dataFromCache = cache.get(url);

    if (typeof dataFromCache !== 'undefined') {
      const response = JSON.parse(dataFromCache);
      sendResponse(res, response, url, true);
      return;
    }

    try {
      const { data } = await axios(url);
      if (!data) {
        throw new Error('Failed to do fetch request');
      }

      const document: any = parse(data);
      const response: any = scrapAllData(document, url);
      console.log('response', response);
      if (
        response?.title &&
        response?.description &&
        response?.domain &&
        response?.img &&
        response?.favicon &&
        response?.siteName
      ) {
        sendResponse(res, response, url);
        return;
      }
    } catch (err) {
      console.log('error', err);
    }

    page = await browser.newPage();
    const puppeteerAgent =
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
    page.setUserAgent(puppeteerAgent);
    console.debug('Page is created');

    if (!url) {
      return res
        .set('Access-Control-Allow-Origin', '*')
        .status(400)
        .json({ error: 'Invalid URL' });
    }

    url = url.indexOf('://') === -1 ? 'http://' + url : url;

    const isUrlValid =
      /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/gi.test(
        url
      );

    if (!url || !isUrlValid) {
      return res
        .set('Access-Control-Allow-Origin', '*')
        .status(400)
        .json({ error: 'Invalid URL' });
    }

    if (url && isUrlValid) {
      const response: any = await scrapper(url, page);

      console.debug('response', response);
      sendResponse(res, response, url);
    }
  } catch (error) {
    console.log('Got error', error);
    return res.set('Access-Control-Allow-Origin', '*').status(500).json({
      error: 'Internal server error.',
    });
  }
});
