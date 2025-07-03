const { default: axios } = require('axios');
// eslint-disable-next-line import/extensions
const { env, parseEnv } = require('../../../env.mjs');

module.exports = (on, config) => {
  on('before:browser:launch', (browser, launchOptions) => {
    if (browser.name === 'chrome') {
      launchOptions.args.push('--disable-blink-features=RootLayerScrolling');
      return launchOptions;
    }
    return true;
  });

  on('task', {
    log (message) {
      // eslint-disable-next-line no-console
      console.warn(message);
      return null;
    },
    async seedDb (seedType) {
      await axios.get(`${process.env.API_HOSTNAME}/end-to-end/seed/${seedType}`);
      return null;
    },
    async login (credentials) {
      const auth = await axios.post(
        `${process.env.API_HOSTNAME}/users/authenticate`,
        credentials,
        { withCredentials: true }
      );
      return auth.data.data;
    },
  });

  config.env = { ...parseEnv(env) };

  return config;
};
