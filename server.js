const path = require('path');
const express = require('express');
const history = require('connect-history-api-fallback');
const sslRedirect = require('heroku-ssl-redirect').default;

const app = express();

app.use(history());

app.use(sslRedirect(['development', 'production']));

app.use(express.static(path.join(__dirname, '/dist/spa')));

app.set('port', (process.env.PORT || 8080));

app.listen(app.get('port'), () => {
  // eslint-disable-next-line no-console
  console.log(`Server launched on ${process.env.PORT || 8080}`);
});
