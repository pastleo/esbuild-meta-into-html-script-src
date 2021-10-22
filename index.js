#!/usr/bin/env node

import jsdom from 'jsdom';
import { readFile, writeFile } from 'fs/promises';

if (process.argv.length < 5) {
  process.stderr.write(
    'Usage example:\n\tesbuild-meta-into-html-script-src meta.json src/index.html dist/index.html [src/] [dist/]\n'
  );
  process.exit(127);
}

main(...process.argv.slice(2));

async function main(metaJsonPath, srcHtmlPath, desHtmlPath, srcPrefix = '', desPrefix = '') {
  console.log('esbuild-meta-into-html-script-src:', {
    metaJsonPath, srcHtmlPath, desHtmlPath, srcPrefix, desPrefix,
  })

  const [metaJsonFile, srcHtmlFile] = await Promise.all([
    readFile(metaJsonPath),
    readFile(srcHtmlPath),
  ]);
  const meta = JSON.parse(metaJsonFile);
  const html = new jsdom.JSDOM(srcHtmlFile);
  const entryPointMapping = Object.fromEntries(
    Object.entries(meta.outputs).map(
      ([outPath, bundle]) => ([outPath, bundle.entryPoint])
    ).filter(
      ([outPath, entryPoint]) => outPath && entryPoint
    ).map(
      ([outPath, entryPoint]) => ([replaceStartWith(entryPoint, srcPrefix), replaceStartWith(outPath, desPrefix)])
    ).map(
      ([entryPoint, outPath]) => ([changeFileExt(outPath, entryPoint), outPath])
    )
  );

  const scripts = html.window.document.scripts;

  console.log('entryPointMapping:', entryPointMapping);

  for(let i = 0; i < scripts.length; i++) {
    const script = scripts.item(i);
    const matchedEntryPoint = entryPointMapping[script.src];
    if (matchedEntryPoint) {
      script.src = matchedEntryPoint;
    }
  }

  writeFile(desHtmlPath, html.serialize());

  console.log(`esbuild-meta-into-html-script-src done writing to ${desHtmlPath}`);
}

function replaceStartWith(string, searchStr) {
  if (string.startsWith(searchStr)) {
    return string.substring(searchStr.length);
  }
  return string;
}

function changeFileExt(extSrc, file) {
  const ext = extSrc.substr(extSrc.lastIndexOf('.'))
  return file.substr(0, file.lastIndexOf('.')) + ext;
}
