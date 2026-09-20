#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const isAndroid = process.argv.includes('--android') || process.argv.includes('--option=android');
let currentDir = isAndroid ? '/sdcard' : process.cwd();
let items = [];
let selectedIndex = 0;

// Состояния: browse, menu, groupMenu, createMenu, input, moveSelect
let mode = 'browse'; 
let activeFile = null;
let menuIndex = 0;
let createMenuIndex = 0;
let groupMenuIndex = 0;

// Буферы
let selectedFiles = new Set(); 
let movingTargets = []; 
let inputPrompt = '';
let inputValue = '';
let inputCallback = null;

const MAX_VISIBLE_ITEMS = 12; 

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

function clearScreen() {
    process.stdout.write('\x1B[2J\x1B[H');
}

function readDir() {
    try {
        const raw = fs.readdirSync(currentDir, { withFileTypes: true });
        items = [];
        
        // В режиме перемещения ПЕРВЫМ пунктом добавляем кнопку сброса груза
        if (mode === 'moveSelect') {
            items.push({ name: `📥 [ ДОСТАВИТЬ СЮДА ]`, isDir: false, isDropZone: true });
        }
        
        items.push({ name: '.. (Назад)', isDir: true, isBack: true });
        
        const sorted = raw.sort((a, b) => b.isDirectory() - a.isDirectory());
        sorted.forEach(i => items.push({ name: i.name, isDir: i.isDirectory() }));
    } catch (e) {
        items = [{ name: '.. (Назад)', isDir: true, isBack: true }, { name: '⚠️ Ошибка доступа', isDir: false, isError: true }];
    }
}

function getGroupMenuItems() {
    const opts = [];
    if (selectedFiles.size > 0) {
        opts.push(`📦 Сжать ВСЁ выделенное в один ZIP (${selectedFiles.size} шт.)`);
        opts.push(`🚚 Переместить ВСЁ выделенное (Выбрать папку)`);
        opts.push(`🗑️ Удалить ВСЁ выделенное`);
        opts.push(`📲 Экспорт выделенного в телефон`);
    } else {
        const current = items[selectedIndex];
        if (current && !current.isBack && !current.isError && !current.isDropZone) {
            if (current.isDir) {
                opts.push('📦 Сжать папку в ZIP');
                opts.push('🚚 Переместить папку (Выбрать папку)');
                opts.push('🗑️ Удалить папку рекурсивно');
                opts.push('📲 Экспорт папки в телефон');
            } else {
                opts.push('📝 Редактировать (nano)');
                opts.push('📦 Распаковать (Unzip)');
                opts.push('📦 Сжать файл в ZIP');
                opts.push('🚚 Переместить файл (Выбрать папку)');
                opts.push('🗑️ Удалить файл');
            }
        }
    }
    opts.push('❌ Назад');
    return opts;
}

function render() {
    clearScreen();
    
    if (mode === 'browse' || mode === 'moveSelect') {
        if (mode === 'moveSelect') {
            console.log(`\x1b[42m\x1b[30m🚚 РЕЖИМ ПЕРЕМЕЩЕНИЯ | Наведи на [ ДОСТАВИТЬ СЮДА ] и жми Enter\x1b[0m`);
            console.log(`\x1b[32m📍 Куда везем: ${currentDir}\x1b[0m`);
            console.log(`📦 Объектов в пути: ${movingTargets.length} шт.`);
        } else {
            console.log(`\x1b[36m📱 GEREPOST FM | 📍 ${currentDir}\x1b[0m`);
            if (selectedFiles.size > 0) {
                console.log(`\x1b[33m✅ Выделено объектов: ${selectedFiles.size} шт. (Жми Ctrl+E для действий)\x1b[0m`);
            } else {
                console.log(`--------------------------------------------------`);
            }
        }
        console.log(`--------------------------------------------------`);

        let start = 0;
        let end = items.length;
        if (items.length > MAX_VISIBLE_ITEMS) {
            start = Math.max(0, selectedIndex - Math.floor(MAX_VISIBLE_ITEMS / 2));
            end = start + MAX_VISIBLE_ITEMS;
            if (end > items.length) { end = items.length; start = end - MAX_VISIBLE_ITEMS; }
        }

        for (let i = start; i < end; i++) {
            const item = items[i];
            const fullPath = path.join(currentDir, item.name);
            const isMarked = selectedFiles.has(fullPath);
            const markBadg = isMarked ? '\x1b[33m[✓]\x1b[0m ' : '';
            const prefix = i === selectedIndex ? '\x1b[7m➔\x1b[0m ' : '  ';
            
            let icon = item.isDir ? '📁' : (item.name.endsWith('.zip') ? '📦' : '📄');
            if (item.isDropZone) icon = '';

            const isMoving = movingTargets.includes(fullPath);
            
            if (i === selectedIndex) {
                if (item.isDropZone) {
                    console.log(`\x1b[42m\x1b[30m➔ ${item.name} ➔\x1b[0m`);
                } else {
                    console.log(`\x1b[7m${prefix}${markBadg}${icon} ${item.name}\x1b[0m`);
                }
            } else if (item.isDropZone) {
                console.log(`\x1b[32m  ${item.name}\x1b[0m`);
            } else if (isMoving) {
                console.log(`\x1b[90m  ${markBadg}🚚 ${item.name} (переносится)\x1b[0m`);
            } else {
                console.log(`  ${markBadg}${icon} ${item.name}`);
            }
        }

        console.log(`--------------------------------------------------`);
        if (mode === 'moveSelect') {
            console.log(`▲/▼ — Выбрать | [Enter] на папке — Войти | [Esc] — Отмена`);
            console.log(`💡 Выбери верхний зелёный пункт и жми Enter для подтверждения!`);
        } else {
            console.log(`⌨️  [Space] — Выбрать | [Ctrl+A] — Создать | [Ctrl+E] — Действия`);
            console.log(`▲/▼ — Навигация | [Enter] — Открыть/Зайти | Ctrl+C — Выход`);
        }
        
    } else if (mode === 'groupMenu') {
        const title = selectedFiles.size > 0 ? `ГРУППОВЫЕ ДЕЙСТВИЯ (${selectedFiles.size} шт.)` : `ДЕЙСТВИЯ НАД ОБЪЕКТОМ`;
        console.log(`\x1b[34m⚡ ${title}\x1b[0m`);
        console.log(`--------------------------------------------------`);
        const gOpts = getGroupMenuItems();
        gOpts.forEach((opt, i) => {
            console.log(i === groupMenuIndex ? `\x1b[7m➔ ${opt}\x1b[0m` : `  ${opt}`);
        });
    } else if (mode === 'createMenu') {
        console.log(`\x1b[35m➕ ГЛОБАЛЬНОЕ МЕНЮ СОЗДАНИЯ\x1b[0m`);
        console.log(`--------------------------------------------------`);
        const cOpts = ['📄 Создать новый файл', '📁 Создать новую папку', '❌ Отмена'];
        cOpts.forEach((opt, i) => {
            console.log(i === createMenuIndex ? `\x1b[7m➔ ${opt}\x1b[0m` : `  ${opt}`);
        });
    } else if (mode === 'input') {
        console.log(`\x1b[32m📝 ${inputPrompt}\x1b[0m`);
        console.log(`--------------------------------------------------`);
        console.log(`> ${inputValue}_`);
    }
}

function copyFolderSync(from, to) {
    fs.mkdirSync(to, { recursive: true });
    fs.readdirSync(from).forEach(element => {
        if (fs.lstatSync(path.join(from, element)).isDirectory()) {
            copyFolderSync(path.join(from, element), path.join(to, element));
        } else {
            fs.copyFileSync(path.join(from, element), path.join(to, element));
        }
    });
}

function deleteRecursiveSync(targetPath) {
    if (fs.existsSync(targetPath)) {
        if (fs.lstatSync(targetPath).isDirectory()) {
            fs.readdirSync(targetPath).forEach(file => deleteRecursiveSync(path.join(targetPath, file)));
            fs.rmdirSync(targetPath);
        } else {
            fs.unlinkSync(targetPath);
        }
    }
}

process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') { clearScreen(); process.exit(); }

    if (mode === 'input') {
        if (key.name === 'escape') { mode = 'browse'; render(); return; }
        if (key.name === 'return') {
            if (inputValue.trim()) inputCallback(inputValue.trim());
            mode = 'browse'; readDir(); render(); return;
        }
        if (key.name === 'backspace') inputValue = inputValue.slice(0, -1);
        else if (str && str.length === 1 && !key.ctrl && !key.meta) inputValue += str;
        render(); return;
    }

    if (key.ctrl && key.name === 'a' && mode === 'browse') {
        mode = 'createMenu'; createMenuIndex = 0; render(); return;
    }

    if (key.ctrl && key.name === 'e' && mode === 'browse') {
        mode = 'groupMenu'; groupMenuIndex = 0; render(); return;
    }

    if (mode === 'browse' || mode === 'moveSelect') {
        if (key.name === 'up' && selectedIndex > 0) selectedIndex--;
        if (key.name === 'down' && selectedIndex < items.length - 1) selectedIndex++;
        
        if (key.name === 'escape' && mode === 'moveSelect') {
            movingTargets = [];
            mode = 'browse';
            readDir();
            render();
            return;
        }

        if (key.name === 'space' && mode === 'browse') {
            const selected = items[selectedIndex];
            if (selected && !selected.isBack && !selected.isError) {
                const fullPath = path.join(currentDir, selected.name);
                if (selectedFiles.has(fullPath)) selectedFiles.delete(fullPath);
                else selectedFiles.add(fullPath);
            }
        }
        
        if (key.name === 'return') {
            const selected = items[selectedIndex];
            if (!selected || selected.isError) return;

            if (selected.isDropZone) {
                // ЖМАКНУЛИ НА КНОПКУ ДОСТАВКИ!
                movingTargets.forEach(oldPath => {
                    const newPath = path.join(currentDir, path.basename(oldPath));
                    try {
                        fs.renameSync(oldPath, newPath);
                    } catch(e) {
                        try {
                            if (fs.lstatSync(oldPath).isDirectory()) copyFolderSync(oldPath, newPath);
                            else fs.copyFileSync(oldPath, newPath);
                            deleteRecursiveSync(oldPath);
                        } catch(err) {}
                    }
                });
                movingTargets = [];
                mode = 'browse';
                selectedIndex = 0;
                readDir();
            } else if (selected.isBack) {
                currentDir = path.dirname(currentDir); selectedIndex = 0; readDir();
            } else if (selected.isDir) {
                currentDir = path.join(currentDir, selected.name); selectedIndex = 0; readDir();
            } else {
                if (mode !== 'moveSelect') {
                    activeFile = selected.name;
                    mode = 'groupMenu'; 
                    groupMenuIndex = 0;
                }
            }
        }
    } 
    
    else if (mode === 'groupMenu') {
        const gOpts = getGroupMenuItems();
        if (key.name === 'up' && groupMenuIndex > 0) groupMenuIndex--;
        if (key.name === 'down' && groupMenuIndex < gOpts.length - 1) groupMenuIndex++;
        if (key.name === 'escape') mode = 'browse';

        if (key.name === 'return') {
            const choice = gOpts[groupMenuIndex];
            const selected = items[selectedIndex];
            const filePath = selected ? path.join(currentDir, selected.name) : null;
            const targets = selectedFiles.size > 0 ? Array.from(selectedFiles) : [filePath];

            if (choice === '❌ Назад') {
                mode = 'browse';
            } else if (choice.includes('Редактировать')) {
                process.stdin.setRawMode(false); clearScreen();
                try { execSync(`nano "${filePath}"`, { stdio: 'inherit' }); } catch(e) {}
                process.stdin.setRawMode(true);
                mode = 'browse';
            } else if (choice.includes('Распаковать')) {
                try {
                    try { execSync(`/system/bin/unzip -o "${filePath}" -d "${currentDir}"`); }
                    catch { execSync(`python3 -m zipfile -e "${filePath}" "${currentDir}"`); }
                } catch(e) {}
                mode = 'browse';
            } else if (choice.includes('Сжать папку в ZIP') || choice.includes('Сжать файл в ZIP')) {
                try { execSync(`python3 -m zipfile -c "${filePath}.zip" "${filePath}"`); } catch(e) {}
                mode = 'browse';
            } else if (choice.includes('Сжать ВСЁ выделенное в один ZIP')) {
                mode = 'input'; inputPrompt = 'Введите имя общего ZIP-архива (без расширения):'; inputValue = 'archive';
                inputCallback = (archiveName) => {
                    try {
                        const fileList = targets.map(p => `"${p}"`).join(' ');
                        execSync(`python3 -m zipfile -c "${path.join(currentDir, archiveName)}.zip" ${fileList}`);
                        selectedFiles.clear();
                    } catch(e) {}
                };
            } else if (choice.includes('Переместить')) {
                movingTargets = targets;
                selectedFiles.clear();
                mode = 'moveSelect'; 
                selectedIndex = 0; // Сразу наводим на плашку "ДОСТАВИТЬ СЮДА"
            } else if (choice.includes('Удалить')) {
                targets.forEach(p => { try { deleteRecursiveSync(p); } catch(e) {} });
                selectedFiles.clear();
                mode = 'browse';
            } else if (choice.includes('Экспорт')) {
                targets.forEach(p => {
                    try {
                        const name = path.basename(p);
                        if (fs.lstatSync(p).isDirectory()) copyFolderSync(p, path.join('/sdcard', name));
                        else fs.copyFileSync(p, path.join('/sdcard', name));
                    } catch(e) {}
                });
                selectedFiles.clear();
                mode = 'browse';
            }
            readDir();
        }
    }
    
    else if (mode === 'createMenu') {
        if (key.name === 'up' && createMenuIndex > 0) createMenuIndex--;
        if (key.name === 'down' && createMenuIndex < 2) createMenuIndex++;
        if (key.name === 'escape') mode = 'browse';
        
        if (key.name === 'return') {
            if (createMenuIndex === 0) {
                mode = 'input'; inputPrompt = 'Введите имя нового файла:'; inputValue = '';
                inputCallback = (name) => fs.writeFileSync(path.join(currentDir, name), '');
            } else if (createMenuIndex === 1) {
                mode = 'input'; inputPrompt = 'Введите имя новой папки:'; inputValue = '';
                inputCallback = (name) => fs.mkdirSync(path.join(currentDir, name), { recursive: true });
            } else mode = 'browse';
        }
    }
    render();
});

readDir();
render();

