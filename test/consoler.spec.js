const { Consoler, InvalidOption, MissingArgument } = require('../index')

describe('command', () => {
  test('matches template', () => {
    const route = 'command'
    const cli = ['command']
    const consoler = new Consoler(route, cli)

    expect(consoler.match()).toBe(true)
  })

  test("doesn't match template", () => {
    const route = 'command'
    const cli = ['anothercommand']
    const consoler = new Consoler(route, cli)

    expect(consoler.match()).toBe(false)
  })
})

describe('argument', () => {
  test('matches template', () => {
    const route = 'command <arg> [anotherarg]'
    const cli = ['command', 'name', 'email']
    const consoler = new Consoler(route, cli)
    const command = consoler.parse()

    expect(command.argument.arg).toBe('name')
    expect(command.argument.anotherarg).toBe('email')
  })

  test('throws when required but missing', () => {
    expect(() => {
      const route = 'command <arg>'
      const cli = ['command']
      new Consoler(route, cli).parse()
    }).toThrow(MissingArgument)
  })

  test("doesn't throw when optional but missing", () => {
    expect(() => {
      const route = 'command [arg]'
      const cli = ['command']
      new Consoler(route, cli).parse()
    }).not.toThrow(MissingArgument)
  })
})

describe('option', () => {
  test('matches template with named option', () => {
    const route = 'command --anotheropt=<anopt>'
    const cli = ['command', '--anotheropt=email']
    const consoler = new Consoler(route, cli)
    const command = consoler.parse()

    expect(command.option.anopt).toBe('email')
  })

  test('matches template with anonymous option', () => {
    const route = 'command --opt='
    const cli = ['command', '--opt=email']
    const consoler = new Consoler(route, cli)
    const command = consoler.parse()

    expect(command.option.opt).toBe('email')
  })

  test('matches template with flag option', () => {
    const route = 'command --opt'
    const cli = ['command', '--opt']
    const consoler = new Consoler(route, cli)
    const command = consoler.parse()

    expect(command.option.opt).toBe(true)
  })

  test('matches template with option alias', () => {
    const route = 'command --opt=<alias:o>'
    const cli = ['command', '-o name']
    const consoler = new Consoler(route, cli)
    const command = consoler.parse()

    expect(command.option.opt).toBe('name')
  })

  test('is considered valid when type is array', () => {
    const route = 'command --opt=<type:array>'
    const cli = ['command', '--opt=one,two,three']
    const consoler = new Consoler(route, cli)
    const command = consoler.parse()

    expect(command.option.opt).toEqual(['one', 'two', 'three'])
  })

  test('is considered valid when type is number', () => {
    const route = 'command --opt=<type:number>'
    const cli = ['command', '--opt=7']
    const consoler = new Consoler(route, cli)
    const command = consoler.parse()

    expect(command.option.opt).toBe(7)
  })

  test('casts correctly an array of numbers', () => {
    const route = 'command --opt=<type:array>'
    const cli = ['command', '--opt=1,2,3']
    const consoler = new Consoler(route, cli)
    const command = consoler.parse()

    expect(command.option.opt).toEqual([1, 2, 3])
  })

  test('sets default value when option is missing', () => {
    const route = 'command --opt=<default:5>'
    const cli = ['command']
    const consoler = new Consoler(route, cli)
    const command = consoler.parse()

    expect(command.option.opt).toBe(5)
  })

  test("doesn't set default value when option is present", () => {
    const route = 'command --opt=<default:5>'
    const cli = ['command', '--opt=7']
    const consoler = new Consoler(route, cli)
    const command = consoler.parse()

    expect(command.option.opt).toBe(7)
  })

  test("throws when flag is handled values", () => {
    expect(() => {
      const route = 'command --opt'
      const cli = ['command', '--opt=10']
      new Consoler(route, cli).parse()
    }).toThrow(InvalidOption)
  })

  test("throws when types missmatch", () => {
    expect(() => {
      const route = 'command --opt=<type:string>'
      const cli = ['command', '--opt=7']
      new Consoler(route, cli).parse()
    }).toThrow(InvalidOption)
  })

  test("throws when type is unsupported", () => {
    expect(() => {
      const route = 'command --opt=<type:object>'
      const cli = ['command', '--opt=7']
      new Consoler(route, cli).parse()
    }).toThrow(InvalidOption)
  })

  test("throws when placeholder key is unknown", () => {
    expect(() => {
      const route = 'command --opt=<mykey:string>'
      const cli = ['command', '--opt=name']
      new Consoler(route, cli).parse()
    }).toThrow(InvalidOption)
  })
})
