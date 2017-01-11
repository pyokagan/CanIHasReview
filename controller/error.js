'use strict';
/**
 * Error handler
 */
const http = require('http');


function formatErrorPage(e) {
  const status = e.status || 500;
  const title = status + ' ' + http.STATUS_CODES[status];
  const out = [];
  out.push('<!DOCTYPE html>');
  out.push('<html>');
  out.push('<head>');
  out.push('<title>' + title + '</title>');
  out.push('</head>');
  out.push('<body>');
  out.push('<h1>' + title + '</h1>');
  if (e.message)
    out.push('<pre>' + e.message + '</pre>');
  out.push('</body>');
  out.push('</html>');
  return out.join('\n');
}


module.exports = (function() {
  return function* (next) {
    try {
      yield next;
      if (this.response.status === 404 && !this.response.body)
        this.throw(404);
    } catch (e) {
      console.error(e.stack);
      this.status = e.status || 500;
      this.body = formatErrorPage(e);
    }
  };
});
