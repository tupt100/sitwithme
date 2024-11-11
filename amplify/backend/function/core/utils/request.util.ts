import * as https from 'https';

/**
 * Do a request with options provided.
 *
 * @param {Object} data
 * @param {Object} options
 * @return {Promise} a promise of request
 */
export const request = (data: string, options: any): Promise<any> => {
  options.port = 443;
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      res.setEncoding('utf8');
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        resolve(JSON.parse(responseBody));
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(data);
    req.end();
  });
};
