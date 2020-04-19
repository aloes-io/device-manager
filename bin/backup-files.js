#!/usr/bin/env node

// **********************
// Simple Node.js Backup script
// @Author: Eralp Kor
// *********************
// Usage: --src or -s [string] --dest or -d [string]
// node backup.js --help
// If files set read only attribute they will not be copied
// If destination file same as source it will be overwritten

/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable security/detect-object-injection */
const fs = require('fs');
const path = require('path');
const args = require('yargs')
  .option({
    src: {
      alias: 's',
      describe: 'provide a path to copy files from.',
      demandOption: true,
    },
    dest: {
      alias: 'd',
      describe: 'provide a path to copy files to.',
      demandOption: true,
    },
    version: {
      alias: 'v',
    },
  })
  .usage('Usage: --src or -s [string] --dest or -d [string]')
  .help().argv;

// Color references
const Reset = '\x1b[0m';
const Red = '\x1b[31m';
const Blue = '\x1b[34m';
const Green = '\u001b[36m';

const now = new Date()
  .toJSON()
  .slice(0, 16)
  .replace(/[-T]/g, '-');

// Get user inputs, src and dest paths.
//  args;

const sourcePath = args.argv.s;
const destinationPath = args.argv.d;

function getDestinationPath(baseDirectory) {
  const date = new Date()
    .toJSON()
    .slice(0, 10)
    .replace(/[-T]/g, '-');
  return baseDirectory + date;
}

// Copy files recursive
async function copyEverything(src, dest) {
  // Get files to copy from source directory
  const filesToCopy = fs.readdirSync(src, {
    withFileTypes: true,
  });
  // Make recursive directories
  fs.mkdir(
    dest,
    {
      recursive: true,
    },
    err => {
      if (err) throw err;
    },
  );

  const filesCopy = Object.key(filesToCopy).map(async key => {
    const file = filesToCopy[key];
    const srcPath = path.join(src, file.name);
    const destPath = path.join(dest, file.name);
    if (file.isDirectory()) {
      try {
        await copyEverything(srcPath, destPath);
      } catch (err) {
        console.log(`${Red}Something went wrong ${err}${Reset}`);
      }
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (err) {
        console.log(`${Red}Cannot finish the backup ${err}${Reset}`);
      }
    }
  });

  await Promise.all(filesCopy);
}

// Run backup script and time stamp
async function backup() {
  console.log(`${Blue}Backup started: ${now}${Reset}`);
  const dest = getDestinationPath(destinationPath);
  try {
    await copyEverything(sourcePath, dest);
  } catch (error) {
    console.log(`${Red}Cannot write log files: ${error} ${Reset}`);
  }
}

backup()
  .then(() => {
    console.log(`${Green}Backup ended: ${now} ${Reset}`);
  })
  .catch(err => {
    console.log(`${Red}Did not work... ${err} ${Reset}`);
  });

// EOF
