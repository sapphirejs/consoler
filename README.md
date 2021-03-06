# Consoler

[![NPM Version](https://img.shields.io/npm/v/@sapphirejs/consoler.svg)](https://www.npmjs.com/package/@sapphirejs/consoler)
[![NPM Downloads](https://img.shields.io/npm/dt/@sapphirejs/consoler.svg)](https://www.npmjs.com/package/@sapphirejs/consoler)
[![Build Status](https://travis-ci.org/sapphirejs/consoler.svg?branch=master)](https://travis-ci.org/sapphirejs/consoler)
[![Coverage Status](https://coveralls.io/repos/github/sapphirejs/consoler/badge.svg?branch=master)](https://coveralls.io/github/sapphirejs/consoler?branch=master)
[![Dependencies](https://david-dm.org/sapphirejs/consoler.svg)](https://github.com/sapphirejs/consoler)
[![license](https://img.shields.io/github/license/sapphirejs/consoler.svg)](https://github.com/sapphirejs/consoler/blob/master/LICENSE.md)

A micro framework for building small CLI applications. It is the package that drives console commands for the Sapphire Router and it was extracted from there. Although a minimalist framework, Consoler will let you express commands in a very simple and intuitive way. What it lacks the most right now are help screens, which would make the command syntax very verbose. If you don't need those, than take a look at the usage below.

Internally it uses [minimist](https://github.com/substack/minimist) to parse options and arguments, and [string-argv](https://github.com/mccormicka/string-argv) to split the template command into an array.

## Usage

Starting it up is quite simple:

```
$ npm install --save @sapphirejs/consoler
```

```javascript
const Consoler = require('@sapphirejs/consoler')
const template = 'mycommand <name>'

// Returns an object with the command name,
// arguments, and options:
const command = new Consoler(template).parse()
```

There's also the match method that simply returns `true` or `false` if the actual command matches the template. It only checks the firstmost argument, considering it the command name.

```javascript
const doesMatch = new Consoler(template).match()
```

### Arguments

Arguments will always be named and either required or optional. The convention is to use `<arg>` for required arguments and `[arg]` for optional ones.

Required arguments need to be passed in the CLI, otherwise an error will be thrown.

```javascript
// CLI: readfile myfile.txt
const template = 'readfile <name>'
const command = new Consoler(template).parse()

console.log(command.argument.name) // myfile.txt
```

Optional ones will just be ingored if not present.

```javascript
// CLI: readfile
const template = 'readfile [name]'
const command = new Consoler(template).parse()

console.log(command.argument.name) // undefined
```

### Options

Options are a tiny bit more complicated as they may be flags, may have a type, alias, or default value. We'll explore each of them.

In the simplest usecase, options can be defined without parameters. Option flags will always return true, while `--opt=` will expect a string.

```javascript
// CLI: writefile myfile.txt --atomic --content=hello
const template = 'writefile <name> --atomic --content='
const command = new Consoler(template).parse()

console.log(command.option.atomic) // true
console.log(command.option.content) // hello
```

#### Type Validation

For safer usage though, you'll most probably need to validate the input data. In that case, you'll use a familiar syntax. The example below calls for a `number` type and will throw if the actual value is different. It also sets a named parameter for the option.

```javascript
// CLI: writefile myfile.txt --attemps=3
const template = 'writefile <name> --attemps=<tries|type:number>'
const command = new Consoler(template).parse()

console.log(command.option.tries) // 3
```

Consoler supports `string`, `number`, and `array` for non-boolean option flags. As we mentioned it, an `array` type is just a list of data separated by a comma that is converted to a JavaScript array.

```javascript
// CLI: concat --files=one.txt,two.txt
const template = 'concat --files=<type:array>'
const command = new Consoler(template).parse()

console.log(command.option.files) // ['one.txt', 'two.txt']
```

Number values will be automatically cast to an integer or float. Let's see a more contrived example that takes advantage of lists and casting:

```javascript
// CLI: reduce 5 --numbers=1,2,3,4,5
const template = 'reduce <start> --numbers=<nums|type:array>'
const command = new Consoler(template).parse()

const result = command.option.nums.reduce((acc, num) => acc + num, command.argument.start)
console.log(result) // 20
```

#### Alias

Options can be aliased with their shorthand `-x` format:

```javascript
// CLI: concat -f file1.txt,file2.txt
const template = 'concat --files=<type:array|alias:f>'
const command = new Consoler(template).parse()

console.log(command.option.files) // ['file1.txt', 'file2.txt']
```

#### Default Value

Finally, you can set a default value for an option, which will be considered when that option is missing from the actual command:

```javascript
// CLI: sum
const template = 'sum --numbers=<nums|type:array|default:7,3>'
const command = new Consoler(template).parse()

console.log(command.option.nums) // 10
```

## Testing

Testing is very easily achieved by "mocking" the console input with a plain array. The second parameter to `Consoler.constructor(route, cli)` is automatically resolved to `process.argv` if no user value is given. By passing an array as an argument, that value will be parsed as console input. Let's see a simple example using [Jest](https://facebook.github.io/jest/):

```javascript
test('argument is received', () => {
  const template = 'command <arg>'
  const cli = ['command', '10']
  const command = new Consoler(template, cli).parse()

  expect(command.arguments.arg).toBe(10)
})
```

For many more examples, take a look at this package's [tests](https://github.com/sapphirejs/consoler/blob/master/test/consoler.spec.js).
