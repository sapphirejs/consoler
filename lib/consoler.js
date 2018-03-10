const minimist = require('minimist')
const stringArgv = require('string-argv')
const MissingArgument = require('./errors/missing-argument')
const InvalidOption = require('./errors/invalid-option')

/**
 * Parses cli arguments and matches them against
 * a template command.
 *
 * @class Consoler
 */
class Consoler {
  /**
   * @param {string} route
   * @param {Object} cli
   */
  constructor(route, cli) {
    this._route = this._parseCommand(stringArgv(route))
    this._cli = this._parseCommand(cli || process.argv.slice(2))

    this._types = ['string', 'number', 'array', 'boolean']
    this._command = {
      command: null,
      argument: {},
      option: {}
    }
  }

  /**
   * Checks if a route command matches the actual command
   * from the cli. It only checks if the first arguments are
   * the same.
   *
   * @public
   * @returns {boolean}
   */
  match() {
    return this._route.command === this._cli.command
  }

  /**
   * Parses a route command against an actual input
   * from the cli.
   *
   * @public
   * @returns {Object}
   */
  parse() {
    // Return the emtpy command immediately if no
    // match was found.
    if (!this.match()) return this._command

    this._command.command = this._cli.command
    this._command.argument = this._parseArguments(
      this._route.arguments,
      this._cli.arguments
    )
    this._command.option = this._parseOptions(
      this._route.options,
      this._cli.options
    )

    return this._command
  }

  /**
   * Parses arguments and options, and builds a usable
   * data structure.
   *
   * @private
   * @param {Array} args
   * @returns {Object}
   */
  _parseCommand(args) {
    const parts = minimist(args)
    const argsKey = '_'

    return {
      command: parts[argsKey][0],
      arguments: [...parts[argsKey].slice(1)],
      options: Object.keys(parts)
        .filter(item => item !== argsKey)
        .reduce((acc, item) => {
          acc[item] = parts[item]
          return acc
        }, {})
    }
  }

  /**
   * Parses route arguments against the actual ones
   * from the cli.
   *
   * @private
   * @param {array} routeArguments
   * @param {array} cliArguments
   * @return {Object}
   */
  _parseArguments(routeArguments, cliArguments) {
    let args = {}

    routeArguments.forEach((argument, index) => {
      const cliArg = cliArguments[index]
      let matches

      // Check for a required argument <arg>.
      if (matches = argument.match(/\<(.+)\>/)) {
        const foundArg = matches[1]
        if (!cliArg)
          throw new MissingArgument(`Argument <${foundArg}> is required but missing.`)

        args[foundArg] = cliArg
      }
      // Optional or unamed arguments.
      else {
        // Check for optional argument [arg].
        if (matches = argument.match(/\[(.+)\]/)) argument = matches[1]
        // Corresponding cli argument must exist,
        // otherwise ignore it.
        if (cliArg) args[argument] = cliArg
      }
    })

    return args
  }

  /**
   * Parses options against the actual ones
   * from the cli.
   *
   * @private
   * @param {Object} routeOptions
   * @param {Object} cliOptions
   * @returns {Object}
   */
  _parseOptions(routeOptions, cliOptions) {
    let opts = {}

    for (let option of Object.keys(routeOptions)) {
      const routeOptValue = routeOptions[option]
      const { name, type, alias, _default } = this._parsePlaceholders(routeOptValue)
      const cliOptValue = this._cast(cliOptions[option] || cliOptions[alias])

      // No option actually received from cli.
      if (!cliOptValue) {
        // Check if a default value was set and
        // move on to the other option.
        if (_default)
          opts[name || option] = this._cast(_default)
        continue
      }

      if (type && !this._typeSupported(type))
        throw new InvalidOption(`Type ${type} isn't supported for option "${option}".`)

      if (type && !this._checkType(cliOptValue, type))
        throw new InvalidOption(`Expected type ${type} for option "${option}" but received "${Array.isArray(cliOptValue) ? 'array' : typeof cliOptValue}".`)

      // Set the option name to either the actual option
      // or the user provided one.
      opts[name || option] = cliOptValue
    }

    return opts
  }

  /**
   * Parses placeholders from an option template.
   *
   * @private
   * @param {string} template
   * @returns {Object}
   */
  _parsePlaceholders(template) {
    let result = {
      name: null,
      alias: null,
      type: null,
      // Prefixing with _ as "default"
      // is a reserved keyword.
      _default: null
    }

    // Option contains placeholder parameters:
    // <name|type:number|defaut:10>
    if (/\<(.+)\>/.test(template)) {
      const params = template.slice(1, template.length - 1).split('|')
      params.forEach(param => {
        // Testing for key:value format.
        if (/(.+):(.+)/.test(param)) {
          const [key, value] = param.split(':')

          if (key === 'type') {
            result.type = value
          }
          else if (key === 'default') {
            result._default = value
          }
          else if (key === 'alias') {
            result.alias = value
          }
          else {
            throw new InvalidOption(`Unknown placeholder key "${key}".`)
          }
        }
        // A plain value without a colon is assumed
        // to be the option name.
        else {
          result.name = param
        }
      })
    }
    // Option may either be a flag: --opt or without
    // parameters: --opt=.
    else {
      // The template has been parsed as either a boolean
      // for a flag, or a string for --opt= syntax. Using
      // that information to set the expected type.
      result.type = typeof template
    }

    return result
  }

  /**
   * Checks if a received type is supported.
   *
   * @private
   * @param {string} type
   * @returns {boolean}
   */
  _typeSupported(type) {
    return this._types.includes(type)
  }

  /**
   * Checks if the actual value is of the
   * defined type.
   *
   * @private
   * @param {*} value
   * @param {string} type
   * @returns {boolean}
   */
  _checkType(value, type) {
    // For an array, "typeof value" would yield "object",
    // which isn't quite helpful in this check.
    if (Array.isArray(value)) {
      return type === 'array'
    }

    return typeof value === type
  }

  /**
   * Tries to cast a (potentially) string
   * value into a preferable type.
   *
   * @private
   * @param {*} value
   * @returns {*}
   */
  _cast(value) {
    if (/,/.test(value)) {
      return value.split(',').map(item => {
        return this._cast(item)
      })
    }

    if (this._isNumber(value)) return Number(value)
    if (value === true || value === 'true') return true
    if (value === false || value === 'false') return false
    if (typeof value === 'string') return value.trim()
    return value
  }

  /**
   * Checks if a value is a number.
   *
   * @private
   * @param {*} value
   * @returns {boolean}
   */
  _isNumber(value) {
    const number = parseFloat(value)
    return !Number.isNaN(number) && Number.isFinite(number)
  }
}

module.exports = Consoler
