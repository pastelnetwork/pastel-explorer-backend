module.exports = {
  '{src,}/**/*.ts': ['eslint --cache --fix'],
  '{src,}/**/*.{ts,js}': ['prettier --write --ignore-path .prettierignore']
};
