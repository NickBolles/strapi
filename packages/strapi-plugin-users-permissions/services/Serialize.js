module.exports = {
  SerializeObject: SerializePlainObject,
  SerializePlainAttribute: SerializePlainAttribute,
  SerializeModel: SerializeModel,
  SerializeAttribute: SerializeAttribute
};
async function SerializePlainObject(ctx, data, isPlainJSON = false) {
  if (!isPlainJSON) {
    try {
      if (data.toJSON) {
        data = data.toJSON();
      } else {
        data = JSON.parse(JSON.stringify(data));
      }
    } catch (e) { }
  }
  console.log('SerializeDeepModels serializing ', data);
  if (!data || !ctx) {
    return data;
  }
  // If this object is a model, run it through the serialization function
  if (data.___strapi_model) {
    console.log('Found model ', data.___strapi_model, 'serializing now');
    return SerializeModel(ctx, data.___strapi_model, data);
  }

  await Promise.all(
    Object.keys(data).map(field => SerializePlainAttribute(ctx, data, field, true))
  );

  return data;
}

async function SerializePlainAttribute(ctx, data, field, isPlainJSON) {
  let value = data[field];
  if (!value) {
    return;
  }
  if (Array.isArray(value)) {
    data[field] = await Promise.all(
      value.map(v => SerializePlainObject(ctx, v, isPlainJSON))
    );
  } else if (typeof value === 'object') {
    data[field] = await SerializePlainObject(ctx, value, isPlainJSON);
  }
}

const ALLOWED_ATTRS = ['_id', 'id', 'createdAt', 'updatedAt'];

// todo make helper functions for controllerName, controller from route etc
/**
 * This function should be called every time that a model is serialized
 *
 * This will take care of finding the permissions required, and filtering out the fields
 * that the user doesn't have access to.
 */
async function SerializeModel(ctx, modelName, data) {
  if (!data) {
    return data;
  }
  console.debug('Serializing Model', modelName);

  let model = await strapi.utils.models.getModel(modelName || data.__strapi_model);
  delete data.__strapi_model;
  delete data.__v;

  // todo: should we just get all of the permissions for this model and role right now
  // and pass them down into SerializeAttribute? would that be problematic on large models?
  let modelPermissions = await getPermissionsForModel(strapi, ctx, model);

  console.debug(`permission for model ${modelName} `, modelPermissions.enabled);

  if (!modelPermissions || !modelPermissions.enabled) {
    // ? throw error??
    return undefined;
  }

  await Promise.all(
    Object.keys(data)
      .filter(attr => ALLOWED_ATTRS.indexOf(attr) !== -1)
      .map(attribute => SerializeAttribute(ctx, model, data, attribute))
  );

  // todo: run a model policy
  // todo: should policy be run after attributes or before?

  return data.toJSON ? data.toJSON() : data;
}

async function SerializeAttribute(ctx, model, data, attributeName, role) {
  model = await strapi.utils.models.getModel(model);
  let value = data[attributeName];

  // First query for a permission record for the attribute
  let permission = await getPermissionsForAttribute(
    strapi,
    ctx,
    model,
    attributeName,
    role
  );

  console.debug(
    'Serializing attribute ',
    attributeName,
    'using permissions',
    permission && permission.enabled
  );

  // If we didn't find one, or it's set as disabled
  if (!permission || !permission.enabled) {
    delete data[attributeName];
    return;
  }

  // todo: check each item in array, if association check model permissions
  // if it's allowed, check if we need to recurse deeper

  let association = await strapi.utils.models.getModelAssociation(model, attributeName);
  if (association) {
    console.log(
      'Found association for',
      model.globalName,
      'association is ',
      association,
      'value is ',
      value
    );
    let modelName =
      association.model || association.modelName || association.collection;
    let newValue = await SerializeModel(ctx, modelName, data[attributeName]);
    if (newValue === {}) {
      delete data[attributeName];
      return;
    }
    data[attributeName] = newValue;
  }

  // todo run policy for the field from the permisisons
  let policy = () => { };
  if (policy) {
    let newValue = policy(
      ctx,
      model,
      data,
      attributeName,
      role,
      value,
      permission
    );
    if (!newValue || newValue === {}) {
      delete data[attributeName];
      return;
    }
  }
}

async function getPermissionsForModel(strapi, ctx, model) {
  model = await strapi.utils.models.getModel(model);

  let role = await strapi.plugins['users-permissions'].services.user.getCurrentUsersRole(strapi, ctx);
  // Get the model level permission
  return await getPermissionsForAttribute(strapi, ctx, model, undefined, role);
}

// get any permission for this attribute
async function getPermissionsForAttribute(strapi, ctx, model, attribute, role) {
  model = await strapi.utils.models.getModel(model);
  if (!role) {
    role = await strapi.plugins['users-permissions'].services.user.getCurrentUsersRole(strapi, ctx);
  }

  if (attribute !== undefined && !model.attributes[attribute]) {
    return false;
  }

  // todo: get plugin name somehow and query for it in type?
  return await strapi.query('attributePermission', 'users-permissions').findOne(
    {
      role: role._id || role.id,
      // type: model.plugin || 'application',
      model: model.globalName,
      enabled: true,
      scope: attribute ? 'attribute' : 'model',
      attribute
    },
    []
  );
}
