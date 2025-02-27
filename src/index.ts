/**
 * AI Repository Tokenizer
 *
 * This utility processes a source code repository and converts it into a single text file
 * that can be used for AI context windows. It respects .gitignore rules and skips binary
 * files, large files, and common directories that should be excluded.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

// Constants
const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1MB
const COMMON_IGNORED_DIRECTORIES = [
  'node_modules',
  '.git',
  '.idea',
  '.vscode',
  'dist',
  'build',
];
const COMMON_IGNORED_FILES = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  '.DS_Store',
  'Thumbs.db',
  '.env',
  '.env.local',
  '.env.development.local',
  '.env.test.local',
  '.env.production.local',
];
const BINARY_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.ico',
  '.svg',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.zip',
  '.rar',
  '.tar',
  '.gz',
  '.7z',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.mp3',
  '.mp4',
  '.avi',
  '.mov',
  '.flv',
  '.ttf',
  '.otf',
  '.woff',
  '.woff2',
  '.pyc',
  '.class',
];

/**
 * Rule object representing a gitignore rule
 */
type GitignoreRule = {
  pattern: string;
  isNegated: boolean;
};

/**
 * GitignoreParser interface for checking if files should be included
 */
interface GitignoreParser {
  accepts: (filePath: string) => boolean;
}

/**
 * File processor callback type
 */
type FileProcessor = (
  filePath: string,
  relativePath: string,
  content: string,
) => void;

/**
 * Parses a .gitignore file content and returns a parser that can determine
 * if a file path should be included or excluded.
 *
 * @param {string} content - The content of a .gitignore file
 * @returns {GitignoreParser} A parser to check if a file path should be included
 */
function parseGitignore(content: string): GitignoreParser {
  const rules: GitignoreRule[] = content
    .split('\n')
    .map((line) => line.replace(/#.*$/, '').trim()) // Remove comments and trim whitespace
    .filter((line) => line.length > 0) // Keep non-empty lines
    .map((line) => {
      const isNegated = line.startsWith('!');
      const pattern = isNegated ? line.substring(1) : line;

      return {
        pattern: convertGitignorePatternToRegex(pattern),
        isNegated,
      };
    });

  return {
    /**
     * Determines whether a file path should be included based on gitignore rules.
     *
     * @param {string} filePath - The path of the file to check
     * @returns {boolean} True if the file should be included, false if it should be ignored
     */
    accepts: (filePath: string): boolean => {
      // Normalize path for matching
      const normalizedPath = filePath.replace(/\\/g, '/');

      // Default to accepting the file
      return rules.reduce((shouldInclude, rule) => {
        const regex = new RegExp(rule.pattern);
        const matches = regex.test(normalizedPath);

        // If there's a match, the rule determines inclusion (negated or not)
        if (matches) {
          return rule.isNegated;
        }

        // No match, keep current inclusion state
        return shouldInclude;
      }, true);
    },
  };
}

/**
 * Converts a gitignore pattern to a regular expression pattern
 *
 * @param {string} pattern - The gitignore pattern to convert
 * @returns {string} The converted regular expression pattern
 */
function convertGitignorePatternToRegex(pattern: string): string {
  return pattern
    .replace(/\*\*/g, '___GLOBSTAR___')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/___GLOBSTAR___/g, '.*')
    .replace(/^\//, '^')
    .replace(/\/$/, '$');
}

/**
 * Creates a default gitignore parser that accepts all files
 *
 * @returns {GitignoreParser} A parser that accepts all files
 */
function createDefaultGitignoreParser(): GitignoreParser {
  return {
    accepts: () => true,
  };
}

/**
 * Loads the gitignore parser from the project path or returns a default parser
 *
 * @param {string} projectPath - The root path of the project
 * @returns {Promise<GitignoreParser>} A promise resolving to a gitignore parser
 */
async function loadGitignoreParser(
  projectPath: string,
): Promise<GitignoreParser> {
  try {
    const gitignorePath = path.join(projectPath, '.gitignore');
    const gitignoreContent = await fs.readFile(gitignorePath, 'utf8');
    console.log('Loaded .gitignore rules');
    return parseGitignore(gitignoreContent);
  } catch (error) {
    console.log(
      'No .gitignore found or error parsing it, will include all files',
    );
    return createDefaultGitignoreParser();
  }
}

/**
 * Creates a formatted header string for a file to be included in the output.
 *
 * @param {string} filePath - The relative path of the file
 * @returns {string} A formatted header string with separators and file path
 */
function createFileHeader(filePath: string): string {
  const separator = '='.repeat(80);
  return `${separator}\n// FILE: ${filePath}\n${separator}`;
}

/**
 * Determines if a file is a binary file based on its extension.
 *
 * @param {string} filePath - The path of the file to check
 * @returns {boolean} True if the file is likely a binary file, false otherwise
 */
function isBinaryFile(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.includes(extension);
}

/**
 * Checks if a directory should be skipped based on common exclusion patterns
 *
 * @param {string} directoryName - The name of the directory to check
 * @returns {boolean} True if the directory should be skipped
 */
function isCommonIgnoredDirectory(directoryName: string): boolean {
  return COMMON_IGNORED_DIRECTORIES.includes(directoryName);
}

/**
 * Checks if a file is in the common ignored files list
 *
 * @param {string} filename - The name of the file to check
 * @returns {boolean} True if the file should be skipped
 */
function isCommonIgnoredFile(filename: string): boolean {
  return COMMON_IGNORED_FILES.includes(filename);
}

/**
 * Checks if a file is too large to process
 *
 * @param {number} fileSize - The size of the file in bytes
 * @returns {boolean} True if the file is too large
 */
function isFileTooLarge(fileSize: number): boolean {
  return fileSize > MAX_FILE_SIZE_BYTES;
}

/**
 * Processes a file and calls the fileCallback with its content
 *
 * @param {string} filePath - The full path to the file
 * @param {string} relativePath - The relative path from the base directory
 * @param {string} outputPath - The path of the output file
 * @param {FileProcessor} fileCallback - A callback to process the file content
 * @returns {Promise<void>} A promise that resolves when the file is processed
 */
async function processFile(
  filePath: string,
  relativePath: string,
  outputPath: string,
  fileCallback: FileProcessor,
): Promise<void> {
  try {
    const fileStats = await fs.stat(filePath);
    const filename = path.basename(filePath);

    const isOutputFile = filePath === path.resolve(outputPath);
    const isBinary = isBinaryFile(filePath);
    const isTooLarge = isFileTooLarge(fileStats.size);
    const isIgnoredFile = isCommonIgnoredFile(filename);

    if (isOutputFile) {
      return; // Skip the output file itself
    }

    if (isBinary || isTooLarge) {
      console.log(`Skipping binary or large file: ${relativePath}`);
      return;
    }

    if (isIgnoredFile) {
      console.log(`Skipping common ignored file: ${relativePath}`);
      return;
    }

    // Read and process the file
    const content = await fs.readFile(filePath, 'utf8');
    fileCallback(filePath, relativePath, content);
    console.log(`Processed: ${relativePath}`);
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

/**
 * Recursively processes a directory and all its subdirectories, applying gitignore rules
 * and callback function to each file.
 *
 * @param {string} basePath - The base path of the project
 * @param {string} currentPath - The current directory being processed
 * @param {GitignoreParser} gitignoreParser - Parser to determine if a file should be included
 * @param {FileProcessor} fileCallback - A callback function to process each file's content
 * @param {string} outputPath - The path of the output file
 * @returns {Promise<void>} A promise that resolves when all files in the directory have been processed
 */
async function processDirectory(
  basePath: string,
  currentPath: string,
  gitignoreParser: GitignoreParser,
  fileCallback: FileProcessor,
  outputPath: string,
): Promise<void> {
  const entries = await fs.readdir(currentPath);

  // Process each entry sequentially to avoid overwhelming the file system
  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry);
    const relativePath = path.relative(basePath, fullPath);

    // Skip if the file is ignored by gitignore
    const isAcceptedByGitignore = gitignoreParser.accepts(relativePath);
    if (!isAcceptedByGitignore) {
      console.log(`Skipping ignored path: ${relativePath}`);
      continue;
    }

    const stats = await fs.stat(fullPath);

    if (stats.isDirectory()) {
      const shouldSkipDirectory = isCommonIgnoredDirectory(entry);

      if (shouldSkipDirectory) {
        console.log(`Skipping common ignored directory: ${relativePath}`);
        continue;
      }

      // Recursively process subdirectories
      await processDirectory(
        basePath,
        fullPath,
        gitignoreParser,
        fileCallback,
        outputPath,
      );
    } else if (stats.isFile()) {
      await processFile(fullPath, relativePath, outputPath, fileCallback);
    }
  }
}

/**
 * Main function that parses a project directory, processes all files according to rules,
 * and writes the combined content to an output file.
 *
 * @param {string} projectPath - The root path of the project to process
 * @param {string} outputPath - The file path where the combined content will be written
 * @returns {Promise<void>} A promise that resolves when the parsing is complete
 */
export async function parseProject(
  projectPath: string,
  outputPath: string,
): Promise<void> {
  console.log(`Starting to parse project at ${projectPath}`);

  // Load the gitignore parser
  const gitignoreParser = await loadGitignoreParser(projectPath);

  // Collect file contents
  let outputContent = '';

  // Define the file processor callback
  const appendToOutput = (
    _filePath: string,
    relativePath: string,
    content: string,
  ): void => {
    const header = createFileHeader(relativePath);
    outputContent += `${header}\n${content}\n\n`;
  };

  // Process all files recursively
  await processDirectory(
    projectPath,
    projectPath,
    gitignoreParser,
    appendToOutput,
    outputPath,
  );

  // Write the combined content to the output file
  await fs.writeFile(outputPath, outputContent);

  console.log(`Project successfully parsed and written to ${outputPath}`);
}
