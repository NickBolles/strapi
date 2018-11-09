module.exports = {
  forEachPlugin: forEachPlugin
};

/**
 * Utility to do something for each plugin
 * this will return an array
 * @param {*} cb
 */
function forEachPlugin(cb) {
  return Object.keys(strapi.plugins).map(v => cb(strapi.plugins[v], v));
}
