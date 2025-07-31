import { defineConfig } from 'cypress';
import axios from 'axios';
// eslint-disable-next-line import/extensions
import { env, parseEnv } from './env.mjs';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:8080/',
    fixturesFolder: false,
    specPattern: 'test/cypress/integration',
    screenshotsFolder: 'test/cypress/screenshots',
    supportFile: 'test/cypress/support/index.js',
    videosFolder: 'test/cypress/videos',
    video: true,
    setupNodeEvents(on, config) {
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
    },
  },
});
