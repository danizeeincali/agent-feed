const fs = require('fs').promises;
const path = require('path');

/**
 * Check if file exists
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensure directory exists
 */
async function ensureDirectory(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Read file with error handling
 */
async function readFileSafe(filePath) {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    throw new Error(`Failed to read file: ${path.basename(filePath)}`);
  }
}

/**
 * Write file with error handling
 */
async function writeFileSafe(filePath, content) {
  try {
    await ensureDirectory(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error.message);
    throw new Error(`Failed to write file: ${path.basename(filePath)}`);
  }
}

/**
 * Delete file with error handling
 */
async function deleteFileSafe(filePath) {
  try {
    if (await fileExists(filePath)) {
      await fs.unlink(filePath);
    }
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error.message);
    throw new Error(`Failed to delete file: ${path.basename(filePath)}`);
  }
}

/**
 * List files in directory with pattern matching
 */
async function listFiles(dirPath, pattern = null) {
  try {
    const files = await fs.readdir(dirPath);
    if (pattern) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return files.filter(file => regex.test(file));
    }
    return files;
  } catch (error) {
    console.error(`Error listing files in ${dirPath}:`, error.message);
    return [];
  }
}

/**
 * Get file stats
 */
async function getFileStats(filePath) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    console.error(`Error getting stats for ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Copy file
 */
async function copyFile(sourcePath, destPath) {
  try {
    await ensureDirectory(path.dirname(destPath));
    await fs.copyFile(sourcePath, destPath);
  } catch (error) {
    console.error(`Error copying file from ${sourcePath} to ${destPath}:`, error.message);
    throw new Error('Failed to copy file');
  }
}

module.exports = {
  fileExists,
  ensureDirectory,
  readFileSafe,
  writeFileSafe,
  deleteFileSafe,
  listFiles,
  getFileStats,
  copyFile
};