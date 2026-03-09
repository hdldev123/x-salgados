import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, 'src');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

console.log("Renaming files in", SRC_DIR);

let renamed = 0;

walkDir(SRC_DIR, (filepath) => {
    if (filepath.endsWith('.jsx')) {
        const newPath = filepath.replace(/\.jsx$/, '.tsx');
        fs.renameSync(filepath, newPath);
        console.log(`Renamed: ${path.basename(filepath)} -> ${path.basename(newPath)}`);
        renamed++;
    } else if (filepath.endsWith('.js')) {
        const newPath = filepath.replace(/\.js$/, '.ts');
        fs.renameSync(filepath, newPath);
        console.log(`Renamed: ${path.basename(filepath)} -> ${path.basename(newPath)}`);
        renamed++;
    }
});

console.log(`Total files renamed: ${renamed}`);
