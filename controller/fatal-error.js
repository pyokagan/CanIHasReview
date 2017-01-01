'use strict';
/**
 * Very fatal error handler.
 */


function formatErrorPage(e) {
  const out = [];
  out.push('<!DOCTYPE html>');
  out.push('<html>');
  out.push('<head>');
  out.push('<title>Fatal error</title>');
  out.push('</head>');
  out.push('<body>');
  out.push('<h1>Fatal error</h1>');
  out.push('<pre>' + e.message + '</pre>');
  out.push('</body>');
  out.push('</html>');
  return out.join('\n');
}


module.exports = (function() {
  return function* (next) {
    try {
      yield next;
    } catch (e) {
      console.error(e.stack);
      this.status = 500;
      this.body = formatErrorPage(e);
    }
  };
});
