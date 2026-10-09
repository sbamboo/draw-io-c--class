/**
 * diagrams.net plugin: pseudo C# → UML class.
 *
 * Extras → C# class…, or the C# item on the menu bar.
 * Paste plugin.js into the app.diagrams.net console. That file installs itself.
 */
(function (root, factory) {
	var api = factory();

	if (typeof module === 'object' && module != null && module.exports != null && typeof Draw === 'undefined') {
		module.exports = api;
	}

	root.CsharpUml = api;

	if (typeof Draw !== 'undefined' && typeof Draw.loadPlugin === 'function') {
		Draw.loadPlugin(function (ui) {
			api.install(ui);
		});
	}
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
	var SAMPLE = [
		'class MYClass {',
		'    private memberVar;',
		'    public Property => true',
		'    private void MemberMethod(string param) {}',
		'    public void MemberMethodPubl(string param) {}',
		'}'
	].join('\n');

	var CLASS_STYLE =
		'swimlane;fontStyle=0;align=center;verticalAlign=top;childLayout=stackLayout;' +
		'horizontal=1;startSize=START;horizontalStack=0;resizeParent=1;resizeParentMax=0;' +
		'resizeLast=0;collapsible=1;marginBottom=0;whiteSpace=wrap;html=1;';

	var ROW_STYLE =
		'text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;spacingLeft=4;' +
		'spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];' +
		'portConstraint=eastwest;whiteSpace=wrap;html=1;';

	var DIVIDER_STYLE =
		'line;strokeWidth=1;fillColor=none;align=left;verticalAlign=middle;spacingTop=-1;' +
		'spacingLeft=3;spacingRight=3;rotatable=0;labelPosition=right;points=[];' +
		'portConstraint=eastwest;strokeColor=inherit;';

	var VISIBILITY = { public: '+', private: '-', protected: '#', internal: '~' };
	var LEADING_MOD =
		/^(public|private|protected|internal|static|abstract|virtual|override|readonly|async|sealed|partial|new|extern|unsafe|volatile|const|required)\s+/i;

	function install(ui) {
		if (ui.editor != null && ui.editor.isChromelessView()) {
			return;
		}

		if (!ui.csharpUmlInstalled) {
			ui.csharpUmlInstalled = true;
			mxResources.parse('csharpUml=C# class...');

			ui.actions.addAction('csharpUml', function () {
				openDialog(ui, false);
			});

			var extras = ui.menus.get('extras');

			if (extras != null) {
				var previous = extras.funct;

				extras.funct = function (menu, parent) {
					previous.apply(this, arguments);
					ui.menus.addMenuItems(menu, ['-', 'csharpUml'], parent);
				};
			}

			hookFormatPanel(ui);
			ui.addListener('currentThemeChanged', function () {
				window.setTimeout(function () {
					addToolbarButton(ui);
				}, 0);
			});
		}

		addToolbarButton(ui);
	}

	function addToolbarButton(ui) {
		var hosts = [];

		if (ui.sketchMenubarElt != null) {
			hosts.push(ui.sketchMenubarElt);
		}

		if (ui.toolbar != null && ui.toolbar.container != null) {
			hosts.push(ui.toolbar.container);
		}

		if (!hosts.length && ui.menubar != null && ui.menubar.container != null) {
			hosts.push(ui.menubar.container);
		}

		for (var i = 0; i < hosts.length; i++) {
			var host = hosts[i];

			if (host.querySelector('[data-csharp-uml-insert]')) {
				continue;
			}

			var btn = document.createElement('a');
			btn.setAttribute('data-csharp-uml-insert', '1');
			btn.setAttribute('title', 'Insert UML class from C#');
			btn.textContent = 'C#';
			btn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;height:28px;padding:0 10px;margin:0 4px;cursor:pointer;font:600 12px sans-serif;border-radius:4px;background:#1e1e1e;color:#fff;flex-shrink:0;text-decoration:none;user-select:none;';

			mxEvent.addListener(btn, 'click', function (evt) {
				mxEvent.consume(evt);
				openDialog(ui, false);
			});

			host.insertBefore(btn, host.firstChild);
		}
	}

	function hookFormatPanel(ui) {
		var format = ui.format;

		if (format == null || format.immediateRefresh == null || format.immediateRefresh.csharpUml) {
			return;
		}

		var previous = format.immediateRefresh;

		var wrapped = function () {
			previous.apply(this, arguments);
			addUpdateButton(ui, this);
		};

		wrapped.csharpUml = true;
		format.immediateRefresh = wrapped;
	}

	function addUpdateButton(ui, format) {
		if (format.container == null) {
			return;
		}

		var existing = format.container.querySelector('[data-csharp-uml-update]');

		if (existing != null) {
			existing.parentNode.removeChild(existing);
		}

		var cell = findPseudoCell(ui.editor.graph.getSelectionCell());

		if (cell == null) {
			return;
		}

		var block = document.createElement('div');
		block.setAttribute('data-csharp-uml-update', '1');
		block.className = 'geFormatEntry';
		block.style.padding = '10px 12px 6px';

		var btn = mxUtils.button('Update C#', function () {
			openDialog(ui, true);
		});
		btn.className = 'geBtn gePrimaryBtn';
		btn.style.width = '100%';
		block.appendChild(btn);
		format.container.insertBefore(block, format.container.firstChild);
	}

	function openDialog(ui, update) {
		var graph = ui.editor.graph;
		var selected = update ? findPseudoCell(graph.getSelectionCell()) : null;
		var editing = selected != null;
		var initial = editing ? getPseudo(selected) : SAMPLE;

		var wrap = document.createElement('div');
		wrap.style.cssText = 'width:720px;max-width:92vw;background:#1e1e1e;';

		var title = document.createElement('div');
		title.textContent = editing ? 'Edit pseudo C#' : 'Pseudo C#';
		title.style.cssText = 'color:#cccccc;font:600 13px/1.2 sans-serif;padding:10px 12px 8px;background:#1e1e1e;';
		wrap.appendChild(title);

		var host = document.createElement('div');
		host.style.cssText = 'height:420px;width:100%;text-align:left;background:#1e1e1e;';
		wrap.appendChild(host);

		var status = document.createElement('div');
		status.textContent = 'Loading editor…';
		status.style.cssText = 'color:#bbbbbb;font:13px/420px sans-serif;padding-left:16px;';
		host.appendChild(status);

		var editor = null;

		function currentText() {
			if (editor != null) {
				return editor.getValue();
			}

			var area = host.querySelector('textarea');
			return area != null ? area.value : initial;
		}

		function apply() {
			var source = currentText();
			var models = parseDocument(source);

			if (!models.length) {
				return 'No class found. Start a line with class, interface, enum, struct, or record.';
			}

			return insertModels(ui, models, source, editing ? selected : null);
		}

		// hideAfterOKFn keeps the editor alive until apply() has read it.
		// A string return value is shown by CustomDialog and leaves the popup open.
		var dlg = new CustomDialog(
			ui, wrap, apply, null, editing ? 'Update' : 'Insert',
			null, null, false, null, true
		);
		dlg.container.style.background = '#1e1e1e';
		ui.showDialog(dlg.container, 720, 560, true, true, function () {
			if (editor != null) {
				editor.dispose();
				editor = null;
			}
		});

		loadMonaco().then(function (monaco) {
			host.textContent = '';
			editor = monaco.editor.create(host, {
				value: initial,
				language: 'csharp',
				theme: 'vs-dark',
				minimap: { enabled: false },
				automaticLayout: true,
				fontSize: 14,
				tabSize: 4,
				scrollBeyondLastLine: false,
				wordWrap: 'on',
				padding: { top: 8 },
				fixedOverflowWidgets: true
			});
			monaco.editor.setTheme('vs-dark');
			editor.focus();
			editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, function () {
				dlg.okButton.click();
			});
		}).catch(function (err) {
			host.textContent = '';
			var area = document.createElement('textarea');
			area.value = initial;
			area.style.cssText = 'box-sizing:border-box;width:100%;height:420px;border:0;resize:none;padding:12px;background:#1e1e1e;color:#d4d4d4;font:14px/1.45 monospace;';
			host.appendChild(area);
			status.textContent = '';
			notify(ui, 'Monaco failed to load (' + (err && err.message ? err.message : err) + '). Using a plain text editor.');
			area.focus();
		});
	}

	function loadMonaco() {
		if (typeof window !== 'undefined' && window.monaco && window.monaco.editor) {
			return Promise.resolve(window.monaco);
		}

		return Promise.reject(new Error('Monaco is not bundled. Run npm run package and paste combined.js.'));
	}

	function notify(ui, message) {
		if (ui != null && typeof ui.alert === 'function') {
			ui.alert(message);
		} else if (typeof mxUtils !== 'undefined' && typeof mxUtils.alert === 'function') {
			mxUtils.alert(message);
		} else {
			window.alert(message);
		}
	}

	function insertModels(ui, models, source, existing) {
		var graph = ui.editor.graph;

		if (!graph.isEnabled() || graph.isCellLocked(graph.getDefaultParent())) {
			return 'The diagram is locked.';
		}

		var updateExisting = existing != null && models.length === 1 && getPseudo(existing) !== '';
		var origin = updateExisting ? null : graph.getInsertPoint();
		var cursor = origin != null ? origin.x : 0;

		graph.getModel().beginUpdate();

		try {
			var created = [];

			for (var i = 0; i < models.length; i++) {
				var model = models[i];
				var size = measure(model);
				var cell = (updateExisting && i === 0) ? existing : null;

				if (cell == null) {
					cell = graph.insertVertex(
						graph.getDefaultParent(),
						null,
						userObject(model, source),
						cursor,
						origin.y,
						size.width,
						size.height,
						classStyle(size.startSize)
					);
					cursor += size.width + 40;
				} else {
					var geo = cell.geometry.clone();
					geo.width = size.width;
					geo.height = size.height;
					graph.getModel().setValue(cell, userObject(model, source));
					graph.getModel().setStyle(cell, classStyle(size.startSize));
					graph.getModel().setGeometry(cell, geo);
					var kids = graph.getChildCells(cell);

					if (kids.length) {
						graph.removeCells(kids);
					}
				}

				fillCompartments(graph, cell, model, size.width);
				created.push(cell);
			}

			graph.setSelectionCells(created);
		} finally {
			graph.getModel().endUpdate();
		}
	}

	function fillCompartments(graph, cell, model, width) {
		var attributes = model.attributes.length ? model.attributes : [{ text: ' ', fontStyle: 0 }];
		var operations = model.operations.length ? model.operations : [{ text: ' ', fontStyle: 0 }];

		for (var i = 0; i < attributes.length; i++) {
			addRow(graph, cell, attributes[i], width);
		}

		var divider = graph.insertVertex(cell, null, '', 0, 0, width, 8, DIVIDER_STYLE);
		divider.setConnectable(false);

		for (var j = 0; j < operations.length; j++) {
			addRow(graph, cell, operations[j], width);
		}
	}

	function addRow(graph, cell, member, width) {
		var style = ROW_STYLE;

		if (member.fontStyle) {
			style += 'fontStyle=' + member.fontStyle + ';';
		}

		graph.insertVertex(cell, null, member.text, 0, 0, width, 26, style);
	}

	function classStyle(startSize) {
		return CLASS_STYLE.replace('START', String(startSize));
	}

	function userObject(model, source) {
		var obj = mxUtils.createXmlDocument().createElement('object');
		obj.setAttribute('label', headerLabel(model));
		obj.setAttribute('pseudo', source);
		return obj;
	}

	function headerLabel(model) {
		var lines = model.stereotypes.map(function (stereotype) {
			return '&lt;&lt;' + escapeHtml(stereotype) + '&gt;&gt;';
		});
		var name = escapeHtml(model.name);
		lines.push(model.italic ? '<b><i>' + name + '</i></b>' : '<b>' + name + '</b>');
		return lines.join('<br>');
	}

	function measure(model) {
		var lines = model.stereotypes.map(function (stereotype) {
			return '<<' + stereotype + '>>';
		});
		lines.push(model.name);
		model.attributes.concat(model.operations).forEach(function (member) {
			lines.push(member.text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
		});

		var longest = 0;

		for (var i = 0; i < lines.length; i++) {
			longest = Math.max(longest, lines[i].length);
		}

		var lineCount = model.stereotypes.length + 1;

		return {
			width: Math.max(180, Math.min(520, Math.ceil(longest * 7.4 + 32))),
			height: Math.max(26, 8 + lineCount * 18) +
				Math.max(model.attributes.length, 1) * 26 +
				8 +
				Math.max(model.operations.length, 1) * 26,
			startSize: Math.max(26, 8 + lineCount * 18)
		};
	}

	function findPseudoCell(cell) {
		while (cell != null) {
			if (getPseudo(cell) !== '') {
				return cell;
			}

			cell = cell.parent;
		}

		return null;
	}

	function getPseudo(cell) {
		var value = cell != null ? cell.value : null;

		if (value != null && value.nodeType === 1 && typeof value.getAttribute === 'function') {
			return value.getAttribute('pseudo') || '';
		}

		return '';
	}

	function parseDocument(src) {
		var lines = stripComments(String(src || '')).split(/\r?\n/);
		var classes = [];
		var current = null;

		for (var i = 0; i < lines.length; i++) {
			var line = cleanLine(lines[i]);

			if (!line || line === '{' || line === '}' || line === ';') {
				continue;
			}

			if (/^(using|namespace)\b/i.test(line) || /^\[[^\]]*\]$/.test(line)) {
				continue;
			}

			var header = parseHeader(line);

			if (header != null) {
				if (current != null) {
					classes.push(current);
				}

				current = header;
				continue;
			}

			if (current == null) {
				continue;
			}

			var member = parseMember(line, current);

			if (member == null) {
				continue;
			}

			if (member.kind === 'operation') {
				current.operations.push(member);
			} else {
				current.attributes.push(member);
			}
		}

		if (current != null) {
			classes.push(current);
		}

		return classes;
	}

	function stripComments(src) {
		return src
			.replace(/\/\*[\s\S]*?\*\//g, '')
			.replace(/\/\/[^\n]*/g, '');
	}

	function cleanLine(raw) {
		var line = String(raw || '').trim();
		line = line.replace(/\{\s*$/, '').trim();
		line = line.replace(/;+\s*$/, '').trim();
		return line;
	}

	function parseHeader(line) {
		var rest = line;
		var modifiers = [];

		for (;;) {
			var found = rest.match(LEADING_MOD);

			if (found == null) {
				break;
			}

			modifiers.push(found[1].toLowerCase());
			rest = rest.slice(found[0].length);
		}

		var match = rest.match(/^(class|interface|enum|struct|record)\s+([A-Za-z_][\w]*)(\s*<[^<>]+>)?\s*(.*)$/i);

		if (match == null) {
			return null;
		}

		var kind = match[1].toLowerCase();
		var name = match[2] + (match[3] || '').replace(/\s+/g, '');
		var stereotypes = [];
		var stereoRe = /<<\s*([^<>]+?)\s*>>/g;
		var stereo;

		while ((stereo = stereoRe.exec(match[4] || ''))) {
			pushStereotype(stereotypes, stereo[1].trim());
		}

		var declared = stereotypes.slice();
		stereotypes.length = 0;

		if (kind === 'interface') {
			pushStereotype(stereotypes, 'interface');
		}

		if (kind === 'enum') {
			pushStereotype(stereotypes, 'enum');
		}

		if (modifiers.indexOf('abstract') >= 0) {
			pushStereotype(stereotypes, 'abstract');
		}

		for (var s = 0; s < declared.length; s++) {
			pushStereotype(stereotypes, declared[s]);
		}

		var italic = kind === 'interface' || stereotypes.some(function (stereotype) {
			var key = stereotype.toLowerCase();
			return key === 'abstract' || key === 'interface';
		});

		return {
			kind: kind,
			name: name,
			simpleName: match[2],
			stereotypes: stereotypes,
			italic: italic,
			defaultVisibility: (kind === 'interface' || kind === 'enum') ? '+' : '-',
			attributes: [],
			operations: []
		};
	}

	function pushStereotype(list, name) {
		if (!name) {
			return;
		}

		var key = name.toLowerCase();

		if (key === 'enumeration') {
			key = 'enum';
			name = 'enum';
		}

		for (var i = 0; i < list.length; i++) {
			if (list[i].toLowerCase() === key) {
				return;
			}
		}

		list.push(name);
	}

	function parseMember(line, typeModel) {
		var peeled = peelBraces(line);
		var stripped = stripExpression(peeled.text);
		var mods = consumeModifiers(stripped.text);
		var flags = mods.flags;

		if (stripped.expression && !hasParen(mods.rest)) {
			flags.readonly = true;
		}

		if (peeled.accessors.get && !peeled.accessors.set) {
			flags.readonly = true;
		}

		if (peeled.accessors.set) {
			flags.readonly = false;
		}

		peeled.suffixes.forEach(function (suffix) {
			if (suffix.toLowerCase() === 'static') {
				flags.static = true;
			}

			if (suffix.toLowerCase() === 'abstract') {
				flags.abstract = true;
			}

			if (suffix.toLowerCase() === 'readonly') {
				flags.readonly = true;
			}
		});

		var visibility = mods.visibility || typeModel.defaultVisibility;
		var fontStyle = (flags.abstract ? 2 : 0) + (flags.static ? 4 : 0);
		var suffixText = formatSuffixes(peeled.suffixes, flags);

		if (hasParen(mods.rest)) {
			var operation = parseOperation(mods.rest, typeModel.simpleName);
			var shown = operation.isConstructor ? '&lt;&lt;constructor&gt;&gt;' : escapeHtml(operation.name);
			var text = visibility + ' ' + shown + '(' + operation.params + ')';

			if (operation.type && !operation.isConstructor) {
				text += ': ' + escapeHtml(operation.type);
			}

			return {
				kind: 'operation',
				text: text + escapeHtml(suffixText),
				fontStyle: fontStyle
			};
		}

		var named = splitTypeAndName(mods.rest);

		if (!named.name) {
			return null;
		}

		var field = visibility + ' ' + escapeHtml(named.name);

		if (named.type) {
			field += ': ' + escapeHtml(named.type);
		}

		return {
			kind: 'attribute',
			text: field + escapeHtml(suffixText),
			fontStyle: fontStyle
		};
	}

	function parseOperation(rest, className) {
		var open = rest.indexOf('(');
		var head = rest.slice(0, open).trim();
		var close = rest.lastIndexOf(')');
		var paramsSrc = close > open ? rest.slice(open + 1, close) : rest.slice(open + 1);
		var named = splitTypeAndName(head);

		return {
			name: named.name,
			type: named.type,
			isConstructor: named.name === className,
			params: splitTopLevel(paramsSrc).map(formatParam).filter(Boolean).join(', ')
		};
	}

	function formatParam(param) {
		var value = stripDefault(param).replace(/^(out|ref|in|params|this)\s+/i, '').trim();
		var named = splitTypeAndName(value);

		if (!named.name) {
			return escapeHtml(value);
		}

		if (!named.type) {
			return escapeHtml(named.name);
		}

		return escapeHtml(named.name) + ': ' + escapeHtml(named.type);
	}

	function stripDefault(param) {
		var depth = 0;
		var out = '';

		for (var i = 0; i < param.length; i++) {
			var ch = param.charAt(i);

			if (ch === '<' || ch === '(' || ch === '[') {
				depth++;
			} else if (ch === '>' || ch === ')' || ch === ']') {
				depth = Math.max(0, depth - 1);
			} else if (ch === '=' && depth === 0 && param.charAt(i + 1) !== '>') {
				break;
			}

			out += ch;
		}

		return out.trim();
	}

	function splitTypeAndName(head) {
		var text = String(head || '').trim();

		if (!text) {
			return { type: '', name: '' };
		}

		var match = text.match(/^(?:([\s\S]*?)\s+)?([A-Za-z_][\w]*)$/);

		if (match == null) {
			return { type: '', name: text };
		}

		return {
			type: (match[1] || '').trim(),
			name: match[2]
		};
	}

	function splitTopLevel(src) {
		var parts = [];
		var depth = 0;
		var current = '';

		for (var i = 0; i < src.length; i++) {
			var ch = src.charAt(i);

			if (ch === '<' || ch === '(' || ch === '[') {
				depth++;
			} else if (ch === '>' || ch === ')' || ch === ']') {
				depth = Math.max(0, depth - 1);
			} else if (ch === ',' && depth === 0) {
				if (current.trim()) {
					parts.push(current.trim());
				}

				current = '';
				continue;
			}

			current += ch;
		}

		if (current.trim()) {
			parts.push(current.trim());
		}

		return parts;
	}

	function consumeModifiers(text) {
		var rest = text;
		var visibility = null;
		var sawProtected = false;
		var flags = { static: false, abstract: false, readonly: false };

		for (;;) {
			var found = rest.match(LEADING_MOD);

			if (found == null) {
				break;
			}

			var word = found[1].toLowerCase();
			rest = rest.slice(found[0].length);

			if (word === 'protected') {
				sawProtected = true;
				visibility = '#';
			} else if (word === 'internal') {
				if (!sawProtected) {
					visibility = '~';
				}
			} else if (VISIBILITY[word]) {
				visibility = VISIBILITY[word];
			}

			if (word === 'static') {
				flags.static = true;
			}

			if (word === 'abstract') {
				flags.abstract = true;
			}

			if (word === 'readonly' || word === 'const') {
				flags.readonly = true;
			}
		}

		return { visibility: visibility, flags: flags, rest: rest.trim() };
	}

	function peelBraces(line) {
		var text = line.trim();
		var suffixes = [];
		var accessors = { get: false, set: false };

		for (;;) {
			var match = text.match(/\{([^{}]*)\}\s*$/);

			if (match == null) {
				break;
			}

			text = text.slice(0, match.index).trim();
			var classified = classifyBrace(match[1]);

			if (classified.kind === 'suffix') {
				suffixes.unshift(classified.name);
			} else if (classified.kind === 'accessor') {
				accessors.get = accessors.get || classified.get;
				accessors.set = accessors.set || classified.set;
			}
		}

		return { text: text, suffixes: suffixes, accessors: accessors };
	}

	function classifyBrace(inner) {
		var text = String(inner || '').trim();

		if (!text) {
			return { kind: 'body' };
		}

		if (/^[A-Za-z_][\w]*$/.test(text)) {
			return { kind: 'suffix', name: normalizeSuffix(text) };
		}

		var words = text.replace(/;/g, ' ').trim().split(/\s+/).filter(Boolean);
		var filtered = words.filter(function (word) {
			return !/^(public|private|protected|internal)$/i.test(word);
		});

		if (filtered.length && filtered.every(function (word) {
			return /^(get|set|init)$/i.test(word);
		})) {
			return {
				kind: 'accessor',
				get: filtered.some(function (word) { return word.toLowerCase() === 'get'; }),
				set: filtered.some(function (word) {
					var key = word.toLowerCase();
					return key === 'set' || key === 'init';
				})
			};
		}

		return { kind: 'body' };
	}

	function normalizeSuffix(name) {
		var key = name.toLowerCase();

		if (key === 'readonly') {
			return 'readOnly';
		}

		if (key === 'static' || key === 'abstract') {
			return key;
		}

		return name;
	}

	function formatSuffixes(suffixes, flags) {
		var list = suffixes.slice();

		function has(name) {
			return list.some(function (suffix) {
				return suffix.toLowerCase() === name.toLowerCase();
			});
		}

		if (flags.readonly && !has('readOnly')) {
			list.push('readOnly');
		}

		if (flags.static && !has('static')) {
			list.push('static');
		}

		if (flags.abstract && !has('abstract')) {
			list.push('abstract');
		}

		if (!list.length) {
			return '';
		}

		return ' ' + list.map(function (suffix) {
			return '{' + suffix + '}';
		}).join('');
	}

	function stripExpression(text) {
		var depth = 0;

		for (var i = 0; i < text.length - 1; i++) {
			var ch = text.charAt(i);

			if (ch === '<' || ch === '(' || ch === '[') {
				depth++;
			} else if (ch === '>' || ch === ')' || ch === ']') {
				depth = Math.max(0, depth - 1);
			} else if (depth === 0 && ch === '=' && text.charAt(i + 1) === '>') {
				return { text: text.slice(0, i).trim(), expression: true };
			}
		}

		return { text: text.trim(), expression: false };
	}

	function hasParen(text) {
		return text.indexOf('(') >= 0;
	}

	function escapeHtml(value) {
		return String(value)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
	}

	function attachMonaco(monaco, css, conf, language) {
		globalThis.MonacoEnvironment = {
			getWorker: function () {
				throw new Error('web workers are blocked');
			}
		};

		monaco.languages.register({ id: 'csharp', extensions: ['.cs'], aliases: ['C#', 'csharp'] });
		monaco.languages.setMonarchTokensProvider('csharp', language);
		monaco.languages.setLanguageConfiguration('csharp', conf);

		var style = document.createElement('style');
		style.textContent = css;
		document.head.appendChild(style);
		globalThis.monaco = monaco;
	}

	return {
		install: install,
		parseDocument: parseDocument,
		attachMonaco: attachMonaco
	};
});
