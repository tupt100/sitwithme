export const pipe = (...fns) => (x) => fns.reduce((y, f) => f(y), x);
export const identity = <T>(x: T): T => x;

export const asyncFilter = async (arr, predicate) => {
  const results = await Promise.all(arr.map(predicate));
  return arr.filter((_v, index) => results[index]);
}

export const asyncFind = async (arr, predicate) => {
  const results = await Promise.all(arr.map(predicate));
  return arr.find((_v, index) => results[index]);
}