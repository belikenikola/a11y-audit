/**
 * Logger utility for consistent console output
 * Supports verbose mode and different log levels
 */

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

const ICONS = {
  error: '✖',
  success: '✔',
  warning: '⚠',
  info: 'ℹ',
  debug: '●'
};

class Logger {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
  }

  setVerbose(value) {
    this.verbose = value;
  }

  _format(level, icon, color, message) {
    const timestamp = this.verbose ? `${COLORS.gray}[${new Date().toISOString()}]${COLORS.reset} ` : '';
    return `${timestamp}${color}${icon}${COLORS.reset} ${message}`;
  }

  error(message) {
    console.error(this._format('error', ICONS.error, COLORS.red, message));
  }

  success(message) {
    console.log(this._format('success', ICONS.success, COLORS.green, message));
  }

  warning(message) {
    console.log(this._format('warning', ICONS.warning, COLORS.yellow, message));
  }

  info(message) {
    console.log(this._format('info', ICONS.info, COLORS.blue, message));
  }

  debug(message) {
    if (this.verbose) {
      console.log(this._format('debug', ICONS.debug, COLORS.gray, message));
    }
  }

  plain(message) {
    console.log(message);
  }

  newline() {
    console.log('');
  }

  /**
   * Print a summary box
   */
  summary(title, items) {
    this.newline();
    console.log(`${COLORS.cyan}┌─ ${title} ${'─'.repeat(Math.max(0, 50 - title.length))}┐${COLORS.reset}`);
    items.forEach(({ label, value, color = COLORS.reset }) => {
      const paddedLabel = label.padEnd(20);
      console.log(`${COLORS.cyan}│${COLORS.reset} ${paddedLabel} ${color}${value}${COLORS.reset}`);
    });
    console.log(`${COLORS.cyan}└${'─'.repeat(54)}┘${COLORS.reset}`);
    this.newline();
  }
}

// Export singleton instance
const logger = new Logger();

export { logger, Logger, COLORS };
