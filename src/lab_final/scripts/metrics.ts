/**
 * Simple code metrics for the Final Project.
 *
 *   npm run metrics
 *
 * For each folder under src/ it prints:
 *   Files            number of .ts files
 *   Lines            non-empty lines of code
 *   Biggest fn       lines of the longest function (and its name)
 *   Max imports      highest number of imports in a single file
 *   Complexity       decision points: if, case, ?:, &&, ||, ??, loops, catch
 *   Max cplx / fn    highest complexity of a single function
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const ROOT = "src";

interface FunctionMetrics {
  name: string;
  lines: number;
  complexity: number;
}

interface FileMetrics {
  file: string;
  lines: number;
  imports: number;
  complexity: number;
  functions: FunctionMetrics[];
}

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return listFiles(path);
    return path.endsWith(".ts") ? [path] : [];
  });
}

function isDecisionPoint(node: ts.Node): boolean {
  if (
    ts.isIfStatement(node) ||
    ts.isCaseClause(node) ||
    ts.isConditionalExpression(node) ||
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node) ||
    ts.isWhileStatement(node) ||
    ts.isDoStatement(node) ||
    ts.isCatchClause(node)
  ) {
    return true;
  }
  if (ts.isBinaryExpression(node)) {
    const op = node.operatorToken.kind;
    return (
      op === ts.SyntaxKind.AmpersandAmpersandToken ||
      op === ts.SyntaxKind.BarBarToken ||
      op === ts.SyntaxKind.QuestionQuestionToken
    );
  }
  return false;
}

function functionName(node: ts.FunctionLikeDeclaration): string {
  if (node.name) return node.name.getText();
  if (ts.isConstructorDeclaration(node)) return "constructor";
  const parent = node.parent;
  if (parent && ts.isVariableDeclaration(parent)) return parent.name.getText();
  if (parent && ts.isPropertyAssignment(parent)) return parent.name.getText();
  return "(anonymous)";
}

function countComplexity(node: ts.Node): number {
  let count = 0;
  const visit = (child: ts.Node) => {
    // Nested functions are measured on their own.
    if (child !== node && ts.isFunctionLike(child)) return;
    if (isDecisionPoint(child)) count++;
    ts.forEachChild(child, visit);
  };
  visit(node);
  return count;
}

function analyzeFile(file: string): FileMetrics {
  const text = readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const lineOf = (pos: number) => source.getLineAndCharacterOfPosition(pos).line;

  const metrics: FileMetrics = {
    file,
    lines: text.split("\n").filter((line) => line.trim() !== "").length,
    imports: 0,
    complexity: 0,
    functions: [],
  };

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node)) metrics.imports++;
    if (isDecisionPoint(node)) metrics.complexity++;
    if (ts.isFunctionLike(node) && "body" in node && node.body) {
      const fn = node as ts.FunctionLikeDeclaration;
      metrics.functions.push({
        name: functionName(fn),
        lines: lineOf(fn.getEnd()) - lineOf(fn.getStart()) + 1,
        complexity: countComplexity(fn),
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return metrics;
}

function groupOf(file: string): string {
  const parts = relative(ROOT, file).split(/[\\/]/);
  return parts.length > 1 ? `src/${parts[0]}` : "src (root)";
}

const files = listFiles(ROOT).map(analyzeFile);
const groups = new Map<string, FileMetrics[]>();
for (const file of files) {
  const key = groupOf(file.file);
  groups.set(key, [...(groups.get(key) ?? []), file]);
}

const rows = [...groups.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([folder, list]) => {
    const functions = list.flatMap((f) => f.functions);
    const biggest = functions.reduce<FunctionMetrics | null>(
      (max, fn) => (!max || fn.lines > max.lines ? fn : max),
      null,
    );
    const mostComplex = functions.reduce((max, fn) => Math.max(max, fn.complexity), 0);
    return {
      Folder: folder,
      Files: list.length,
      Lines: list.reduce((sum, f) => sum + f.lines, 0),
      "Biggest fn": biggest ? `${biggest.lines} (${biggest.name})` : "-",
      "Max imports": Math.max(...list.map((f) => f.imports)),
      Complexity: list.reduce((sum, f) => sum + f.complexity, 0),
      "Max cplx / fn": mostComplex,
    };
  });

console.log("\nCode metrics for src/\n");
console.table(rows);

const top = files
  .flatMap((f) => f.functions.map((fn) => ({ ...fn, file: relative(ROOT, f.file) })))
  .sort((a, b) => b.lines - a.lines)
  .slice(0, 5);

console.log("\nTop 5 biggest functions\n");
console.table(
  top.map((fn) => ({ Function: fn.name, File: fn.file, Lines: fn.lines, Complexity: fn.complexity })),
);
