/**
 * AI Repository Tokenizer
 *
 * This utility processes a source code repository and converts it into a single text file
 * that can be used for AI context windows. It respects .gitignore rules and skips binary
 * files, large files, and common directories that should be excluded.
 */
import path from 'node:path';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';

/**
 * Parses a .gitignore file content and returns an object with an accepts function
 * that can determine if a file path should be included or excluded.
 *
 * @param {string} content - The content of a .gitignore file
 * @returns {Object} An object with an accepts method to check if a file path should be included
 */
function parseGitignore(content: string): {
  accepts: (filePath: string) => boolean;
} {
  const rules: Array<{ pattern: string; isNegated: boolean }> = [];

  // Parse the gitignore content
  for (const line of content.split('\n')) {
    // Remove comments and trim whitespace
    const trimmedLine = line.replace(/#.*$/, '').trim();
    if (!trimmedLine) continue;

    const isNegated = trimmedLine.startsWith('!');
    const pattern = isNegated ? trimmedLine.substring(1) : trimmedLine;

    rules.push({
      pattern: pattern
        // Convert gitignore patterns to regular expression patterns
        .replace(/\*\*/g, '___GLOBSTAR___')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '[^/]')
        .replace(/___GLOBSTAR___/g, '.*')
        .replace(/^\//, '^')
        .replace(/\/$/, '$'),
      isNegated,
    });
  }

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
      let shouldInclude = true;

      for (const rule of rules) {
        const regex = new RegExp(rule.pattern);
        const matches = regex.test(normalizedPath);

        if (matches) {
          shouldInclude = rule.isNegated;
        }
      }

      return shouldInclude;
    },
  };
}

/**
 * Main function that parses a project directory, processes all files according to rules,
 * and writes the combined content to an output file.
 *
 * @param {string} projectPath - The root path of the project to process
 * @param {string} outputPath - The file path where the combined content will be written
 * @returns {Promise<void>} A promise that resolves when the parsing is complete
 */
async function parseProject(
  projectPath: string,
  outputPath: string,
): Promise<void> {
  console.log(`Starting to parse project at ${projectPath}`);

  // Parse .gitignore if it exists
  let gitignoreParser: { accepts: (path: string) => boolean };

  try {
    const gitignorePath = path.join(projectPath, '.gitignore');
    const gitignoreContent = await readFile(gitignorePath, 'utf8');
    gitignoreParser = parseGitignore(gitignoreContent);
    console.log('Loaded .gitignore rules');
  } catch (error) {
    console.log(
      'No .gitignore found or error parsing it, will include all files',
    );
    // Create a default parser that accepts everything
    gitignoreParser = { accepts: () => true };
  }

  let outputContent = '';

  // Process all files recursively
  await processDirectory(
    projectPath,
    projectPath,
    gitignoreParser,
    (_filePath, relativePath, content) => {
      const header = createFileHeader(relativePath);
      outputContent += `${header}\n${content}\n\n`;
    },
  );

  // Write the combined content to the output file
  await writeFile(outputPath, outputContent);

  console.log(`Project successfully parsed and written to ${outputPath}`);
}

/**
 * Recursively processes a directory and all its subdirectories, applying gitignore rules
 * and callback function to each file.
 *
 * @param {string} basePath - The base path of the project
 * @param {string} currentPath - The current directory being processed
 * @param {Object} gitignoreParser - An object with an accepts method to determine if a file should be included
 * @param {Function} fileCallback - A callback function to process each file's content
 * @returns {Promise<void>} A promise that resolves when all files in the directory have been processed
 */
async function processDirectory(
  basePath: string,
  currentPath: string,
  gitignoreParser: { accepts: (path: string) => boolean },
  fileCallback: (
    filePath: string,
    relativePath: string,
    content: string,
  ) => void,
): Promise<void> {
  const entries = await readdir(currentPath);

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry);
    const relativePath = path.relative(basePath, fullPath);

    // Skip if the file is ignored by gitignore
    if (!gitignoreParser.accepts(relativePath)) {
      console.log(`Skipping ignored path: ${relativePath}`);
      continue;
    }

    const stats = await stat(fullPath);

    if (stats.isDirectory()) {
      // Skip common directories that should be ignored
      if (
        ['node_modules', '.git', '.idea', '.vscode', 'dist', 'build'].includes(
          entry,
        )
      ) {
        console.log(`Skipping common ignored directory: ${relativePath}`);
        continue;
      }

      // Recursively process subdirectories
      await processDirectory(basePath, fullPath, gitignoreParser, fileCallback);
    } else if (stats.isFile()) {
      try {
        // Skip binary files and large files
        if (isBinaryPath(fullPath) || stats.size > 1024 * 1024) {
          console.log(`Skipping binary or large file: ${relativePath}`);
          continue;
        }

        // Skip the output file itself if it's in the project directory
        if (fullPath === path.resolve(outputPath)) {
          continue;
        }

        // Read and process the file
        const content = await readFile(fullPath, 'utf8');
        fileCallback(fullPath, relativePath, content);
        console.log(`Processed: ${relativePath}`);
      } catch (error) {
        console.error(`Error processing file ${fullPath}:`, error);
      }
    }
  }
}

/**
 * Determines if a file is a binary file based on its extension.
 *
 * @param {string} filePath - The path of the file to check
 * @returns {boolean} True if the file is likely a binary file, false otherwise
 */
function isBinaryPath(filePath: string): boolean {
  const extension = path.extname(filePath).toLowerCase();

  const binaryExtensions = [
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

  return binaryExtensions.includes(extension);
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

// Configuration
/**
 * The path to the project directory to process.
 * Defaults to the current working directory if not provided as a command-line argument.
 */
const projectPath = process.argv[2] || process.cwd();

/**
 * The path where the output file will be written.
 * Defaults to "project_for_ai.txt" in the current working directory if not provided.
 */
const outputPath =
  process.argv[3] || path.join(process.cwd(), 'project_for_ai.txt');

// Execute the script
parseProject(projectPath, outputPath)
  .then(() => console.log('Done!'))
  .catch((error) => console.error('Error:', error));
