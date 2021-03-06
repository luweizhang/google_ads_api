"use strict";

const request = require('request');
const fs      = require('fs');
const path    = require('path');
const cheerio = require('cheerio');

//proxy
const http    = require('http');
const proxy   = require('proxy');

var proxy_list = [
'198.98.111.3',
'198.98.111.12',
'198.98.111.18',
'198.98.111.137',
'198.98.111.139',
'198.98.111.193',
'198.98.111.201',
'198.98.111.210',
'198.98.111.218',
'198.98.111.224',
'198.98.111.229',
'192.80.134.116',
'192.80.134.119',
'192.80.134.122',
'192.80.134.127',
'192.80.134.133',
'192.80.134.139',
'192.80.134.142',
'192.80.134.147',
'192.80.134.151',
'192.80.134.156',
'192.80.134.163',
'192.80.134.166',
'192.80.134.170',
'192.80.134.175',
'192.80.134.191',
'192.80.134.239',
'192.80.134.242',
'192.80.134.245',
'192.80.134.247',
'23.89.173.2',
'23.89.173.9',
'23.89.173.15',
'23.89.173.48',
'23.89.173.54',
'23.89.173.62',
'23.89.173.66',
'23.89.173.70',
'23.89.173.75',
'23.89.173.82',
'23.89.173.93',
'23.89.173.98',
'23.89.173.112',
'23.89.173.122',
'23.89.173.132',
'23.89.173.147',
'23.89.173.158',
'23.89.173.197',
'23.89.173.219',
'23.89.173.248'
];

//const host = '198.98.111.3'
var user = 'huan'
var pass = '50USa19' 
var port = '8080'

function createProxiedRequest(host, user, pass, port) {
  var proxyUrl = "http://" + user + ":" + pass + "@" + host + ":" + port;
  var proxiedRequest = request.defaults({'proxy': proxyUrl});

  return proxiedRequest
}

if (process.argv.length < 3) {
  throw new Error('No input title file specified. Usage: node index.js <titlefilepath>')
}

const titleFilePath = path.resolve('.', process.argv[2]);
const qps = process.argv[3] || 1;

const titles = fs.readFileSync(titleFilePath, 'utf8')
  .split(/\r|\n|\r\n/)
  .filter(title => title.trim().length > 0);

const numRequests = titles.length;
let completedRequests = 0;

//output path for base job data
const outputFilePath = path.join(process.cwd(), 'google_jobs_results.tsv');
const outputFileStream = fs.createWriteStream(outputFilePath);
outputFileStream.write('Query\tTitle\tCompany\tLocation\tProvider\tRecency\tJobType\tRank\tCurrentDate\n');

//output path for job descriptions and job link
const outputFilePath2 = path.join(process.cwd(), 'google_jobs_descriptions.tsv');
const outputFileStream2 = fs.createWriteStream(outputFilePath2);
outputFileStream.write('Query\tTitle\tCompany\tJobDescription\tLink\n');

/**
 *
 * @param {CheerioStatic} $ - Cheerio object
 */
function processResponse($, query, proxiedRequest) {
  return $('li._yQk').map((i, el) => {
    const $el = $(el);
    const title = $el.find('._grr').text();

    const $textFields = $el.find('._Ebt');
    const company = $textFields.eq(0).text();
    const location = $textFields.eq(1).text();
    const provider = $textFields.eq(2).text().replace('via', '').trim();

    const $metaFields = $el.find('._TJq:not(._AMk)');
    let recency = $metaFields.eq(0).text();
    let jobType = $metaFields.eq(1).text();
    if ($metaFields.length === 2) {
      if (recency.indexOf('ago') !== -1) {
        jobType = undefined;
      } else {
        recency = undefined;
      }
    };

    const rank = i + 1;
    const today = new Date();
    const current_date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    
    //get deep links for additional job descriptions
    const $jobId = $el.find('._PEs');
    const jobId = $jobId.eq(0).children().attr('id');

    //get the job description
    const $jobDescription_1 = $el.find('._zMk');
    const jobDescription_1 = $jobDescription_1.eq(0).text();

    const $jobDescription_2 = $el.find('._t1q');
    const jobDescription_2 = $jobDescription_2.eq(0).text();

    const jobDescription = (jobDescription_1 + jobDescription_2).replace('\t','');
    console.log(jobDescription);

    //get the link


    const tsvColumns = [
      query,
      title,
      company,
      location,
      provider,
      recency,
      jobType,
      rank,
      current_date
    ];
    //after retriving the jobId, now you can deeplink into the specific job in order to get the job description
    //getJobDescription(query, title, company, rank, jobId, proxiedRequest);

    return tsvColumns.join('\t');
  }).get().join('\n');
};

/**
After processResponse() and getting the jobid, we want to execute another request to get the job description
**/

/*
function getJobDescription(query, title, company, jobId, rank, proxiedRequest) {

  let jobId2 = encodeURIComponent(jobId.slice(3,jobId.length));
  const url = `https://www.google.com/search?q=${title.replace(' ', '+')}&oq=google+jobs&ie=UTF-8&ibp=htl;jobs#fpstate=tldetail&htidocid=${jobId}&htivrt=jobs`;

  proxiedRequest.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.104 Safari/537.36'
    }
  }, (err, res, body) => {
    console.log(`${url}`)
    if (res == undefined || res.statusCode === 503) {
      console.log(`Google blocked request for query: ${title} and jobId: $(jobId)`);
      return;
    }

    const $ = cheerio.load(body);
    const results = processResponse($, title, proxiedRequest);
    outputFileStream.write(results + '\n');

    if (completedRequests === numRequests) {
      outputFileStream.end();
    };
  });
};
*/


function makeRequest(title, proxiedRequest) {
  const url = `https://www.google.com/search?q=${title.replace(' ', '+')}&ibp=htl;jobs`;

  proxiedRequest.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.104 Safari/537.36'
    }
  }, (err, res, body) => {
    console.log(`${url}`)
    console.log(`Finished: ${++completedRequests}`);
    if (res == undefined || res.statusCode === 503) {
      console.log(`Google blocked request for query: ${title}`);
      return;
    }

    const $ = cheerio.load(body);
    const results = processResponse($, title, proxiedRequest);
    outputFileStream.write(results + '\n');

    if (completedRequests === numRequests) {
      outputFileStream.end();
    }

  });
}

//get current ip address thats being executed
function getCurrentIp(proxiedRequest) {
  let url = "http://ipinfo.io";
  
  proxiedRequest.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.104 Safari/537.36'
    }
  }, (err, res, body) => {
    if (res == undefined || res.statusCode === 503) {
      console.log(`Ip check failed`);
      return;
    }
    const $ = cheerio.load(body);
    //console.log($('#heading').text());
  });
};

let time = 0;
console.log(`Total Queries: ${numRequests}`);

let start = 0;
let end = titles.length;

titles.forEach((title, i) => {
  if (i >= start && i < end) {
    if (i % qps === 0) {
      time += 1000;
    }
    // cycle through proxies incrementally
    //let host_index = parseInt(i) % proxy_list.length;
    // cycle through proxies randomly
    let host_index = Math.floor(proxy_list.length*Math.random());
    // cycle through proxies 
    let host = proxy_list[host_index];
    //console.log("lists of hosts: " + host);
    let proxiedRequest = createProxiedRequest(host, user, pass, port);
    //use the function below if you want to 
    //getCurrentIp(proxiedRequest);
    setTimeout(() => makeRequest(title, proxiedRequest), time);
  };
});








