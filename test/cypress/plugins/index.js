const { default: axios } = require('axios');
const ctx = require('../../../quasar.config');

const parseEnv = env => Object.keys(env).reduce((acc, key) => {
  if (env[key]) acc[key] = env[key];
  return acc;
}, {});

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

  const { env } = ctx().build;
  config.env = { ...parseEnv(env) };

  return config;
};
