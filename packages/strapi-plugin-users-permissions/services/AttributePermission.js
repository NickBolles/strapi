'use strict';

/**
 * AttributePermission.js service
 *
 * @description: A set of functions similar to controller's actions to avoid code duplication.
 */

/**
 * This is an initial implementation of field level permissions. There are a few critical parts missing.
 * 1. Updating and adding permissions when roles are added/changed
 * 2. They aren't editable in the UI
 * 3. several of these functions belong in a utils module (forEachModel, forEachPlugin)
 * 4. sync values between json and db
 * 5. Implement graphql directives for attribute permissions
 */

// Public dependencies.
const _ = require('lodash');

module.exports = {
  initialize: initialize,
  updatePermissions: updatePermissions,
  updateModelPermissions: updateModelPermissions,

  /**
   * Promise to fetch all attributePermission.
   *
   * @return {Promise}
   */

  fetchAll: params => {
    let model = strapi.plugins['users-permissions'].models.attributepermission;
    // Convert `params` object to filters compatible with Mongo.
    const filters = strapi.utils.models.convertParams(
      'attributePermission',
      params
    );
    // Select field to populate.
    const populate = model.associations
      .filter(ast => ast.autoPopulate !== false)
      .map(ast => ast.alias)
      .join(' ');

    return model
      .find()
      .where(filters.where)
      .sort(filters.sort)
      .skip(filters.start)
      .limit(filters.limit)
      .populate(populate);
  },

  /**
   * Promise to fetch a/an attributePermission.
   *
   * @return {Promise}
   */

  fetch: params => {
    let model = strapi.plugins['users-permissions'].models.attributepermission;
    // Select field to populate.
    const populate = model.associations
      .filter(ast => ast.autoPopulate !== false)
      .map(ast => ast.alias)
      .join(' ');

    return model
      .findOne(_.pick(params, _.keys(model.schema.paths)))
      .populate(populate);
  },

  /**
   * Promise to count attributePermission.
   *
   * @return {Promise}
   */

  count: params => {
    // Convert `params` object to filters compatible with Mongo.
    const filters = strapi.utils.models.convertParams(
      'attributePermission',
      params
    );

    return strapi.plugins['users-permissions'].models.attributepermission
      .count()
      .where(filters.where);
  },

  /**
   * Promise to add a/an attributePermission.
   *
   * @return {Promise}
   */

  add: add,

  /**
   * Promise to edit a/an attributePermission.
   *
   * @return {Promise}
   */

  edit: edit,

  /**
   * Promise to remove a/an attributePermission.
   *
   * @return {Promise}
   */

  remove: remove,

  /**
   * Promise to search a/an attributePermission.
   *
   * @return {Promise}
   */

  search: search
};

async function initialize(cb) {
  // Make sure that the userpermissions is initialized before we try to do anything with attribute permissions
  await strapi.plugins[
    'users-permissions'
  ].services.userspermissions.initialize(cb);
  // todo handle deleted models
  await updatePermissions(cb);
}

async function updatePermissions(cb) {
  // Retrieve roles
  const roles = await strapi.query('role', 'users-permissions').find();

  // for each role and each model update the permissions
  await Promise.all(
    roles.map(role =>
      Promise.all(strapi.utils.models.forEachModel(updateModelPermissions.bind(this, role)))
    )
  );

  // todo: write permisisons to file? UserPermissions.js -> UpdatePermissions
  cb();
}

async function updateModelPermissions(role, model, modelName, pluginName) {
  let enabledDefault = null;
  // build a list of attributes that should be present
  let toUpdate = Object.keys(model.attributes);
  // Get all of the current permissions for this model and role
  const commonAttrs = {
    role: role._id || role.id,
    type: pluginName || 'application',
    model: model.globalName
  };

  const currentPermissions = await strapi
    .query('attributepermission', 'users-permissions')
    .find({
      where: commonAttrs
    });

  let $updates = currentPermissions.map(permission => {
    if (permission.scope === 'model') {
      enabledDefault = permission.enabled;
      return;
    }
    return checkExistingPermission(model, toUpdate, permission, modelName);
  });

  $updates.push(
    addNeededPermissions(
      model,
      commonAttrs,
      toUpdate,
      enabledDefault,
      modelName
    )
  );

  return Promise.all($updates);
}

async function checkExistingPermission(model, toUpdate, permission, modelName) {
  let { attribute, enabled } = permission;
  let updateIdx = toUpdate.indexOf(attribute);
  // If the attribute isn't in the updateIdx, or for some reason is,
  // but isn't a valid attribute, remove the permission
  if (updateIdx === -1 || !model.attributes[attribute]) {
    // todo: remove debug stateme
    console.debug(`Removing permissions for ${modelName}.${attribute}`);
    return await strapi
      .query('attributepermission', 'users-permissions')
      .delete(permission);
  }
  toUpdate.splice(updateIdx, 1);

  let toBeEnabled = !strapi.utils.models.isAttributePrivate(model, attribute);
  // make sure attributes set as private in JSON are not enabled
  if (toBeEnabled !== enabled) {
    console.debug(`Updating permissions for ${modelName}.${attribute}`);
    permission.enabled = toBeEnabled;
    return await strapi
      .query('attributepermission', 'users-permissions')
      .update(permission);
  }

  return permission;
}

async function addNeededPermissions(
  model,
  commonAttrs,
  toUpdate,
  enabled,
  modelName
) {
  if (enabled === null) {
    enabled = true;
    await add({
      ...commonAttrs,
      scope: 'model',
      enabled
    });
  }
  return Promise.all(
    toUpdate.map(attribute => {
      // todo: remove debug statement
      console.debug(`Adding permissions for ${modelName}.${attribute}`);
      return add({
        ...commonAttrs,
        attribute,
        scope: 'attribute',
        enabled: strapi.utils.models.isAttributePrivate(model, attribute) ? false : enabled
      });
    })
  );
}

async function add(values) {
  let model = strapi.plugins['users-permissions'].models.attributepermission;
  // Extract values related to relational data.
  const relations = _.pick(values, model.associations.map(ast => ast.alias));
  const data = _.omit(values, model.associations.map(ast => ast.alias));

  // Create entry with no-relational data.
  const entry = await model.create(data);

  // Create relational data and return the entry.
  return model.updateRelations({
    _id: entry.id,
    values: relations
  });
}

async function edit(params, values) {
  let model = strapi.plugins['users-permissions'].models.attributepermission;
  // Extract values related to relational data.
  const relations = _.pick(values, model.associations.map(a => a.alias));
  const data = _.omit(values, model.associations.map(a => a.alias));

  // Update entry with no-relational data.
  const entry = await model.update(params, data, {
    multi: true
  });

  // Update relational data and return the entry.
  return model.updateRelations(Object.assign(params, { values: relations }));
}

async function remove(params) {
  let model = strapi.plugins['users-permissions'].models.attributepermission;
  // Select field to populate.
  const populate = model.associations
    .filter(ast => ast.autoPopulate !== false)
    .map(ast => ast.alias)
    .join(' ');

  // Note: To get the full response of Mongo, use the `remove()` method
  // or add spent the parameter `{ passRawResult: true }` as second argument.
  const data = await model.findOneAndRemove(params, {}).populate(populate);

  if (!data) {
    return data;
  }

  await Promise.all(
    model.associations.map(async association => {
      const search =
        _.endsWith(association.nature, 'One') ||
          association.nature === 'oneToMany'
          ? { [association.via]: data._id }
          : { [association.via]: { $in: [data._id] } };
      const update =
        _.endsWith(association.nature, 'One') ||
          association.nature === 'oneToMany'
          ? { [association.via]: null }
          : { $pull: { [association.via]: data._id } };

      // Retrieve model.
      const model = association.plugin
        ? strapi.plugins[association.plugin].models[
        association.model || association.collection
        ]
        : strapi.models[association.model || association.collection];

      return model.update(search, update, { multi: true });
    })
  );

  return data;
}

async function search(params) {
  let model = strapi.plugins['users-permissions'].models.attributepermission;
  // Convert `params` object to filters compatible with Mongo.
  const filters = strapi.utils.models.convertParams(
    'attributePermission',
    params
  );
  // Select field to populate.
  const populate = model.associations
    .filter(ast => ast.autoPopulate !== false)
    .map(ast => ast.alias)
    .join(' ');

  const $or = Object.keys(model.attributes).reduce((acc, curr) => {
    switch (model.attributes[curr].type) {
      case 'integer':
      case 'float':
      case 'decimal':
        if (!_.isNaN(_.toNumber(params._q))) {
          return acc.concat({ [curr]: params._q });
        }

        return acc;
      case 'string':
      case 'text':
      case 'password':
        return acc.concat({ [curr]: { $regex: params._q, $options: 'i' } });
      case 'boolean':
        if (params._q === 'true' || params._q === 'false') {
          return acc.concat({ [curr]: params._q === 'true' });
        }

        return acc;
      default:
        return acc;
    }
  }, []);

  return model
    .find({ $or })
    .sort(filters.sort)
    .skip(filters.start)
    .limit(filters.limit)
    .populate(populate);
}

