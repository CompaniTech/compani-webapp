import path from 'node:path';
import NodePolyfillPlugin from 'node-polyfill-webpack-plugin';
import webpack from 'webpack';
import { defineConfig } from '#q-app/wrappers';
// eslint-disable-next-line import/extensions
import { env } from './env.mjs';

export default defineConfig(ctx => ({
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
  indexHtmlTemplate: './index.html',
  build: {
    scopeHoisting: true,
    vueRouterMode: 'history',
    publicPath: '/',
    gzip: true,
    useNotifier: false,
    preloadChunks: true,
    chainWebpack (chain) {
      chain.plugin('node-polyfill')
        .use(new NodePolyfillPlugin())
        .use(webpack.ProvidePlugin, [{ Buffer: ['buffer', 'Buffer'] }]);
    },
    extendWebpack (cfg) {
      cfg.module.rules.push({ test: /\.html$/, use: { loader: 'html-loader' } });
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
    env,
  },
  devServer: { port: 8080, open: true },
  boot: [
    'store',
    ...(ctx?.dev ? ['localEntry'] : []),
  ],
}));
