export const env = { NODE_ENV: 'production' };
export const version = '';
export const nextTick = (cb) => setTimeout(cb, 0);
export default { env, version, nextTick };