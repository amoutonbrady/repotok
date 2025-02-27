# repotok

A utility that processes a source code repository and converts it into a single text file optimized for AI context windows. It respects `.gitignore` rules and intelligently skips binary files, large files, and common directories that should be excluded.

## Features

- ✅ Respects `.gitignore` patterns
- ✅ Skips binary files automatically
- ✅ Ignores large files (>1MB)
- ✅ Excludes common directories (`node_modules`, `.git`, etc.)
- ✅ Formats output with clear file separators
- ✅ Simple, zero-dependency CLI

## Installation

You don't need to install this package permanently. Use it directly with your preferred package manager:

```bash
# Using npx (npm)
npx repotok [project-path] [output-path]

# Using yarn
yarn dlx repotok [project-path] [output-path]

# Using pnpm
pnpm dlx repotok [project-path] [output-path]

# Using bun
bunx repotok [project-path] [output-path]
```

## Usage

```bash
# Process the current directory and save output to the default location
npx repotok

# Process a specific project path
npx repotok /path/to/your/project

# Process a project and save to a specific output file
npx repotok /path/to/your/project /path/to/output/file.txt
```

### Default Values

- **Project Path:** Current working directory if not specified
- **Output Path:** `./tokenized_project.txt` if not specified

## Demo

Watch repotok in action:

https://github.com/user-attachments/assets/9ca90c4a-152c-4bd1-9670-e96f0c7912f4

## How It Works

1. Loads and parses `.gitignore` rules (if available)
2. Recursively walks through the project directory
3. Skips files and directories based on defined rules
4. For each included file, adds a formatted header and content to the output
5. Writes all combined content to a single output file

## Why Use This?

When working with AI coding assistants like GitHub Copilot, Claude, or ChatGPT, providing comprehensive context about your project can significantly improve the quality of assistance. This tool creates a single file that you can easily upload or paste into your AI interface to give it full context about your codebase.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

### About AI Contributions

This project was created (almost) entirely with AI assistance, and we welcome contributions similarly created or enhanced by AI tools. We believe that AI-human collaboration represents the future of software development.

When contributing:

- Be transparent about AI-generated content
- Review and verify AI-generated code before submission
- Focus on delivering value, regardless of whether the code was written by human, AI, or collaboration

## Credits

This project was inspired by:

- [This tweet](https://x.com/WorldHallOfFun/status/1894448442837205273) by World Hall of Fun
- [GitIngest](https://gitingest.com/) ([GitHub](https://github.com/cyclotruc/gitingest))
  A service in Python that provides the similar functionalities

## License

MIT
