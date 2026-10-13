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

	var INHERIT_STYLE =
		'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;' +
		'endArrow=classic;endFill=1;' +
		'exitX=0.5;exitY=0;exitDx=0;exitDy=0;entryX=0.5;entryY=1;entryDx=0;entryDy=0;';

	var IMPLEMENT_STYLE =
		'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;' +
		'endArrow=block;endFill=0;endSize=14;' +
		'exitX=0.5;exitY=0;exitDx=0;exitDy=0;entryX=0.5;entryY=1;entryDx=0;entryDy=0;';

	var REF_EDGE =
		'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;dashed=0;' +
		'exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;';

	var REF_KIND = {
		assoc: 'association',
		association: 'association',
		agg: 'aggregation',
		aggregation: 'aggregation',
		comp: 'composition',
		composition: 'composition'
	};

	var PALETTE = {
		white: '#ffffff',
		gray: '#f5f5f5',
		grey: '#f5f5f5',
		blue: '#dae8fc',
		green: '#d5e8d4',
		orange: '#ffe6cc',
		yellow: '#fff2cc',
		red: '#f8cecc',
		purple: '#e1d5e7'
	};

	var NON_REF = {
		void: true,
		bool: true,
		boolean: true,
		byte: true,
		sbyte: true,
		char: true,
		decimal: true,
		double: true,
		float: true,
		int: true,
		uint: true,
		long: true,
		ulong: true,
		short: true,
		ushort: true,
		string: true,
		object: true,
		var: true,
		dynamic: true,
		nint: true,
		nuint: true
	};

	var REF_POINT_KEYS = ['exitX', 'exitY', 'exitDx', 'exitDy', 'entryX', 'entryY', 'entryDx', 'entryDy'];
	var REF_ARROW_KEYS = ['startArrow', 'endArrow', 'startFill', 'endFill', 'startSize', 'endSize'];

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
				if (extras.csharpUmlBase == null) {
					extras.csharpUmlBase = extras.funct;
				}

				var base = extras.csharpUmlBase;

				extras.funct = function (menu, parent) {
					base.apply(this, arguments);
					ui.menus.addMenuItems(menu, ['-', 'csharpUml'], parent);
				};
			}

			hookFormatPanel(ui);

			if (ui.csharpUmlThemeListener != null) {
				ui.removeListener(ui.csharpUmlThemeListener);
			}

			ui.csharpUmlThemeListener = function () {
				window.setTimeout(function () {
					addToolbarButton(ui);
				}, 0);
				window.setTimeout(function () {
					addToolbarButton(ui);
				}, 250);
			};
			ui.addListener('currentThemeChanged', ui.csharpUmlThemeListener);
		}

		addToolbarButton(ui);
		hookTooltips(ui);
		window.setTimeout(function () {
			addToolbarButton(ui);
		}, 250);
	}

	function hookTooltips(ui) {
		var graph = ui.editor != null ? ui.editor.graph : null;

		if (graph == null || graph.getTooltipForCell == null) {
			return;
		}

		var base = graph.getTooltipForCell;

		if (base.csharpUmlBase != null) {
			base = base.csharpUmlBase;
		}

		var wrapped = function (cell) {
			var pseudo = getPseudo(cell);

			if (pseudo !== '') {
				return formatPseudoTooltip(pseudo);
			}

			return base.apply(this, arguments);
		};

		wrapped.csharpUmlBase = base;
		graph.getTooltipForCell = wrapped;
	}

	function formatPseudoTooltip(source) {
		var lines = String(source || '').replace(/\t/g, '    ').split(/\r?\n/);
		var html = '<br>';

		for (var i = 0; i < lines.length; i++) {
			html += escapeHtml(lines[i]).replace(/ /g, '&nbsp;');
			html += '<br>';
		}

		return html;
	}

	function ensureToolbarButtonStyle() {
		var style = document.getElementById('csharp-uml-toolbar-style');

		if (style == null) {
			style = document.createElement('style');
			style.id = 'csharp-uml-toolbar-style';
		}

		style.textContent = 'html body [data-csharp-uml-insert]{display:inline-flex !important;align-items:center !important;justify-content:center !important;align-self:center !important;box-sizing:border-box !important;height:28px !important;min-height:28px !important;max-height:28px !important;width:auto !important;min-width:36px !important;margin:0 4px !important;padding:0 10px !important;padding-top:0 !important;padding-bottom:0 !important;line-height:28px !important;text-align:center !important;font-family:sans-serif !important;font-size:12px !important;font-weight:600 !important;border-radius:4px !important;background:#1e1e1e !important;color:#fff !important;flex:0 0 auto !important;vertical-align:middle !important;text-decoration:none !important;user-select:none !important;cursor:pointer !important;position:relative !important;top:0 !important;}';
		document.head.appendChild(style);
	}

	function addToolbarButton(ui) {
		ensureToolbarButtonStyle();

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

		var stale = document.querySelectorAll('[data-csharp-uml-insert]');

		for (var s = 0; s < stale.length; s++) {
			if (stale[s].parentNode != null) {
				stale[s].parentNode.removeChild(stale[s]);
			}
		}

		for (var i = 0; i < hosts.length; i++) {
			var host = hosts[i];
			var btn = document.createElement('div');
			btn.setAttribute('data-csharp-uml-insert', '1');
			btn.setAttribute('role', 'button');
			btn.setAttribute('title', 'Insert UML class from C#');
			btn.textContent = 'C#';

			mxEvent.addListener(btn, 'click', function (evt) {
				mxEvent.consume(evt);
				openDialog(ui, false);
			});

			host.insertBefore(btn, host.firstChild);
		}
	}

	function hookFormatPanel(ui) {
		var format = ui.format;

		if (format == null || format.immediateRefresh == null) {
			return;
		}

		var current = format.immediateRefresh;
		var base = current.csharpUmlBase || current;

		var wrapped = function () {
			base.apply(this, arguments);
			addUpdateButton(ui, this);
		};

		wrapped.csharpUml = true;
		wrapped.csharpUmlBase = base;
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

	function ensureCsharpDialogCss() {
		if (document.getElementById('csharp-uml-dialog-style') != null) {
			return;
		}

		var style = document.createElement('style');
		style.id = 'csharp-uml-dialog-style';
		style.textContent = [
			'.geDialog.csharp-uml-dialog{background:#1e1e1e;color:#cccccc;border-color:#3c3c3c;}',
			'.geDialog.csharp-uml-dialog>.geButton{',
			'border-radius:50% !important;width:28px !important;height:28px !important;',
			'top:10px !important;right:10px !important;background-image:none !important;',
			'background-color:#3c3c3c !important;color:#d4d4d4 !important;',
			'display:flex !important;align-items:center !important;justify-content:center !important;',
			'font:600 16px/1 sans-serif !important;opacity:1 !important;padding:0 !important;}',
			'.geDialog.csharp-uml-dialog .csharp-uml-buttons{padding:8px 16px 4px;box-sizing:border-box;}',
			'.geDialog.csharp-uml-dialog>.geButton:focus{outline:2px solid #569cd6;outline-offset:2px;}'
		].join('');
		document.head.appendChild(style);
	}

	function grayBorderColor(color) {
		var match = String(color || '').match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);

		if (match == null) {
			return '#8a8a8a';
		}

		var channels = [Number(match[1]), Number(match[2]), Number(match[3])];
		var average = (channels[0] + channels[1] + channels[2]) / 3;

		return 'rgb(' + channels.map(function (channel) {
			return Math.max(0, Math.min(255, Math.round(channel * 0.7 + average * 0.3)));
		}).join(',') + ')';
	}

	function styleCsharpDialog(dlg) {
		ensureCsharpDialogCss();
		var dialog = dlg.container != null ? dlg.container.parentNode : null;

		if (dialog != null) {
			dialog.classList.add('csharp-uml-dialog');
			var closer = dialog.querySelector(':scope > .geButton');

			if (closer != null && closer.getAttribute('data-csharp-uml-close') == null) {
				closer.setAttribute('data-csharp-uml-close', '1');
				closer.tabIndex = 0;
				closer.textContent = '\u00d7';
			}
		}

		if (dlg.okButton != null && dlg.okButton.parentNode != null) {
			dlg.okButton.parentNode.classList.add('csharp-uml-buttons');
		}

		if (dlg.cancelBtn != null && window.getComputedStyle) {
			var gray = grayBorderColor(window.getComputedStyle(dlg.cancelBtn).borderTopColor);
			dlg.cancelBtn.style.color = gray;
			dlg.cancelBtn.style.borderColor = gray;
			dlg.cancelBtn.style.backgroundColor = 'transparent';
		}
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
		dlg.container.style.color = '#cccccc';

		var dialogEl = null;

		function isEscape(evt) {
			return evt.key === 'Escape' || evt.keyCode === 27;
		}

		function monacoWidgetOpen() {
			return document.querySelector('.suggest-widget.visible, .parameter-hints-widget.visible, .find-widget.visible') != null;
		}

		function onEscapeCapture(evt) {
			if (!isEscape(evt)) {
				return;
			}

			if (dialogEl == null || !dialogEl.isConnected) {
				document.removeEventListener('keydown', onEscapeCapture, true);
				return;
			}

			if (monacoWidgetOpen()) {
				return;
			}

			evt.preventDefault();
			evt.stopPropagation();
			var closer = dialogEl.querySelector(':scope > .geButton');

			if (closer != null) {
				closer.focus();
			}
		}

		function onEscapeBubble(evt) {
			if (isEscape(evt)) {
				evt.stopPropagation();
			}
		}

		ui.showDialog(dlg.container, 720, 560, true, true, function () {
			document.removeEventListener('keydown', onEscapeCapture, true);

			if (dialogEl != null) {
				dialogEl.removeEventListener('keydown', onEscapeBubble);
			}

			if (editor != null) {
				editor.dispose();
				editor = null;
			}
		});
		styleCsharpDialog(dlg);
		dialogEl = dlg.container.parentNode;

		if (dialogEl != null) {
			document.addEventListener('keydown', onEscapeCapture, true);
			dialogEl.addEventListener('keydown', onEscapeBubble);
		}

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
						classStyle(size.startSize, model)
					);
					cursor += size.width + 40;
				} else {
					var geo = cell.geometry.clone();
					geo.width = size.width;
					geo.height = size.height;
					var parked = parkRowEdges(graph, cell);
					graph.getModel().setValue(cell, userObject(model, source));
					graph.getModel().setStyle(cell, classStyle(size.startSize, model));
					graph.getModel().setGeometry(cell, geo);
					var kids = childVertices(graph, cell);

					if (kids.length) {
						graph.removeCells(kids, false);
					}

					fillCompartments(graph, cell, model, size.width);
					restoreRowEdges(graph, cell, parked);
					created.push(cell);
					continue;
				}

				fillCompartments(graph, cell, model, size.width);
				created.push(cell);
			}

			syncAllInherits(graph);
			syncAllRefs(graph);

			for (var n = 0; n < created.length; n++) {
				alignIncomingSides(graph, created[n]);
			}

			graph.setSelectionCells(created);
		} finally {
			graph.getModel().endUpdate();
		}
	}

	function childVertices(graph, cell) {
		var kids = graph.getChildCells(cell) || [];
		var vertices = [];

		for (var i = 0; i < kids.length; i++) {
			if (!graph.getModel().isEdge(kids[i])) {
				vertices.push(kids[i]);
			}
		}

		return vertices;
	}

	function rowKey(value) {
		if (value != null && value.nodeType === 1 && typeof value.getAttribute === 'function') {
			value = value.getAttribute('label') || '';
		}

		return visibleText(value || '').replace(/\s*\/\/.*$/, '').replace(/\s+/g, ' ').trim();
	}

	function parkRowEdges(graph, cell) {
		var model = graph.getModel();
		var kids = childVertices(graph, cell);
		var parked = [];

		for (var i = 0; i < kids.length; i++) {
			var kid = kids[i];
			var edges = graph.getConnections(kid) || [];
			var key = rowKey(model.getValue(kid));

			for (var e = 0; e < edges.length; e++) {
				var edge = edges[e];
				var asSource = model.getTerminal(edge, true) === kid;
				var asTarget = model.getTerminal(edge, false) === kid;

				parked.push({
					edge: edge,
					key: key,
					asSource: asSource,
					asTarget: asTarget,
					geometry: edge.geometry != null ? edge.geometry.clone() : null,
					style: model.getStyle(edge)
				});

				if (asSource) {
					model.setTerminal(edge, cell, true);
				}

				if (asTarget) {
					model.setTerminal(edge, cell, false);
				}
			}
		}

		return parked;
	}

	function classCellName(cell) {
		var value = cell != null ? cell.value : null;
		var label = '';

		if (value != null && value.nodeType === 1 && typeof value.getAttribute === 'function') {
			label = value.getAttribute('label') || '';
		} else if (value != null) {
			label = String(value);
		}

		return visibleText(label).replace(/<<[^<>]+>>/g, ' ').replace(/\s*\/\/.*$/, '').replace(/\s+/g, ' ').trim();
	}

	function classOwner(graph, terminal) {
		var cell = terminal;
		var root = graph.getDefaultParent();

		while (cell != null && cell !== root) {
			if (getPseudo(cell) !== '') {
				return cell;
			}

			cell = cell.parent;
		}

		return terminal;
	}

	function normalizeTypeName(name) {
		return String(name || '').replace(/\s+/g, '');
	}

	function stripGenerics(name) {
		var out = '';
		var depth = 0;

		for (var i = 0; i < name.length; i++) {
			var ch = name.charAt(i);

			if (ch === '<') {
				depth++;
			} else if (ch === '>') {
				depth = Math.max(0, depth - 1);
			} else if (depth === 0) {
				out += ch;
			}
		}

		return out;
	}

	function nameKeys(name) {
		var full = normalizeTypeName(name);
		var keys = [];

		if (full) {
			keys.push(full);
		}

		var simple = stripGenerics(full);

		if (simple && keys.indexOf(simple) < 0) {
			keys.push(simple);
		}

		return keys;
	}

	function sameTypeName(left, right) {
		var a = nameKeys(left);
		var b = nameKeys(right);

		for (var i = 0; i < a.length; i++) {
			if (b.indexOf(a[i]) >= 0) {
				return true;
			}
		}

		return false;
	}

	function indexClasses(graph) {
		var exact = {};
		var simple = {};
		var cells = childVertices(graph, graph.getDefaultParent());

		for (var i = 0; i < cells.length; i++) {
			var keys = nameKeys(classCellName(cells[i]));

			if (!keys.length) {
				continue;
			}

			if (exact[keys[0]] == null) {
				exact[keys[0]] = cells[i];
			}
		}

		for (var j = 0; j < cells.length; j++) {
			var parts = nameKeys(classCellName(cells[j]));

			if (parts.length > 1 && exact[parts[1]] == null && simple[parts[1]] == null) {
				simple[parts[1]] = cells[j];
			}
		}

		return { exact: exact, simple: simple };
	}

	function lookupClass(index, base) {
		var keys = nameKeys(base);

		for (var i = 0; i < keys.length; i++) {
			if (index.exact[keys[i]] != null) {
				return index.exact[keys[i]];
			}
		}

		for (var j = 0; j < keys.length; j++) {
			if (index.simple[keys[j]] != null) {
				return index.simple[keys[j]];
			}
		}

		var leaf = typeLeaf(base);

		if (leaf && index.exact[leaf] != null) {
			return index.exact[leaf];
		}

		if (leaf && index.simple[leaf] != null) {
			return index.simple[leaf];
		}

		return null;
	}

	function typeLeaf(name) {
		var simple = stripGenerics(normalizeTypeName(name));
		var parts = simple.split('.');
		return parts[parts.length - 1] || '';
	}

	function sameRefName(left, right) {
		if (sameTypeName(left, right)) {
			return true;
		}

		var a = typeLeaf(left);
		var b = typeLeaf(right);
		return a !== '' && a === b;
	}

	function isInheritEdge(edge) {
		var value = edge != null ? edge.value : null;

		return value != null && value.nodeType === 1 && typeof value.getAttribute === 'function' &&
			value.getAttribute('csharpInherit') === '1';
	}

	function inheritEdges(graph) {
		var cells = graph.getChildCells(graph.getDefaultParent()) || [];
		var edges = [];

		for (var i = 0; i < cells.length; i++) {
			if (graph.getModel().isEdge(cells[i]) && isInheritEdge(cells[i])) {
				edges.push(cells[i]);
			}
		}

		return edges;
	}

	function edgeLinks(graph, edge, child, parent) {
		var model = graph.getModel();
		var source = classOwner(graph, model.getTerminal(edge, true));
		var target = classOwner(graph, model.getTerminal(edge, false));

		return (source === child && target === parent) || (source === parent && target === child);
	}

	function modelForCell(cell) {
		var pseudo = getPseudo(cell);

		if (!pseudo) {
			return null;
		}

		var models = parseDocument(pseudo);
		var name = classCellName(cell);

		for (var i = 0; i < models.length; i++) {
			if (sameTypeName(models[i].name, name) || sameTypeName(models[i].simpleName, name)) {
				return models[i];
			}
		}

		return models.length === 1 ? models[0] : null;
	}

	function cellKind(cell) {
		var model = modelForCell(cell);

		if (model != null) {
			return model.kind;
		}

		return /<<\s*interface\s*>>/i.test(classCellName(cell)) ? 'interface' : '';
	}

	function inheritValue(child, base) {
		var obj = mxUtils.createXmlDocument().createElement('object');
		obj.setAttribute('label', '');
		obj.setAttribute('csharpInherit', '1');
		obj.setAttribute('childId', child.id);
		obj.setAttribute('parentName', normalizeTypeName(base));
		return obj;
	}

	function styleValue(style, key) {
		var match = new RegExp('(?:^|;)' + key + '=([^;]*)').exec(style || '');

		return match ? match[1] : null;
	}

	function setStyleValue(style, key, value) {
		var next = String(style || '');
		var pattern = new RegExp('(^|;)' + key + '=[^;]*');

		if (pattern.test(next)) {
			return next.replace(pattern, '$1' + key + '=' + value);
		}

		if (next && next.charAt(next.length - 1) !== ';') {
			next += ';';
		}

		return next + key + '=' + value + ';';
	}

	function inheritStyle(parent, index, count) {
		var style = cellKind(parent) === 'interface' ? IMPLEMENT_STYLE : INHERIT_STYLE;

		if (count > 1) {
			var slot = 0.3 + (0.4 * index / (count - 1));
			style = style.replace('exitX=0.5', 'exitX=' + slot.toFixed(2)).replace('entryX=0.5', 'entryX=' + slot.toFixed(2));
		}

		return style;
	}

	function applyConnectorStyle(graph, edge, parent, lineSpec) {
		var model = graph.getModel();
		var style = model.getStyle(edge) || '';
		var implement = cellKind(parent) === 'interface';
		var keys = ['exitX', 'exitY', 'exitDx', 'exitDy', 'entryX', 'entryY', 'entryDx', 'entryDy'];
		var saved = {};

		for (var i = 0; i < keys.length; i++) {
			saved[keys[i]] = styleValue(style, keys[i]);
		}

		style = setStyleValue(style, 'edgeStyle', 'orthogonalEdgeStyle');
		style = setStyleValue(style, 'rounded', '0');
		style = setStyleValue(style, 'orthogonalLoop', '1');
		style = setStyleValue(style, 'jettySize', 'auto');
		style = setStyleValue(style, 'html', '1');
		style = setStyleValue(style, 'endArrow', implement ? 'block' : 'classic');
		style = setStyleValue(style, 'endFill', implement ? '0' : '1');
		style = setStyleValue(style, 'dashed', '0');
		style = applyLinePattern(style, lineSpec);

		if (implement) {
			style = setStyleValue(style, 'endSize', '14');
		}

		for (var k = 0; k < keys.length; k++) {
			if (saved[keys[k]] != null) {
				style = setStyleValue(style, keys[k], saved[keys[k]]);
			}
		}

		model.setStyle(edge, style);
	}

	function syncInherits(graph, cell, bases, index) {
		var edges = inheritEdges(graph);
		var keep = {};

		for (var b = 0; b < bases.length; b++) {
			var parent = lookupClass(index, bases[b]);

			if (parent == null || parent === cell) {
				continue;
			}

			var found = null;

			for (var e = 0; e < edges.length; e++) {
				var edge = edges[e];
				var value = edge.value;

				if (value.getAttribute('childId') !== cell.id || normalizeTypeName(value.getAttribute('parentName')) !== normalizeTypeName(bases[b])) {
					continue;
				}

				if (edgeLinks(graph, edge, cell, parent)) {
					found = edge;
					break;
				}
			}

			var lineSpec = connectionLine(modelForCell(cell), '', modelForCell(parent), '');

			if (found != null) {
				keep[found.id] = true;
				applyConnectorStyle(graph, found, parent, lineSpec);
				continue;
			}

			graph.insertEdge(
				graph.getDefaultParent(),
				null,
				inheritValue(cell, bases[b]),
				cell,
				parent,
				applyLinePattern(inheritStyle(parent, b, bases.length), lineSpec)
			);
		}

		for (var r = 0; r < edges.length; r++) {
			var old = edges[r];

			if (old.value.getAttribute('childId') === cell.id && !keep[old.id]) {
				graph.removeCells([old], false);
			}
		}
	}

	function syncAllInherits(graph) {
		var index = indexClasses(graph);
		var cells = childVertices(graph, graph.getDefaultParent());

		for (var i = 0; i < cells.length; i++) {
			if (getPseudo(cells[i]) === '') {
				continue;
			}

			var model = modelForCell(cells[i]);
			syncInherits(graph, cells[i], model != null && model.bases ? model.bases : [], index);
		}
	}

	function refStyle(kind) {
		if (kind === 'aggregation') {
			return REF_EDGE + 'startArrow=diamond;startFill=0;startSize=20;endArrow=none;endFill=0;dashed=0;';
		}

		if (kind === 'association') {
			return REF_EDGE + 'startArrow=none;startFill=0;endArrow=open;endFill=0;endSize=14;dashed=0;';
		}

		if (kind === 'usage') {
			return REF_EDGE + 'startArrow=none;startFill=0;endArrow=open;endFill=0;endSize=14;dashed=1;';
		}

		return REF_EDGE + 'startArrow=diamond;startFill=1;startSize=20;endArrow=none;endFill=0;dashed=0;';
	}

	function isRefEdge(edge) {
		var value = edge != null ? edge.value : null;

		return value != null && value.nodeType === 1 && typeof value.getAttribute === 'function' &&
			value.getAttribute('csharpRef') === '1';
	}

	function refEdges(graph) {
		var cells = graph.getChildCells(graph.getDefaultParent()) || [];
		var edges = [];

		for (var i = 0; i < cells.length; i++) {
			if (graph.getModel().isEdge(cells[i]) && isRefEdge(cells[i])) {
				edges.push(cells[i]);
			}
		}

		return edges;
	}

	function refValue(owner, memberKey, ref) {
		var obj = mxUtils.createXmlDocument().createElement('object');
		obj.setAttribute('label', '');
		obj.setAttribute('csharpRef', '1');
		obj.setAttribute('ownerId', owner.id);
		obj.setAttribute('memberKey', memberKey);
		obj.setAttribute('targetName', normalizeTypeName(ref.name));
		obj.setAttribute('refKind', ref.kind);
		obj.setAttribute('refExplicit', ref.explicit ? '1' : '0');
		return obj;
	}

	function rememberRef(graph, edge, ref) {
		var value = edge.value;

		if (value == null || value.nodeType !== 1) {
			return;
		}

		value.setAttribute('targetName', normalizeTypeName(ref.name));
		value.setAttribute('refKind', ref.kind);
		value.setAttribute('refExplicit', ref.explicit ? '1' : '0');
		graph.getModel().setValue(edge, value);
	}

	function refCodeChanged(edge, ref) {
		var value = edge.value;
		return value.getAttribute('refKind') !== ref.kind ||
			(value.getAttribute('refExplicit') === '1') !== !!ref.explicit;
	}

	function isDiamondArrow(arrow) {
		return arrow === 'diamondThin' || arrow === 'diamond';
	}

	function refKindFromStyle(style) {
		var start = styleValue(style, 'startArrow');
		var end = styleValue(style, 'endArrow');

		if (isDiamondArrow(start)) {
			return styleValue(style, 'startFill') === '0' ? 'aggregation' : 'composition';
		}

		if (isDiamondArrow(end)) {
			return styleValue(style, 'endFill') === '0' ? 'aggregation' : 'composition';
		}

		if ((end && end !== 'none') || (start && start !== 'none')) {
			return 'association';
		}

		return null;
	}

	function applyLinePattern(style, lineSpec) {
		if (lineSpec == null) {
			return style;
		}

		var next = style || '';

		if (lineSpec.line === 'dashed') {
			next = setStyleValue(next, 'dashed', '1');
			next = setStyleValue(next, 'dashPattern', '8 8');
		} else if (lineSpec.line === 'dotted') {
			next = setStyleValue(next, 'dashed', '1');
			next = setStyleValue(next, 'dashPattern', '1 3');
		} else if (lineSpec.line === 'solid') {
			next = setStyleValue(next, 'dashed', '0');
		}

		if (lineSpec.lineColor) {
			next = setStyleValue(next, 'strokeColor', lineSpec.lineColor);
		}

		return next;
	}

	function memberByKey(model, key) {
		if (model == null || !key) {
			return null;
		}

		var members = (model.attributes || []).concat(model.operations || []);

		for (var i = 0; i < members.length; i++) {
			if (rowKey(members[i].text) === key) {
				return members[i];
			}
		}

		return null;
	}

	function lineFromEnd(model, memberKey) {
		var member = memberByKey(model, memberKey);

		return {
			line: (member && member.line) || (model && model.line) || '',
			lineColor: (member && member.lineColor) || (model && model.lineColor) || ''
		};
	}

	function connectionLine(ownerModel, ownerKey, foreignModel, foreignKey) {
		var owner = lineFromEnd(ownerModel, ownerKey);
		var foreign = lineFromEnd(foreignModel, foreignKey);

		return {
			line: owner.line || foreign.line,
			lineColor: owner.lineColor || foreign.lineColor
		};
	}

	function terminalLineKey(graph, terminal) {
		if (terminal == null || getPseudo(terminal) !== '') {
			return '';
		}

		return rowKey(graph.getModel().getValue(terminal));
	}

	function applyRefStyle(graph, edge, kind, forceKind, lineSpec) {
		var model = graph.getModel();
		var style = model.getStyle(edge) || '';
		var keepArrows = !forceKind && refKindFromStyle(style) != null;
		var saved = {};
		var keys = REF_POINT_KEYS.concat(keepArrows ? REF_ARROW_KEYS : []);

		for (var i = 0; i < keys.length; i++) {
			saved[keys[i]] = styleValue(style, keys[i]);
		}

		var next = keepArrows ? style : refStyle(kind);

		next = setStyleValue(next, 'edgeStyle', 'orthogonalEdgeStyle');
		next = setStyleValue(next, 'rounded', '0');
		next = setStyleValue(next, 'orthogonalLoop', '1');
		next = setStyleValue(next, 'jettySize', 'auto');
		next = setStyleValue(next, 'html', '1');

		for (var p = 0; p < REF_POINT_KEYS.length; p++) {
			if (saved[REF_POINT_KEYS[p]] != null) {
				next = setStyleValue(next, REF_POINT_KEYS[p], saved[REF_POINT_KEYS[p]]);
			}
		}

		if (keepArrows) {
			for (var a = 0; a < REF_ARROW_KEYS.length; a++) {
				if (saved[REF_ARROW_KEYS[a]] != null) {
					next = setStyleValue(next, REF_ARROW_KEYS[a], saved[REF_ARROW_KEYS[a]]);
				}
			}
		}

		if (styleValue(next, 'startArrow') === 'diamondThin') {
			next = setStyleValue(next, 'startArrow', 'diamond');
		}

		if (styleValue(next, 'endArrow') === 'diamondThin') {
			next = setStyleValue(next, 'endArrow', 'diamond');
		}

		model.setStyle(edge, applyLinePattern(next, lineSpec));
	}

	function findRow(graph, cell, key) {
		var kids = childVertices(graph, cell);

		for (var i = 0; i < kids.length; i++) {
			if (rowKey(graph.getModel().getValue(kids[i])) === key) {
				return kids[i];
			}
		}

		return null;
	}

	function foreignTerminal(graph, edge, row, target) {
		var model = graph.getModel();
		var ends = [model.getTerminal(edge, false), model.getTerminal(edge, true)];

		for (var i = 0; i < ends.length; i++) {
			var end = ends[i];

			if (end == null || end === row) {
				continue;
			}

			if (end === target || classOwner(graph, end) === target) {
				return end;
			}
		}

		return target;
	}

	function memberRefList(parsed) {
		var list = [];

		if (parsed == null) {
			return list;
		}

		var members = (parsed.attributes || []).concat(parsed.operations || []);

		for (var i = 0; i < members.length; i++) {
			var member = members[i];
			var key = rowKey(member.text);
			var refs = member.refs || [];

			for (var r = 0; r < refs.length; r++) {
				var ref = refs[r];
				var found = null;

				for (var existing = 0; existing < list.length; existing++) {
					if (list[existing].key === key && sameRefName(list[existing].name, ref.name)) {
						found = list[existing];
						break;
					}
				}

				if (found != null) {
					if (ref.explicit) {
						found.kind = ref.kind;
						found.explicit = true;
						found.name = ref.name;
					}
				} else {
					list.push({
						key: key,
						name: ref.name,
						kind: ref.kind,
						explicit: !!ref.explicit
					});
				}
			}
		}

		return list;
	}

	function syncRefs(graph, cell, parsed, index) {
		var wanted = memberRefList(parsed);
		var edges = refEdges(graph);
		var keep = {};

		for (var i = 0; i < wanted.length; i++) {
			var ref = wanted[i];
			var target = lookupClass(index, ref.name);

			if (target == null) {
				continue;
			}

			var row = findRow(graph, cell, ref.key);

			if (row == null) {
				continue;
			}

			var found = null;

			for (var e = 0; e < edges.length; e++) {
				var edge = edges[e];
				var value = edge.value;

				if (value.getAttribute('ownerId') !== cell.id || value.getAttribute('memberKey') !== ref.key) {
					continue;
				}

				if (!sameRefName(value.getAttribute('targetName'), ref.name)) {
					continue;
				}

				found = edge;
				break;
			}

			var lineSpec = connectionLine(
				parsed,
				ref.key,
				modelForCell(classOwner(graph, target)),
				''
			);

			if (found != null) {
				keep[found.id] = true;
				var model = graph.getModel();
				var foreign = foreignTerminal(graph, found, row, target);
				lineSpec = connectionLine(
					parsed,
					ref.key,
					modelForCell(classOwner(graph, foreign)),
					terminalLineKey(graph, foreign)
				);

				if (model.getTerminal(found, true) !== row) {
					model.setTerminal(found, row, true);
				}

				if (model.getTerminal(found, false) !== foreign) {
					model.setTerminal(found, foreign, false);
				}

				applyRefStyle(graph, found, ref.kind, refCodeChanged(found, ref), lineSpec);
				alignMemberHeight(graph, found, true);

				if (foreign !== target && foreign !== row) {
					alignMemberHeight(graph, found, model.getTerminal(found, true) === foreign);
				}

				rememberRef(graph, found, ref);
				continue;
			}

			var created = graph.insertEdge(
				graph.getDefaultParent(),
				null,
				refValue(cell, ref.key, ref),
				row,
				target,
				applyLinePattern(refStyle(ref.kind), lineSpec)
			);
			keep[created.id] = true;
		}

		for (var r = 0; r < edges.length; r++) {
			var old = edges[r];

			if (old.value.getAttribute('ownerId') === cell.id && !keep[old.id]) {
				graph.removeCells([old], false);
			}
		}
	}

	function syncAllRefs(graph) {
		var index = indexClasses(graph);
		var cells = childVertices(graph, graph.getDefaultParent());

		for (var i = 0; i < cells.length; i++) {
			if (getPseudo(cells[i]) === '') {
				continue;
			}

			syncRefs(graph, cells[i], modelForCell(cells[i]), index);
		}
	}

	function restoreRowEdges(graph, cell, parked) {
		var model = graph.getModel();
		var kids = childVertices(graph, cell);

		for (var i = 0; i < parked.length; i++) {
			var item = parked[i];
			var match = null;

			if (item.key) {
				for (var k = 0; k < kids.length; k++) {
					if (rowKey(model.getValue(kids[k])) === item.key) {
						match = kids[k];
						break;
					}
				}
			}

			if (match == null) {
				match = cell;
			}

			if (item.asSource) {
				model.setTerminal(item.edge, match, true);
			}

			if (item.asTarget) {
				model.setTerminal(item.edge, match, false);
			}

			if (item.geometry != null) {
				model.setGeometry(item.edge, item.geometry);
			}

			if (item.style != null) {
				model.setStyle(item.edge, item.style);
			}

			if (match !== cell) {
				if (item.asSource) {
					alignMemberHeight(graph, item.edge, true);
				}

				if (item.asTarget) {
					alignMemberHeight(graph, item.edge, false);
				}
			}
		}
	}

	function alignMemberHeight(graph, edge, asSource) {
		var model = graph.getModel();
		var style = model.getStyle(edge) || '';
		var xKey = asSource ? 'exitX' : 'entryX';
		var yKey = asSource ? 'exitY' : 'entryY';
		var dyKey = asSource ? 'exitDy' : 'entryDy';
		var x = parseFloat(styleValue(style, xKey));
		var y = parseFloat(styleValue(style, yKey));
		var onSide = !isNaN(x) && (x <= 0.05 || x >= 0.95);
		var onEnd = !isNaN(y) && (y <= 0.05 || y >= 0.95);

		if (!onSide || onEnd) {
			return;
		}

		style = setStyleValue(style, yKey, '0.5');
		style = setStyleValue(style, dyKey, '0');
		model.setStyle(edge, style);

		if (edge.geometry == null || edge.geometry.points == null) {
			return;
		}

		var geo = edge.geometry.clone();
		geo.points = null;
		model.setGeometry(edge, geo);
	}

	function alignIncomingSides(graph, cell) {
		var model = graph.getModel();
		var edges = graph.getConnections(cell) || [];

		for (var i = 0; i < edges.length; i++) {
			var edge = edges[i];

			if (model.getTerminal(edge, true) === cell) {
				alignClassSide(graph, edge, cell, true);
			}

			if (model.getTerminal(edge, false) === cell) {
				alignClassSide(graph, edge, cell, false);
			}
		}
	}

	function alignClassSide(graph, edge, cell, asSource) {
		var model = graph.getModel();
		var style = model.getStyle(edge) || '';
		var xKey = asSource ? 'exitX' : 'entryX';
		var yKey = asSource ? 'exitY' : 'entryY';
		var dyKey = asSource ? 'exitDy' : 'entryDy';
		var x = parseFloat(styleValue(style, xKey));
		var y = parseFloat(styleValue(style, yKey));
		var dy = parseFloat(styleValue(style, dyKey));
		var onSide = !isNaN(x) && (x <= 0.05 || x >= 0.95);
		var onEnd = !isNaN(y) && (y <= 0.05 || y >= 0.95);

		if (!onSide || onEnd || cell.geometry == null) {
			return;
		}

		y = headerFraction(cell);
		dy = 0;
		style = setStyleValue(style, yKey, String(y));
		style = setStyleValue(style, dyKey, '0');
		model.setStyle(edge, style);

		var targetY = anchorY(cell, edge, y, dy);
		var points = retargetEndY(edge.geometry, asSource, targetY);

		if (points == null) {
			return;
		}

		var geo = edge.geometry.clone();
		geo.points = points;
		model.setGeometry(edge, geo);
	}

	function headerFraction(cell) {
		var start = parseFloat(styleValue(cell.style || '', 'startSize'));
		var height = cell.geometry.height || 0;

		if (isNaN(start) || start <= 0) {
			start = 26;
		}

		if (height <= 0) {
			return 0.5;
		}

		return (start / 2) / height;
	}

	function anchorY(cell, edge, fraction, dy) {
		var local = (cell.geometry.y || 0) + (cell.geometry.height || 0) * fraction + dy;
		var current = cell.parent;
		var guard = 0;

		while (current != null && current !== edge.parent && guard < 30) {
			if (current.geometry != null && current.geometry.relative !== true) {
				local += current.geometry.y || 0;
			}

			current = current.parent;
			guard++;
		}

		return local;
	}

	function makePoint(x, y) {
		if (typeof mxPoint === 'function') {
			return new mxPoint(x, y);
		}

		return { x: x, y: y };
	}

	function retargetEndY(geometry, asSource, newY) {
		var src = geometry != null ? geometry.points : null;

		if (src == null || !src.length) {
			return null;
		}

		var points = [];

		for (var i = 0; i < src.length; i++) {
			var pt = src[i];
			points.push(pt.clone ? pt.clone() : makePoint(pt.x, pt.y));
		}

		var index = asSource ? 0 : points.length - 1;
		var oldY = points[index].y;

		if (Math.abs(oldY - newY) < 0.5) {
			return null;
		}

		var neighbor = asSource ? index + 1 : index - 1;
		points[index].y = newY;

		if (neighbor >= 0 && neighbor < points.length && Math.abs(points[neighbor].y - oldY) <= 0.5 && Math.abs(points[neighbor].x - points[index].x) >= 0.5) {
			var corner = makePoint(points[index].x, oldY);

			if (asSource) {
				points.splice(index + 1, 0, corner);
			} else {
				points.splice(index, 0, corner);
			}
		}

		return points;
	}

	function fillCompartments(graph, cell, model, width) {
		if (model.attributes.length) {
			for (var i = 0; i < model.attributes.length; i++) {
				addRow(graph, cell, model.attributes[i], width, model);
			}
		} else if (model.kind === 'enum') {
			addRow(graph, cell, { text: '', fontStyle: 0 }, width, model);
		}

		if (model.kind === 'enum') {
			return;
		}

		var divider = graph.insertVertex(cell, null, '', 0, 0, width, 8, DIVIDER_STYLE);
		divider.setConnectable(false);

		for (var j = 0; j < model.operations.length; j++) {
			addRow(graph, cell, model.operations[j], width, model);
		}
	}

	function addRow(graph, cell, member, width, model) {
		var style = ROW_STYLE;

		if (member.fontStyle) {
			style += 'fontStyle=' + member.fontStyle + ';';
		}

		style += paintStyle({
			fill: member.fill || (model && model.fill) || '',
			fontColor: member.fontColor || (model && model.fontColor) || ''
		});
		graph.insertVertex(cell, null, member.text, 0, 0, width, 26, style);
	}

	function classStyle(startSize, model) {
		return CLASS_STYLE.replace('START', String(startSize)) + paintStyle(model);
	}

	function paintStyle(item) {
		if (item == null) {
			return '';
		}

		var style = '';

		if (item.fill) {
			style += 'fillColor=' + item.fill + ';';
		}

		if (item.fontColor) {
			style += 'fontColor=' + item.fontColor + ';';
		}

		return style;
	}

	function userObject(model, source) {
		var obj = mxUtils.createXmlDocument().createElement('object');
		obj.setAttribute('label', headerLabel(model));
		obj.setAttribute('pseudo', source);
		obj.setAttribute('tooltip', formatPseudoTooltip(source));
		return obj;
	}

	function headerLabel(model) {
		var lines = model.stereotypes.map(function (stereotype) {
			return '&lt;&lt;' + escapeHtml(stereotype) + '&gt;&gt;';
		});
		var name = escapeHtml(model.name);
		lines.push((model.italic ? '<b><i>' + name + '</i></b>' : '<b>' + name + '</b>') + formatComment(model.comment));
		return lines.join('<br>');
	}

	function measure(model) {
		var lines = model.stereotypes.map(function (stereotype) {
			return '<<' + stereotype + '>>';
		});
		lines.push(model.name + (model.comment ? ' ' + model.comment : ''));
		model.attributes.concat(model.operations).forEach(function (member) {
			lines.push(visibleText(member.text));
		});

		var longest = 0;

		for (var i = 0; i < lines.length; i++) {
			longest = Math.max(longest, lines[i].length);
		}

		var lineCount = model.stereotypes.length + 1;
		var attributeRows = model.kind === 'enum' ? Math.max(model.attributes.length, 1) : model.attributes.length;
		var methodHeight = model.kind === 'enum' ? 0 : 8 + model.operations.length * 26;

		return {
			width: Math.max(180, Math.min(520, Math.ceil(longest * 7.4 + 32))),
			height: Math.max(26, 8 + lineCount * 18) +
				attributeRows * 26 +
				methodHeight,
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
		var lines = stripBlockComments(String(src || '')).split(/\r?\n/);
		var classes = [];
		var current = null;
		var skipDepth = 0;
		var propertyDepth = 0;
		var propertyAccessors = blankAccessors();
		var propertyMember = null;
		var pendingBody = null;
		var pendingMember = null;
		var expectClassBrace = false;
		var bodyMember = null;
		var bodyChunks = [];

		function pushMember(member) {
			if (member.kind === 'operation') {
				current.operations.push(member);
			} else if (member.kind === 'property') {
				current.properties.push(member);
			} else {
				current.attributes.push(member);
			}
		}

		function placeAsProperty(member) {
			if (!member || current == null) {
				return;
			}

			var index = current.attributes.indexOf(member);

			if (index >= 0) {
				current.attributes.splice(index, 1);
			}

			if (current.properties.indexOf(member) < 0) {
				member.kind = 'property';
				current.properties.push(member);
			}
		}

		function rememberBody(member, text) {
			if (!member || !text) {
				return;
			}

			var own = current ? [current.name, current.simpleName] : [];
			bodyUses(text).forEach(function (name) {
				if (namesConnected(own, name)) {
					return;
				}

				member.bodyUses = member.bodyUses || [];

				if (!namesConnected(member.bodyUses, name)) {
					member.bodyUses.push(name);
				}
			});
		}

		function finishBody() {
			if (bodyMember) {
				rememberBody(bodyMember, bodyChunks.join('\n'));
			}

			bodyMember = null;
			bodyChunks = [];
		}

		function finishClass() {
			finishBody();

			if (propertyDepth > 0 && propertyMember) {
				ensureReadOnly(propertyMember, propertyAccessors.get && !propertyAccessors.set);
			}

			if (current != null) {
				current.operations = (current.properties || []).concat(current.operations || []);
				current.properties = [];
				finalizeClassRefs(current);
				classes.push(current);
				current = null;
			}
		}

		for (var i = 0; i < lines.length; i++) {
			var split = takeLineComment(lines[i]);
			var code = String(split.code || '').trim();

			if (skipDepth > 0) {
				if (code) {
					if (bodyMember) {
						bodyChunks.push(code);
					}

					skipDepth = inspectBlock(code, skipDepth).depth;
				}

				if (skipDepth === 0) {
					finishBody();
				}
				continue;
			}

			if (propertyDepth > 0) {
				if (code) {
					var walked = inspectBlock(code, propertyDepth);
					propertyAccessors.get = propertyAccessors.get || walked.accessors.get;
					propertyAccessors.set = propertyAccessors.set || walked.accessors.set;
					propertyDepth = walked.depth;
				}

				if (propertyDepth === 0 && propertyMember) {
					ensureReadOnly(propertyMember, propertyAccessors.get && !propertyAccessors.set);
					propertyMember = null;
				}
				continue;
			}

			if (!code || code === ';') {
				continue;
			}

			if (expectClassBrace && code.charAt(0) === '{') {
				expectClassBrace = false;
				code = code.slice(1).trim();

				if (!code || code === '}') {
					continue;
				}
			} else if (expectClassBrace && code !== '}') {
				expectClassBrace = false;
			}

			if (pendingBody && code.charAt(0) === '{') {
				var opened = inspectBlock(code, 0);

				if (pendingBody === 'method') {
					skipDepth = opened.depth;
					bodyMember = pendingMember;
					bodyChunks = code === '{' ? [] : [code];
					pendingBody = null;
					pendingMember = null;
					propertyMember = null;

					if (skipDepth === 0) {
						finishBody();
					}
				} else {
					placeAsProperty(propertyMember);
					propertyAccessors = opened.accessors;
					propertyDepth = opened.depth;
					pendingBody = null;

					if (propertyDepth === 0 && propertyMember) {
						ensureReadOnly(propertyMember, propertyAccessors.get && !propertyAccessors.set);
						propertyMember = null;
					}
				}
				continue;
			}

			pendingBody = null;
			pendingMember = null;
			propertyMember = null;

			if (code === '{' || code === '}') {
				continue;
			}

			if (/^(using|namespace)\b/i.test(code) || /^\[[^\]]*\]$/.test(code)) {
				continue;
			}

			var terminated = /;\s*$/.test(code);
			var headerLine = code.replace(/\{\s*$/, '').trim().replace(/;+\s*$/, '').trim();
			var headerPaint = extractRefs(headerLine);
			var header = parseHeader(headerPaint.text);

			if (header != null) {
				header.fill = headerPaint.fill;
				header.fontColor = headerPaint.color;
				header.line = headerPaint.line;
				header.lineColor = headerPaint.lineColor;
				header.comment = split.comment;
				finishClass();
				skipDepth = 0;
				propertyDepth = 0;
				current = header;
				expectClassBrace = code.indexOf('{') < 0;
				continue;
			}

			if (current == null) {
				continue;
			}

			var cleaned = cleanLine(code);
			var separated = separateBody(cleaned);
			var member = parseMember(separated.signature, current, split.comment);

			if (separated.kind === 'method') {
				if (member) {
					pushMember(member);

					if (separated.unclosed > 0) {
						bodyMember = member;
						bodyChunks = separated.body ? [separated.body] : [];
						skipDepth = separated.unclosed;
					} else {
						rememberBody(member, separated.body || '');
					}
				} else {
					skipDepth = separated.unclosed;
				}
				continue;
			}

			if (separated.kind === 'property') {
				if (member) {
					member.kind = 'property';
					pushMember(member);
					propertyAccessors = separated.accessors;
					propertyDepth = separated.unclosed;

					if (propertyDepth === 0) {
						ensureReadOnly(member, propertyAccessors.get && !propertyAccessors.set);
					} else {
						propertyMember = member;
					}
				}
				continue;
			}

			if (member == null) {
				continue;
			}

			pushMember(member);

			if (!terminated && code.indexOf('{') < 0 && !hasExpressionBody(code)) {
				pendingBody = member.kind === 'operation' ? 'method' : 'property';
				propertyMember = pendingBody === 'property' ? member : null;
				pendingMember = pendingBody === 'method' ? member : null;
			}
		}

		finishClass();
		return classes;
	}

	function blankAccessors() {
		return { get: false, set: false };
	}

	function orAccessors(left, right) {
		return {
			get: !!(left && left.get) || !!(right && right.get),
			set: !!(left && left.set) || !!(right && right.set)
		};
	}

	function ensureReadOnly(member, getOnly) {
		if (!member || !getOnly || member.text.indexOf('{readOnly}') >= 0) {
			return;
		}

		var commentAt = member.text.indexOf(' <font');

		if (commentAt >= 0) {
			member.text = member.text.slice(0, commentAt) + ' {readOnly}' + member.text.slice(commentAt);
		} else {
			member.text += ' {readOnly}';
		}
	}

	function hasExpressionBody(line) {
		var quote = '';

		for (var i = 0; i < line.length - 1; i++) {
			var ch = line.charAt(i);

			if (quote) {
				if (ch === '\\') {
					i++;
				} else if (ch === quote) {
					quote = '';
				}
				continue;
			}

			if (ch === '"' || ch === '\'') {
				quote = ch;
				continue;
			}

			if (ch === '=' && line.charAt(i + 1) === '>') {
				return true;
			}
		}

		return false;
	}

	function readBlock(line, openIndex) {
		var depth = 0;
		var quote = '';

		for (var i = openIndex; i < line.length; i++) {
			var ch = line.charAt(i);

			if (quote) {
				if (ch === '\\') {
					i++;
				} else if (ch === quote) {
					quote = '';
				}
				continue;
			}

			if (ch === '"' || ch === '\'') {
				quote = ch;
				continue;
			}

			if (ch === '{') {
				depth++;
			} else if (ch === '}') {
				depth--;

				if (depth === 0) {
					return {
						closed: true,
						end: i + 1,
						inner: line.slice(openIndex + 1, i),
						net: 0
					};
				}
			}
		}

		return {
			closed: false,
			end: line.length,
			inner: line.slice(openIndex + 1),
			net: depth
		};
	}

	function inspectBlock(text, startDepth) {
		var depth = startDepth;
		var quote = '';
		var buf = '';
		var accessors = blankAccessors();

		function flush() {
			if (depth !== 1) {
				buf = '';
				return;
			}

			var match = buf.trim().replace(/^(public|private|protected|internal)\s+/i, '').match(/^(get|set|init)\b/i);

			if (match) {
				if (match[1].toLowerCase() === 'get') {
					accessors.get = true;
				} else {
					accessors.set = true;
				}
			}

			buf = '';
		}

		for (var i = 0; i < text.length; i++) {
			var ch = text.charAt(i);

			if (quote) {
				if (ch === '\\') {
					i++;
				} else if (ch === quote) {
					quote = '';
				}
				continue;
			}

			if (ch === '"' || ch === '\'') {
				quote = ch;
				continue;
			}

			if (ch === '{') {
				flush();
				depth++;
			} else if (ch === '}') {
				flush();
				depth = Math.max(0, depth - 1);
			} else if (depth === 1) {
				if (ch === ';') {
					flush();
				} else {
					buf += ch;
				}
			}
		}

		flush();
		return { depth: depth, accessors: accessors };
	}

	function separateBody(line) {
		var quote = '';
		var paren = 0;
		var sawParen = false;

		for (var i = 0; i < line.length; i++) {
			var ch = line.charAt(i);

			if (quote) {
				if (ch === '\\') {
					i++;
				} else if (ch === quote) {
					quote = '';
				}
				continue;
			}

			if (ch === '"' || ch === '\'') {
				quote = ch;
				continue;
			}

			if (ch === '(') {
				paren++;
				sawParen = true;
				continue;
			}

			if (ch === ')') {
				paren = Math.max(0, paren - 1);
				continue;
			}

			if (ch !== '{' || paren !== 0) {
				continue;
			}

			var block = readBlock(line, i);

			if (!block.closed) {
				var opened = line.slice(0, i).trim();

				if (sawParen) {
					return { signature: opened, kind: 'method', unclosed: block.net, body: block.inner, accessors: blankAccessors() };
				}

				var scannedOpen = inspectBlock(line.slice(i), 0);
				return {
					signature: opened,
					kind: 'property',
					unclosed: scannedOpen.depth,
					accessors: scannedOpen.accessors
				};
			}

			var nested = block.inner.indexOf('{') >= 0;
			var classified = nested ? { kind: 'body' } : classifyBrace(block.inner);

			if (!nested && (classified.kind === 'suffix' || classified.kind === 'accessor')) {
				i = block.end - 1;
				continue;
			}

			var beforeText = line.slice(0, i);
			var afterSplit = separateBody(line.slice(block.end));

			if (sawParen) {
				return {
					signature: (beforeText + ' ' + afterSplit.signature).trim(),
					kind: 'method',
					unclosed: afterSplit.unclosed,
					body: block.inner + (afterSplit.body || ''),
					accessors: afterSplit.accessors
				};
			}

			var scanned = inspectBlock(block.inner, 1);
			return {
				signature: (beforeText + ' ' + afterSplit.signature).trim(),
				kind: afterSplit.kind === 'method' ? 'method' : 'property',
				unclosed: afterSplit.unclosed,
				accessors: orAccessors(scanned.accessors, afterSplit.accessors)
			};
		}

		return { signature: String(line || '').trim(), kind: null, unclosed: 0, accessors: blankAccessors() };
	}

	function stripBlockComments(src) {
		return src.replace(/\/\*[\s\S]*?\*\//g, '');
	}

	function takeLineComment(raw) {
		var line = String(raw || '');
		var quote = '';

		for (var i = 0; i < line.length - 1; i++) {
			var ch = line.charAt(i);

			if (quote) {
				if (ch === '\\') {
					i++;
				} else if (ch === quote) {
					quote = '';
				}

				continue;
			}

			if (ch === '"' || ch === '\'') {
				quote = ch;
				continue;
			}

			if (ch === '/' && line.charAt(i + 1) === '/') {
				return {
					code: line.slice(0, i),
					comment: line.slice(i).trim()
				};
			}
		}

		return { code: line, comment: '' };
	}

	function formatComment(comment) {
		if (!comment) {
			return '';
		}

		return ' <font color="#008000">' + escapeHtml(comment) + '</font>';
	}

	function visibleText(value) {
		return String(value)
			.replace(/<[^>]*>/g, '')
			.replace(/&nbsp;/g, ' ')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&amp;/g, '&');
	}

	function cleanLine(raw) {
		var line = String(raw || '').trim();
		line = line.replace(/;+\s*$/, '').trim();
		return line;
	}

	function stripStatementSemicolons(text) {
		var quote = '';
		var depth = 0;
		var out = '';

		for (var i = 0; i < text.length; i++) {
			var ch = text.charAt(i);

			if (quote) {
				out += ch;

				if (ch === '\\' && i + 1 < text.length) {
					out += text.charAt(++i);
				} else if (ch === quote) {
					quote = '';
				}

				continue;
			}

			if (ch === '"' || ch === '\'') {
				quote = ch;
				out += ch;
				continue;
			}

			if (ch === '(' || ch === '[' || ch === '{') {
				depth++;
			} else if (ch === ')' || ch === ']' || ch === '}') {
				depth = Math.max(0, depth - 1);
			} else if (ch === ';' && depth === 0) {
				continue;
			}

			out += ch;
		}

		return out.replace(/[ \t]{2,}/g, ' ').trim();
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

		if (!declared.length) {
			if (kind === 'interface') {
				pushStereotype(stereotypes, 'interface');
			}

			if (kind === 'enum') {
				pushStereotype(stereotypes, 'enum');
			}

			if (kind === 'struct') {
				pushStereotype(stereotypes, 'struct');
			}

			if (modifiers.indexOf('abstract') >= 0) {
				pushStereotype(stereotypes, 'abstract');
			}
		}

		for (var s = 0; s < declared.length; s++) {
			pushStereotype(stereotypes, declared[s]);
		}

		var italic = kind === 'interface' || modifiers.indexOf('abstract') >= 0 || stereotypes.some(function (stereotype) {
			var key = stereotype.toLowerCase();
			return key === 'abstract' || key === 'interface';
		});

		return {
			kind: kind,
			name: name,
			simpleName: match[2],
			bases: parseBases(match[4]),
			stereotypes: stereotypes,
			italic: italic,
			defaultVisibility: kind === 'interface' ? '+' : (kind === 'enum' ? '' : '-'),
			attributes: [],
			properties: [],
			operations: []
		};
	}

	function parseBases(tail) {
		var text = String(tail || '').replace(/<<\s*[^<>]+?\s*>>/g, ' ');
		var colon = text.indexOf(':');

		if (colon < 0) {
			return [];
		}

		return splitTopLevel(text.slice(colon + 1)).map(function (part) {
			return part.trim();
		}).filter(function (part) {
			return /^[A-Za-z_]/.test(part);
		});
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

	function stripArrays(text) {
		return String(text || '').trim().replace(/(\[\s*\]|\?)+$/g, '').trim();
	}

	function extractRefs(line) {
		var refs = [];
		var quote = '';
		var out = '';
		var fill = '';
		var color = '';
		var linePattern = '';
		var lineColor = '';

		for (var i = 0; i < line.length; i++) {
			var ch = line.charAt(i);

			if (quote) {
				out += ch;

				if (ch === '\\' && i + 1 < line.length) {
					out += line.charAt(++i);
				} else if (ch === quote) {
					quote = '';
				}

				continue;
			}

			if (ch === '"' || ch === '\'') {
				quote = ch;
				out += ch;
				continue;
			}

			if (ch === '\u00A7') {
				var parsed = readRefMarker(line, i + 1);

				if (parsed != null) {
					if (parsed.paint) {
						if (parsed.paint.key === 'fill') {
							fill = parsed.paint.value;
						} else if (parsed.paint.key === 'color') {
							color = parsed.paint.value;
						} else if (parsed.paint.key === 'line') {
							linePattern = parsed.paint.value;
						} else {
							lineColor = parsed.paint.value;
						}
					} else {
						refs.push(parsed.ref);
					}

					i = parsed.end - 1;
					continue;
				}
			}

			out += ch;
		}

		return {
			text: out.replace(/[ \t]{2,}/g, ' ').trim(),
			refs: refs,
			fill: fill,
			color: color,
			line: linePattern,
			lineColor: lineColor
		};
	}

	function readLinePattern(line, start) {
		var i = start;

		while (i < line.length && /\s/.test(line.charAt(i))) {
			i++;
		}

		var match = /^(solid|dashed|dotted)\b/i.exec(line.slice(i));

		if (match == null) {
			return null;
		}

		return {
			end: i + match[0].length,
			value: match[1].toLowerCase()
		};
	}

	function readPaint(line, start) {
		var i = start;

		while (i < line.length && /\s/.test(line.charAt(i))) {
			i++;
		}

		var token = '';

		if (line.charAt(i) === '#') {
			token = '#';
			i++;

			while (i < line.length && /[0-9A-Fa-f]/.test(line.charAt(i))) {
				token += line.charAt(i);
				i++;
			}
		} else {
			while (i < line.length && /[A-Za-z0-9-]/.test(line.charAt(i))) {
				token += line.charAt(i);
				i++;
			}
		}

		var value = resolvePaint(token);

		if (value == null) {
			return null;
		}

		return { end: i, value: value };
	}

	function resolvePaint(token) {
		if (!token || token === '#') {
			return null;
		}

		var named = PALETTE[token.toLowerCase()];

		if (named) {
			return named;
		}

		if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(token)) {
			return token.toLowerCase();
		}

		if (/^[0-9A-Fa-f]{6}$/.test(token) || /^[0-9A-Fa-f]{3}$/.test(token) || /^[0-9A-Fa-f]{8}$/.test(token)) {
			return '#' + token.toLowerCase();
		}

		if (/^[A-Za-z][A-Za-z0-9-]*$/.test(token)) {
			return token.toLowerCase();
		}

		return null;
	}

	function readRefMarker(line, start) {
		var i = start;

		while (i < line.length && /\s/.test(line.charAt(i))) {
			i++;
		}

		var paintMatch = /^(line(?:\s*\.\s*color)?|fill|color)\s*:/i.exec(line.slice(i));

		if (paintMatch) {
			var paintKey = paintMatch[1].toLowerCase().replace(/\s+/g, '');
			var paint = paintKey === 'line'
				? readLinePattern(line, i + paintMatch[0].length)
				: readPaint(line, i + paintMatch[0].length);

			if (paint == null) {
				return null;
			}

			return {
				end: paint.end,
				paint: {
					key: paintKey === 'line.color' ? 'lineColor' : paintKey,
					value: paint.value
				}
			};
		}

		var kind = 'association';
		var kindMatch = /^(association|aggregation|composition|assoc|agg|comp)\b/i.exec(line.slice(i));

		if (kindMatch) {
			var j = i + kindMatch[0].length;

			while (j < line.length && /\s/.test(line.charAt(j))) {
				j++;
			}

			if (line.charAt(j) === ':') {
				kind = REF_KIND[kindMatch[1].toLowerCase()];
				i = j + 1;
			} else {
				return {
					end: i + kindMatch[0].length,
					ref: {
						name: '',
						kind: REF_KIND[kindMatch[1].toLowerCase()],
						explicit: true,
						contextual: true
					}
				};
			}
		}

		while (i < line.length && /\s/.test(line.charAt(i))) {
			i++;
		}

		var type = readTypeToken(line, i);

		if (type == null) {
			if (kindMatch) {
				return {
					end: j + 1,
					ref: {
						name: '',
						kind: kind,
						explicit: true,
						contextual: true
					}
				};
			}

			return null;
		}

		return {
			end: type.end,
			ref: {
				name: stripArrays(type.name).replace(/\s+/g, ''),
				kind: kind,
				explicit: true,
				named: true
			}
		};
	}

	function readTypeToken(line, start) {
		var i = start;

		if (!/[A-Za-z_]/.test(line.charAt(i) || '')) {
			return null;
		}

		while (i < line.length && /[\w.]/.test(line.charAt(i))) {
			i++;
		}

		if (line.charAt(i) === '<') {
			var depth = 0;

			for (; i < line.length; i++) {
				var ch = line.charAt(i);

				if (ch === '<') {
					depth++;
				} else if (ch === '>') {
					depth--;

					if (depth === 0) {
						i++;
						break;
					}
				}
			}
		}

		while (line.charAt(i) === '?' || (line.charAt(i) === '[' && line.charAt(i + 1) === ']')) {
			i += line.charAt(i) === '?' ? 1 : 2;
		}

		return {
			name: line.slice(start, i).replace(/\s+/g, ''),
			end: i
		};
	}

	function typeCandidates(type) {
		var names = [];

		function add(name) {
			var clean = stripArrays(String(name || '').replace(/\s+/g, ''));
			var leaf = typeLeaf(clean).toLowerCase();

			if (!/^[A-Za-z_][\w.]*$/.test(clean) || NON_REF[leaf] || names.indexOf(clean) >= 0) {
				return;
			}

			names.push(clean);
		}

		function walk(src) {
			var text = stripArrays(String(src || '').trim());

			if (!text) {
				return;
			}

			var depth = 0;
			var genericAt = -1;

			for (var i = 0; i < text.length; i++) {
				var ch = text.charAt(i);

				if (ch === '<') {
					if (depth === 0) {
						genericAt = i;
					}

					depth++;
				} else if (ch === '>') {
					depth--;
				}
			}

			if (genericAt < 0) {
				add(text);
				return;
			}

			add(text.slice(0, genericAt));
			var close = text.lastIndexOf('>');
			var inner = close > genericAt ? text.slice(genericAt + 1, close) : '';
			splitTopLevel(inner).forEach(walk);
		}

		walk(type);
		return names;
	}

	function mergeRef(refs, ref) {
		if (ref == null || !ref.name) {
			return;
		}

		for (var i = 0; i < refs.length; i++) {
			if (sameRefName(refs[i].name, ref.name)) {
				if (ref.explicit) {
					refs[i].name = ref.name;
					refs[i].kind = ref.kind;
					refs[i].explicit = true;
				}

				if (ref.named) {
					refs[i].named = true;
				}

				if (ref.role && !refs[i].role) {
					refs[i].role = ref.role;
				}

				return;
			}
		}

		refs.push({
			name: ref.name,
			kind: ref.kind,
			explicit: !!ref.explicit,
			named: !!ref.named,
			role: ref.role || ''
		});
	}

	function attachRefs(member, refs, types, paramTypes) {
		var named = [];
		var contextKind = null;

		for (var i = 0; i < (refs || []).length; i++) {
			if (refs[i].contextual) {
				contextKind = refs[i].kind;
			} else if (refs[i].name) {
				named.push(refs[i]);
			}
		}

		var list = [];

		for (var t = 0; t < (types || []).length; t++) {
			var candidates = typeCandidates(types[t]);

			for (var c = 0; c < candidates.length; c++) {
				mergeRef(list, {
					name: candidates[c],
					kind: contextKind || 'composition',
					explicit: contextKind != null,
					role: 'member'
				});
			}
		}

		for (var p = 0; p < (paramTypes || []).length; p++) {
			var paramCandidates = typeCandidates(paramTypes[p]);

			for (var k = 0; k < paramCandidates.length; k++) {
				mergeRef(list, {
					name: paramCandidates[k],
					kind: 'association',
					explicit: false,
					role: 'param'
				});
			}
		}

		for (var n = 0; n < named.length; n++) {
			mergeRef(list, named[n]);
		}

		member.refs = list;
		return member;
	}

	function namesConnected(names, name) {
		for (var i = 0; i < names.length; i++) {
			if (sameRefName(names[i], name)) {
				return true;
			}
		}

		return false;
	}

	function finalizeClassRefs(model) {
		var fields = [];

		(model.attributes || []).forEach(function (attr) {
			(attr.refs || []).forEach(function (ref) {
				if (ref.name) {
					fields.push(ref.name);
				}
			});
		});

		(model.operations || []).forEach(function (op) {
			var kept = [];

			(op.refs || []).forEach(function (ref) {
				if (ref.role === 'param' && !ref.named && namesConnected(fields, ref.name)) {
					return;
				}

				kept.push(ref);
			});

			var have = kept.map(function (ref) {
				return ref.name;
			});

			(op.bodyUses || []).forEach(function (name) {
				if (namesConnected(fields, name) || namesConnected(have, name)) {
					return;
				}

				kept.push({
					name: name,
					kind: 'usage',
					explicit: false,
					role: 'body'
				});
				have.push(name);
			});

			op.refs = kept;
		});
	}

	function bodyUses(text) {
		var src = String(text || '')
			.replace(/"(?:\\.|[^"\\])*"/g, '""')
			.replace(/'(?:\\.|[^'\\])*'/g, "''");
		var found = [];
		var hits = [];

		function collect(re) {
			var match;

			re.lastIndex = 0;

			while ((match = re.exec(src))) {
				hits.push({ index: match.index, type: match[1] });
			}
		}

		collect(/\bnew\s+([A-Za-z_][\w.]*(?:\s*<[^;{}()]*>)?)/g);
		collect(/\b(?:is|as)\s+([A-Za-z_][\w.]*(?:\s*<[^;{}()]*>)?)/g);
		collect(/\(\s*([A-Za-z_][\w.]*(?:\s*<[^;{}()]*>)?(?:\s*\[\s*\])*)\s*\)/g);
		collect(/(?:^|[{};(,])\s*(?:(?:public|private|protected|internal|static|readonly|const|out|ref)\s+)*([A-Za-z_][\w.]*(?:\s*<[^;{}()]*>)?(?:\s*\[\s*\])*\??)\s+[A-Za-z_]\w*/gm);
		collect(/\b([A-Z][\w.]*)\s*\./g);
		hits.sort(function (left, right) {
			return left.index - right.index;
		});

		var notType = {
			new: true, return: true, if: true, else: true, for: true, foreach: true, while: true,
			do: true, switch: true, case: true, break: true, continue: true, throw: true, try: true,
			catch: true, finally: true, lock: true, using: true, fixed: true, this: true, base: true,
			true: true, false: true, null: true, typeof: true, await: true, yield: true, var: true
		};

		hits.forEach(function (hit) {
			var head = String(hit.type || '').split(/[.<]/)[0].toLowerCase();

			if (notType[head]) {
				return;
			}

			typeCandidates(hit.type).forEach(function (name) {
				if (found.indexOf(name) < 0) {
					found.push(name);
				}
			});
		});

		return found;
	}

	function parseMember(line, typeModel, comment) {
		var extracted = extractRefs(line);
		var explicitRefs = extracted.refs;
		line = stripStatementSemicolons(extracted.text);
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

		var visibility = typeModel.kind === 'enum' ? '' : (mods.visibility || typeModel.defaultVisibility);
		var fontStyle = (flags.abstract ? 2 : 0) + (flags.static ? 4 : 0);
		var suffixText = escapeHtml(formatSuffixes(peeled.suffixes, flags)) + formatComment(comment);

		if (hasParen(mods.rest)) {
			var operation = parseOperation(mods.rest, typeModel.simpleName);
			var shown = operation.isConstructor ? '&lt;&lt;constructor&gt;&gt;' : escapeHtml(operation.name);
			var text = withVisibility(visibility, shown + '(' + operation.params + ')');

			if (operation.type && !operation.isConstructor) {
				text += ': ' + escapeHtml(operation.type);
			}

			return attachRefs({
				kind: 'operation',
				text: text + suffixText,
				fontStyle: fontStyle,
				fill: extracted.fill,
				fontColor: extracted.color,
				line: extracted.line,
				lineColor: extracted.lineColor
			}, explicitRefs, operation.type && !operation.isConstructor ? [operation.type] : [], operation.paramTypes);
		}

		var assigned = splitInitializer(mods.rest);
		var named = splitTypeAndName(assigned.text);

		if (!named.name) {
			return null;
		}

		var field = withVisibility(visibility, escapeHtml(named.name));

		if (named.type) {
			field += ': ' + escapeHtml(named.type);
		}

		if (assigned.value) {
			field += ' = ' + escapeHtml(assigned.value);
		}

		var isProperty = (stripped.expression && !hasParen(mods.rest)) ||
			peeled.accessors.get || peeled.accessors.set;

		return attachRefs({
			kind: isProperty ? 'property' : 'attribute',
			text: field + suffixText,
			fontStyle: fontStyle,
			fill: extracted.fill,
			fontColor: extracted.color,
			line: extracted.line,
			lineColor: extracted.lineColor
		}, explicitRefs, named.type ? [named.type] : []);
	}

	function withVisibility(visibility, text) {
		return visibility ? visibility + ' ' + text : text;
	}

	function parseOperation(rest, className) {
		var open = rest.indexOf('(');
		var head = rest.slice(0, open).trim();
		var close = rest.lastIndexOf(')');
		var paramsSrc = close > open ? rest.slice(open + 1, close) : rest.slice(open + 1);
		var named = splitTypeAndName(head);

		var paramTypes = [];

		splitTopLevel(paramsSrc).forEach(function (param) {
			var value = stripDefault(param).replace(/^(out|ref|in|params|this)\s+/i, '').trim();
			var paramNamed = splitTypeAndName(value);

			if (paramNamed.type) {
				paramTypes.push(paramNamed.type);
			}
		});

		return {
			name: named.name,
			type: named.type,
			isConstructor: named.name === className,
			params: splitTopLevel(paramsSrc).map(formatParam).filter(Boolean).join(', '),
			paramTypes: paramTypes
		};
	}

	function formatParam(param) {
		var raw = stripDefault(param).trim();
		var passing = /^(out|ref|in)\s+/i.exec(raw);
		var value = raw.replace(/^(out|ref|in|params|this)\s+/i, '').trim();
		var named = splitTypeAndName(value);
		var shown = named.name;

		if (passing && shown) {
			shown = passing[1].toLowerCase() + ' ' + shown;
		}

		if (!named.name) {
			return escapeHtml(value);
		}

		if (!named.type) {
			return escapeHtml(shown);
		}

		return escapeHtml(shown) + ': ' + escapeHtml(named.type);
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

	function splitInitializer(text) {
		var depth = 0;
		var quote = '';

		for (var i = 0; i < text.length; i++) {
			var ch = text.charAt(i);

			if (quote) {
				if (ch === '\\') {
					i++;
				} else if (ch === quote) {
					quote = '';
				}

				continue;
			}

			if (ch === '"' || ch === '\'') {
				quote = ch;
				continue;
			}

			if (ch === '<' || ch === '(' || ch === '[' || ch === '{') {
				depth++;
			} else if (ch === '>' || ch === ')' || ch === ']' || ch === '}') {
				depth = Math.max(0, depth - 1);
			} else if (depth === 0 && ch === '=' && text.charAt(i + 1) !== '=' && text.charAt(i + 1) !== '>') {
				var prev = i > 0 ? text.charAt(i - 1) : '';

				if (prev === '!' || prev === '<' || prev === '>') {
					continue;
				}

				return {
					text: text.slice(0, i).trim(),
					value: text.slice(i + 1).trim()
				};
			}
		}

		return { text: String(text || '').trim(), value: '' };
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

	function splitDelimiters(src, delimiter) {
		var parts = [];
		var depth = 0;
		var current = '';

		for (var i = 0; i < src.length; i++) {
			var ch = src.charAt(i);

			if (ch === '<' || ch === '(' || ch === '[' || ch === '{') {
				depth++;
			} else if (ch === '>' || ch === ')' || ch === ']' || ch === '}') {
				depth = Math.max(0, depth - 1);
			} else if (ch === delimiter && depth === 0) {
				parts.push(current);
				current = '';
				continue;
			}

			current += ch;
		}

		parts.push(current);
		return parts;
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

		var clauses = splitDelimiters(text, ';').map(function (clause) {
			return clause.trim();
		}).filter(Boolean);

		if (!clauses.length) {
			return { kind: 'body' };
		}

		var sawGet = false;
		var sawSet = false;

		for (var i = 0; i < clauses.length; i++) {
			var clause = clauses[i].replace(/^(public|private|protected|internal)\s+/i, '').trim();
			var accessor = clause.match(/^(get|set|init)\b\s*(=>|\{|$)/i);

			if (accessor == null) {
				return { kind: 'body' };
			}

			if (accessor[1].toLowerCase() === 'get') {
				sawGet = true;
			} else {
				sawSet = true;
			}
		}

		return { kind: 'accessor', get: sawGet, set: sawSet };
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
		connectionLine: connectionLine,
		attachMonaco: attachMonaco
	};
});
