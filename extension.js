// extension.js
const vscode = require('vscode');
const path = require('path');

const SCRIPTS_KEY = 'batchScripts_v1';

/* ---------------------------
   TOKENIZER
   Supports:
   - PATH tokens starting with "/"
   - FILE tokens (plain)
   - <  &  ;  [  ]
--------------------------- */
function tokenize(input) {
  const tokens = [];
  let i = 0;
  const n = input.length;

  function skipWs() { while (i < n && /\s/.test(input[i])) i++; }

  while (i < n) {
    skipWs();
    if (i >= n) break;
    const ch = input[i];

    if (ch === '[') { tokens.push({ type: 'LBRACK' }); i++; continue; }
    if (ch === ']') { tokens.push({ type: 'RBRACK' }); i++; continue; }
    if (ch === '<') { tokens.push({ type: 'LT' }); i++; continue; }
    if (ch === '&') { tokens.push({ type: 'AMP' }); i++; continue; }
    if (ch === ';') { tokens.push({ type: 'SEMI' }); i++; continue; }

    // PATH starting with '/'
    if (ch === '/') {
      i++;
      const start = i;
      while (i < n && !/\s/.test(input[i]) && !'&<;[]'.includes(input[i])) i++;
      const full = input.slice(start, i).trim();
      if (!full) continue;
      const parts = full.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      const lastIsFile = !!(last && last.includes('.'));
      tokens.push({ type: 'PATH', parts, lastIsFile });
      continue;
    }

    // Plain file or word
    const start = i;
    while (i < n && !/\s/.test(input[i]) && !'[]<&;/'.includes(input[i])) i++;
    const tok = input.slice(start, i).trim();
    if (tok.length > 0) tokens.push({ type: 'FILE', name: tok });
  }

  return tokens;
}

/* ---------------------------
   PARSER
--------------------------- */
function scriptToOps(script) {
  const tokens = tokenize(script);
  const ops = [];

  const stack = [];
  let branchAnchor = null;
  let lastConnector = false;

  let i = 0;
  while (i < tokens.length) {
    const peek = tokens[i];
    const isNonConnector = peek && (peek.type === 'PATH' || peek.type === 'FILE' || peek.type === 'LBRACK');
    if (branchAnchor !== null && !lastConnector && isNonConnector) {
      stack.length = branchAnchor;
      branchAnchor = null;
    }

    const t = tokens[i];
    if (!t) { i++; continue; }

    if (t.type === 'PATH') {
      const prevLen = stack.length;
      const { parts, lastIsFile } = t;
      const dirCount = lastIsFile ? parts.length - 1 : parts.length;
      for (let p = 0; p < dirCount; p++) {
        stack.push(parts[p]);
        ops.push({ op: 'mkdir', relPath: stack.join('/') });
      }
      if (lastIsFile) {
        ops.push({ op: 'write', relPath: stack.concat(parts[parts.length - 1]).join('/') });
        branchAnchor = prevLen;
      } else branchAnchor = prevLen;

      lastConnector = false;
      i++;
      continue;
    }

    if (t.type === 'FILE') {
      ops.push({ op: 'write', relPath: stack.concat(t.name).join('/') });
      lastConnector = false;
      i++;
      continue;
    }

    if (t.type === 'LT' || t.type === 'AMP') { lastConnector = true; i++; continue; }

    if (t.type === 'SEMI') { stack.length = 0; branchAnchor = null; lastConnector = false; i++; continue; }

    if (t.type === 'LBRACK') {
      let depth = 1, j = i + 1;
      while (j < tokens.length && depth > 0) {
        if (tokens[j].type === 'LBRACK') depth++;
        else if (tokens[j].type === 'RBRACK') depth--;
        j++;
      }
      if (depth !== 0) throw new Error('Unmatched [');
      const innerTokens = tokens.slice(i + 1, j - 1 + 1 - 0);
      const innerScript = innerTokensToScript(innerTokens);
      const innerOps = scriptToOps(innerScript);
      for (const op of innerOps) {
        const prefixed = (stack.concat(op.relPath.split('/').filter(Boolean))).join('/');
        ops.push({ op: op.op, relPath: prefixed });
      }
      branchAnchor = null;
      lastConnector = false;
      i = j;
      continue;
    }

    i++;
  }

  return ops;
}

function innerTokensToScript(tokens) {
  const parts = [];
  for (const t of tokens) {
    if (t.type === 'PATH') parts.push('/' + t.parts.join('/') + (t.lastIsFile ? '' : '/'));
    else if (t.type === 'FILE') parts.push(t.name);
    else if (t.type === 'LT') parts.push('<');
    else if (t.type === 'AMP') parts.push('&');
    else if (t.type === 'SEMI') parts.push(';');
    else if (t.type === 'LBRACK') parts.push('[');
    else if (t.type === 'RBRACK') parts.push(']');
  }
  return parts.join(' ');
}

/* ---------------------------
   APPLY OPS
--------------------------- */
async function applyOps(rootUri, ops) {
  const templates = vscode.workspace.getConfiguration('batchFileCreator').get('templates', {});
  for (const op of ops) {
    const segs = op.relPath.split('/').filter(Boolean);
    const target = vscode.Uri.joinPath(rootUri, ...segs);
    if (op.op === 'mkdir') {
      await vscode.workspace.fs.createDirectory(target);
    } else if (op.op === 'write') {
      const parent = segs.slice(0, -1);
      if (parent.length) await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(rootUri, ...parent));
      if (await pathExists(target)) continue;
      const ext = path.extname(op.relPath);
      let content = '';
      if (templates[ext]) content = templates[ext].replace(/\$\{name\}/g, path.basename(op.relPath));
      else if (ext === '.html')
        content = `<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>${path.basename(op.relPath, '.html')}</title>\n</head>\n<body>\n\n</body>\n</html>\n`;
      else if (ext === '.js') content = `// ${op.relPath}\nconsole.log('Loaded ${path.basename(op.relPath)}');\n`;
      await vscode.workspace.fs.writeFile(target, new TextEncoder().encode(content));
    }
  }
}
async function pathExists(uri) { try { await vscode.workspace.fs.stat(uri); return true; } catch { return false; } }

/* ---------------------------
   VARIABLE SUBSTITUTION
--------------------------- */
async function substituteVariables(script, rootUri) {
  const vars = new Set();
  const re = /\$\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(script)) !== null) vars.add(m[1]);
  if (!vars.size) return script;
  const values = {};
  const workspaceName = rootUri ? path.basename(rootUri.fsPath) : undefined;
  for (const v of vars) {
    if (v === 'project') {
      values[v] = workspaceName ?? (await vscode.window.showInputBox({ prompt: `Value for \${${v}}`, value: workspaceName ?? '' }));
      continue;
    }
    const val = await vscode.window.showInputBox({ prompt: `Value for \${${v}}` });
    if (val === undefined) throw new Error('Cancelled variable input');
    values[v] = val;
  }
  return script.replace(re, (_, k) => values[k] ?? '');
}

/* ---------------------------
   SCRIPT STORAGE
--------------------------- */
function loadSavedScripts(context) { return context.globalState.get(SCRIPTS_KEY, {}); }
async function saveScript(context, name, script) {
  const all = loadSavedScripts(context);
  all[name] = script;
  await context.globalState.update(SCRIPTS_KEY, all);
}

/* ---------------------------
   RUN SCRIPT FLOW
--------------------------- */
async function runScriptFlow(context, rootUri, rawScript) {
  if (!rootUri) {
    const wf = vscode.workspace.workspaceFolders;
    if (!wf?.length) return vscode.window.showErrorMessage('No workspace open.');
    rootUri = wf[0].uri;
  }

  let script;
  try { script = await substituteVariables(rawScript, rootUri); }
  catch { return vscode.window.showInformationMessage('Variable input cancelled.'); }

  let ops;
  try { ops = scriptToOps(script); }
  catch (e) { return vscode.window.showErrorMessage('Parse error: ' + e.message); }

  await applyOps(rootUri, ops);
  vscode.window.showInformationMessage('Batch execution complete.');
}

/* ---------------------------
   COMMANDS
--------------------------- */
function registerCommands(context) {
  // Inline create
  context.subscriptions.push(vscode.commands.registerCommand('batch.create', async (uri) => {
    const wf = vscode.workspace.workspaceFolders;
    if (!wf?.length) return vscode.window.showErrorMessage('No workspace open.');
    const baseFsPath = uri ? uri.fsPath : wf[0].uri.fsPath;
    const input = await vscode.window.showInputBox({
      placeHolder: 'Type DSL or !name to run saved script',
      prompt: 'Batch create (DSL or saved script call)'
    });
    if (!input) return;

    // If starts with ! run saved script
    if (input.trim().startsWith('!')) {
      const name = input.trim().slice(1).trim();
      const saved = loadSavedScripts(context);
      const script = saved[name];
      if (!script) return vscode.window.showErrorMessage(`No saved script "${name}"`);
      return runScriptFlow(context, vscode.Uri.file(baseFsPath), script);
    }

    await runScriptFlow(context, vscode.Uri.file(baseFsPath), input);
  }));

  // Inline save (name @ script)
  context.subscriptions.push(vscode.commands.registerCommand('batch.savescript', async () => {
    const input = await vscode.window.showInputBox({
      placeHolder: 'name @ /folder/ < index.html & [/css/ < style.css]',
      prompt: 'Save script format: name @ script'
    });
    if (!input) return;
    const idx = input.indexOf('@');
    if (idx === -1) return vscode.window.showErrorMessage('Use: name @ script');
    const name = input.slice(0, idx).trim();
    const script = input.slice(idx + 1).trim();
    if (!name || !script) return vscode.window.showErrorMessage('Missing name or script.');
    await saveScript(context, name, script);
    vscode.window.showInformationMessage(`Saved script: ${name}`);
  }));

  // Pick saved script
  context.subscriptions.push(vscode.commands.registerCommand('batch.template', async (uri) => {
    const saved = loadSavedScripts(context);
    const names = Object.keys(saved);
    if (!names.length) return vscode.window.showInformationMessage('No saved scripts.');
    const pick = await vscode.window.showQuickPick(names, { placeHolder: 'Pick saved script' });
    if (!pick) return;
    await runScriptFlow(context, uri || null, saved[pick]);
  }));
}

/* ---------------------------
   ACTIVATE
--------------------------- */
function activate(context) {
  registerCommands(context);
  console.log('Batch DSL extension activated.');
}
function deactivate() {}

module.exports = { activate, deactivate };
