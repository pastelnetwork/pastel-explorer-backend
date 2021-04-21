module.exports = {
  hooks: {
    'pre-commit': 'yarn type-check && lint-staged',
    'pre-push': 'yarn test && yarn sort:packageJson',
    'commit-msg': 'commitlint -E HUSKY_GIT_PARAMS',
  },
};
