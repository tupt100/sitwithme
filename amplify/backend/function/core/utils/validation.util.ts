export const hasAttr = (obj: object, attr: string) => {
  return obj.hasOwnProperty(attr) && typeof obj[attr] !== 'undefined';
};