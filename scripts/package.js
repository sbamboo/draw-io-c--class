var esbuild = require('esbuild');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var cssPath = path.join(root, 'node_modules/monaco-editor/min/vs/editor/editor.main.css');
var fontPath = path.join(root, 'node_modules/monaco-editor/esm/vs/base/browser/ui/codicons/codicon/codicon.ttf');

var font = fs.readFileSync(fontPath).toString('base64');
var css = fs.readFileSync(cssPath, 'utf8').replace(
	'../base/browser/ui/codicons/codicon/codicon.ttf',
	'data:font/ttf;base64,' + font
);

esbuild.build({
	absWorkingDir: root,
	entryPoints: ['plugin-entry'],
	bundle: true,
	format: 'iife',
	platform: 'browser',
	target: 'es2022',
	outfile: 'plugin.js',
	legalComments: 'none',
	minify: true,
	logLevel: 'info',
	define: {
		'process.env.NODE_ENV': '"production"'
	},
	loader: {
		'.css': 'empty',
		'.ttf': 'empty'
	},
	banner: {
		js: '/* Paste this file into the app.diagrams.net console. It installs itself. */'
	},
	plugins: [{
		name: 'plugin-entry',
		setup: function (build) {
			build.onResolve({ filter: /^plugin-entry$/ }, function () {
				return { path: 'plugin-entry', namespace: 'plugin-entry' };
			});
			build.onResolve({ filter: /^monaco-css$/ }, function () {
				return { path: 'monaco-css', namespace: 'monaco-css' };
			});
			build.onLoad({ filter: /.*/, namespace: 'plugin-entry' }, function () {
				return {
					loader: 'js',
					resolveDir: root,
					contents: [
						"import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';",
						"import { conf, language } from 'monaco-editor/esm/vs/basic-languages/csharp/csharp.js';",
						"import css from 'monaco-css';",
						"import './csharp-uml.js';",
						'globalThis.CsharpUml.attachMonaco(monaco, css, conf, language);',
						'if (typeof Draw !== "undefined" && typeof Draw.loadPlugin === "function") {',
						'  Draw.loadPlugin(function (ui) { globalThis.CsharpUml.install(ui); });',
						'}'
					].join('\n')
				};
			});
			build.onLoad({ filter: /.*/, namespace: 'monaco-css' }, function () {
				return { contents: 'export default ' + JSON.stringify(css) + ';', loader: 'js' };
			});
		}
	}]
}).then(function () {
	var bytes = fs.statSync(path.join(root, 'plugin.js')).size;
	console.log('plugin.js ' + (bytes / 1024 / 1024).toFixed(2) + ' MB');
}).catch(function (err) {
	console.error(err);
	process.exit(1);
});
