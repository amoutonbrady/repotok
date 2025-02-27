#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';

import { parseProject } from './index';

// Configuration
const DEFAULT_OUTPUT_FILE_NAME = 'tokenized_project.txt';

/**
 * The path to the project directory to process.
 * Defaults to the current working directory if not provided as a command-line argument.
 */
const projectPath = process.argv[2] || process.cwd();

/**
 * The path where the output file will be written.
 * Defaults to "tokenized_project.txt" in the current working directory if not provided.
 */
const outputPath =
  process.argv[3] || path.join(process.cwd(), DEFAULT_OUTPUT_FILE_NAME);

// Execute the script
parseProject(projectPath, outputPath)
  .then(() => console.log('Done!'))
  .catch((error) => console.error('Error:', error));
