import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

console.log('--- Проверка целостности проекта Global Lens ---');
let hasErrors = false;

// 1. Проверка существования ключевых файлов
const essentialFiles = [
  'index.html',
  'style.css',
  'app.js',
  'js/app.js',
  'js/navigation.js',
  'js/globe.js',
  'js/season.js',
  'js/auth.js',
  'players.json',
  'countries2020.json'
];

for (const file of essentialFiles) {
  const fullPath = path.join(rootDir, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Отсутствует обязательный файл: ${file}`);
    hasErrors = true;
  } else {
    console.log(`✅ Файл найден: ${file}`);
  }
}

// 2. Проверка JSON файлов на валидность синтаксиса
const jsonFiles = ['players.json', 'countries2020.json', 'countries2014.json', 'autonomy.json', 'pmc.json'];
for (const jf of jsonFiles) {
  const fp = path.join(rootDir, jf);
  if (fs.existsSync(fp)) {
    try {
      JSON.parse(fs.readFileSync(fp, 'utf-8'));
      console.log(`✅ JSON валиден: ${jf}`);
    } catch (e) {
      console.error(`❌ Ошибка синтаксиса JSON в ${jf}:`, e.message);
      hasErrors = true;
    }
  }
}

// 3. Проверка экспортов функций из index.html onclick
const htmlContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');
const appJsContent = fs.readFileSync(path.join(rootDir, 'js/app.js'), 'utf-8');

const onclickMatches = [...htmlContent.matchAll(/onclick="([a-zA-Z0-9_]+)\(/g)];
const calledFuncs = [...new Set(onclickMatches.map(m => m[1]))];

console.log(`\nПроверка вызовов onclick (${calledFuncs.length} уникальных функций):`);
for (const fn of calledFuncs) {
  if (appJsContent.includes(`window.${fn} =`) || appJsContent.includes(`function ${fn}`)) {
    console.log(`  ✅ Функция "${fn}" привязана к window`);
  } else {
    console.warn(`  ⚠️ Функция "${fn}" вызывается в HTML, но не найдена привязка window.${fn}`);
  }
}

if (!hasErrors) {
  console.log('\n🎉 Базовая проверка целостности завершена успешно!');
} else {
  console.log('\n⚠️ Обнаружены ошибки, требующие внимания.');
}
