require('dotenv').config();
const path = require('path');
const webpack = require('webpack');
const { configure } = require('quasar/wrappers');

module.exports = configure(ctx => ({
  css: ['app.sass', 'colors.sass'],
  extras: ['material-icons', 'mdi-v3', 'ionicons-v4', 'fontawesome-v5'],
  framework: {
    all: false,
    lang: 'fr',
    components: [
      'QAjaxBar',
      'QBanner',
      'QBtn',
      'QBtnToggle',
      'QCard',
      'QCardActions',
      'QCardSection',
      'QCheckbox',
      'QChip',
      'QCircularProgress',
      'QDate',
      'QDialog',
      'QDrawer',
      'QExpansionItem',
      'QField',
      'QHeader',
      'QIcon',
      'QInfiniteScroll',
      'QInnerLoading',
      'QInput',
      'QItem',
      'QItemLabel',
      'QItemSection',
      'QLayout',
      'QLinearProgress',
      'QList',
      'QMenu',
      'QOptionGroup',
      'QPage',
      'QPageContainer',
      'QPageSticky',
      'QPopupProxy',
      'QScrollArea',
      'QSelect',
      'QSeparator',
      'QSlideTransition',
      'QSpinner',
      'QSpinnerDots',
      'QSpinnerFacebook',
      'QStepper',
      'QStep',
      'QTabs',
      'QTab',
      'QTabPanels',
      'QTabPanel',
      'QTable',
      'QTab',
      'QTabPanel',
      'QTabPanels',
      'QTabs',
      'QTd',
      'QTh',
      'QTime',
      'QTr',
      'QToggle',
      'QUploader',
    ],
    directives: ['Ripple', 'ClosePopup'],
    plugins: ['Notify', 'Cookies', 'Loading', 'Dialog', 'LocalStorage', 'Meta'],
  },
  animations: ['fadeIn', 'fadeOut'],
  supportIE: true,
  build: {
    scopeHoisting: true,
    vueRouterMode: 'history',
    publicPath: '/',
    gzip: true,
    useNotifier: false,
    preloadChunks: true,
    chainWebpack (chain) {
      const nodePolyfillWebpackPlugin = require('node-polyfill-webpack-plugin');
      chain.plugin('node-polyfill')
        .use(nodePolyfillWebpackPlugin)
        .use(webpack.ProvidePlugin, [{ Buffer: ['buffer', 'Buffer'] }]);
    },
    extendWebpack (cfg) {
      cfg.module.rules.push({ test: /\.html$/, use: { loader: 'html-loader' } });
      // eslint-disable-next-line no-param-reassign
      cfg.resolve.alias = {
        ...cfg.resolve.alias,
        '@components': path.resolve(__dirname, './src/core/components'),
        '@api': path.resolve(__dirname, './src/core/api'),
        '@helpers': path.resolve(__dirname, './src/core/helpers'),
        '@data': path.resolve(__dirname, './src/core/data'),
        '@mixins': path.resolve(__dirname, './src/core/mixins'),
        '@composables': path.resolve(__dirname, './src/core/composables'),
      };
      cfg.plugins.push(
        // Select moment locale files
        new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, /fr/),
        new webpack.IgnorePlugin({
          checkResource (resource, context) {
            // ---- do not bundle astronomia vsop planet data
            if (/\/astronomia\/data$/.test(context)) return !['./deltat.js', './vsop87Bearth.js'].includes(resource);

            return false;
          },
        })
      );
    },
    env: {
      NODE_ENV: process.env.NODE_ENV,
      API_HOSTNAME: process.env.NODE_ENV === 'test' ? process.env.TEST_API_HOSTNAME : process.env.API_HOSTNAME,
      COMPANI_HOSTNAME: process.env.COMPANI_HOSTNAME,
      MESSENGER_LINK: process.env.MESSENGER_LINK,
      ENTERCODE_LINK: process.env.ENTERCODE_LINK,
      TOKEN_SECRET: process.env.TOKEN_SECRET,
      ALENVI_BOT_ID: process.env.ALENVI_BOT_ID,
      GA_TRACKING_ID: process.env.GA_TRACKING_ID,
      BULB_LINK: process.env.BULB_LINK,
      DETACHMENT_ALLOWED_COMPANY_IDS: process.env.DETACHMENT_ALLOWED_COMPANY_IDS,
    },
  },
  devServer: { open: true },
  ...(ctx && ctx.dev && { boot: ['localEntry'] }),
}));
