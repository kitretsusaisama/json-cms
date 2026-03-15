/**
 * @upflame/json-cms CLI - Logger
 * Structured terminal output with step tracking.
 */

import chalk from "chalk";

export function info(msg: string, ...details: unknown[]): void {
  console.log(chalk.cyan("  i"), msg, ...details);
}

export function success(msg: string, ...details: unknown[]): void {
  console.log(chalk.green("  +"), msg, ...details);
}

export function warn(msg: string, ...details: unknown[]): void {
  console.log(chalk.yellow("  !"), msg, ...details);
}

export function error(msg: string, ...details: unknown[]): void {
  console.log(chalk.red("  x"), msg, ...details);
}

export function fatal(msg: string): void {
  console.error();
  console.error(chalk.bgRed.white(" FATAL "), chalk.red(msg));
  console.error();
}

export function header(msg: string): void {
  console.log();
  console.log(chalk.bold.blue(`  ${msg}`));
  console.log(chalk.blue(`  ${"-".repeat(Math.min(msg.length + 4, 60))}`));
}

export function blank(): void {
  console.log();
}

export function divider(): void {
  console.log(chalk.gray(`  ${"-".repeat(58)}`));
}

export function step(current: number, total: number, msg: string): void {
  console.log();
  console.log(`  ${chalk.bold.cyan(`[${current}/${total}]`)}  ${chalk.bold(msg)}`);
}

export function created(path: string): void {
  console.log(chalk.green("  +"), chalk.gray(path));
}

export function modified(path: string): void {
  console.log(chalk.yellow("  ~"), chalk.gray(path));
}

export function skipped(path: string, reason?: string): void {
  console.log(chalk.gray("  -"), chalk.gray(path), reason ? chalk.gray(`(${reason})`) : "");
}

export function detectionBox(name: string, details: Record<string, string>): void {
  console.log();
  console.log(chalk.bold.cyan("  [Detected]"));
  console.log(`  ${chalk.bold(name)}`);
  for (const [key, value] of Object.entries(details)) {
    console.log(`  ${chalk.gray(key.padEnd(18))} ${value}`);
  }
  console.log();
}

export function codeBlock(lines: string[]): void {
  console.log(chalk.gray("  [shell]"));
  for (const line of lines) {
    console.log(chalk.gray("  |"), chalk.green(line));
  }
}

export function summaryBox(
  title: string,
  items: Array<{
    label: string;
    value: string | number;
    type?: "success" | "warn" | "error" | "info";
  }>
): void {
  console.log();
  console.log(chalk.bold(`  -- ${title} --`));
  for (const item of items) {
    const label = chalk.gray(item.label.padEnd(24));
    const value = String(item.value);
    const styledValue =
      item.type === "success"
        ? chalk.green(value)
        : item.type === "warn"
          ? chalk.yellow(value)
          : item.type === "error"
            ? chalk.red(value)
            : item.type === "info"
              ? chalk.cyan(value)
              : value;
    console.log(`  ${label} ${styledValue}`);
  }
  console.log();
}

export class Spinner {
  private frames = ["-", "\\", "|", "/"];
  private index = 0;
  private handle: ReturnType<typeof setInterval> | null = null;

  constructor(private text: string) {}

  start(): this {
    if (!process.stdout.isTTY) {
      process.stdout.write(`  ${this.text}...\n`);
      return this;
    }

    this.handle = setInterval(() => {
      process.stdout.write(`\r  ${chalk.cyan(this.frames[this.index++ % this.frames.length])} ${this.text}`);
    }, 80);

    return this;
  }

  succeed(text?: string): void {
    this.stop();
    console.log(`  ${chalk.green("+")} ${text ?? this.text}`);
  }

  fail(text?: string): void {
    this.stop();
    console.log(`  ${chalk.red("x")} ${text ?? this.text}`);
  }

  private stop(): void {
    if (this.handle) {
      clearInterval(this.handle);
      this.handle = null;
      if (process.stdout.isTTY) {
        process.stdout.write("\r\x1b[K");
      }
    }
  }
}
