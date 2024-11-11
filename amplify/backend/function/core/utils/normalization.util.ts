export const normalizeString = (objData) => {
  Object.keys(objData).forEach(key => {
    if (typeof objData[key] === 'string') {
      objData[key] = objData[key].trim();
    }
    if (objData[key] !== null && typeof objData[key] === 'object') {
      normalizeString(objData[key]);
    }
  });
  return objData;
}

export const removeUndefined = (obj) => {
  Object.keys(obj).forEach(key => {
    if (obj[key] === undefined) {
      delete obj[key];
    }
  });
  return obj;
};

export const removeEmptyArray = (obj) => {
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'object' && obj[key]?.length === 0) {
      delete obj[key];
    }
    if (obj[key] !== null && typeof obj[key] === 'object') {
      removeEmptyArray(obj[key]);
    }
  });
  return obj;
};