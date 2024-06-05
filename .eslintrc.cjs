module.exports = {
	env: {
		browser: true,
		es2021: true,
	},
	extends: [
		// "plugin:@typescript-eslint/recommended-type-checked",
		// "plugin:@typescript-eslint/stylistic-type-checked",
		"plugin:solid/typescript",
	],
	overrides: [
		{
			env: {
				node: true,
			},
			files: [".eslintrc.{js,cjs}"],
			parserOptions: {
				sourceType: "script",
			},
		},
	],
	parser: "@typescript-eslint/parser",
	parserOptions: {
		ecmaVersion: "latest",
		sourceType: "module",
	},
	plugins: ["@typescript-eslint", "solid"],
	rules: {
		quotes: ["error", "double"],
		"@typescript-eslint/consistent-type-imports": [
			"warn",
			{
				prefer: "type-imports",
				fixStyle: "inline-type-imports",
			},
		],
		"solid/reactivity": "warn",
		"solid/no-destructure": "warn",
		"solid/jsx-no-undef": "error",
		"@typescript-eslint/no-unused-vars": ["off"],
	},
};
