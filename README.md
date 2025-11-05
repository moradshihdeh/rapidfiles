<<<<<<< HEAD
# 🧩 Batch DSL — Mass File & Folder Creator for VS Code

[![Version](https://img.shields.io/visual-studio-marketplace/v/your-publisher.batch-dsl)](https://marketplace.visualstudio.com/items?itemName=your-publisher.batch-dsl)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/your-publisher.batch-dsl)](https://marketplace.visualstudio.com/items?itemName=your-publisher.batch-dsl)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Batch DSL lets you create entire project structures from a single line of text.  
Define folders, files, and templates using a minimal, expressive syntax — straight from the **Command Palette** or **Explorer context menu**.

---

## ✨ Features

- Lightweight domain-specific language (DSL) for batch file/folder creation.  
- Create nested directories and files in one command.  
- Save reusable templates and run them later.  
- Integrates with VS Code Explorer right-click menu.  
- Optional preview, console output, or confirmation before execution.  
- Persistent template storage between sessions.  
- Simple, readable syntax with nesting and path stack logic.

---

## 🚀 Installation

1. Open VS Code  
2. Press `Ctrl + P` and type:

   ```bash
   ext install your-publisher.batch-dsl
   ```

3. Or clone this repo and build manually:

   ```bash
   git clone https://github.com/yourname/batch-dsl.git
   cd batch-dsl
   npm install
   npm run package
   ```

---

## 🧠 Quick Start

### Command Palette

Press `Ctrl + Shift + P` → **Batch: Create Files**  
Enter a command like:

```
/web/ < index.html & style.css & [/js/script.js /img/logo.png];
```

### Explorer

Right-click any folder → **Batch Create**  
Your batch script will run relative to that folder.

---

## 📜 DSL Language Reference

| Symbol | Meaning | Example | Description |
|:-------|:---------|:--------|:-------------|
| `/folder/` | Create & enter folder | `/src/` | Creates a folder and moves inside it. |
| `file.txt` | Create file | `index.html` | Creates a file in current path. |
| `<` | Operate inside current folder | `/src/ < index.js` | Executes following tokens inside the folder. |
| `&` | Chain multiple commands at same level | `/src/ < index.js & style.css` | Same folder actions. |
| `;` | End statement, return to root | `/a/ < x.txt; /b/y.txt` | Creates groups. |
| `space` | Return before last folder | `/css/ index.html` | Creates `index.html` before `/css/`. |
| `[` … `]` | Sub-block | `/html/ < [index.html /css/]` | Run group inside, then return. |
| `!name` | Run saved script | `!web` | Executes stored template. |
| `name @ script` | Inline save new script | `web @ /web/ < index.html` | Saves template “web”. |

---

## 🧩 Examples

### Basic layout

```
/src/ < index.js & style.css;
/public/ < index.html;
```

Creates:
```
src/
  index.js
  style.css
public/
  index.html
```

---

### Nested example

```
/html/ < [index.html /css/ /js/] /images/logo.png; /readme.md
```

Creates:
```
html/
  index.html
  css/
  js/
  images/logo.png
readme.md
```

---

## 🧰 Configuration

Change preview mode under VS Code Settings:

```json
"batchDsl.previewMode": "off" | "console" | "confirm"
```

| Mode | Description |
|------|--------------|
| `"off"` | Runs immediately. |
| `"console"` | Logs planned operations in the Output panel. |
| `"confirm"` | Prompts a confirmation dialog. |

---

## 💾 Template System

Batch DSL lets you store and reuse project structures.

### Save Script
```
batch:savescript
```
Then enter:
```
web @ /web/ < [index.html /css/ /js/]
```

### Run Script
```
batch:template web
```
or simply:
```
!web
```

Templates are stored persistently in VS Code’s `globalState`.

---

## ⚙️ How It Works

1. The extension registers three commands:  
   - **batch:create** (main executor)  
   - **batch:savescript** (save new template)  
   - **batch:template** (run saved template)

2. The parser (`parseAndExecuteBatch`) walks through your script, token by token.

3. A stack keeps track of folder positions, automatically returning when needed.

4. Each operation uses the VS Code `workspace.fs` API for filesystem creation.

5. Behavior (confirm, console, off) is set via configuration.

---

## 🔍 Example Stack Behavior

Command:
```
/html/ < [index.html /css/ /js/] /images/logo.png; /readme.md
```

Internal stack:
```
Start: [project]
→ /html/          (enter html)
→ index.html      (create)
→ /css/           (enter css)
→ ]               (return to html)
→ /images/logo.png
→ ;               (return to root)
→ /readme.md
```

Creates:
```
html/
  index.html
  css/
  js/
  images/logo.png
readme.md
```

---

## 🧱 Boilerplates

Batch DSL inserts small starter templates for common file types:

| Extension | Template |
|:-----------|:----------|
| `.html` | Basic HTML5 boilerplate |
| `.css` | Empty CSS file |
| `.js` | `console.log('Hello world');` snippet |

You can expand this in `createEntity()` inside `extension.js`.

---

## 🧩 Development

```bash
git clone https://github.com/yourname/batch-dsl.git
cd batch-dsl
npm install
```

Run debug mode:

1. Press **F5** in VS Code.  
2. Use “Command Palette → Batch: Create Files”.  
3. Watch logs under “Output → Batch DSL”.

---

## 🧠 Future Plans

- Variable substitution (`${workspaceFolder}`, `${project}`).  
- Tree-based preview UI.  
- Template categories (e.g., web, python, flutter).  
- Import/export template system.  
- Built-in sample templates.

---

## 📄 License

MIT © 2025 Your Name  
[GitHub Repository](https://github.com/yourname/batch-dsl)

---
=======
# rapidfiles
vscode extension, batch create files
>>>>>>> 6f92e99bff8ccbfa4f565eadce9dbbf3b29e8792
