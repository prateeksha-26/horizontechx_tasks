const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function readData(name) {
  const raw = fs.readFileSync(filePath(name), 'utf-8');
  return JSON.parse(raw || '[]');
}

function writeData(name, data) {
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2));
}

function nextId(collection) {
  return collection.length === 0 ? 1 : Math.max(...collection.map((c) => c.id)) + 1;
}

module.exports = { readData, writeData, nextId };
