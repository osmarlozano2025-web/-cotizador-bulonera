import js from "@eslint/js";
import globals from "globals";
import importPlugin from "eslint-plugin-import";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config({ignores:["dist","eslint.config.js","postcss.config.js"]},js.configs.recommended,...tseslint.configs.recommendedTypeChecked,{languageOptions:{ecmaVersion:2022,globals:globals.browser,parserOptions:{project:["./tsconfig.app.json","./tsconfig.node.json"],tsconfigRootDir:import.meta.dirname}},plugins:{import:importPlugin,"react-hooks":reactHooks,"react-refresh":reactRefresh},settings:{"import/resolver":{typescript:true}},rules:{...reactHooks.configs.flat.recommended.rules,...reactRefresh.configs.vite.rules,"@typescript-eslint/consistent-type-imports":"error","@typescript-eslint/no-explicit-any":"error","import/no-cycle":"error"}});
