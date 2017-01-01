'use strict';
/**
 * Background task runner.
 */
class BackgroundGroup {
  constructor() {
    this.jobs = new Set();
  }

  has(name) {
    return this.jobs.has(name);
  }

  run(name, promise) {
    if (this.jobs.has(name))
      throw new Error('Job with name ' + name + ' already exists.');
    const jobs = this.jobs;
    promise.then(function() {
      jobs.delete(name);
    }, function(e) {
      console.error(e.stack);
      jobs.delete(name);
    });
    this.jobs.add(name);
  }
};

module.exports = function() {
  return new BackgroundGroup();
};
