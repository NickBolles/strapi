'use strict';

/**
 * AttributePermission.js controller
 *
 * @description: A set of functions called "actions" for managing `AttributePermission`.
 */

module.exports = {
  /**
   * Retrieve attributePermission records.
   *
   * @return {Object|Array}
   */

  find: async ctx => {
    if (ctx.query._q) {
      return strapi.services.attributePermission.search(ctx.query);
    } else {
      return strapi.services.attributePermission.fetchAll(ctx.query);
    }
  },

  /**
   * Retrieve a attributePermission record.
   *
   * @return {Object}
   */

  findOne: async ctx => {
    if (!ctx.params._id.match(/^[0-9a-fA-F]{24}$/)) {
      return ctx.notFound();
    }

    return strapi.services.attributePermission.fetch(ctx.params);
  },

  /**
   * Count attributePermission records.
   *
   * @return {Number}
   */

  count: async ctx => {
    return strapi.services.attributePermission.count(ctx.query);
  },

  /**
   * Create a/an attributePermission record.
   *
   * @return {Object}
   */

  create: async ctx => {
    return strapi.services.attributePermission.add(ctx.request.body);
  },

  /**
   * Update a/an attributePermission record.
   *
   * @return {Object}
   */

  update: async (ctx, next) => {
    return strapi.services.attributePermission.edit(
      ctx.params,
      ctx.request.body
    );
  },

  /**
   * Destroy a/an attributePermission record.
   *
   * @return {Object}
   */

  destroy: async (ctx, next) => {
    return strapi.services.attributePermission.remove(ctx.params);
  }
};
