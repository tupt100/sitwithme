export const changed = (base: object, obj: object) => {
  let hasChanged = false;

  const detect = (base, obj) => {
    if ((base && !obj) || (!base && obj)) {
      hasChanged = true;
      return;
    };

    if (!base && !obj) {
      hasChanged = false;
      return;
    }

    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'object' && v !== null && base[k]) {
        detect(base[k], v);
      } else {
        if (v !== base[k]) {
          hasChanged = true;
          break;
        }
      }
    }
  };

  detect(base, obj);
  return hasChanged;
};

export const isArrayChanged = (base: any[], array: any) => {
  base = base || [];
  array = array || [];
  const symmetricDifference = base
    .filter(x => !array.includes(x))
    .concat(array.filter(x => !base.includes(x)));
  return !!symmetricDifference?.length;
}